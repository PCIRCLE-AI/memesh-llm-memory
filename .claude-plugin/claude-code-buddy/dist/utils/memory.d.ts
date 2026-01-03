declare class MemoryMonitor {
    private maxMemoryMB;
    constructor();
    getCurrentUsage(): number;
    getUsagePercent(): number;
    isLowMemory(): boolean;
    getAvailableMemory(): number;
    getReport(): {
        usage: number;
        max: number;
        available: number;
        percent: number;
        status: string;
    };
    logStatus(): void;
    forceGC(): void;
}
export declare const memoryMonitor: MemoryMonitor;
export {};
//# sourceMappingURL=memory.d.ts.map