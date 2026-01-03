import Database from 'better-sqlite3';
import type { Task } from '../types';
export declare class TaskRepository {
    private db;
    constructor(db: Database.Database);
    createTask(input: Record<string, any>, metadata?: Record<string, any>): Promise<Task>;
    getTask(taskId: string): Promise<Task | null>;
    updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
    listTasks(filters?: {
        status?: Task['status'];
        limit?: number;
        offset?: number;
    }): Promise<Task[]>;
    private rowToTask;
}
//# sourceMappingURL=TaskRepository.d.ts.map