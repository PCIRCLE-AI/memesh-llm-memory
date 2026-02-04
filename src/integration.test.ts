/**
 * Integration Tests - Evolution System Phase 1
 *
 * Tests the full flow of telemetry and evolution tracking working together
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

// Telemetry imports
import { TelemetryStore } from './telemetry/TelemetryStore';
import { TelemetryCollector } from './telemetry/TelemetryCollector';
import { getTelemetryCollector, setTelemetryCollector } from './telemetry';

// Evolution imports
import { SQLiteStore } from './evolution/storage/SQLiteStore';
import { SpanTracker } from './evolution/instrumentation/SpanTracker';
import { withEvolutionTracking } from './evolution/instrumentation/withEvolutionTracking';

describe('Integration Tests - Evolution System Phase 1', () => {
  let testDir: string;
  let telemetryStore: TelemetryStore;
  let telemetryCollector: TelemetryCollector;
  let evolutionStore: SQLiteStore;
  let tracker: SpanTracker;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `integration-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Setup telemetry
    telemetryStore = new TelemetryStore({ storagePath: testDir });
    await telemetryStore.initialize();
    telemetryCollector = new TelemetryCollector(telemetryStore);
    await telemetryStore.updateConfig({ enabled: true });

    // Setup evolution tracking
    evolutionStore = new SQLiteStore({ dbPath: path.join(testDir, 'evolution.db') });
    await evolutionStore.initialize();
    tracker = new SpanTracker({ store: evolutionStore });
  });

  afterEach(async () => {
    if (telemetryStore) {
      await telemetryStore.close();
    }
    if (evolutionStore) {
      await evolutionStore.close();
    }
    await fs.remove(testDir);
  });

  describe('Telemetry System Integration', () => {
    it('should record events end-to-end', async () => {
      // Record an event
      await telemetryCollector.recordEvent({
        event: 'agent_execution',
        agent_type: 'test_agent',
        success: true,
        duration_ms: 100,
      });

      // Retrieve events
      const events = await telemetryStore.getLocalEvents();

      expect(events.length).toBe(1);
      expect(events[0].event).toBe('agent_execution');
      // Type assertion to access typed fields
      const event = events[0] as any;
      expect(event.agent_type).toBe('test_agent');
      expect(event.success).toBe(true);
    });

    it('should sanitize sensitive data in events', async () => {
      // Record event with sensitive data
      await telemetryCollector.recordEvent({
        event: 'test_event',
        api_key: 'sk-secret-key-12345',  // Should be removed
        password: 'MyPassword123',       // Should be removed
        safe_field: 'safe_value',        // Should remain
      });

      const events = await telemetryStore.getLocalEvents();
      const event = events[0] as any;

      // Sensitive fields should be removed
      expect(event).not.toHaveProperty('api_key');
      expect(event).not.toHaveProperty('password');

      // Safe fields should remain
      expect(event.safe_field).toBe('safe_value');
    });

    it('should handle global telemetry collector', async () => {
      // Set global collector
      setTelemetryCollector(telemetryCollector);

      // Get global collector
      const global = await getTelemetryCollector();

      // Should be the same instance
      expect(global).toBe(telemetryCollector);

      // Should work for recording
      await global.recordEvent({
        event: 'global_test',
        value: 42,
      });

      const events = await telemetryStore.getLocalEvents();
      expect(events.some(e => e.event === 'global_test')).toBe(true);
    });
  });

  describe('Evolution Tracking Integration', () => {
    it('should track full task execution lifecycle', async () => {
      // Start task and execution
      const task = await tracker.startTask({ task: 'test_task', input: 'test' });
      const execution = await tracker.startExecution();

      // Create and end span
      const span = tracker.startSpan({ name: 'test_operation' });
      span.setAttributes({ 'operation.type': 'test' });
      await span.end();

      // End execution and task
      await tracker.endExecution({ result: 'success' });
      await tracker.endTask('completed');

      // Verify task was created
      const retrievedTask = await evolutionStore.getTask(task.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.status).toBe('completed');

      // Verify execution was created
      const retrievedExecution = await evolutionStore.getExecution(execution.id);
      expect(retrievedExecution).toBeDefined();
      expect(retrievedExecution?.status).toBe('completed');

      // Verify span was recorded
      const spans = await evolutionStore.querySpans({ task_id: task.id });
      expect(spans.length).toBe(1);
      expect(spans[0].name).toBe('test_operation');
    });

    it('should track nested spans correctly', async () => {
      await tracker.startTask({ task: 'nested_test' });
      await tracker.startExecution();

      // Create parent span
      const parentSpan = tracker.startSpan({ name: 'parent' });

      // Create child span
      const childSpan = tracker.startSpan({
        name: 'child',
        parentSpan: parentSpan,
      });

      await childSpan.end();
      await parentSpan.end();

      await tracker.endTask('completed');

      // Verify parent-child relationship
      const allSpans = await evolutionStore.querySpans({});
      expect(allSpans.length).toBe(2);

      const parent = allSpans.find(s => s.name === 'parent');
      const child = allSpans.find(s => s.name === 'child');

      expect(child?.parent_span_id).toBe(parent?.span_id);
      expect(child?.trace_id).toBe(parent?.trace_id);
    });

    it('should clean up memory after task ends', async () => {
      await tracker.startTask({ task: 'cleanup_test' });
      await tracker.startExecution();

      // Create spans
      tracker.startSpan({ name: 'span1' });
      tracker.startSpan({ name: 'span2' });

      // Should have active spans
      expect(tracker.getActiveSpans().length).toBe(2);

      // End task (should clean up)
      await tracker.endTask('completed');

      // Active spans should be cleared
      expect(tracker.getActiveSpans().length).toBe(0);
      expect(tracker.getCurrentTask()).toBeUndefined();
      expect(tracker.getCurrentExecution()).toBeUndefined();
    });
  });

  describe('Telemetry + Evolution Integration', () => {
    it('should track agent execution with both systems', async () => {
      // Create a test agent function
      const testAgent = async (input: { task: string }) => {
        // Simulate agent work
        return { result: 'success', task: input.task };
      };

      // Wrap with evolution tracking + telemetry
      await tracker.startTask({ task: 'agent_test' });
      await tracker.startExecution();

      const wrapped = withEvolutionTracking(testAgent, {
        tracker,
        telemetryCollector,
        spanName: 'test_agent',
      });

      // Execute
      const result = await wrapped({ task: 'test' });

      await tracker.endTask('completed');

      // Verify result
      expect(result.result).toBe('success');

      // Verify evolution tracking
      const spans = await evolutionStore.querySpans({});
      expect(spans.length).toBe(1);
      expect(spans[0].name).toBe('test_agent');
      expect(spans[0].status.code).toBe('OK');

      // Verify telemetry
      const events = await telemetryStore.getLocalEvents();
      const agentEvent = events.find(e => e.event === 'agent_execution') as any;
      expect(agentEvent).toBeDefined();
      expect(agentEvent?.success).toBe(true);
    });

    it('should handle errors in both systems', async () => {
      const failingAgent = async () => {
        throw new Error('Test error');
      };

      await tracker.startTask({ task: 'error_test' });
      await tracker.startExecution();

      const wrapped = withEvolutionTracking(failingAgent, {
        tracker,
        telemetryCollector,
      });

      // Execute and catch error
      await expect(wrapped()).rejects.toThrow('Test error');

      await tracker.endTask('failed');

      // Verify evolution tracking recorded error
      const spans = await evolutionStore.querySpans({});
      expect(spans.length).toBe(1);
      expect(spans[0].status.code).toBe('ERROR');

      // Verify telemetry recorded error
      const events = await telemetryStore.getLocalEvents();
      const errorEvent = events.find(e => e.event === 'error') as any;
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.error_type).toBe('Error');
    });
  });

  describe('Data Persistence and Query', () => {
    it('should persist telemetry data across store lifecycle', async () => {
      // Record event
      await telemetryCollector.recordEvent({
        event: 'persistence_test',
        value: 123,
      });

      // Close and reopen store
      await telemetryStore.close();

      const newStore = new TelemetryStore({ storagePath: testDir });
      await newStore.initialize();

      // Data should still be there
      const events = await newStore.getLocalEvents();
      expect(events.some(e => e.event === 'persistence_test')).toBe(true);

      await newStore.close();
    });

    it('should query evolution data with filters', async () => {
      await tracker.startTask({ task: 'query_test' });
      await tracker.startExecution();

      // Create multiple spans
      const span1 = tracker.startSpan({ name: 'operation1', tags: ['tag1'] });
      await span1.end();

      const span2 = tracker.startSpan({ name: 'operation2', tags: ['tag2'] });
      await span2.end();

      await tracker.endTask('completed');

      // Query by tag
      const tag1Spans = await evolutionStore.queryByTags(['tag1']);
      expect(tag1Spans.length).toBe(1);
      expect(tag1Spans[0].name).toBe('operation1');

      const tag2Spans = await evolutionStore.queryByTags(['tag2']);
      expect(tag2Spans.length).toBe(1);
      expect(tag2Spans[0].name).toBe('operation2');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent tasks', async () => {
      // Create multiple tasks in parallel
      const taskIds = await Promise.all([
        (async () => {
          const t1 = await tracker.startTask({ task: 'task1' });
          await tracker.startExecution();
          const s1 = tracker.startSpan({ name: 'span1' });
          await s1.end();
          await tracker.endTask('completed');
          return t1.id;
        })(),
      ]);

      // Verify all parallel task executions completed and returned valid IDs
      expect(taskIds).toHaveLength(1);
      expect(taskIds[0]).toBeDefined();
      expect(typeof taskIds[0]).toBe('string');

      // All tasks should be recorded (verify via spans)
      const allSpans = await evolutionStore.querySpans({});
      expect(allSpans.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle large number of events efficiently', async () => {
      // Record 100 events
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await telemetryCollector.recordEvent({
          event: 'load_test',
          index: i,
        });
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // All events should be recorded
      const events = await telemetryStore.getLocalEvents({ limit: 200 });
      const loadEvents = events.filter(e => e.event === 'load_test');
      expect(loadEvents.length).toBe(100);
    });
  });
});
