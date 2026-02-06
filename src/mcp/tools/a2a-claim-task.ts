/**
 * MCP Tool: a2a-claim-task
 *
 * Claim a pending task from the unified task board for the current agent.
 * Uses platform-aware agent ID for ownership tracking.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard, Task } from '../../a2a/storage/TaskBoard.js';
import { generateAgentId } from '../../a2a/utils/agentId.js';
import { UUID_V4_REGEX, formatShortId, createErrorResult, getErrorMessage } from './a2a-utils.js';

/**
 * Input schema validation for a2a-claim-task tool
 */
export const A2AClaimTaskInputSchema = z.object({
  taskId: z
    .string()
    .min(1, 'taskId is required')
    .regex(UUID_V4_REGEX, 'taskId must be a valid UUID v4'),
});

export type A2AClaimTaskInput = z.infer<typeof A2AClaimTaskInputSchema>;

/**
 * Handle a2a-claim-task MCP tool invocation
 *
 * Claims a pending task from the unified task board, assigning ownership
 * to the current agent and updating status to 'in_progress'.
 *
 * @param input - Object containing taskId to claim
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted result with claim status and task details
 */
export function handleA2AClaimTask(
  input: A2AClaimTaskInput,
  dbPath?: string
): CallToolResult {
  const taskBoard = new TaskBoard(dbPath);

  try {
    // Get the current agent ID
    const agentId = generateAgentId();

    // Attempt to claim the task
    taskBoard.claimTask(input.taskId, agentId);

    // Get the updated task details
    const task = taskBoard.getTask(input.taskId);

    // Format success response
    const output = formatSuccessResponse(task!, agentId);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    const shortId = formatShortId(input.taskId);
    return createErrorResult(`❌ Error claiming task [${shortId}]`, getErrorMessage(error));
  } finally {
    taskBoard.close();
  }
}

/**
 * Format a successful claim response
 *
 * @param task - The claimed task
 * @param agentId - The agent ID that claimed the task
 * @returns Formatted success message
 */
function formatSuccessResponse(task: Task, agentId: string): string {
  const shortId = formatShortId(task.id);

  let output = `✅ Task claimed successfully!\n\n`;
  output += `Task: [${shortId}] ${task.subject}\n`;
  output += `Claimed by: ${agentId}\n`;
  output += `Status: ${task.status}\n`;

  return output;
}

/**
 * Tool definition for MCP registration
 */
export const a2aClaimTaskToolDefinition = {
  name: 'a2a-claim-task',
  description:
    'Claim a pending task from the unified task board for the current agent. ' +
    'The task must be in pending status. After claiming, the task status becomes in_progress.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'UUID of the task to claim',
        pattern: UUID_V4_REGEX.source,
      },
    },
    required: ['taskId'],
  },
};
