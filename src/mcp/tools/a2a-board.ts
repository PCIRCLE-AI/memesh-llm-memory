/**
 * MCP Tool: a2a-board
 *
 * Provides a Kanban-style view of all tasks in the unified task board.
 * Supports filtering by status, platform, and owner.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBoard, TaskFilter, Task, TaskStatus } from '../../a2a/storage/TaskBoard.js';

/**
 * Input schema validation for a2a-board tool
 */
export const A2ABoardInputSchema = z.object({
  status: z
    .enum(['pending', 'in_progress', 'completed', 'deleted'])
    .optional()
    .describe('Filter by task status'),
  platform: z
    .string()
    .optional()
    .describe('Filter by creator platform (e.g., claude-code, chatgpt, cursor)'),
  owner: z
    .string()
    .optional()
    .describe('Filter by owner agent ID'),
});

export type A2ABoardInput = z.infer<typeof A2ABoardInputSchema>;

/**
 * Tasks grouped by status for Kanban display
 */
interface GroupedTasks {
  pending: Task[];
  in_progress: Task[];
  completed: Task[];
  deleted: Task[];
}

/**
 * Handle a2a-board MCP tool invocation
 *
 * Displays tasks in Kanban-style format with filtering support.
 *
 * @param input - Filter options (status, platform, owner)
 * @param dbPath - Optional custom database path (for testing)
 * @returns Formatted task board output
 */
export function handleA2ABoard(
  input: A2ABoardInput = {},
  dbPath?: string
): CallToolResult {
  const taskBoard = new TaskBoard(dbPath);

  try {
    // Build filter from input
    const filter: TaskFilter = {};
    if (input.status) filter.status = input.status;
    if (input.platform) filter.creator_platform = input.platform;
    if (input.owner) filter.owner = input.owner;

    // Get tasks
    const hasFilters = Object.keys(filter).length > 0;
    const tasks = taskBoard.listTasks(hasFilters ? filter : undefined);

    // Generate formatted output
    const output = formatTaskBoard(tasks, input);

    return {
      content: [{ type: 'text', text: output }],
    };
  } finally {
    taskBoard.close();
  }
}

/**
 * Format tasks into Kanban-style text output
 *
 * @param tasks - Array of tasks to display
 * @param filter - Active filters for display info
 * @returns Formatted string output
 */
function formatTaskBoard(tasks: Task[], filter: A2ABoardInput): string {
  // Group tasks by status
  const grouped: GroupedTasks = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    deleted: tasks.filter((t) => t.status === 'deleted'),
  };

  // Build summary
  const total = tasks.length;
  const summaryParts: string[] = [];
  if (grouped.pending.length > 0) summaryParts.push(`${grouped.pending.length} pending`);
  if (grouped.in_progress.length > 0) summaryParts.push(`${grouped.in_progress.length} in_progress`);
  if (grouped.completed.length > 0) summaryParts.push(`${grouped.completed.length} completed`);
  if (grouped.deleted.length > 0) summaryParts.push(`${grouped.deleted.length} deleted`);

  const summaryDetail = summaryParts.length > 0 ? ` (${summaryParts.join(', ')})` : '';
  const summary = `${total} task${total !== 1 ? 's' : ''}${summaryDetail}`;

  // Build output
  let output = `📋 A2A Task Board\n================\n\n`;
  output += `📊 Summary: ${summary}\n\n`;

  // Pending section
  output += formatSection('📥 PENDING', grouped.pending);

  // In Progress section
  output += formatSection('🔄 IN PROGRESS', grouped.in_progress);

  // Completed section
  output += formatSection('✅ COMPLETED', grouped.completed);

  // Deleted section (only if filtered or has tasks)
  if (filter.status === 'deleted' || grouped.deleted.length > 0) {
    output += formatSection('🗑️ DELETED', grouped.deleted);
  }

  // Filter info
  output += `---\n`;
  const filterInfo = Object.entries(filter)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  output += `Filtered by: ${filterInfo || '(none)'}\n`;

  return output;
}

/**
 * Format a section of tasks
 *
 * @param title - Section title with emoji
 * @param tasks - Tasks in this section
 * @returns Formatted section string
 */
function formatSection(title: string, tasks: Task[]): string {
  let section = `${title} (${tasks.length})\n`;
  // Create separator line based on title length (accounting for emoji)
  section += '─'.repeat(title.length + 4) + '\n';

  if (tasks.length === 0) {
    section += '(none)\n\n';
  } else {
    for (const task of tasks) {
      // Use first 8 characters of UUID for short ID
      const shortId = task.id.substring(0, 8);
      section += `• [${shortId}] ${task.subject}\n`;
      section += `  Platform: ${task.creator_platform || 'unknown'} | Owner: ${task.owner || '(unassigned)'}\n`;
      section += '\n';
    }
  }

  return section;
}

/**
 * Tool definition for MCP registration
 */
export const a2aBoardToolDefinition = {
  name: 'a2a-board',
  description:
    'View all tasks in the unified task board with optional filtering (Kanban style). ' +
    'Shows tasks grouped by status (pending, in_progress, completed) with summary statistics.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'deleted'],
        description: 'Filter by task status',
      },
      platform: {
        type: 'string',
        description: 'Filter by creator platform (e.g., claude-code, chatgpt, cursor)',
      },
      owner: {
        type: 'string',
        description: 'Filter by owner agent ID',
      },
    },
  },
};
