import { validateSpan } from '../validation';
import { safeJsonParse } from '../../../utils/json.js';
import { ValidationError } from '../../../errors/index.js';
export class SpanRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async recordSpan(span) {
        validateSpan(span);
        const stmt = this.db.prepare(`
      INSERT INTO spans (
        span_id, trace_id, parent_span_id, task_id, execution_id,
        name, kind, start_time, end_time, duration_ms,
        status_code, status_message,
        attributes, resource, links, tags, events
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(span.span_id, span.trace_id, span.parent_span_id || null, span.task_id, span.execution_id, span.name, span.kind, span.start_time, span.end_time || null, span.duration_ms || null, span.status.code, span.status.message || null, JSON.stringify(span.attributes), JSON.stringify(span.resource), span.links ? JSON.stringify(span.links) : null, span.tags ? JSON.stringify(span.tags) : null, span.events ? JSON.stringify(span.events) : null);
    }
    async recordSpanBatch(spans) {
        const insertMany = this.db.transaction((spans) => {
            for (const span of spans) {
                this.recordSpan(span);
            }
        });
        insertMany(spans);
    }
    async querySpans(query) {
        let sql = 'SELECT * FROM spans WHERE 1=1';
        const params = [];
        if (query.task_id) {
            sql += ' AND task_id = ?';
            params.push(query.task_id);
        }
        if (query.execution_id) {
            sql += ' AND execution_id = ?';
            params.push(query.execution_id);
        }
        if (query.trace_id) {
            sql += ' AND trace_id = ?';
            params.push(query.trace_id);
        }
        if (query.span_id) {
            sql += ' AND span_id = ?';
            params.push(query.span_id);
        }
        if (query.status_code) {
            sql += ' AND status_code = ?';
            params.push(query.status_code);
        }
        if (query.start_time_gte) {
            sql += ' AND start_time >= ?';
            params.push(query.start_time_gte);
        }
        if (query.start_time_lte) {
            sql += ' AND start_time <= ?';
            params.push(query.start_time_lte);
        }
        if (query.end_time_gte) {
            sql += ' AND end_time >= ?';
            params.push(query.end_time_gte);
        }
        if (query.end_time_lte) {
            sql += ' AND end_time <= ?';
            params.push(query.end_time_lte);
        }
        const ALLOWED_SORT_COLUMNS = [
            'start_time', 'duration_ms', 'status_code', 'name', 'kind',
            'end_time', 'span_id', 'trace_id', 'task_id', 'execution_id'
        ];
        const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];
        if (query.sort_by) {
            if (!ALLOWED_SORT_COLUMNS.includes(query.sort_by)) {
                throw new ValidationError(`Invalid sort column: ${query.sort_by}. Allowed: ${ALLOWED_SORT_COLUMNS.join(', ')}`, {
                    component: 'SpanRepository',
                    method: 'querySpans',
                    providedValue: query.sort_by,
                    allowedValues: ALLOWED_SORT_COLUMNS,
                    constraint: 'sort_by must be one of allowed columns',
                });
            }
            sql += ` ORDER BY ${query.sort_by}`;
            if (query.sort_order) {
                const upperOrder = query.sort_order.toUpperCase();
                if (!ALLOWED_SORT_ORDERS.includes(upperOrder)) {
                    throw new ValidationError(`Invalid sort order: ${query.sort_order}. Allowed: ASC, DESC`, {
                        component: 'SpanRepository',
                        method: 'querySpans',
                        providedValue: query.sort_order,
                        allowedValues: ALLOWED_SORT_ORDERS,
                        constraint: 'sort_order must be ASC or DESC',
                    });
                }
                sql += ` ${upperOrder}`;
            }
        }
        else {
            sql += ' ORDER BY start_time DESC';
        }
        if (query.limit) {
            sql += ' LIMIT ?';
            params.push(query.limit);
        }
        if (query.offset) {
            sql += ' OFFSET ?';
            params.push(query.offset);
        }
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        const spans = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            spans[i] = this.rowToSpan(rows[i]);
        }
        return spans;
    }
    async getSpan(spanId) {
        const stmt = this.db.prepare('SELECT * FROM spans WHERE span_id = ?');
        const row = stmt.get(spanId);
        if (!row)
            return null;
        return this.rowToSpan(row);
    }
    async getSpansByTrace(traceId) {
        const stmt = this.db.prepare('SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC');
        const rows = stmt.all(traceId);
        const spans = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            spans[i] = this.rowToSpan(rows[i]);
        }
        return spans;
    }
    async getChildSpans(parentSpanId) {
        const stmt = this.db.prepare('SELECT * FROM spans WHERE parent_span_id = ? ORDER BY start_time ASC');
        const rows = stmt.all(parentSpanId);
        const spans = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            spans[i] = this.rowToSpan(rows[i]);
        }
        return spans;
    }
    rowToSpan(row) {
        return {
            trace_id: row.trace_id,
            span_id: row.span_id,
            parent_span_id: row.parent_span_id ?? undefined,
            task_id: row.task_id,
            execution_id: row.execution_id,
            name: row.name,
            kind: row.kind,
            start_time: row.start_time,
            end_time: row.end_time ?? undefined,
            duration_ms: row.duration_ms ?? undefined,
            status: {
                code: row.status_code,
                message: row.status_message ?? undefined,
            },
            attributes: safeJsonParse(row.attributes, {}),
            resource: safeJsonParse(row.resource, { 'task.id': '', 'execution.id': '', 'execution.attempt': 0 }),
            links: safeJsonParse(row.links, undefined),
            tags: safeJsonParse(row.tags, undefined),
            events: safeJsonParse(row.events, undefined),
        };
    }
}
//# sourceMappingURL=SpanRepository.js.map