/**
 * Alerting Service
 *
 * Comprehensive alerting system that integrates with all monitoring services:
 * - Multi-channel notification support (Email, Webhook, Slack, Custom)
 * - Alert deduplication and rate limiting
 * - Alert lifecycle management (triggered → sent → acknowledged → resolved)
 * - Integration with ExpirationMonitor, HealthChecker, UsageTracker, RotationService
 * - Alert grouping and batching
 * - Alert history and statistics
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { ExpirationMonitor, ExpirationWarningLevel } from './ExpirationMonitor.js';
import { HealthChecker, HealthStatus } from './HealthChecker.js';
import { UsageTracker } from './UsageTracker.js';
import { RotationService } from './RotationService.js';
import { AuditLogger, AuditEventType, AuditSeverity } from './AuditLogger.js';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

/**
 * Alert types
 */
export enum AlertType {
  EXPIRATION = 'expiration',
  HEALTH = 'health',
  ANOMALY = 'anomaly',
  ROTATION_FAILURE = 'rotation_failure',
  SYSTEM = 'system',
}

/**
 * Alert state
 */
export enum AlertState {
  PENDING = 'pending',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

/**
 * Alert channel type
 */
export enum AlertChannelType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  CUSTOM = 'custom',
}

/**
 * Alert definition
 */
export interface Alert {
  id?: number;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  state: AlertState;
  metadata?: Record<string, any>;
  createdAt: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  fingerprint?: string; // For deduplication
}

/**
 * Alert channel configuration
 */
export interface AlertChannelConfig {
  id?: number;
  type: AlertChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  minSeverity?: AlertSeverity;
}

/**
 * Alert rule configuration
 */
export interface AlertRuleConfig {
  id?: number;
  name: string;
  type: AlertType;
  enabled: boolean;
  conditions: Record<string, any>;
  severity: AlertSeverity;
  channels: string[]; // Channel names
  deduplicationWindow?: number; // Minutes
  metadata?: Record<string, any>;
}

/**
 * Alert notification result
 */
export interface AlertNotificationResult {
  channelName: string;
  success: boolean;
  error?: string;
  sentAt: Date;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  totalAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  alertsByState: Record<AlertState, number>;
  sentAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  averageTimeToAcknowledge?: number; // Minutes
  averageTimeToResolve?: number; // Minutes
}

/**
 * Alert channel handler function
 */
export type AlertChannelHandler = (
  alert: Alert,
  config: Record<string, any>
) => Promise<void>;

/**
 * Alerting Service
 */
export class AlertingService {
  private db: Database.Database;
  private auditLogger: AuditLogger;
  private expirationMonitor?: ExpirationMonitor;
  private healthChecker?: HealthChecker;
  private usageTracker?: UsageTracker;
  private rotationService?: RotationService;

  private channels: Map<string, AlertChannelConfig> = new Map();
  private handlers: Map<AlertChannelType, AlertChannelHandler> = new Map();
  private rules: Map<string, AlertRuleConfig> = new Map();

  private monitorTimer: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(db: Database.Database, auditLogger: AuditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
    this.initializeSchema();
  }

