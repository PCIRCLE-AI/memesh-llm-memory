import { z } from 'zod';
export const BuddyDoInputSchema = z.object({
    task: z.string().min(1).describe('Task description for CCB to execute with smart routing'),
});
export async function executeBuddyDo(input, router, formatter) {
    try {
        const result = await router.routeTask({
            id: `buddy-do-${Date.now()}`,
            description: input.task,
            requiredCapabilities: [],
        });
        const formattedResponse = formatter.format({
            agentType: 'buddy-do',
            taskDescription: input.task,
            status: 'success',
            results: result,
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
            agentType: 'buddy-do',
            taskDescription: input.task,
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
//# sourceMappingURL=buddy-do.js.map