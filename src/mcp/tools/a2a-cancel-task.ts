/**
 * MCP Tool: a2a-cancel-task
 *
 * Cancel a pending or in-progress task from the unified task board.
 * Only pending and in_progress tasks can be cancelled.
 * Completed or already cancelled tasks cannot be cancelled.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard, Task } from '../../a2a/storage/TaskBoard.js';
import { generateAgentId } from '../../a2a/utils/agentId.js';
import { UUID_V4_REGEX, formatShortId, createErrorResult, getErrorMessage } from './a2a-utils.js';

/**
 * Input schema validation for a2a-cancel-task tool
 */
export const A2ACancelTaskInputSchema = z.object({
  taskId: z
    .string()
    .min(1, 'taskId is required')
    .regex(UUID_V4_REGEX, 'taskId must be a valid UUID v4'),
  reason: z
    .string()
    .max(500, 'reason cannot exceed 500 characters')
    .optional(),
});

export type A2ACancelTaskInput = z.infer<typeof A2ACancelTaskInputSchema>;

/**
 * Handle a2a-cancel-task MCP tool invocation
 *
 * Cancels a pending or in-progress task from the unified task board.
 * Records the cancellation with the agent ID and optional reason.
 *
 * @param input - Object containing taskId to cancel and optional reason
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted result with cancellation status and task details
 */
export function handleA2ACancelTask(
  input: A2ACancelTaskInput,
  dbPath?: string
): CallToolResult {
  const taskBoard = new TaskBoard(dbPath);

  try {
    // Get the current agent ID
    const agentId = generateAgentId();

    // Cancel the task
    taskBoard.cancelTask(input.taskId, agentId, input.reason);

    // Get updated task
    const task = taskBoard.getTask(input.taskId);

    // Format success response
    const output = formatSuccessResponse(task!, agentId, input.reason);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    const shortId = formatShortId(input.taskId);
    return createErrorResult(`❌ Error cancelling task [${shortId}]`, getErrorMessage(error));
  } finally {
    taskBoard.close();
  }
}

/**
 * Format a successful cancellation response
 *
 * @param task - The cancelled task
 * @param agentId - The agent ID that cancelled the task
 * @param reason - Optional cancellation reason
 * @returns Formatted success message
 */
function formatSuccessResponse(task: Task, agentId: string, reason?: string): string {
  const shortId = formatShortId(task.id);

  let output = `✅ Task cancelled successfully!\n\n`;
  output += `Task: [${shortId}] ${task.subject}\n`;
  output += `Status: ${task.status}\n`;
  if (reason) {
    output += `Reason: ${reason}\n`;
  }
  output += `Cancelled by: ${agentId}\n`;

  return output;
}

/**
 * Tool definition for MCP registration
 */
export const a2aCancelTaskToolDefinition = {
  name: 'a2a-cancel-task',
  description:
    'Cancel a pending or in-progress task. ' +
    'Only tasks in pending or in_progress status can be cancelled. ' +
    'Completed tasks cannot be cancelled.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to cancel',
        pattern: UUID_V4_REGEX.source,
      },
      reason: {
        type: 'string',
        description: 'Optional reason for cancellation (max 500 characters)',
        maxLength: 500,
      },
    },
    required: ['taskId'],
  },
};
