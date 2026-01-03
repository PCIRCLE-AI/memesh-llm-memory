import { z } from 'zod';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
export declare const BuddyRememberInputSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
}, {
    query: string;
    limit?: number | undefined;
}>;
export type ValidatedBuddyRememberInput = z.infer<typeof BuddyRememberInputSchema>;
export declare function executeBuddyRemember(input: ValidatedBuddyRememberInput, projectMemory: ProjectMemoryManager, formatter: ResponseFormatter): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=buddy-remember.d.ts.map