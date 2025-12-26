/**
 * Credential Sharing Service
 *
 * Provides secure credential sharing capabilities:
 * - Share credentials with specific users/processes/services
 * - Temporary access tokens with expiration
 * - Fine-grained permission control
 * - Share revocation and expiration
 * - Audit trail for all sharing activities
 * - Share delegation (re-sharing with restrictions)
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { AuditLogger, AuditEventType, AuditSeverity } from './AuditLogger.js';
import type { Identity } from './AccessControl.js';
import { validateServiceAndAccount } from './validation.js';

/**
 * Share permission level
 */
export enum SharePermission {
  /**
   * Can only read the credential value
   */
  READ = 'read',

  /**
   * Can read and rotate the credential
   */
  READ_ROTATE = 'read_rotate',

  /**
   * Can read, rotate, and share with others
   */
  READ_ROTATE_SHARE = 'read_rotate_share',

  /**
   * Full control (including deletion)
   */
  FULL = 'full',
}

/**
 * Share status
 */
export enum ShareStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending',
}

/**
 * Credential share
 */
export interface CredentialShare {
  id?: number;
  service: string;
  account: string;
  sharedBy: Identity;
  sharedWith: Identity;
  permission: SharePermission;
  status: ShareStatus;
  expiresAt?: Date;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: Identity;
  accessToken?: string;
  metadata?: Record<string, any>;
}

/**
 * Temporary access token
 */
export interface AccessToken {
  token: string;
  service: string;
  account: string;
  grantedTo: Identity;
  permission: SharePermission;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Share statistics
 */
export interface SharingStats {
  totalShares: number;
  activeShares: number;
  expiredShares: number;
  revokedShares: number;
  sharesCreatedToday: number;
  sharesRevokedToday: number;
  mostSharedCredentials: Array<{
    service: string;
    account: string;
    shareCount: number;
  }>;
}

/**
 * Credential Sharing Service
 */
export class SharingService {
  private db: Database.Database;
  private auditLogger: AuditLogger;

  constructor(db: Database.Database, auditLogger: AuditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
    this.initializeSchema();
  }

