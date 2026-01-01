import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';

export const BuddyStatsInputSchema = z.object({
  period: z
    .enum(['day', 'week', 'month', 'all'])
    .optional()
    .default('all')
    .describe('Time period for statistics'),
});

export type ValidatedBuddyStatsInput = z.infer<typeof BuddyStatsInputSchema>;

/**
 * buddy_stats tool - View performance dashboard
 *
 * Shows:
 * - Token usage and cost savings
 * - Model routing decisions (Ollama vs Claude)
 * - Task completion metrics
 * - Performance trends
 *
 * Examples:
 *   period: "day"   - Today's stats
 *   period: "week"  - Last 7 days
 *   period: "month" - Last 30 days
 *   period: "all"   - All time (default)
 */
export async function executeBuddyStats(
  input: ValidatedBuddyStatsInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // TODO: Implement actual stats collection from token tracker - See issue #5
    // For now, return placeholder data
    const stats = {
      period: input.period,
      tokensUsed: 125000,
      tokensSaved: 450000,
      costSavings: '$9.00',
      routingDecisions: {
        ollama: 45,
        claude: 12,
      },
      tasksCompleted: 57,
      avgComplexity: 5.2,
    };

    const formattedResponse = formatter.format({
      agentType: 'buddy-stats',
      taskDescription: `Show performance stats for period: ${input.period}`,
      status: 'success',
      results: stats,
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
      agentType: 'buddy-stats',
      taskDescription: `Show performance stats for period: ${input.period}`,
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
