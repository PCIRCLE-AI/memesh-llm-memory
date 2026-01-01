import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { SpanRepository } from '../SpanRepository';
import type { Span } from '../../types';

describe('SpanRepository', () => {
  let db: any;
  let repo: SpanRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create spans table
    db.exec(`
      CREATE TABLE IF NOT EXISTS spans (
        span_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        parent_span_id TEXT,
        task_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_ms INTEGER,
        status_code TEXT NOT NULL,
        status_message TEXT,
        attributes TEXT NOT NULL,
        resource TEXT NOT NULL,
        links TEXT,
        tags TEXT,
        events TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    repo = new SpanRepository(db);
  });

  it('should record span', async () => {
    const span: Span = {
      span_id: 'span-1',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'test-span',
      kind: 'internal',
      start_time: Date.now(),
      status: { code: 'OK' },
      attributes: { test: 'value' },
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    await repo.recordSpan(span);

    const retrieved = await repo.getSpan('span-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.span_id).toBe('span-1');
    expect(retrieved?.name).toBe('test-span');
  });

  it('should record span batch', async () => {
    const spans: Span[] = [
      {
        span_id: 'span-1',
        trace_id: 'trace-1',
        task_id: 'task-1',
        execution_id: 'exec-1',
        name: 'span-1',
        kind: 'internal',
        start_time: Date.now(),
        status: { code: 'OK' },
        attributes: {},
        resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
      },
      {
        span_id: 'span-2',
        trace_id: 'trace-1',
        task_id: 'task-1',
        execution_id: 'exec-1',
        name: 'span-2',
        kind: 'internal',
        start_time: Date.now(),
        status: { code: 'OK' },
        attributes: {},
        resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
      },
    ];

    await repo.recordSpanBatch(spans);

    const span1 = await repo.getSpan('span-1');
    const span2 = await repo.getSpan('span-2');

    expect(span1).toBeDefined();
    expect(span2).toBeDefined();
  });

  it('should query spans with filters', async () => {
    const span1: Span = {
      span_id: 'span-1',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'span-1',
      kind: 'internal',
      start_time: 1000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    const span2: Span = {
      span_id: 'span-2',
      trace_id: 'trace-1',
      task_id: 'task-2',
      execution_id: 'exec-2',
      name: 'span-2',
      kind: 'internal',
      start_time: 2000,
      status: { code: 'ERROR' },
      attributes: {},
      resource: { 'task.id': 'task-2', 'execution.id': 'exec-2', 'execution.attempt': 1 },
    };

    await repo.recordSpan(span1);
    await repo.recordSpan(span2);

    const okSpans = await repo.querySpans({ status_code: 'OK' });
    const taskSpans = await repo.querySpans({ task_id: 'task-1' });

    expect(okSpans).toHaveLength(1);
    expect(okSpans[0].span_id).toBe('span-1');
    expect(taskSpans).toHaveLength(1);
    expect(taskSpans[0].task_id).toBe('task-1');
  });

  it('should get span by id', async () => {
    const span: Span = {
      span_id: 'span-1',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'test-span',
      kind: 'internal',
      start_time: Date.now(),
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    await repo.recordSpan(span);

    const retrieved = await repo.getSpan('span-1');
    expect(retrieved?.span_id).toBe('span-1');

    const notFound = await repo.getSpan('non-existent');
    expect(notFound).toBeNull();
  });

  it('should get spans by trace', async () => {
    const span1: Span = {
      span_id: 'span-1',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'span-1',
      kind: 'internal',
      start_time: 1000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    const span2: Span = {
      span_id: 'span-2',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'span-2',
      kind: 'internal',
      start_time: 2000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    await repo.recordSpan(span1);
    await repo.recordSpan(span2);

    const traceSpans = await repo.getSpansByTrace('trace-1');

    expect(traceSpans).toHaveLength(2);
    expect(traceSpans[0].span_id).toBe('span-1'); // Ordered by start_time
    expect(traceSpans[1].span_id).toBe('span-2');
  });

  it('should get child spans', async () => {
    const parentSpan: Span = {
      span_id: 'parent',
      trace_id: 'trace-1',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'parent',
      kind: 'internal',
      start_time: 1000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    const childSpan1: Span = {
      span_id: 'child-1',
      trace_id: 'trace-1',
      parent_span_id: 'parent',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'child-1',
      kind: 'internal',
      start_time: 2000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    const childSpan2: Span = {
      span_id: 'child-2',
      trace_id: 'trace-1',
      parent_span_id: 'parent',
      task_id: 'task-1',
      execution_id: 'exec-1',
      name: 'child-2',
      kind: 'internal',
      start_time: 3000,
      status: { code: 'OK' },
      attributes: {},
      resource: { 'task.id': 'task-1', 'execution.id': 'exec-1', 'execution.attempt': 1 },
    };

    await repo.recordSpan(parentSpan);
    await repo.recordSpan(childSpan1);
    await repo.recordSpan(childSpan2);

    const children = await repo.getChildSpans('parent');

    expect(children).toHaveLength(2);
    expect(children[0].span_id).toBe('child-1');
    expect(children[1].span_id).toBe('child-2');
  });
});
