import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export declare const CloudSyncInputSchema: z.ZodObject<{
    action: z.ZodEnum<{
        push: "push";
        status: "status";
        pull: "pull";
    }>;
    query: z.ZodOptional<z.ZodString>;
    space: z.ZodDefault<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CloudSyncInput = z.infer<typeof CloudSyncInputSchema>;
interface KGLike {
    searchEntities(query: {
        namePattern?: string;
        limit?: number;
    }): Array<{
        name: string;
        entityType: string;
        observations: string[];
        tags?: string[];
        metadata?: Record<string, unknown>;
        contentHash?: string;
    }>;
}
export declare function handleCloudSync(input: CloudSyncInput, knowledgeGraph?: KGLike): Promise<CallToolResult>;
export {};
//# sourceMappingURL=memesh-cloud-sync.d.ts.map