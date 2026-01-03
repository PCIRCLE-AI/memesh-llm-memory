import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyDoInputSchema = z.object({
  task: z.string().trim().min(1).describe('Task description for CCB to execute with smart routing'),
});

export type ValidatedBuddyDoInput = z.infer<typeof BuddyDoInputSchema>;

/**
 * buddy_do tool - Execute tasks with smart routing
 *
 * User-friendly wrapper for task execution. Analyzes complexity and routes to:
 * - Ollama (simple tasks, fast & free)
 * - Claude (complex tasks, high quality)
 *
 * Examples:
 *   task: "setup authentication"
 *   task: "refactor user service"
 *   task: "fix login bug"
 */
export async function executeBuddyDo(
  input: ValidatedBuddyDoInput,
  router: Router,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Route task through smart routing system
    const result = await router.routeTask({
      id: `buddy-do-${Date.now()}`,
      description: input.task,
      requiredCapabilities: [],
    });

    const formattedResponse = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj =
      error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}
