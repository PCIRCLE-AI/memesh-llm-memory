import { logger } from '../utils/logger.js';
import { getDataPath } from '../utils/PathResolver.js';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { expandHome, resolveUserPath } from '../utils/paths.js';
export class SimpleConfig {
    static get CLAUDE_MODEL() {
        return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    }
    static get DATABASE_PATH() {
        const raw = process.env.DATABASE_PATH
            || process.env.MEMESH_DATABASE_PATH
            || process.env.CCB_DATABASE_PATH
            || process.env.CLAUDE_CODE_BUDDY_DATABASE_PATH
            || getDataPath('database.db');
        return expandHome(raw);
    }
    static get BEGINNER_MODE() {
        return this.parseBoolean(process.env.BEGINNER_MODE, true);
    }
    static get EVIDENCE_MODE() {
        return this.parseBoolean(process.env.EVIDENCE_MODE, true);
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
            DATABASE_PATH: this.DATABASE_PATH,
            NODE_ENV: this.NODE_ENV,
            LOG_LEVEL: this.LOG_LEVEL,
            BEGINNER_MODE: this.BEGINNER_MODE,
            EVIDENCE_MODE: this.EVIDENCE_MODE,
            isDevelopment: this.isDevelopment,
            isProduction: this.isProduction,
            isTest: this.isTest,
        };
    }
    static parseBoolean(value, defaultValue) {
        if (value === undefined) {
            return defaultValue;
        }
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
            return false;
        }
        return defaultValue;
    }
}
import Database from 'better-sqlite3';
import { ConnectionPool } from '../db/ConnectionPool.js';
export class SimpleDatabaseFactory {
    static instances = new Map();
    static pools = new Map();
    static createDatabase(path, isTest = false) {
        try {
            this.ensureDirectoryExists(path);
            const db = new Database(path, {
                verbose: SimpleConfig.isDevelopment ? ((msg) => logger.debug('SQLite', { message: msg })) : undefined,
            });
            db.pragma('busy_timeout = 5000');
            if (!isTest) {
                try {
                    db.pragma('journal_mode = WAL');
                }
                catch (error) {
                    logger.warn(`WAL mode unavailable for ${path}. Falling back to default journal mode.`, {
                        component: 'SimpleDatabaseFactory',
                        method: 'createDatabase',
                        path,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
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
    static normalizeDbPath(path) {
        const rawPath = path || SimpleConfig.DATABASE_PATH;
        if (rawPath === ':memory:' || rawPath.startsWith('file:')) {
            return rawPath;
        }
        return resolveUserPath(rawPath);
    }
    static ensureDirectoryExists(dbPath) {
        if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
            return;
        }
        const dir = path.dirname(dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
    static getInstance(path) {
        const dbPath = this.normalizeDbPath(path);
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
        const dbPath = this.normalizeDbPath(path);
        let pool = this.pools.get(dbPath);
        if (!pool) {
            this.ensureDirectoryExists(dbPath);
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
        const dbPath = this.normalizeDbPath(path);
        const pool = this.pools.get(dbPath);
        if (!pool) {
            logger.error('Attempted to release connection to non-existent pool');
            return;
        }
        pool.release(db);
    }
    static getPoolStats(path) {
        const dbPath = this.normalizeDbPath(path);
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
        const dbPath = this.normalizeDbPath(path);
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