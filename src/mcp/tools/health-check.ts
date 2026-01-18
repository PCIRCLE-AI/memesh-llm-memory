/**
 * MCP Tool: get-session-health
 *
 * Provides system health status for Claude Code Buddy.
 * Checks database, filesystem, and memory.
 */

import { z } from 'zod';
import { HealthChecker, formatHealthStatus } from '../../core/HealthCheck.js';
import { logger } from '../../utils/logger.js';

export const HealthCheckInputSchema = z.object({});

export type ValidatedHealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

/**
 * get-session-health tool - Check CCB system health
 *
 * Returns health status for core components:
 * - database, filesystem, memory
 */
export async function executeHealthCheck(
  _input: ValidatedHealthCheckInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const checker = new HealthChecker({ timeout: 5000 });
    const health = await checker.checkAll();

    // Format health status for display (using pre-computed health - no redundant call)
    const formattedStatus = formatHealthStatus(health);

    logger.debug('Health check completed', {
      status: health.status,
      isHealthy: health.isHealthy,
      componentCount: health.components.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedStatus,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Health check failed', { error: errorObj.message });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Health check failed: ${errorObj.message}`,
        },
      ],
    };
  }
}
