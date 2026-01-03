import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearningManager } from './LearningManager.js';
import type { AdaptationEngine } from './AdaptationEngine.js';
import type { EvolutionStats } from './types.js';
export interface DashboardSummary {
    totalAgents: number;
    agentsWithPatterns: number;
    totalPatterns: number;
    totalExecutions: number;
    averageSuccessRate: number;
    topImprovingAgents: Array<{
        agentId: string;
        improvement: number;
    }>;
}
export interface AgentLearningProgress {
    agentId: string;
    totalExecutions: number;
    learnedPatterns: number;
    appliedAdaptations: number;
    successRateImprovement: number;
    lastLearningDate: Date | null;
}
export interface TimeSeriesDataPoint {
    timestamp: number;
    value: number;
    metadata?: Record<string, unknown>;
}
export interface TimeSeriesMetrics {
    metricName: string;
    dataPoints: TimeSeriesDataPoint[];
    statistics?: {
        min: number;
        max: number;
        average: number;
        trend: 'increasing' | 'decreasing' | 'stable';
    };
}
export interface DashboardExport {
    exportedAt: number;
    summary: DashboardSummary;
    timeSeries: TimeSeriesMetrics[];
    learningProgress: AgentLearningProgress[];
}
export declare class EvolutionMonitor {
    private performanceTracker;
    private learningManager;
    private adaptationEngine;
    private metricsHistory;
    private alertThresholds;
    private eventListeners;
    private triggeredAlerts;
    private isInitialized;
    constructor(performanceTracker?: PerformanceTracker, learningManager?: LearningManager, adaptationEngine?: AdaptationEngine);
    getDashboardSummary(): DashboardSummary;
    getAgentStats(agentId: string): EvolutionStats;
    getLearningProgress(): AgentLearningProgress[];
    formatDashboard(options?: {
        includeCharts?: boolean;
        chartHeight?: number;
    }): string;
    trackSystemMetric(metricName: string, value: number, metadata?: Record<string, unknown>): void;
    getTimeSeriesMetrics(metricNames: string[], options?: {
        startTime?: number;
        endTime?: number;
        maxDataPoints?: number;
    }): TimeSeriesMetrics[];
    private calculateStatistics;
    aggregateByInterval(metricName: string, intervalMs: number): TimeSeriesDataPoint[];
    renderChart(metricName: string, options?: {
        height?: number;
        width?: number;
        title?: string;
        aggregateInterval?: number;
    }): string;
    renderMultiChart(metricNames: string[], options?: {
        height?: number;
        width?: number;
        title?: string;
        aggregateInterval?: number;
    }): string;
    exportAsJSON(): string;
    exportAsCSV(): string;
    exportAsMarkdown(): string;
    initialize(): Promise<void>;
    close(): Promise<void>;
    recordMetric(metric: string, value: number, timestamp: number): Promise<void>;
    setAlertThreshold(metric: string, threshold: number): Promise<void>;
    on(event: string, callback: (data: unknown) => void): void;
    private emit;
    getMetricHistory(metric: string): Promise<Array<{
        value: number;
        timestamp: number;
    }>>;
    getAlerts(): Promise<Array<{
        type: string;
        metric: string;
        threshold: number;
        actualValue: number;
        timestamp: number;
    }>>;
    isReady(): Promise<boolean>;
}
//# sourceMappingURL=EvolutionMonitor.d.ts.map