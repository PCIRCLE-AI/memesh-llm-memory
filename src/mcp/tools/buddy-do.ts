import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyDoInputSchema = z.object({
  task: z.string().min(1).describe('Task description for CCB to execute with smart routing'),
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
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Route task through smart routing system
    const result = await router.routeTask({
      id: `buddy-do-${Date.now()}`,
      description: input.task,
      requiredCapabilities: [],
    });

    const formattedResponse = formatter.format({
      success: true,
      message: `✅ Task executed via Claude Code Buddy`,
      data: result,
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
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during task execution';

    const formattedError = formatter.format({
      success: false,
      message: `❌ Task execution failed`,
      error: errorMessage,
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
