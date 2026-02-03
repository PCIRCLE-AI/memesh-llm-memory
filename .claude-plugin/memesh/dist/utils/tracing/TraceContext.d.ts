export interface TraceContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    sampled: boolean;
    baggage?: Record<string, string>;
}
export declare function generateTraceId(): string;
export declare function generateSpanId(): string;
export declare function isValidTraceId(traceId: string): boolean;
export declare function isValidSpanId(spanId: string): boolean;
export declare function parseW3CTraceparent(traceparent: string): Pick<TraceContext, 'traceId' | 'parentSpanId' | 'sampled'> | null;
export declare function formatW3CTraceparent(context: TraceContext): string;
export declare function extractTraceContext(headers: Record<string, string | string[] | undefined>): Partial<TraceContext> | null;
export declare function injectTraceContext(headers: Record<string, string>, context: TraceContext): Record<string, string>;
export declare function createTraceContext(parentContext?: Partial<TraceContext>, sampled?: boolean): TraceContext;
export declare function getTraceContext(): TraceContext | undefined;
export declare function runWithTraceContext<T>(context: TraceContext, callback: () => T): T;
export declare function createChildSpan(spanName?: string): TraceContext;
export declare function withChildSpan<T>(spanName: string, callback: () => T): T;
export declare function withChildSpanAsync<T>(spanName: string, callback: () => Promise<T>): Promise<T>;
export declare function extractTraceTimestamp(traceId: string): number | null;
//# sourceMappingURL=TraceContext.d.ts.map