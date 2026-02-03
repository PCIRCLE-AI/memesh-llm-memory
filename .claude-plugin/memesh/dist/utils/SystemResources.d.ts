export interface SystemResourcesConfig {
    cpuThreshold?: number;
    memoryThreshold?: number;
    threadStrategy?: 'conservative' | 'balanced' | 'aggressive';
    minThreads?: number;
    maxThreads?: number;
    e2eMaxConcurrent?: number;
}
export interface SystemResources {
    cpuCores: number;
    cpuUsage: number;
    availableCPU: number;
    totalMemoryMB: number;
    usedMemoryMB: number;
    freeMemoryMB: number;
    memoryUsage: number;
    recommendedThreads: number;
    recommendedE2E: number;
    healthy: boolean;
    warnings: string[];
}
export declare class SystemResourceManager {
    private config;
    constructor(config?: SystemResourcesConfig);
    getResources(): Promise<SystemResources>;
    private calculateRecommendedThreads;
    private calculateRecommendedE2E;
    private getCPUUsage;
    private getCPUSnapshot;
    canRunE2E(count?: number): Promise<{
        canRun: boolean;
        reason?: string;
        recommendation?: string;
    }>;
    generateReport(): Promise<string>;
    private getStatusEmoji;
}
export declare function getSystemResources(config?: SystemResourcesConfig): Promise<SystemResources>;
export declare function canRunE2ETest(count?: number, config?: SystemResourcesConfig): Promise<ReturnType<SystemResourceManager['canRunE2E']>>;
//# sourceMappingURL=SystemResources.d.ts.map