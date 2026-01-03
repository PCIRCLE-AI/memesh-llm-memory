import Database from 'better-sqlite3';
import { RotationPolicy } from './RotationPolicy.js';
import { AuditLogger } from './AuditLogger.js';
export declare enum ExpirationWarningLevel {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
export interface ExpirationStatus {
    service: string;
    account: string;
    isExpired: boolean;
    daysUntilExpiration: number;
    warningLevel: ExpirationWarningLevel | null;
    expiresAt?: Date;
    createdAt: Date;
    lastRotated?: Date;
    policyMaxAge?: number;
}
export interface ExpirationWarning {
    id?: number;
    service: string;
    account: string;
    warningLevel: ExpirationWarningLevel;
    daysUntilExpiration: number;
    expiresAt: Date;
    notified: boolean;
    notifiedAt?: Date;
    acknowledgedAt?: Date;
    createdAt: Date;
}
export interface ExpirationStats {
    totalCredentials: number;
    expiredCredentials: number;
    expiringCritical: number;
    expiringHigh: number;
    expiringMedium: number;
    expiringLow: number;
    expiringInfo: number;
    healthyCredentials: number;
    averageDaysUntilExpiration: number;
    oldestCredential?: {
        service: string;
        account: string;
        daysUntilExpiration: number;
    };
}
export declare class ExpirationMonitor {
    private db;
    private rotationPolicy;
    private auditLogger;
    private monitorTimer;
    private isMonitoring;
    constructor(db: Database.Database, rotationPolicy: RotationPolicy, auditLogger: AuditLogger);
    private initializeSchema;
    getExpirationStatus(service: string, account: string): ExpirationStatus;
    private calculateExpirationDate;
    private calculateWarningLevel;
    scanForExpirations(): ExpirationWarning[];
    private mapWarningLevelToSeverity;
    private createOrUpdateWarning;
    getActiveWarnings(level?: ExpirationWarningLevel): ExpirationWarning[];
    getUnnotifiedWarnings(level?: ExpirationWarningLevel): ExpirationWarning[];
    markAsNotified(warningId: number): void;
    acknowledgeWarning(warningId: number): void;
    getStats(): ExpirationStats;
    startMonitoring(intervalMinutes?: number): void;
    stopMonitoring(): void;
    isMonitoringActive(): boolean;
    cleanupOldWarnings(olderThanDays?: number): number;
    private mapRowToWarning;
}
//# sourceMappingURL=ExpirationMonitor.d.ts.map