  /**
   * Initialize sharing service schema
   */
  private initializeSchema(): void {
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

  /**
   * Share a credential with another identity
   */
  createShare(
    service: string,
    account: string,
    sharedBy: Identity,
    sharedWith: Identity,
    permission: SharePermission,
    options?: {
      expiresIn?: number; // Milliseconds
      generateToken?: boolean;
      metadata?: Record<string, any>;
    }
  ): CredentialShare {
    validateServiceAndAccount(service, account);

    const now = Date.now();
    const expiresAt = options?.expiresIn ? now + options.expiresIn : null;
    const accessToken = options?.generateToken ? this.generateAccessToken() : null;

    const result = this.db
      .prepare(
        `INSERT INTO credential_shares
         (service, account, shared_by_id, shared_by_type, shared_with_id, shared_with_type,
          permission, status, expires_at, created_at, access_token, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        service,
        account,
        sharedBy.id,
        sharedBy.type,
        sharedWith.id,
        sharedWith.type,
        permission,
        ShareStatus.ACTIVE,
        expiresAt,
        now,
        accessToken,
        options?.metadata ? JSON.stringify(options.metadata) : null
      );

    const share: CredentialShare = {
      id: result.lastInsertRowid as number,
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

  /**
   * Generate cryptographically secure access token
   */
  private generateAccessToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Revoke a share
   */
  revokeShare(shareId: number, revokedBy: Identity): void {
    const now = Date.now();

    const result = this.db
      .prepare(
        `UPDATE credential_shares
         SET status = ?, revoked_at = ?, revoked_by_id = ?, revoked_by_type = ?
         WHERE id = ? AND status = ?`
      )
      .run(ShareStatus.REVOKED, now, revokedBy.id, revokedBy.type, shareId, ShareStatus.ACTIVE);

    if (result.changes === 0) {
      throw new Error(`Share not found or already revoked: ${shareId}`);
    }

    // Get share details for audit log
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

  /**
   * Get share by ID
   */
  getShare(shareId: number): CredentialShare | null {
    const row = this.db
      .prepare('SELECT * FROM credential_shares WHERE id = ?')
      .get(shareId) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToShare(row);
  }

  /**
   * Get share by access token
   */
  getShareByToken(token: string): CredentialShare | null {
    const row = this.db
      .prepare('SELECT * FROM credential_shares WHERE access_token = ?')
      .get(token) as any;

    if (!row) {
      return null;
    }

    const share = this.mapRowToShare(row);

    // Check if expired
    if (share.status === ShareStatus.ACTIVE && share.expiresAt) {
      if (share.expiresAt.getTime() < Date.now()) {
        this.expireShare(share.id!);
        share.status = ShareStatus.EXPIRED;
      }
    }

    return share;
  }

  /**
   * Get all shares for a credential
   */
  getSharesForCredential(service: string, account: string): CredentialShare[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM credential_shares
         WHERE service = ? AND account = ?
         ORDER BY created_at DESC`
      )
      .all(service, account) as any[];

    return rows.map((row) => this.mapRowToShare(row));
  }

  /**
   * Get all shares granted to an identity
   */
  getSharesGrantedTo(identity: Identity, activeOnly: boolean = true): CredentialShare[] {
    let query = `
      SELECT * FROM credential_shares
      WHERE shared_with_id = ? AND shared_with_type = ?
    `;

    if (activeOnly) {
      query += ` AND status = '${ShareStatus.ACTIVE}'`;
    }

    query += ` ORDER BY created_at DESC`;

    const rows = this.db.prepare(query).all(identity.id, identity.type) as any[];

    return rows.map((row) => this.mapRowToShare(row));
  }

  /**
   * Get all shares created by an identity
   */
  getSharesCreatedBy(identity: Identity, activeOnly: boolean = true): CredentialShare[] {
    let query = `
      SELECT * FROM credential_shares
      WHERE shared_by_id = ? AND shared_by_type = ?
    `;

    if (activeOnly) {
      query += ` AND status = '${ShareStatus.ACTIVE}'`;
    }

    query += ` ORDER BY created_at DESC`;

    const rows = this.db.prepare(query).all(identity.id, identity.type) as any[];

    return rows.map((row) => this.mapRowToShare(row));
  }

  /**
   * Check if identity has access to a credential via sharing
   */
  hasAccess(service: string, account: string, identity: Identity): SharePermission | null {
    const row = this.db
      .prepare(
        `SELECT permission, expires_at FROM credential_shares
         WHERE service = ? AND account = ?
           AND shared_with_id = ? AND shared_with_type = ?
           AND status = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(service, account, identity.id, identity.type, ShareStatus.ACTIVE) as any;

    if (!row) {
      return null;
    }

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      return null;
    }

    return row.permission as SharePermission;
  }

  /**
   * Expire shares that have passed their expiration time
   */
  expireShares(): number {
    const now = Date.now();

    const result = this.db
      .prepare(
        `UPDATE credential_shares
         SET status = ?
         WHERE status = ? AND expires_at IS NOT NULL AND expires_at < ?`
      )
      .run(ShareStatus.EXPIRED, ShareStatus.ACTIVE, now);

    if (result.changes > 0) {
      logger.info('Expired shares updated', { count: result.changes });
    }

    return result.changes;
  }

  /**
   * Manually expire a share
   */
  private expireShare(shareId: number): void {
    this.db
      .prepare('UPDATE credential_shares SET status = ? WHERE id = ?')
      .run(ShareStatus.EXPIRED, shareId);
  }

  /**
   * Revoke all shares for a credential
   */
  revokeAllShares(service: string, account: string, revokedBy: Identity): number {
    const now = Date.now();

    const result = this.db
      .prepare(
        `UPDATE credential_shares
         SET status = ?, revoked_at = ?, revoked_by_id = ?, revoked_by_type = ?
         WHERE service = ? AND account = ? AND status = ?`
      )
      .run(
        ShareStatus.REVOKED,
        now,
        revokedBy.id,
        revokedBy.type,
        service,
        account,
        ShareStatus.ACTIVE
      );

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

  /**
   * Create temporary access token
   */
  createAccessToken(
    service: string,
    account: string,
    grantedBy: Identity,
    grantedTo: Identity,
    permission: SharePermission,
    expiresIn: number // Milliseconds
  ): AccessToken {
    const share = this.createShare(service, account, grantedBy, grantedTo, permission, {
      expiresIn,
      generateToken: true,
    });

    return {
      token: share.accessToken!,
      service,
      account,
      grantedTo,
      permission,
      expiresAt: share.expiresAt!,
      createdAt: share.createdAt,
    };
  }

  /**
   * Validate access token and return share
   */
  validateAccessToken(token: string): CredentialShare | null {
    const share = this.getShareByToken(token);

    if (!share || share.status !== ShareStatus.ACTIVE) {
      return null;
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      this.expireShare(share.id!);
      return null;
    }

    return share;
  }

  /**
   * Get sharing statistics
   */
  getStats(): SharingStats {
    const totalShares = (
      this.db.prepare('SELECT COUNT(*) as count FROM credential_shares').get() as {
        count: number;
      }
    ).count;

    const activeShares = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
        .get(ShareStatus.ACTIVE) as { count: number }
    ).count;

    const expiredShares = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
        .get(ShareStatus.EXPIRED) as { count: number }
    ).count;

    const revokedShares = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE status = ?')
        .get(ShareStatus.REVOKED) as { count: number }
    ).count;

    const today = Date.now() - 24 * 60 * 60 * 1000;

    const sharesCreatedToday = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM credential_shares WHERE created_at > ?')
        .get(today) as { count: number }
    ).count;

    const sharesRevokedToday = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM credential_shares WHERE revoked_at IS NOT NULL AND revoked_at > ?'
        )
        .get(today) as { count: number }
    ).count;

    // Most shared credentials
    const mostShared = this.db
      .prepare(
        `SELECT service, account, COUNT(*) as share_count
         FROM credential_shares
         GROUP BY service, account
         ORDER BY share_count DESC
         LIMIT 5`
      )
      .all() as Array<{ service: string; account: string; share_count: number }>;

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

  /**
   * Clean up old revoked/expired shares
   */
  cleanupOldShares(olderThanDays: number = 90): number {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const result = this.db
      .prepare(
        `DELETE FROM credential_shares
         WHERE (status = ? OR status = ?)
           AND (revoked_at < ? OR (expires_at IS NOT NULL AND expires_at < ?))`
      )
      .run(ShareStatus.REVOKED, ShareStatus.EXPIRED, cutoffTime, cutoffTime);

    logger.info('Old shares cleaned up', {
      deletedRecords: result.changes,
      olderThanDays,
    });

    return result.changes;
  }

  /**
   * Map database row to CredentialShare
   */
  private mapRowToShare(row: any): CredentialShare {
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
