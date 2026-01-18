import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import { logger } from '../../utils/logger.js';

export const BuddyDoInputSchema = z.object({
  task: z.string().trim().min(1).describe('Task description for CCB to execute with smart routing'),
});

export type ValidatedBuddyDoInput = z.infer<typeof BuddyDoInputSchema>;

/**
 * buddy_do tool - Execute tasks with smart routing
 *
 * User-friendly wrapper for task execution. Analyzes complexity and routes
 * to the best capability with prompt enhancement.
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
  const startTime = Date.now();
  const taskId = `buddy-do-${startTime}`;

  try {
    // Route task through smart routing system
    const result = await router.routeTask({
      id: taskId,
      description: input.task,
      requiredCapabilities: [],
    });

    const durationMs = Date.now() - startTime;

    const selectedAgent = result.routing.selectedAgent || 'general-agent';

    logger.debug('buddy_do task completed', {
      taskId,
      agent: selectedAgent,
      complexity: result.analysis.complexity,
      durationMs,
    });

    const capabilityFocus = result.analysis.requiredCapabilities.length > 0
      ? result.analysis.requiredCapabilities
      : ['general'];

    const formattedResponse = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'success',
      enhancedPrompt: result.routing.enhancedPrompt,
      results: {
        routing: {
          approved: result.approved,
          message: result.approved
            ? `Task routed for capabilities: ${capabilityFocus.join(', ')}`
            : result.message,
          capabilityFocus,
          complexity: result.analysis.complexity,
          estimatedTokens: result.analysis.estimatedTokens,
          estimatedCost: result.routing.estimatedCost,
        },
        stats: {
          durationMs,
          estimatedTokens: result.analysis.estimatedTokens,
        },
      },
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
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const durationMs = Date.now() - startTime;

    logger.error('buddy_do task failed', { taskId, error: errorObj.message });

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
