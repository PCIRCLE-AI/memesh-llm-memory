import { logger } from '../utils/logger.js';
import { ExpirationWarningLevel } from './ExpirationMonitor.js';
import { HealthStatus } from './HealthChecker.js';
import { AuditEventType, AuditSeverity } from './AuditLogger.js';
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertType;
(function (AlertType) {
    AlertType["EXPIRATION"] = "expiration";
    AlertType["HEALTH"] = "health";
    AlertType["ANOMALY"] = "anomaly";
    AlertType["ROTATION_FAILURE"] = "rotation_failure";
    AlertType["SYSTEM"] = "system";
})(AlertType || (AlertType = {}));
export var AlertState;
(function (AlertState) {
    AlertState["PENDING"] = "pending";
    AlertState["SENT"] = "sent";
    AlertState["ACKNOWLEDGED"] = "acknowledged";
    AlertState["RESOLVED"] = "resolved";
    AlertState["SUPPRESSED"] = "suppressed";
})(AlertState || (AlertState = {}));
export var AlertChannelType;
(function (AlertChannelType) {
    AlertChannelType["EMAIL"] = "email";
    AlertChannelType["WEBHOOK"] = "webhook";
    AlertChannelType["SLACK"] = "slack";
    AlertChannelType["CUSTOM"] = "custom";
})(AlertChannelType || (AlertChannelType = {}));
export class AlertingService {
    db;
    auditLogger;
    expirationMonitor;
    healthChecker;
    usageTracker;
    rotationService;
    channels = new Map();
    handlers = new Map();
    rules = new Map();
    monitorTimer = null;
    isMonitoring = false;
    constructor(db, auditLogger) {
        this.db = db;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        state TEXT NOT NULL,
        metadata TEXT,
        fingerprint TEXT,
        created_at INTEGER NOT NULL,
        sent_at INTEGER,
        acknowledged_at INTEGER,
        resolved_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);
      CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint ON alerts(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL,
        min_severity TEXT,
        created_at INTEGER NOT NULL
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        conditions TEXT NOT NULL,
        severity TEXT NOT NULL,
        channels TEXT NOT NULL,
        deduplication_window INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER NOT NULL,
        channel_name TEXT NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        sent_at INTEGER NOT NULL,
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id
        ON alert_notifications(alert_id);
    `);
        logger.info('Alerting service schema initialized');
    }
    registerServices(services) {
        this.expirationMonitor = services.expirationMonitor;
        this.healthChecker = services.healthChecker;
        this.usageTracker = services.usageTracker;
        this.rotationService = services.rotationService;
        logger.info('Monitoring services registered with alerting service');
    }
    registerChannel(config) {
        const now = Date.now();
        const result = this.db
            .prepare(`INSERT OR REPLACE INTO alert_channels
         (type, name, enabled, config, min_severity, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`)
            .run(config.type, config.name, config.enabled ? 1 : 0, JSON.stringify(config.config), config.minSeverity || null, now);
        const channel = {
            ...config,
            id: result.lastInsertRowid,
        };
        this.channels.set(config.name, channel);
        logger.info('Alert channel registered', { channelName: config.name, type: config.type });
    }
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        logger.info('Alert handler registered', { type });
    }
    createRule(config) {
        const now = Date.now();
        const result = this.db
            .prepare(`INSERT INTO alert_rules
         (name, type, enabled, conditions, severity, channels, deduplication_window, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(config.name, config.type, config.enabled ? 1 : 0, JSON.stringify(config.conditions), config.severity, JSON.stringify(config.channels), config.deduplicationWindow || null, config.metadata ? JSON.stringify(config.metadata) : null, now);
        const rule = {
            ...config,
            id: result.lastInsertRowid,
        };
        this.rules.set(config.name, rule);
        logger.info('Alert rule created', { ruleName: config.name, type: config.type });
        return rule;
    }
    createAlert(alert) {
        const now = Date.now();
        const fingerprint = alert.fingerprint || this.generateFingerprint(alert);
        const existingAlert = this.findDuplicateAlert(fingerprint);
        if (existingAlert) {
            logger.debug('Duplicate alert suppressed', { fingerprint, existingAlertId: existingAlert.id });
            return existingAlert;
        }
        const result = this.db
            .prepare(`INSERT INTO alerts
         (type, severity, title, message, state, metadata, fingerprint, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(alert.type, alert.severity, alert.title, alert.message, AlertState.PENDING, alert.metadata ? JSON.stringify(alert.metadata) : null, fingerprint, now);
        const createdAlert = {
            ...alert,
            id: result.lastInsertRowid,
            state: AlertState.PENDING,
            createdAt: new Date(now),
            fingerprint,
        };
        this.auditLogger.log(AuditEventType.ACCESS_DENIED_VALIDATION, {
            service: 'alerting',
            account: alert.type,
            success: false,
            severity: this.mapAlertSeverityToAuditSeverity(alert.severity),
            details: JSON.stringify({
                alertId: createdAlert.id,
                title: alert.title,
                fingerprint,
            }),
        });
        logger.info('Alert created', {
            alertId: createdAlert.id,
            type: alert.type,
            severity: alert.severity,
        });
        return createdAlert;
    }
    generateFingerprint(alert) {
        const parts = [alert.type, alert.severity, alert.title];
        if (alert.metadata) {
            if (alert.metadata.service)
                parts.push(alert.metadata.service);
            if (alert.metadata.account)
                parts.push(alert.metadata.account);
        }
        return parts.join('::');
    }
    findDuplicateAlert(fingerprint) {
        const deduplicationWindow = 60;
        const cutoffTime = Date.now() - deduplicationWindow * 60 * 1000;
        const row = this.db
            .prepare(`SELECT * FROM alerts
         WHERE fingerprint = ? AND created_at > ? AND state != ?
         ORDER BY created_at DESC LIMIT 1`)
            .get(fingerprint, cutoffTime, AlertState.RESOLVED);
        if (!row)
            return null;
        return this.mapRowToAlert(row);
    }
    async sendAlert(alertId) {
        const alert = this.getAlert(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        if (alert.state !== AlertState.PENDING) {
            logger.warn('Alert already sent', { alertId, state: alert.state });
            return [];
        }
        const channels = Array.from(this.channels.values()).filter((channel) => channel.enabled &&
            (!channel.minSeverity || this.isSeverityHigherOrEqual(alert.severity, channel.minSeverity)));
        const results = [];
        for (const channel of channels) {
            try {
                const handler = this.handlers.get(channel.type);
                if (!handler) {
                    throw new Error(`No handler registered for channel type: ${channel.type}`);
                }
                await handler(alert, channel.config);
                const result = {
                    channelName: channel.name,
                    success: true,
                    sentAt: new Date(),
                };
                results.push(result);
                this.db
                    .prepare(`INSERT INTO alert_notifications (alert_id, channel_name, success, sent_at)
             VALUES (?, ?, ?, ?)`)
                    .run(alertId, channel.name, 1, Date.now());
                logger.info('Alert sent through channel', {
                    alertId,
                    channelName: channel.name,
                });
            }
            catch (error) {
                const errorMessage = error.message;
                const result = {
                    channelName: channel.name,
                    success: false,
                    error: errorMessage,
                    sentAt: new Date(),
                };
                results.push(result);
                this.db
                    .prepare(`INSERT INTO alert_notifications (alert_id, channel_name, success, error, sent_at)
             VALUES (?, ?, ?, ?, ?)`)
                    .run(alertId, channel.name, 0, errorMessage, Date.now());
                logger.error('Failed to send alert through channel', {
                    alertId,
                    channelName: channel.name,
                    error: errorMessage,
                });
            }
        }
        this.db
            .prepare('UPDATE alerts SET state = ?, sent_at = ? WHERE id = ?')
            .run(AlertState.SENT, Date.now(), alertId);
        return results;
    }
    isSeverityHigherOrEqual(severity, minSeverity) {
        const levels = [
            AlertSeverity.INFO,
            AlertSeverity.LOW,
            AlertSeverity.MEDIUM,
            AlertSeverity.HIGH,
            AlertSeverity.CRITICAL,
        ];
        const severityIndex = levels.indexOf(severity);
        const minSeverityIndex = levels.indexOf(minSeverity);
        return severityIndex >= minSeverityIndex;
    }
    acknowledgeAlert(alertId) {
        const result = this.db
            .prepare('UPDATE alerts SET state = ?, acknowledged_at = ? WHERE id = ?')
            .run(AlertState.ACKNOWLEDGED, Date.now(), alertId);
        if (result.changes === 0) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        logger.info('Alert acknowledged', { alertId });
    }
    resolveAlert(alertId) {
        const result = this.db
            .prepare('UPDATE alerts SET state = ?, resolved_at = ? WHERE id = ?')
            .run(AlertState.RESOLVED, Date.now(), alertId);
        if (result.changes === 0) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        logger.info('Alert resolved', { alertId });
    }
    getAlert(alertId) {
        const row = this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
        if (!row)
            return null;
        return this.mapRowToAlert(row);
    }
    getActiveAlerts(type, severity) {
        let query = 'SELECT * FROM alerts WHERE state != ? ORDER BY created_at DESC';
        const params = [AlertState.RESOLVED];
        if (type) {
            query = 'SELECT * FROM alerts WHERE state != ? AND type = ? ORDER BY created_at DESC';
            params.push(type);
        }
        if (severity) {
            query =
                'SELECT * FROM alerts WHERE state != ? AND type = ? AND severity = ? ORDER BY created_at DESC';
            params.push(severity);
        }
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => this.mapRowToAlert(row));
    }
    async checkExpirationWarnings() {
        if (!this.expirationMonitor) {
            return [];
        }
        const warnings = this.expirationMonitor.getUnnotifiedWarnings();
        const alerts = [];
        for (const warning of warnings) {
            const severity = this.mapWarningLevelToAlertSeverity(warning.warningLevel);
            const alert = this.createAlert({
                type: AlertType.EXPIRATION,
                severity,
                title: `Credential expiring: ${warning.service}/${warning.account}`,
                message: `Credential will expire in ${warning.daysUntilExpiration} days (${warning.expiresAt.toISOString()})`,
                metadata: {
                    service: warning.service,
                    account: warning.account,
                    daysUntilExpiration: warning.daysUntilExpiration,
                    expiresAt: warning.expiresAt.toISOString(),
                    warningLevel: warning.warningLevel,
                },
            });
            alerts.push(alert);
            this.expirationMonitor.markAsNotified(warning.id);
            await this.sendAlert(alert.id);
        }
        return alerts;
    }
    async checkHealthStatus() {
        if (!this.healthChecker) {
            return [];
        }
        const health = await this.healthChecker.checkHealth();
        const alerts = [];
        if (health.status === HealthStatus.CRITICAL ||
            health.status === HealthStatus.UNHEALTHY) {
            const severity = health.status === HealthStatus.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
            const alert = this.createAlert({
                type: AlertType.HEALTH,
                severity,
                title: `System health ${health.status}`,
                message: `Overall system health is ${health.status}`,
                metadata: {
                    status: health.status,
                    unhealthyComponents: health.components
                        .filter((c) => c.status !== HealthStatus.HEALTHY)
                        .map((c) => c.name),
                },
            });
            alerts.push(alert);
            await this.sendAlert(alert.id);
        }
        for (const component of health.components) {
            if (component.status === HealthStatus.CRITICAL ||
                component.status === HealthStatus.UNHEALTHY) {
                const severity = component.status === HealthStatus.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
                const alert = this.createAlert({
                    type: AlertType.HEALTH,
                    severity,
                    title: `Component unhealthy: ${component.name}`,
                    message: component.message || `Component ${component.name} is ${component.status}`,
                    metadata: {
                        component: component.name,
                        status: component.status,
                    },
                });
                alerts.push(alert);
                await this.sendAlert(alert.id);
            }
        }
        return alerts;
    }
    async checkUsageAnomalies() {
        if (!this.usageTracker) {
            return [];
        }
        const credentials = this.db
            .prepare('SELECT DISTINCT service, account FROM credentials')
            .all();
        const alerts = [];
        for (const { service, account } of credentials) {
            const anomalies = this.usageTracker.detectAnomalies(service, account);
            for (const anomaly of anomalies) {
                const severity = this.mapAnomalySeverityToAlertSeverity(anomaly.severity);
                const alert = this.createAlert({
                    type: AlertType.ANOMALY,
                    severity,
                    title: `Usage anomaly: ${service}/${account}`,
                    message: anomaly.description,
                    metadata: {
                        service,
                        account,
                        anomalyType: anomaly.anomalyType,
                        severity: anomaly.severity,
                        baseline: anomaly.baseline,
                        current: anomaly.current,
                        deviationPercent: anomaly.deviationPercent,
                    },
                });
                alerts.push(alert);
                await this.sendAlert(alert.id);
            }
        }
        return alerts;
    }
    mapWarningLevelToAlertSeverity(level) {
        switch (level) {
            case ExpirationWarningLevel.CRITICAL:
                return AlertSeverity.CRITICAL;
            case ExpirationWarningLevel.HIGH:
                return AlertSeverity.HIGH;
            case ExpirationWarningLevel.MEDIUM:
                return AlertSeverity.MEDIUM;
            case ExpirationWarningLevel.LOW:
                return AlertSeverity.LOW;
            case ExpirationWarningLevel.INFO:
                return AlertSeverity.INFO;
        }
    }
    mapAnomalySeverityToAlertSeverity(severity) {
        switch (severity) {
            case 'critical':
                return AlertSeverity.CRITICAL;
            case 'high':
                return AlertSeverity.HIGH;
            case 'medium':
                return AlertSeverity.MEDIUM;
            default:
                return AlertSeverity.LOW;
        }
    }
    mapAlertSeverityToAuditSeverity(severity) {
        switch (severity) {
            case AlertSeverity.CRITICAL:
            case AlertSeverity.HIGH:
                return AuditSeverity.ERROR;
            case AlertSeverity.MEDIUM:
                return AuditSeverity.WARNING;
            default:
                return AuditSeverity.INFO;
        }
    }
    startMonitoring(intervalMinutes = 5) {
        if (this.monitorTimer) {
            logger.warn('Alerting monitoring already running');
            return;
        }
        this.isMonitoring = true;
        const intervalMs = intervalMinutes * 60 * 1000;
        this.monitorTimer = setInterval(() => {
            this.runMonitoringChecks().catch((error) => {
                logger.error('Monitoring check error', { error: error.message });
            });
        }, intervalMs);
        this.runMonitoringChecks().catch((error) => {
            logger.error('Initial monitoring check error', { error: error.message });
        });
        logger.info('Alerting monitoring started', { intervalMinutes });
    }
    stopMonitoring() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
            this.isMonitoring = false;
            logger.info('Alerting monitoring stopped');
        }
    }
    async runMonitoringChecks() {
        logger.debug('Running monitoring checks');
        await Promise.all([
            this.checkExpirationWarnings(),
            this.checkHealthStatus(),
            this.checkUsageAnomalies(),
        ]);
    }
    getStats() {
        const totalAlerts = this.db.prepare('SELECT COUNT(*) as count FROM alerts').get().count;
        const sentAlerts = this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?').get(AlertState.SENT).count;
        const acknowledgedAlerts = this.db
            .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
            .get(AlertState.ACKNOWLEDGED).count;
        const resolvedAlerts = this.db
            .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
            .get(AlertState.RESOLVED).count;
        const suppressedAlerts = this.db
            .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
            .get(AlertState.SUPPRESSED).count;
        const severities = [
            AlertSeverity.CRITICAL,
            AlertSeverity.HIGH,
            AlertSeverity.MEDIUM,
            AlertSeverity.LOW,
            AlertSeverity.INFO,
        ];
        const alertsBySeverity = {};
        for (const severity of severities) {
            alertsBySeverity[severity] = this.db
                .prepare('SELECT COUNT(*) as count FROM alerts WHERE severity = ?')
                .get(severity).count;
        }
        const types = [
            AlertType.EXPIRATION,
            AlertType.HEALTH,
            AlertType.ANOMALY,
            AlertType.ROTATION_FAILURE,
            AlertType.SYSTEM,
        ];
        const alertsByType = {};
        for (const type of types) {
            alertsByType[type] = this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE type = ?').get(type).count;
        }
        const states = [
            AlertState.PENDING,
            AlertState.SENT,
            AlertState.ACKNOWLEDGED,
            AlertState.RESOLVED,
            AlertState.SUPPRESSED,
        ];
        const alertsByState = {};
        for (const state of states) {
            alertsByState[state] = this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?').get(state).count;
        }
        const avgAckTime = this.db
            .prepare(`SELECT AVG((acknowledged_at - created_at) / 60000.0) as avg
         FROM alerts WHERE acknowledged_at IS NOT NULL`)
            .get();
        const avgResolveTime = this.db
            .prepare(`SELECT AVG((resolved_at - created_at) / 60000.0) as avg
         FROM alerts WHERE resolved_at IS NOT NULL`)
            .get();
        return {
            totalAlerts,
            alertsBySeverity,
            alertsByType,
            alertsByState,
            sentAlerts,
            acknowledgedAlerts,
            resolvedAlerts,
            suppressedAlerts,
            averageTimeToAcknowledge: avgAckTime.avg || undefined,
            averageTimeToResolve: avgResolveTime.avg || undefined,
        };
    }
    cleanupOldAlerts(olderThanDays = 30) {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const result = this.db
            .prepare('DELETE FROM alerts WHERE state = ? AND resolved_at < ?')
            .run(AlertState.RESOLVED, cutoffTime);
        logger.info('Old alerts cleaned up', {
            deletedRecords: result.changes,
            olderThanDays,
        });
        return result.changes;
    }
    isMonitoringActive() {
        return this.isMonitoring;
    }
    mapRowToAlert(row) {
        return {
            id: row.id,
            type: row.type,
            severity: row.severity,
            title: row.title,
            message: row.message,
            state: row.state,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            fingerprint: row.fingerprint,
            createdAt: new Date(row.created_at),
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        };
    }
}
//# sourceMappingURL=AlertingService.js.map