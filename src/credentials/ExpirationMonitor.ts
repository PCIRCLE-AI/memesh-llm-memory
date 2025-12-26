/**
 * Credential Expiration Monitor
 *
 * Monitors credential expiration and provides warnings:
 * - Tracks credentials approaching expiration
 * - Configurable warning thresholds
 * - Expiration event logging
 * - Integration with rotation policy
 * - Expiration statistics and reporting
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { RotationPolicy } from './RotationPolicy.js';
import { AuditLogger, AuditEventType, AuditSeverity } from './AuditLogger.js';

/**
 * Expiration warning level
 */
export enum ExpirationWarningLevel {
  CRITICAL = 'critical', // < 1 day
  HIGH = 'high', // 1-3 days
  MEDIUM = 'medium', // 3-7 days
  LOW = 'low', // 7-14 days
  INFO = 'info', // 14-30 days
}

/**
 * Expiration status for a credential
 */
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

/**
 * Expiration warning
 */
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

/**
 * Expiration statistics
 */
export interface ExpirationStats {
  totalCredentials: number;
  expiredCredentials: number;
  expiringCritical: number; // < 1 day
  expiringHigh: number; // 1-3 days
  expiringMedium: number; // 3-7 days
  expiringLow: number; // 7-14 days
  expiringInfo: number; // 14-30 days
  healthyCredentials: number; // > 30 days or no policy
  averageDaysUntilExpiration: number;
  oldestCredential?: {
    service: string;
    account: string;
    daysUntilExpiration: number;
  };
}

/**
 * Expiration Monitor Service
 */
export class ExpirationMonitor {
  private db: Database.Database;
  private rotationPolicy: RotationPolicy;
  private auditLogger: AuditLogger;
  private monitorTimer: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(
    db: Database.Database,
    rotationPolicy: RotationPolicy,
    auditLogger: AuditLogger
  ) {
    this.db = db;
    this.rotationPolicy = rotationPolicy;
    this.auditLogger = auditLogger;
    this.initializeSchema();
  }

