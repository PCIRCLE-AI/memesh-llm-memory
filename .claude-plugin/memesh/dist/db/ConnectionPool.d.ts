import Database from 'better-sqlite3';
import type { ILogger } from '../utils/ILogger.js';
export interface ConnectionPoolOptions {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    healthCheckInterval?: number;
}
export interface PoolStats {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    totalAcquired: number;
    totalReleased: number;
    totalRecycled: number;
    timeoutErrors: number;
}
export declare class ConnectionPool {
    private readonly dbPath;
    private readonly options;
    private readonly verboseLogger?;
    private readonly pool;
    private readonly available;
    private readonly waiting;
    private stats;
    private healthCheckTimer;
    private isShuttingDown;
    private healthCheckErrorCount;
    private readonly MAX_CONSECUTIVE_HEALTH_CHECK_ERRORS;
    constructor(dbPath: string, options?: Partial<ConnectionPoolOptions>, verboseLogger?: ILogger);
    private initializePool;
    private createConnection;
    private createConnectionWithRetry;
    private isConnectionValid;
    private getValidConnection;
    acquire(): Promise<Database.Database>;
    private _acquireInternal;
    release(db: Database.Database): void;
    getStats(): PoolStats;
    private startHealthCheck;
    private performHealthCheck;
    private restorePoolSize;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
}
//# sourceMappingURL=ConnectionPool.d.ts.map