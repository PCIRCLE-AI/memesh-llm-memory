import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import { getStatsService } from '../../core/StatsService.js';
import { type MicroDollars } from '../../utils/money.js';
import { logger } from '../../utils/logger.js';

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
 * All task executions are tracked in StatsService for buddy_stats.
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
  const statsService = getStatsService();

  try {
    // Route task through smart routing system
    const result = await router.routeTask({
      id: taskId,
      description: input.task,
      requiredCapabilities: [],
    });

    const durationMs = Date.now() - startTime;

    // Determine which model was used based on routing result
    const selectedAgent = result.routing.selectedAgent || 'general-agent';

    // Convert TaskComplexity string to numeric value for stats
    const complexityMap: Record<string, number> = {
      'simple': 3,
      'medium': 6,
      'complex': 9,
    };
    const complexity = complexityMap[result.analysis.complexity] || 5;

    // Determine model type based on complexity and agent
    // Simple tasks (complexity <= 5) -> Ollama, Complex (> 5) -> Claude
    const modelUsed: 'ollama' | 'claude' | 'hybrid' =
      complexity <= 3 ? 'ollama' :
      complexity <= 6 ? 'hybrid' :
      'claude';

    // Estimate tokens (based on task description length and typical response)
    const estimatedInputTokens = Math.ceil(input.task.length / 4);
    const estimatedOutputTokens = estimatedInputTokens * 3; // Typical ratio
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Calculate tokens saved if using Ollama instead of Claude
    const tokensSaved = modelUsed === 'ollama' ? totalTokens :
                       modelUsed === 'hybrid' ? Math.floor(totalTokens * 0.4) : 0;

    // Estimate cost (very rough: $3/1M input + $15/1M output for Claude)
    // Ollama is free, hybrid uses partial Claude
    const costPerToken = modelUsed === 'claude' ? 0.000009 :
                        modelUsed === 'hybrid' ? 0.000005 : 0;
    const costMicro = Math.round(totalTokens * costPerToken * 1_000_000) as MicroDollars;

    // Record the task
    statsService.recordTask({
      timestamp: new Date(),
      agentType: selectedAgent,
      taskDescription: input.task.substring(0, 200), // Truncate for storage
      complexity,
      durationMs,
      tokensUsed: totalTokens,
      tokensSaved,
      costMicro,
      success: true,
      modelUsed,
    });

    // Record the routing decision
    statsService.recordRoutingDecision({
      timestamp: new Date(),
      taskId,
      selectedModel: modelUsed,
      reason: `Complexity ${complexity}/10 -> ${modelUsed}`,
      complexity,
      estimatedTokens: totalTokens,
    });

    logger.debug('buddy_do task completed', {
      taskId,
      agent: selectedAgent,
      model: modelUsed,
      complexity,
      durationMs,
    });

    const formattedResponse = formatter.format({
      agentType: 'buddy-do',
      taskDescription: input.task,
      status: 'success',
      results: {
        ...result,
        stats: {
          durationMs,
          modelUsed,
          complexity,
          tokensUsed: totalTokens,
          tokensSaved,
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

    // Record failed task
    statsService.recordTask({
      timestamp: new Date(),
      agentType: 'buddy-do',
      taskDescription: input.task.substring(0, 200),
      complexity: 5, // Default
      durationMs,
      tokensUsed: 0,
      tokensSaved: 0,
      costMicro: 0 as MicroDollars,
      success: false,
      modelUsed: 'claude', // Assume Claude was attempted
    });

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
