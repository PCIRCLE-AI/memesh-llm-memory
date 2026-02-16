export interface IDatabaseAdapter {
    prepare(sql: string): IStatement;
    exec(sql: string): void;
    close(): void;
    readonly inMemory: boolean;
    readonly name: string;
    readonly open: boolean;
}
export interface IStatement {
    all<T = any>(...params: any[]): T[];
    get<T = any>(...params: any[]): T | undefined;
    run(...params: any[]): IRunResult;
    iterate<T = any>(...params: any[]): IterableIterator<T>;
}
export interface IRunResult {
    changes: number;
    lastInsertRowid: number | bigint;
}
export interface AdapterAvailability {
    available: boolean;
    name: string;
    error?: string;
    fallbackSuggestion?: string;
}
//# sourceMappingURL=IDatabaseAdapter.d.ts.map