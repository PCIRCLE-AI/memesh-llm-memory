import type Database from 'better-sqlite3';
export interface Migration {
    version: number;
    name: string;
    up: (db: Database.Database) => void;
    down: (db: Database.Database) => void;
}
export declare const migrations: Migration[];
export declare class MigrationManager {
    private db;
    constructor(db: Database.Database);
    initialize(): Promise<void>;
    getCurrentVersion(): number;
    migrate(targetVersion?: number): Promise<void>;
    rollback(steps?: number): Promise<void>;
}
//# sourceMappingURL=MigrationManager.d.ts.map