/**
 * MCP Tool: a2a-release-task
 *
 * Release a claimed task back to pending status for other agents to claim.
 * Clears task ownership and resets status to 'pending'.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard, Task } from '../../a2a/storage/TaskBoard.js';
import { UUID_V4_REGEX, formatShortId, createErrorResult, getErrorMessage } from './a2a-utils.js';

/**
 * Input schema validation for a2a-release-task tool
 */
export const A2AReleaseTaskInputSchema = z.object({
  taskId: z
    .string()
    .min(1, 'taskId is required')
    .regex(UUID_V4_REGEX, 'taskId must be a valid UUID v4'),
});

export type A2AReleaseTaskInput = z.infer<typeof A2AReleaseTaskInputSchema>;

/**
 * Handle a2a-release-task MCP tool invocation
 *
 * Releases a task back to the unified task board, clearing ownership
 * and resetting status to 'pending' so other agents can claim it.
 *
 * @param input - Object containing taskId to release
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted result with release status and task details
 */
export function handleA2AReleaseTask(
  input: A2AReleaseTaskInput,
  dbPath?: string
): CallToolResult {
  const taskBoard = new TaskBoard(dbPath);

  try {
    // Attempt to release the task
    taskBoard.releaseTask(input.taskId);

    // Get the updated task details
    const task = taskBoard.getTask(input.taskId);

    // Format success response
    const output = formatSuccessResponse(task!);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    const shortId = formatShortId(input.taskId);
    return createErrorResult(`❌ Error releasing task [${shortId}]`, getErrorMessage(error));
  } finally {
    taskBoard.close();
  }
}

/**
 * Format a successful release response
 *
 * @param task - The released task
 * @returns Formatted success message
 */
function formatSuccessResponse(task: Task): string {
  const shortId = formatShortId(task.id);

  let output = `✅ Task released successfully!\n\n`;
  output += `Task: [${shortId}] ${task.subject}\n`;
  output += `Status: ${task.status}\n`;
  output += `Owner: (unassigned)\n\n`;
  output += `Task is now available for other agents to claim.`;

  return output;
}

/**
 * Tool definition for MCP registration
 */
export const a2aReleaseTaskToolDefinition = {
  name: 'a2a-release-task',
  description:
    'Release a claimed task back to pending status for other agents to claim. ' +
    'Clears task ownership and resets status to pending.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to release',
        pattern: UUID_V4_REGEX.source,
      },
    },
    required: ['taskId'],
  },
};
