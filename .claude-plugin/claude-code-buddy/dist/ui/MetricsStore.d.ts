import type { SessionMetrics, AttributionMessage } from './types.js';
export declare class MetricsStore {
    private storePath;
    private currentSession;
    constructor(storePath?: string);
    recordAttribution(attribution: AttributionMessage): void;
    getCurrentSessionMetrics(): SessionMetrics;
    persist(): Promise<void>;
    load(): Promise<void>;
    generateDailyReport(date?: Date): Promise<string>;
    exportAsCSV(): Promise<string>;
    private generateSessionId;
}
//# sourceMappingURL=MetricsStore.d.ts.map