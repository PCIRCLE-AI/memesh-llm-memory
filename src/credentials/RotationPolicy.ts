/**
 * Credential Rotation Policy System
 *
 * Manages credential rotation policies and enforcement:
 * - Track credential age and last rotation
 * - Define rotation schedules per service pattern
 * - Warn when credentials approach expiration
 * - Optionally block access to expired credentials
 * - Audit rotation events
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * Rotation policy configuration
 */
export interface RotationPolicyConfig {
  id?: number;
  name: string;
  servicePattern: string; // Glob-like pattern: "production:*", "api:*", etc.
  maxAgeDays: number; // Maximum age before credential expires
  warningDays: number; // Days before expiration to start warning
  enforceRotation: boolean; // Block access to expired credentials
  autoArchive: boolean; // Archive expired credentials instead of deleting
  metadata?: Record<string, any>;
}

/**
 * Rotation status for a credential
 */
export interface RotationStatus {
  needsRotation: boolean;
  isExpired: boolean;
  ageInDays: number;
  daysUntilExpiration: number;
  lastRotated?: Date;
  policy?: RotationPolicyConfig;
  warningMessage?: string;
}

/**
 * Rotation statistics
 */
export interface RotationStats {
  totalCredentials: number;
  needsRotation: number;
  expired: number;
  healthyCredentials: number;
  averageAge: number;
  oldestCredential: {
    service: string;
    account: string;
    ageInDays: number;
  } | null;
}

/**
 * Credential rotation metadata
 */
interface CredentialRotationData {
  service: string;
  account: string;
  created_at: number;
  last_rotated: number | null;
  rotation_policy_id: number | null;
}

/**
 * Rotation Policy Manager
 */
