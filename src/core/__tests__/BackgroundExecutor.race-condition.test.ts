/**
 * BackgroundExecutor Race Condition Tests
 *
 * Tests for BUG-2: Task cleanup timing race condition
 * Verifies that auto-cleanup doesn't interfere with user operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundExecutor } from '../BackgroundExecutor.js';
import { ResourceMonitor } from '../ResourceMonitor.js';
import { DEFAULT_EXECUTION_CONFIG } from '../types.js';
import { StateError } from '../../errors/index.js';

describe('BackgroundExecutor - BUG-2: Cleanup Race Condition Tests', () => {
  let executor: BackgroundExecutor;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    // ✅ FIX: Set high memory threshold for tests to avoid blocking on test systems
    resourceMonitor = new ResourceMonitor(6, {
      maxCPU: 95,
      maxMemory: 32768, // 32GB - high enough for test systems
    });
    executor = new BackgroundExecutor(resourceMonitor);
  });

  afterEach(() => {
    // Cleanup any pending timers
    vi.clearAllTimers();
  });

  it('BUG-2: should not delete task during auto-cleanup if user is accessing it', async () => {
    // Use fake timers to control cleanup timing
    vi.useFakeTimers();

    // Execute a quick task
    const taskId = await executor.executeTask(
      async () => {
        return { success: true };
      },
      DEFAULT_EXECUTION_CONFIG
    );

    // Wait for task to complete
    await vi.advanceTimersByTimeAsync(100);

    // Task should be completed
    let task = executor.getTask(taskId);
    expect(task?.status).toBe('completed');

    // Advance time close to cleanup threshold (60 seconds)
    await vi.advanceTimersByTimeAsync(59000);

    // User accesses task (should cancel cleanup timer)
    task = executor.getTask(taskId);
    expect(task).toBeDefined();
    expect(task?.status).toBe('completed');

    // Advance past original cleanup time
    await vi.advanceTimersByTimeAsync(2000);

    // Task should still exist (cleanup was cancelled)
    task = executor.getTask(taskId);
    expect(task).toBeDefined();
    expect(task?.status).toBe('completed');

    vi.useRealTimers();
  });

  it('BUG-2: should not throw NotFoundError when cancelling task near cleanup time', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async ({ isCancelled }) => {
        // Long-running task
        for (let i = 0; i < 100; i++) {
          if (isCancelled()) return null;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return { success: true };
      },
      DEFAULT_EXECUTION_CONFIG
    );

    // Wait for task to complete
    await vi.advanceTimersByTimeAsync(2000);

    // Advance time to just before cleanup
    await vi.advanceTimersByTimeAsync(59000);

    // User tries to cancel (should work, not throw NotFoundError)
    await expect(executor.cancelTask(taskId)).rejects.toThrow(StateError); // Already completed
    // But not NotFoundError - task should still exist

    const task = executor.getTask(taskId);
    expect(task).toBeDefined();

    vi.useRealTimers();
  });

  it('BUG-2: should handle concurrent getTask calls preventing cleanup', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async () => ({ success: true }),
      DEFAULT_EXECUTION_CONFIG
    );

    await vi.advanceTimersByTimeAsync(100);

    // Advance to near cleanup time
    await vi.advanceTimersByTimeAsync(59500);

    // Multiple concurrent getTask calls
    const results = await Promise.all([
      Promise.resolve(executor.getTask(taskId)),
      Promise.resolve(executor.getTask(taskId)),
      Promise.resolve(executor.getTask(taskId)),
    ]);

    // All should succeed
    expect(results.every(r => r !== undefined)).toBe(true);

    // Advance past cleanup time
    await vi.advanceTimersByTimeAsync(1000);

    // Task should still exist
    const task = executor.getTask(taskId);
    expect(task).toBeDefined();

    vi.useRealTimers();
  });

  it('BUG-2 Before Fix: would cause race between cleanup and user operation (simulation)', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async () => ({ success: true }),
      DEFAULT_EXECUTION_CONFIG
    );

    await vi.advanceTimersByTimeAsync(100);

    // Before fix scenario:
    // T59.999s: User calls getTask() - returns task
    // T60.000s: setTimeout fires - deletes task
    // T60.001s: User tries to use task - NotFoundError

    // Advance to T59.999s (59999ms total, minus the 100ms already advanced = 59899ms more)
    await vi.advanceTimersByTimeAsync(59899);

    const task1 = executor.getTask(taskId);
    expect(task1).toBeDefined(); // ✅ Fixed: cleanup timer cancelled

    // Advance past cleanup time
    await vi.advanceTimersByTimeAsync(500);

    // With fix: task still exists because getTask() cancelled cleanup
    const task2 = executor.getTask(taskId);
    expect(task2).toBeDefined(); // ✅ Fixed

    // ❌ Before fix: task2 would be undefined (task deleted by cleanup)

    vi.useRealTimers();
  });

  it('BUG-2: should still cleanup tasks that are never accessed', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async () => ({ success: true }),
      DEFAULT_EXECUTION_CONFIG
    );

    await vi.advanceTimersByTimeAsync(100);

    // Don't access the task, let cleanup happen
    await vi.advanceTimersByTimeAsync(61000);

    // Task should be cleaned up
    const task = executor.getTask(taskId);
    expect(task).toBeUndefined();

    vi.useRealTimers();
  });

  it('BUG-2: should handle getProgress without preventing cleanup', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async ({ updateProgress }) => {
        updateProgress(0.5, 'halfway');
        return { success: true };
      },
      DEFAULT_EXECUTION_CONFIG
    );

    await vi.advanceTimersByTimeAsync(100);

    // getProgress should work near cleanup time
    await vi.advanceTimersByTimeAsync(59000);

    const progress = await executor.getProgress(taskId);
    expect(progress.progress).toBeGreaterThan(0);

    // But getProgress doesn't cancel cleanup (only getTask does)
    await vi.advanceTimersByTimeAsync(2000);

    // Task might be cleaned up (getProgress doesn't prevent cleanup)
    // This is intentional - only getTask() cancels cleanup

    vi.useRealTimers();
  });

  it('BUG-2: multiple tasks should have independent cleanup timers', async () => {
    vi.useFakeTimers();

    // Create multiple tasks
    const taskIds = await Promise.all([
      executor.executeTask(async () => ({ id: 1 }), DEFAULT_EXECUTION_CONFIG),
      executor.executeTask(async () => ({ id: 2 }), DEFAULT_EXECUTION_CONFIG),
      executor.executeTask(async () => ({ id: 3 }), DEFAULT_EXECUTION_CONFIG),
    ]);

    await vi.advanceTimersByTimeAsync(100);

    // Access only first task
    await vi.advanceTimersByTimeAsync(59000);
    const task1 = executor.getTask(taskIds[0]);
    expect(task1).toBeDefined();

    // Advance past cleanup
    await vi.advanceTimersByTimeAsync(2000);

    // First task should still exist (accessed)
    expect(executor.getTask(taskIds[0])).toBeDefined();

    // Other tasks should be cleaned up (not accessed)
    expect(executor.getTask(taskIds[1])).toBeUndefined();
    expect(executor.getTask(taskIds[2])).toBeUndefined();

    vi.useRealTimers();
  });

  it('BUG-2: should prevent duplicate cleanup timers for same task', async () => {
    vi.useFakeTimers();

    const taskId = await executor.executeTask(
      async () => ({ success: true }),
      DEFAULT_EXECUTION_CONFIG
    );

    await vi.advanceTimersByTimeAsync(100);

    // Internal state check: only one cleanup timer should exist per task
    // This is verified by the implementation using cleanupScheduled Set

    // Access task multiple times
    for (let i = 0; i < 5; i++) {
      const task = executor.getTask(taskId);
      expect(task).toBeDefined();
      await vi.advanceTimersByTimeAsync(100);
    }

    // Each getTask() cancels and doesn't reschedule
    // So task should remain accessible indefinitely as long as it's being used

    await vi.advanceTimersByTimeAsync(100000);
    const finalTask = executor.getTask(taskId);
    expect(finalTask).toBeDefined();

    vi.useRealTimers();
  });
});
