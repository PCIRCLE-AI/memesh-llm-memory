import { logger } from '../utils/logger.js';
import { AuditEventType, AuditSeverity } from './AuditLogger.js';
export var ExpirationWarningLevel;
(function (ExpirationWarningLevel) {
    ExpirationWarningLevel["CRITICAL"] = "critical";
    ExpirationWarningLevel["HIGH"] = "high";
    ExpirationWarningLevel["MEDIUM"] = "medium";
    ExpirationWarningLevel["LOW"] = "low";
    ExpirationWarningLevel["INFO"] = "info";
})(ExpirationWarningLevel || (ExpirationWarningLevel = {}));
export class ExpirationMonitor {
    db;
    rotationPolicy;
    auditLogger;
    monitorTimer = null;
    isMonitoring = false;
    constructor(db, rotationPolicy, auditLogger) {
        this.db = db;
        this.rotationPolicy = rotationPolicy;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS expiration_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        warning_level TEXT NOT NULL,
        days_until_expiration INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        notified INTEGER NOT NULL DEFAULT 0,
        notified_at INTEGER,
        acknowledged_at INTEGER,
        created_at INTEGER NOT NULL,
        UNIQUE(service, account, warning_level)
      );

      CREATE INDEX IF NOT EXISTS idx_expiration_warnings_expires_at
        ON expiration_warnings(expires_at);
      CREATE INDEX IF NOT EXISTS idx_expiration_warnings_notified
        ON expiration_warnings(notified);
      CREATE INDEX IF NOT EXISTS idx_expiration_warnings_level
        ON expiration_warnings(warning_level);
    `);
        logger.info('Expiration monitor schema initialized');
    }
    getExpirationStatus(service, account) {
        const rotationStatus = this.rotationPolicy.checkRotationStatus(service, account);
        const warningLevel = this.calculateWarningLevel(rotationStatus.daysUntilExpiration);
        return {
            service,
            account,
            isExpired: rotationStatus.isExpired,
            daysUntilExpiration: rotationStatus.daysUntilExpiration,
            warningLevel,
            expiresAt: this.calculateExpirationDate(rotationStatus),
            createdAt: new Date(),
            lastRotated: rotationStatus.lastRotated,
            policyMaxAge: rotationStatus.policy?.maxAgeDays,
        };
    }
    calculateExpirationDate(rotationStatus) {
        if (!rotationStatus.policy) {
            return undefined;
        }
        const baseDate = rotationStatus.lastRotated || new Date();
        const expirationMs = baseDate.getTime() + rotationStatus.policy.maxAgeDays * 24 * 60 * 60 * 1000;
        return new Date(expirationMs);
    }
    calculateWarningLevel(daysUntilExpiration) {
        if (daysUntilExpiration < 0) {
            return null;
        }
        if (daysUntilExpiration < 1) {
            return ExpirationWarningLevel.CRITICAL;
        }
        else if (daysUntilExpiration < 3) {
            return ExpirationWarningLevel.HIGH;
        }
        else if (daysUntilExpiration < 7) {
            return ExpirationWarningLevel.MEDIUM;
        }
        else if (daysUntilExpiration < 14) {
            return ExpirationWarningLevel.LOW;
        }
        else if (daysUntilExpiration < 30) {
            return ExpirationWarningLevel.INFO;
        }
        return null;
    }
    scanForExpirations() {
        const credentialsNeedingRotation = this.rotationPolicy.listCredentialsNeedingRotation();
        const warnings = [];
        for (const cred of credentialsNeedingRotation) {
            const status = this.getExpirationStatus(cred.service, cred.account);
            if (status.warningLevel && status.expiresAt) {
                const warning = this.createOrUpdateWarning({
                    service: cred.service,
                    account: cred.account,
                    warningLevel: status.warningLevel,
                    daysUntilExpiration: status.daysUntilExpiration,
                    expiresAt: status.expiresAt,
                    notified: false,
                    createdAt: new Date(),
                });
                warnings.push(warning);
                this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
                    service: cred.service,
                    account: cred.account,
                    success: false,
                    severity: this.mapWarningLevelToSeverity(status.warningLevel),
                    details: `Credential expiring in ${status.daysUntilExpiration} days`,
                });
            }
        }
        logger.info('Expiration scan completed', {
            credentialsScanned: credentialsNeedingRotation.length,
            warningsCreated: warnings.length,
        });
        return warnings;
    }
    mapWarningLevelToSeverity(level) {
        switch (level) {
            case ExpirationWarningLevel.CRITICAL:
            case ExpirationWarningLevel.HIGH:
                return AuditSeverity.ERROR;
            case ExpirationWarningLevel.MEDIUM:
                return AuditSeverity.WARNING;
            default:
                return AuditSeverity.INFO;
        }
    }
    createOrUpdateWarning(warning) {
        const now = Date.now();
        const existing = this.db
            .prepare(`SELECT * FROM expiration_warnings
         WHERE service = ? AND account = ? AND warning_level = ?`)
            .get(warning.service, warning.account, warning.warningLevel);
        if (existing) {
            this.db
                .prepare(`UPDATE expiration_warnings
           SET days_until_expiration = ?, expires_at = ?
           WHERE id = ?`)
                .run(warning.daysUntilExpiration, warning.expiresAt.getTime(), existing.id);
            return {
                ...warning,
                id: existing.id,
                notified: existing.notified === 1,
                notifiedAt: existing.notified_at ? new Date(existing.notified_at) : undefined,
                acknowledgedAt: existing.acknowledged_at ? new Date(existing.acknowledged_at) : undefined,
                createdAt: new Date(existing.created_at),
            };
        }
        else {
            const result = this.db
                .prepare(`INSERT INTO expiration_warnings (
            service, account, warning_level, days_until_expiration,
            expires_at, notified, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(warning.service, warning.account, warning.warningLevel, warning.daysUntilExpiration, warning.expiresAt.getTime(), 0, now);
            return {
                ...warning,
                id: result.lastInsertRowid,
                notified: false,
                createdAt: new Date(now),
            };
        }
    }
    getActiveWarnings(level) {
        let query = `
      SELECT * FROM expiration_warnings
      WHERE expires_at >= ?
      ORDER BY expires_at ASC
    `;
        const params = [Date.now()];
        if (level) {
            query = `
        SELECT * FROM expiration_warnings
        WHERE expires_at >= ? AND warning_level = ?
        ORDER BY expires_at ASC
      `;
            params.push(level);
        }
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => this.mapRowToWarning(row));
    }
    getUnnotifiedWarnings(level) {
        let query = `
      SELECT * FROM expiration_warnings
      WHERE notified = 0 AND expires_at >= ?
      ORDER BY expires_at ASC
    `;
        const params = [Date.now()];
        if (level) {
            query = `
        SELECT * FROM expiration_warnings
        WHERE notified = 0 AND expires_at >= ? AND warning_level = ?
        ORDER BY expires_at ASC
      `;
            params.push(level);
        }
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => this.mapRowToWarning(row));
    }
    markAsNotified(warningId) {
        const now = Date.now();
        const result = this.db
            .prepare(`UPDATE expiration_warnings
         SET notified = 1, notified_at = ?
         WHERE id = ?`)
            .run(now, warningId);
        if (result.changes === 0) {
            throw new Error(`Warning not found: ${warningId}`);
        }
        logger.info('Warning marked as notified', { warningId });
    }
    acknowledgeWarning(warningId) {
        const now = Date.now();
        const result = this.db
            .prepare(`UPDATE expiration_warnings
         SET acknowledged_at = ?
         WHERE id = ?`)
            .run(now, warningId);
        if (result.changes === 0) {
            throw new Error(`Warning not found: ${warningId}`);
        }
        logger.info('Warning acknowledged', { warningId });
    }
    getStats() {
        const credentialsNeedingRotation = this.rotationPolicy.listCredentialsNeedingRotation();
        const rotationStats = this.rotationPolicy.getRotationStats();
        const stats = {
            totalCredentials: rotationStats.totalCredentials,
            expiredCredentials: 0,
            expiringCritical: 0,
            expiringHigh: 0,
            expiringMedium: 0,
            expiringLow: 0,
            expiringInfo: 0,
            healthyCredentials: 0,
            averageDaysUntilExpiration: 0,
        };
        let totalDays = 0;
        let minDays = Infinity;
        let minCredential;
        for (const cred of credentialsNeedingRotation) {
            const status = this.getExpirationStatus(cred.service, cred.account);
            if (status.isExpired) {
                stats.expiredCredentials++;
            }
            else if (status.warningLevel) {
                switch (status.warningLevel) {
                    case ExpirationWarningLevel.CRITICAL:
                        stats.expiringCritical++;
                        break;
                    case ExpirationWarningLevel.HIGH:
                        stats.expiringHigh++;
                        break;
                    case ExpirationWarningLevel.MEDIUM:
                        stats.expiringMedium++;
                        break;
                    case ExpirationWarningLevel.LOW:
                        stats.expiringLow++;
                        break;
                    case ExpirationWarningLevel.INFO:
                        stats.expiringInfo++;
                        break;
                }
                totalDays += status.daysUntilExpiration;
                if (status.daysUntilExpiration < minDays) {
                    minDays = status.daysUntilExpiration;
                    minCredential = {
                        service: status.service,
                        account: status.account,
                        daysUntilExpiration: status.daysUntilExpiration,
                    };
                }
            }
        }
        stats.healthyCredentials =
            stats.totalCredentials -
                (stats.expiredCredentials +
                    stats.expiringCritical +
                    stats.expiringHigh +
                    stats.expiringMedium +
                    stats.expiringLow +
                    stats.expiringInfo);
        const expiringCount = stats.expiringCritical +
            stats.expiringHigh +
            stats.expiringMedium +
            stats.expiringLow +
            stats.expiringInfo;
        stats.averageDaysUntilExpiration = expiringCount > 0 ? totalDays / expiringCount : 0;
        stats.oldestCredential = minCredential;
        return stats;
    }
    startMonitoring(intervalMinutes = 60) {
        if (this.monitorTimer) {
            logger.warn('Expiration monitor already running');
            return;
        }
        this.isMonitoring = true;
        const intervalMs = intervalMinutes * 60 * 1000;
        this.monitorTimer = setInterval(() => {
            this.scanForExpirations();
        }, intervalMs);
        this.scanForExpirations();
        logger.info('Expiration monitoring started', { intervalMinutes });
    }
    stopMonitoring() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
            this.isMonitoring = false;
            logger.info('Expiration monitoring stopped');
        }
    }
    isMonitoringActive() {
        return this.isMonitoring;
    }
    cleanupOldWarnings(olderThanDays = 30) {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const result = this.db
            .prepare('DELETE FROM expiration_warnings WHERE expires_at < ?')
            .run(cutoffTime);
        logger.info('Old expiration warnings cleaned up', {
            deletedRecords: result.changes,
            olderThanDays,
        });
        return result.changes;
    }
    mapRowToWarning(row) {
        return {
            id: row.id,
            service: row.service,
            account: row.account,
            warningLevel: row.warning_level,
            daysUntilExpiration: row.days_until_expiration,
            expiresAt: new Date(row.expires_at),
            notified: row.notified === 1,
            notifiedAt: row.notified_at ? new Date(row.notified_at) : undefined,
            acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
            createdAt: new Date(row.created_at),
        };
    }
}
//# sourceMappingURL=ExpirationMonitor.js.map