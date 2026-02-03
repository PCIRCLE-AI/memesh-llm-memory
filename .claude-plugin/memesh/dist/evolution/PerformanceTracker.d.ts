import type { PerformanceMetrics } from './types.js';
import { PerformanceMetricsRepository } from './storage/repositories/PerformanceMetricsRepository.js';
export declare class PerformanceTracker {
    private metrics;
    private maxMetricsPerAgent;
    private maxTotalMetrics;
    private totalMetricsCount;
    private evictionHeap;
    private repository?;
    constructor(config?: {
        maxMetricsPerAgent?: number;
        maxTotalMetrics?: number;
        repository?: PerformanceMetricsRepository;
    });
    private loadFromRepository;
    track(metrics: Omit<PerformanceMetrics, 'executionId' | 'timestamp'>): PerformanceMetrics;
    private enforceGlobalLimit;
    private updateHeapForAgent;
    private rebuildHeap;
    getMetrics(agentId: string, filter?: {
        taskType?: string;
        since?: Date;
        limit?: number;
    }): PerformanceMetrics[];
    clearMetrics(agentId: string): void;
    getTrackedAgents(): string[];
    getTotalTaskCount(): number;
}
//# sourceMappingURL=PerformanceTracker.d.ts.map