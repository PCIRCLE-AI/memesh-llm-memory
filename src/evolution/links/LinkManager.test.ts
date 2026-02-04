import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LinkManager } from './LinkManager';
import { SpanTracker } from '../instrumentation/SpanTracker';
import { SQLiteStore } from '../storage/SQLiteStore';
import path from 'path';
import os from 'os';

describe('LinkManager', () => {
  let linkManager: LinkManager;
  let tracker: SpanTracker;
  let store: SQLiteStore;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `evolution-links-${Date.now()}.db`);
    store = new SQLiteStore({ dbPath });
    await store.initialize();

    tracker = new SpanTracker({ store });
    linkManager = new LinkManager(tracker, store);
  });

  afterEach(async () => {
    if (store) {
      await store.close();
    }
  });

  it('should link reward to operation span', async () => {
    // Create operation span with proper task/execution context
    const task = await tracker.startTask({ test: 'task' });
    const execution = await tracker.startExecution();

    // Verify task and execution are properly initialized
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(execution).toBeDefined();
    expect(execution.id).toBeDefined();

    const span = tracker.startSpan({ name: 'code_review' });
    const spanId = span.spanId;
    await span.end();

    // Link reward
    await linkManager.linkReward(spanId, {
      value: 0.9,
      feedback: 'Excellent work',
      dimensions: { accuracy: 0.95, speed: 0.85 }
    });

    // Verify reward was recorded
    const rewards = await store.queryRewardsByOperationSpan(spanId);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].value).toBe(0.9);
    expect(rewards[0].dimensions?.accuracy).toBe(0.95);
  });

  it('should query linked spans', async () => {
    // Create task and execution context for linking
    const task = await tracker.startTask({ test: 'task' });
    const execution = await tracker.startExecution();

    // Verify context is properly established before creating span
    expect(task.id).toBeDefined();
    expect(execution.id).toBeDefined();

    const span = tracker.startSpan({ name: 'code_review' });
    const spanId = span.spanId;
    await span.end();

    await linkManager.linkReward(spanId, { value: 0.9 });

    const linkedSpans = await linkManager.queryRewardsForOperation(spanId);
    expect(linkedSpans).toHaveLength(1);
    expect(linkedSpans[0].name).toBe('evolution.reward');
  });
});
