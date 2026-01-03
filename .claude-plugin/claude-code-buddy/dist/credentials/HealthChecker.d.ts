import Database from 'better-sqlite3';
import { RotationService } from './RotationService.js';
import { ExpirationMonitor } from './ExpirationMonitor.js';
import { UsageTracker } from './UsageTracker.js';
export declare enum HealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    CRITICAL = "critical"
}
export interface ComponentHealth {
    name: string;
    status: HealthStatus;
    message: string;
    details?: Record<string, any>;
    responseTimeMs?: number;
    lastChecked: Date;
}
export interface SystemHealth {
    status: HealthStatus;
    components: ComponentHealth[];
    timestamp: Date;
    uptime: number;
    version: string;
}
export interface PerformanceMetrics {
    databaseSize: number;
    totalCredentials: number;
    totalRotations: number;
    totalUsageEvents: number;
    averageQueryTimeMs: number;
    cacheHitRate: number;
}
export interface ResourceUtilization {
    databaseSizeMB: number;
    credentialCount: number;
    rotationJobsCount: number;
    expirationWarningsCount: number;
    usageEventsCount: number;
    auditLogsCount: number;
}
export interface HealthCheckConfig {
    checkInterval: number;
    performanceThresholds: {
        maxQueryTimeMs: number;
        minCacheHitRate: number;
        maxDatabaseSizeMB: number;
    };
    componentTimeouts: {
        database: number;
        rotation: number;
        expiration: number;
        usage: number;
    };
}
export declare class HealthChecker {
    private db;
    private rotationService?;
    private expirationMonitor?;
    private usageTracker?;
    private config;
    private startTime;
    private version;
    private checkTimer;
    private lastHealthCheck?;
    constructor(db: Database.Database, config?: Partial<HealthCheckConfig>, version?: string);
    registerServices(services: {
        rotationService?: RotationService;
        expirationMonitor?: ExpirationMonitor;
        usageTracker?: UsageTracker;
    }): void;
    checkHealth(): Promise<SystemHealth>;
    private checkDatabaseHealth;
    private checkRotationServiceHealth;
    private checkExpirationMonitorHealth;
    private checkUsageTrackerHealth;
    private getDatabaseStats;
    private determineOverallStatus;
    getPerformanceMetrics(): PerformanceMetrics;
    private calculateCacheHitRate;
    getResourceUtilization(): ResourceUtilization;
    getLastHealthCheck(): SystemHealth | undefined;
    startMonitoring(): void;
    stopMonitoring(): void;
    isMonitoring(): boolean;
}
//# sourceMappingURL=HealthChecker.d.ts.map