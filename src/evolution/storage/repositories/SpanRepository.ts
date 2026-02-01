import Database from 'better-sqlite3';
import { validateSpan } from '../validation';
import { safeJsonParse } from '../../../utils/json.js';
import { ValidationError } from '../../../errors/index.js';
import type { Span, SpanQuery, SpanRow, SQLParams } from '../types';

/**
 * ✅ FIX CRITICAL-1: SQL injection protection constants
 * Moved to module level for type safety and reusability
 */
const ALLOWED_SORT_COLUMNS = [
  'start_time',
  'duration_ms',
  'status_code',
  'name',
  'kind',
  'end_time',
  'span_id',
  'trace_id',
  'task_id',
  'execution_id',
] as const;

const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'] as const;

type AllowedSortColumn = (typeof ALLOWED_SORT_COLUMNS)[number];
type AllowedSortOrder = (typeof ALLOWED_SORT_ORDERS)[number];

/**
 * ✅ FIX CRITICAL-1: Type-safe SQL sort parameter validation
 * Returns validated column name or throws ValidationError
 */
function validateSortColumn(column: string): AllowedSortColumn {
  if (!ALLOWED_SORT_COLUMNS.includes(column as AllowedSortColumn)) {
    throw new ValidationError(
      `Invalid sort column: ${column}. Allowed: ${ALLOWED_SORT_COLUMNS.join(', ')}`,
      {
        component: 'SpanRepository',
        method: 'validateSortColumn',
        providedValue: column,
        allowedValues: ALLOWED_SORT_COLUMNS as unknown as string[],
        constraint: 'sort_by must be one of allowed columns',
      }
    );
  }
  return column as AllowedSortColumn;
}

/**
 * ✅ FIX CRITICAL-1: Type-safe SQL sort order validation
 * Returns validated sort order or throws ValidationError
 */
function validateSortOrder(order: string): AllowedSortOrder {
  const upperOrder = order.toUpperCase();
  if (!ALLOWED_SORT_ORDERS.includes(upperOrder as AllowedSortOrder)) {
    throw new ValidationError(`Invalid sort order: ${order}. Allowed: ASC, DESC`, {
      component: 'SpanRepository',
      method: 'validateSortOrder',
      providedValue: order,
      allowedValues: ALLOWED_SORT_ORDERS as unknown as string[],
      constraint: 'sort_order must be ASC or DESC',
    });
  }
  return upperOrder as AllowedSortOrder;
}

/**
 * Span Repository
 *
 * Handles span CRUD operations and queries.
 * Single Responsibility: Span data persistence and retrieval.
 */
export class SpanRepository {
  constructor(private db: Database.Database) {}

  /**
   * Record a single span to the database
   *
   * @param span - Span to record
   */
  async recordSpan(span: Span): Promise<void> {
    // Validate span before inserting
    validateSpan(span);

    const stmt = this.db.prepare(`
      INSERT INTO spans (
        span_id, trace_id, parent_span_id, task_id, execution_id,
        name, kind, start_time, end_time, duration_ms,
        status_code, status_message,
        attributes, resource, links, tags, events
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      span.span_id,
      span.trace_id,
      span.parent_span_id || null,
      span.task_id,
      span.execution_id,
      span.name,
      span.kind,
      span.start_time,
      span.end_time || null,
      span.duration_ms || null,
      span.status.code,
      span.status.message || null,
      JSON.stringify(span.attributes),
      JSON.stringify(span.resource),
      span.links ? JSON.stringify(span.links) : null,
      span.tags ? JSON.stringify(span.tags) : null,
      span.events ? JSON.stringify(span.events) : null
    );
  }

  /**
   * Record multiple spans in a single transaction
   *
   * ✅ FIX MEDIUM-4: Added batch size limit to prevent DoS
   * Maximum batch size is 1000 spans to prevent memory exhaustion
   * and transaction timeouts.
   *
   * @param spans - Array of spans to record
   * @throws ValidationError if batch size exceeds maximum
   */
  async recordSpanBatch(spans: Span[]): Promise<void> {
    // ✅ FIX MEDIUM-4: Validate batch size to prevent DoS
    const MAX_BATCH_SIZE = 1000;

    if (spans.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size ${spans.length} exceeds maximum ${MAX_BATCH_SIZE}. ` +
        `Please split into smaller batches.`,
        {
          component: 'SpanRepository',
          method: 'recordSpanBatch',
          providedSize: spans.length,
          maxSize: MAX_BATCH_SIZE,
        }
      );
    }

    const insertMany = this.db.transaction((spans: Span[]) => {
      for (const span of spans) {
        this.recordSpan(span);
      }
    });

    insertMany(spans);
  }

  /**
   * Query spans with flexible filtering
   *
   * @param query - Span query filters
   * @returns Array of matching spans
   */
  async querySpans(query: SpanQuery): Promise<Span[]> {
    let sql = 'SELECT * FROM spans WHERE 1=1';
    const params: SQLParams = [];

    // Identity filters
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

    // Status filters
    if (query.status_code) {
      sql += ' AND status_code = ?';
      params.push(query.status_code);
    }

    // Time filters
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

    // ✅ FIX CRITICAL-1: SQL injection protection with type-safe validation
    // Use validated values explicitly to prevent any injection risk
    if (query.sort_by) {
      const validatedColumn = validateSortColumn(query.sort_by);
      const validatedOrder = query.sort_order
        ? validateSortOrder(query.sort_order)
        : 'ASC';

      // Use validated values (already verified against whitelist)
      sql += ` ORDER BY ${validatedColumn} ${validatedOrder}`;
    } else {
      sql += ' ORDER BY start_time DESC';
    }

    // Pagination
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as SpanRow[];

    // Optimized: Pre-allocate array with known length
    const spans: Span[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      spans[i] = this.rowToSpan(rows[i]);
    }
    return spans;
  }

  async getSpan(spanId: string): Promise<Span | null> {
    const stmt = this.db.prepare('SELECT * FROM spans WHERE span_id = ?');
    const row = stmt.get(spanId) as SpanRow | undefined;
    if (!row) return null;

    return this.rowToSpan(row);
  }

  async getSpansByTrace(traceId: string): Promise<Span[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC'
    );
    const rows = stmt.all(traceId) as SpanRow[];

    // Optimized: Pre-allocate array with known length
    const spans: Span[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      spans[i] = this.rowToSpan(rows[i]);
    }
    return spans;
  }

  async getChildSpans(parentSpanId: string): Promise<Span[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM spans WHERE parent_span_id = ? ORDER BY start_time ASC'
    );
    const rows = stmt.all(parentSpanId) as SpanRow[];

    // Optimized: Pre-allocate array with known length
    const spans: Span[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      spans[i] = this.rowToSpan(rows[i]);
    }
    return spans;
  }

  private rowToSpan(row: SpanRow): Span {
    return {
      trace_id: row.trace_id,
      span_id: row.span_id,
      parent_span_id: row.parent_span_id ?? undefined,
      task_id: row.task_id,
      execution_id: row.execution_id,
      name: row.name,
      kind: row.kind as Span['kind'],
      start_time: row.start_time,
      end_time: row.end_time ?? undefined,
      duration_ms: row.duration_ms ?? undefined,
      status: {
        code: row.status_code as Span['status']['code'],
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
