import { CredentialVault } from './CredentialVault.js';
import { MultiTenantManager, TenantStatus } from './MultiTenantManager.js';
import { AuditEventType } from './AuditLogger.js';
import { logger } from '../utils/logger.js';
import { MULTI_TENANT } from './constants.js';
export class TenantAwareCredentialVault {
    vault;
    tenantManager;
    auditLogger;
    db;
    tenantValidationCache = new Map();
    VALIDATION_CACHE_TTL = MULTI_TENANT.VALIDATION_CACHE_TTL_MS;
    constructor(db, storage, auditLogger) {
        this.db = db;
        this.vault = CredentialVault.createWithDI(db, storage, auditLogger);
        this.tenantManager = new MultiTenantManager(db, auditLogger);
        this.auditLogger = auditLogger;
        logger.info('Tenant-aware credential vault initialized with dependency injection');
    }
    getTenantManager() {
        return this.tenantManager;
    }
    getVault() {
        return this.vault;
    }
    async set(context, credential) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        const quotaCheck = this.tenantManager.checkQuota(context.tenantId, 'credential', 1);
        if (!quotaCheck.allowed) {
            logger.warn('Credential creation blocked by quota', {
                tenantId: context.tenantId,
                reason: quotaCheck.reason,
            });
            return {
                success: false,
                quotaExceeded: true,
                error: quotaCheck.reason,
            };
        }
        try {
            const credentialInput = {
                service: credential.service,
                account: credential.account,
                value: credential.value,
                expiresAt: credential.metadata?.expiresAt,
                notes: credential.metadata?.notes,
                tags: credential.metadata?.tags,
            };
            await this.vault.add(credentialInput);
            this.tenantManager.recordApiCall(context.tenantId);
            this.auditLogger.log(AuditEventType.CREDENTIAL_CREATED, {
                service: credential.service,
                account: credential.account,
                success: true,
                details: JSON.stringify({
                    tenantId: context.tenantId,
                    identity: `${context.identity.type}:${context.identity.id}`,
                }),
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to store credential', {
                tenantId: context.tenantId,
                service: credential.service,
                account: credential.account,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async get(context, service, account) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        try {
            const tenantedId = this.getTenantedId(context.tenantId, service, account);
            const credential = await this.vault.get(service, account);
            if (credential && credential.id !== tenantedId) {
                logger.warn('Attempted to access credential from different tenant', {
                    tenantId: context.tenantId,
                    credentialId: credential.id,
                });
                return {
                    success: false,
                    error: 'Access denied: credential not found',
                };
            }
            this.tenantManager.recordApiCall(context.tenantId);
            this.auditLogger.log(AuditEventType.CREDENTIAL_ACCESSED, {
                service,
                account,
                success: true,
                details: JSON.stringify({
                    tenantId: context.tenantId,
                    identity: `${context.identity.type}:${context.identity.id}`,
                }),
            });
            return {
                success: true,
                data: credential,
            };
        }
        catch (error) {
            logger.error('Failed to get credential', {
                tenantId: context.tenantId,
                service,
                account,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async delete(context, service, account) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        try {
            const tenantedId = this.getTenantedId(context.tenantId, service, account);
            const credential = await this.vault.get(service, account);
            if (credential && credential.id !== tenantedId) {
                logger.warn('Attempted to delete credential from different tenant', {
                    tenantId: context.tenantId,
                    credentialId: credential.id,
                });
                return {
                    success: false,
                    error: 'Access denied: credential not found',
                };
            }
            await this.vault.delete(service, account);
            this.tenantManager.recordApiCall(context.tenantId);
            this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
                service,
                account,
                success: true,
                details: JSON.stringify({
                    tenantId: context.tenantId,
                    identity: `${context.identity.type}:${context.identity.id}`,
                }),
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to delete credential', {
                tenantId: context.tenantId,
                service,
                account,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async list(context, query) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        try {
            const allCredentials = await this.vault.list(query);
            const tenantPrefix = `${context.tenantId}:`;
            const tenantCredentials = allCredentials.filter((cred) => cred.id.startsWith(tenantPrefix));
            this.tenantManager.recordApiCall(context.tenantId);
            return {
                success: true,
                data: tenantCredentials,
            };
        }
        catch (error) {
            logger.error('Failed to list credentials', {
                tenantId: context.tenantId,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async update(context, service, account, updates) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        try {
            const tenantedId = this.getTenantedId(context.tenantId, service, account);
            const credential = await this.vault.get(service, account);
            if (!credential || credential.id !== tenantedId) {
                logger.warn('Attempted to update credential from different tenant', {
                    tenantId: context.tenantId,
                    service,
                    account,
                });
                return {
                    success: false,
                    error: 'Access denied: credential not found',
                };
            }
            await this.vault.update(service, account, updates);
            this.tenantManager.recordApiCall(context.tenantId);
            this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
                service,
                account,
                success: true,
                details: JSON.stringify({
                    tenantId: context.tenantId,
                    identity: `${context.identity.type}:${context.identity.id}`,
                    fields: Object.keys(updates),
                }),
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to update credential', {
                tenantId: context.tenantId,
                service,
                account,
                error: error.message,
            });
            return {
                success: false,
                error: error.message,
            };
        }
    }
    getUsageStats(context) {
        const validationResult = this.validateTenant(context);
        if (!validationResult.success) {
            return validationResult;
        }
        try {
            const stats = this.tenantManager.getUsageStats(context.tenantId);
            const quota = this.tenantManager.getQuota(context.tenantId);
            return {
                success: true,
                data: {
                    usage: stats,
                    quota,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    validateTenant(context) {
        if (!context.isCrossTenant) {
            const cached = this.tenantValidationCache.get(context.tenantId);
            const now = Date.now();
            if (cached && now - cached.timestamp < this.VALIDATION_CACHE_TTL) {
                if (!cached.isValid) {
                    return {
                        success: false,
                        tenantDisabled: true,
                        error: `Tenant is not active`,
                    };
                }
                return { success: true };
            }
        }
        if (!context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.length === 0) {
            return {
                success: false,
                error: `Invalid tenant ID format`,
            };
        }
        const tenant = this.tenantManager.getTenant(context.tenantId);
        if (!tenant) {
            this.tenantValidationCache.set(context.tenantId, {
                isValid: false,
                timestamp: Date.now(),
            });
            return {
                success: false,
                error: `Tenant not found: ${context.tenantId}`,
            };
        }
        const isActive = tenant.status === TenantStatus.ACTIVE;
        if (!isActive && !context.isCrossTenant) {
            this.tenantValidationCache.set(context.tenantId, {
                isValid: false,
                timestamp: Date.now(),
            });
            return {
                success: false,
                tenantDisabled: true,
                error: `Tenant is ${tenant.status}`,
            };
        }
        if (isActive) {
            this.tenantValidationCache.set(context.tenantId, {
                isValid: true,
                timestamp: Date.now(),
            });
        }
        return { success: true };
    }
    getTenantedId(tenantId, service, account) {
        return `${tenantId}:${service}:${account}`;
    }
    parseTenantId(credentialId) {
        const parts = credentialId.split(':');
        return parts.length >= 3 ? parts[0] : null;
    }
    async adminGet(adminIdentity, tenantId, service, account) {
        logger.info('Admin cross-tenant access', {
            admin: `${adminIdentity.type}:${adminIdentity.id}`,
            tenantId,
            service,
            account,
        });
        const tenantedId = this.getTenantedId(tenantId, service, account);
        const credential = await this.vault.get(service, account);
        if (credential && credential.id === tenantedId) {
            return credential;
        }
        return null;
    }
    async adminListTenantCredentials(adminIdentity, tenantId) {
        logger.info('Admin listing tenant credentials', {
            admin: `${adminIdentity.type}:${adminIdentity.id}`,
            tenantId,
        });
        const allCredentials = await this.vault.list();
        const tenantPrefix = `${tenantId}:`;
        return allCredentials.filter((cred) => cred.id.startsWith(tenantPrefix));
    }
    async adminDeleteTenantCredentials(adminIdentity, tenantId) {
        logger.info('Admin deleting all tenant credentials', {
            admin: `${adminIdentity.type}:${adminIdentity.id}`,
            tenantId,
        });
        const credentials = await this.adminListTenantCredentials(adminIdentity, tenantId);
        let deletedCount = 0;
        for (const cred of credentials) {
            try {
                const [, service, account] = cred.id.split(':');
                await this.vault.delete(service, account);
                deletedCount++;
            }
            catch (error) {
                logger.error('Failed to delete credential', {
                    credentialId: cred.id,
                    error: error.message,
                });
            }
        }
        this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
            service: 'admin',
            account: tenantId,
            success: true,
            details: JSON.stringify({
                action: 'delete_all_tenant_credentials',
                tenantId,
                deletedCount,
                admin: `${adminIdentity.type}:${adminIdentity.id}`,
            }),
        });
        return deletedCount;
    }
    close() {
        this.vault.close();
    }
}
//# sourceMappingURL=TenantAwareCredentialVault.js.map