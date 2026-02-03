import type { SessionTokenTracker } from './SessionTokenTracker.js';
export type SessionHealthStatus = 'healthy' | 'warning' | 'critical';
export type WarningType = 'token-threshold' | 'quality-degradation' | 'context-staleness' | 'system-error';
export interface SessionWarning {
    type: WarningType;
    level: 'info' | 'warning' | 'critical';
    message: string;
    data?: Record<string, unknown>;
}
export interface MonitorRecommendation {
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    reasoning: string;
}
export interface SessionHealth {
    status: SessionHealthStatus;
    tokenUsagePercentage: number;
    warnings: SessionWarning[];
    recommendations: MonitorRecommendation[];
    timestamp: Date;
}
export declare class SessionContextMonitor {
    private tokenTracker;
    private static readonly MAX_QUALITY_HISTORY;
    private static readonly MIN_SCORES_FOR_TREND;
    private static readonly DEGRADATION_THRESHOLD;
    private qualityHistory;
    private lastHealthCheck;
    constructor(tokenTracker: SessionTokenTracker);
    checkSessionHealth(): SessionHealth;
    recordQualityScore(score: number): void;
    private checkQualityDegradation;
    private determineStatus;
    getStats(): {
        tokenStats: import("./SessionTokenTracker.js").SessionStats;
        qualityHistory: number[];
        lastHealthCheck: Date | null;
    };
}
//# sourceMappingURL=SessionContextMonitor.d.ts.map