import { z } from 'zod';
const AGENT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_AGENT_ID_LENGTH = 100;
export const A2AListTasksInputSchema = z.object({
    agentId: z
        .string()
        .min(1, 'Agent ID cannot be empty')
        .max(MAX_AGENT_ID_LENGTH, `Agent ID too long (max ${MAX_AGENT_ID_LENGTH} characters)`)
        .regex(AGENT_ID_PATTERN, 'Agent ID must contain only alphanumeric characters, hyphens, and underscores')
        .describe('Agent ID to list pending tasks for'),
});
export async function a2aListTasks(input, delegator) {
    const { agentId } = input;
    const tasks = await delegator.getPendingTasks(agentId);
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(tasks, null, 2),
            },
        ],
    };
}
//# sourceMappingURL=a2a-list-tasks.js.map