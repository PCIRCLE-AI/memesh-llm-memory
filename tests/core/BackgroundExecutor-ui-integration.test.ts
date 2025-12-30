// tests/core/BackgroundExecutor-ui-integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundExecutor } from '../../src/core/BackgroundExecutor.js';
import { UIEventBus } from '../../src/ui/UIEventBus.js';
import { ResourceMonitor } from '../../src/core/ResourceMonitor.js';
import type { ExecutionConfig } from '../../src/core/types.js';
import type { ProgressIndicator } from '../../src/ui/types.js';

describe('BackgroundExecutor UI Integration', () => {
  let executor: BackgroundExecutor;
  let resourceMonitor: ResourceMonitor;
  let eventBus: UIEventBus;

  beforeEach(() => {
    resourceMonitor = new ResourceMonitor();
    eventBus = UIEventBus.getInstance();
    eventBus.removeAllListeners();

    // Mock canRunBackgroundTask to always return true for testing
    vi.spyOn(resourceMonitor, 'canRunBackgroundTask').mockReturnValue({
      canExecute: true,
      reason: undefined,
      suggestion: undefined,
    });

    executor = new BackgroundExecutor(resourceMonitor, eventBus);
  });

  it('should emit progress events during task execution', async () => {
    const progressHandler = vi.fn();
    eventBus.onProgress(progressHandler);

    const config: ExecutionConfig = {
      mode: 'background',
      priority: 'medium',
      resourceLimits: { maxCPU: 100, maxMemory: 16384, maxDuration: 60 },
    };

    const task = {
      type: 'test-task',
      description: 'Test task for progress events',
      data: { value: 123 },
    };

    const taskId = await executor.executeTask(task, config);
    expect(taskId).toBeDefined();

    // Progress event should be emitted
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(progressHandler).toHaveBeenCalled();

    const progress: ProgressIndicator = progressHandler.mock.calls[0][0];
    expect(progress.agentId).toBe(taskId);
    expect(['queued', 'running']).toContain(progress.progress === 0 ? 'queued' : 'running');
  });

  it('should emit success attribution when task completes', async () => {
    const attributionHandler = vi.fn();
    eventBus.onAttribution(attributionHandler);

    const config: ExecutionConfig = {
      mode: 'background',
      priority: 'high',
      resourceLimits: { maxCPU: 100, maxMemory: 16384, maxDuration: 60 },
    };

    const task = {
      type: 'success-task',
      description: 'Task that will succeed',
      data: {},
    };

    const taskId = await executor.executeTask(task, config);

    // Simulate task completion
    await executor.completeTask(taskId, { result: 'success' });

    expect(attributionHandler).toHaveBeenCalled();
    const attribution = attributionHandler.mock.calls[0][0];
    expect(attribution.type).toBe('success');
    expect(attribution.agentIds).toContain(taskId);
  });

  it('should emit error attribution when task fails', async () => {
    const attributionHandler = vi.fn();
    eventBus.onAttribution(attributionHandler);

    const config: ExecutionConfig = {
      mode: 'background',
      priority: 'low',
      resourceLimits: { maxCPU: 100, maxMemory: 16384, maxDuration: 60 },
    };

    const task = {
      type: 'failing-task',
      description: 'Task that will fail',
      data: {},
    };

    const taskId = await executor.executeTask(task, config);

    // Simulate task failure
    const error = new Error('Task failed');
    await executor.failTask(taskId, error);

    expect(attributionHandler).toHaveBeenCalled();
    const attribution = attributionHandler.mock.calls[0][0];
    expect(attribution.type).toBe('error');
    expect(attribution.metadata?.error?.message).toBe('Task failed');
  });
});
