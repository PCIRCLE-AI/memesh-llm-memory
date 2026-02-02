/**
 * MCP Task Delegator
 *
 * Manages task delegation from A2A agents to MCP clients.
 * Maintains a pending task queue and handles task lifecycle (add, mark in-progress, remove).
 * Implements timeout detection for tasks that exceed the configured timeout threshold.
 *
 * Phase 1.0: Supports one concurrent task per agent.
 * Future: Will support multiple concurrent tasks.
 *
 * @module a2a/delegator
 */

import type { TaskQueue } from '../storage/TaskQueue.js';
import type { ILogger } from '../../utils/ILogger.js';
import type { TaskInfo } from './types.js';
import { TIME, LIMITS, ENV_KEYS } from '../constants.js';
import { A2AMetrics, METRIC_NAMES } from '../metrics/index.js';
import { ErrorCodes, createError, formatErrorMessage } from '../errors/index.js';

/**
 * MCPTaskDelegator class
 *
 * Manages the delegation of tasks from A2A agents to MCP clients.
 * Tracks pending tasks and detects timeouts.
 *
 * @example
 * ```typescript
 * const delegator = new MCPTaskDelegator(taskQueue, logger);
 *
 * // Add a task
 * await delegator.addTask('task-123', 'Calculate 2+2', 'high', 'agent-1');
 *
 * // Get pending tasks for an agent
 * const tasks = await delegator.getPendingTasks('agent-1');
 *
 * // Mark task as in-progress
 * await delegator.markTaskInProgress('task-123');
 *
 * // Remove completed task
 * await delegator.removeTask('task-123');
 *
 * // Check for timeouts (called periodically by TimeoutChecker)
 * await delegator.checkTimeouts();
 * ```
 */
export class MCPTaskDelegator {
  private pendingTasks: Map<string, TaskInfo>;
  // PERFORMANCE OPTIMIZATION: O(1) lookup by agentId
  // Maps agentId -> Set of taskIds for that agent
  private pendingTasksByAgent: Map<string, Set<string>>;
  private taskQueue: TaskQueue;
  private logger: ILogger;
  private metrics: A2AMetrics;

  /**
   * Create a new MCPTaskDelegator
   *
   * @param taskQueue - TaskQueue instance for persistent task storage
   * @param logger - Logger instance for logging
   */
  constructor(taskQueue: TaskQueue, logger: ILogger) {
    this.pendingTasks = new Map();
    this.pendingTasksByAgent = new Map();
    this.taskQueue = taskQueue;
    this.logger = logger;
    this.metrics = A2AMetrics.getInstance();
  }

