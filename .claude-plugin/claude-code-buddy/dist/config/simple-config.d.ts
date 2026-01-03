export declare class SimpleConfig {
    static get CLAUDE_MODEL(): string;
    static get OPENAI_API_KEY(): string;
    static get VECTRA_INDEX_PATH(): string;
    static get DATABASE_PATH(): string;
    static get NODE_ENV(): string;
    static get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error';
    static get isDevelopment(): boolean;
    static get isProduction(): boolean;
    static get isTest(): boolean;
    static validateRequired(): string[];
    static getAll(): Record<string, string | boolean>;
}
import Database from 'better-sqlite3';
import { ConnectionPool, type PoolStats } from '../db/ConnectionPool.js';
export declare class SimpleDatabaseFactory {
    private static instances;
    private static pools;
    private static createDatabase;
    static getInstance(path?: string): Database.Database;
    static createTestDatabase(): Database.Database;
    static getPool(path?: string): ConnectionPool;
    static getPooledConnection(path?: string): Promise<Database.Database>;
    static releasePooledConnection(db: Database.Database, path?: string): void;
    static getPoolStats(path?: string): PoolStats | null;
    static closeAll(): Promise<void>;
    static close(path?: string): Promise<void>;
}
//# sourceMappingURL=simple-config.d.ts.map