/**
 * MCP Tool: a2a-find-tasks
 *
 * Find tasks matching specified skills or criteria from the unified task board.
 * Supports skill-based matching in both task metadata and subject text.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard, Task, TaskStatus } from '../../a2a/storage/TaskBoard.js';
import { formatShortId, createErrorResult, getErrorMessage } from './a2a-utils.js';

/**
 * Valid task status values for filtering
 */
const VALID_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'deleted'];

/**
 * Input schema validation for a2a-find-tasks tool
 */
export const A2AFindTasksInputSchema = z.object({
  skills: z
    .array(z.string())
    .optional()
    .describe('Array of skill strings to match against task metadata or subject'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'deleted'])
    .optional()
    .default('pending')
    .describe('Task status filter (default: pending)'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .optional()
    .default(10)
    .describe('Maximum number of results (default: 10, max: 50)'),
});

export type A2AFindTasksInput = z.infer<typeof A2AFindTasksInputSchema>;

/**
 * Task with matched skills information for sorting
 */
interface TaskWithMatches {
  task: Task;
  matchedSkills: string[];
  matchCount: number;
}

/**
 * Handle a2a-find-tasks MCP tool invocation
 *
 * Finds tasks matching the specified skills in metadata.required_skills
 * or in the task subject. Results are sorted by relevance (number of matches).
 *
 * @param input - Object containing optional skills, status, and limit
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted result with matching tasks
 */
export function handleA2AFindTasks(
  input: A2AFindTasksInput,
  dbPath?: string
): CallToolResult {
  const taskBoard = new TaskBoard(dbPath);

  try {
    // Apply defaults
    const status = input.status || 'pending';
    const limit = input.limit || 10;
    const skills = input.skills || [];

    // Get all tasks matching the status filter
    const allTasks = taskBoard.listTasks({ status });

    // If no skills provided or empty array, return all tasks (up to limit)
    if (skills.length === 0) {
      const limitedTasks = allTasks.slice(0, limit);
      const output = formatSuccessResponse(
        limitedTasks.map(task => ({ task, matchedSkills: [], matchCount: 0 })),
        allTasks.length,
        limit,
        skills,
        status
      );
      return { content: [{ type: 'text', text: output }] };
    }

    // Match tasks against skills
    const tasksWithMatches = matchTasksToSkills(allTasks, skills);

    // Filter to only tasks with at least one match
    const matchingTasks = tasksWithMatches.filter(t => t.matchCount > 0);

    // Sort by match count (highest first)
    matchingTasks.sort((a, b) => b.matchCount - a.matchCount);

    // Apply limit
    const limitedTasks = matchingTasks.slice(0, limit);

    // Format response
    if (limitedTasks.length === 0) {
      const output = formatEmptyResponse(skills, status);
      return { content: [{ type: 'text', text: output }] };
    }

    const output = formatSuccessResponse(limitedTasks, matchingTasks.length, limit, skills, status);
    return { content: [{ type: 'text', text: output }] };

  } catch (error) {
    return createErrorResult('Error finding tasks', getErrorMessage(error));
  } finally {
    taskBoard.close();
  }
}

/**
 * Match tasks against the specified skills
 *
 * Matching logic:
 * 1. Check if task metadata.required_skills contains any of the specified skills (exact match)
 * 2. Check if task subject contains any skill keyword (case-insensitive)
 *
 * @param tasks - Array of tasks to match
 * @param skills - Array of skills to match against
 * @returns Array of tasks with match information
 */
function matchTasksToSkills(tasks: Task[], skills: string[]): TaskWithMatches[] {
  const lowerSkills = skills.map(s => s.toLowerCase());

  return tasks.map(task => {
    const matchedSkills = new Set<string>();

    // Check metadata.required_skills
    if (task.metadata) {
      try {
        const metadata = JSON.parse(task.metadata);
        if (metadata.required_skills && Array.isArray(metadata.required_skills)) {
          for (const requiredSkill of metadata.required_skills) {
            const lowerRequired = String(requiredSkill).toLowerCase();
            for (const skill of lowerSkills) {
              if (lowerRequired === skill) {
                matchedSkills.add(skill);
              }
            }
          }
        }
      } catch {
        // Invalid JSON metadata, skip
      }
    }

    // Check subject for skill keywords (case-insensitive)
    const lowerSubject = task.subject.toLowerCase();
    for (const skill of lowerSkills) {
      // Match whole word or as part of compound (e.g., "typescript" matches "TypeScript")
      if (lowerSubject.includes(skill)) {
        matchedSkills.add(skill);
      }
    }

    return {
      task,
      matchedSkills: Array.from(matchedSkills),
      matchCount: matchedSkills.size,
    };
  });
}

/**
 * Format a successful response with matching tasks
 *
 * @param tasksWithMatches - Array of tasks with match information
 * @param totalMatches - Total number of matching tasks (before limit)
 * @param limit - Applied limit
 * @param skills - Skills that were searched for
 * @param status - Status filter applied
 * @returns Formatted success message
 */
function formatSuccessResponse(
  tasksWithMatches: TaskWithMatches[],
  totalMatches: number,
  limit: number,
  skills: string[],
  status: string
): string {
  const displayCount = tasksWithMatches.length;

  if (displayCount === 0) {
    return formatEmptyResponse(skills, status);
  }

  let output = `🔍 Found ${displayCount} task(s) matching criteria\n\n`;

  tasksWithMatches.forEach((item, index) => {
    const shortId = formatShortId(item.task.id);
    output += `${index + 1}. [${shortId}] ${item.task.subject}\n`;
    output += `   Status: ${item.task.status} | Platform: ${item.task.creator_platform}\n`;

    if (item.matchedSkills.length > 0) {
      output += `   Matched skills: ${item.matchedSkills.join(', ')}\n`;
    }

    output += '\n';
  });

  output += '---\n';
  output += `Showing ${displayCount} of ${totalMatches} total matching tasks`;

  return output;
}

/**
 * Format an empty result response with helpful guidance
 *
 * @param skills - Skills that were searched for
 * @param status - Status filter applied
 * @returns Formatted empty result message
 */
function formatEmptyResponse(skills: string[], status: string): string {
  let output = `🔍 No tasks found matching criteria\n\n`;
  output += `Filters applied:\n`;

  if (skills.length > 0) {
    output += `- Skills: ${skills.join(', ')}\n`;
  }

  output += `- Status: ${status}\n\n`;
  output += `Tip: Try broader skills or different status filter.`;

  return output;
}

/**
 * Tool definition for MCP registration
 */
export const a2aFindTasksToolDefinition = {
  name: 'a2a-find-tasks',
  description:
    'Find tasks matching specified skills or criteria from the unified task board. ' +
    'Matches skills against task metadata.required_skills and subject text. ' +
    'Results sorted by relevance (number of skill matches).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of skill strings to match against task metadata or subject',
      },
      status: {
        type: 'string',
        enum: VALID_STATUSES,
        description: 'Task status filter (default: pending)',
        default: 'pending',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10, max: 50)',
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
  },
};
