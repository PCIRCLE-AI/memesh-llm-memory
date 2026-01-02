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
});

/**
 * Record token usage input schema for record-token-usage
 */
export const RecordTokenUsageInputSchema = z.object({
  inputTokens: z.number().int().nonnegative('Input tokens must be non-negative'),
  outputTokens: z.number().int().nonnegative('Output tokens must be non-negative'),
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
 * Git save work input schema for git-save-work
 */
export const GitSaveWorkInputSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty'),
  autoBackup: z.boolean().optional().default(true),
});

/**
 * Git list versions input schema for git-list-versions
 */
export const GitListVersionsInputSchema = z.object({
  limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
});

/**
 * Git show changes input schema for git-show-changes
 */
export const GitShowChangesInputSchema = z.object({
  compareWith: z.string().optional(),
});

/**
 * Git go back input schema for git-go-back
 */
export const GitGoBackInputSchema = z.object({
  identifier: z.string().min(1, 'Identifier cannot be empty'),
});

/**
 * Git setup input schema for git-setup
 */
export const GitSetupInputSchema = z.object({
  existingGit: z.boolean().optional(),
});

/**
 * Recall memory input schema for recall-memory
 */
export const RecallMemoryInputSchema = z.object({
  limit: z.number().int().positive('Limit must be positive').max(100, 'Limit too large (max 100)').optional().default(10),
  query: z.string().max(1000, 'Query too long (max 1000 characters)').optional(),
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
export type ValidatedGenerateSmartPlanInput = z.infer<typeof GenerateSmartPlanInputSchema>;
export type ValidatedGitSaveWorkInput = z.infer<typeof GitSaveWorkInputSchema>;
export type ValidatedGitListVersionsInput = z.infer<typeof GitListVersionsInputSchema>;
export type ValidatedGitShowChangesInput = z.infer<typeof GitShowChangesInputSchema>;
export type ValidatedGitGoBackInput = z.infer<typeof GitGoBackInputSchema>;
export type ValidatedGitSetupInput = z.infer<typeof GitSetupInputSchema>;
export type ValidatedRecallMemoryInput = z.infer<typeof RecallMemoryInputSchema>;

/**
 * Validation error formatter
 *
 * Converts Zod validation errors to user-friendly messages
 */
export function formatValidationError(error: z.ZodError): string {
  const messages = error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return `Input validation failed:\n${messages.join('\n')}`;
}
