/**
 * MCP Tool: a2a-list-tasks
 *
 * Lists pending tasks for an agent from the MCPTaskDelegator's in-memory queue.
 * Used by MCP Client for polling (every 5 seconds).
 */

import { z } from 'zod';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';

export const A2AListTasksInputSchema = z.object({
  agentId: z.string().describe('Agent ID to list pending tasks for'),
});

export type ValidatedA2AListTasksInput = z.infer<typeof A2AListTasksInputSchema>;

/**
 * a2a-list-tasks tool - List pending tasks for an agent
 *
 * Returns pending tasks from MCPTaskDelegator's in-memory queue.
 * Used for polling interface by MCP Client.
 *
 * @param input - The validated input containing agentId
 * @param delegator - MCPTaskDelegator instance
 * @returns Promise with task list in JSON format
 */
export async function a2aListTasks(
  input: ValidatedA2AListTasksInput,
  delegator: MCPTaskDelegator
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { agentId } = input;

  // Get pending tasks from MCPTaskDelegator's in-memory queue
  const tasks = await delegator.getPendingTasks(agentId);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(tasks, null, 2),
      },
    ],
  };
}
