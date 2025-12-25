/**
 * Credential Vault
 *
 * SQLite-backed credential management with secure storage backend
 * - Metadata in SQLite (service, account, tags, dates)
 * - Sensitive values in platform-specific secure storage
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  SecureStorage,
  Credential,
  CredentialInput,
  CredentialQuery,
} from './types.js';
import { createSecureStorage } from './storage/index.js';
import { logger } from '../utils/logger.js';
import { RateLimiter } from './RateLimiter.js';
import { AuditLogger, AuditEventType } from './AuditLogger.js';

/**
 * Validate service name
 */
function validateServiceName(service: string): void {
  if (!service || service.length === 0) {
    throw new Error('Service name cannot be empty');
  }
  if (service.length > 255) {
    throw new Error('Service name too long (max 255 characters)');
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(service)) {
    throw new Error(
      'Service name contains invalid characters (allowed: a-z, A-Z, 0-9, _, ., -)'
    );
  }
  if (service.includes('..')) {
    throw new Error('Service name cannot contain ".."');
  }
  if (service.startsWith('.') || service.endsWith('.')) {
    throw new Error('Service name cannot start or end with "."');
  }
}

/**
 * Validate account name
 */
function validateAccountName(account: string): void {
  if (!account || account.length === 0) {
    throw new Error('Account name cannot be empty');
  }
  if (account.length > 255) {
    throw new Error('Account name too long (max 255 characters)');
  }
  if (account.includes('\0')) {
    throw new Error('Account name cannot contain null bytes');
  }
  if (account.includes(':')) {
    throw new Error('Account name cannot contain ":" (reserved for ID generation)');
  }
  // Prevent path traversal
  if (account.includes('..') || account.includes('/') || account.includes('\\')) {
    throw new Error('Account name cannot contain path traversal characters');
  }
}

/**
 * Get vault database path
 */
function getVaultPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const vaultDir = join(homeDir, '.smart-agents', 'vault');

  // Ensure directory exists
  if (!existsSync(vaultDir)) {
    mkdirSync(vaultDir, { recursive: true, mode: 0o700 });
  }

  return join(vaultDir, 'credentials.db');
}

/**
 * Credential metadata stored in SQLite
 */
interface CredentialMetadata {
  id: string;
  service: string;
  account: string;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  notes: string | null;
  tags: string | null; // JSON array
}

export class CredentialVault {
  private db: Database.Database;
  private storage: SecureStorage;
  private rateLimiter: RateLimiter;
  private auditLogger: AuditLogger;
  private static cleanupRegistered = false;
  private static instances: Set<CredentialVault> = new Set();

  constructor(dbPath?: string) {
    const path = dbPath || getVaultPath();

    // Initialize SQLite database
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');

    // Initialize secure storage
    this.storage = null as any; // Will be set in initialize()

    // Create tables
    this.initializeSchema();

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(this.db);

    // Initialize audit logger
    this.auditLogger = new AuditLogger(this.db);

    // Register this instance for cleanup
    CredentialVault.instances.add(this);

    // Register global cleanup handlers (only once)
    if (!CredentialVault.cleanupRegistered) {
      this.registerCleanup();
      CredentialVault.cleanupRegistered = true;
    }
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER,
        notes TEXT,
        tags TEXT,
        UNIQUE(service, account)
      );

      CREATE INDEX IF NOT EXISTS idx_service ON credentials(service);
      CREATE INDEX IF NOT EXISTS idx_account ON credentials(account);
      CREATE INDEX IF NOT EXISTS idx_created_at ON credentials(created_at);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON credentials(expires_at);
    `);
  }

  /**
   * Initialize secure storage backend
   */
  async initialize(): Promise<void> {
    this.storage = await createSecureStorage();
    logger.info(`Credential vault initialized with ${this.storage.getType()}`);

    // Log vault initialization
    this.auditLogger.log(AuditEventType.VAULT_INITIALIZED, {
      success: true,
      details: `Storage type: ${this.storage.getType()}`,
    });
  }

  /**
   * Add a new credential
   */
  async add(input: CredentialInput): Promise<Credential> {
    try {
      // Validate input
      validateServiceName(input.service);
      validateAccountName(input.account);
    } catch (error) {
      // Log validation failure
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
        service: input.service,
        account: input.account,
        success: false,
        details: (error as Error).message,
      });
      throw error;
    }

    if (!this.storage) {
      await this.initialize();
    }

    const id = `${input.service}:${input.account}`;
    const now = Date.now();

    // Check if credential already exists
    const existing = this.db
      .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
      .get(input.service, input.account) as CredentialMetadata | undefined;

    if (existing) {
      // Log duplicate attempt
      this.auditLogger.log(AuditEventType.CREDENTIAL_ADDED, {
        service: input.service,
        account: input.account,
        success: false,
        details: 'Credential already exists',
      });

      throw new Error(
        `Credential already exists: ${input.service}/${input.account}. Use update() instead.`
      );
    }

    const credential: Credential = {
      id,
      service: input.service,
      account: input.account,
      value: input.value,
      metadata: {
        createdAt: new Date(now),
        updatedAt: new Date(now),
        expiresAt: input.expiresAt,
        notes: input.notes,
        tags: input.tags,
      },
    };

    // Store value in secure storage
    await this.storage.set(credential);

    // Store metadata in SQLite
    const stmt = this.db.prepare(`
      INSERT INTO credentials (id, service, account, created_at, updated_at, expires_at, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.service,
      input.account,
      now,
      now,
      input.expiresAt ? input.expiresAt.getTime() : null,
      input.notes || null,
      input.tags ? JSON.stringify(input.tags) : null
    );

