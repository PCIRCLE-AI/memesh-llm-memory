import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import { getStatsService } from '../../core/StatsService.js';
import { logger } from '../../utils/logger.js';

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
 * Shows real statistics from the StatsService:
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
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Get real statistics from StatsService
    const statsService = getStatsService();
    const periodStats = statsService.getStats(input.period);
    const formattedStats = statsService.formatStatsForDisplay(periodStats);

    // Format for response
    const stats = {
      period: formattedStats.period,
      tokensUsed: formattedStats.tokensUsed,
      tokensSaved: formattedStats.tokensSaved,
      costSavings: formattedStats.costSavings,
      routingDecisions: formattedStats.routingDecisions,
      tasksCompleted: formattedStats.tasksCompleted,
      avgComplexity: formattedStats.avgComplexity,
      // Additional context
      successRate: `${(periodStats.successRate * 100).toFixed(1)}%`,
      avgDurationMs: Math.round(periodStats.avgDurationMs),
    };

    // Check if we have any data
    const dbStats = statsService.getDatabaseStats();
    if (dbStats.totalTasks === 0) {
      // No data yet - provide helpful message
      const noDataResponse = formatter.format({
        agentType: 'buddy-stats',
        taskDescription: `Show performance stats for period: ${input.period}`,
        status: 'success',
        results: {
          message: 'No statistics recorded yet. Stats will appear after you use buddy_do to complete tasks.',
          period: input.period,
          tokensUsed: 0,
          tokensSaved: 0,
          costSavings: '$0.00',
          routingDecisions: { ollama: 0, claude: 0 },
          tasksCompleted: 0,
          avgComplexity: 0,
        },
      });

      return {
        content: [{ type: 'text' as const, text: noDataResponse }],
      };
    }

    const formattedResponse = formatter.format({
      agentType: 'buddy-stats',
      taskDescription: `Show performance stats for period: ${input.period}`,
      status: 'success',
      results: stats,
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
    logger.error('buddy_stats error', { error: errorObj.message });

    const formattedError = formatter.format({
      agentType: 'buddy-stats',
      taskDescription: `Show performance stats for period: ${input.period}`,
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
