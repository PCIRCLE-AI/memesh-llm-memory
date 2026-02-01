/**
 * A2A Server Routes
 * HTTP route handlers for A2A Protocol endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import type {
  SendMessageRequest,
  SendMessageResponse,
  ServiceResponse,
  ServiceError,
  Task,
  TaskStatus,
  TaskFilter,
  TaskState,
  AgentCard,
} from '../types/index.js';
import { TaskQueue } from '../storage/TaskQueue.js';

export class A2ARoutes {
  constructor(
    private _agentId: string,
    private taskQueue: TaskQueue,
    private agentCard: AgentCard
  ) {}

  sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const request = req.body as SendMessageRequest;

      if (!request.message || !request.message.parts) {
        const error: ServiceError = {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: message.parts',
        };
        res.status(400).json({ success: false, error });
        return;
      }

      let taskId = request.taskId;

      if (!taskId) {
        const task = this.taskQueue.createTask({
          name: 'Incoming A2A Task',
          priority: 'normal',
          initialMessage: {
            role: request.message.role,
            parts: request.message.parts,
          },
        });
        taskId = task.id;
      } else {
        this.taskQueue.addMessage({
          taskId,
          role: request.message.role,
          parts: request.message.parts,
        });
      }

      const response: SendMessageResponse = {
        taskId,
        status: 'SUBMITTED',
      };

      const result: ServiceResponse<SendMessageResponse> = {
        success: true,
        data: response,
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        const error: ServiceError = {
          code: 'INVALID_REQUEST',
          message: 'Missing required parameter: taskId',
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const task = this.taskQueue.getTask(taskId);

      if (!task) {
        const error: ServiceError = {
          code: 'NOT_FOUND',
          message: `Task not found: ${taskId}`,
        };
        res.status(404).json({ success: false, error });
        return;
      }

      const result: ServiceResponse<Task> = {
        success: true,
        data: task,
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  listTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status, limit, offset } = req.query;

      const filter: TaskFilter = {};

      if (status) {
        filter.state = status as TaskState;
      }

      if (limit) {
        const parsedLimit = parseInt(limit as string, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          filter.limit = parsedLimit;
        }
      }

      if (offset) {
        const parsedOffset = parseInt(offset as string, 10);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          filter.offset = parsedOffset;
        }
      }

      const tasks = this.taskQueue.listTasks(filter);

      const result: ServiceResponse<TaskStatus[]> = {
        success: true,
        data: tasks,
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getAgentCard = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result: ServiceResponse<AgentCard> = {
        success: true,
        data: this.agentCard,
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  cancelTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        const error: ServiceError = {
          code: 'INVALID_REQUEST',
          message: 'Missing required parameter: taskId',
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const updated = this.taskQueue.updateTaskStatus(taskId, {
        state: 'CANCELED',
      });

      if (!updated) {
        const error: ServiceError = {
          code: 'NOT_FOUND',
          message: `Task not found: ${taskId}`,
        };
        res.status(404).json({ success: false, error });
        return;
      }

      const result: ServiceResponse<{ taskId: string; status: string }> = {
        success: true,
        data: { taskId, status: 'CANCELED' },
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
