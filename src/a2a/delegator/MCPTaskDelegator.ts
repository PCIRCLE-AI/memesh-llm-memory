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
}
