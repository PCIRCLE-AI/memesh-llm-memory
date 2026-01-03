export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    timestamp?: Date;
}
export interface ThresholdConfig {
    percentage: number;
    level: 'info' | 'warning' | 'critical';
}
export interface ThresholdWarning {
    threshold: number;
    level: 'info' | 'warning' | 'critical';
    tokensUsed: number;
    tokensRemaining: number;
    message: string;
}
export interface SessionStats {
    totalTokens: number;
    tokenLimit: number;
    usagePercentage: number;
    tokensRemaining: number;
    interactionCount: number;
    triggeredThresholds: number[];
}
export interface SessionTokenTrackerConfig {
    tokenLimit: number;
    thresholds?: ThresholdConfig[];
}
export declare class SessionTokenTracker {
    private totalTokens;
    private tokenLimit;
    private thresholds;
    private usageHistory;
    private triggeredThresholds;
    constructor(config: SessionTokenTrackerConfig);
    recordUsage(usage: TokenUsage): void;
    getTotalTokens(): number;
    getUsagePercentage(): number;
    checkThresholds(): ThresholdWarning[];
    getStats(): SessionStats;
    reset(): void;
}
//# sourceMappingURL=SessionTokenTracker.d.ts.map