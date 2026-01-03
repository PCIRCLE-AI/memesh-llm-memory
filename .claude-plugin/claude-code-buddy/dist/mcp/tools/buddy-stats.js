import { z } from 'zod';
export const BuddyStatsInputSchema = z.object({
    period: z
        .enum(['day', 'week', 'month', 'all'])
        .optional()
        .default('all')
        .describe('Time period for statistics'),
});
export async function executeBuddyStats(input, formatter) {
    try {
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
    }
    catch (error) {
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
//# sourceMappingURL=buddy-stats.js.map