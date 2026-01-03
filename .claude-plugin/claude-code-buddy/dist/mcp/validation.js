import { z } from 'zod';
const MAX_TASK_DESCRIPTION_LENGTH = 10000;
const MAX_FORMAT_STRING_LENGTH = 20;
const MAX_FILTER_STRING_LENGTH = 50;
export const TaskInputSchema = z.object({
    taskDescription: z
        .string()
        .min(1, 'Task description cannot be empty')
        .max(MAX_TASK_DESCRIPTION_LENGTH, `Task description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`)
        .optional(),
    task_description: z
        .string()
        .min(1, 'Task description cannot be empty')
        .max(MAX_TASK_DESCRIPTION_LENGTH, `Task description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`)
        .optional(),
    priority: z
        .number()
        .int('Priority must be an integer')
        .min(1, 'Priority must be at least 1')
        .max(10, 'Priority must be at most 10')
        .optional(),
}).refine((data) => data.taskDescription !== undefined || data.task_description !== undefined, {
    message: 'Either taskDescription or task_description must be provided',
});
export const DashboardInputSchema = z.object({
    format: z
        .string()
        .max(MAX_FORMAT_STRING_LENGTH, 'Format string too long')
        .refine((val) => val === 'summary' || val === 'detailed', 'Format must be "summary" or "detailed"')
        .optional()
        .default('summary'),
    exportFormat: z
        .enum(['json', 'csv', 'markdown'])
        .optional(),
    includeCharts: z
        .boolean()
        .optional()
        .default(false),
    chartHeight: z
        .number()
        .int('Chart height must be an integer')
        .min(5, 'Chart height must be at least 5')
        .max(20, 'Chart height must be at most 20')
        .optional()
        .default(8),
});
export const ListAgentsInputSchema = z.object({});
export const ListSkillsInputSchema = z.object({
    filter: z
        .string()
        .max(MAX_FILTER_STRING_LENGTH, 'Filter string too long')
        .refine((val) => val === 'all' || val === 'claude-code-buddy' || val === 'user', 'Filter must be "all", "claude-code-buddy", or "user"')
        .optional()
        .default('all'),
});
export const UninstallInputSchema = z.object({
    keepData: z.boolean().optional().default(false),
    keepConfig: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
});
export const WorkflowGuidanceInputSchema = z.object({
    phase: z.string().min(1, 'Phase cannot be empty'),
});
export const RecordTokenUsageInputSchema = z.object({
    inputTokens: z.number().int().nonnegative('Input tokens must be non-negative'),
    outputTokens: z.number().int().nonnegative('Output tokens must be non-negative'),
});
export const GenerateSmartPlanInputSchema = z.object({
    featureDescription: z
        .string()
        .min(1, 'Feature description cannot be empty')
        .max(MAX_TASK_DESCRIPTION_LENGTH, `Feature description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`),
    requirements: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
});
export const GitSaveWorkInputSchema = z.object({
    description: z.string().min(1, 'Description cannot be empty'),
    autoBackup: z.boolean().optional().default(true),
});
export const GitListVersionsInputSchema = z.object({
    limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
});
export const GitShowChangesInputSchema = z.object({
    compareWith: z.string().optional(),
});
export const GitGoBackInputSchema = z.object({
    identifier: z.string().min(1, 'Identifier cannot be empty'),
});
export const GitSetupInputSchema = z.object({
    existingGit: z.boolean().optional(),
});
export const RecallMemoryInputSchema = z.object({
    limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
    query: z.string().max(1000, 'Query too long (max 1000 characters)').optional(),
});
export function formatValidationError(error) {
    const messages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
    });
    return `Input validation failed:\n${messages.join('\n')}`;
}
//# sourceMappingURL=validation.js.map