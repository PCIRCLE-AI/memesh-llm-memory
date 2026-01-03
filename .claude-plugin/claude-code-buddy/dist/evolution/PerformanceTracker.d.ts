import type { PerformanceMetrics, EvolutionStats } from './types.js';
export declare class PerformanceTracker {
    private metrics;
    private maxMetricsPerAgent;
    private maxTotalMetrics;
    private totalMetricsCount;
    private evictionHeap;
    constructor(config?: {
        maxMetricsPerAgent?: number;
        maxTotalMetrics?: number;
    });
    track(metrics: Omit<PerformanceMetrics, 'executionId' | 'timestamp'>): PerformanceMetrics;
    private enforceGlobalLimit;
    private updateHeapForAgent;
    private rebuildHeap;
    getMetrics(agentId: string, filter?: {
        taskType?: string;
        since?: Date;
        limit?: number;
    }): PerformanceMetrics[];
    getEvolutionStats(agentId: string, recentWindowMs?: number): EvolutionStats;
    getAveragePerformance(agentId: string, taskType: string): {
        avgDuration: number;
        avgCost: number;
        avgQuality: number;
        successRate: number;
        sampleSize: number;
    };
    detectAnomalies(agentId: string, metric: PerformanceMetrics): {
        isAnomaly: boolean;
        type?: 'slow' | 'expensive' | 'low-quality' | 'failure';
        severity: 'low' | 'medium' | 'high';
        message: string;
    };
    clearMetrics(agentId: string): void;
    getTrackedAgents(): string[];
    getTotalTaskCount(): number;
}
//# sourceMappingURL=PerformanceTracker.d.ts.map