  /**
   * Add a task to the delegation queue
   *
   * Phase 1.0: Enforces one concurrent task per agent limit.
   * The task is added to the in-memory pending queue and will be picked up
   * by the MCP client via polling.
   *
   * @param taskId - Unique task identifier
   * @param task - Task description/content
   * @param priority - Task priority (high, medium, low)
   * @param agentId - Agent that owns this task
   * @throws Error if agent already has a pending task (Phase 1.0 limitation)
   *
   * @example
   * ```typescript
   * await delegator.addTask('task-123', 'Calculate 2+2', 'high', 'agent-1');
   * ```
   */
  async addTask(
    taskId: string,
    task: string,
    priority: 'high' | 'medium' | 'low',
    agentId: string
  ): Promise<void> {
    // PERFORMANCE OPTIMIZATION: O(1) lookup using index
    // OLD: O(n) - Array.from(this.pendingTasks.values()).filter(task => task.agentId === agentId).length
    // NEW: O(1) - this.pendingTasksByAgent.get(agentId)?.size || 0
    const agentTaskSet = this.pendingTasksByAgent.get(agentId);
    const agentTaskCount = agentTaskSet ? agentTaskSet.size : 0;

    if (agentTaskCount >= LIMITS.MAX_CONCURRENT_TASKS_PHASE_1) {
      throw createError(ErrorCodes.AGENT_ALREADY_PROCESSING, 'Phase 1.0');
    }

    const taskInfo: TaskInfo = {
      taskId,
      task,
      priority,
      agentId,
      createdAt: Date.now(),
      status: 'PENDING'
    };

    this.pendingTasks.set(taskId, taskInfo);

    // Update agent index
    if (!agentTaskSet) {
      this.pendingTasksByAgent.set(agentId, new Set([taskId]));
    } else {
      agentTaskSet.add(taskId);
    }

    this.logger.info('[MCPTaskDelegator] Task added to delegation queue', { taskId, agentId });

    // Metrics: track task submitted and queue size
    this.metrics.incrementCounter(METRIC_NAMES.TASKS_SUBMITTED, { agentId, priority });
    this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, { agentId });
  }

  /**
   * Get pending tasks for a specific agent
   *
   * Returns all tasks that are in PENDING status for the given agent.
   * MCP clients call this method to poll for new tasks.
   *
   * PERFORMANCE OPTIMIZATION: O(n) → O(1) lookup using agent index
   * OLD: Iterate all tasks and filter by agentId
   * NEW: Direct lookup in pendingTasksByAgent Map
   *
   * @param agentId - Agent identifier to filter tasks
   * @returns Array of pending tasks for the agent
   *
   * @example
   * ```typescript
   * const tasks = await delegator.getPendingTasks('agent-1');
   * console.log(`Agent has ${tasks.length} pending tasks`);
   * ```
   */
  async getPendingTasks(agentId: string): Promise<TaskInfo[]> {
    // PERFORMANCE OPTIMIZATION: O(1) lookup using index
    const taskIds = this.pendingTasksByAgent.get(agentId);
    if (!taskIds || taskIds.size === 0) {
      return [];
    }

    const tasks: TaskInfo[] = [];
    for (const taskId of taskIds) {
      const taskInfo = this.pendingTasks.get(taskId);
      if (taskInfo && taskInfo.status === 'PENDING') {
        tasks.push(taskInfo);
      }
    }
    return tasks;
  }

  /**
   * Mark a task as in-progress
   *
   * Called by MCP client when it starts executing a task.
   * Prevents the task from being included in pending task queries.
   *
   * @param taskId - Task identifier to mark as in-progress
   *
   * @example
   * ```typescript
   * await delegator.markTaskInProgress('task-123');
   * ```
   */
  async markTaskInProgress(taskId: string): Promise<void> {
    const taskInfo = this.pendingTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'IN_PROGRESS';
      this.logger.info('[MCPTaskDelegator] Task marked as in-progress', { taskId });
    } else {
      this.logger.warn('[MCPTaskDelegator] Task not found for progress update', { taskId });
    }
  }

  /**
   * Remove a task from the delegation queue
   *
   * Called when a task is completed, failed, or canceled.
   * Removes the task from the in-memory pending queue.
   *
   * @param taskId - Task identifier to remove
   *
   * @example
   * ```typescript
   * // Task completed successfully
   * await delegator.removeTask('task-123');
   * ```
   */
  async removeTask(taskId: string): Promise<void> {
    const taskInfo = this.pendingTasks.get(taskId);
    const removed = this.pendingTasks.delete(taskId);

    if (removed && taskInfo) {
      // Update agent index
      const agentTaskSet = this.pendingTasksByAgent.get(taskInfo.agentId);
      if (agentTaskSet) {
        agentTaskSet.delete(taskId);
        if (agentTaskSet.size === 0) {
          this.pendingTasksByAgent.delete(taskInfo.agentId);
        }
      }

      this.logger.info('[MCPTaskDelegator] Task removed from delegation queue', { taskId });

      // Metrics: update queue size
      this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, {
        agentId: taskInfo.agentId
      });
    } else {
      this.logger.warn('[MCPTaskDelegator] Task not found for removal', { taskId });
    }
  }

  /**
   * Check for timed-out tasks and mark them as TIMEOUT
   *
   * Called periodically by TimeoutChecker to detect tasks that have exceeded
   * the configured timeout threshold. Timed-out tasks are:
   * 1. Updated to TIMEOUT state in TaskQueue
   * 2. Removed from pending queue
   *
   * Implements transaction safety: only removes from pending queue after
   * successful database update. If update fails, task remains in queue for retry.
   *
   * Timeout duration is configured via environment variable MEMESH_A2A_TASK_TIMEOUT
   * (default: 300,000ms = 5 minutes).
   *
   * @throws Does not throw - errors are logged and handled gracefully
   *
   * @example
   * ```typescript
   * // Called by TimeoutChecker every 60 seconds
   * await delegator.checkTimeouts();
   * ```
   */
  async checkTimeouts(): Promise<void> {
    const now = Date.now();
    const timeout = parseInt(
      process.env[ENV_KEYS.TASK_TIMEOUT] || String(TIME.TASK_TIMEOUT_MS)
    );
    const timeoutSeconds = timeout / 1000;

    // CRITICAL FIX: Collect timed-out tasks first to avoid modifying Map during iteration
    const timedOutTasks: Array<{ taskId: string; taskInfo: TaskInfo }> = [];

    for (const [taskId, taskInfo] of this.pendingTasks) {
      if (now - taskInfo.createdAt > timeout) {
        timedOutTasks.push({ taskId, taskInfo });
      }
    }

    // Process timed-out tasks sequentially with transaction safety
    for (const { taskId, taskInfo } of timedOutTasks) {
      try {
        const timeoutMessage = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, taskId, timeoutSeconds);

        this.logger.warn('[MCPTaskDelegator] Task timeout detected', {
          taskId,
          agentId: taskInfo.agentId,
          timeoutSeconds,
          taskAge: Math.floor((now - taskInfo.createdAt) / 1000),
        });

        // Update TaskQueue status with transaction safety
        const updated = this.taskQueue.updateTaskStatus(taskId, {
          state: 'TIMEOUT',
          metadata: { error: timeoutMessage }
        });

        if (!updated) {
          this.logger.error('[MCPTaskDelegator] Failed to update timeout status for task', { taskId });
          // Do not remove from pending queue if DB update failed
          continue;
        }

        // Only remove from pending queue after successful DB update
        this.pendingTasks.delete(taskId);

        // Update agent index
        const agentTaskSet = this.pendingTasksByAgent.get(taskInfo.agentId);
        if (agentTaskSet) {
          agentTaskSet.delete(taskId);
          if (agentTaskSet.size === 0) {
            this.pendingTasksByAgent.delete(taskInfo.agentId);
          }
        }

        this.logger.info('[MCPTaskDelegator] Task removed from pending queue after timeout', { taskId });

        // Metrics: track timeout and update queue size
        this.metrics.incrementCounter(METRIC_NAMES.TASKS_TIMEOUT, {
          agentId: taskInfo.agentId,
          priority: taskInfo.priority
        });
        this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, {
          agentId: taskInfo.agentId
        });

      } catch (error) {
        // Transaction safety: rollback by keeping task in pending queue
        this.logger.error('[MCPTaskDelegator] Error processing timeout', {
          taskId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Task remains in pending queue for retry on next checkTimeouts call
      }
    }

    if (timedOutTasks.length > 0) {
      this.logger.info('[MCPTaskDelegator] Timeout check completed', {
        timeoutCount: timedOutTasks.length,
        remainingTasks: this.pendingTasks.size,
      });
    }
  }
}
