import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { AuditEventType } from './AuditLogger.js';
import { validateServiceAndAccount } from './validation.js';
export var SharePermission;
(function (SharePermission) {
    SharePermission["READ"] = "read";
    SharePermission["READ_ROTATE"] = "read_rotate";
    SharePermission["READ_ROTATE_SHARE"] = "read_rotate_share";
    SharePermission["FULL"] = "full";
})(SharePermission || (SharePermission = {}));
export var ShareStatus;
(function (ShareStatus) {
    ShareStatus["ACTIVE"] = "active";
    ShareStatus["EXPIRED"] = "expired";
    ShareStatus["REVOKED"] = "revoked";
    ShareStatus["PENDING"] = "pending";
})(ShareStatus || (ShareStatus = {}));
export class SharingService {
    db;
    auditLogger;
    constructor(db, auditLogger) {
        this.db = db;
        this.auditLogger = auditLogger;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS credential_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        shared_by_id TEXT NOT NULL,
        shared_by_type TEXT NOT NULL,
        shared_with_id TEXT NOT NULL,
        shared_with_type TEXT NOT NULL,
        permission TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        revoked_at INTEGER,
        revoked_by_id TEXT,
        revoked_by_type TEXT,
        access_token TEXT UNIQUE,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_shares_service_account
        ON credential_shares(service, account);
      CREATE INDEX IF NOT EXISTS idx_shares_shared_with
        ON credential_shares(shared_with_id, shared_with_type);
      CREATE INDEX IF NOT EXISTS idx_shares_status
        ON credential_shares(status);
      CREATE INDEX IF NOT EXISTS idx_shares_access_token
        ON credential_shares(access_token);
      CREATE INDEX IF NOT EXISTS idx_shares_expires_at
        ON credential_shares(expires_at);
    `);
        logger.info('Sharing service schema initialized');
    }
    createShare(service, account, sharedBy, sharedWith, permission, options) {
        validateServiceAndAccount(service, account);
        const now = Date.now();
        const expiresAt = options?.expiresIn ? now + options.expiresIn : null;
        const accessToken = options?.generateToken ? this.generateAccessToken() : null;
        const result = this.db
            .prepare(`INSERT INTO credential_shares
         (service, account, shared_by_id, shared_by_type, shared_with_id, shared_with_type,
          permission, status, expires_at, created_at, access_token, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(service, account, sharedBy.id, sharedBy.type, sharedWith.id, sharedWith.type, permission, ShareStatus.ACTIVE, expiresAt, now, accessToken, options?.metadata ? JSON.stringify(options.metadata) : null);
        const share = {
            id: result.lastInsertRowid,
            service,
            account,
            sharedBy,
            sharedWith,
            permission,
            status: ShareStatus.ACTIVE,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdAt: new Date(now),
            accessToken: accessToken || undefined,
            metadata: options?.metadata,
        };
        this.auditLogger.log(AuditEventType.ACCESS_GRANTED, {
            service,
            account,
            success: true,
            details: JSON.stringify({
                shareId: share.id,
                sharedBy: `${sharedBy.type}:${sharedBy.id}`,
                sharedWith: `${sharedWith.type}:${sharedWith.id}`,
                permission,
                expiresAt: share.expiresAt?.toISOString(),
            }),
        });
        logger.info('Credential shared', {
            shareId: share.id,
            service,
            account,
            sharedBy: `${sharedBy.type}:${sharedBy.id}`,
            sharedWith: `${sharedWith.type}:${sharedWith.id}`,
            permission,
        });
        return share;
    }
    generateAccessToken() {
        return crypto.randomBytes(32).toString('base64url');
    }
    revokeShare(shareId, revokedBy) {
        const now = Date.now();
        const result = this.db
            .prepare(`UPDATE credential_shares
         SET status = ?, revoked_at = ?, revoked_by_id = ?, revoked_by_type = ?
         WHERE id = ? AND status = ?`)
            .run(ShareStatus.REVOKED, now, revokedBy.id, revokedBy.type, shareId, ShareStatus.ACTIVE);
        if (result.changes === 0) {
            throw new Error(`Share not found or already revoked: ${shareId}`);
        }
        const share = this.getShare(shareId);
        if (share) {
            this.auditLogger.log(AuditEventType.ACCESS_REVOKED, {
                service: share.service,
                account: share.account,
                success: true,
                details: JSON.stringify({
                    shareId,
                    revokedBy: `${revokedBy.type}:${revokedBy.id}`,
                }),
            });
        }
        logger.info('Share revoked', { shareId, revokedBy: `${revokedBy.type}:${revokedBy.id}` });
    }
    getShare(shareId) {
        const row = this.db
            .prepare('SELECT * FROM credential_shares WHERE id = ?')
            .get(shareId);
        if (!row) {
            return null;
        }
        return this.mapRowToShare(row);
    }
    getShareByToken(token) {
        const row = this.db
            .prepare('SELECT * FROM credential_shares WHERE access_token = ?')
            .get(token);
        if (!row) {
            return null;
        }
        const share = this.mapRowToShare(row);
        if (share.status === ShareStatus.ACTIVE && share.expiresAt) {
            if (share.expiresAt.getTime() < Date.now()) {
                this.expireShare(share.id);
                share.status = ShareStatus.EXPIRED;
            }
        }
        return share;
    }
    getSharesForCredential(service, account) {
        const rows = this.db
            .prepare(`SELECT * FROM credential_shares
         WHERE service = ? AND account = ?
         ORDER BY created_at DESC`)
            .all(service, account);
        return rows.map((row) => this.mapRowToShare(row));
    }
    getSharesGrantedTo(identity, activeOnly = true) {
        let query = `
      SELECT * FROM credential_shares
      WHERE shared_with_id = ? AND shared_with_type = ?
    `;
        if (activeOnly) {
            query += ` AND status = '${ShareStatus.ACTIVE}'`;
        }
        query += ` ORDER BY created_at DESC`;
        const rows = this.db.prepare(query).all(identity.id, identity.type);
        return rows.map((row) => this.mapRowToShare(row));
    }
    getSharesCreatedBy(identity, activeOnly = true) {
        let query = `
      SELECT * FROM credential_shares
      WHERE shared_by_id = ? AND shared_by_type = ?
    `;
        if (activeOnly) {
            query += ` AND status = '${ShareStatus.ACTIVE}'`;
        }
        query += ` ORDER BY created_at DESC`;
        const rows = this.db.prepare(query).all(identity.id, identity.type);
        return rows.map((row) => this.mapRowToShare(row));
    }
    hasAccess(service, account, identity) {
        const row = this.db
            .prepare(`SELECT permission, expires_at FROM credential_shares
         WHERE service = ? AND account = ?
           AND shared_with_id = ? AND shared_with_type = ?
           AND status = ?
         ORDER BY created_at DESC
         LIMIT 1`)
            .get(service, account, identity.id, identity.type, ShareStatus.ACTIVE);
        if (!row) {
            return null;
        }
        if (row.expires_at && row.expires_at < Date.now()) {
            return null;
        }
        return row.permission;
    }
    expireShares() {
        const now = Date.now();
        const result = this.db
            .prepare(`UPDATE credential_shares
         SET status = ?
         WHERE status = ? AND expires_at IS NOT NULL AND expires_at < ?`)
            .run(ShareStatus.EXPIRED, ShareStatus.ACTIVE, now);
        if (result.changes > 0) {
            logger.info('Expired shares updated', { count: result.changes });
        }
        return result.changes;
    }
    expireShare(shareId) {
        this.db
            .prepare('UPDATE credential_shares SET status = ? WHERE id = ?')
            .run(ShareStatus.EXPIRED, shareId);
    }
    revokeAllShares(service, account, revokedBy) {
        const now = Date.now();
        const result = this.db
            .prepare(`UPDATE credential_shares
         SET status = ?, revoked_at = ?, revoked_by_id = ?, revoked_by_type = ?
         WHERE service = ? AND account = ? AND status = ?`)
            .run(ShareStatus.REVOKED, now, revokedBy.id, revokedBy.type, service, account, ShareStatus.ACTIVE);
        this.auditLogger.log(AuditEventType.ACCESS_REVOKED, {
            service,
            account,
            success: true,
            details: JSON.stringify({
                revokedCount: result.changes,
                revokedBy: `${revokedBy.type}:${revokedBy.id}`,
            }),
        });
        logger.info('All shares revoked for credential', {
            service,
            account,
            count: result.changes,
        });
        return result.changes;
    }
    createAccessToken(service, account, grantedBy, grantedTo, permission, expiresIn) {
        const share = this.createShare(service, account, grantedBy, grantedTo, permission, {
            expiresIn,
            generateToken: true,
        });
        return {
            token: share.accessToken,
            service,
            account,
            grantedTo,
            permission,
            expiresAt: share.expiresAt,
            createdAt: share.createdAt,
        };
    }
    validateAccessToken(token) {
        const share = this.getShareByToken(token);
        if (!share || share.status !== ShareStatus.ACTIVE) {
            return null;
        }
        if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
            this.expireShare(share.id);
            return null;
        }
        return share;
    }
    getStats() {
        const totalShares = this.db.prepare('SELECT COUNT(*) as count FROM credential_shares').get().count;
        const activeShares = this.db
            .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
            .get(ShareStatus.ACTIVE).count;
        const expiredShares = this.db
            .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
            .get(ShareStatus.EXPIRED).count;
        const revokedShares = this.db
            .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
            .get(ShareStatus.REVOKED).count;
        const today = Date.now() - 24 * 60 * 60 * 1000;
        const sharesCreatedToday = this.db
            .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE created_at > ?')
            .get(today).count;
        const sharesRevokedToday = this.db
            .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE revoked_at IS NOT NULL AND revoked_at > ?')
            .get(today).count;
        const mostShared = this.db
            .prepare(`SELECT service, account, COUNT(*) as share_count
         FROM credential_shares
         GROUP BY service, account
         ORDER BY share_count DESC
         LIMIT 5`)
            .all();
        return {
            totalShares,
            activeShares,
            expiredShares,
            revokedShares,
            sharesCreatedToday,
            sharesRevokedToday,
            mostSharedCredentials: mostShared.map((row) => ({
                service: row.service,
                account: row.account,
                shareCount: row.share_count,
            })),
        };
    }
    cleanupOldShares(olderThanDays = 90) {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const result = this.db
            .prepare(`DELETE FROM credential_shares
         WHERE (status = ? OR status = ?)
           AND (revoked_at < ? OR (expires_at IS NOT NULL AND expires_at < ?))`)
            .run(ShareStatus.REVOKED, ShareStatus.EXPIRED, cutoffTime, cutoffTime);
        logger.info('Old shares cleaned up', {
            deletedRecords: result.changes,
            olderThanDays,
        });
        return result.changes;
    }
    mapRowToShare(row) {
        return {
            id: row.id,
            service: row.service,
            account: row.account,
            sharedBy: {
                id: row.shared_by_id,
                type: row.shared_by_type,
            },
            sharedWith: {
                id: row.shared_with_id,
                type: row.shared_with_type,
            },
            permission: row.permission,
            status: row.status,
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
            createdAt: new Date(row.created_at),
            revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
            revokedBy: row.revoked_by_id
                ? {
                    id: row.revoked_by_id,
                    type: row.revoked_by_type,
                }
                : undefined,
            accessToken: row.access_token,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }
}
//# sourceMappingURL=SharingService.js.map