import type { TaskQueue } from '../storage/TaskQueue.js';
import type { Logger } from '../../utils/logger.js';
import type { TaskInfo } from './types.js';

export class MCPTaskDelegator {
  private pendingTasks: Map<string, TaskInfo>;
  private taskQueue: TaskQueue;
  private logger: Logger;

  constructor(taskQueue: TaskQueue, logger: Logger) {
    this.pendingTasks = new Map();
    this.taskQueue = taskQueue;
    this.logger = logger;
  }

  async addTask(
    taskId: string,
    task: string,
    priority: 'high' | 'medium' | 'low',
    agentId: string
  ): Promise<void> {
    // Phase 1.0: Only one task per agent
    if (this.pendingTasks.size >= 1) {
      throw new Error('Agent already processing a task (Phase 1.0 limitation)');
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
    this.logger.info(`Task added to delegation queue: ${taskId}`);
  }

  async getPendingTasks(agentId: string): Promise<TaskInfo[]> {
    const tasks: TaskInfo[] = [];
    for (const taskInfo of this.pendingTasks.values()) {
      if (taskInfo.agentId === agentId && taskInfo.status === 'PENDING') {
        tasks.push(taskInfo);
      }
    }
    return tasks;
  }

  async markTaskInProgress(taskId: string): Promise<void> {
    const taskInfo = this.pendingTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'IN_PROGRESS';
      this.logger.info(`Task marked as in-progress: ${taskId}`);
    }
  }

  async removeTask(taskId: string): Promise<void> {
    const removed = this.pendingTasks.delete(taskId);
    if (removed) {
      this.logger.info(`Task removed from delegation queue: ${taskId}`);
    }
  }

  async checkTimeouts(): Promise<void> {
    const now = Date.now();
    const timeout = parseInt(process.env.MEMESH_A2A_TASK_TIMEOUT || '300000'); // 5 min default

    for (const [taskId, taskInfo] of this.pendingTasks) {
      if (now - taskInfo.createdAt > timeout) {
        this.logger.warn(`Task timeout detected: ${taskId}`);

        // Update TaskQueue status
        await this.taskQueue.updateTask(taskId, {
          status: 'TIMEOUT' as any, // TaskStatus enum
          error: `Task execution timeout (${timeout / 1000}s)`,
          completedAt: now
        });

        // Remove from pending queue
        this.pendingTasks.delete(taskId);
      }
    }
  }
}
