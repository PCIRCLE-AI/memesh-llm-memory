import Database from 'better-sqlite3';
import { ExpirationMonitor } from './ExpirationMonitor.js';
import { HealthChecker } from './HealthChecker.js';
import { UsageTracker } from './UsageTracker.js';
import { RotationService } from './RotationService.js';
import { AuditLogger } from './AuditLogger.js';
export declare enum AlertSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
export declare enum AlertType {
    EXPIRATION = "expiration",
    HEALTH = "health",
    ANOMALY = "anomaly",
    ROTATION_FAILURE = "rotation_failure",
    SYSTEM = "system"
}
export declare enum AlertState {
    PENDING = "pending",
    SENT = "sent",
    ACKNOWLEDGED = "acknowledged",
    RESOLVED = "resolved",
    SUPPRESSED = "suppressed"
}
export declare enum AlertChannelType {
    EMAIL = "email",
    WEBHOOK = "webhook",
    SLACK = "slack",
    CUSTOM = "custom"
}
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
    fingerprint?: string;
}
export interface AlertChannelConfig {
    id?: number;
    type: AlertChannelType;
    name: string;
    enabled: boolean;
    config: Record<string, any>;
    minSeverity?: AlertSeverity;
}
export interface AlertRuleConfig {
    id?: number;
    name: string;
    type: AlertType;
    enabled: boolean;
    conditions: Record<string, any>;
    severity: AlertSeverity;
    channels: string[];
    deduplicationWindow?: number;
    metadata?: Record<string, any>;
}
export interface AlertNotificationResult {
    channelName: string;
    success: boolean;
    error?: string;
    sentAt: Date;
}
export interface AlertStats {
    totalAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsByType: Record<AlertType, number>;
    alertsByState: Record<AlertState, number>;
    sentAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
    suppressedAlerts: number;
    averageTimeToAcknowledge?: number;
    averageTimeToResolve?: number;
}
export type AlertChannelHandler = (alert: Alert, config: Record<string, any>) => Promise<void>;
export declare class AlertingService {
    private db;
    private auditLogger;
    private expirationMonitor?;
    private healthChecker?;
    private usageTracker?;
    private rotationService?;
    private channels;
    private handlers;
    private rules;
    private monitorTimer;
    private isMonitoring;
    constructor(db: Database.Database, auditLogger: AuditLogger);
    private initializeSchema;
    registerServices(services: {
        expirationMonitor?: ExpirationMonitor;
        healthChecker?: HealthChecker;
        usageTracker?: UsageTracker;
        rotationService?: RotationService;
    }): void;
    registerChannel(config: AlertChannelConfig): void;
    registerHandler(type: AlertChannelType, handler: AlertChannelHandler): void;
    createRule(config: AlertRuleConfig): AlertRuleConfig;
    createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'state'>): Alert;
    private generateFingerprint;
    private findDuplicateAlert;
    sendAlert(alertId: number): Promise<AlertNotificationResult[]>;
    private isSeverityHigherOrEqual;
    acknowledgeAlert(alertId: number): void;
    resolveAlert(alertId: number): void;
    getAlert(alertId: number): Alert | null;
    getActiveAlerts(type?: AlertType, severity?: AlertSeverity): Alert[];
    checkExpirationWarnings(): Promise<Alert[]>;
    checkHealthStatus(): Promise<Alert[]>;
    checkUsageAnomalies(): Promise<Alert[]>;
    private mapWarningLevelToAlertSeverity;
    private mapAnomalySeverityToAlertSeverity;
    private mapAlertSeverityToAuditSeverity;
    startMonitoring(intervalMinutes?: number): void;
    stopMonitoring(): void;
    private runMonitoringChecks;
    getStats(): AlertStats;
    cleanupOldAlerts(olderThanDays?: number): number;
    isMonitoringActive(): boolean;
    private mapRowToAlert;
}
//# sourceMappingURL=AlertingService.d.ts.map