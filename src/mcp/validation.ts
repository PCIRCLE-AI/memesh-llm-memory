/**
 * MCP Request Validation Schemas
 *
 * Provides Zod schemas for validating MCP tool call inputs
 * to prevent injection attacks, DoS via oversized inputs, and malformed data.
 *
 * Security features:
 * - Input length limits (prevent DoS)
 * - Type validation (prevent type confusion)
 * - Range validation (prevent invalid values)
 * - Enum validation (prevent arbitrary values)
 */

import { z } from 'zod';

/**
 * Maximum allowed length for task descriptions
 * Prevents DoS attacks via extremely long inputs
 */
const MAX_TASK_DESCRIPTION_LENGTH = 10000; // 10KB

/**
 * Maximum allowed length for format strings
 */
const MAX_FORMAT_STRING_LENGTH = 20;

/**
 * Maximum allowed length for filter strings
 */
const MAX_FILTER_STRING_LENGTH = 50;

/**
 * Task input schema for buddy_do and individual agents
 *
 * Used by:
 * - buddy_do tool
 * - Individual agent tools
 */
export const TaskInputSchema = z.object({
  // taskDescription for buddy_do
  taskDescription: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(
      MAX_TASK_DESCRIPTION_LENGTH,
      `Task description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`
    )
    .optional(),

  // task_description for individual agents (legacy style)
  task_description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(
      MAX_TASK_DESCRIPTION_LENGTH,
      `Task description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`
    )
    .optional(),

  // Priority (optional)
  priority: z
    .number()
    .int('Priority must be an integer')
    .min(1, 'Priority must be at least 1')
    .max(10, 'Priority must be at most 10')
    .optional(),
}).refine(
  (data) => data.taskDescription !== undefined || data.task_description !== undefined,
  {
    message: 'Either taskDescription or task_description must be provided',
  }
);

/**
 * Dashboard input schema for buddy_dashboard
 *
 * Used by:
 * - buddy_dashboard tool
 */
export const DashboardInputSchema = z.object({
  format: z
    .string()
    .max(MAX_FORMAT_STRING_LENGTH, 'Format string too long')
    .refine(
      (val) => val === 'summary' || val === 'detailed',
      'Format must be "summary" or "detailed"'
    )
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

/**
 * List agents input schema for buddy_agents
 */
export const ListAgentsInputSchema = z.object({
  // Currently no parameters, but defined for future extensibility
});

/**
 * List skills input schema for buddy_skills
 */
export const ListSkillsInputSchema = z.object({
  filter: z
    .string()
    .max(MAX_FILTER_STRING_LENGTH, 'Filter string too long')
    .refine(
      (val) => val === 'all' || val === 'claude-code-buddy' || val === 'user',
      'Filter must be "all", "claude-code-buddy", or "user"'
    )
    .optional()
    .default('all'),
});

/**
 * Uninstall input schema for buddy_uninstall
 */
export const UninstallInputSchema = z.object({
  keepData: z.boolean().optional().default(false),
  keepConfig: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

/**
 * Workflow guidance input schema for get-workflow-guidance
 */
export const WorkflowGuidanceInputSchema = z.object({
  phase: z.string().min(1, 'Phase cannot be empty'),
  filesChanged: z.array(z.string().min(1)).optional(),
  testsPassing: z.boolean().optional(),
});

/**
 * Record token usage input schema for record-token-usage
 */
export const RecordTokenUsageInputSchema = z.object({
  inputTokens: z.number().int().nonnegative('Input tokens must be non-negative'),
  outputTokens: z.number().int().nonnegative('Output tokens must be non-negative'),
});

/**
 * Hook tool use input schema for hook-tool-use
 */
export const HookToolUseInputSchema = z.object({
  toolName: z.string().min(1, 'Tool name cannot be empty'),
  arguments: z.unknown().optional(),
  success: z.boolean(),
  duration: z.number().int().nonnegative('Duration must be non-negative').optional(),
  tokensUsed: z.number().int().nonnegative('Tokens used must be non-negative').optional(),
  output: z.string().optional(),
});

/**
 * Generate smart plan input schema for generate-smart-plan
 */
export const GenerateSmartPlanInputSchema = z.object({
  featureDescription: z
    .string()
    .min(1, 'Feature description cannot be empty')
    .max(MAX_TASK_DESCRIPTION_LENGTH, `Feature description too long (max ${MAX_TASK_DESCRIPTION_LENGTH} characters)`),
  requirements: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
});

/**
 * Recall memory input schema for recall-memory
 */
export const RecallMemoryInputSchema = z.object({
  limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
  query: z.string().max(1000, 'Query too long (max 1000 characters)').optional(),
});

/**
 * Create entities input schema for knowledge graph
 */
export const CreateEntitiesInputSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().min(1, 'Entity name cannot be empty'),
      entityType: z.string().min(1, 'Entity type cannot be empty'),
      observations: z.array(z.string().min(1, 'Observation cannot be empty')),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1, 'At least one entity is required'),
});

/**
 * Add observations input schema for knowledge graph
 */
export const AddObservationsInputSchema = z.object({
  observations: z.array(
    z.object({
      entityName: z.string().min(1, 'Entity name cannot be empty'),
      contents: z.array(z.string().min(1, 'Observation cannot be empty')).min(1, 'At least one observation is required'),
    })
  ).min(1, 'At least one observation entry is required'),
});

/**
 * Create relations input schema for knowledge graph
 */
export const CreateRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().min(1, 'Relation "from" cannot be empty'),
      to: z.string().min(1, 'Relation "to" cannot be empty'),
      relationType: z.string().min(1, 'Relation type cannot be empty'),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1, 'At least one relation is required'),
});

