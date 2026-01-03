import Database from 'better-sqlite3';
import type { Execution } from '../types';
export declare class ExecutionRepository {
    private db;
    constructor(db: Database.Database);
    createExecution(taskId: string, metadata?: Record<string, any>): Promise<Execution>;
    getExecution(executionId: string): Promise<Execution | null>;
    updateExecution(executionId: string, updates: Partial<Execution>): Promise<void>;
    listExecutions(taskId: string): Promise<Execution[]>;
    private rowToExecution;
}
//# sourceMappingURL=ExecutionRepository.d.ts.map