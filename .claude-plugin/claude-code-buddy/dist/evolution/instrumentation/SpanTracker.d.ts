import type { EvolutionStore } from '../storage/EvolutionStore.js';
import type { Span, SpanKind, SpanStatus, SpanAttributes, ResourceAttributes, SpanLink, Task, Execution } from '../storage/types.js';
export interface SpanContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
}
export interface StartSpanOptions {
    name: string;
    kind?: SpanKind;
    attributes?: SpanAttributes;
    tags?: string[];
    links?: SpanLink[];
    parentSpan?: ActiveSpan;
}
export declare class ActiveSpan {
    private tracker;
    private context;
    private resource;
    private span;
    private startTime;
    private events;
    constructor(tracker: SpanTracker, options: StartSpanOptions, context: SpanContext, resource: ResourceAttributes);
    setStatus(status: SpanStatus): void;
    setAttributes(attributes: SpanAttributes): void;
    setAttribute(key: string, value: unknown): void;
    addTags(tags: string[]): void;
    addEvent(name: string, attributes?: Record<string, any>): void;
    addLink(link: SpanLink): void;
    end(): Promise<void>;
    getContext(): SpanContext;
    get spanId(): string;
    get traceId(): string;
}
export interface SpanTrackerOptions {
    store: EvolutionStore;
    serviceName?: string;
    serviceVersion?: string;
    environment?: 'dev' | 'staging' | 'production';
}
export declare class SpanTracker {
    private store;
    private currentTask?;
    private currentExecution?;
    private activeSpans;
    private resource;
    constructor(options: SpanTrackerOptions);
    startTask(input: Record<string, any>, metadata?: Record<string, any>): Promise<Task>;
    startExecution(metadata?: Record<string, any>): Promise<Execution>;
    endExecution(result?: Record<string, any>, error?: string): Promise<void>;
    endTask(status: 'completed' | 'failed'): Promise<void>;
    getCurrentTask(): Task | undefined;
    getCurrentExecution(): Execution | undefined;
    startSpan(options: StartSpanOptions): ActiveSpan;
    recordSpan(span: Span): Promise<void>;
    removeActiveSpan(spanId: string): void;
    getActiveSpans(): ActiveSpan[];
    endAllSpans(): Promise<void>;
    setResource(attributes: Partial<ResourceAttributes>): void;
    cleanup(): Promise<void>;
}
export declare function setGlobalTracker(tracker: SpanTracker): void;
export declare function getGlobalTracker(): SpanTracker;
//# sourceMappingURL=SpanTracker.d.ts.map