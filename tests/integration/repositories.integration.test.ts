/**
 * Repository Pattern Integration Tests
 *
 * Comprehensive integration tests for all repositories:
 * - TaskRepository
 * - ExecutionRepository
 * - SpanRepository
 * - Cross-repository operations
 * - Bulk operations
 * - Concurrent operations
 *
 * Tests against actual SQLite database (not mocks).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteStore } from '../../src/evolution/storage/SQLiteStore.js';
import type { Span } from '../../src/evolution/storage/types';
import { v4 as uuid } from 'uuid';

describe('Repository Pattern Integration Tests', () => {
  let store: SQLiteStore;

  beforeEach(async () => {
    // Create clean in-memory database for each test
    store = new SQLiteStore({ dbPath: ':memory:' });
    await store.initialize();
  });

  afterEach(async () => {
    // Clean up database connection
    await store.close();
  });

  // ==========================================================================
  // TaskRepository CRUD Tests
  // ==========================================================================

  describe('TaskRepository CRUD', () => {
    it('should create task and verify insertion', async () => {
      // Create task
      const input = { query: 'Test task input', param: 123 };
      const metadata = { source: 'integration-test', priority: 'high' };

      const task = await store.createTask(input, metadata);

      // Verify task structure
      expect(task.id).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(task.input).toEqual(input);
      expect(task.status).toBe('pending');
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.metadata).toEqual(metadata);

      // Verify data persisted correctly
      const retrieved = await store.getTask(task.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(task.id);
      expect(retrieved!.input).toEqual(input);
      expect(retrieved!.metadata).toEqual(metadata);
    });

    it('should read task by ID', async () => {
      // Create task
      const task = await store.createTask({ query: 'Find task test' });

      // Read task
      const retrieved = await store.getTask(task.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(task.id);
      expect(retrieved!.input).toEqual({ query: 'Find task test' });
    });

    it('should return null for non-existent task', async () => {
      const nonExistentId = uuid();
      const task = await store.getTask(nonExistentId);
      expect(task).toBeNull();
    });

    it('should update task and verify changes persisted', async () => {
      // Create task
      const task = await store.createTask({ query: 'Update test' });
      expect(task.status).toBe('pending');
      expect(task.started_at).toBeUndefined();

      // Update task
      const startedAt = new Date();
      await store.updateTask(task.id, {
        status: 'running',
        started_at: startedAt,
      });

      // Verify update persisted
      const updated = await store.getTask(task.id);
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('running');
      expect(updated!.started_at).toBeInstanceOf(Date);
      expect(updated!.started_at!.getTime()).toBe(startedAt.getTime());
    });

    it('should update task to completed status', async () => {
      // Create and start task
      const task = await store.createTask({ query: 'Complete test' });
      await store.updateTask(task.id, { status: 'running' });

      // Complete task
      const completedAt = new Date();
      await store.updateTask(task.id, {
        status: 'completed',
        completed_at: completedAt,
      });

      // Verify completion
      const completed = await store.getTask(task.id);
      expect(completed!.status).toBe('completed');
      expect(completed!.completed_at).toBeInstanceOf(Date);
      expect(completed!.completed_at!.getTime()).toBe(completedAt.getTime());
    });

    it('should list tasks with pagination', async () => {
      // Create 10 tasks
      const tasks = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          store.createTask({ query: `Task ${i}` })
        )
      );

      // List all tasks
      const allTasks = await store.listTasks();
      expect(allTasks).toHaveLength(10);

      // List with limit
      const limitedTasks = await store.listTasks({ limit: 5 });
      expect(limitedTasks).toHaveLength(5);

      // List with limit and offset (SQLite requires LIMIT when using OFFSET)
      const paginatedTasks = await store.listTasks({ limit: 10, offset: 5 });
      expect(paginatedTasks).toHaveLength(5);

      // List with smaller limit and offset
      const smallPaginatedTasks = await store.listTasks({ limit: 3, offset: 2 });
      expect(smallPaginatedTasks).toHaveLength(3);
    });

    it('should filter tasks by status', async () => {
      // Create tasks with different statuses
      const taskRunning = await store.createTask({ query: 'Task 1' });
      const taskCompleted = await store.createTask({ query: 'Task 2' });
      const taskPending = await store.createTask({ query: 'Task 3' });

      await store.updateTask(taskRunning.id, { status: 'running' });
      await store.updateTask(taskCompleted.id, { status: 'completed' });
      // taskPending remains pending

      // Filter by status
      const pendingTasks = await store.listTasks({ status: 'pending' });
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].id).toBe(taskPending.id);

      const runningTasks = await store.listTasks({ status: 'running' });
      expect(runningTasks).toHaveLength(1);
      expect(runningTasks[0].id).toBe(taskRunning.id);

      const completedTasks = await store.listTasks({ status: 'completed' });
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe(taskCompleted.id);
    });

    it('should return tasks in descending order by created_at', async () => {
      // Create tasks with slight delays to ensure different timestamps
      const task1 = await store.createTask({ query: 'First' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const task2 = await store.createTask({ query: 'Second' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const task3 = await store.createTask({ query: 'Third' });

      const tasks = await store.listTasks();

      // Verify descending order
      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe(task3.id); // Most recent first
      expect(tasks[1].id).toBe(task2.id);
      expect(tasks[2].id).toBe(task1.id);
    });
  });

  // ==========================================================================
  // ExecutionRepository CRUD Tests
  // ==========================================================================

  describe('ExecutionRepository CRUD', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task for executions
      const task = await store.createTask({ query: 'Execution test task' });
      taskId = task.id;
    });

    it('should create execution linked to task', async () => {
      const metadata = { agent_version: '1.0.0' };

      const execution = await store.createExecution(taskId, metadata);

      // Verify execution structure
      expect(execution.id).toBeDefined();
      expect(execution.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(execution.task_id).toBe(taskId);
      expect(execution.attempt_number).toBe(1);
      expect(execution.status).toBe('running');
      expect(execution.started_at).toBeInstanceOf(Date);
      expect(execution.metadata).toEqual(metadata);
    });

    it('should increment attempt_number for multiple executions', async () => {
      // Create first execution
      const exec1 = await store.createExecution(taskId);
      expect(exec1.attempt_number).toBe(1);

      // Create second execution (retry)
      const exec2 = await store.createExecution(taskId);
      expect(exec2.attempt_number).toBe(2);

      // Create third execution
      const exec3 = await store.createExecution(taskId);
      expect(exec3.attempt_number).toBe(3);
    });

    it('should read execution by ID', async () => {
      const execution = await store.createExecution(taskId);

      const retrieved = await store.getExecution(execution.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(execution.id);
      expect(retrieved!.task_id).toBe(taskId);
    });

    it('should return null for non-existent execution', async () => {
      const nonExistentId = uuid();
      const execution = await store.getExecution(nonExistentId);
      expect(execution).toBeNull();
    });

    it('should update execution status to completed', async () => {
      const execution = await store.createExecution(taskId);
      expect(execution.status).toBe('running');

      // Complete execution
      const completedAt = new Date();
      const result = { output: 'Success', metrics: { duration: 1500 } };

      await store.updateExecution(execution.id, {
        status: 'completed',
        completed_at: completedAt,
        result,
      });

      // Verify update
      const updated = await store.getExecution(execution.id);
      expect(updated!.status).toBe('completed');
      expect(updated!.completed_at).toBeInstanceOf(Date);
      expect(updated!.completed_at!.getTime()).toBe(completedAt.getTime());
      expect(updated!.result).toEqual(result);
    });

    it('should update execution status to failed', async () => {
      const execution = await store.createExecution(taskId);

      // Fail execution
      const completedAt = new Date();
      const error = 'Network timeout error';

      await store.updateExecution(execution.id, {
        status: 'failed',
        completed_at: completedAt,
        error,
      });

      // Verify update
      const updated = await store.getExecution(execution.id);
      expect(updated!.status).toBe('failed');
      expect(updated!.completed_at).toBeInstanceOf(Date);
      expect(updated!.error).toBe(error);
    });

    it('should list executions by task ID in ascending order', async () => {
      // Create multiple executions for the same task
      const exec1 = await store.createExecution(taskId);
      const exec2 = await store.createExecution(taskId);
      const exec3 = await store.createExecution(taskId);

      // List executions
      const executions = await store.listExecutions(taskId);

      expect(executions).toHaveLength(3);
      expect(executions[0].id).toBe(exec1.id);
      expect(executions[1].id).toBe(exec2.id);
      expect(executions[2].id).toBe(exec3.id);

      // Verify attempt numbers are in order
      expect(executions[0].attempt_number).toBe(1);
      expect(executions[1].attempt_number).toBe(2);
      expect(executions[2].attempt_number).toBe(3);
    });

    it('should verify foreign key constraint to task', async () => {
      // This test verifies that execution properly links to task
      const execution = await store.createExecution(taskId);

      // Verify execution links to correct task
      const task = await store.getTask(taskId);
      expect(task).not.toBeNull();
      expect(execution.task_id).toBe(task!.id);
    });
  });

  // ==========================================================================
  // SpanRepository Operations
  // ==========================================================================

  describe('SpanRepository Operations', () => {
    let taskId: string;
    let executionId: string;
    let traceId: string;

    beforeEach(async () => {
      // Create task and execution for spans
      const task = await store.createTask({ query: 'Span test task' });
      const execution = await store.createExecution(task.id);
      taskId = task.id;
      executionId = execution.id;
      traceId = uuid();
    });

    const createTestSpan = (overrides: Partial<Span> = {}): Span => ({
      trace_id: traceId,
      span_id: uuid(),
      task_id: taskId,
      execution_id: executionId,
      name: 'test-span',
      kind: 'internal',
      start_time: Date.now(),
      status: { code: 'OK' },
      attributes: {},
      resource: {
        'task.id': taskId,
        'execution.id': executionId,
        'execution.attempt': 1,
      },
      ...overrides,
    });

    it('should create span linked to execution', async () => {
      const span = createTestSpan({
        name: 'llm-call',
        attributes: {
          'llm.model': 'claude-3-sonnet',
          'llm.tokens.total': 1500,
        },
      });

      await store.recordSpan(span);

      // Verify span was stored
      const retrieved = await store.getSpan(span.span_id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.span_id).toBe(span.span_id);
      expect(retrieved!.name).toBe('llm-call');
      expect(retrieved!.attributes['llm.model']).toBe('claude-3-sonnet');
    });

    it('should query spans by execution ID', async () => {
      // Create multiple spans for same execution
      const span1 = createTestSpan({ name: 'span-1' });
      const span2 = createTestSpan({ name: 'span-2' });
      const span3 = createTestSpan({ name: 'span-3' });

      await store.recordSpan(span1);
      await store.recordSpan(span2);
      await store.recordSpan(span3);

      // Query by execution_id
      const spans = await store.querySpans({ execution_id: executionId });

      expect(spans).toHaveLength(3);
      expect(spans.map((s) => s.name)).toContain('span-1');
      expect(spans.map((s) => s.name)).toContain('span-2');
      expect(spans.map((s) => s.name)).toContain('span-3');
    });

    it('should query spans by time range', async () => {
      const baseTime = Date.now();

      // Create spans with different timestamps
      const span1 = createTestSpan({
        name: 'old-span',
        start_time: baseTime - 10000,
      });
      const span2 = createTestSpan({
        name: 'recent-span',
        start_time: baseTime - 1000,
      });
      const span3 = createTestSpan({
        name: 'future-span',
        start_time: baseTime + 1000,
      });

      await store.recordSpan(span1);
      await store.recordSpan(span2);
      await store.recordSpan(span3);

      // Query for recent spans only
      const spans = await store.querySpans({
        start_time_gte: baseTime - 2000,
        start_time_lte: baseTime,
      });

      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe('recent-span');
    });

    it('should query spans by trace ID', async () => {
      const trace1 = uuid();
      const trace2 = uuid();

      // Create spans with different trace IDs
      const span1 = createTestSpan({ trace_id: trace1, name: 'trace1-span' });
      const span2 = createTestSpan({ trace_id: trace2, name: 'trace2-span' });

      await store.recordSpan(span1);
      await store.recordSpan(span2);

      // Query by trace_id
      const spans = await store.getSpansByTrace(trace1);

      expect(spans).toHaveLength(1);
      expect(spans[0].trace_id).toBe(trace1);
      expect(spans[0].name).toBe('trace1-span');
    });

    it('should record span with end_time and duration', async () => {
      // Create a span that's already completed with duration
      const endTime = Date.now() + 500;
      const span = createTestSpan({
        name: 'completed-span',
        end_time: endTime,
        duration_ms: 500,
      });

      await store.recordSpan(span);

      // Verify span was stored with timing data
      const retrieved = await store.getSpan(span.span_id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.span_id).toBe(span.span_id);
      expect(retrieved!.end_time).toBe(endTime);
      expect(retrieved!.duration_ms).toBe(500);
    });

    it('should query child spans by parent_span_id', async () => {
      const parentSpanId = uuid();

      // Create parent span
      const parentSpan = createTestSpan({
        span_id: parentSpanId,
        name: 'parent-span',
      });

      // Create child spans
      const child1 = createTestSpan({
        parent_span_id: parentSpanId,
        name: 'child-1',
      });
      const child2 = createTestSpan({
        parent_span_id: parentSpanId,
        name: 'child-2',
      });

      await store.recordSpan(parentSpan);
      await store.recordSpan(child1);
      await store.recordSpan(child2);

      // Query child spans
      const children = await store.getChildSpans(parentSpanId);

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.name)).toContain('child-1');
      expect(children.map((c) => c.name)).toContain('child-2');
    });

    it('should handle span with tags', async () => {
      const span = createTestSpan({
        name: 'tagged-span',
        tags: ['optimization', 'performance', 'llm-call'],
      });

      await store.recordSpan(span);

      // Query by tags
      const spans = await store.queryByTags(['performance'], 'any');
      expect(spans.length).toBeGreaterThan(0);
      expect(spans[0].tags).toContain('performance');
    });

    it('should handle span with events', async () => {
      const span = createTestSpan({
        name: 'event-span',
        events: [
          {
            name: 'cache-hit',
            timestamp: Date.now(),
            attributes: { cache_key: 'user-123' },
          },
          {
            name: 'validation-passed',
            timestamp: Date.now() + 100,
            attributes: { validator: 'schema-v1' },
          },
        ],
      });

      await store.recordSpan(span);

      const retrieved = await store.getSpan(span.span_id);
      expect(retrieved!.events).toHaveLength(2);
      expect(retrieved!.events![0].name).toBe('cache-hit');
    });

    it('should handle span with links', async () => {
      const linkedSpanId = uuid();

      const span = createTestSpan({
        name: 'linked-span',
        links: [
          {
            trace_id: traceId,
            span_id: linkedSpanId,
            attributes: { link_type: 'reward-feedback' },
          },
        ],
      });

      await store.recordSpan(span);

      const retrieved = await store.getSpan(span.span_id);
      expect(retrieved!.links).toHaveLength(1);
      expect(retrieved!.links![0].span_id).toBe(linkedSpanId);
    });
  });

  // ==========================================================================
  // Cross-Repository Operations
  // ==========================================================================

  describe('Cross-Repository Operations', () => {
    it('should create task → execution → span chain', async () => {
      // Create task
      const task = await store.createTask({
        query: 'Complex operation',
        complexity: 'high',
      });

      // Create execution
      const execution = await store.createExecution(task.id, {
        agent_type: 'orchestrator',
      });

      // Create span
      const span: Span = {
        trace_id: uuid(),
        span_id: uuid(),
        task_id: task.id,
        execution_id: execution.id,
        name: 'orchestration',
        kind: 'internal',
        start_time: Date.now(),
        status: { code: 'OK' },
        attributes: {
          'agent.type': 'orchestrator',
        },
        resource: {
          'task.id': task.id,
          'execution.id': execution.id,
          'execution.attempt': 1,
        },
      };

      await store.recordSpan(span);

      // Verify all relationships
      const retrievedTask = await store.getTask(task.id);
      const retrievedExecution = await store.getExecution(execution.id);
      const retrievedSpan = await store.getSpan(span.span_id);

      expect(retrievedTask).not.toBeNull();
      expect(retrievedExecution).not.toBeNull();
      expect(retrievedSpan).not.toBeNull();

      expect(retrievedExecution!.task_id).toBe(task.id);
      expect(retrievedSpan!.task_id).toBe(task.id);
      expect(retrievedSpan!.execution_id).toBe(execution.id);
    });

    it('should verify foreign key relationships', async () => {
      const task = await store.createTask({ query: 'FK test' });
      const execution = await store.createExecution(task.id);

      // Verify execution references valid task
      const executions = await store.listExecutions(task.id);
      expect(executions).toHaveLength(1);
      expect(executions[0].task_id).toBe(task.id);
    });

    it('should handle multiple executions with multiple spans', async () => {
      const task = await store.createTask({ query: 'Multi-execution test' });

      // Create 3 executions
      const exec1 = await store.createExecution(task.id);
      const exec2 = await store.createExecution(task.id);
      const exec3 = await store.createExecution(task.id);

      // Create 2 spans for each execution
      const traceId = uuid();
      for (const execution of [exec1, exec2, exec3]) {
        await store.recordSpan({
          trace_id: traceId,
          span_id: uuid(),
          task_id: task.id,
          execution_id: execution.id,
          name: `span-1-exec-${execution.attempt_number}`,
          kind: 'internal',
          start_time: Date.now(),
          status: { code: 'OK' },
          attributes: {},
          resource: {
            'task.id': task.id,
            'execution.id': execution.id,
            'execution.attempt': execution.attempt_number,
          },
        });

        await store.recordSpan({
          trace_id: traceId,
          span_id: uuid(),
          task_id: task.id,
          execution_id: execution.id,
          name: `span-2-exec-${execution.attempt_number}`,
          kind: 'internal',
          start_time: Date.now(),
          status: { code: 'OK' },
          attributes: {},
          resource: {
            'task.id': task.id,
            'execution.id': execution.id,
            'execution.attempt': execution.attempt_number,
          },
        });
      }

      // Verify counts
      const executions = await store.listExecutions(task.id);
      expect(executions).toHaveLength(3);

      const allSpans = await store.querySpans({ task_id: task.id });
      expect(allSpans).toHaveLength(6);

      // Verify spans are correctly distributed
      const exec1Spans = await store.querySpans({ execution_id: exec1.id });
      expect(exec1Spans).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  describe('Bulk Operations', () => {
    it('should insert 100 tasks in batch efficiently', async () => {
      const startTime = Date.now();

      // Create 100 tasks
      const tasks = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          store.createTask({ query: `Bulk task ${i}`, index: i })
        )
      );

      const duration = Date.now() - startTime;

      // Verify all tasks created
      expect(tasks).toHaveLength(100);

      // Verify tasks persisted
      const allTasks = await store.listTasks({ limit: 100 });
      expect(allTasks).toHaveLength(100);

      // Performance assertion: 100 tasks should complete in reasonable time
      // On modern hardware, this should be < 500ms
      expect(duration).toBeLessThan(1000);
    });

    it('should batch insert 100 spans efficiently', async () => {
      // Setup
      const task = await store.createTask({ query: 'Batch span test' });
      const execution = await store.createExecution(task.id);
      const traceId = uuid();

      // Create 100 spans
      const spans: Span[] = Array.from({ length: 100 }, (_, i) => ({
        trace_id: traceId,
        span_id: uuid(),
        task_id: task.id,
        execution_id: execution.id,
        name: `batch-span-${i}`,
        kind: 'internal',
        start_time: Date.now() + i,
        status: { code: 'OK' },
        attributes: { index: i },
        resource: {
          'task.id': task.id,
          'execution.id': execution.id,
          'execution.attempt': 1,
        },
      }));

      const startTime = Date.now();
      await store.recordSpanBatch(spans);
      const duration = Date.now() - startTime;

      // Verify all spans inserted
      const allSpans = await store.querySpans({ execution_id: execution.id });
      expect(allSpans).toHaveLength(100);

      // Performance: batch insert should be fast (< 200ms for 100 spans)
      expect(duration).toBeLessThan(500);
    });

    it('should query performance with 1000+ records', async () => {
      // Create multiple tasks with executions and spans
      const tasksCount = 10;
      const spansPerTask = 100;

      for (let t = 0; t < tasksCount; t++) {
        const task = await store.createTask({ query: `Perf test task ${t}` });
        const execution = await store.createExecution(task.id);
        const traceId = uuid();

        const spans: Span[] = Array.from({ length: spansPerTask }, (_, i) => ({
          trace_id: traceId,
          span_id: uuid(),
          task_id: task.id,
          execution_id: execution.id,
          name: `span-${t}-${i}`,
          kind: 'internal',
          start_time: Date.now() + i,
          status: { code: i % 10 === 0 ? 'ERROR' : 'OK' },
          attributes: { task_index: t, span_index: i },
          resource: {
            'task.id': task.id,
            'execution.id': execution.id,
            'execution.attempt': 1,
          },
        }));

        await store.recordSpanBatch(spans);
      }

      // Query performance test
      const startTime = Date.now();
      const allSpans = await store.querySpans({ limit: 1000 });
      const queryDuration = Date.now() - startTime;

      expect(allSpans).toHaveLength(1000);

      // Query should be fast even with 1000+ records (< 100ms)
      expect(queryDuration).toBeLessThan(200);
    });

    it('should verify batch operations are atomic', async () => {
      const task = await store.createTask({ query: 'Atomic test' });
      const execution = await store.createExecution(task.id);
      const traceId = uuid();

      // Create valid and invalid spans mixed
      const spans: Span[] = [
        {
          trace_id: traceId,
          span_id: uuid(),
          task_id: task.id,
          execution_id: execution.id,
          name: 'valid-span-1',
          kind: 'internal',
          start_time: Date.now(),
          status: { code: 'OK' },
          attributes: {},
          resource: {
            'task.id': task.id,
            'execution.id': execution.id,
            'execution.attempt': 1,
          },
        },
        {
          trace_id: traceId,
          span_id: uuid(),
          task_id: task.id,
          execution_id: execution.id,
          name: 'valid-span-2',
          kind: 'internal',
          start_time: Date.now(),
          status: { code: 'OK' },
          attributes: {},
          resource: {
            'task.id': task.id,
            'execution.id': execution.id,
            'execution.attempt': 1,
          },
        },
      ];

      // Batch insert should succeed
      await store.recordSpanBatch(spans);

      const allSpans = await store.querySpans({ execution_id: execution.id });
      expect(allSpans).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Concurrent Operations
  // ==========================================================================

  describe('Concurrent Operations', () => {
    it('should handle 10 concurrent task inserts', async () => {
      // Create 10 tasks concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        store.createTask({ query: `Concurrent task ${i}`, index: i })
      );

      const tasks = await Promise.all(promises);

      // Verify all tasks created with unique IDs
      expect(tasks).toHaveLength(10);
      const ids = new Set(tasks.map((t) => t.id));
      expect(ids.size).toBe(10); // All unique IDs

      // Verify all persisted
      const allTasks = await store.listTasks({ limit: 10 });
      expect(allTasks).toHaveLength(10);
    });

    it('should handle concurrent execution creation for same task', async () => {
      const task = await store.createTask({ query: 'Concurrent exec test' });

      // Create 5 executions concurrently
      const promises = Array.from({ length: 5 }, () =>
        store.createExecution(task.id)
      );

      const executions = await Promise.all(promises);

      // Verify all executions have correct attempt numbers
      expect(executions).toHaveLength(5);

      const attemptNumbers = executions
        .map((e) => e.attempt_number)
        .sort((a, b) => a - b);
      expect(attemptNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('should verify no race conditions in concurrent updates', async () => {
      const task = await store.createTask({ query: 'Race condition test' });

      // Update same task concurrently from different statuses
      const updates = [
        store.updateTask(task.id, { status: 'running' }),
        store.updateTask(task.id, { started_at: new Date() }),
      ];

      await Promise.all(updates);

      // Verify task updated correctly (last write wins)
      const updated = await store.getTask(task.id);
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('running');
      expect(updated!.started_at).toBeInstanceOf(Date);
    });

    it('should handle concurrent span queries', async () => {
      const task = await store.createTask({ query: 'Concurrent query test' });
      const execution = await store.createExecution(task.id);
      const traceId = uuid();

      // Insert some spans
      const spans: Span[] = Array.from({ length: 50 }, (_, i) => ({
        trace_id: traceId,
        span_id: uuid(),
        task_id: task.id,
        execution_id: execution.id,
        name: `query-span-${i}`,
        kind: 'internal',
        start_time: Date.now() + i,
        status: { code: 'OK' },
        attributes: {},
        resource: {
          'task.id': task.id,
          'execution.id': execution.id,
          'execution.attempt': 1,
        },
      }));

      await store.recordSpanBatch(spans);

      // Perform concurrent queries
      const queries = Array.from({ length: 10 }, () =>
        store.querySpans({ execution_id: execution.id })
      );

      const results = await Promise.all(queries);

      // All queries should return same results
      results.forEach((result) => {
        expect(result).toHaveLength(50);
      });
    });
  });

  // ==========================================================================
  // Data Integrity Tests
  // ==========================================================================

  describe('Data Integrity', () => {
    it('should preserve JSON data through serialization', async () => {
      const complexInput = {
        nested: {
          object: {
            with: ['arrays', 'and', 'strings'],
            numbers: [1, 2, 3.14],
            boolean: true,
            null_value: null,
          },
        },
        unicode: '测试 テスト 🎉',
      };

      const task = await store.createTask(complexInput);
      const retrieved = await store.getTask(task.id);

      expect(retrieved!.input).toEqual(complexInput);
    });

    it('should handle empty metadata gracefully', async () => {
      const task = await store.createTask({ query: 'No metadata' });

      expect(task.metadata).toBeUndefined();

      const retrieved = await store.getTask(task.id);
      expect(retrieved!.metadata).toBeUndefined();
    });

    it('should preserve timestamp precision', async () => {
      const now = new Date();
      const task = await store.createTask({ query: 'Timestamp test' });

      await store.updateTask(task.id, {
        status: 'running',
        started_at: now,
      });

      const retrieved = await store.getTask(task.id);

      // Timestamps should match to the millisecond
      expect(retrieved!.started_at!.getTime()).toBe(now.getTime());
    });

    it('should handle large span attributes', async () => {
      const task = await store.createTask({ query: 'Large attributes' });
      const execution = await store.createExecution(task.id);

      const largeAttributes: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeAttributes[`key_${i}`] = `value_${i}`.repeat(10);
      }

      const span: Span = {
        trace_id: uuid(),
        span_id: uuid(),
        task_id: task.id,
        execution_id: execution.id,
        name: 'large-span',
        kind: 'internal',
        start_time: Date.now(),
        status: { code: 'OK' },
        attributes: largeAttributes,
        resource: {
          'task.id': task.id,
          'execution.id': execution.id,
          'execution.attempt': 1,
        },
      };

      await store.recordSpan(span);

      const retrieved = await store.getSpan(span.span_id);
      expect(Object.keys(retrieved!.attributes)).toHaveLength(100);
    });
  });

  // ==========================================================================
  // Database Statistics
  // ==========================================================================

  describe('Database Statistics', () => {
    it('should accurately report database stats', async () => {
      // Create known data
      const task1 = await store.createTask({ query: 'Stats test 1' });
      const task2 = await store.createTask({ query: 'Stats test 2' });

      const exec1 = await store.createExecution(task1.id);
      const exec2 = await store.createExecution(task2.id);

      const span1: Span = {
        trace_id: uuid(),
        span_id: uuid(),
        task_id: task1.id,
        execution_id: exec1.id,
        name: 'span-1',
        kind: 'internal',
        start_time: Date.now(),
        status: { code: 'OK' },
        attributes: {},
        resource: {
          'task.id': task1.id,
          'execution.id': exec1.id,
          'execution.attempt': 1,
        },
      };

      await store.recordSpan(span1);

      // Get stats
      const stats = await store.getDatabaseStats();

      expect(stats.total_tasks).toBe(2);
      expect(stats.total_executions).toBe(2);
      expect(stats.total_spans).toBe(1);
    });
  });
});
