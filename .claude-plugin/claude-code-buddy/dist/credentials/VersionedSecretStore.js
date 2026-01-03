import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { AuditEventType } from './AuditLogger.js';
import { validateServiceAndAccount } from './validation.js';
export class VersionedSecretStore {
    db;
    auditLogger;
    constructor(db, auditLogger) {
        this.db = db;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
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
    createVersion(service, account, value, createdBy, changeDescription, metadata) {
        validateServiceAndAccount(service, account);
        const valueHash = this.hashValue(value);
        const now = Date.now();
        const currentVersion = this.getActiveVersion(service, account);
        if (currentVersion && currentVersion.valueHash === valueHash) {
            logger.debug('Secret value unchanged, skipping version creation', {
                service,
                account,
                currentVersion: currentVersion.version,
            });
            return currentVersion;
        }
        const nextVersion = currentVersion ? currentVersion.version + 1 : 1;
        if (currentVersion) {
            this.db
                .prepare(`UPDATE secret_versions
           SET is_active = 0
           WHERE service = ? AND account = ? AND is_active = 1`)
                .run(service, account);
        }
        const result = this.db
            .prepare(`INSERT INTO secret_versions
         (service, account, version, value_hash, created_by_id, created_by_type,
          created_at, is_active, change_description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
            .run(service, account, nextVersion, valueHash, createdBy.id, createdBy.type, now, changeDescription || null, metadata ? JSON.stringify(metadata) : null);
        const version = {
            id: result.lastInsertRowid,
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
    getActiveVersion(service, account) {
        validateServiceAndAccount(service, account);
        const row = this.db
            .prepare(`SELECT * FROM secret_versions
         WHERE service = ? AND account = ? AND is_active = 1`)
            .get(service, account);
        return row ? this.rowToVersion(row) : null;
    }
    getVersion(service, account, version) {
        validateServiceAndAccount(service, account);
        const row = this.db
            .prepare(`SELECT * FROM secret_versions
         WHERE service = ? AND account = ? AND version = ?`)
            .get(service, account, version);
        return row ? this.rowToVersion(row) : null;
    }
    getVersionHistory(service, account) {
        validateServiceAndAccount(service, account);
        const rows = this.db
            .prepare(`SELECT * FROM secret_versions
         WHERE service = ? AND account = ?
         ORDER BY version DESC`)
            .all(service, account);
        return rows.map((row) => this.rowToVersion(row));
    }
    rollbackToVersion(service, account, targetVersion, rolledBackBy, reason) {
        validateServiceAndAccount(service, account);
        const targetVersionData = this.getVersion(service, account, targetVersion);
        if (!targetVersionData) {
            throw new Error(`Version ${targetVersion} not found for ${service}:${account}`);
        }
        this.db
            .prepare(`UPDATE secret_versions
         SET is_active = 0
         WHERE service = ? AND account = ? AND is_active = 1`)
            .run(service, account);
        this.db
            .prepare(`UPDATE secret_versions
         SET is_active = 1
         WHERE id = ?`)
            .run(targetVersionData.id);
        targetVersionData.isActive = true;
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
    compareVersions(service, account, fromVersion, toVersion) {
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
    deleteOldVersions(service, account, keepVersions = 10) {
        validateServiceAndAccount(service, account);
        if (keepVersions < 1) {
            throw new Error('Must keep at least 1 version');
        }
        const versionsToDelete = this.db
            .prepare(`SELECT id FROM secret_versions
         WHERE service = ? AND account = ? AND is_active = 0
         ORDER BY version DESC
         LIMIT -1 OFFSET ?`)
            .all(service, account, keepVersions - 1);
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
    deleteAllVersions(service, account) {
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
    getVersionCount(service, account) {
        validateServiceAndAccount(service, account);
        const row = this.db
            .prepare(`SELECT COUNT(*) as count FROM secret_versions
         WHERE service = ? AND account = ?`)
            .get(service, account);
        return row?.count || 0;
    }
    getStats() {
        const totalVersions = this.db
            .prepare('SELECT COUNT(*) as count FROM secret_versions')
            .get().count;
        const totalSecrets = this.db
            .prepare('SELECT COUNT(DISTINCT service || ":" || account) as count FROM secret_versions')
            .get().count;
        const oldestRow = this.db
            .prepare('SELECT MIN(created_at) as oldest FROM secret_versions')
            .get();
        const newestRow = this.db
            .prepare('SELECT MAX(created_at) as newest FROM secret_versions')
            .get();
        const mostVersionedRow = this.db
            .prepare(`SELECT service, account, COUNT(*) as version_count
         FROM secret_versions
         GROUP BY service, account
         ORDER BY version_count DESC
         LIMIT 1`)
            .get();
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
    cleanupOldVersions(olderThanDays = 90, keepMinVersions = 3) {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const secrets = this.db
            .prepare(`SELECT DISTINCT service, account FROM secret_versions`)
            .all();
        let totalDeleted = 0;
        for (const { service, account } of secrets) {
            const oldVersions = this.db
                .prepare(`SELECT id FROM secret_versions
           WHERE service = ? AND account = ?
             AND is_active = 0
             AND created_at < ?
           ORDER BY version DESC`)
                .all(service, account, cutoffTime);
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
    hashValue(value) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    rowToVersion(row) {
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
//# sourceMappingURL=VersionedSecretStore.js.map