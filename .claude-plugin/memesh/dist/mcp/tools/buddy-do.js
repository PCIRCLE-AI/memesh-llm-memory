import { z } from 'zod';
import { logger } from '../../utils/logger.js';
export const BuddyDoInputSchema = z.object({
    task: z.string().trim().min(1).describe('Task description for MeMesh to execute with smart routing'),
});
function extractTaskMetadata(task) {
    const goalMatch = task.match(/^([^.!?]+)[.!?]/) || task.match(/to ([^,]+)/);
    const reasonMatch = task.match(/because ([^,\.]+)/) || task.match(/so that ([^,\.]+)/);
    const expectedMatch = task.match(/should ([^,\.]+)/) || task.match(/will ([^,\.]+)/);
    return {
        goal: goalMatch?.[1]?.trim() || task.substring(0, 100),
        reason: reasonMatch?.[1]?.trim(),
        expectedOutcome: expectedMatch?.[1]?.trim(),
    };
}
export async function executeBuddyDo(input, router, formatter, autoTracker) {
    const startTime = Date.now();
    const taskId = `buddy-do-${startTime}`;
    try {
        if (autoTracker) {
            const taskMeta = extractTaskMetadata(input.task);
            await autoTracker.recordTaskStart({
                task_description: input.task,
                goal: taskMeta.goal,
                reason: taskMeta.reason,
                expected_outcome: taskMeta.expectedOutcome,
                priority: 'normal',
            });
            logger.debug('Task start recorded', {
                goal: taskMeta.goal,
                hasReason: !!taskMeta.reason,
                hasExpectedOutcome: !!taskMeta.expectedOutcome,
            });
        }
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
        const memeshReminder = [
            '',
            '🧠 MeMesh Auto-Memory Reminder:',
            'After completing this task, save key implementation details:',
            '  create-entities with observations like:',
            '  - What was implemented (specific configs, values, patterns)',
            '  - Key decisions made and why',
            '  - Any gotchas or important notes for future reference',
        ].join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: formattedResponse + memeshReminder,
                },
            ],
        };
    }
    catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
//# sourceMappingURL=buddy-do.js.map