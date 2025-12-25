/**
 * Audit Logger for Credential Operations
 *
 * Provides comprehensive audit logging for:
 * - All CRUD operations on credentials
 * - Rate limit violations and admin operations
 * - Authentication attempts and security events
 * - Compliance and forensic investigation
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * Audit event types
 */
export enum AuditEventType {
  // CRUD Operations
  CREDENTIAL_ADDED = 'credential_added',
  CREDENTIAL_RETRIEVED = 'credential_retrieved',
  CREDENTIAL_UPDATED = 'credential_updated',
  CREDENTIAL_DELETED = 'credential_deleted',

  // Rate Limiting
  RATE_LIMIT_HIT = 'rate_limit_hit',
  RATE_LIMIT_LOCKED = 'rate_limit_locked',
  RATE_LIMIT_UNLOCKED = 'rate_limit_unlocked',

  // Access Failures
  ACCESS_DENIED_NOT_FOUND = 'access_denied_not_found',
  ACCESS_DENIED_RATE_LIMITED = 'access_denied_rate_limited',
  ACCESS_DENIED_VALIDATION = 'access_denied_validation',

  // Admin Operations
  ADMIN_UNLOCK_ACCOUNT = 'admin_unlock_account',
  ADMIN_CLEANUP_EXPIRED = 'admin_cleanup_expired',

  // System Events
  VAULT_INITIALIZED = 'vault_initialized',
  VAULT_CLOSED = 'vault_closed',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit log entry
 */
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

/**
 * Audit log entry in database
 */
interface AuditLogRow {
  id: number;
  timestamp: number;
  event_type: string;
  severity: string;
  service: string | null;
  account: string | null;
  user_id: string | null;
  process_id: number;
  success: number; // SQLite boolean (0 or 1)
  details: string | null;
  ip_address: string | null;
}

/**
 * Audit log filter options
 */
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

/**
 * Audit statistics
 */
export interface AuditStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentEvents: AuditLogEntry[];
}

/**
 * Audit Logger with SQLite persistence
 */
export class AuditLogger {
  private db: Database.Database;
  private userId?: string;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private retentionDays: number;

  constructor(
    db: Database.Database,
    options?: {
      userId?: string;
      retentionDays?: number;
    }
  ) {
    this.db = db;
    this.userId = options?.userId;
    this.retentionDays = options?.retentionDays || 90; // Default 90 days retention

    this.initializeSchema();
    this.startCleanup();
  }

  /**
   * Initialize audit log table
   */
  private initializeSchema(): void {
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

  /**
   * Log an audit event
   */
  log(
    eventType: AuditEventType,
    options: {
      severity?: AuditSeverity;
      service?: string;
      account?: string;
      userId?: string;
      success?: boolean;
      details?: string;
      ipAddress?: string;
    } = {}
  ): void {
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
      .run(
        now,
        eventType,
        severity,
        options.service || null,
        options.account || null,
        userId || null,
        process.pid,
        options.success ?? true ? 1 : 0,
        options.details || null,
        options.ipAddress || null
      );

    logger.info(`Audit: ${eventType}`, {
      severity,
      service: options.service,
      account: options.account,
      success: options.success ?? true,
    });
  }

  /**
   * Infer severity from event type and success status
   */
  private inferSeverity(eventType: AuditEventType, success: boolean): AuditSeverity {
    // Critical events
    if (
      eventType === AuditEventType.RATE_LIMIT_LOCKED ||
      (eventType === AuditEventType.ACCESS_DENIED_RATE_LIMITED && !success)
    ) {
      return AuditSeverity.CRITICAL;
    }

    // Warning events
    if (
      eventType === AuditEventType.RATE_LIMIT_HIT ||
      eventType === AuditEventType.ACCESS_DENIED_NOT_FOUND ||
      eventType === AuditEventType.ACCESS_DENIED_VALIDATION
    ) {
      return AuditSeverity.WARNING;
    }

    // Error events (failed operations)
    if (!success) {
      return AuditSeverity.ERROR;
    }

    // Default to INFO
    return AuditSeverity.INFO;
  }

  /**
   * Get audit logs with filters
   */
  getLogs(filter: AuditLogFilter = {}): AuditLogEntry[] {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

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

    const rows = this.db.prepare(query).all(...params) as AuditLogRow[];

    return rows.map((row) => this.mapRowToEntry(row));
  }

  /**
   * Get audit statistics
   */
  getStats(filter: AuditLogFilter = {}): AuditStats {
    const logs = this.getLogs(filter);

    const totalEvents = logs.length;
    const successfulEvents = logs.filter((log) => log.success).length;
    const failedEvents = totalEvents - successfulEvents;

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

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

  /**
   * Export audit logs to JSON
   */
  exportLogs(filter: AuditLogFilter = {}): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Map database row to audit log entry
   */
  private mapRowToEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type as AuditEventType,
      severity: row.severity as AuditSeverity,
      service: row.service || undefined,
      account: row.account || undefined,
      userId: row.user_id || undefined,
      processId: row.process_id,
      success: row.success === 1,
      details: row.details || undefined,
      ipAddress: row.ip_address || undefined,
    };
  }

  /**
   * Start automatic cleanup of old logs
   */
  private startCleanup(): void {
    // Run cleanup daily
    this.cleanupTimer = setInterval(
      () => {
        this.cleanup();
      },
      24 * 60 * 60 * 1000
    ); // 24 hours
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clean up old audit logs
   */
  cleanup(): void {
    const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    const result = this.db
      .prepare('DELETE FROM audit_logs WHERE timestamp < ?')
      .run(cutoffDate);

    if (result.changes > 0) {
      logger.info(`Audit: Cleaned up ${result.changes} old logs (older than ${this.retentionDays} days)`);
    }
  }

  /**
   * Get retention configuration
   */
  getRetentionDays(): number {
    return this.retentionDays;
  }

  /**
   * Set retention configuration
   */
  setRetentionDays(days: number): void {
    if (days < 1) {
      throw new Error('Retention days must be at least 1');
    }
    this.retentionDays = days;
    logger.info(`Audit: Retention period set to ${days} days`);
  }
}
