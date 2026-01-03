import { logger } from '../utils/logger.js';
export class SimpleConfig {
    static get CLAUDE_MODEL() {
        return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    }
    static get OPENAI_API_KEY() {
        return process.env.OPENAI_API_KEY || '';
    }
    static get VECTRA_INDEX_PATH() {
        return process.env.VECTRA_INDEX_PATH || `${process.env.HOME}/.claude-code-buddy/vectra`;
    }
    static get DATABASE_PATH() {
        return process.env.DATABASE_PATH || `${process.env.HOME}/.claude-code-buddy/database.db`;
    }
    static get NODE_ENV() {
        return process.env.NODE_ENV || 'development';
    }
    static get LOG_LEVEL() {
        const level = process.env.LOG_LEVEL || 'info';
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            return level;
        }
        return 'info';
    }
    static get isDevelopment() {
        return this.NODE_ENV === 'development';
    }
    static get isProduction() {
        return this.NODE_ENV === 'production';
    }
    static get isTest() {
        return this.NODE_ENV === 'test';
    }
    static validateRequired() {
        const missing = [];
        return missing;
    }
    static getAll() {
        return {
            CLAUDE_MODEL: this.CLAUDE_MODEL,
            OPENAI_API_KEY: this.OPENAI_API_KEY ? '***masked***' : '',
            VECTRA_INDEX_PATH: this.VECTRA_INDEX_PATH,
            DATABASE_PATH: this.DATABASE_PATH,
            NODE_ENV: this.NODE_ENV,
            LOG_LEVEL: this.LOG_LEVEL,
            isDevelopment: this.isDevelopment,
            isProduction: this.isProduction,
            isTest: this.isTest,
        };
    }
}
import Database from 'better-sqlite3';
import { ConnectionPool } from '../db/ConnectionPool.js';
export class SimpleDatabaseFactory {
    static instances = new Map();
    static pools = new Map();
    static createDatabase(path, isTest = false) {
        try {
            const db = new Database(path, {
                verbose: SimpleConfig.isDevelopment ? ((msg) => logger.debug('SQLite', { message: msg })) : undefined,
            });
            db.pragma('busy_timeout = 5000');
            if (!isTest) {
                db.pragma('journal_mode = WAL');
                db.pragma('cache_size = -10000');
                db.pragma('mmap_size = 134217728');
            }
            db.pragma('foreign_keys = ON');
            return db;
        }
        catch (error) {
            logger.error(`Failed to create database at ${path}:`, error);
            throw error;
        }
    }
    static getInstance(path) {
        const dbPath = path || SimpleConfig.DATABASE_PATH;
        const existingDb = this.instances.get(dbPath);
        if (existingDb?.open) {
            return existingDb;
        }
        if (existingDb && !existingDb.open) {
            try {
                existingDb.close();
            }
            catch (error) {
            }
            this.instances.delete(dbPath);
        }
        const newDb = this.createDatabase(dbPath, false);
        this.instances.set(dbPath, newDb);
        return newDb;
    }
    static createTestDatabase() {
        return this.createDatabase(':memory:', true);
    }
    static getPool(path) {
        const dbPath = path || SimpleConfig.DATABASE_PATH;
        let pool = this.pools.get(dbPath);
        if (!pool) {
            const maxConnections = parseInt(process.env.DB_POOL_SIZE || '5', 10) || 5;
            const connectionTimeout = parseInt(process.env.DB_POOL_TIMEOUT || '5000', 10) || 5000;
            const idleTimeout = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10) || 30000;
            pool = new ConnectionPool(dbPath, {
                maxConnections,
                connectionTimeout,
                idleTimeout,
            }, SimpleConfig.isDevelopment ? logger : undefined);
            this.pools.set(dbPath, pool);
            logger.info(`Created connection pool for ${dbPath}`, {
                maxConnections,
                connectionTimeout,
                idleTimeout,
            });
        }
        return pool;
    }
    static async getPooledConnection(path) {
        const pool = this.getPool(path);
        return pool.acquire();
    }
    static releasePooledConnection(db, path) {
        const dbPath = path || SimpleConfig.DATABASE_PATH;
        const pool = this.pools.get(dbPath);
        if (!pool) {
            logger.error('Attempted to release connection to non-existent pool');
            return;
        }
        pool.release(db);
    }
    static getPoolStats(path) {
        const dbPath = path || SimpleConfig.DATABASE_PATH;
        const pool = this.pools.get(dbPath);
        return pool ? pool.getStats() : null;
    }
    static async closeAll() {
        for (const [path, db] of this.instances.entries()) {
            try {
                db.close();
            }
            catch (error) {
                logger.error(`Failed to close database at ${path}:`, error);
            }
        }
        this.instances.clear();
        const poolShutdowns = [];
        for (const [path, pool] of this.pools.entries()) {
            poolShutdowns.push(pool.shutdown().catch((error) => {
                logger.error(`Failed to shutdown pool at ${path}:`, error);
            }));
        }
        await Promise.all(poolShutdowns);
        this.pools.clear();
    }
    static async close(path) {
        const dbPath = path || SimpleConfig.DATABASE_PATH;
        const db = this.instances.get(dbPath);
        if (db) {
            try {
                db.close();
                this.instances.delete(dbPath);
            }
            catch (error) {
                logger.error(`Failed to close database at ${dbPath}:`, error);
            }
        }
        const pool = this.pools.get(dbPath);
        if (pool) {
            try {
                await pool.shutdown();
                this.pools.delete(dbPath);
            }
            catch (error) {
                logger.error(`Failed to shutdown pool at ${dbPath}:`, error);
            }
        }
    }
}
//# sourceMappingURL=simple-config.js.map