import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../src/utils/logger.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { unlinkSync } from 'fs';

describe('A2A Timeout Handling Integration', () => {
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let dbPath: string;
  const agentId = 'test-timeout-agent';

  beforeEach(async () => {
    // Create unique temp database path
    const tempId = randomBytes(8).toString('hex');
    dbPath = join(tmpdir(), `a2a-timeout-test-${tempId}.db`);

    // Create TaskQueue with agentId and custom dbPath
    taskQueue = new TaskQueue(agentId, dbPath);

    delegator = new MCPTaskDelegator(taskQueue, logger);

    // Set very short timeout for testing
    process.env.MEMESH_A2A_TASK_TIMEOUT = '100'; // 100ms
  });

  afterEach(async () => {
    delete process.env.MEMESH_A2A_TASK_TIMEOUT;

    // Cleanup test database
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should timeout task after configured duration', async () => {
    // Create task in TaskQueue
    const task = taskQueue.createTask({
      name: 'Timeout Test Task',
      description: 'Test task for timeout',
      priority: 'high'
    });

    // Add to delegator
    await delegator.addTask(task.id, 'test task', 'high', agentId);

    // Wait for timeout (200ms > 100ms timeout)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Run timeout check
    await delegator.checkTimeouts();

    // Verify task marked as TIMEOUT
    const updatedTask = taskQueue.getTask(task.id);
    expect(updatedTask).not.toBeNull();
    expect(updatedTask!.state).toBe('TIMEOUT');

    // Verify removed from pending queue
    const pending = await delegator.getPendingTasks(agentId);
    expect(pending).toHaveLength(0);
  });

  it('should not timeout recent tasks', async () => {
    // Create task in TaskQueue
    const task = taskQueue.createTask({
      name: 'Recent Task',
      description: 'Task that should not timeout',
      priority: 'high'
    });

    // Add to delegator
    await delegator.addTask(task.id, 'test task', 'high', agentId);

    // Run timeout check immediately (task is fresh)
    await delegator.checkTimeouts();

    // Verify task still SUBMITTED (not timed out)
    const updatedTask = taskQueue.getTask(task.id);
    expect(updatedTask).not.toBeNull();
    expect(updatedTask!.state).toBe('SUBMITTED');

    // Verify still in pending queue
    const pending = await delegator.getPendingTasks(agentId);
    expect(pending).toHaveLength(1);
  });
});