export class RotationPolicy {
  private db: Database.Database;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeSchema();
    this.startCleanup();
  }

  /**
   * Initialize rotation policy schema
   */
  private initializeSchema(): void {
    // Rotation policies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rotation_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        service_pattern TEXT NOT NULL,
        max_age_days INTEGER NOT NULL,
        warning_days INTEGER NOT NULL,
        enforce_rotation INTEGER NOT NULL DEFAULT 0,
        auto_archive INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rotation_service_pattern
        ON rotation_policies(service_pattern);
    `);

    // Add rotation columns to credentials table if they don't exist
    try {
      this.db.exec(`
        ALTER TABLE credentials ADD COLUMN last_rotated INTEGER;
      `);
    } catch (error) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`
        ALTER TABLE credentials ADD COLUMN rotation_policy_id INTEGER
          REFERENCES rotation_policies(id) ON DELETE SET NULL;
      `);
    } catch (error) {
      // Column already exists, ignore
    }

    // Create index on last_rotated
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_credential_last_rotated
        ON credentials(last_rotated);
      CREATE INDEX IF NOT EXISTS idx_credential_rotation_policy
        ON credentials(rotation_policy_id);
    `);
  }

  /**
   * Create a new rotation policy
   */
  createPolicy(config: Omit<RotationPolicyConfig, 'id'>): RotationPolicyConfig {
    this.validatePolicy(config);

    const now = Date.now();
    const result = this.db
      .prepare(
        `
      INSERT INTO rotation_policies (
        name, service_pattern, max_age_days, warning_days,
        enforce_rotation, auto_archive, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        config.name,
        config.servicePattern,
        config.maxAgeDays,
        config.warningDays,
        config.enforceRotation ? 1 : 0,
        config.autoArchive ? 1 : 0,
        config.metadata ? JSON.stringify(config.metadata) : null,
        now,
        now
      );

    logger.info('Rotation policy created', {
      policyId: result.lastInsertRowid,
      name: config.name,
      pattern: config.servicePattern,
    });

    return {
      ...config,
      id: result.lastInsertRowid as number,
    };
  }

  /**
   * Get a rotation policy by ID
   */
  getPolicy(id: number): RotationPolicyConfig | null {
    const row = this.db
      .prepare('SELECT * FROM rotation_policies WHERE id = ?')
      .get(id) as any;

    if (!row) return null;

    return this.mapRowToPolicy(row);
  }

  /**
   * Get a rotation policy by name
   */
  getPolicyByName(name: string): RotationPolicyConfig | null {
    const row = this.db
      .prepare('SELECT * FROM rotation_policies WHERE name = ?')
      .get(name) as any;

    if (!row) return null;

    return this.mapRowToPolicy(row);
  }

  /**
   * List all rotation policies
   */
  listPolicies(): RotationPolicyConfig[] {
    const rows = this.db.prepare('SELECT * FROM rotation_policies ORDER BY name').all() as any[];

    return rows.map((row) => this.mapRowToPolicy(row));
  }

  /**
   * Update a rotation policy
   */
  updatePolicy(id: number, updates: Partial<Omit<RotationPolicyConfig, 'id'>>): void {
    const existing = this.getPolicy(id);
    if (!existing) {
      throw new Error(`Rotation policy not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    this.validatePolicy(updated);

    const now = Date.now();
    this.db
      .prepare(
        `
      UPDATE rotation_policies
      SET name = ?, service_pattern = ?, max_age_days = ?, warning_days = ?,
          enforce_rotation = ?, auto_archive = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `
      )
      .run(
        updated.name,
        updated.servicePattern,
        updated.maxAgeDays,
        updated.warningDays,
        updated.enforceRotation ? 1 : 0,
        updated.autoArchive ? 1 : 0,
        updated.metadata ? JSON.stringify(updated.metadata) : null,
        now,
        id
      );

    logger.info('Rotation policy updated', { policyId: id });
  }

  /**
   * Delete a rotation policy
   */
  deletePolicy(id: number): void {
    // Set all credentials using this policy to NULL
    this.db
      .prepare('UPDATE credentials SET rotation_policy_id = NULL WHERE rotation_policy_id = ?')
      .run(id);

    const result = this.db.prepare('DELETE FROM rotation_policies WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new Error(`Rotation policy not found: ${id}`);
    }

    logger.info('Rotation policy deleted', { policyId: id });
  }

  /**
   * Find the best matching policy for a service
   */
  findPolicyForService(service: string): RotationPolicyConfig | null {
    const policies = this.listPolicies();

    // Find exact match first
    const exactMatch = policies.find((p) => p.servicePattern === service);
    if (exactMatch) return exactMatch;

    // Find wildcard matches
    const wildcardMatches = policies.filter((p) => {
      if (!p.servicePattern.includes('*')) return false;

      // Convert glob pattern to regex
      const pattern = p.servicePattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(service);
    });

    // Return most specific match (longest pattern)
    if (wildcardMatches.length > 0) {
      return wildcardMatches.sort((a, b) => b.servicePattern.length - a.servicePattern.length)[0];
    }

    return null;
  }

  /**
   * Check rotation status for a credential
   */
  checkRotationStatus(service: string, account: string): RotationStatus {
    const data = this.db
      .prepare(
        `
      SELECT service, account, created_at, last_rotated, rotation_policy_id
      FROM credentials
      WHERE service = ? AND account = ?
    `
      )
      .get(service, account) as CredentialRotationData | undefined;

    if (!data) {
      throw new Error(`Credential not found: ${service}/${account}`);
    }

    // Find applicable policy
    let policy: RotationPolicyConfig | null = null;
    if (data.rotation_policy_id) {
      policy = this.getPolicy(data.rotation_policy_id);
    }
    if (!policy) {
      policy = this.findPolicyForService(service);
    }

    // If no policy, credential never expires
    if (!policy) {
      return {
        needsRotation: false,
        isExpired: false,
        ageInDays: 0,
        daysUntilExpiration: Infinity,
      };
    }

    // Calculate age
    const now = Date.now();
    const baseTimestamp = data.last_rotated || data.created_at;
    const ageMs = now - baseTimestamp;
    const ageInDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    // Calculate expiration
    const maxAgeMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;
    const expirationTimestamp = baseTimestamp + maxAgeMs;
    const msUntilExpiration = expirationTimestamp - now;
    const daysUntilExpiration = Math.floor(msUntilExpiration / (24 * 60 * 60 * 1000));

    const isExpired = daysUntilExpiration < 0;
    const needsRotation = daysUntilExpiration <= policy.warningDays;

    let warningMessage: string | undefined;
    if (isExpired) {
      warningMessage = `Credential expired ${Math.abs(daysUntilExpiration)} days ago (policy: ${policy.name})`;
    } else if (needsRotation) {
      warningMessage = `Credential expires in ${daysUntilExpiration} days (policy: ${policy.name})`;
    }

    return {
      needsRotation,
      isExpired,
      ageInDays,
      daysUntilExpiration,
      lastRotated: data.last_rotated ? new Date(data.last_rotated) : undefined,
      policy,
      warningMessage,
    };
  }

  /**
   * Mark a credential as rotated
   */
  markAsRotated(service: string, account: string): void {
    const now = Date.now();

    const result = this.db
      .prepare(
        `
      UPDATE credentials
      SET last_rotated = ?
      WHERE service = ? AND account = ?
    `
      )
      .run(now, service, account);

    if (result.changes === 0) {
      throw new Error(`Credential not found: ${service}/${account}`);
    }

    logger.info('Credential marked as rotated', { service, account });
  }

  /**
   * Assign a rotation policy to a credential
   */
  assignPolicy(service: string, account: string, policyId: number): void {
    // Verify policy exists
    const policy = this.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Rotation policy not found: ${policyId}`);
    }

    const result = this.db
      .prepare(
        `
      UPDATE credentials
      SET rotation_policy_id = ?
      WHERE service = ? AND account = ?
    `
      )
      .run(policyId, service, account);

    if (result.changes === 0) {
      throw new Error(`Credential not found: ${service}/${account}`);
    }

    logger.info('Rotation policy assigned to credential', {
      service,
      account,
      policyId,
      policyName: policy.name,
    });
  }

  /**
   * List all credentials needing rotation
   */
  listCredentialsNeedingRotation(): Array<{
    service: string;
    account: string;
    status: RotationStatus;
  }> {
    const credentials = this.db
      .prepare(
        `
      SELECT service, account, created_at, last_rotated, rotation_policy_id
      FROM credentials
      ORDER BY service, account
    `
      )
      .all() as CredentialRotationData[];

    const needingRotation: Array<{
      service: string;
      account: string;
      status: RotationStatus;
    }> = [];

    for (const cred of credentials) {
      const status = this.checkRotationStatus(cred.service, cred.account);
      if (status.needsRotation) {
        needingRotation.push({
          service: cred.service,
          account: cred.account,
          status,
        });
      }
    }

    return needingRotation;
  }

  /**
   * Get rotation statistics
   */
  getRotationStats(): RotationStats {
    const credentials = this.db
      .prepare(
        `
      SELECT service, account, created_at, last_rotated, rotation_policy_id
      FROM credentials
    `
      )
      .all() as CredentialRotationData[];

    const totalCredentials = credentials.length;
    let needsRotation = 0;
    let expired = 0;
    let totalAge = 0;
    let oldestCredential: RotationStats['oldestCredential'] = null;

    for (const cred of credentials) {
      const status = this.checkRotationStatus(cred.service, cred.account);

      if (status.needsRotation) needsRotation++;
      if (status.isExpired) expired++;
      totalAge += status.ageInDays;

      if (!oldestCredential || status.ageInDays > oldestCredential.ageInDays) {
        oldestCredential = {
          service: cred.service,
          account: cred.account,
          ageInDays: status.ageInDays,
        };
      }
    }

    return {
      totalCredentials,
      needsRotation,
      expired,
      healthyCredentials: totalCredentials - needsRotation,
      averageAge: totalCredentials > 0 ? totalAge / totalCredentials : 0,
      oldestCredential,
    };
  }

  /**
   * Auto-archive expired credentials
   */
  archiveExpiredCredentials(): number {
    const credentials = this.listCredentialsNeedingRotation();
    let archived = 0;

    for (const cred of credentials) {
      if (!cred.status.isExpired || !cred.status.policy?.autoArchive) {
        continue;
      }

      // Add "archived:" prefix to service name
      const archivedService = `archived:${cred.service}`;

      this.db
        .prepare(
          `
        UPDATE credentials
        SET service = ?
        WHERE service = ? AND account = ?
      `
        )
        .run(archivedService, cred.service, cred.account);

      archived++;
      logger.info('Credential auto-archived', {
        original: `${cred.service}/${cred.account}`,
        archived: `${archivedService}/${cred.account}`,
      });
    }

    return archived;
  }

  /**
   * Validate policy configuration
   */
  private validatePolicy(config: Omit<RotationPolicyConfig, 'id'>): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Policy name is required');
    }

    if (!config.servicePattern || config.servicePattern.trim().length === 0) {
      throw new Error('Service pattern is required');
    }

    if (config.maxAgeDays < 1) {
      throw new Error('Max age must be at least 1 day');
    }

    if (config.warningDays < 0) {
      throw new Error('Warning days cannot be negative');
    }

    if (config.warningDays >= config.maxAgeDays) {
      throw new Error('Warning days must be less than max age');
    }
  }

  /**
   * Map database row to policy config
   */
  private mapRowToPolicy(row: any): RotationPolicyConfig {
    return {
      id: row.id,
      name: row.name,
      servicePattern: row.service_pattern,
      maxAgeDays: row.max_age_days,
      warningDays: row.warning_days,
      enforceRotation: row.enforce_rotation === 1,
      autoArchive: row.auto_archive === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Run cleanup daily
    this.cleanupTimer = setInterval(
      () => {
        this.archiveExpiredCredentials();
      },
      24 * 60 * 60 * 1000
    ); // 24 hours
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
