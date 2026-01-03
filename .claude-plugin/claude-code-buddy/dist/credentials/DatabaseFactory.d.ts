import Database from 'better-sqlite3';
export interface DatabaseOptions {
    path: string;
    verbose?: boolean;
    readonly?: boolean;
    busyTimeout?: number;
    skipWAL?: boolean;
    skipForeignKeys?: boolean;
}
export declare function createDatabase(options: DatabaseOptions | string): Database.Database;
export declare function createTestDatabase(path?: string): Database.Database;
export declare class DatabaseFactory {
    private static instances;
    static create(options: DatabaseOptions | string): Database.Database;
    static getInstance(path: string): Database.Database;
    static closeInstance(path: string): void;
    static closeAll(): void;
}
//# sourceMappingURL=DatabaseFactory.d.ts.map