export { TelemetryStore } from './TelemetryStore';
export { TelemetryCollector } from './TelemetryCollector';
export { sanitizeEvent, hashStackTrace } from './sanitization';
export type * from './types';
import { TelemetryCollector } from './TelemetryCollector';
export declare function getTelemetryCollector(): Promise<TelemetryCollector>;
export declare function setTelemetryCollector(collector: TelemetryCollector | null): void;
//# sourceMappingURL=index.d.ts.map