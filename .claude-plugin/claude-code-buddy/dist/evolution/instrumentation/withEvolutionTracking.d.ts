import { SpanTracker } from './SpanTracker.js';
import type { SpanAttributes } from '../storage/types.js';
import type { TelemetryCollector } from '../../telemetry/TelemetryCollector.js';
export interface TrackingOptions {
    tracker?: SpanTracker;
    autoTags?: string[];
    sampleRate?: number;
    extractAttributes?: (input: unknown) => SpanAttributes;
    extractOutputAttributes?: (output: unknown) => SpanAttributes;
    spanName?: string;
    telemetryCollector?: TelemetryCollector;
}
export declare function withEvolutionTracking<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, options?: TrackingOptions): T;
export declare function withEvolutionTrackingForAgent<T extends Record<string, any>>(agent: T, options?: TrackingOptions): T;
export declare function trackClass<T extends new (...args: any[]) => any>(constructor: T, options?: TrackingOptions): T;
export declare function extractTaskType(input: unknown): string | undefined;
export declare function extractSkillName(input: unknown): string | undefined;
export declare function createStandardAttributeExtractor(): (input: unknown) => SpanAttributes;
//# sourceMappingURL=withEvolutionTracking.d.ts.map