import type { Task, TaskFilter, TaskStatus, CreateTaskParams, UpdateTaskParams, Message, AddMessageParams, MessageCreated, Artifact } from '../types/index.js';
export declare class TaskQueue {
    private db;
    private preparedStatements;
    private isClosed;
    constructor(agentId: string, dbPath?: string);
    private initializeSchema;
    private getStatement;
    createTask(params: CreateTaskParams): Task;
    getTask(taskId: string): Task | null;
    listTasks(filter?: TaskFilter): TaskStatus[];
    updateTaskStatus(taskId: string, params: UpdateTaskParams): boolean;
    addMessage(params: AddMessageParams): MessageCreated;
    getMessages(taskId: string): Message[];
    addArtifact(params: {
        taskId: string;
        type: string;
        name?: string;
        content: string | Buffer;
        encoding?: 'utf-8' | 'base64';
        metadata?: Record<string, unknown>;
    }): string;
    getArtifacts(taskId: string): Artifact[];
    close(): void;
    private rowToTask;
}
//# sourceMappingURL=TaskQueue.d.ts.map