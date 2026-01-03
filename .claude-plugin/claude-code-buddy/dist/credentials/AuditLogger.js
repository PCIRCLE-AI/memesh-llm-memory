import { logger } from '../utils/logger.js';
export var AuditEventType;
(function (AuditEventType) {
    AuditEventType["CREDENTIAL_ADDED"] = "credential_added";
    AuditEventType["CREDENTIAL_CREATED"] = "credential_created";
    AuditEventType["CREDENTIAL_RETRIEVED"] = "credential_retrieved";
    AuditEventType["CREDENTIAL_ACCESSED"] = "credential_accessed";
    AuditEventType["CREDENTIAL_UPDATED"] = "credential_updated";
    AuditEventType["CREDENTIAL_DELETED"] = "credential_deleted";
    AuditEventType["ACCESS_GRANTED"] = "access_granted";
    AuditEventType["ACCESS_REVOKED"] = "access_revoked";
    AuditEventType["RATE_LIMIT_HIT"] = "rate_limit_hit";
    AuditEventType["RATE_LIMIT_LOCKED"] = "rate_limit_locked";
    AuditEventType["RATE_LIMIT_UNLOCKED"] = "rate_limit_unlocked";
    AuditEventType["ACCESS_DENIED_NOT_FOUND"] = "access_denied_not_found";
    AuditEventType["ACCESS_DENIED_RATE_LIMITED"] = "access_denied_rate_limited";
    AuditEventType["ACCESS_DENIED_VALIDATION"] = "access_denied_validation";
    AuditEventType["ADMIN_UNLOCK_ACCOUNT"] = "admin_unlock_account";
    AuditEventType["ADMIN_CLEANUP_EXPIRED"] = "admin_cleanup_expired";
    AuditEventType["VAULT_INITIALIZED"] = "vault_initialized";
    AuditEventType["VAULT_CLOSED"] = "vault_closed";
    AuditEventType["ROTATION_SCHEDULED"] = "rotation_scheduled";
    AuditEventType["ROTATION_COMPLETED"] = "rotation_completed";
    AuditEventType["ROTATION_FAILED"] = "rotation_failed";
})(AuditEventType || (AuditEventType = {}));
export var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "info";
    AuditSeverity["WARNING"] = "warning";
    AuditSeverity["ERROR"] = "error";
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (AuditSeverity = {}));
export class AuditLogger {
    db;
    userId;
    cleanupTimer = null;
    retentionDays;
    constructor(db, options) {
        this.db = db;
        this.userId = options?.userId;
        this.retentionDays = options?.retentionDays || 90;
        this.initializeSchema();
        this.startCleanup();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        service TEXT,
        account TEXT,
        user_id TEXT,
        process_id INTEGER NOT NULL,
        success INTEGER NOT NULL,
        details TEXT,
        ip_address TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_service ON audit_logs(service);
      CREATE INDEX IF NOT EXISTS idx_audit_success ON audit_logs(success);
      CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
    `);
    }
    log(eventType, options = {}) {
        const now = Date.now();
        const severity = options.severity || this.inferSeverity(eventType, options.success ?? true);
        const userId = options.userId || this.userId;
        this.db
            .prepare(`
        INSERT INTO audit_logs (
          timestamp, event_type, severity, service, account, user_id,
          process_id, success, details, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .run(now, eventType, severity, options.service || null, options.account || null, userId || null, process.pid, options.success ?? true ? 1 : 0, options.details || null, options.ipAddress || null);
        logger.info(`Audit: ${eventType}`, {
            severity,
            service: options.service,
            account: options.account,
            success: options.success ?? true,
        });
    }
    inferSeverity(eventType, success) {
        if (eventType === AuditEventType.RATE_LIMIT_LOCKED ||
            (eventType === AuditEventType.ACCESS_DENIED_RATE_LIMITED && !success)) {
            return AuditSeverity.CRITICAL;
        }
        if (eventType === AuditEventType.RATE_LIMIT_HIT ||
            eventType === AuditEventType.ACCESS_DENIED_NOT_FOUND ||
            eventType === AuditEventType.ACCESS_DENIED_VALIDATION) {
            return AuditSeverity.WARNING;
        }
        if (!success) {
            return AuditSeverity.ERROR;
        }
        return AuditSeverity.INFO;
    }
    getLogs(filter = {}) {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];
        if (filter.startDate) {
            query += ' AND timestamp >= ?';
            params.push(filter.startDate.getTime());
        }
        if (filter.endDate) {
            query += ' AND timestamp <= ?';
            params.push(filter.endDate.getTime());
        }
        if (filter.eventTypes && filter.eventTypes.length > 0) {
            query += ` AND event_type IN (${filter.eventTypes.map(() => '?').join(',')})`;
            params.push(...filter.eventTypes);
        }
        if (filter.service) {
            query += ' AND service = ?';
            params.push(filter.service);
        }
        if (filter.account) {
            query += ' AND account = ?';
            params.push(filter.account);
        }
        if (filter.userId) {
            query += ' AND user_id = ?';
            params.push(filter.userId);
        }
        if (filter.success !== undefined) {
            query += ' AND success = ?';
            params.push(filter.success ? 1 : 0);
        }
        if (filter.severity) {
            query += ' AND severity = ?';
            params.push(filter.severity);
        }
        query += ' ORDER BY timestamp DESC';
        if (filter.limit) {
            query += ' LIMIT ?';
            params.push(filter.limit);
        }
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => this.mapRowToEntry(row));
    }
    getStats(filter = {}) {
        const logs = this.getLogs(filter);
        const totalEvents = logs.length;
        const successfulEvents = logs.filter((log) => log.success).length;
        const failedEvents = totalEvents - successfulEvents;
        const eventsByType = {};
        const eventsBySeverity = {};
        for (const log of logs) {
            eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
            eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
        }
        const recentEvents = logs.slice(0, 10);
        return {
            totalEvents,
            successfulEvents,
            failedEvents,
            eventsByType,
            eventsBySeverity,
            recentEvents,
        };
    }
    exportLogs(filter = {}) {
        const logs = this.getLogs(filter);
        return JSON.stringify(logs, null, 2);
    }
    mapRowToEntry(row) {
        return {
            id: row.id,
            timestamp: new Date(row.timestamp),
            eventType: row.event_type,
            severity: row.severity,
            service: row.service || undefined,
            account: row.account || undefined,
            userId: row.user_id || undefined,
            processId: row.process_id,
            success: row.success === 1,
            details: row.details || undefined,
            ipAddress: row.ip_address || undefined,
        };
    }
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 24 * 60 * 60 * 1000);
    }
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    cleanup() {
        const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
        const result = this.db
            .prepare('DELETE FROM audit_logs WHERE timestamp < ?')
            .run(cutoffDate);
        if (result.changes > 0) {
            logger.info(`Audit: Cleaned up ${result.changes} old logs (older than ${this.retentionDays} days)`);
        }
    }
    getRetentionDays() {
        return this.retentionDays;
    }
    setRetentionDays(days) {
        if (days < 1) {
            throw new Error('Retention days must be at least 1');
        }
        this.retentionDays = days;
        logger.info(`Audit: Retention period set to ${days} days`);
    }
}
//# sourceMappingURL=AuditLogger.js.map