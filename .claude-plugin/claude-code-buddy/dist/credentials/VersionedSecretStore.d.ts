import type Database from 'better-sqlite3';
import type { Identity } from './AccessControl.js';
import { AuditLogger } from './AuditLogger.js';
export interface SecretVersion {
    id?: number;
    service: string;
    account: string;
    version: number;
    valueHash: string;
    createdBy: Identity;
    createdAt: Date;
    isActive: boolean;
    changeDescription?: string;
    metadata?: Record<string, any>;
}
export interface VersionDiff {
    service: string;
    account: string;
    fromVersion: number;
    toVersion: number;
    valuesMatch: boolean;
    timeDifference: number;
    changeDescription?: string;
}
export interface VersionStats {
    totalVersions: number;
    totalSecrets: number;
    averageVersionsPerSecret: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
    mostVersionedSecret: {
        service: string;
        account: string;
        versionCount: number;
    } | null;
}
export declare class VersionedSecretStore {
    private db;
    private auditLogger;
    constructor(db: Database.Database, auditLogger: AuditLogger);
    private initializeSchema;
    createVersion(service: string, account: string, value: any, createdBy: Identity, changeDescription?: string, metadata?: Record<string, any>): SecretVersion;
    getActiveVersion(service: string, account: string): SecretVersion | null;
    getVersion(service: string, account: string, version: number): SecretVersion | null;
    getVersionHistory(service: string, account: string): SecretVersion[];
    rollbackToVersion(service: string, account: string, targetVersion: number, rolledBackBy: Identity, reason?: string): SecretVersion;
    compareVersions(service: string, account: string, fromVersion: number, toVersion: number): VersionDiff;
    deleteOldVersions(service: string, account: string, keepVersions?: number): number;
    deleteAllVersions(service: string, account: string): number;
    getVersionCount(service: string, account: string): number;
    getStats(): VersionStats;
    cleanupOldVersions(olderThanDays?: number, keepMinVersions?: number): number;
    private hashValue;
    private rowToVersion;
}
//# sourceMappingURL=VersionedSecretStore.d.ts.map