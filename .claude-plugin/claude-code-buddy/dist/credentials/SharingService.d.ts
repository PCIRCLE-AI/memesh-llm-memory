import Database from 'better-sqlite3';
import { AuditLogger } from './AuditLogger.js';
import type { Identity } from './AccessControl.js';
export declare enum SharePermission {
    READ = "read",
    READ_ROTATE = "read_rotate",
    READ_ROTATE_SHARE = "read_rotate_share",
    FULL = "full"
}
export declare enum ShareStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    REVOKED = "revoked",
    PENDING = "pending"
}
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
export interface AccessToken {
    token: string;
    service: string;
    account: string;
    grantedTo: Identity;
    permission: SharePermission;
    expiresAt: Date;
    createdAt: Date;
}
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
export declare class SharingService {
    private db;
    private auditLogger;
    constructor(db: Database.Database, auditLogger: AuditLogger);
    private initializeSchema;
    createShare(service: string, account: string, sharedBy: Identity, sharedWith: Identity, permission: SharePermission, options?: {
        expiresIn?: number;
        generateToken?: boolean;
        metadata?: Record<string, any>;
    }): CredentialShare;
    private generateAccessToken;
    revokeShare(shareId: number, revokedBy: Identity): void;
    getShare(shareId: number): CredentialShare | null;
    getShareByToken(token: string): CredentialShare | null;
    getSharesForCredential(service: string, account: string): CredentialShare[];
    getSharesGrantedTo(identity: Identity, activeOnly?: boolean): CredentialShare[];
    getSharesCreatedBy(identity: Identity, activeOnly?: boolean): CredentialShare[];
    hasAccess(service: string, account: string, identity: Identity): SharePermission | null;
    expireShares(): number;
    private expireShare;
    revokeAllShares(service: string, account: string, revokedBy: Identity): number;
    createAccessToken(service: string, account: string, grantedBy: Identity, grantedTo: Identity, permission: SharePermission, expiresIn: number): AccessToken;
    validateAccessToken(token: string): CredentialShare | null;
    getStats(): SharingStats;
    cleanupOldShares(olderThanDays?: number): number;
    private mapRowToShare;
}
//# sourceMappingURL=SharingService.d.ts.map