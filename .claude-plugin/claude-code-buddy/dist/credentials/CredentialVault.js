import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createSecureStorage } from './storage/index.js';
import { createDatabase } from './DatabaseFactory.js';
import { logger } from '../utils/logger.js';
import { RateLimiter } from './RateLimiter.js';
import { AuditLogger, AuditEventType, AuditSeverity } from './AuditLogger.js';
import { RotationPolicy } from './RotationPolicy.js';
import { AccessControl, Permission } from './AccessControl.js';
import { safeTimestampToDate } from './utils/timestamp.js';
import { validateServiceName, validateAccountName } from './validation.js';
function getVaultPath() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const vaultDir = join(homeDir, '.smart-agents', 'vault');
    if (!existsSync(vaultDir)) {
        mkdirSync(vaultDir, { recursive: true, mode: 0o700 });
    }
    return join(vaultDir, 'credentials.db');
}
export class CredentialVault {
    db;
    storage;
    rateLimiter;
    rotationPolicy;
    auditLogger;
    accessControl;
    static cleanupRegistered = false;
    static instances = new Set();
    ownsDb;
    static create(dbPath, identity) {
        const path = dbPath || getVaultPath();
        const db = createDatabase(path);
        const vault = new CredentialVault();
        vault.db = db;
        vault.storage = null;
        vault.ownsDb = true;
        vault.initializeSchema();
        vault.rateLimiter = new RateLimiter(db);
        vault.auditLogger = new AuditLogger(db);
        vault.rotationPolicy = new RotationPolicy(db);
        vault.accessControl = new AccessControl(db, identity);
        vault.registerInstance();
        return vault;
    }
    static createWithDI(db, storage, auditLogger, identity) {
        const vault = new CredentialVault();
        vault.db = db;
        vault.storage = storage;
        vault.auditLogger = auditLogger;
        vault.ownsDb = false;
        vault.rateLimiter = new RateLimiter(db);
        vault.rotationPolicy = new RotationPolicy(db);
        vault.accessControl = new AccessControl(db, identity);
        vault.registerInstance();
        return vault;
    }
    constructor() {
    }
    registerInstance() {
        CredentialVault.instances.add(this);
        if (!CredentialVault.cleanupRegistered) {
            this.registerCleanup();
            CredentialVault.cleanupRegistered = true;
        }
    }
    initializeSchema() {
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
      CREATE INDEX IF NOT EXISTS idx_id_prefix ON credentials(id);
    `);
    }
    async initialize() {
        this.storage = await createSecureStorage();
        logger.info(`Credential vault initialized with ${this.storage.getType()}`);
        this.auditLogger.log(AuditEventType.VAULT_INITIALIZED, {
            success: true,
            details: `Storage type: ${this.storage.getType()}`,
        });
    }
    mapTimestampsToMetadata(row) {
        return {
            createdAt: safeTimestampToDate(row.created_at) || new Date(),
            updatedAt: safeTimestampToDate(row.updated_at) || new Date(),
            expiresAt: row.expires_at ? safeTimestampToDate(row.expires_at) || undefined : undefined,
            notes: row.notes || undefined,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
        };
    }
    async add(input) {
        try {
            validateServiceName(input.service);
            validateAccountName(input.account);
        }
        catch (error) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service: input.service,
                account: input.account,
                success: false,
                details: error.message,
            });
            throw error;
        }
        const permCheck = this.accessControl.checkPermission(Permission.WRITE, input.service, input.account);
        if (!permCheck.allowed) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service: input.service,
                account: input.account,
                success: false,
                severity: AuditSeverity.WARNING,
                details: permCheck.reason || 'Permission denied: WRITE',
            });
            throw new Error(permCheck.reason || 'Permission denied: WRITE operation');
        }
        if (!this.storage) {
            await this.initialize();
        }
        const id = `${input.service}:${input.account}`;
        const now = Date.now();
        const existing = this.db
            .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
            .get(input.service, input.account);
        if (existing) {
            this.auditLogger.log(AuditEventType.CREDENTIAL_ADDED, {
                service: input.service,
                account: input.account,
                success: false,
                details: 'Credential already exists',
            });
            throw new Error(`Credential already exists: ${input.service}/${input.account}. Use update() instead.`);
        }
        const credential = {
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
        await this.storage.set(credential);
        const stmt = this.db.prepare(`
      INSERT INTO credentials (id, service, account, created_at, updated_at, expires_at, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, input.service, input.account, now, now, input.expiresAt ? input.expiresAt.getTime() : null, input.notes || null, input.tags ? JSON.stringify(input.tags) : null);
        logger.info(`Added credential: ${input.service}/${input.account}`);
        this.auditLogger.log(AuditEventType.CREDENTIAL_ADDED, {
            service: input.service,
            account: input.account,
            success: true,
            details: input.tags ? `Tags: ${input.tags.join(', ')}` : undefined,
        });
        return credential;
    }
    async get(service, account) {
        try {
            validateServiceName(service);
            validateAccountName(account);
        }
        catch (error) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                details: error.message,
            });
            throw error;
        }
        const permCheck = this.accessControl.checkPermission(Permission.READ, service, account);
        if (!permCheck.allowed) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                severity: AuditSeverity.WARNING,
                details: permCheck.reason || 'Permission denied: READ',
            });
            throw new Error(permCheck.reason || 'Permission denied: READ operation');
        }
        const rateLimitResult = this.rateLimiter.checkLimit(service, account);
        if (!rateLimitResult.allowed) {
            const retrySeconds = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_RATE_LIMITED, {
                service,
                account,
                success: false,
                details: `Locked until ${rateLimitResult.lockedUntil?.toISOString()}, retry after ${retrySeconds}s`,
            });
            throw new Error(`Rate limit exceeded for ${service}/${account}. ` +
                `Account locked until ${rateLimitResult.lockedUntil?.toISOString()}. ` +
                `Retry after ${retrySeconds} seconds.`);
        }
        if (!this.storage) {
            await this.initialize();
        }
        const metadata = this.db
            .prepare('SELECT * FROM credentials WHERE service = ? AND account = ?')
            .get(service, account);
        if (!metadata) {
            this.rateLimiter.recordFailedAttempt(service, account);
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_NOT_FOUND, {
                service,
                account,
                success: false,
                details: 'Credential not found',
            });
            return null;
        }
        const rotationStatus = this.rotationPolicy.checkRotationStatus(service, account);
        if (rotationStatus.isExpired && rotationStatus.policy?.enforceRotation) {
            this.rateLimiter.recordFailedAttempt(service, account);
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_NOT_FOUND, {
                service,
                account,
                success: false,
                severity: AuditSeverity.CRITICAL,
                details: `Credential expired ${Math.abs(rotationStatus.daysUntilExpiration)} days ago (policy: ${rotationStatus.policy.name})`,
            });
            throw new Error(`Credential expired and rotation is enforced. ` +
                `Expired ${Math.abs(rotationStatus.daysUntilExpiration)} days ago. ` +
                `Policy: ${rotationStatus.policy.name}`);
        }
        if (rotationStatus.needsRotation && rotationStatus.warningMessage) {
            logger.warn(rotationStatus.warningMessage, { service, account });
            this.auditLogger.log(AuditEventType.CREDENTIAL_RETRIEVED, {
                service,
                account,
                success: true,
                severity: AuditSeverity.WARNING,
                details: rotationStatus.warningMessage,
            });
        }
        const credential = await this.storage.get(service, account);
        if (!credential) {
            logger.warn(`Credential metadata exists but value not found: ${service}/${account}`);
            this.rateLimiter.recordFailedAttempt(service, account);
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_NOT_FOUND, {
                service,
                account,
                success: false,
                details: 'Storage mismatch - metadata exists but value not found',
            });
            return null;
        }
        credential.metadata = this.mapTimestampsToMetadata(metadata);
        this.rateLimiter.recordSuccessfulAttempt(service, account);
        this.auditLogger.log(AuditEventType.CREDENTIAL_RETRIEVED, {
            service,
            account,
            success: true,
        });
        return credential;
    }
    async update(service, account, updates) {
        try {
            validateServiceName(service);
            validateAccountName(account);
        }
        catch (error) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                details: error.message,
            });
            throw error;
        }
        const permCheck = this.accessControl.checkPermission(Permission.WRITE, service, account);
        if (!permCheck.allowed) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                severity: AuditSeverity.WARNING,
                details: permCheck.reason || 'Permission denied: WRITE',
            });
            throw new Error(permCheck.reason || 'Permission denied: WRITE operation');
        }
        if (!this.storage) {
            await this.initialize();
        }
        const existing = await this.get(service, account);
        if (!existing) {
            throw new Error(`Credential not found: ${service}/${account}`);
        }
        const now = Date.now();
        if (updates.value) {
            existing.value = updates.value;
            await this.storage.set(existing);
        }
        const stmt = this.db.prepare(`
      UPDATE credentials
      SET updated_at = ?,
          expires_at = COALESCE(?, expires_at),
          notes = COALESCE(?, notes),
          tags = COALESCE(?, tags)
      WHERE service = ? AND account = ?
    `);
        stmt.run(now, updates.expiresAt ? updates.expiresAt.getTime() : null, updates.notes || null, updates.tags ? JSON.stringify(updates.tags) : null, service, account);
        logger.info(`Updated credential: ${service}/${account}`);
        this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
            service,
            account,
            success: true,
            details: updates.value ? 'Value updated' : 'Metadata updated',
        });
        return (await this.get(service, account));
    }
    async delete(service, account) {
        try {
            validateServiceName(service);
            validateAccountName(account);
        }
        catch (error) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                details: error.message,
            });
            throw error;
        }
        const permCheck = this.accessControl.checkPermission(Permission.DELETE, service, account);
        if (!permCheck.allowed) {
            this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                service,
                account,
                success: false,
                severity: AuditSeverity.WARNING,
                details: permCheck.reason || 'Permission denied: DELETE',
            });
            throw new Error(permCheck.reason || 'Permission denied: DELETE operation');
        }
        if (!this.storage) {
            await this.initialize();
        }
        const existing = this.db
            .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
            .get(service, account);
        if (!existing) {
            this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
                service,
                account,
                success: false,
                details: 'Credential not found',
            });
            throw new Error(`Credential not found: ${service}/${account}`);
        }
        await this.storage.delete(service, account);
        const stmt = this.db.prepare('DELETE FROM credentials WHERE service = ? AND account = ?');
        stmt.run(service, account);
        logger.info(`Deleted credential: ${service}/${account}`);
        this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
            service,
            account,
            success: true,
        });
    }
    async list(query) {
        let sql = 'SELECT * FROM credentials WHERE 1=1';
        const params = [];
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
            const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
            sql += ` AND (${tagConditions})`;
            query.tags.forEach((tag) => params.push(`%"${tag}"%`));
        }
        sql += ' ORDER BY created_at DESC';
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((row) => ({
            id: row.id,
            service: row.service,
            account: row.account,
            metadata: this.mapTimestampsToMetadata(row),
        }));
    }
    async findByTag(tag) {
        return this.list({ tags: [tag] });
    }
    async findExpired() {
        const now = Date.now();
        const rows = this.db
            .prepare('SELECT * FROM credentials WHERE expires_at IS NOT NULL AND expires_at < ?')
            .all(now);
        return rows.map((row) => ({
            id: row.id,
            service: row.service,
            account: row.account,
            metadata: this.mapTimestampsToMetadata(row),
        }));
    }
    async deleteExpired() {
        const expired = await this.findExpired();
        let deleted = 0;
        for (const cred of expired) {
            try {
                await this.delete(cred.service, cred.account);
                deleted++;
            }
            catch (error) {
                logger.error(`Failed to delete expired credential: ${cred.service}/${cred.account}`, {
                    error,
                });
            }
        }
        logger.info(`Deleted ${deleted} expired credentials`);
        return deleted;
    }
    count() {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM credentials').get();
        return result.count;
    }
    getStats() {
        const total = this.count();
        const byServiceRows = this.db
            .prepare('SELECT service, COUNT(*) as count FROM credentials GROUP BY service')
            .all();
        const byService = {};
        byServiceRows.forEach((row) => {
            byService[row.service] = row.count;
        });
        const now = Date.now();
        const expiredResult = this.db
            .prepare('SELECT COUNT(*) as count FROM credentials WHERE expires_at IS NOT NULL AND expires_at < ?')
            .get(now);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const expiringSoonResult = this.db
            .prepare('SELECT COUNT(*) as count FROM credentials WHERE expires_at IS NOT NULL AND expires_at >= ? AND expires_at < ?')
            .get(now, now + sevenDays);
        return {
            total,
            byService,
            expired: expiredResult.count,
            expiringSoon: expiringSoonResult.count,
        };
    }
    async export() {
        if (!this.storage) {
            await this.initialize();
        }
        const metadataList = await this.list();
        const credentials = [];
        for (const meta of metadataList) {
            const credential = await this.get(meta.service, meta.account);
            if (credential) {
                credentials.push(credential);
            }
        }
        return credentials;
    }
    async import(credentials) {
        let imported = 0;
        let skipped = 0;
        let errors = 0;
        for (const cred of credentials) {
            try {
                const existing = await this.get(cred.service, cred.account);
                if (existing) {
                    logger.warn(`Skipping existing credential: ${cred.service}/${cred.account}`);
                    skipped++;
                    continue;
                }
                await this.add({
                    service: cred.service,
                    account: cred.account,
                    value: cred.value,
                    expiresAt: cred.metadata?.expiresAt,
                    notes: cred.metadata?.notes,
                    tags: cred.metadata?.tags,
                });
                imported++;
            }
            catch (error) {
                logger.error(`Failed to import credential: ${cred.service}/${cred.account}`, { error });
                errors++;
            }
        }
        logger.info(`Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
        return { imported, skipped, errors };
    }
    registerCleanup() {
        const cleanup = () => {
            for (const instance of CredentialVault.instances) {
                try {
                    instance.close();
                }
                catch (err) {
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
            if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
                process.exit(1);
            }
        });
    }
    close() {
        try {
            this.auditLogger.log(AuditEventType.VAULT_CLOSED, {
                success: true,
            });
            this.rateLimiter.stopCleanup();
            this.auditLogger.stopCleanup();
            this.rotationPolicy.stopCleanup();
            if (this.db && this.ownsDb) {
                this.db.close();
            }
            CredentialVault.instances.delete(this);
        }
        catch (error) {
            logger.warn('Database close warning', { error });
        }
    }
    getRateLimitStatus(service, account) {
        return this.rateLimiter.getStatus(service, account);
    }
    unlockAccount(service, account) {
        this.rateLimiter.unlockAccount(service, account);
        this.auditLogger.log(AuditEventType.ADMIN_UNLOCK_ACCOUNT, {
            service,
            account,
            success: true,
            details: 'Account manually unlocked by admin',
        });
    }
    getLockedAccounts() {
        return this.rateLimiter.getLockedAccounts();
    }
    getRateLimitStats() {
        return this.rateLimiter.getStats();
    }
    getAuditLogs(filter) {
        return this.auditLogger.getLogs(filter);
    }
    getAuditStats(filter) {
        return this.auditLogger.getStats(filter);
    }
    exportAuditLogs(filter) {
        return this.auditLogger.exportLogs(filter);
    }
    setAuditRetention(days) {
        this.auditLogger.setRetentionDays(days);
    }
    getAuditRetention() {
        return this.auditLogger.getRetentionDays();
    }
    createRotationPolicy(config) {
        return this.rotationPolicy.createPolicy(config);
    }
    getRotationPolicy(id) {
        return this.rotationPolicy.getPolicy(id);
    }
    getRotationPolicyByName(name) {
        return this.rotationPolicy.getPolicyByName(name);
    }
    listRotationPolicies() {
        return this.rotationPolicy.listPolicies();
    }
    updateRotationPolicy(id, updates) {
        this.rotationPolicy.updatePolicy(id, updates);
    }
    deleteRotationPolicy(id) {
        this.rotationPolicy.deletePolicy(id);
    }
    assignRotationPolicy(service, account, policyId) {
        this.rotationPolicy.assignPolicy(service, account, policyId);
    }
    checkRotationStatus(service, account) {
        return this.rotationPolicy.checkRotationStatus(service, account);
    }
    markCredentialAsRotated(service, account) {
        this.rotationPolicy.markAsRotated(service, account);
        this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
            service,
            account,
            success: true,
            details: 'Credential marked as rotated',
        });
    }
    listCredentialsNeedingRotation() {
        return this.rotationPolicy.listCredentialsNeedingRotation();
    }
    getRotationStats() {
        return this.rotationPolicy.getRotationStats();
    }
    setIdentity(identity) {
        this.accessControl.setIdentity(identity);
    }
    getIdentity() {
        return this.accessControl.getIdentity();
    }
    createRole(config) {
        return this.accessControl.createRole(config);
    }
    getRole(name) {
        return this.accessControl.getRole(name);
    }
    listRoles() {
        return this.accessControl.listRoles();
    }
    deleteRole(name) {
        this.accessControl.deleteRole(name);
    }
    assignRole(identity, roleName, options) {
        this.accessControl.assignRole(identity, roleName, options);
    }
    revokeRole(identity, roleName) {
        this.accessControl.revokeRole(identity, roleName);
    }
    getRoles(identity) {
        return this.accessControl.getRoles(identity);
    }
    grantPermissions(entry) {
        this.accessControl.grantPermissions(entry);
    }
    revokePermissions(identity, service, account) {
        this.accessControl.revokePermissions(identity, service, account);
    }
    checkPermission(permission, service, account, identity) {
        return this.accessControl.checkPermission(permission, service, account, identity);
    }
    listAccessEntries(identity) {
        return this.accessControl.listAccessEntries(identity);
    }
    isAdmin(identity) {
        return this.accessControl.isAdmin(identity);
    }
}
//# sourceMappingURL=CredentialVault.js.map