import { logger } from '../utils/logger.js';
import { AuditEventType } from './AuditLogger.js';
import { safeTimestampToDate } from './utils/timestamp.js';
export var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "active";
    TenantStatus["SUSPENDED"] = "suspended";
    TenantStatus["DISABLED"] = "disabled";
    TenantStatus["PENDING"] = "pending";
})(TenantStatus || (TenantStatus = {}));
export var TenantTier;
(function (TenantTier) {
    TenantTier["FREE"] = "free";
    TenantTier["BASIC"] = "basic";
    TenantTier["PROFESSIONAL"] = "professional";
    TenantTier["ENTERPRISE"] = "enterprise";
})(TenantTier || (TenantTier = {}));
export class MultiTenantManager {
    db;
    auditLogger;
    constructor(db, auditLogger) {
        this.db = db;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
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
    createTenant(id, name, tier, createdBy, settings, metadata) {
        const now = Date.now();
        const defaultQuotas = this.getDefaultQuotas(tier);
        this.db
            .prepare(`INSERT INTO tenants (id, name, tier, status, created_at, updated_at, settings, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, name, tier, TenantStatus.ACTIVE, now, now, settings ? JSON.stringify(settings) : null, metadata ? JSON.stringify(metadata) : null);
        this.db
            .prepare(`INSERT INTO tenant_quotas
         (tenant_id, max_credentials, max_users, max_storage_bytes, max_api_calls_per_hour)
         VALUES (?, ?, ?, ?, ?)`)
            .run(id, defaultQuotas.maxCredentials, defaultQuotas.maxUsers, defaultQuotas.maxStorageBytes, defaultQuotas.maxApiCallsPerHour);
        const tenant = {
            id,
            name,
            tier,
            status: TenantStatus.ACTIVE,
            createdAt: new Date(now),
            updatedAt: new Date(now),
            settings,
            metadata,
        };
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
    getTenant(tenantId) {
        const row = this.db
            .prepare('SELECT * FROM tenants WHERE id = ?')
            .get(tenantId);
        return row ? this.rowToTenant(row) : null;
    }
    updateTenant(tenantId, updates, updatedBy) {
        const tenant = this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const now = Date.now();
        const updateFields = [];
        const updateValues = [];
        if (updates.name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(updates.name);
        }
        if (updates.tier !== undefined) {
            updateFields.push('tier = ?');
            updateValues.push(updates.tier);
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
        return this.getTenant(tenantId);
    }
    deleteTenant(tenantId, deletedBy) {
        const tenant = this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        this.updateTenant(tenantId, { status: TenantStatus.DISABLED }, deletedBy);
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
    listTenants(filters) {
        let query = 'SELECT * FROM tenants WHERE 1=1';
        const params = [];
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
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => this.rowToTenant(row));
    }
    addUserToTenant(tenantId, userId, role, addedBy, metadata) {
        const tenant = this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const quota = this.getQuota(tenantId);
        const usage = this.getUsageStats(tenantId);
        if (usage.userCount >= quota.maxUsers) {
            throw new Error(`User quota exceeded for tenant ${tenantId} (${usage.userCount}/${quota.maxUsers})`);
        }
        const now = Date.now();
        this.db
            .prepare(`INSERT INTO tenant_users (tenant_id, user_id, role, added_at, added_by, metadata)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id) DO UPDATE SET
           role = excluded.role,
           metadata = excluded.metadata`)
            .run(tenantId, userId, role, now, `${addedBy.type}:${addedBy.id}`, metadata ? JSON.stringify(metadata) : null);
        logger.info('User added to tenant', { tenantId, userId, role });
    }
    removeUserFromTenant(tenantId, userId, removedBy) {
        this.db
            .prepare('DELETE FROM tenant_users WHERE tenant_id = ? AND user_id = ?')
            .run(tenantId, userId);
        logger.info('User removed from tenant', { tenantId, userId });
    }
    getTenantUsers(tenantId) {
        const rows = this.db
            .prepare('SELECT * FROM tenant_users WHERE tenant_id = ? ORDER BY added_at')
            .all(tenantId);
        return rows.map((row) => ({
            userId: row.user_id,
            role: row.role,
            addedAt: new Date(row.added_at),
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }
    getQuota(tenantId) {
        const quotaRow = this.db
            .prepare('SELECT * FROM tenant_quotas WHERE tenant_id = ?')
            .get(tenantId);
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
    updateQuotas(tenantId, quotas) {
        const updateFields = [];
        const updateValues = [];
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
    checkQuota(tenantId, operation, amount = 1) {
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
    recordApiCall(tenantId) {
        const date = this.getToday();
        this.db
            .prepare(`INSERT INTO tenant_usage (tenant_id, date, api_calls)
         VALUES (?, ?, 1)
         ON CONFLICT(tenant_id, date) DO UPDATE SET
           api_calls = api_calls + 1`)
            .run(tenantId, date);
    }
    getUsageStats(tenantId) {
        const usage = this.getCurrentUsage(tenantId);
        const topServices = this.db
            .prepare(`SELECT service, COUNT(*) as count
         FROM credentials
         WHERE id LIKE ?
         GROUP BY service
         ORDER BY count DESC
         LIMIT 5`)
            .all(`${tenantId}:%`);
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
    getDefaultQuotas(tier) {
        switch (tier) {
            case TenantTier.FREE:
                return {
                    maxCredentials: 10,
                    maxUsers: 1,
                    maxStorageBytes: 1048576,
                    maxApiCallsPerHour: 100,
                };
            case TenantTier.BASIC:
                return {
                    maxCredentials: 100,
                    maxUsers: 5,
                    maxStorageBytes: 10485760,
                    maxApiCallsPerHour: 1000,
                };
            case TenantTier.PROFESSIONAL:
                return {
                    maxCredentials: 1000,
                    maxUsers: 25,
                    maxStorageBytes: 104857600,
                    maxApiCallsPerHour: 10000,
                };
            case TenantTier.ENTERPRISE:
                return {
                    maxCredentials: -1,
                    maxUsers: -1,
                    maxStorageBytes: -1,
                    maxApiCallsPerHour: -1,
                };
        }
    }
    getCurrentUsage(tenantId) {
        const credentialRow = this.db
            .prepare('SELECT COUNT(*) as count FROM credentials WHERE id LIKE ?')
            .get(`${tenantId}:%`);
        const userRow = this.db
            .prepare('SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?')
            .get(tenantId);
        const today = this.getToday();
        const todayUsage = this.db
            .prepare('SELECT * FROM tenant_usage WHERE tenant_id = ? AND date = ?')
            .get(tenantId, today);
        const thisMonth = today.substring(0, 7);
        const monthUsage = this.db
            .prepare(`SELECT SUM(api_calls) as total
         FROM tenant_usage
         WHERE tenant_id = ? AND date LIKE ?`)
            .get(tenantId, `${thisMonth}%`);
        let storageBytes = 0;
        try {
            const storageStats = this.db
                .prepare(`SELECT
            SUM(COALESCE(length(notes), 0) + COALESCE(length(tags), 0)) as char_count
           FROM credentials
           WHERE id LIKE ?`)
                .get(`${tenantId}:%`);
            storageBytes = storageStats?.char_count
                ? Math.ceil(storageStats.char_count * 1.5)
                : 0;
        }
        catch (error) {
            logger.warn('Failed to calculate storage for tenant', {
                tenantId,
                error: error instanceof Error ? error.message : String(error),
            });
            storageBytes = 0;
        }
        let lastActivityAt = null;
        try {
            const recentCredential = this.db
                .prepare(`SELECT MAX(updated_at) as last_update
           FROM credentials
           WHERE id LIKE ?`)
                .get(`${tenantId}:%`);
            const recentUsage = this.db
                .prepare(`SELECT MAX(date) as last_date
           FROM tenant_usage
           WHERE tenant_id = ?`)
                .get(tenantId);
            const credentialTime = recentCredential?.last_update
                ? safeTimestampToDate(recentCredential.last_update)
                : null;
            const usageTime = recentUsage?.last_date
                ? safeTimestampToDate(recentUsage.last_date)
                : null;
            if (credentialTime && usageTime) {
                lastActivityAt = credentialTime > usageTime ? credentialTime : usageTime;
            }
            else if (credentialTime) {
                lastActivityAt = credentialTime;
            }
            else if (usageTime) {
                lastActivityAt = usageTime;
            }
        }
        catch (error) {
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
    getToday() {
        return new Date().toISOString().split('T')[0];
    }
    rowToTenant(row) {
        return {
            id: row.id,
            name: row.name,
            tier: row.tier,
            status: row.status,
            createdAt: safeTimestampToDate(row.created_at) || new Date(),
            updatedAt: safeTimestampToDate(row.updated_at) || new Date(),
            settings: row.settings ? JSON.parse(row.settings) : undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }
}
//# sourceMappingURL=MultiTenantManager.js.map