import Database from 'better-sqlite3';
import { SecureStorage, Credential, CredentialInput, CredentialQuery } from './types.js';
import { AuditLogger } from './AuditLogger.js';
import { Permission, type Identity } from './AccessControl.js';
export declare class CredentialVault {
    private db;
    private storage;
    private rateLimiter;
    private rotationPolicy;
    private auditLogger;
    private accessControl;
    private static cleanupRegistered;
    private static instances;
    private ownsDb;
    static create(dbPath?: string, identity?: Identity): CredentialVault;
    static createWithDI(db: Database.Database, storage: SecureStorage, auditLogger: AuditLogger, identity?: Identity): CredentialVault;
    private constructor();
    private registerInstance;
    private initializeSchema;
    initialize(): Promise<void>;
    private mapTimestampsToMetadata;
    add(input: CredentialInput): Promise<Credential>;
    get(service: string, account: string): Promise<Credential | null>;
    update(service: string, account: string, updates: Partial<CredentialInput>): Promise<Credential>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    findByTag(tag: string): Promise<Omit<Credential, 'value'>[]>;
    findExpired(): Promise<Omit<Credential, 'value'>[]>;
    deleteExpired(): Promise<number>;
    count(): number;
    getStats(): {
        total: number;
        byService: Record<string, number>;
        expired: number;
        expiringSoon: number;
    };
    export(): Promise<Credential[]>;
    import(credentials: Credential[]): Promise<{
        imported: number;
        skipped: number;
        errors: number;
    }>;
    private registerCleanup;
    close(): void;
    getRateLimitStatus(service: string, account: string): {
        isLocked: boolean;
        attempts: number;
        lockedUntil?: Date;
        remainingAttempts: number;
    };
    unlockAccount(service: string, account: string): void;
    getLockedAccounts(): {
        service: string;
        account: string;
        lockedUntil: Date;
        attempts: number;
    }[];
    getRateLimitStats(): {
        totalEntries: number;
        lockedAccounts: number;
        totalAttempts: number;
    };
    getAuditLogs(filter?: import('./AuditLogger.js').AuditLogFilter): import("./AuditLogger.js").AuditLogEntry[];
    getAuditStats(filter?: import('./AuditLogger.js').AuditLogFilter): import("./AuditLogger.js").AuditStats;
    exportAuditLogs(filter?: import('./AuditLogger.js').AuditLogFilter): string;
    setAuditRetention(days: number): void;
    getAuditRetention(): number;
    createRotationPolicy(config: Omit<import('./RotationPolicy.js').RotationPolicyConfig, 'id'>): import('./RotationPolicy.js').RotationPolicyConfig;
    getRotationPolicy(id: number): import('./RotationPolicy.js').RotationPolicyConfig | null;
    getRotationPolicyByName(name: string): import('./RotationPolicy.js').RotationPolicyConfig | null;
    listRotationPolicies(): import('./RotationPolicy.js').RotationPolicyConfig[];
    updateRotationPolicy(id: number, updates: Partial<Omit<import('./RotationPolicy.js').RotationPolicyConfig, 'id'>>): void;
    deleteRotationPolicy(id: number): void;
    assignRotationPolicy(service: string, account: string, policyId: number): void;
    checkRotationStatus(service: string, account: string): import('./RotationPolicy.js').RotationStatus;
    markCredentialAsRotated(service: string, account: string): void;
    listCredentialsNeedingRotation(): Array<{
        service: string;
        account: string;
        status: import('./RotationPolicy.js').RotationStatus;
    }>;
    getRotationStats(): import('./RotationPolicy.js').RotationStats;
    setIdentity(identity: Identity): void;
    getIdentity(): Identity | undefined;
    createRole(config: Omit<import('./AccessControl.js').RoleConfig, 'id' | 'isBuiltIn' | 'createdAt'>): import('./AccessControl.js').RoleConfig;
    getRole(name: string): import('./AccessControl.js').RoleConfig | null;
    listRoles(): import('./AccessControl.js').RoleConfig[];
    deleteRole(name: string): void;
    assignRole(identity: Identity, roleName: string, options?: {
        grantedBy?: string;
        expiresAt?: Date;
    }): void;
    revokeRole(identity: Identity, roleName: string): void;
    getRoles(identity: Identity): import('./AccessControl.js').RoleConfig[];
    grantPermissions(entry: Omit<import('./AccessControl.js').AccessControlEntry, 'id' | 'grantedAt'>): void;
    revokePermissions(identity: Identity, service?: string, account?: string): void;
    checkPermission(permission: Permission, service: string, account?: string, identity?: Identity): import('./AccessControl.js').PermissionCheckResult;
    listAccessEntries(identity: Identity): import('./AccessControl.js').AccessControlEntry[];
    isAdmin(identity?: Identity): boolean;
}
//# sourceMappingURL=CredentialVault.d.ts.map