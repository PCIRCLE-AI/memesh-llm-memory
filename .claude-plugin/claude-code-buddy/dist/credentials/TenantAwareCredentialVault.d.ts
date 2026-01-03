import type Database from 'better-sqlite3';
import { CredentialVault } from './CredentialVault.js';
import { MultiTenantManager } from './MultiTenantManager.js';
import { AuditLogger } from './AuditLogger.js';
import type { Credential, CredentialQuery, SecureStorage } from './types.js';
import type { Identity } from './AccessControl.js';
export interface TenantContext {
    tenantId: string;
    identity: Identity;
    isCrossTenant?: boolean;
}
export interface TenantOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    quotaExceeded?: boolean;
    tenantDisabled?: boolean;
}
export declare class TenantAwareCredentialVault {
    private vault;
    private tenantManager;
    private auditLogger;
    private db;
    private tenantValidationCache;
    private readonly VALIDATION_CACHE_TTL;
    constructor(db: Database.Database, storage: SecureStorage, auditLogger: AuditLogger);
    getTenantManager(): MultiTenantManager;
    getVault(): CredentialVault;
    set(context: TenantContext, credential: Omit<Credential, 'id'>): Promise<TenantOperationResult<void>>;
    get(context: TenantContext, service: string, account: string): Promise<TenantOperationResult<Credential | null>>;
    delete(context: TenantContext, service: string, account: string): Promise<TenantOperationResult<void>>;
    list(context: TenantContext, query?: CredentialQuery): Promise<TenantOperationResult<Omit<Credential, 'value'>[]>>;
    update(context: TenantContext, service: string, account: string, updates: {
        value?: any;
        metadata?: Record<string, any>;
    }): Promise<TenantOperationResult<void>>;
    getUsageStats(context: TenantContext): TenantOperationResult<any>;
    private validateTenant;
    private getTenantedId;
    private parseTenantId;
    adminGet(adminIdentity: Identity, tenantId: string, service: string, account: string): Promise<Credential | null>;
    adminListTenantCredentials(adminIdentity: Identity, tenantId: string): Promise<Omit<Credential, 'value'>[]>;
    adminDeleteTenantCredentials(adminIdentity: Identity, tenantId: string): Promise<number>;
    close(): void;
}
//# sourceMappingURL=TenantAwareCredentialVault.d.ts.map