import type { TelemetryEvent, TelemetryConfig, EventFilters } from './types';
export interface TelemetryStoreOptions {
    storagePath?: string;
}
export declare class TelemetryStore {
    private db;
    private storagePath;
    private isInitialized;
    constructor(options?: TelemetryStoreOptions);
    initialize(): Promise<void>;
    getConfig(): Promise<TelemetryConfig>;
    updateConfig(updates: Partial<TelemetryConfig>): Promise<void>;
    storeEventLocally(event: TelemetryEvent): Promise<void>;
    getLocalEvents(filters?: EventFilters): Promise<TelemetryEvent[]>;
    archiveSentEvents(): Promise<void>;
    clearLocalData(): Promise<void>;
    getLastSentTime(): Promise<Date | null>;
    close(): Promise<void>;
}
//# sourceMappingURL=TelemetryStore.d.ts.map