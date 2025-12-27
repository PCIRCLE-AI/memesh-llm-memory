/**
 * Multi-Tenant Manager - Enterprise Multi-Tenancy Support
 *
 * Provides comprehensive multi-tenancy features:
 * - Tenant isolation and namespace management
 * - Tenant-specific policies and quotas
 * - Cross-tenant auditing and compliance
 * - Tenant lifecycle management
 * - Resource usage tracking per tenant
 */

import type Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { AuditLogger, AuditEventType } from './AuditLogger.js';
import type { Identity } from './AccessControl.js';
import { safeTimestampToDate } from './utils/timestamp.js';

/**
 * Tenant status
 */
export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DISABLED = 'disabled',
  PENDING = 'pending',
}

/**
 * Tenant tier (for different feature sets)
 */
export enum TenantTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * Tenant configuration
 */
export interface Tenant {
  /**
   * Unique tenant ID
   */
  id: string;

  /**
   * Tenant display name
   */
  name: string;

  /**
   * Tenant tier
   */
  tier: TenantTier;

  /**
   * Tenant status
   */
  status: TenantStatus;

  /**
   * Tenant creation date
   */
  createdAt: Date;

  /**
   * Last updated date
   */
  updatedAt: Date;

  /**
   * Tenant-specific settings
   */
  settings?: TenantSettings;

  /**
   * Tenant metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Tenant-specific settings
 */
export interface TenantSettings {
  /**
   * Maximum number of credentials
   */
  maxCredentials?: number;

  /**
   * Maximum number of users
   */
  maxUsers?: number;

  /**
   * Retention period in days
   */
  retentionDays?: number;

  /**
   * Enable encryption at rest
   */
  encryptionEnabled?: boolean;

  /**
   * Enable audit logging
   */
  auditEnabled?: boolean;

  /**
   * Enable credential sharing
   */
  sharingEnabled?: boolean;

  /**
   * Enable automatic rotation
   */
  autoRotationEnabled?: boolean;

  /**
   * Custom rotation policies
   */
  rotationPolicies?: Record<string, any>;

  /**
   * IP whitelist
   */
  ipWhitelist?: string[];

  /**
   * Allowed storage backends
   */
  allowedBackends?: string[];
}

/**
 * Tenant quota configuration
 */
export interface TenantQuota {
  tenantId: string;
  credentialCount: number;
  maxCredentials: number;
  userCount: number;
  maxUsers: number;
  storageBytes: number;
  maxStorageBytes: number;
  apiCallsPerHour: number;
  maxApiCallsPerHour: number;
}

/**
 * Tenant usage statistics
 */
export interface TenantUsageStats {
  tenantId: string;
  credentialCount: number;
  userCount: number;
  storageBytes: number;
  apiCallsToday: number;
  apiCallsThisMonth: number;
  lastActivityAt: Date | null;
  topServices: Array<{ service: string; count: number }>;
}

/**
 * Database row type for tenants table
 * Internal interface for type-safe row mapping
 */
interface TenantRow {
  id: string;
  name: string;
  tier: string;
  status: string;
  created_at: number;
  updated_at: number;
  settings?: string | null;
  metadata?: string | null;
}

/**
 * Multi-Tenant Manager
 */
export class MultiTenantManager {
  private db: Database.Database;
  private auditLogger: AuditLogger;