/**
 * Type exports for validated inputs
 */
export type ValidatedTaskInput = z.infer<typeof TaskInputSchema>;
export type ValidatedDashboardInput = z.infer<typeof DashboardInputSchema>;
export type ValidatedListAgentsInput = z.infer<typeof ListAgentsInputSchema>;
export type ValidatedListSkillsInput = z.infer<typeof ListSkillsInputSchema>;
export type ValidatedUninstallInput = z.infer<typeof UninstallInputSchema>;
export type ValidatedWorkflowGuidanceInput = z.infer<typeof WorkflowGuidanceInputSchema>;
export type ValidatedRecordTokenUsageInput = z.infer<typeof RecordTokenUsageInputSchema>;
export type ValidatedHookToolUseInput = z.infer<typeof HookToolUseInputSchema>;
export type ValidatedGenerateSmartPlanInput = z.infer<typeof GenerateSmartPlanInputSchema>;
export type ValidatedRecallMemoryInput = z.infer<typeof RecallMemoryInputSchema>;
export type ValidatedCreateEntitiesInput = z.infer<typeof CreateEntitiesInputSchema>;
export type ValidatedAddObservationsInput = z.infer<typeof AddObservationsInputSchema>;
export type ValidatedCreateRelationsInput = z.infer<typeof CreateRelationsInputSchema>;

/**
 * A2A send task input schema
 */
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

/**
 * A2A get task input schema
 */
export const A2AGetTaskInputSchema = z.object({
  targetAgentId: z.string().min(1, 'Target agent ID cannot be empty'),
  taskId: z.string().min(1, 'Task ID cannot be empty'),
});

/**
 * A2A list tasks input schema
 */
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

/**
 * A2A list agents input schema
 */
export const A2AListAgentsInputSchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional(),
});

/**
 * Type exports for A2A validated inputs
 */
export type ValidatedA2ASendTaskInput = z.infer<typeof A2ASendTaskInputSchema>;
export type ValidatedA2AGetTaskInput = z.infer<typeof A2AGetTaskInputSchema>;
export type ValidatedA2AListTasksInput = z.infer<typeof A2AListTasksInputSchema>;
export type ValidatedA2AListAgentsInput = z.infer<typeof A2AListAgentsInputSchema>;

/**
 * Validation error formatter
 *
 * Converts Zod validation errors to user-friendly messages
 */
export function formatValidationError(error: z.ZodError): string {
  const messages = error.issues.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return `Input validation failed:\n${messages.join('\n')}`;
}