  /**
   * Initialize expiration monitor schema
   */
  private initializeSchema(): void {
    // Expiration warnings table
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

  /**
   * Get expiration status for a credential
   */
  getExpirationStatus(service: string, account: string): ExpirationStatus {
    const rotationStatus = this.rotationPolicy.checkRotationStatus(service, account);

    const warningLevel = this.calculateWarningLevel(rotationStatus.daysUntilExpiration);

    return {
      service,
      account,
      isExpired: rotationStatus.isExpired,
      daysUntilExpiration: rotationStatus.daysUntilExpiration,
      warningLevel,
      expiresAt: this.calculateExpirationDate(rotationStatus),
      createdAt: new Date(), // Will be populated from credential data
      lastRotated: rotationStatus.lastRotated,
      policyMaxAge: rotationStatus.policy?.maxAgeDays,
    };
  }

  /**
   * Calculate expiration date based on rotation status
   */
  private calculateExpirationDate(rotationStatus: any): Date | undefined {
    if (!rotationStatus.policy) {
      return undefined;
    }

    const baseDate = rotationStatus.lastRotated || new Date();
    const expirationMs = baseDate.getTime() + rotationStatus.policy.maxAgeDays * 24 * 60 * 60 * 1000;
    return new Date(expirationMs);
  }

  /**
   * Calculate warning level based on days until expiration
   */
  private calculateWarningLevel(daysUntilExpiration: number): ExpirationWarningLevel | null {
    if (daysUntilExpiration < 0) {
      return null; // Already expired
    }

    if (daysUntilExpiration < 1) {
      return ExpirationWarningLevel.CRITICAL;
    } else if (daysUntilExpiration < 3) {
      return ExpirationWarningLevel.HIGH;
    } else if (daysUntilExpiration < 7) {
      return ExpirationWarningLevel.MEDIUM;
    } else if (daysUntilExpiration < 14) {
      return ExpirationWarningLevel.LOW;
    } else if (daysUntilExpiration < 30) {
      return ExpirationWarningLevel.INFO;
    }

    return null; // > 30 days - no warning needed
  }

  /**
   * Scan all credentials and create/update expiration warnings
   */
  scanForExpirations(): ExpirationWarning[] {
    const credentialsNeedingRotation = this.rotationPolicy.listCredentialsNeedingRotation();
    const warnings: ExpirationWarning[] = [];

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

        // Log warning event
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

  /**
   * Map warning level to audit severity
   */
  private mapWarningLevelToSeverity(level: ExpirationWarningLevel): AuditSeverity {
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

  /**
   * Create or update expiration warning
   */
  private createOrUpdateWarning(warning: ExpirationWarning): ExpirationWarning {
    const now = Date.now();

    const existing = this.db
      .prepare(
        `SELECT * FROM expiration_warnings
         WHERE service = ? AND account = ? AND warning_level = ?`
      )
      .get(warning.service, warning.account, warning.warningLevel) as any;

    if (existing) {
      // Update existing warning
      this.db
        .prepare(
          `UPDATE expiration_warnings
           SET days_until_expiration = ?, expires_at = ?
           WHERE id = ?`
        )
        .run(warning.daysUntilExpiration, warning.expiresAt.getTime(), existing.id);

      return {
        ...warning,
        id: existing.id,
        notified: existing.notified === 1,
        notifiedAt: existing.notified_at ? new Date(existing.notified_at) : undefined,
        acknowledgedAt: existing.acknowledged_at ? new Date(existing.acknowledged_at) : undefined,
        createdAt: new Date(existing.created_at),
      };
    } else {
      // Create new warning
      const result = this.db
        .prepare(
          `INSERT INTO expiration_warnings (
            service, account, warning_level, days_until_expiration,
            expires_at, notified, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          warning.service,
          warning.account,
          warning.warningLevel,
          warning.daysUntilExpiration,
          warning.expiresAt.getTime(),
          0,
          now
        );

      return {
        ...warning,
        id: result.lastInsertRowid as number,
        notified: false,
        createdAt: new Date(now),
      };
    }
  }

  /**
   * Get all active warnings
   */
  getActiveWarnings(level?: ExpirationWarningLevel): ExpirationWarning[] {
    let query = `
      SELECT * FROM expiration_warnings
      WHERE expires_at >= ?
      ORDER BY expires_at ASC
    `;
    const params: any[] = [Date.now()];

    if (level) {
      query = `
        SELECT * FROM expiration_warnings
        WHERE expires_at >= ? AND warning_level = ?
        ORDER BY expires_at ASC
      `;
      params.push(level);
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map((row) => this.mapRowToWarning(row));
  }

  /**
   * Get unnotified warnings
   */
  getUnnotifiedWarnings(level?: ExpirationWarningLevel): ExpirationWarning[] {
    let query = `
      SELECT * FROM expiration_warnings
      WHERE notified = 0 AND expires_at >= ?
      ORDER BY expires_at ASC
    `;
    const params: any[] = [Date.now()];

    if (level) {
      query = `
        SELECT * FROM expiration_warnings
        WHERE notified = 0 AND expires_at >= ? AND warning_level = ?
        ORDER BY expires_at ASC
      `;
      params.push(level);
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map((row) => this.mapRowToWarning(row));
  }

  /**
   * Mark warning as notified
   */
  markAsNotified(warningId: number): void {
    const now = Date.now();

    const result = this.db
      .prepare(
        `UPDATE expiration_warnings
         SET notified = 1, notified_at = ?
         WHERE id = ?`
      )
      .run(now, warningId);

    if (result.changes === 0) {
      throw new Error(`Warning not found: ${warningId}`);
    }

    logger.info('Warning marked as notified', { warningId });
  }

  /**
   * Acknowledge a warning
   */
  acknowledgeWarning(warningId: number): void {
    const now = Date.now();

    const result = this.db
      .prepare(
        `UPDATE expiration_warnings
         SET acknowledged_at = ?
         WHERE id = ?`
      )
      .run(now, warningId);

    if (result.changes === 0) {
      throw new Error(`Warning not found: ${warningId}`);
    }

    logger.info('Warning acknowledged', { warningId });
  }

  /**
   * Get expiration statistics
   */
  getStats(): ExpirationStats {
    const credentialsNeedingRotation = this.rotationPolicy.listCredentialsNeedingRotation();
    const rotationStats = this.rotationPolicy.getRotationStats();

    const stats: ExpirationStats = {
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
    let minCredential: { service: string; account: string; daysUntilExpiration: number } | undefined;

    for (const cred of credentialsNeedingRotation) {
      const status = this.getExpirationStatus(cred.service, cred.account);

      if (status.isExpired) {
        stats.expiredCredentials++;
      } else if (status.warningLevel) {
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

    const expiringCount =
      stats.expiringCritical +
      stats.expiringHigh +
      stats.expiringMedium +
      stats.expiringLow +
      stats.expiringInfo;

    stats.averageDaysUntilExpiration = expiringCount > 0 ? totalDays / expiringCount : 0;
    stats.oldestCredential = minCredential;

    return stats;
  }

  /**
   * Start automated expiration monitoring
   */
  startMonitoring(intervalMinutes: number = 60): void {
    if (this.monitorTimer) {
      logger.warn('Expiration monitor already running');
      return;
    }

    this.isMonitoring = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.monitorTimer = setInterval(() => {
      this.scanForExpirations();
    }, intervalMs);

    // Run immediately on start
    this.scanForExpirations();

    logger.info('Expiration monitoring started', { intervalMinutes });
  }

  /**
   * Stop automated expiration monitoring
   */
  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
      this.isMonitoring = false;
      logger.info('Expiration monitoring stopped');
    }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Clean up old warnings
   */
  cleanupOldWarnings(olderThanDays: number = 30): number {
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

  /**
   * Map database row to ExpirationWarning
   */
  private mapRowToWarning(row: any): ExpirationWarning {
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
