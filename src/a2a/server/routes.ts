/**
 * A2A Server Routes
 * HTTP route handlers for A2A Protocol endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import type {
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
import { validateSendMessageRequest } from './validation/index.js';
import { logger } from '../../utils/logger.js';
import { TaskStateConstants } from '../storage/inputValidation.js';
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';

export class A2ARoutes {
  private delegator: MCPTaskDelegator | null = null;

  constructor(
    private _agentId: string,
    private taskQueue: TaskQueue,
    private agentCard: AgentCard
  ) {}

  /**
   * Set the task delegator for cancel task coordination.
   * Must be called after construction since delegator may be created after routes.
   */
  setDelegator(delegator: MCPTaskDelegator): void {
    this.delegator = delegator;
  }

  sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body with comprehensive schema validation
      const validationResult = validateSendMessageRequest(req.body);

      if (!validationResult.success) {
        logger.warn('SendMessage validation failed', {
          errorCode: validationResult.error?.code,
          detailsCount: validationResult.error?.details?.length,
        });

        const error: ServiceError = {
          code: validationResult.error?.code || 'VALIDATION_ERROR',
          message: validationResult.error?.message || 'Request validation failed',
          details: validationResult.error?.details as Record<string, unknown> | undefined,
        };
        res.status(400).json({ success: false, error });
        return;
      }

      // At this point, validation passed so data is guaranteed to exist
      const request = validationResult.data!;
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
        status: TaskStateConstants.SUBMITTED,
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
        state: TaskStateConstants.CANCELED,
      });

      if (!updated) {
        const error: ServiceError = {
          code: 'NOT_FOUND',
          message: `Task not found: ${taskId}`,
        };
        res.status(404).json({ success: false, error });
        return;
      }

      // Also remove from delegator pending queue to prevent execution
      if (this.delegator) {
        await this.delegator.removeTask(taskId);
        logger.info('[A2ARoutes] Task removed from delegator queue on cancel', { taskId });
      }

      const result: ServiceResponse<{ taskId: string; status: TaskState }> = {
        success: true,
        data: { taskId, status: TaskStateConstants.CANCELED },
      };

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
