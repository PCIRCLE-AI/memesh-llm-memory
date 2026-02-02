import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { TaskQueue } from '../../a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';

/**
 * Task ID validation pattern
 * Enforces UUID v4 format or alphanumeric with hyphens/underscores
 * Length: 1-100 characters
 */
const TASK_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_TASK_ID_LENGTH = 100;
const MAX_RESULT_LENGTH = 100000; // 100KB max result size
const MAX_ERROR_LENGTH = 10000; // 10KB max error message size

/**
 * Zod schema for a2a-report-result input validation
 */
export const A2AReportResultInputSchema = z.object({
  taskId: z
    .string()
    .min(1, 'Task ID cannot be empty')
    .max(MAX_TASK_ID_LENGTH, `Task ID too long (max ${MAX_TASK_ID_LENGTH} characters)`)
    .regex(TASK_ID_PATTERN, 'Task ID must contain only alphanumeric characters, hyphens, and underscores')
    .describe('Task ID to report result for'),
  result: z
    .string()
    .max(MAX_RESULT_LENGTH, `Result too long (max ${MAX_RESULT_LENGTH} characters)`)
    .describe('Execution output or result'),
  success: z
    .boolean()
    .describe('Whether execution succeeded (true) or failed (false)'),
  error: z
    .string()
    .max(MAX_ERROR_LENGTH, `Error message too long (max ${MAX_ERROR_LENGTH} characters)`)
    .optional()
    .describe('Error message if success=false (optional)'),
});

export type ValidatedA2AReportResultInput = z.infer<typeof A2AReportResultInputSchema>;

/**
 * Legacy JSON schema for backward compatibility
 * @deprecated Use A2AReportResultInputSchema for runtime validation
 */
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
  input: ValidatedA2AReportResultInput,
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
