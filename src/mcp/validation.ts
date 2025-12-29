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
 * Task input schema for sa_task and individual agents
 *
 * Used by:
 * - sa_task tool
 * - smart_route_task tool (legacy)
 * - Individual agent tools
 */
export const TaskInputSchema = z.object({
  // taskDescription for sa_task (new style)
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
 * Dashboard input schema for sa_dashboard
 *
 * Used by:
 * - sa_dashboard tool
 * - evolution_dashboard tool (legacy)
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
});

/**
 * List agents input schema for sa_agents
 */
export const ListAgentsInputSchema = z.object({
  // Currently no parameters, but defined for future extensibility
});

/**
 * List skills input schema for sa_skills
 */
export const ListSkillsInputSchema = z.object({
  filter: z
    .string()
    .max(MAX_FILTER_STRING_LENGTH, 'Filter string too long')
    .refine(
      (val) => val === 'all' || val === 'smart-agents' || val === 'user',
      'Filter must be "all", "smart-agents", or "user"'
    )
    .optional()
    .default('all'),
});

/**
 * Uninstall input schema for sa_uninstall
 */
export const UninstallInputSchema = z.object({
  keepData: z.boolean().optional().default(false),
  keepConfig: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

/**
 * Type exports for validated inputs
 */
export type ValidatedTaskInput = z.infer<typeof TaskInputSchema>;
export type ValidatedDashboardInput = z.infer<typeof DashboardInputSchema>;
export type ValidatedListAgentsInput = z.infer<typeof ListAgentsInputSchema>;
export type ValidatedListSkillsInput = z.infer<typeof ListSkillsInputSchema>;
export type ValidatedUninstallInput = z.infer<typeof UninstallInputSchema>;

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
