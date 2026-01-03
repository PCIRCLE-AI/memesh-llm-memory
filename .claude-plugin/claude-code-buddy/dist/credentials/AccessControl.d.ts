import Database from 'better-sqlite3';
export declare enum Permission {
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
    ADMIN = "admin",
    ROTATE = "rotate",
    AUDIT = "audit"
}
export declare enum Role {
    ADMIN = "admin",
    USER = "user",
    READ_ONLY = "read-only",
    AUDITOR = "auditor"
}
export interface RoleConfig {
    id?: number;
    name: string;
    description?: string;
    permissions: Permission[];
    isBuiltIn: boolean;
    createdAt?: Date;
}
export interface Identity {
    id: string;
    type: 'user' | 'process' | 'service';
    metadata?: Record<string, any>;
}
export interface AccessControlEntry {
    id?: number;
    identityId: string;
    identityType: string;
    servicePattern?: string;
    service?: string;
    account?: string;
    permissions: Permission[];
    grantedAt?: Date;
    grantedBy?: string;
    expiresAt?: Date;
}
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    matchedRule?: AccessControlEntry;
    effectivePermissions: Permission[];
}
export declare class AccessControl {
    private db;
    private currentIdentity?;
    private accessControlEnabled;
    constructor(db: Database.Database, identity?: Identity);
    private initializeSchema;
    private initializeBuiltInRoles;
    setIdentity(identity: Identity): void;
    getIdentity(): Identity | undefined;
    private requireAdmin;
    private validateServicePattern;
    private validateIdentity;
    createRole(config: Omit<RoleConfig, 'id' | 'isBuiltIn' | 'createdAt'>): RoleConfig;
    getRole(name: string): RoleConfig | null;
    listRoles(): RoleConfig[];
    deleteRole(name: string): void;
    assignRole(identity: Identity, roleName: string, options?: {
        grantedBy?: string;
        expiresAt?: Date;
    }): void;
    revokeRole(identity: Identity, roleName: string): void;
    getRoles(identity: Identity): RoleConfig[];
    grantPermissions(entry: Omit<AccessControlEntry, 'id' | 'grantedAt'>): void;
    revokePermissions(identity: Identity, service?: string, account?: string): void;
    checkPermission(permission: Permission, service: string, account?: string, identity?: Identity): PermissionCheckResult;
    listAccessEntries(identity: Identity): AccessControlEntry[];
    isAdmin(identity?: Identity): boolean;
}
//# sourceMappingURL=AccessControl.d.ts.map