/**
 * Versioned Secret Store - Secret Version Management
 *
 * Provides secret versioning with:
 * - Automatic version tracking
 * - Version history and diffs
 * - Rollback to previous versions
 * - Version retention policies
 * - Change auditing
 */

import type Database from 'better-sqlite3';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import type { Identity } from './AccessControl.js';
import { AuditLogger, AuditEventType } from './AuditLogger.js';
import { validateServiceAndAccount } from './validation.js';

/**
 * Secret version metadata
 */
export interface SecretVersion {
  /**
   * Version ID
   */
  id?: number;

  /**
   * Service name
   */
  service: string;

  /**
   * Account name
   */
  account: string;

  /**
   * Version number (starts at 1, increments)
   */
  version: number;

  /**
   * Hash of the secret value (for change detection)
   */
  valueHash: string;

  /**
   * Who created this version
   */
  createdBy: Identity;

  /**
   * When this version was created
   */
  createdAt: Date;

  /**
   * Is this the active version
   */
  isActive: boolean;

  /**
   * Change description
   */
  changeDescription?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Version comparison result
 */
export interface VersionDiff {
  service: string;
  account: string;
  fromVersion: number;
  toVersion: number;
  valuesMatch: boolean;
  timeDifference: number;
  changeDescription?: string;
}

/**
 * Version statistics
 */
export interface VersionStats {
  totalVersions: number;
  totalSecrets: number;
  averageVersionsPerSecret: number;
  oldestVersion: Date | null;
  newestVersion: Date | null;
  mostVersionedSecret: {
    service: string;
    account: string;
    versionCount: number;
  } | null;
}

/**
 * Versioned Secret Store
 */
export class VersionedSecretStore {
  private db: Database.Database;
  private auditLogger: AuditLogger;

  constructor(db: Database.Database, auditLogger: AuditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS secret_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        version INTEGER NOT NULL,
        value_hash TEXT NOT NULL,
        created_by_id TEXT NOT NULL,
        created_by_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        change_description TEXT,
        metadata TEXT,
        UNIQUE(service, account, version)
      );

      CREATE INDEX IF NOT EXISTS idx_secret_versions_lookup
        ON secret_versions(service, account, is_active);

      CREATE INDEX IF NOT EXISTS idx_secret_versions_created_at
        ON secret_versions(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_secret_versions_active
        ON secret_versions(is_active) WHERE is_active = 1;
    `);

    logger.info('Versioned secret store initialized');
  }

  /**
   * Create a new version of a secret
   */
  createVersion(
    service: string,
    account: string,
    value: any,
    createdBy: Identity,
    changeDescription?: string,
    metadata?: Record<string, any>
  ): SecretVersion {
    validateServiceAndAccount(service, account);

    const valueHash = this.hashValue(value);
    const now = Date.now();

    // Get current active version
    const currentVersion = this.getActiveVersion(service, account);

    // Check if value actually changed
    if (currentVersion && currentVersion.valueHash === valueHash) {
      logger.debug('Secret value unchanged, skipping version creation', {
        service,
        account,
        currentVersion: currentVersion.version,
      });
      return currentVersion;
    }

    // Get next version number
    const nextVersion = currentVersion ? currentVersion.version + 1 : 1;

    // Deactivate current version
    if (currentVersion) {
      this.db
        .prepare(
          `UPDATE secret_versions
           SET is_active = 0
           WHERE service = ? AND account = ? AND is_active = 1`
        )
        .run(service, account);
    }

    // Create new version
    const result = this.db
      .prepare(
        `INSERT INTO secret_versions
         (service, account, version, value_hash, created_by_id, created_by_type,
          created_at, is_active, change_description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        service,
        account,
        nextVersion,
        valueHash,
        createdBy.id,
        createdBy.type,
        now,
        changeDescription || null,
        metadata ? JSON.stringify(metadata) : null
      );

    const version: SecretVersion = {
      id: result.lastInsertRowid as number,
      service,
      account,
      version: nextVersion,
      valueHash,
      createdBy,
      createdAt: new Date(now),
      isActive: true,
      changeDescription,
      metadata,
    };

    // Audit log
    this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
      service,
      account,
      success: true,
      details: JSON.stringify({
        version: nextVersion,
        previousVersion: currentVersion?.version,
        createdBy: `${createdBy.type}:${createdBy.id}`,
        changeDescription,
      }),
    });

