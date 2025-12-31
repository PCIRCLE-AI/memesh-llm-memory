import { z } from 'zod';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyRememberInputSchema = z.object({
  query: z.string().min(1).describe('What to remember/recall from project memory'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(5)
    .describe('Maximum number of memories to retrieve'),
});

export type ValidatedBuddyRememberInput = z.infer<typeof BuddyRememberInputSchema>;

/**
 * buddy_remember tool - Recall project memory
 *
 * Searches knowledge graph for:
 * - Past decisions and architecture choices
 * - API design decisions
 * - Bug fixes and solutions
 * - Project patterns and conventions
 *
 * Examples:
 *   query: "api design decisions"
 *   query: "authentication approach"
 *   query: "database schema changes"
 */
export async function executeBuddyRemember(
  input: ValidatedBuddyRememberInput,
  projectMemory: ProjectMemoryManager,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Search project memory
    const memories = await projectMemory.search(input.query, input.limit);

    if (memories.length === 0) {
      const formattedResponse = formatter.format({
        agentType: 'buddy-remember',
        taskDescription: `Search project memory: ${input.query}`,
        status: 'success',
        results: {
          query: input.query,
          count: 0,
          suggestions: [
            'Try a broader search term',
            'Check if memories were stored for this topic',
            'Use different keywords',
          ],
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: formattedResponse,
          },
        ],
      };
    }

    const formattedResponse = formatter.format({
      agentType: 'buddy-remember',
      taskDescription: `Search project memory: ${input.query}`,
      status: 'success',
      results: {
        query: input.query,
        memories: memories,
        count: memories.length,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'buddy-remember',
      taskDescription: `Search project memory: ${input.query}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedError,
        },
      ],
    };
  }
}
