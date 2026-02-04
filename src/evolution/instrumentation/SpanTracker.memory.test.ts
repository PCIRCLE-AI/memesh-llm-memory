import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpanTracker } from './SpanTracker';
import { SQLiteStore } from '../storage/SQLiteStore';
import type { EvolutionStore } from '../storage/EvolutionStore';

describe('SpanTracker - Memory Leak Prevention', () => {
  let store: EvolutionStore;
  let tracker: SpanTracker;

  beforeEach(async () => {
    store = new SQLiteStore({ dbPath: ':memory:' });
    await store.initialize();
    tracker = new SpanTracker({ store });
  });

  afterEach(async () => {
    await store.close();
  });

  it('should clear activeSpans after task ends', async () => {
    // Start task and execution
    await tracker.startTask({ task: 'test' });
    await tracker.startExecution();

    // Create some spans - span2 and span3 intentionally not captured
    // as we're testing that task cleanup handles uncaptured span references
    const span1 = tracker.startSpan({ name: 'span1' });
    const span2 = tracker.startSpan({ name: 'span2' });
    const span3 = tracker.startSpan({ name: 'span3' });

    // Verify all spans are tracked and have valid IDs
    expect(tracker.getActiveSpans().length).toBe(3);
    expect(span1.spanId).toBeDefined();
    expect(span2.spanId).toBeDefined();
    expect(span3.spanId).toBeDefined();

    // End some spans manually
    await span1.end();
    expect(tracker.getActiveSpans().length).toBe(2);

    // End task (should clean up remaining spans)
    await tracker.endTask('completed');

    // CRITICAL: activeSpans should be empty
    expect(tracker.getActiveSpans().length).toBe(0);
  });

  it('should clear currentTask reference after task ends', async () => {
    // Start and end task
    await tracker.startTask({ task: 'test' });
    await tracker.startExecution();

    expect(tracker.getCurrentTask()).toBeDefined();

    await tracker.endTask('completed');

    // CRITICAL: currentTask should be cleared
    expect(tracker.getCurrentTask()).toBeUndefined();
  });

  it('should clear currentExecution reference after execution ends', async () => {
    // Start and end execution
    await tracker.startTask({ task: 'test' });
    await tracker.startExecution();

    expect(tracker.getCurrentExecution()).toBeDefined();

    await tracker.endExecution();

    // CRITICAL: currentExecution should be cleared
    expect(tracker.getCurrentExecution()).toBeUndefined();
  });

  it('should support multiple task lifecycles without memory accumulation', async () => {
    // Task 1
    await tracker.startTask({ task: 'task1' });
    await tracker.startExecution();
    const span1 = tracker.startSpan({ name: 'span1' });
    await span1.end();
    await tracker.endTask('completed');

    expect(tracker.getActiveSpans().length).toBe(0);
    expect(tracker.getCurrentTask()).toBeUndefined();

    // Task 2 (should start fresh)
    await tracker.startTask({ task: 'task2' });
    await tracker.startExecution();
    const span2 = tracker.startSpan({ name: 'span2' });
    await span2.end();
    await tracker.endTask('completed');

    expect(tracker.getActiveSpans().length).toBe(0);
    expect(tracker.getCurrentTask()).toBeUndefined();

    // Task 3
    await tracker.startTask({ task: 'task3' });
    await tracker.startExecution();
    const span3 = tracker.startSpan({ name: 'span3' });
    await span3.end();
    await tracker.endTask('completed');

    expect(tracker.getActiveSpans().length).toBe(0);
    expect(tracker.getCurrentTask()).toBeUndefined();
  });

  it('should clean up orphaned spans when task ends abruptly', async () => {
    // Start task and create spans
    await tracker.startTask({ task: 'test' });
    await tracker.startExecution();

    // Capture spans to verify they were properly created before becoming orphaned
    const orphanSpan1 = tracker.startSpan({ name: 'span1' });
    const orphanSpan2 = tracker.startSpan({ name: 'span2' });
    // Intentionally NOT ending these spans (simulating error scenario)

    // Verify orphaned spans were properly created with valid IDs
    expect(orphanSpan1.spanId).toBeDefined();
    expect(orphanSpan2.spanId).toBeDefined();
    expect(tracker.getActiveSpans().length).toBe(2);

    // End task (should force-end orphaned spans)
    await tracker.endTask('failed');

    // All spans should be cleaned up
    expect(tracker.getActiveSpans().length).toBe(0);
  });

  it('should provide cleanup method to reset all state', async () => {
    // Start task with spans
    await tracker.startTask({ task: 'test' });
    await tracker.startExecution();

    tracker.startSpan({ name: 'span1' });
    tracker.startSpan({ name: 'span2' });

    expect(tracker.getActiveSpans().length).toBe(2);
    expect(tracker.getCurrentTask()).toBeDefined();
    expect(tracker.getCurrentExecution()).toBeDefined();

    // Call cleanup (new method to be implemented)
    await tracker.cleanup();

    // Everything should be reset
    expect(tracker.getActiveSpans().length).toBe(0);
    expect(tracker.getCurrentTask()).toBeUndefined();
    expect(tracker.getCurrentExecution()).toBeUndefined();
  });
});
