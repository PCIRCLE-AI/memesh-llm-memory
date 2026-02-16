import type Database from 'better-sqlite3';
import type { IDatabaseAdapter, IStatement, AdapterAvailability } from '../IDatabaseAdapter.js';
export declare function checkBetterSqlite3Availability(): Promise<AdapterAvailability>;
export declare class BetterSqlite3Adapter implements IDatabaseAdapter {
    private db;
    private constructor();
    static create(dbPath: string, options?: Database.Options): Promise<BetterSqlite3Adapter>;
    prepare(sql: string): IStatement;
    exec(sql: string): void;
    close(): void;
    get inMemory(): boolean;
    get name(): string;
    get open(): boolean;
}
//# sourceMappingURL=BetterSqlite3Adapter.d.ts.map