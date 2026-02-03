import { z } from 'zod';
import { HealthChecker, formatHealthStatus } from '../../core/HealthCheck.js';
import { logger } from '../../utils/logger.js';
export const HealthCheckInputSchema = z.object({});
export async function executeHealthCheck(_input) {
    try {
        const checker = new HealthChecker({ timeout: 5000 });
        const health = await checker.checkAll();
        const formattedStatus = formatHealthStatus(health);
        logger.debug('Health check completed', {
            status: health.status,
            isHealthy: health.isHealthy,
            componentCount: health.components.length,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: formattedStatus,
                },
            ],
        };
    }
    catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Health check failed', { error: errorObj.message });
        return {
            content: [
                {
                    type: 'text',
                    text: `Health check failed: ${errorObj.message}`,
                },
            ],
        };
    }
}
//# sourceMappingURL=health-check.js.map