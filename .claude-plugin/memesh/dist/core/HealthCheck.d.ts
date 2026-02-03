export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export interface ComponentHealth {
    name: string;
    status: HealthStatus;
    message: string;
    durationMs: number;
    details?: Record<string, unknown>;
    timestamp: Date;
}
export interface SystemHealth {
    status: HealthStatus;
    isHealthy: boolean;
    components: ComponentHealth[];
    summary: string;
    totalDurationMs: number;
    timestamp: Date;
}
export interface HealthCheckOptions {
    timeout?: number;
    skip?: string[];
}
export declare class HealthChecker {
    private timeout;
    constructor(options?: {
        timeout?: number;
    });
    checkAll(options?: HealthCheckOptions): Promise<SystemHealth>;
    checkDatabase(timeout: number): Promise<ComponentHealth>;
    checkFilesystem(timeout: number): Promise<ComponentHealth>;
    checkMemory(_timeout: number): Promise<ComponentHealth>;
    private createHealth;
    private timeoutPromise;
    private generateSummary;
}
export declare function isSystemHealthy(options?: HealthCheckOptions): Promise<boolean>;
export declare function formatHealthStatus(health: SystemHealth): string;
export declare function getHealthStatus(options?: HealthCheckOptions): Promise<string>;
export default HealthChecker;
//# sourceMappingURL=HealthCheck.d.ts.map