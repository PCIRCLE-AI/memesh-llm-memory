import { SystemResourcesConfig } from '../utils/SystemResources.js';
export interface ResourceSlot {
    type: 'e2e' | 'build' | 'heavy_compute';
    orchestratorId: string;
    acquiredAt: Date;
    pid: number;
}
export interface GlobalResourcePoolConfig extends SystemResourcesConfig {
    maxConcurrentE2E?: number;
    e2eWaitTimeout?: number;
    maxConcurrentBuilds?: number;
    buildWaitTimeout?: number;
    staleCheckInterval?: number;
    staleLockThreshold?: number;
}
export declare class GlobalResourcePool {
    private static instance;
    private resourceManager;
    private config;
    private activeE2E;
    private activeBuilds;
    private e2eMutex;
    private e2eWaitQueue;
    private staleCheckTimer;
    private constructor();
    static getInstance(config?: GlobalResourcePoolConfig): GlobalResourcePool;
    static resetInstance(): void;
    acquireE2ESlot(orchestratorId: string): Promise<void>;
    private acquireMutex;
    releaseE2ESlot(orchestratorId: string): void;
    private processE2EWaitQueue;
    canRunE2E(count?: number): Promise<{
        canRun: boolean;
        reason?: string;
        recommendation?: string;
    }>;
    getStatus(): {
        e2e: {
            active: number;
            max: number;
            waiting: number;
            slots: ResourceSlot[];
        };
        builds: {
            active: number;
            max: number;
            slots: ResourceSlot[];
        };
        systemResources?: unknown;
    };
    generateReport(): Promise<string>;
    private checkStaleLocks;
    private startStaleCheckTimer;
    cleanup(): void;
}
export declare function acquireE2ESlot(orchestratorId: string): Promise<void>;
export declare function releaseE2ESlot(orchestratorId: string): void;
export declare function canRunE2E(count?: number): Promise<ReturnType<GlobalResourcePool['canRunE2E']>>;
//# sourceMappingURL=GlobalResourcePool.d.ts.map