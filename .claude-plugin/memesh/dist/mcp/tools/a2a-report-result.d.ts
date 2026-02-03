import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { TaskQueue } from '../../a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';
export declare const A2AReportResultInputSchema: z.ZodObject<{
    taskId: z.ZodString;
    result: z.ZodString;
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ValidatedA2AReportResultInput = z.infer<typeof A2AReportResultInputSchema>;
export declare const a2aReportResultSchema: {
    readonly type: "object";
    readonly properties: {
        readonly taskId: {
            readonly type: "string";
            readonly description: "Task ID to report result for";
        };
        readonly result: {
            readonly type: "string";
            readonly description: "Execution output or result";
        };
        readonly success: {
            readonly type: "boolean";
            readonly description: "Whether execution succeeded (true) or failed (false)";
        };
        readonly error: {
            readonly type: "string";
            readonly description: "Error message if success=false (optional)";
        };
    };
    readonly required: readonly ["taskId", "result", "success"];
};
export declare function a2aReportResult(input: ValidatedA2AReportResultInput, taskQueue: TaskQueue, delegator: MCPTaskDelegator): Promise<CallToolResult>;
//# sourceMappingURL=a2a-report-result.d.ts.map