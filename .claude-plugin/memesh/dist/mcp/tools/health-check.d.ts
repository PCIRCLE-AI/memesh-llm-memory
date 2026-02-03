import { z } from 'zod';
export declare const HealthCheckInputSchema: z.ZodObject<{}, z.core.$strip>;
export type ValidatedHealthCheckInput = z.infer<typeof HealthCheckInputSchema>;
export declare function executeHealthCheck(_input: ValidatedHealthCheckInput): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=health-check.d.ts.map