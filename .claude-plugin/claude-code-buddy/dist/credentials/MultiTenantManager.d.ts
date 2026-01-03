import type Database from 'better-sqlite3';
import { AuditLogger } from './AuditLogger.js';
import type { Identity } from './AccessControl.js';
export declare enum TenantStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended",
    DISABLED = "disabled",
    PENDING = "pending"
}
export declare enum TenantTier {
    FREE = "free",
    BASIC = "basic",
    PROFESSIONAL = "professional",
    ENTERPRISE = "enterprise"
}
export interface Tenant {
    id: string;
    name: string;
    tier: TenantTier;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
    settings?: TenantSettings;
    metadata?: Record<string, any>;
}
export interface TenantSettings {
    maxCredentials?: number;
    maxUsers?: number;
    retentionDays?: number;
    encryptionEnabled?: boolean;
    auditEnabled?: boolean;
    sharingEnabled?: boolean;
    autoRotationEnabled?: boolean;
    rotationPolicies?: Record<string, any>;
    ipWhitelist?: string[];
    allowedBackends?: string[];
}
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
export interface TenantUsageStats {
    tenantId: string;
    credentialCount: number;
    userCount: number;
    storageBytes: number;
    apiCallsToday: number;
    apiCallsThisMonth: number;
    lastActivityAt: Date | null;
    topServices: Array<{
        service: string;
        count: number;
    }>;
}
export declare class MultiTenantManager {
    private db;
    private auditLogger;
    constructor(db: Database.Database, auditLogger: AuditLogger);
    private initializeSchema;
    createTenant(id: string, name: string, tier: TenantTier, createdBy: Identity, settings?: TenantSettings, metadata?: Record<string, any>): Tenant;
    getTenant(tenantId: string): Tenant | null;
    updateTenant(tenantId: string, updates: {
        name?: string;
        tier?: TenantTier;
        status?: TenantStatus;
        settings?: TenantSettings;
        metadata?: Record<string, any>;
    }, updatedBy: Identity): Tenant;
    deleteTenant(tenantId: string, deletedBy: Identity): void;
    listTenants(filters?: {
        status?: TenantStatus;
        tier?: TenantTier;
        limit?: number;
        offset?: number;
    }): Tenant[];
    addUserToTenant(tenantId: string, userId: string, role: string, addedBy: Identity, metadata?: Record<string, any>): void;
    removeUserFromTenant(tenantId: string, userId: string, removedBy: Identity): void;
    getTenantUsers(tenantId: string): Array<{
        userId: string;
        role: string;
        addedAt: Date;
        metadata?: Record<string, any>;
    }>;
    getQuota(tenantId: string): TenantQuota;
    updateQuotas(tenantId: string, quotas: {
        maxCredentials?: number;
        maxUsers?: number;
        maxStorageBytes?: number;
        maxApiCallsPerHour?: number;
    }): void;
    checkQuota(tenantId: string, operation: 'credential' | 'user' | 'storage' | 'api_call', amount?: number): {
        allowed: boolean;
        reason?: string;
    };
    recordApiCall(tenantId: string): void;
    getUsageStats(tenantId: string): TenantUsageStats;
    private getDefaultQuotas;
    private getCurrentUsage;
    private getToday;
    private rowToTenant;
}
//# sourceMappingURL=MultiTenantManager.d.ts.map