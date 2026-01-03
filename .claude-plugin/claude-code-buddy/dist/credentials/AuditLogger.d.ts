import Database from 'better-sqlite3';
export declare enum AuditEventType {
    CREDENTIAL_ADDED = "credential_added",
    CREDENTIAL_CREATED = "credential_created",
    CREDENTIAL_RETRIEVED = "credential_retrieved",
    CREDENTIAL_ACCESSED = "credential_accessed",
    CREDENTIAL_UPDATED = "credential_updated",
    CREDENTIAL_DELETED = "credential_deleted",
    ACCESS_GRANTED = "access_granted",
    ACCESS_REVOKED = "access_revoked",
    RATE_LIMIT_HIT = "rate_limit_hit",
    RATE_LIMIT_LOCKED = "rate_limit_locked",
    RATE_LIMIT_UNLOCKED = "rate_limit_unlocked",
    ACCESS_DENIED_NOT_FOUND = "access_denied_not_found",
    ACCESS_DENIED_RATE_LIMITED = "access_denied_rate_limited",
    ACCESS_DENIED_VALIDATION = "access_denied_validation",
    ADMIN_UNLOCK_ACCOUNT = "admin_unlock_account",
    ADMIN_CLEANUP_EXPIRED = "admin_cleanup_expired",
    VAULT_INITIALIZED = "vault_initialized",
    VAULT_CLOSED = "vault_closed",
    ROTATION_SCHEDULED = "rotation_scheduled",
    ROTATION_COMPLETED = "rotation_completed",
    ROTATION_FAILED = "rotation_failed"
}
export declare enum AuditSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
export interface AuditLogEntry {
    id: number;
    timestamp: Date;
    eventType: AuditEventType;
    severity: AuditSeverity;
    service?: string;
    account?: string;
    userId?: string;
    processId: number;
    success: boolean;
    details?: string;
    ipAddress?: string;
}
export interface AuditLogFilter {
    startDate?: Date;
    endDate?: Date;
    eventTypes?: AuditEventType[];
    service?: string;
    account?: string;
    userId?: string;
    success?: boolean;
    severity?: AuditSeverity;
    limit?: number;
}
export interface AuditStats {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: AuditLogEntry[];
}
export declare class AuditLogger {
    private db;
    private userId?;
    private cleanupTimer;
    private retentionDays;
    constructor(db: Database.Database, options?: {
        userId?: string;
        retentionDays?: number;
    });
    private initializeSchema;
    log(eventType: AuditEventType, options?: {
        severity?: AuditSeverity;
        service?: string;
        account?: string;
        userId?: string;
        success?: boolean;
        details?: string;
        ipAddress?: string;
    }): void;
    private inferSeverity;
    getLogs(filter?: AuditLogFilter): AuditLogEntry[];
    getStats(filter?: AuditLogFilter): AuditStats;
    exportLogs(filter?: AuditLogFilter): string;
    private mapRowToEntry;
    private startCleanup;
    stopCleanup(): void;
    cleanup(): void;
    getRetentionDays(): number;
    setRetentionDays(days: number): void;
}
//# sourceMappingURL=AuditLogger.d.ts.map