  constructor(db: Database.Database, auditLogger: AuditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        settings TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS tenant_quotas (
        tenant_id TEXT PRIMARY KEY,
        max_credentials INTEGER NOT NULL DEFAULT 100,
        max_users INTEGER NOT NULL DEFAULT 10,
        max_storage_bytes INTEGER NOT NULL DEFAULT 10485760,
        max_api_calls_per_hour INTEGER NOT NULL DEFAULT 1000,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tenant_usage (
        tenant_id TEXT NOT NULL,
        date TEXT NOT NULL,
        credential_count INTEGER NOT NULL DEFAULT 0,
        user_count INTEGER NOT NULL DEFAULT 0,
        storage_bytes INTEGER NOT NULL DEFAULT 0,
        api_calls INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, date),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tenant_users (
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        added_by TEXT,
        metadata TEXT,
        PRIMARY KEY (tenant_id, user_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenants_tier ON tenants(tier);
      CREATE INDEX IF NOT EXISTS idx_tenant_usage_date ON tenant_usage(date);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
    `);

    logger.info('Multi-tenant manager initialized');
  }

  /**
   * Create a new tenant
   */
  createTenant(
    id: string,
    name: string,
    tier: TenantTier,
    createdBy: Identity,
    settings?: TenantSettings,
    metadata?: Record<string, any>
  ): Tenant {
    const now = Date.now();

    // Default quotas based on tier
    const defaultQuotas = this.getDefaultQuotas(tier);

    // Insert tenant
    this.db
      .prepare(
        `INSERT INTO tenants (id, name, tier, status, created_at, updated_at, settings, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        tier,
        TenantStatus.ACTIVE,
        now,
        now,
        settings ? JSON.stringify(settings) : null,
        metadata ? JSON.stringify(metadata) : null
      );

    // Insert default quotas
    this.db
      .prepare(
        `INSERT INTO tenant_quotas
         (tenant_id, max_credentials, max_users, max_storage_bytes, max_api_calls_per_hour)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        id,
        defaultQuotas.maxCredentials,
        defaultQuotas.maxUsers,
        defaultQuotas.maxStorageBytes,
        defaultQuotas.maxApiCallsPerHour
      );

    const tenant: Tenant = {
      id,
      name,
      tier,
      status: TenantStatus.ACTIVE,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      settings,
      metadata,
    };

    // Audit log
    this.auditLogger.log(AuditEventType.ACCESS_GRANTED, {
      service: 'tenant-management',
      account: id,
      success: true,
      details: JSON.stringify({
        action: 'create_tenant',
        tenantId: id,
        tier,
        createdBy: `${createdBy.type}:${createdBy.id}`,
      }),
    });

    logger.info('Tenant created', { tenantId: id, name, tier });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  getTenant(tenantId: string): Tenant | null {
    const row = this.db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .get(tenantId) as any;

    return row ? this.rowToTenant(row) : null;
  }

  /**
   * Update tenant
   */
  updateTenant(
    tenantId: string,
    updates: {
      name?: string;
      tier?: TenantTier;
      status?: TenantStatus;
      settings?: TenantSettings;
      metadata?: Record<string, any>;
    },
    updatedBy: Identity
  ): Tenant {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const now = Date.now();
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }

    if (updates.tier !== undefined) {
      updateFields.push('tier = ?');
      updateValues.push(updates.tier);

      // Update quotas based on new tier
      const newQuotas = this.getDefaultQuotas(updates.tier);
      this.updateQuotas(tenantId, newQuotas);
    }

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }

    if (updates.settings !== undefined) {
      updateFields.push('settings = ?');
      updateValues.push(JSON.stringify(updates.settings));
    }

    if (updates.metadata !== undefined) {
      updateFields.push('metadata = ?');
      updateValues.push(JSON.stringify(updates.metadata));
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);

    updateValues.push(tenantId);

    this.db
      .prepare(`UPDATE tenants SET ${updateFields.join(', ')} WHERE id = ?`)
      .run(...updateValues);

    // Audit log
    this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
      service: 'tenant-management',
      account: tenantId,
      success: true,
      details: JSON.stringify({
        action: 'update_tenant',
        tenantId,
        updates: Object.keys(updates),
        updatedBy: `${updatedBy.type}:${updatedBy.id}`,
      }),
    });

    logger.info('Tenant updated', { tenantId, updates: Object.keys(updates) });

    return this.getTenant(tenantId)!;
  }

  /**
   * Delete tenant
   */
  deleteTenant(tenantId: string, deletedBy: Identity): void {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Soft delete - change status to disabled
    this.updateTenant(tenantId, { status: TenantStatus.DISABLED }, deletedBy);

    // Audit log
    this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
      service: 'tenant-management',
      account: tenantId,
      success: true,
      details: JSON.stringify({
        action: 'delete_tenant',
        tenantId,
        deletedBy: `${deletedBy.type}:${deletedBy.id}`,
      }),
    });

    logger.info('Tenant deleted (soft)', { tenantId });
  }

  /**
   * List all tenants
   */
  listTenants(filters?: {
    status?: TenantStatus;
    tier?: TenantTier;
    limit?: number;
    offset?: number;
  }): Tenant[] {
    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.tier) {
      query += ' AND tier = ?';
      params.push(filters.tier);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map((row) => this.rowToTenant(row));
  }

  /**
   * Add user to tenant
   */
  addUserToTenant(
    tenantId: string,
    userId: string,
    role: string,
    addedBy: Identity,
    metadata?: Record<string, any>
  ): void {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Check quota
    const quota = this.getQuota(tenantId);
    const usage = this.getUsageStats(tenantId);

    if (usage.userCount >= quota.maxUsers) {
      throw new Error(
        `User quota exceeded for tenant ${tenantId} (${usage.userCount}/${quota.maxUsers})`
      );
    }

    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO tenant_users (tenant_id, user_id, role, added_at, added_by, metadata)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id) DO UPDATE SET
           role = excluded.role,
           metadata = excluded.metadata`
      )
      .run(
        tenantId,
        userId,
        role,
        now,
        `${addedBy.type}:${addedBy.id}`,
        metadata ? JSON.stringify(metadata) : null
      );

    logger.info('User added to tenant', { tenantId, userId, role });
  }

  /**
   * Remove user from tenant
   */
  removeUserFromTenant(tenantId: string, userId: string, removedBy: Identity): void {
    this.db
      .prepare('DELETE FROM tenant_users WHERE tenant_id = ? AND user_id = ?')
      .run(tenantId, userId);

    logger.info('User removed from tenant', { tenantId, userId });
  }

  /**
   * Get users for tenant
   */
  getTenantUsers(tenantId: string): Array<{
    userId: string;
    role: string;
    addedAt: Date;
    metadata?: Record<string, any>;
  }> {
    const rows = this.db
      .prepare('SELECT * FROM tenant_users WHERE tenant_id = ? ORDER BY added_at')
      .all(tenantId) as any[];

    return rows.map((row) => ({
      userId: row.user_id,
      role: row.role,
      addedAt: new Date(row.added_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Get tenant quota
   */
  getQuota(tenantId: string): TenantQuota {
    const quotaRow = this.db
      .prepare('SELECT * FROM tenant_quotas WHERE tenant_id = ?')
      .get(tenantId) as any;

    if (!quotaRow) {
      throw new Error(`Quota not found for tenant: ${tenantId}`);
    }

    const usage = this.getCurrentUsage(tenantId);

    return {
      tenantId,
      credentialCount: usage.credentialCount,
      maxCredentials: quotaRow.max_credentials,
      userCount: usage.userCount,
      maxUsers: quotaRow.max_users,
      storageBytes: usage.storageBytes,
      maxStorageBytes: quotaRow.max_storage_bytes,
      apiCallsPerHour: usage.apiCallsPerHour,
      maxApiCallsPerHour: quotaRow.max_api_calls_per_hour,
    };
  }

  /**
   * Update tenant quotas
   */
  updateQuotas(
    tenantId: string,
    quotas: {
      maxCredentials?: number;
      maxUsers?: number;
      maxStorageBytes?: number;
      maxApiCallsPerHour?: number;
    }
  ): void {
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (quotas.maxCredentials !== undefined) {
      updateFields.push('max_credentials = ?');
      updateValues.push(quotas.maxCredentials);
    }

    if (quotas.maxUsers !== undefined) {
      updateFields.push('max_users = ?');
      updateValues.push(quotas.maxUsers);
    }

    if (quotas.maxStorageBytes !== undefined) {
      updateFields.push('max_storage_bytes = ?');
      updateValues.push(quotas.maxStorageBytes);
    }

    if (quotas.maxApiCallsPerHour !== undefined) {
      updateFields.push('max_api_calls_per_hour = ?');
      updateValues.push(quotas.maxApiCallsPerHour);
    }

    updateValues.push(tenantId);

    this.db
      .prepare(`UPDATE tenant_quotas SET ${updateFields.join(', ')} WHERE tenant_id = ?`)
      .run(...updateValues);

    logger.info('Tenant quotas updated', { tenantId, quotas });
  }

  /**
   * Check if operation is allowed (quota enforcement)
   */
  checkQuota(
    tenantId: string,
    operation: 'credential' | 'user' | 'storage' | 'api_call',
    amount: number = 1
  ): { allowed: boolean; reason?: string } {
    const quota = this.getQuota(tenantId);

    switch (operation) {
      case 'credential':
        if (quota.credentialCount + amount > quota.maxCredentials) {
          return {
            allowed: false,
            reason: `Credential quota exceeded (${quota.credentialCount}/${quota.maxCredentials})`,
          };
        }
        break;

      case 'user':
        if (quota.userCount + amount > quota.maxUsers) {
          return {
            allowed: false,
            reason: `User quota exceeded (${quota.userCount}/${quota.maxUsers})`,
          };
        }
        break;

      case 'storage':
        if (quota.storageBytes + amount > quota.maxStorageBytes) {
          return {
            allowed: false,
            reason: `Storage quota exceeded (${quota.storageBytes}/${quota.maxStorageBytes} bytes)`,
          };
        }
        break;

      case 'api_call':
        if (quota.apiCallsPerHour + amount > quota.maxApiCallsPerHour) {
          return {
            allowed: false,
            reason: `API call quota exceeded (${quota.apiCallsPerHour}/${quota.maxApiCallsPerHour} per hour)`,
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Record API call
   */
  recordApiCall(tenantId: string): void {
    const date = this.getToday();

    this.db
      .prepare(
        `INSERT INTO tenant_usage (tenant_id, date, api_calls)
         VALUES (?, ?, 1)
         ON CONFLICT(tenant_id, date) DO UPDATE SET
           api_calls = api_calls + 1`
      )
      .run(tenantId, date);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(tenantId: string): TenantUsageStats {
    const usage = this.getCurrentUsage(tenantId);

    // Get top services
    const topServices = this.db
      .prepare(
        `SELECT service, COUNT(*) as count
         FROM credentials
         WHERE id LIKE ?
         GROUP BY service
         ORDER BY count DESC
         LIMIT 5`
      )
      .all(`${tenantId}:%`) as any[];

    return {
      tenantId,
      credentialCount: usage.credentialCount,
      userCount: usage.userCount,
      storageBytes: usage.storageBytes,
      apiCallsToday: usage.apiCallsToday,
      apiCallsThisMonth: usage.apiCallsThisMonth,
      lastActivityAt: usage.lastActivityAt,
      topServices: topServices.map((s) => ({ service: s.service, count: s.count })),
    };
  }

  /**
   * Get default quotas for tier
   */
  private getDefaultQuotas(tier: TenantTier): {
    maxCredentials: number;
    maxUsers: number;
    maxStorageBytes: number;
    maxApiCallsPerHour: number;
  } {
    switch (tier) {
      case TenantTier.FREE:
        return {
          maxCredentials: 10,
          maxUsers: 1,
          maxStorageBytes: 1048576, // 1 MB
          maxApiCallsPerHour: 100,
        };

      case TenantTier.BASIC:
        return {
          maxCredentials: 100,
          maxUsers: 5,
          maxStorageBytes: 10485760, // 10 MB
          maxApiCallsPerHour: 1000,
        };

      case TenantTier.PROFESSIONAL:
        return {
          maxCredentials: 1000,
          maxUsers: 25,
          maxStorageBytes: 104857600, // 100 MB
          maxApiCallsPerHour: 10000,
        };

      case TenantTier.ENTERPRISE:
        return {
          maxCredentials: -1, // Unlimited
          maxUsers: -1, // Unlimited
          maxStorageBytes: -1, // Unlimited
          maxApiCallsPerHour: -1, // Unlimited
        };
    }
  }

  /**
   * Get current usage
   */
  private getCurrentUsage(tenantId: string): {
    credentialCount: number;
    userCount: number;
    storageBytes: number;
    apiCallsPerHour: number;
    apiCallsToday: number;
    apiCallsThisMonth: number;
    lastActivityAt: Date | null;
  } {
    // Count credentials with tenant prefix
    const credentialRow = this.db
      .prepare('SELECT COUNT(*) as count FROM credentials WHERE id LIKE ?')
      .get(`${tenantId}:%`) as any;

    // Count users
    const userRow = this.db
      .prepare('SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?')
      .get(tenantId) as any;

    // Get today's usage
    const today = this.getToday();
    const todayUsage = this.db
      .prepare('SELECT * FROM tenant_usage WHERE tenant_id = ? AND date = ?')
      .get(tenantId, today) as any;

    // Get this month's API calls
    const thisMonth = today.substring(0, 7); // YYYY-MM
    const monthUsage = this.db
      .prepare(
        `SELECT SUM(api_calls) as total
         FROM tenant_usage
         WHERE tenant_id = ? AND date LIKE ?`
      )
      .get(tenantId, `${thisMonth}%`) as any;

    // Calculate actual storage used by tenant's credentials
    // Use SQL aggregation to calculate storage size (in bytes)
    // For UTF-8 TEXT, length() gives characters, so we multiply by average byte-per-char ratio
    let storageBytes = 0;
    try {
      const storageStats = this.db
        .prepare(
          `SELECT
            SUM(COALESCE(length(notes), 0) + COALESCE(length(tags), 0)) as char_count
           FROM credentials
           WHERE id LIKE ?`
        )
        .get(`${tenantId}:%`) as any;

      // For UTF-8, average 1.5 bytes per character (conservative estimate)
      // Most English text is 1 byte/char, CJK can be 3 bytes/char
      storageBytes = storageStats?.char_count
        ? Math.ceil(storageStats.char_count * 1.5)
        : 0;
    } catch (error) {
      logger.warn('Failed to calculate storage for tenant', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      storageBytes = 0;
    }

    // Track last activity from most recent credential update or API call
    let lastActivityAt: Date | null = null;
    try {
      // Get most recent credential update
      const recentCredential = this.db
        .prepare(
          `SELECT MAX(updated_at) as last_update
           FROM credentials
           WHERE id LIKE ?`
        )
        .get(`${tenantId}:%`) as any;

      // Get most recent API call date
      const recentUsage = this.db
        .prepare(
          `SELECT MAX(date) as last_date
           FROM tenant_usage
           WHERE tenant_id = ?`
        )
        .get(tenantId) as any;

      const credentialTime = recentCredential?.last_update
        ? safeTimestampToDate(recentCredential.last_update)
        : null;
      const usageTime = recentUsage?.last_date
        ? safeTimestampToDate(recentUsage.last_date)
        : null;

      // Use the most recent activity
      if (credentialTime && usageTime) {
        lastActivityAt = credentialTime > usageTime ? credentialTime : usageTime;
      } else if (credentialTime) {
        lastActivityAt = credentialTime;
      } else if (usageTime) {
        lastActivityAt = usageTime;
      }
    } catch (error) {
      logger.warn('Failed to track last activity for tenant', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      lastActivityAt = null;
    }

    return {
      credentialCount: credentialRow?.count || 0,
      userCount: userRow?.count || 0,
      storageBytes,
      apiCallsPerHour: todayUsage?.api_calls || 0,
      apiCallsToday: todayUsage?.api_calls || 0,
      apiCallsThisMonth: monthUsage?.total || 0,
      lastActivityAt,
    };
  }

  /**
   * Get today's date string (YYYY-MM-DD)
   */
  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Convert database row to Tenant
   */
  private rowToTenant(row: TenantRow): Tenant {
    return {
      id: row.id,
      name: row.name,
      tier: row.tier as TenantTier,
      status: row.status as TenantStatus,
      createdAt: safeTimestampToDate(row.created_at) || new Date(),
      updatedAt: safeTimestampToDate(row.updated_at) || new Date(),
      settings: row.settings ? JSON.parse(row.settings) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