  /**
   * Initialize alerting service schema
   */
  private initializeSchema(): void {
    // Alerts table
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

    // Alert channels table
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

    // Alert rules table
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

    // Alert notifications table (history)
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

  /**
   * Register monitoring services
   */
  registerServices(services: {
    expirationMonitor?: ExpirationMonitor;
    healthChecker?: HealthChecker;
    usageTracker?: UsageTracker;
    rotationService?: RotationService;
  }): void {
    this.expirationMonitor = services.expirationMonitor;
    this.healthChecker = services.healthChecker;
    this.usageTracker = services.usageTracker;
    this.rotationService = services.rotationService;

    logger.info('Monitoring services registered with alerting service');
  }

  /**
   * Register alert channel
   */
  registerChannel(config: AlertChannelConfig): void {
    const now = Date.now();

    const result = this.db
      .prepare(
        `INSERT OR REPLACE INTO alert_channels
         (type, name, enabled, config, min_severity, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        config.type,
        config.name,
        config.enabled ? 1 : 0,
        JSON.stringify(config.config),
        config.minSeverity || null,
        now
      );

    const channel: AlertChannelConfig = {
      ...config,
      id: result.lastInsertRowid as number,
    };

    this.channels.set(config.name, channel);

    logger.info('Alert channel registered', { channelName: config.name, type: config.type });
  }

  /**
   * Register custom alert handler
   */
  registerHandler(type: AlertChannelType, handler: AlertChannelHandler): void {
    this.handlers.set(type, handler);
    logger.info('Alert handler registered', { type });
  }

  /**
   * Create alert rule
   */
  createRule(config: AlertRuleConfig): AlertRuleConfig {
    const now = Date.now();

    const result = this.db
      .prepare(
        `INSERT INTO alert_rules
         (name, type, enabled, conditions, severity, channels, deduplication_window, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        config.name,
        config.type,
        config.enabled ? 1 : 0,
        JSON.stringify(config.conditions),
        config.severity,
        JSON.stringify(config.channels),
        config.deduplicationWindow || null,
        config.metadata ? JSON.stringify(config.metadata) : null,
        now
      );

    const rule: AlertRuleConfig = {
      ...config,
      id: result.lastInsertRowid as number,
    };

    this.rules.set(config.name, rule);

    logger.info('Alert rule created', { ruleName: config.name, type: config.type });
    return rule;
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'state'>): Alert {
    const now = Date.now();
    const fingerprint = alert.fingerprint || this.generateFingerprint(alert);

    // Check for duplicate alerts within deduplication window
    const existingAlert = this.findDuplicateAlert(fingerprint);
    if (existingAlert) {
      logger.debug('Duplicate alert suppressed', { fingerprint, existingAlertId: existingAlert.id });
      return existingAlert;
    }

    const result = this.db
      .prepare(
        `INSERT INTO alerts
         (type, severity, title, message, state, metadata, fingerprint, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        AlertState.PENDING,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        fingerprint,
        now
      );

    const createdAlert: Alert = {
      ...alert,
      id: result.lastInsertRowid as number,
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

  /**
   * Generate alert fingerprint for deduplication
   */
  private generateFingerprint(
    alert: Pick<Alert, 'type' | 'severity' | 'title' | 'metadata'>
  ): string {
    const parts = [alert.type, alert.severity, alert.title];

    if (alert.metadata) {
      // Include relevant metadata fields for fingerprint
      if (alert.metadata.service) parts.push(alert.metadata.service);
      if (alert.metadata.account) parts.push(alert.metadata.account);
    }

    return parts.join('::');
  }

  /**
   * Find duplicate alert within deduplication window
   */
  private findDuplicateAlert(fingerprint: string): Alert | null {
    const deduplicationWindow = 60; // Default 60 minutes
    const cutoffTime = Date.now() - deduplicationWindow * 60 * 1000;

    const row = this.db
      .prepare(
        `SELECT * FROM alerts
         WHERE fingerprint = ? AND created_at > ? AND state != ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(fingerprint, cutoffTime, AlertState.RESOLVED) as any;

    if (!row) return null;

    return this.mapRowToAlert(row);
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alertId: number): Promise<AlertNotificationResult[]> {
    const alert = this.getAlert(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.state !== AlertState.PENDING) {
      logger.warn('Alert already sent', { alertId, state: alert.state });
      return [];
    }

    // Find matching channels based on severity
    const channels = Array.from(this.channels.values()).filter(
      (channel) =>
        channel.enabled &&
        (!channel.minSeverity || this.isSeverityHigherOrEqual(alert.severity, channel.minSeverity))
    );

    const results: AlertNotificationResult[] = [];

    for (const channel of channels) {
      try {
        const handler = this.handlers.get(channel.type);
        if (!handler) {
          throw new Error(`No handler registered for channel type: ${channel.type}`);
        }

        await handler(alert, channel.config);

        const result: AlertNotificationResult = {
          channelName: channel.name,
          success: true,
          sentAt: new Date(),
        };

        results.push(result);

        // Record notification
        this.db
          .prepare(
            `INSERT INTO alert_notifications (alert_id, channel_name, success, sent_at)
             VALUES (?, ?, ?, ?)`
          )
          .run(alertId, channel.name, 1, Date.now());

        logger.info('Alert sent through channel', {
          alertId,
          channelName: channel.name,
        });
      } catch (error) {
        const errorMessage = (error as Error).message;

        const result: AlertNotificationResult = {
          channelName: channel.name,
          success: false,
          error: errorMessage,
          sentAt: new Date(),
        };

        results.push(result);

        // Record failed notification
        this.db
          .prepare(
            `INSERT INTO alert_notifications (alert_id, channel_name, success, error, sent_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(alertId, channel.name, 0, errorMessage, Date.now());

        logger.error('Failed to send alert through channel', {
          alertId,
          channelName: channel.name,
          error: errorMessage,
        });
      }
    }

    // Update alert state to SENT
    this.db
      .prepare('UPDATE alerts SET state = ?, sent_at = ? WHERE id = ?')
      .run(AlertState.SENT, Date.now(), alertId);

    return results;
  }

  /**
   * Check if severity is higher or equal to minimum
   */
  private isSeverityHigherOrEqual(
    severity: AlertSeverity,
    minSeverity: AlertSeverity
  ): boolean {
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

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: number): void {
    const result = this.db
      .prepare('UPDATE alerts SET state = ?, acknowledged_at = ? WHERE id = ?')
      .run(AlertState.ACKNOWLEDGED, Date.now(), alertId);

    if (result.changes === 0) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    logger.info('Alert acknowledged', { alertId });
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: number): void {
    const result = this.db
      .prepare('UPDATE alerts SET state = ?, resolved_at = ? WHERE id = ?')
      .run(AlertState.RESOLVED, Date.now(), alertId);

    if (result.changes === 0) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    logger.info('Alert resolved', { alertId });
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: number): Alert | null {
    const row = this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as any;

    if (!row) return null;

    return this.mapRowToAlert(row);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(type?: AlertType, severity?: AlertSeverity): Alert[] {
    let query = 'SELECT * FROM alerts WHERE state != ? ORDER BY created_at DESC';
    const params: any[] = [AlertState.RESOLVED];

    if (type) {
      query = 'SELECT * FROM alerts WHERE state != ? AND type = ? ORDER BY created_at DESC';
      params.push(type);
    }

    if (severity) {
      query =
        'SELECT * FROM alerts WHERE state != ? AND type = ? AND severity = ? ORDER BY created_at DESC';
      params.push(severity);
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map((row) => this.mapRowToAlert(row));
  }

  /**
   * Check expiration warnings and create alerts
   */
  async checkExpirationWarnings(): Promise<Alert[]> {
    if (!this.expirationMonitor) {
      return [];
    }

    const warnings = this.expirationMonitor.getUnnotifiedWarnings();
    const alerts: Alert[] = [];

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

      // Mark warning as notified
      this.expirationMonitor.markAsNotified(warning.id!);

      // Send alert
      await this.sendAlert(alert.id!);
    }

    return alerts;
  }

  /**
   * Check health status and create alerts
   */
  async checkHealthStatus(): Promise<Alert[]> {
    if (!this.healthChecker) {
      return [];
    }

    const health = await this.healthChecker.checkHealth();
    const alerts: Alert[] = [];

    // Check overall system health
    if (
      health.status === HealthStatus.CRITICAL ||
      health.status === HealthStatus.UNHEALTHY
    ) {
      const severity =
        health.status === HealthStatus.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;

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
      await this.sendAlert(alert.id!);
    }

    // Check individual component health
    for (const component of health.components) {
      if (
        component.status === HealthStatus.CRITICAL ||
        component.status === HealthStatus.UNHEALTHY
      ) {
        const severity =
          component.status === HealthStatus.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;

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
        await this.sendAlert(alert.id!);
      }
    }

    return alerts;
  }

  /**
   * Check usage anomalies and create alerts
   */
  async checkUsageAnomalies(): Promise<Alert[]> {
    if (!this.usageTracker) {
      return [];
    }

    // Get all credentials from database
    const credentials = this.db
      .prepare('SELECT DISTINCT service, account FROM credentials')
      .all() as Array<{ service: string; account: string }>;

    const alerts: Alert[] = [];

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
        await this.sendAlert(alert.id!);
      }
    }

    return alerts;
  }

  /**
   * Map warning level to alert severity
   */
  private mapWarningLevelToAlertSeverity(level: ExpirationWarningLevel): AlertSeverity {
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

  /**
   * Map anomaly severity to alert severity
   */
  private mapAnomalySeverityToAlertSeverity(severity: string): AlertSeverity {
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

  /**
   * Map alert severity to audit severity
   */
  private mapAlertSeverityToAuditSeverity(severity: AlertSeverity): AuditSeverity {
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

  /**
   * Start automated monitoring
   */
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitorTimer) {
      logger.warn('Alerting monitoring already running');
      return;
    }

    this.isMonitoring = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.monitorTimer = setInterval(() => {
      this.runMonitoringChecks().catch((error) => {
        logger.error('Monitoring check error', { error: (error as Error).message });
      });
    }, intervalMs);

    // Run immediately on start
    this.runMonitoringChecks().catch((error) => {
      logger.error('Initial monitoring check error', { error: (error as Error).message });
    });

    logger.info('Alerting monitoring started', { intervalMinutes });
  }

  /**
   * Stop automated monitoring
   */
  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
      this.isMonitoring = false;
      logger.info('Alerting monitoring stopped');
    }
  }

  /**
   * Run all monitoring checks
   */
  private async runMonitoringChecks(): Promise<void> {
    logger.debug('Running monitoring checks');

    await Promise.all([
      this.checkExpirationWarnings(),
      this.checkHealthStatus(),
      this.checkUsageAnomalies(),
    ]);
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const totalAlerts = (
      this.db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number }
    ).count;

    const sentAlerts = (
      this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?').get(AlertState.SENT) as {
        count: number;
      }
    ).count;

    const acknowledgedAlerts = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
        .get(AlertState.ACKNOWLEDGED) as { count: number }
    ).count;

    const resolvedAlerts = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
        .get(AlertState.RESOLVED) as { count: number }
    ).count;

    const suppressedAlerts = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?')
        .get(AlertState.SUPPRESSED) as { count: number }
    ).count;

    // Alerts by severity
    const severities = [
      AlertSeverity.CRITICAL,
      AlertSeverity.HIGH,
      AlertSeverity.MEDIUM,
      AlertSeverity.LOW,
      AlertSeverity.INFO,
    ];
    const alertsBySeverity: Record<AlertSeverity, number> = {} as any;
    for (const severity of severities) {
      alertsBySeverity[severity] = (
        this.db
          .prepare('SELECT COUNT(*) as count FROM alerts WHERE severity = ?')
          .get(severity) as { count: number }
      ).count;
    }

    // Alerts by type
    const types = [
      AlertType.EXPIRATION,
      AlertType.HEALTH,
      AlertType.ANOMALY,
      AlertType.ROTATION_FAILURE,
      AlertType.SYSTEM,
    ];
    const alertsByType: Record<AlertType, number> = {} as any;
    for (const type of types) {
      alertsByType[type] = (
        this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE type = ?').get(type) as {
          count: number;
        }
      ).count;
    }

    // Alerts by state
    const states = [
      AlertState.PENDING,
      AlertState.SENT,
      AlertState.ACKNOWLEDGED,
      AlertState.RESOLVED,
      AlertState.SUPPRESSED,
    ];
    const alertsByState: Record<AlertState, number> = {} as any;
    for (const state of states) {
      alertsByState[state] = (
        this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE state = ?').get(state) as {
          count: number;
        }
      ).count;
    }

    // Average time to acknowledge (in minutes)
    const avgAckTime = this.db
      .prepare(
        `SELECT AVG((acknowledged_at - created_at) / 60000.0) as avg
         FROM alerts WHERE acknowledged_at IS NOT NULL`
      )
      .get() as { avg: number | null };

    // Average time to resolve (in minutes)
    const avgResolveTime = this.db
      .prepare(
        `SELECT AVG((resolved_at - created_at) / 60000.0) as avg
         FROM alerts WHERE resolved_at IS NOT NULL`
      )
      .get() as { avg: number | null };

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

  /**
   * Clean up old resolved alerts
   */
  cleanupOldAlerts(olderThanDays: number = 30): number {
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

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Map database row to Alert
   */
  private mapRowToAlert(row: any): Alert {
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
