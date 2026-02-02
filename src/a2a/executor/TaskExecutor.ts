/**
 * Task Executor
 *
 * Phase 1.0 - MCP Client Task Delegation
 *
 * IMPORTANT: MeMesh is an MCP Server, not a standalone AI agent.
 * Tasks are delegated to the connected MCP client (Claude Code/Claude Desktop)
 * via MCPTaskDelegator. The MCP client will:
 * 1. Poll for pending tasks
 * 2. Execute tasks via buddy-do tool
 * 3. Report results back to the agent
 *
 * @module a2a/executor
 */

import type { TaskQueue } from '../storage/TaskQueue.js';
import type { ILogger } from '../../utils/ILogger.js';
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';

/**
 * TaskExecutor class
 *
 * Handles task execution by delegating to MCP clients.
 * In Phase 1.0, this is a simple pass-through to MCPTaskDelegator.
 *
 * @example
 * ```typescript
 * const executor = new TaskExecutor(taskQueue, logger, delegator);
 *
 * // Execute a task (delegates to MCP client)
 * await executor.executeTask('task-123', 'Calculate 2+2', 'agent-1');
 *
 * // Task status remains PENDING until MCP client picks it up and executes
 * ```
 */
export class TaskExecutor {
  private taskQueue: TaskQueue;
  private logger: ILogger;
  private delegator: MCPTaskDelegator;

  /**
   * Create a new TaskExecutor
   *
   * @param taskQueue - TaskQueue instance for task storage
   * @param logger - Logger instance for logging
   * @param delegator - MCPTaskDelegator instance for MCP client delegation
   */
  constructor(
    taskQueue: TaskQueue,
    logger: ILogger,
    delegator: MCPTaskDelegator
  ) {
    this.taskQueue = taskQueue;
    this.logger = logger;
    this.delegator = delegator;
  }

  /**
   * Execute a task by delegating to MCP client
   *
   * Phase 1.0: Adds the task to MCPTaskDelegator's pending queue.
   * The MCP client will poll, retrieve, and execute the task.
   *
   * @param taskId - Unique task identifier
   * @param task - Task description/content to execute
   * @param agentId - Agent identifier that owns this task
   * @throws Error if delegation fails (e.g., agent already processing a task)
   *
   * @example
   * ```typescript
   * await executor.executeTask('task-123', 'Calculate 2+2', 'agent-1');
   * ```
   */
  async executeTask(
    taskId: string,
    task: string,
    agentId: string
  ): Promise<void> {
    // Phase 1.0: Delegate to MCPTaskDelegator
    // MCP Client will poll, execute via buddy-do, and report result
    await this.delegator.addTask(taskId, task, 'medium', agentId);

    this.logger.info(`Task delegated to MCP Client: ${taskId}`);

    // Status remains PENDING until MCP Client picks up and executes
  }
}
