/**
 * Task Executor
 * Phase 1.0 - MCP Client Task Delegation
 *
 * IMPORTANT: MeMesh is an MCP Server, not a standalone AI agent.
 * Tasks are delegated to the connected MCP client (Claude Code/Claude Desktop)
 * via MCPTaskDelegator.
 */

import type { TaskQueue } from '../storage/TaskQueue.js';
import type { Logger } from '../../utils/logger.js';
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';

export class TaskExecutor {
  private taskQueue: TaskQueue;
  private logger: Logger;
  private delegator: MCPTaskDelegator;

  constructor(
    taskQueue: TaskQueue,
    logger: Logger,
    delegator: MCPTaskDelegator
  ) {
    this.taskQueue = taskQueue;
    this.logger = logger;
    this.delegator = delegator;
  }

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
