import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
export declare const BuddyDoInputSchema: z.ZodObject<{
    task: z.ZodString;
}, "strip", z.ZodTypeAny, {
    task: string;
}, {
    task: string;
}>;
export type ValidatedBuddyDoInput = z.infer<typeof BuddyDoInputSchema>;
export declare function executeBuddyDo(input: ValidatedBuddyDoInput, router: Router, formatter: ResponseFormatter): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=buddy-do.d.ts.map