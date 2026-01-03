import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import { getStatsService } from '../../core/StatsService.js';
import { logger } from '../../utils/logger.js';
import {
  progressBar,
  ratioBar,
  labeledProgressBar,
  sparkline,
} from '../../ui/AsciiProgressBar.js';

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

    // Check if we have any data
    const dbStats = statsService.getDatabaseStats();
    if (dbStats.totalTasks === 0) {
      // No data yet - provide helpful message with empty progress bars
      const noDataDashboard = formatStatsDashboard({
        period: input.period,
        tokensUsed: 0,
        tokensSaved: 0,
        costSavings: '$0.00',
        routingDecisions: { ollama: 0, claude: 0 },
        tasksCompleted: 0,
        tasksFailed: 0,
        avgComplexity: 0,
        successRate: 0,
        avgDurationMs: 0,
        isEmpty: true,
      });

      return {
        content: [{ type: 'text' as const, text: noDataDashboard }],
      };
    }

    // Format dashboard with ASCII progress bars
    const dashboard = formatStatsDashboard({
      period: formattedStats.period,
      tokensUsed: formattedStats.tokensUsed,
      tokensSaved: formattedStats.tokensSaved,
      costSavings: formattedStats.costSavings,
      routingDecisions: formattedStats.routingDecisions,
      tasksCompleted: formattedStats.tasksCompleted,
      tasksFailed: periodStats.tasksFailed,
      avgComplexity: formattedStats.avgComplexity,
      successRate: periodStats.successRate,
      avgDurationMs: periodStats.avgDurationMs,
      isEmpty: false,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: dashboard,
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

// ============================================================================
// Dashboard Formatting
// ============================================================================

interface DashboardData {
  period: string;
  tokensUsed: number;
  tokensSaved: number;
  costSavings: string;
  routingDecisions: { ollama: number; claude: number; hybrid?: number };
  tasksCompleted: number;
  tasksFailed: number;
  avgComplexity: number;
  successRate: number;
  avgDurationMs: number;
  isEmpty: boolean;
}

/**
 * Format stats as a beautiful ASCII dashboard with progress bars
 */
function formatStatsDashboard(data: DashboardData): string {
  const lines: string[] = [];

  // Header
  lines.push('╭────────────────────────────────────────────────────────╮');
  lines.push('│          📊 CLAUDE CODE BUDDY - PERFORMANCE            │');
  lines.push('╰────────────────────────────────────────────────────────╯');
  lines.push('');

  // Period indicator
  const periodLabel = getPeriodLabel(data.period);
  lines.push(`📅 Period: ${periodLabel}`);
  lines.push('');

  if (data.isEmpty) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│  No statistics recorded yet.                        │');
    lines.push('│  Stats will appear after you use buddy_do to        │');
    lines.push('│  complete tasks.                                    │');
    lines.push('└─────────────────────────────────────────────────────┘');
    return lines.join('\n');
  }

  // Success Rate Section
  lines.push('━━━ Task Performance ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const successColor = data.successRate >= 0.9 ? 'green' : data.successRate >= 0.7 ? 'yellow' : 'red';
  lines.push(`  Success Rate: ${progressBar(data.successRate, { width: 25, filledColor: successColor })}`);
  lines.push(`  Tasks: ${data.tasksCompleted} completed, ${data.tasksFailed} failed`);
  lines.push(`  Avg Duration: ${formatDuration(data.avgDurationMs)}`);
  lines.push('');

  // Model Routing Section
  lines.push('━━━ Model Routing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const ollamaCount = data.routingDecisions.ollama;
  const claudeCount = data.routingDecisions.claude;
  const hybridCount = data.routingDecisions.hybrid || 0;
  const totalRouting = ollamaCount + claudeCount + hybridCount;

  if (totalRouting > 0) {
    lines.push(`  ${ratioBar(ollamaCount, claudeCount, {
      width: 25,
      labels: ['Ollama', 'Claude'],
      colors: ['cyan', 'magenta'],
    })}`);
    if (hybridCount > 0) {
      lines.push(`  Hybrid: ${hybridCount} (${Math.round((hybridCount / totalRouting) * 100)}%)`);
    }
  } else {
    lines.push('  No routing decisions recorded');
  }
  lines.push('');

  // Token Usage Section
  lines.push('━━━ Token Usage & Savings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const totalTokens = data.tokensUsed + data.tokensSaved;
  const savingsPercent = totalTokens > 0 ? data.tokensSaved / totalTokens : 0;

  lines.push(`  Tokens Used:  ${formatNumber(data.tokensUsed)}`);
  lines.push(`  Tokens Saved: ${formatNumber(data.tokensSaved)}`);

  if (totalTokens > 0) {
    lines.push(`  Efficiency:   ${progressBar(savingsPercent, { width: 25, filledColor: 'green' })}`);
  }

  lines.push(`  Cost Savings: ${data.costSavings}`);
  lines.push('');

  // Complexity Section
  lines.push('━━━ Task Complexity ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const complexityNormalized = data.avgComplexity / 10; // Normalize 0-10 to 0-1
  const complexityColor = data.avgComplexity <= 3 ? 'green' : data.avgComplexity <= 6 ? 'yellow' : 'red';
  lines.push(`  Avg Complexity: ${progressBar(complexityNormalized, { width: 25, filledColor: complexityColor })} (${data.avgComplexity.toFixed(1)}/10)`);
  lines.push('');

  // Footer
  lines.push('────────────────────────────────────────────────────────');
  lines.push('Powered by Claude Code Buddy | MCP Server');

  return lines.join('\n');
}

/**
 * Get human-readable period label
 */
function getPeriodLabel(period: string): string {
  switch (period) {
    case 'day':
      return 'Today';
    case 'week':
      return 'Last 7 Days';
    case 'month':
      return 'This Month';
    case 'all':
    default:
      return 'All Time';
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format large numbers with separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}