    logger.info('Secret version created', {
      service,
      account,
      version: nextVersion,
      previousVersion: currentVersion?.version,
    });

    return version;
  }

  /**
   * Get active version for a secret
   */
  getActiveVersion(service: string, account: string): SecretVersion | null {
    validateServiceAndAccount(service, account);

    const row = this.db
      .prepare(
        `SELECT * FROM secret_versions
         WHERE service = ? AND account = ? AND is_active = 1`
      )
      .get(service, account) as any;

    return row ? this.rowToVersion(row) : null;
  }

  /**
   * Get specific version
   */
  getVersion(service: string, account: string, version: number): SecretVersion | null {
    validateServiceAndAccount(service, account);

    const row = this.db
      .prepare(
        `SELECT * FROM secret_versions
         WHERE service = ? AND account = ? AND version = ?`
      )
      .get(service, account, version) as any;

    return row ? this.rowToVersion(row) : null;
  }

  /**
   * Get all versions for a secret
   */
  getVersionHistory(service: string, account: string): SecretVersion[] {
    validateServiceAndAccount(service, account);

    const rows = this.db
      .prepare(
        `SELECT * FROM secret_versions
         WHERE service = ? AND account = ?
         ORDER BY version DESC`
      )
      .all(service, account) as any[];

    return rows.map((row) => this.rowToVersion(row));
  }

  /**
   * Rollback to a previous version
   */
  rollbackToVersion(
    service: string,
    account: string,
    targetVersion: number,
    rolledBackBy: Identity,
    reason?: string
  ): SecretVersion {
    validateServiceAndAccount(service, account);

    // Get target version
    const targetVersionData = this.getVersion(service, account, targetVersion);
    if (!targetVersionData) {
      throw new Error(`Version ${targetVersion} not found for ${service}:${account}`);
    }

    // Deactivate current version
    this.db
      .prepare(
        `UPDATE secret_versions
         SET is_active = 0
         WHERE service = ? AND account = ? AND is_active = 1`
      )
      .run(service, account);

    // Activate target version
    this.db
      .prepare(
        `UPDATE secret_versions
         SET is_active = 1
         WHERE id = ?`
      )
      .run(targetVersionData.id);

    targetVersionData.isActive = true;

    // Audit log
    this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
      service,
      account,
      success: true,
      details: JSON.stringify({
        action: 'rollback',
        targetVersion,
        rolledBackBy: `${rolledBackBy.type}:${rolledBackBy.id}`,
        reason,
      }),
    });

    logger.info('Secret rolled back to previous version', {
      service,
      account,
      targetVersion,
      reason,
    });

    return targetVersionData;
  }

  /**
   * Compare two versions
   */
  compareVersions(
    service: string,
    account: string,
    fromVersion: number,
    toVersion: number
  ): VersionDiff {
    validateServiceAndAccount(service, account);

    const from = this.getVersion(service, account, fromVersion);
    const to = this.getVersion(service, account, toVersion);

    if (!from) {
      throw new Error(`Version ${fromVersion} not found for ${service}:${account}`);
    }
    if (!to) {
      throw new Error(`Version ${toVersion} not found for ${service}:${account}`);
    }

    return {
      service,
      account,
      fromVersion,
      toVersion,
      valuesMatch: from.valueHash === to.valueHash,
      timeDifference: to.createdAt.getTime() - from.createdAt.getTime(),
      changeDescription: to.changeDescription,
    };
  }

  /**
   * Delete old versions (retention policy)
   */
  deleteOldVersions(
    service: string,
    account: string,
    keepVersions: number = 10
  ): number {
    validateServiceAndAccount(service, account);

    if (keepVersions < 1) {
      throw new Error('Must keep at least 1 version');
    }

    // Get versions to delete (excluding active version)
    const versionsToDelete = this.db
      .prepare(
        `SELECT id FROM secret_versions
         WHERE service = ? AND account = ? AND is_active = 0
         ORDER BY version DESC
         LIMIT -1 OFFSET ?`
      )
      .all(service, account, keepVersions - 1) as any[];

    if (versionsToDelete.length === 0) {
      return 0;
    }

    const ids = versionsToDelete.map((v) => v.id);
    const placeholders = ids.map(() => '?').join(',');

    const result = this.db
      .prepare(`DELETE FROM secret_versions WHERE id IN (${placeholders})`)
      .run(...ids);

    logger.info('Old secret versions deleted', {
      service,
      account,
      deletedCount: result.changes,
      keptVersions: keepVersions,
    });

    return result.changes || 0;
  }

  /**
   * Delete all versions for a secret
   */
  deleteAllVersions(service: string, account: string): number {
    validateServiceAndAccount(service, account);

    const result = this.db
      .prepare('DELETE FROM secret_versions WHERE service = ? AND account = ?')
      .run(service, account);

    logger.info('All secret versions deleted', {
      service,
      account,
      deletedCount: result.changes,
    });

    return result.changes || 0;
  }

  /**
   * Get version count for a secret
   */
  getVersionCount(service: string, account: string): number {
    validateServiceAndAccount(service, account);

    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM secret_versions
         WHERE service = ? AND account = ?`
      )
      .get(service, account) as any;

    return row?.count || 0;
  }

  /**
   * Get statistics
   */
  getStats(): VersionStats {
    const totalVersions = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM secret_versions')
        .get() as any
    ).count;

    const totalSecrets = (
      this.db
        .prepare(
          'SELECT COUNT(DISTINCT service || ":" || account) as count FROM secret_versions'
        )
        .get() as any
    ).count;

    const oldestRow = this.db
      .prepare('SELECT MIN(created_at) as oldest FROM secret_versions')
      .get() as any;

    const newestRow = this.db
      .prepare('SELECT MAX(created_at) as newest FROM secret_versions')
      .get() as any;

    const mostVersionedRow = this.db
      .prepare(
        `SELECT service, account, COUNT(*) as version_count
         FROM secret_versions
         GROUP BY service, account
         ORDER BY version_count DESC
         LIMIT 1`
      )
      .get() as any;

    return {
      totalVersions,
      totalSecrets,
      averageVersionsPerSecret: totalSecrets > 0 ? totalVersions / totalSecrets : 0,
      oldestVersion: oldestRow?.oldest ? new Date(oldestRow.oldest) : null,
      newestVersion: newestRow?.newest ? new Date(newestRow.newest) : null,
      mostVersionedSecret: mostVersionedRow
        ? {
            service: mostVersionedRow.service,
            account: mostVersionedRow.account,
            versionCount: mostVersionedRow.version_count,
          }
        : null,
    };
  }

  /**
   * Clean up versions older than specified days
   */
  cleanupOldVersions(olderThanDays: number = 90, keepMinVersions: number = 3): number {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    // Get all secrets
    const secrets = this.db
      .prepare(
        `SELECT DISTINCT service, account FROM secret_versions`
      )
      .all() as any[];

    let totalDeleted = 0;

    for (const { service, account } of secrets) {
      // Get versions older than cutoff (excluding active)
      const oldVersions = this.db
        .prepare(
          `SELECT id FROM secret_versions
           WHERE service = ? AND account = ?
             AND is_active = 0
             AND created_at < ?
           ORDER BY version DESC`
        )
        .all(service, account, cutoffTime) as any[];

      // Keep minimum number of versions
      const toDelete = oldVersions.slice(keepMinVersions);

      if (toDelete.length > 0) {
        const ids = toDelete.map((v) => v.id);
        const placeholders = ids.map(() => '?').join(',');

        const result = this.db
          .prepare(`DELETE FROM secret_versions WHERE id IN (${placeholders})`)
          .run(...ids);

        totalDeleted += result.changes || 0;
      }
    }

    logger.info('Cleaned up old secret versions', {
      olderThanDays,
      keepMinVersions,
      deletedCount: totalDeleted,
    });

    return totalDeleted;
  }

  /**
   * Hash secret value for comparison
   */
  private hashValue(value: any): string {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Convert database row to SecretVersion
   */
  private rowToVersion(row: any): SecretVersion {
    return {
      id: row.id,
      service: row.service,
      account: row.account,
      version: row.version,
      valueHash: row.value_hash,
      createdBy: {
        id: row.created_by_id,
        type: row.created_by_type,
      },
      createdAt: new Date(row.created_at),
      isActive: row.is_active === 1,
      changeDescription: row.change_description || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
