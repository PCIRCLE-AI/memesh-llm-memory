import { TelemetryStore } from './TelemetryStore.js';
import type { TelemetryEvent } from './types.js';
export declare class TelemetryCollector {
    private store;
    constructor(store: TelemetryStore);
    recordEvent(event: Partial<TelemetryEvent>): Promise<void>;
    isEnabled(): Promise<boolean>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    getStatus(): Promise<{
        enabled: boolean;
        anonymous_id: string;
        local_events_count: number;
        last_sent: Date | null;
    }>;
    clearLocalData(): Promise<void>;
    getLocalPath(): string;
}
//# sourceMappingURL=TelemetryCollector.d.ts.map