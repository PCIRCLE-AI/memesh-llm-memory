import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { TaskQueue } from '../../a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';

export const a2aReportResultSchema = {
  type: 'object',
  properties: {
    taskId: {
      type: 'string',
      description: 'Task ID to report result for'
    },
    result: {
      type: 'string',
      description: 'Execution output or result'
    },
    success: {
      type: 'boolean',
      description: 'Whether execution succeeded (true) or failed (false)'
    },
    error: {
      type: 'string',
      description: 'Error message if success=false (optional)'
    }
  },
  required: ['taskId', 'result', 'success']
} as const;

export async function a2aReportResult(
  input: {
    taskId: string;
    result: string;
    success: boolean;
    error?: string;
  },
  taskQueue: TaskQueue,
  delegator: MCPTaskDelegator
): Promise<CallToolResult> {
  const { taskId, result, success, error } = input;

  // Determine status
  const status = success ? 'COMPLETED' : 'FAILED';

  // Update TaskQueue status
  taskQueue.updateTaskStatus(taskId, {
    state: status as any,
    metadata: {
      result: success ? result : null,
      error: success ? null : (error || 'Task execution failed'),
      completedAt: Date.now()
    }
  });

  // Remove from MCPTaskDelegator pending queue
  await delegator.removeTask(taskId);

  logger.info(`Task result reported: ${taskId} (${status})`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        taskId,
        status
      }, null, 2)
    }]
  };
}
