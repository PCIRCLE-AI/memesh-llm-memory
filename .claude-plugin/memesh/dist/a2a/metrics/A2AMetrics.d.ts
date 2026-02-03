export type MetricType = 'counter' | 'gauge' | 'histogram';
export interface MetricValue {
    type: MetricType;
    value: number;
    labels: Record<string, string>;
    timestamp: number;
}
export declare class A2AMetrics {
    private static instance;
    private metrics;
    private enabled;
    private constructor();
    static getInstance(): A2AMetrics;
    static resetInstance(): void;
    incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
    getValue(name: string, labels?: Record<string, string>): number | undefined;
    getSnapshot(): Map<string, MetricValue>;
    clear(): void;
    setEnabled(enabled: boolean): void;
    private getKey;
}
export declare const METRIC_NAMES: {
    readonly TASKS_SUBMITTED: "a2a.tasks.submitted";
    readonly TASKS_COMPLETED: "a2a.tasks.completed";
    readonly TASKS_FAILED: "a2a.tasks.failed";
    readonly TASKS_TIMEOUT: "a2a.tasks.timeout";
    readonly TASKS_CANCELED: "a2a.tasks.canceled";
    readonly TASK_DURATION_MS: "a2a.task.duration_ms";
    readonly QUEUE_SIZE: "a2a.queue.size";
    readonly QUEUE_DEPTH: "a2a.queue.depth";
    readonly HEARTBEAT_SUCCESS: "a2a.heartbeat.success";
    readonly HEARTBEAT_FAILURE: "a2a.heartbeat.failure";
    readonly AGENTS_ACTIVE: "a2a.agents.active";
    readonly AGENTS_STALE: "a2a.agents.stale";
};
//# sourceMappingURL=A2AMetrics.d.ts.map