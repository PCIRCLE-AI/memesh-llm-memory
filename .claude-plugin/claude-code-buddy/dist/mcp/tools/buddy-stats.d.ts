import { z } from 'zod';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
export declare const BuddyStatsInputSchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<["day", "week", "month", "all"]>>>;
}, "strip", z.ZodTypeAny, {
    period: "all" | "day" | "week" | "month";
}, {
    period?: "all" | "day" | "week" | "month" | undefined;
}>;
export type ValidatedBuddyStatsInput = z.infer<typeof BuddyStatsInputSchema>;
export declare function executeBuddyStats(input: ValidatedBuddyStatsInput, formatter: ResponseFormatter): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=buddy-stats.d.ts.map