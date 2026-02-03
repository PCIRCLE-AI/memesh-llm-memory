import { z } from 'zod';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';
export declare const A2AListTasksInputSchema: z.ZodObject<{
    agentId: z.ZodString;
}, z.core.$strip>;
export type ValidatedA2AListTasksInput = z.infer<typeof A2AListTasksInputSchema>;
export declare function a2aListTasks(input: ValidatedA2AListTasksInput, delegator: MCPTaskDelegator): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=a2a-list-tasks.d.ts.map