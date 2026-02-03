import { z } from 'zod';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectAutoTracker } from '../../memory/ProjectAutoTracker.js';
export declare const BuddyDoInputSchema: z.ZodObject<{
    task: z.ZodString;
}, z.core.$strip>;
export type ValidatedBuddyDoInput = z.infer<typeof BuddyDoInputSchema>;
export declare function executeBuddyDo(input: ValidatedBuddyDoInput, router: Router, formatter: ResponseFormatter, autoTracker?: ProjectAutoTracker): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=buddy-do.d.ts.map