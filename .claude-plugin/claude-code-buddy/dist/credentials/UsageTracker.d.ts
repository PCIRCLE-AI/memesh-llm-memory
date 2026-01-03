import Database from 'better-sqlite3';
export declare enum UsageEventType {
    ACCESS = "access",
    ACCESS_DENIED = "access_denied",
    AUTHENTICATION_SUCCESS = "auth_success",
    AUTHENTICATION_FAILURE = "auth_failure",
    ROTATION = "rotation",
    EXPIRATION_WARNING = "expiration_warning"
}
export interface UsageEvent {
    id?: number;
    eventType: UsageEventType;
    service: string;
    account: string;
    timestamp: Date;
    responseTimeMs?: number;
    userId?: string;
    metadata?: Record<string, any>;
}
export interface CredentialUsageStats {
    service: string;
    account: string;
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    successRate: number;
    averageResponseTimeMs: number;
    lastAccessed?: Date;
    firstAccessed?: Date;
    uniqueUsers: number;
    accessesLast24h: number;
    accessesLast7d: number;
    accessesLast30d: number;
}
export interface ServiceUsageStats {
    service: string;
    totalCredentials: number;
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    successRate: number;
    averageResponseTimeMs: number;
    mostAccessedAccount: string;
    leastAccessedAccount: string;
    accessesLast24h: number;
}
export interface UsageTrends {
    period: string;
    dataPoints: Array<{
        timestamp: Date;
        accesses: number;
        successRate: number;
        averageResponseTimeMs: number;
    }>;
}
export interface UsageAnomaly {
    service: string;
    account: string;
    anomalyType: 'spike' | 'drop' | 'unusual_time' | 'unusual_user';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
    baseline: number;
    current: number;
    deviationPercent: number;
}
export declare class UsageTracker {
    private db;
    constructor(db: Database.Database);
    private initializeSchema;
    trackEvent(event: UsageEvent): void;
    getCredentialStats(service: string, account: string): CredentialUsageStats;
    private calculateCredentialStats;
    private mapCachedStats;
    getServiceStats(service: string): ServiceUsageStats;
    getUsageTrends(service: string, account: string, period: 'hourly' | 'daily' | 'weekly' | 'monthly', points?: number): UsageTrends;
    private getIntervalMs;
    detectAnomalies(service: string, account: string): UsageAnomaly[];
    private invalidateStatsCache;
    cleanupOldEvents(olderThanDays?: number): number;
    refreshAllStatsCache(): number;
}
//# sourceMappingURL=UsageTracker.d.ts.map