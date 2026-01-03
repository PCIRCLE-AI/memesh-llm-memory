import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { AuditEventType, AuditSeverity } from './AuditLogger.js';
import { validateServiceAndAccount, validateFutureDate, validateMetadataSize } from './validation.js';
export class RotationService {
    db;
    rotationPolicy;
    auditLogger;
    providers = new Map();
    schedulerTimer = null;
    isRunning = false;
    constructor(db, rotationPolicy, auditLogger) {
        this.db = db;
        this.rotationPolicy = rotationPolicy;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS rotation_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        status TEXT NOT NULL,
        scheduled_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        error TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rotation_jobs_status
        ON rotation_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_rotation_jobs_service_account
        ON rotation_jobs(service, account);
      CREATE INDEX IF NOT EXISTS idx_rotation_jobs_scheduled
        ON rotation_jobs(scheduled_at);
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS rotation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        success INTEGER NOT NULL,
        previous_version TEXT,
        new_version TEXT,
        rotated_at INTEGER NOT NULL,
        rotation_time_ms INTEGER NOT NULL,
        error TEXT,
        rollback_supported INTEGER NOT NULL DEFAULT 0,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_rotation_history_service_account
        ON rotation_history(service, account);
      CREATE INDEX IF NOT EXISTS idx_rotation_history_rotated_at
        ON rotation_history(rotated_at);
    `);
        logger.info('Rotation service schema initialized');
    }
    registerProvider(servicePattern, provider) {
        this.providers.set(servicePattern, provider);
        logger.info('Rotation provider registered', { servicePattern });
    }
    unregisterProvider(servicePattern) {
        this.providers.delete(servicePattern);
        logger.info('Rotation provider unregistered', { servicePattern });
    }
    getProvider(service) {
        if (this.providers.has(service)) {
            return this.providers.get(service);
        }
        for (const [pattern, provider] of this.providers.entries()) {
            if (this.matchesPattern(service, pattern)) {
                return provider;
            }
        }
        return null;
    }
    matchesPattern(service, pattern) {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(service);
    }
    scheduleRotation(service, account, scheduledAt, metadata) {
        validateServiceAndAccount(service, account);
        if (scheduledAt) {
            validateFutureDate(scheduledAt, 'scheduledAt');
        }
        if (metadata) {
            validateMetadataSize(metadata);
        }
        const now = Date.now();
        const scheduledTime = scheduledAt ? scheduledAt.getTime() : now;
        const result = this.db
            .prepare(`
      INSERT INTO rotation_jobs (
        service, account, status, scheduled_at, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
            .run(service, account, 'pending', scheduledTime, metadata ? JSON.stringify(metadata) : null, now);
        const job = {
            id: result.lastInsertRowid,
            service,
            account,
            status: 'pending',
            scheduledAt: new Date(scheduledTime),
            metadata,
        };
        this.auditLogger.log(AuditEventType.ROTATION_SCHEDULED, {
            service,
            account,
            success: true,
            details: JSON.stringify({
                jobId: job.id,
                scheduledAt: scheduledAt || new Date(),
            }),
        });
        logger.info('Rotation job scheduled', {
            jobId: job.id,
            service,
            account,
            scheduledAt: new Date(scheduledTime),
        });
        return job;
    }
    async executeRotation(service, account, currentValue) {
        const startTime = Date.now();
        const provider = this.getProvider(service);
        if (!provider) {
            const error = `No rotation provider registered for service: ${service}`;
            logger.error(error);
            this.auditLogger.log(AuditEventType.ROTATION_FAILED, {
                service,
                account,
                success: false,
                severity: AuditSeverity.ERROR,
                details: error,
            });
            return {
                service,
                account,
                success: false,
                error,
                rotatedAt: new Date(),
                rollbackSupported: false,
            };
        }
        try {
            const newValue = await provider(service, account, currentValue);
            const previousVersion = this.hashValue(currentValue);
            const newVersion = this.hashValue(newValue);
            const rotationTime = Date.now() - startTime;
            this.db
                .prepare(`
        INSERT INTO rotation_history (
          service, account, success, previous_version, new_version,
          rotated_at, rotation_time_ms, rollback_supported
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
                .run(service, account, 1, previousVersion, newVersion, Date.now(), rotationTime, 1);
            const existingCred = this.db
                .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
                .get(service, account);
            if (!existingCred) {
                const now = Date.now();
                this.db
                    .prepare('INSERT INTO credentials (service, account, created_at, updated_at) VALUES (?, ?, ?, ?)')
                    .run(service, account, now, now);
            }
            this.rotationPolicy.markAsRotated(service, account);
            this.auditLogger.log(AuditEventType.ROTATION_COMPLETED, {
                service,
                account,
                success: true,
                details: JSON.stringify({
                    rotationTimeMs: rotationTime,
                    previousVersion,
                    newVersion,
                }),
            });
            logger.info('Credential rotated successfully', {
                service,
                account,
                rotationTimeMs: rotationTime,
            });
            return {
                service,
                account,
                success: true,
                previousVersion,
                newVersion,
                rotatedAt: new Date(),
                rollbackSupported: true,
            };
        }
        catch (error) {
            const errorMessage = error.message;
            const rotationTime = Date.now() - startTime;
            this.db
                .prepare(`
        INSERT INTO rotation_history (
          service, account, success, rotated_at, rotation_time_ms, error, rollback_supported
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
                .run(service, account, 0, Date.now(), rotationTime, errorMessage, 0);
            this.auditLogger.log(AuditEventType.ROTATION_FAILED, {
                service,
                account,
                success: false,
                severity: AuditSeverity.ERROR,
                details: JSON.stringify({
                    error: errorMessage,
                    rotationTimeMs: rotationTime,
                }),
            });
            logger.error('Credential rotation failed', {
                service,
                account,
                error: errorMessage,
            });
            return {
                service,
                account,
                success: false,
                error: errorMessage,
                rotatedAt: new Date(),
                rollbackSupported: false,
            };
        }
    }
    hashValue(value) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    startScheduler(intervalMinutes = 60) {
        if (this.schedulerTimer) {
            logger.warn('Rotation scheduler already running');
            return;
        }
        this.isRunning = true;
        const intervalMs = intervalMinutes * 60 * 1000;
        this.schedulerTimer = setInterval(() => {
            this.runScheduledRotations().catch((error) => {
                logger.error('Scheduler error', { error: error.message });
            });
        }, intervalMs);
        this.runScheduledRotations().catch((error) => {
            logger.error('Initial scheduler run error', { error: error.message });
        });
        logger.info('Rotation scheduler started', { intervalMinutes });
    }
    stopScheduler() {
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
            this.isRunning = false;
            logger.info('Rotation scheduler stopped');
        }
    }
    async runScheduledRotations() {
        const now = Date.now();
        const jobs = this.db
            .prepare(`
      SELECT * FROM rotation_jobs
      WHERE status = 'pending' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
    `)
            .all(now);
        logger.info(`Processing ${jobs.length} scheduled rotation jobs`);
        for (const job of jobs) {
            try {
                this.db
                    .prepare(`
          UPDATE rotation_jobs
          SET status = 'in_progress', started_at = ?
          WHERE id = ?
        `)
                    .run(now, job.id);
                this.db
                    .prepare(`
          UPDATE rotation_jobs
          SET status = 'completed', completed_at = ?
          WHERE id = ?
        `)
                    .run(Date.now(), job.id);
                logger.info('Rotation job completed', {
                    jobId: job.id,
                    service: job.service,
                    account: job.account,
                });
            }
            catch (error) {
                const errorMessage = error.message;
                this.db
                    .prepare(`
          UPDATE rotation_jobs
          SET status = 'failed', error = ?, completed_at = ?
          WHERE id = ?
        `)
                    .run(errorMessage, Date.now(), job.id);
                logger.error('Rotation job failed', {
                    jobId: job.id,
                    service: job.service,
                    account: job.account,
                    error: errorMessage,
                });
            }
        }
    }
    getRotationHistory(service, account, limit = 10) {
        const rows = this.db
            .prepare(`
      SELECT * FROM rotation_history
      WHERE service = ? AND account = ?
      ORDER BY rotated_at DESC
      LIMIT ?
    `)
            .all(service, account, limit);
        return rows.map((row) => ({
            service: row.service,
            account: row.account,
            success: row.success === 1,
            previousVersion: row.previous_version,
            newVersion: row.new_version,
            rotatedAt: new Date(row.rotated_at),
            error: row.error,
            rollbackSupported: row.rollback_supported === 1,
        }));
    }
    getStats() {
        const totalRotations = this.db
            .prepare('SELECT COUNT(*) as count FROM rotation_history')
            .get();
        const successfulRotations = this.db
            .prepare('SELECT COUNT(*) as count FROM rotation_history WHERE success = 1')
            .get();
        const failedRotations = this.db
            .prepare('SELECT COUNT(*) as count FROM rotation_history WHERE success = 0')
            .get();
        const rolledBack = this.db
            .prepare("SELECT COUNT(*) as count FROM rotation_jobs WHERE status = 'rolled_back'")
            .get();
        const avgTime = this.db
            .prepare('SELECT AVG(rotation_time_ms) as avg FROM rotation_history')
            .get();
        const lastRotation = this.db
            .prepare('SELECT MAX(rotated_at) as last FROM rotation_history')
            .get();
        const needsRotation = this.rotationPolicy.listCredentialsNeedingRotation();
        return {
            totalRotations: totalRotations.count,
            successfulRotations: successfulRotations.count,
            failedRotations: failedRotations.count,
            rolledBackRotations: rolledBack.count,
            averageRotationTime: avgTime.avg || 0,
            lastRotation: lastRotation.last ? new Date(lastRotation.last) : undefined,
            credentialsNeedingRotation: needsRotation.length,
        };
    }
    cleanupHistory(olderThanDays = 90) {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const result = this.db
            .prepare('DELETE FROM rotation_history WHERE rotated_at < ?')
            .run(cutoffTime);
        logger.info('Rotation history cleaned up', {
            deletedRecords: result.changes,
            olderThanDays,
        });
        return result.changes;
    }
    isSchedulerRunning() {
        return this.isRunning;
    }
}
//# sourceMappingURL=RotationService.js.map