import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export declare const MemeshMetricsInputSchema: z.ZodObject<{
    section: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        memory: "memory";
        session: "session";
        all: "all";
        routing: "routing";
    }>>>;
}, z.core.$strip>;
export type ValidatedMemeshMetricsInput = z.infer<typeof MemeshMetricsInputSchema>;
export declare function handleMemeshMetrics(input: ValidatedMemeshMetricsInput): Promise<CallToolResult>;
//# sourceMappingURL=memesh-metrics.d.ts.map