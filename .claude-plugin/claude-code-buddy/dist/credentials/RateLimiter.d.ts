import Database from 'better-sqlite3';
export interface RateLimitConfig {
    maxAttempts: number;
    windowMs: number;
    lockoutDurationMs: number;
    cleanupIntervalMs: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remainingAttempts?: number;
    lockedUntil?: Date;
    retryAfterMs?: number;
}
export declare class RateLimiter {
    private db;
    private config;
    private cleanupTimer;
    constructor(db: Database.Database, config?: Partial<RateLimitConfig>);
    private initializeSchema;
    checkLimit(service: string, account: string): RateLimitResult;
    recordFailedAttempt(service: string, account: string): void;
    recordSuccessfulAttempt(service: string, account: string): void;
    private resetAttempts;
    private lockAccount;
    unlockAccount(service: string, account: string): void;
    getStatus(service: string, account: string): {
        isLocked: boolean;
        attempts: number;
        lockedUntil?: Date;
        remainingAttempts: number;
    };
    getLockedAccounts(): Array<{
        service: string;
        account: string;
        lockedUntil: Date;
        attempts: number;
    }>;
    private startCleanup;
    stopCleanup(): void;
    cleanup(): void;
    getStats(): {
        totalEntries: number;
        lockedAccounts: number;
        totalAttempts: number;
    };
    getConfig(): RateLimitConfig;
}
//# sourceMappingURL=RateLimiter.d.ts.map