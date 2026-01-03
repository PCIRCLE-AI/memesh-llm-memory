import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
export class ConnectionPool {
    dbPath;
    options;
    verboseLogger;
    pool = [];
    available = [];
    waiting = [];
    stats = {
        totalAcquired: 0,
        totalReleased: 0,
        totalRecycled: 0,
        timeoutErrors: 0,
    };
    healthCheckTimer = null;
    isShuttingDown = false;
    constructor(dbPath, options = {}, verboseLogger) {
        this.dbPath = dbPath;
        this.verboseLogger = verboseLogger;
        this.options = {
            maxConnections: options.maxConnections ?? 5,
            connectionTimeout: options.connectionTimeout ?? 5000,
            idleTimeout: options.idleTimeout ?? 30000,
            healthCheckInterval: options.healthCheckInterval ?? 10000,
        };
        if (this.options.maxConnections < 1) {
            throw new Error('maxConnections must be at least 1');
        }
        logger.info('Initializing connection pool', {
            dbPath: this.dbPath,
            maxConnections: this.options.maxConnections,
            connectionTimeout: this.options.connectionTimeout,
            idleTimeout: this.options.idleTimeout,
        });
        this.initializePool();
        this.startHealthCheck();
    }
    initializePool() {
        for (let i = 0; i < this.options.maxConnections; i++) {
            try {
                const db = this.createConnection();
                const metadata = {
                    db,
                    lastAcquired: 0,
                    lastReleased: Date.now(),
                    usageCount: 0,
                };
                this.pool.push(metadata);
                this.available.push(metadata);
            }
            catch (error) {
                logger.error(`Failed to create connection ${i + 1}/${this.options.maxConnections}:`, error);
                throw new Error(`Pool initialization failed: ${error}`);
            }
        }
        logger.info(`Connection pool initialized with ${this.pool.length} connections`);
    }
    createConnection() {
        const db = new Database(this.dbPath, {
            verbose: this.verboseLogger ? ((msg) => this.verboseLogger.debug('SQLite', { message: msg })) : undefined,
        });
        db.pragma('busy_timeout = 5000');
        if (this.dbPath !== ':memory:') {
            db.pragma('journal_mode = WAL');
            db.pragma('cache_size = -10000');
            db.pragma('mmap_size = 134217728');
        }
        db.pragma('foreign_keys = ON');
        return db;
    }
    async acquire() {
        if (this.isShuttingDown) {
            throw new Error('Pool is shutting down');
        }
        const metadata = this.available.shift();
        if (metadata) {
            metadata.lastAcquired = Date.now();
            metadata.usageCount++;
            this.stats.totalAcquired++;
            logger.debug('Connection acquired from pool', {
                active: this.pool.length - this.available.length,
                idle: this.available.length,
            });
            return metadata.db;
        }
        logger.debug('No available connection - queuing request', {
            waiting: this.waiting.length + 1,
        });
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const index = this.waiting.findIndex(w => w.timeoutId === timeoutId);
                if (index !== -1) {
                    this.waiting.splice(index, 1);
                }
                this.stats.timeoutErrors++;
                reject(new Error(`Connection acquisition timeout after ${this.options.connectionTimeout}ms`));
            }, this.options.connectionTimeout);
            this.waiting.push({ resolve, reject, timeoutId });
        });
    }
    release(db) {
        if (this.isShuttingDown) {
            logger.warn('Attempted to release connection during shutdown - ignoring');
            return;
        }
        const metadata = this.pool.find(m => m.db === db);
        if (!metadata) {
            logger.error('Attempted to release unknown connection - ignoring');
            return;
        }
        metadata.lastReleased = Date.now();
        this.stats.totalReleased++;
        const waiting = this.waiting.shift();
        if (waiting) {
            clearTimeout(waiting.timeoutId);
            metadata.lastAcquired = Date.now();
            metadata.usageCount++;
            this.stats.totalAcquired++;
            logger.debug('Connection immediately reassigned to waiting request', {
                waiting: this.waiting.length,
            });
            waiting.resolve(db);
            return;
        }
        this.available.push(metadata);
        logger.debug('Connection released back to pool', {
            active: this.pool.length - this.available.length,
            idle: this.available.length,
        });
    }
    getStats() {
        return {
            total: this.pool.length,
            active: this.pool.length - this.available.length,
            idle: this.available.length,
            waiting: this.waiting.length,
            totalAcquired: this.stats.totalAcquired,
            totalReleased: this.stats.totalReleased,
            totalRecycled: this.stats.totalRecycled,
            timeoutErrors: this.stats.timeoutErrors,
        };
    }
    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.options.healthCheckInterval);
    }
    performHealthCheck() {
        const now = Date.now();
        let recycledCount = 0;
        for (let i = this.available.length - 1; i >= 0; i--) {
            const metadata = this.available[i];
            const idleTime = now - metadata.lastReleased;
            if (idleTime > this.options.idleTimeout) {
                logger.debug('Recycling idle connection', {
                    idleTime,
                    usageCount: metadata.usageCount,
                });
                this.available.splice(i, 1);
                try {
                    metadata.db.close();
                }
                catch (error) {
                    logger.error('Error closing stale connection:', error);
                }
                try {
                    const newDb = this.createConnection();
                    const newMetadata = {
                        db: newDb,
                        lastAcquired: 0,
                        lastReleased: now,
                        usageCount: 0,
                    };
                    const poolIndex = this.pool.indexOf(metadata);
                    if (poolIndex !== -1) {
                        this.pool[poolIndex] = newMetadata;
                    }
                    this.available.push(newMetadata);
                    recycledCount++;
                    this.stats.totalRecycled++;
                }
                catch (error) {
                    logger.error('Failed to create replacement connection:', error);
                }
            }
        }
        if (recycledCount > 0) {
            logger.info(`Recycled ${recycledCount} idle connections`);
        }
    }
    async shutdown() {
        if (this.isShuttingDown) {
            logger.warn('Pool already shutting down');
            return;
        }
        this.isShuttingDown = true;
        logger.info('Shutting down connection pool');
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        for (const waiting of this.waiting) {
            clearTimeout(waiting.timeoutId);
            waiting.reject(new Error('Pool is shutting down'));
        }
        this.waiting.length = 0;
        const closePromises = this.pool.map(async (metadata) => {
            try {
                metadata.db.close();
            }
            catch (error) {
                logger.error('Error closing connection during shutdown:', error);
            }
        });
        await Promise.all(closePromises);
        this.pool.length = 0;
        this.available.length = 0;
        logger.info('Connection pool shutdown complete');
    }
    isHealthy() {
        return this.pool.length === this.options.maxConnections;
    }
}
//# sourceMappingURL=ConnectionPool.js.map