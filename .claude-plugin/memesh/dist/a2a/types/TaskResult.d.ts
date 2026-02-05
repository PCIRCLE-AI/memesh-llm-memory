export interface TaskResult {
    taskId: string;
    state: 'COMPLETED' | 'FAILED' | 'TIMEOUT';
    success: boolean;
    result?: unknown;
    error?: string;
    executedAt: string;
    executedBy: string;
    durationMs?: number;
}
//# sourceMappingURL=TaskResult.d.ts.map