    logger.info(`Added credential: ${input.service}/${input.account}`);

    // Log successful add
    this.auditLogger.log(AuditEventType.CREDENTIAL_ADDED, {
      service: input.service,
      account: input.account,
      success: true,
      details: input.tags ? `Tags: ${input.tags.join(', ')}` : undefined,
    });

    return credential;
  }

  /**
   * Get a credential by service and account
   */
  async get(service: string, account: string): Promise<Credential | null> {
    try {
      // Validate input
      validateServiceName(service);
      validateAccountName(account);
    } catch (error) {
      // Log validation failure
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
        service,
        account,
        success: false,
        details: (error as Error).message,
      });
      throw error;
    }

    // Check rate limit
    const rateLimitResult = this.rateLimiter.checkLimit(service, account);
    if (!rateLimitResult.allowed) {
      const retrySeconds = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);

      // Log rate limit exceeded
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_RATE_LIMITED, {
        service,
        account,
        success: false,
        details: `Locked until ${rateLimitResult.lockedUntil?.toISOString()}, retry after ${retrySeconds}s`,
      });

      throw new Error(
        `Rate limit exceeded for ${service}/${account}. ` +
        `Account locked until ${rateLimitResult.lockedUntil?.toISOString()}. ` +
        `Retry after ${retrySeconds} seconds.`
      );
    }

    if (!this.storage) {
      await this.initialize();
    }

    // Get metadata from SQLite
    const metadata = this.db
      .prepare('SELECT * FROM credentials WHERE service = ? AND account = ?')
      .get(service, account) as CredentialMetadata | undefined;

    if (!metadata) {
      // Record failed attempt (credential not found)
      this.rateLimiter.recordFailedAttempt(service, account);

      // Log access denied (not found)
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_NOT_FOUND, {
        service,
        account,
        success: false,
        details: 'Credential not found',
      });

      return null;
    }

    // Get value from secure storage
    const credential = await this.storage.get(service, account);

    if (!credential) {
      logger.warn(`Credential metadata exists but value not found: ${service}/${account}`);
      // Record failed attempt (storage mismatch)
      this.rateLimiter.recordFailedAttempt(service, account);

      // Log access denied (storage mismatch)
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_NOT_FOUND, {
        service,
        account,
        success: false,
        details: 'Storage mismatch - metadata exists but value not found',
      });

      return null;
    }

    // Merge metadata from SQLite
    credential.metadata = {
      createdAt: new Date(metadata.created_at),
      updatedAt: new Date(metadata.updated_at),
      expiresAt: metadata.expires_at ? new Date(metadata.expires_at) : undefined,
      notes: metadata.notes || undefined,
      tags: metadata.tags ? JSON.parse(metadata.tags) : undefined,
    };

    // Record successful attempt (reset counter)
    this.rateLimiter.recordSuccessfulAttempt(service, account);

    // Log successful retrieval
    this.auditLogger.log(AuditEventType.CREDENTIAL_RETRIEVED, {
      service,
      account,
      success: true,
    });

    return credential;
  }

  /**
   * Update an existing credential
   */
  async update(
    service: string,
    account: string,
    updates: Partial<CredentialInput>
  ): Promise<Credential> {
    // Validate input
    validateServiceName(service);
    validateAccountName(account);

    if (!this.storage) {
      await this.initialize();
    }

    // Get existing credential
    const existing = await this.get(service, account);

    if (!existing) {
      throw new Error(`Credential not found: ${service}/${account}`);
    }

    const now = Date.now();

    // Update value in secure storage if provided
    if (updates.value) {
      existing.value = updates.value;
      await this.storage.set(existing);
    }

    // Update metadata in SQLite
    const stmt = this.db.prepare(`
      UPDATE credentials
      SET updated_at = ?,
          expires_at = COALESCE(?, expires_at),
          notes = COALESCE(?, notes),
          tags = COALESCE(?, tags)
      WHERE service = ? AND account = ?
    `);

    stmt.run(
      now,
      updates.expiresAt ? updates.expiresAt.getTime() : null,
      updates.notes || null,
      updates.tags ? JSON.stringify(updates.tags) : null,
      service,
      account
    );

    logger.info(`Updated credential: ${service}/${account}`);

    // Log successful update
    this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
      service,
      account,
      success: true,
      details: updates.value ? 'Value updated' : 'Metadata updated',
    });

    // Return updated credential
    return (await this.get(service, account))!;
  }

  /**
   * Delete a credential
   */
  async delete(service: string, account: string): Promise<void> {
    try {
      // Validate input
      validateServiceName(service);
      validateAccountName(account);
    } catch (error) {
      // Log validation failure
      this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
        service,
        account,
        success: false,
        details: (error as Error).message,
      });
      throw error;
    }

    if (!this.storage) {
      await this.initialize();
    }

    // Check if credential exists in SQLite first
    const existing = this.db
      .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
      .get(service, account);

    if (!existing) {
      // Log deletion failure (not found)
      this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
        service,
        account,
        success: false,
        details: 'Credential not found',
      });

      throw new Error(`Credential not found: ${service}/${account}`);
    }

    // Delete from secure storage
    await this.storage.delete(service, account);

    // Delete from SQLite
    const stmt = this.db.prepare('DELETE FROM credentials WHERE service = ? AND account = ?');
    stmt.run(service, account);

    logger.info(`Deleted credential: ${service}/${account}`);

    // Log successful deletion
    this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
      service,
      account,
      success: true,
    });
  }

  /**
   * List credentials (without values)
   */
  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    let sql = 'SELECT * FROM credentials WHERE 1=1';
    const params: any[] = [];

    // Build query
    if (query?.service) {
      sql += ' AND service = ?';
      params.push(query.service);
    }

    if (query?.account) {
      sql += ' AND account = ?';
      params.push(query.account);
    }

    if (query?.id) {
      sql += ' AND id = ?';
      params.push(query.id);
    }

    if (query?.tags && query.tags.length > 0) {
      // Search for any of the provided tags
      const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      query.tags.forEach((tag) => params.push(`%"${tag}"%`));
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as CredentialMetadata[];

    return rows.map((row) => ({
      id: row.id,
      service: row.service,
      account: row.account,
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        notes: row.notes || undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      },
    }));
  }

  /**
   * Find credentials by tag
   */
  async findByTag(tag: string): Promise<Omit<Credential, 'value'>[]> {
    return this.list({ tags: [tag] });
  }

  /**
   * Find expired credentials
   */
  async findExpired(): Promise<Omit<Credential, 'value'>[]> {
    const now = Date.now();

    const rows = this.db
      .prepare('SELECT * FROM credentials WHERE expires_at IS NOT NULL AND expires_at < ?')
      .all(now) as CredentialMetadata[];

    return rows.map((row) => ({
      id: row.id,
      service: row.service,
      account: row.account,
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        notes: row.notes || undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      },
    }));
  }

  /**
   * Delete expired credentials
   */
  async deleteExpired(): Promise<number> {
    const expired = await this.findExpired();

    let deleted = 0;

    for (const cred of expired) {
      try {
        await this.delete(cred.service, cred.account);
        deleted++;
      } catch (error) {
        logger.error(`Failed to delete expired credential: ${cred.service}/${cred.account}`, {
          error,
        });
      }
    }

    logger.info(`Deleted ${deleted} expired credentials`);

    return deleted;
  }

  /**
   * Count credentials
   */
  count(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM credentials').get() as {
      count: number;
    };
    return result.count;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byService: Record<string, number>;
    expired: number;
    expiringSoon: number; // Within 7 days
  } {
    const total = this.count();

    // By service
    const byServiceRows = this.db
      .prepare('SELECT service, COUNT(*) as count FROM credentials GROUP BY service')
      .all() as { service: string; count: number }[];

    const byService: Record<string, number> = {};
    byServiceRows.forEach((row) => {
      byService[row.service] = row.count;
    });

    // Expired
    const now = Date.now();
    const expiredResult = this.db
      .prepare('SELECT COUNT(*) as count FROM credentials WHERE expires_at IS NOT NULL AND expires_at < ?')
      .get(now) as { count: number };

    // Expiring soon (within 7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expiringSoonResult = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM credentials WHERE expires_at IS NOT NULL AND expires_at >= ? AND expires_at < ?'
      )
      .get(now, now + sevenDays) as { count: number };

    return {
      total,
      byService,
      expired: expiredResult.count,
      expiringSoon: expiringSoonResult.count,
    };
  }

  /**
   * Export all credentials (for backup)
   * WARNING: This exports credential VALUES in plain text!
   */
  async export(): Promise<Credential[]> {
    if (!this.storage) {
      await this.initialize();
    }

    const metadataList = await this.list();
    const credentials: Credential[] = [];

    for (const meta of metadataList) {
      const credential = await this.get(meta.service, meta.account);
      if (credential) {
        credentials.push(credential);
      }
    }

    return credentials;
  }

  /**
   * Import credentials (from backup)
   */
  async import(credentials: Credential[]): Promise<{
    imported: number;
    skipped: number;
    errors: number;
  }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const cred of credentials) {
      try {
        // Check if already exists
        const existing = await this.get(cred.service, cred.account);

        if (existing) {
          logger.warn(`Skipping existing credential: ${cred.service}/${cred.account}`);
          skipped++;
          continue;
        }

        // Add credential
        await this.add({
          service: cred.service,
          account: cred.account,
          value: cred.value,
          expiresAt: cred.metadata?.expiresAt,
          notes: cred.metadata?.notes,
          tags: cred.metadata?.tags,
        });

        imported++;
      } catch (error) {
        logger.error(`Failed to import credential: ${cred.service}/${cred.account}`, { error });
        errors++;
      }
    }

    logger.info(`Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    return { imported, skipped, errors };
  }

  /**
   * Register cleanup handlers for process exit
   */
  private registerCleanup(): void {
    const cleanup = () => {
      // Close all instances
      for (const instance of CredentialVault.instances) {
        try {
          instance.close();
        } catch (err) {
          // Log but don't throw during cleanup
          logger.warn('Failed to close database during cleanup', { error: err });
        }
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception, closing database', { error: err });
      cleanup();
      process.exit(1);
    });
  }

  /**
   * Close database connection safely
   */
  close(): void {
    try {
      // Log vault closure
      this.auditLogger.log(AuditEventType.VAULT_CLOSED, {
        success: true,
      });

      // Stop rate limiter cleanup
      this.rateLimiter.stopCleanup();

      // Stop audit logger cleanup
      this.auditLogger.stopCleanup();

      if (this.db) {
        this.db.close();
      }
      // Remove from instances
      CredentialVault.instances.delete(this);
    } catch (error) {
      logger.warn('Database close warning', { error });
      // Don't throw, just log
    }
  }

  /**
   * Get rate limit status for an account
   */
  getRateLimitStatus(service: string, account: string) {
    return this.rateLimiter.getStatus(service, account);
  }

  /**
   * Unlock a rate-limited account (admin operation)
   */
  unlockAccount(service: string, account: string): void {
    this.rateLimiter.unlockAccount(service, account);

    // Log admin unlock operation
    this.auditLogger.log(AuditEventType.ADMIN_UNLOCK_ACCOUNT, {
      service,
      account,
      success: true,
      details: 'Account manually unlocked by admin',
    });
  }

  /**
   * Get all locked accounts
   */
  getLockedAccounts() {
    return this.rateLimiter.getLockedAccounts();
  }

  /**
   * Get rate limiting statistics
   */
  getRateLimitStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * Get audit logs with optional filters
   */
  getAuditLogs(filter?: import('./AuditLogger.js').AuditLogFilter) {
    return this.auditLogger.getLogs(filter);
  }

  /**
   * Get audit statistics
   */
  getAuditStats(filter?: import('./AuditLogger.js').AuditLogFilter) {
    return this.auditLogger.getStats(filter);
  }

  /**
   * Export audit logs to JSON
   */
  exportAuditLogs(filter?: import('./AuditLogger.js').AuditLogFilter): string {
    return this.auditLogger.exportLogs(filter);
  }

  /**
   * Set audit log retention period (in days)
   */
  setAuditRetention(days: number): void {
    this.auditLogger.setRetentionDays(days);
  }

  /**
   * Get audit log retention period (in days)
   */
  getAuditRetention(): number {
    return this.auditLogger.getRetentionDays();
  }
}
