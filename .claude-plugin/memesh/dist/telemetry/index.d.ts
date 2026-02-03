export { TelemetryStore } from './TelemetryStore.js';
export { TelemetryCollector } from './TelemetryCollector.js';
export { sanitizeEvent, hashStackTrace } from './sanitization.js';
export type * from './types.js';
import { TelemetryCollector } from './TelemetryCollector.js';
export declare function getTelemetryCollector(): Promise<TelemetryCollector>;
export declare function setTelemetryCollector(collector: TelemetryCollector | null): void;
//# sourceMappingURL=index.d.ts.map