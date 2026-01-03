import Database from 'better-sqlite3';
import { DATABASE } from './constants.js';
import { logger } from '../utils/logger.js';
export function createDatabase(options) {
    const opts = typeof options === 'string'
        ? { path: options }
        : options;
    const { path, verbose = false, readonly = false, busyTimeout = DATABASE.BUSY_TIMEOUT_MS, skipWAL = false, skipForeignKeys = false, } = opts;
    const db = new Database(path, {
        verbose: verbose ? (message, ...args) => {
            logger.debug('SQLite:', String(message), ...args);
        } : undefined,
        readonly,
    });
    try {
        db.pragma(`busy_timeout = ${busyTimeout}`);
        if (!skipWAL && path !== ':memory:') {
            db.pragma(`journal_mode = ${DATABASE.JOURNAL_MODE}`);
        }
        if (!skipForeignKeys) {
            db.pragma(`foreign_keys = ${DATABASE.FOREIGN_KEYS}`);
        }
        logger.debug('Database initialized', {
            path: path === ':memory:' ? 'in-memory' : path,
            walMode: !skipWAL && path !== ':memory:',
            foreignKeys: !skipForeignKeys,
            busyTimeout,
        });
    }
    catch (error) {
        logger.error('Failed to configure database', {
            path,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
    return db;
}
export function createTestDatabase(path = ':memory:') {
    return createDatabase({
        path,
        verbose: false,
        skipWAL: path === ':memory:',
    });
}
export class DatabaseFactory {
    static instances = new Map();
    static create(options) {
        return createDatabase(options);
    }
    static getInstance(path) {
        if (!this.instances.has(path)) {
            const db = createDatabase(path);
            this.instances.set(path, db);
        }
        return this.instances.get(path);
    }
    static closeInstance(path) {
        const db = this.instances.get(path);
        if (db) {
            db.close();
            this.instances.delete(path);
        }
    }
    static closeAll() {
        for (const db of this.instances.values()) {
            db.close();
        }
        this.instances.clear();
    }
}
//# sourceMappingURL=DatabaseFactory.js.map