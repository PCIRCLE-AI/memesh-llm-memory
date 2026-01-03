/**
 * MCP Tool: get-session-health
 *
 * Provides system health status for Claude Code Buddy.
 * Checks database, filesystem, memory, and optional components.
 */

import { z } from 'zod';
import { HealthChecker, formatHealthStatus } from '../../core/HealthCheck.js';
import { logger } from '../../utils/logger.js';

export const HealthCheckInputSchema = z.object({
  includeOptional: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include optional components (Ollama, OpenAI, RAG)'),
});

export type ValidatedHealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

/**
 * get-session-health tool - Check CCB system health
 *
 * Returns health status for all components:
 * - Core: database, filesystem, memory
 * - Optional: RAG, Ollama, OpenAI
 *
 * Examples:
 *   includeOptional: false - Check core components only
 *   includeOptional: true  - Check all components
 */
export async function executeHealthCheck(
  input: ValidatedHealthCheckInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const checker = new HealthChecker({ timeout: 5000 });
    const health = await checker.checkAll({
      includeOptional: input.includeOptional,
    });

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
