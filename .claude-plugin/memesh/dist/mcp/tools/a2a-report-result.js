import { z } from 'zod';
import { logger } from '../../utils/logger.js';
const TASK_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_TASK_ID_LENGTH = 100;
const MAX_RESULT_LENGTH = 100000;
const MAX_ERROR_LENGTH = 10000;
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
};
export async function a2aReportResult(input, taskQueue, delegator) {
    const { taskId, result, success, error } = input;
    const status = success ? 'COMPLETED' : 'FAILED';
    taskQueue.updateTaskStatus(taskId, {
        state: status,
        metadata: {
            result: success ? result : null,
            error: success ? null : (error || 'Task execution failed'),
            completedAt: Date.now()
        }
    });
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
//# sourceMappingURL=a2a-report-result.js.map