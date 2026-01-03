import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
export declare const BuddyHelpInputSchema: z.ZodObject<{
    command: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    command?: string | undefined;
}, {
    command?: string | undefined;
}>;
export type ValidatedBuddyHelpInput = z.infer<typeof BuddyHelpInputSchema>;
export declare function executeBuddyHelp(input: ValidatedBuddyHelpInput, formatter: ResponseFormatter): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=buddy-help.d.ts.map