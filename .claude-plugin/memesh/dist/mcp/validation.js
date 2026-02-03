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
    filesChanged: z.array(z.string().min(1)).optional(),
    testsPassing: z.boolean().optional(),
});
export const RecordTokenUsageInputSchema = z.object({
    inputTokens: z.number().int().nonnegative('Input tokens must be non-negative'),
    outputTokens: z.number().int().nonnegative('Output tokens must be non-negative'),
});
export const HookToolUseInputSchema = z.object({
    toolName: z.string().min(1, 'Tool name cannot be empty'),
    arguments: z.unknown().optional(),
    success: z.boolean(),
    duration: z.number().int().nonnegative('Duration must be non-negative').optional(),
    tokensUsed: z.number().int().nonnegative('Tokens used must be non-negative').optional(),
    output: z.string().optional(),
});
export const GenerateSmartPlanInputSchema = z.object({
    featureDescription: z
        .string()
        .min(1, 'Feature description cannot be empty')
        .max(MAX_TASK_DESCRIPTION_LENGTH, `Feature description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`),
    requirements: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
});
export const RecallMemoryInputSchema = z.object({
    limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
    query: z.string().max(1000, 'Query too long (max 1000 characters)').optional(),
});
export const CreateEntitiesInputSchema = z.object({
    entities: z.array(z.object({
        name: z.string().min(1, 'Entity name cannot be empty'),
        entityType: z.string().min(1, 'Entity type cannot be empty'),
        observations: z.array(z.string().min(1, 'Observation cannot be empty')),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })).min(1, 'At least one entity is required'),
});
export const AddObservationsInputSchema = z.object({
    observations: z.array(z.object({
        entityName: z.string().min(1, 'Entity name cannot be empty'),
        contents: z.array(z.string().min(1, 'Observation cannot be empty')).min(1, 'At least one observation is required'),
    })).min(1, 'At least one observation entry is required'),
});
export const CreateRelationsInputSchema = z.object({
    relations: z.array(z.object({
        from: z.string().min(1, 'Relation "from" cannot be empty'),
        to: z.string().min(1, 'Relation "to" cannot be empty'),
        relationType: z.string().min(1, 'Relation type cannot be empty'),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })).min(1, 'At least one relation is required'),
});
export const A2ASendTaskInputSchema = z.object({
    targetAgentId: z.string().min(1, 'Target agent ID cannot be empty'),
    taskDescription: z
        .string()
        .min(1, 'Task description cannot be empty')
        .max(MAX_TASK_DESCRIPTION_LENGTH, `Task description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    sessionId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const A2AGetTaskInputSchema = z.object({
    targetAgentId: z.string().min(1, 'Target agent ID cannot be empty'),
    taskId: z.string().min(1, 'Task ID cannot be empty'),
});
export const A2AListTasksInputSchema = z.object({
    state: z.enum([
        'SUBMITTED',
        'WORKING',
        'INPUT_REQUIRED',
        'COMPLETED',
        'FAILED',
        'CANCELED',
        'REJECTED',
    ]).optional(),
    limit: z.number().int().min(1).max(100, 'Limit too large (max 100)').optional(),
    offset: z.number().int().min(0).optional(),
});
export const A2AListAgentsInputSchema = z.object({
    status: z.enum(['active', 'inactive', 'all']).optional(),
});
export const GenerateTestsInputSchema = z.object({
    specification: z.string().max(10000, 'Specification too long (max 10,000 characters)').optional(),
    code: z.string().max(50000, 'Code too long (max 50,000 characters)').optional(),
}).refine((data) => data.specification !== undefined || data.code !== undefined, { message: 'Either specification or code must be provided' });
export function formatValidationError(error) {
    const messages = error.issues.map((err) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
    });
    return `Input validation failed:\n${messages.join('\n')}`;
}
//# sourceMappingURL=validation.js.map