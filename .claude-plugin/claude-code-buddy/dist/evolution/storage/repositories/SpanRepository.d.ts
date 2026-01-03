import Database from 'better-sqlite3';
import type { Span, SpanQuery } from '../types';
export declare class SpanRepository {
    private db;
    constructor(db: Database.Database);
    recordSpan(span: Span): Promise<void>;
    recordSpanBatch(spans: Span[]): Promise<void>;
    querySpans(query: SpanQuery): Promise<Span[]>;
    getSpan(spanId: string): Promise<Span | null>;
    getSpansByTrace(traceId: string): Promise<Span[]>;
    getChildSpans(parentSpanId: string): Promise<Span[]>;
    private rowToSpan;
}
//# sourceMappingURL=SpanRepository.d.ts.map