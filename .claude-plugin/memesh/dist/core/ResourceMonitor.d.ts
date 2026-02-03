import { SystemResources, ResourceCheckResult, ExecutionConfig } from './types.js';
export declare class ResourceMonitor {
    private activeBackgroundCount;
    private maxBackgroundAgents;
    private thresholds;
    private activeIntervals;
    private disposed;
    constructor(maxBackgroundAgents?: number, thresholds?: {
        maxCPU?: number;
        maxMemory?: number;
    });
    getCurrentResources(): SystemResources;
    canRunBackgroundTask(config?: ExecutionConfig): ResourceCheckResult;
    registerBackgroundTask(): void;
    unregisterBackgroundTask(): void;
    getActiveBackgroundCount(): number;
    setMaxCPU(percentage: number): void;
    setMaxMemory(megabytes: number): void;
    setMaxBackgroundAgents(count: number): void;
    dispose(): void;
    onThresholdExceeded(threshold: 'cpu' | 'memory', callback: (resources: SystemResources) => void): () => void;
    getStats(): {
        activeIntervals: number;
        activeBackgroundAgents: number;
        maxBackgroundAgents: number;
        thresholds: {
            maxCPU: number;
            maxMemory: number;
        };
    };
}
//# sourceMappingURL=ResourceMonitor.d.ts.map