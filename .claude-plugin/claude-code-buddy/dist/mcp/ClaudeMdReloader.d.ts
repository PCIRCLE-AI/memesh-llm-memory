export type ReloadReason = 'token-threshold' | 'quality-degradation' | 'manual' | 'context-staleness';
export type ReloadTrigger = 'auto' | 'user' | 'system';
export interface ReloadRecord {
    reason: ReloadReason;
    triggeredBy: ReloadTrigger;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
}
export interface ResourceUpdateRequest {
    method: 'resources/updated';
    params: {
        uri: string;
    };
}
export interface ReloadStats {
    totalReloads: number;
    lastReloadTime: Date | null;
    reasonCounts: Record<string, number>;
    cooldownMs: number;
    canReloadNow: boolean;
}
export declare class ClaudeMdReloader {
    private static readonly MAX_HISTORY_SIZE;
    private reloadHistory;
    private lastReloadTime;
    private cooldownMs;
    private isRecording;
    private pendingRecords;
    constructor(cooldownMs?: number);
    generateReloadRequest(): ResourceUpdateRequest;
    canReload(): boolean;
    recordReload(record: ReloadRecord): void;
    private processRecordUnsafe;
    getReloadHistory(): ReloadRecord[];
    getStats(): ReloadStats;
}
//# sourceMappingURL=ClaudeMdReloader.d.ts.map