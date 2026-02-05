/**
 * MCP Tool: a2a-set-skills
 *
 * Set skills for the current agent to enable skill-based task matching.
 * Auto-registers agent if not exists in the unified task board.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard } from '../../a2a/storage/TaskBoard.js';
import { generateAgentId } from '../../a2a/utils/agentId.js';
import { detectPlatform } from '../../a2a/utils/platformDetection.js';
import * as os from 'os';

/**
 * Input schema validation for a2a-set-skills tool
 *
 * Validates that skills is an array of non-empty strings,
 * each with a maximum length of 100 characters.
 */
export const A2ASetSkillsInputSchema = z.object({
  skills: z
    .array(
      z
        .string()
        .min(1, 'Skill cannot be empty')
        .max(100, 'Skill exceeds maximum length of 100 characters')
        .refine((val) => val.trim().length > 0, {
          message: 'Skill cannot be whitespace only',
        })
    )
    .describe('Array of skill strings for task matching'),
});

export type A2ASetSkillsInput = z.infer<typeof A2ASetSkillsInputSchema>;

/**
 * Handle a2a-set-skills MCP tool invocation
 *
 * Sets skills for the current agent. If the agent doesn't exist,
 * it will be automatically registered with the provided skills.
 *
 * @param input - Object containing skills array
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted result with skill update confirmation
 */
export function handleA2ASetSkills(
  input: A2ASetSkillsInput,
  dbPath?: string
): CallToolResult {
  let taskBoard: TaskBoard | null = null;

  try {
    taskBoard = new TaskBoard(dbPath);

    // Get the current agent ID and platform
    const agentId = generateAgentId();
    const platform = detectPlatform();

    // Trim whitespace from each skill
    const trimmedSkills = input.skills.map((skill) => skill.trim());

    // Check if agent already exists
    const existingAgent = taskBoard.getAgent(agentId);

    if (existingAgent) {
      // Update existing agent's skills
      taskBoard.updateAgentSkills(agentId, trimmedSkills);
    } else {
      // Register new agent with skills
      const hostname = os.hostname();
      const username = os.userInfo().username;

      taskBoard.registerAgent({
        agent_id: agentId,
        platform,
        hostname,
        username,
        skills: trimmedSkills,
      });
    }

    // Format success response
    const output = formatSuccessResponse(agentId, platform, trimmedSkills);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    // Format error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const output = formatErrorResponse(errorMessage);

    return {
      content: [{ type: 'text', text: output }],
    };
  } finally {
    if (taskBoard) {
      taskBoard.close();
    }
  }
}

/**
 * Format a successful skills update response
 *
 * @param agentId - The agent ID
 * @param platform - The detected platform
 * @param skills - The updated skills array
 * @returns Formatted success message
 */
function formatSuccessResponse(
  agentId: string,
  platform: string,
  skills: string[]
): string {
  let output = `✅ Skills updated successfully!\n\n`;
  output += `Agent: ${agentId}\n`;
  output += `Platform: ${platform}\n`;
  output += `Skills: ${skills.length > 0 ? skills.join(', ') : '(none)'}\n\n`;
  output += `Your agent is now registered for skill-based task matching.\n`;
  output += `Use a2a-find-tasks to discover tasks matching your skills.`;

  return output;
}

/**
 * Format an error response
 *
 * @param errorMessage - The error message
 * @returns Formatted error message
 */
function formatErrorResponse(errorMessage: string): string {
  let output = `❌ Error setting skills\n\n`;
  output += `Reason: ${errorMessage}\n`;

  return output;
}

/**
 * Tool definition for MCP registration
 */
export const a2aSetSkillsToolDefinition = {
  name: 'a2a-set-skills',
  description:
    'Set skills for the current agent to enable skill-based task matching. ' +
    'Auto-registers agent if not exists.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      skills: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
        description: 'Array of skill strings (e.g., ["typescript", "testing", "code-review"])',
      },
    },
    required: ['skills'],
  },
};
