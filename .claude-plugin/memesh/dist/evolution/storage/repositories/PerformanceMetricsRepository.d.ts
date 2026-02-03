import Database from 'better-sqlite3';
export interface PerformanceMetrics {
    executionId: string;
    agentId: string;
    taskType: string;
    success: boolean;
    durationMs: number;
    cost: number;
    qualityScore: number;
    userSatisfaction?: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export declare class PerformanceMetricsRepository {
    private db;
    constructor(db: Database.Database);
    ensureSchema(): void;
    save(metric: PerformanceMetrics): void;
    saveBatch(metrics: PerformanceMetrics[]): void;
    getByAgentId(agentId: string, limit?: number): PerformanceMetrics[];
    getByTimeRange(start: Date, end: Date, agentId?: string): PerformanceMetrics[];
    getStats(agentId: string, timeRange?: {
        start: Date;
        end: Date;
    }): {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        avgDurationMs: number;
        avgCost: number;
        avgQualityScore: number;
        successRate: number;
    };
    getAgentIds(): string[];
    deleteOlderThan(date: Date): number;
    count(agentId?: string): number;
    private rowToMetric;
}
//# sourceMappingURL=PerformanceMetricsRepository.d.ts.map