/**
 * Tool Routing Logic
 *
 * Responsible for:
 * - Mapping tool names to handler methods
 * - Validating input schemas
 * - Handling rate limiting
 * - Delegating to appropriate handlers
 * - Returning formatted responses
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError, NotFoundError, OperationError } from '../errors/index.js';
import { Task, AgentType } from '../orchestrator/types.js';
import { ResponseFormatter, AgentResponse } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { Router } from '../orchestrator/router.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { GitHandlers, ToolHandlers, BuddyHandlers } from './handlers/index.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
import { z } from 'zod';
import { TaskInputSchema, formatValidationError, type ValidatedTaskInput } from './validation.js';
import {
  CreateBackupInputSchema,
  ListBackupsInputSchema,
  RestoreBackupInputSchema,
  CleanBackupsInputSchema,
  BackupStatsInputSchema,
  executeCreateBackup,
  executeListBackups,
  executeRestoreBackup,
  executeCleanBackups,
  executeBackupStats,
} from './tools/database-backup.js';

/**
 * Tool Router Configuration
 */
export interface ToolRouterConfig {
  router: Router;
  formatter: ResponseFormatter;
  agentRegistry: AgentRegistry;
  rateLimiter: RateLimiter;
  gitHandlers: GitHandlers;
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
}

/**
 * Tool Router
 *
 * Central routing hub for all MCP tool calls. Validates requests, applies rate limiting,
 * and dispatches to appropriate handler modules based on tool name.
 *
 * The router supports three main categories of tools:
 * - **Buddy Tools**: buddy_do, buddy_agents, buddy_skills, buddy_uninstall, buddy_stats, buddy_remember, buddy_help, buddy_dashboard
 * - **Buddy Commands** (Legacy naming, same as Buddy Tools)
 * - **Git Tools**: git-save-work, git-list-versions, git-status, etc.
 * - **Workflow Tools**: get-workflow-guidance, reload-context, etc.
 * - **Database Backup Tools**: create_database_backup, list_database_backups, etc.
 *
 * Architecture:
 * - Rate limiting prevents DoS attacks (30 requests/minute default)
 * - Input validation using Zod schemas
 * - Structured error handling with custom error types
 * - Automatic agent fallback for direct agent invocation
 *
 * @example
 * ```typescript
 * const router = new ToolRouter({
 *   router: mainRouter,
 *   formatter: responseFormatter,
 *   agentRegistry,
 *   rateLimiter,
 *   gitHandlers,
 *   toolHandlers,
 *   buddyHandlers
 * });
 *
 * // Route a tool call
 * const result = await router.routeToolCall({
 *   name: 'buddy_do',
 *   arguments: { taskDescription: 'Build a React component' }
 * });
 * ```
 */
export class ToolRouter {
  private router: Router;
  private formatter: ResponseFormatter;
  private agentRegistry: AgentRegistry;
  private rateLimiter: RateLimiter;
  private gitHandlers: GitHandlers;
  private toolHandlers: ToolHandlers;
  private buddyHandlers: BuddyHandlers;

  /**
   * Create a new ToolRouter instance
   *
   * @param config - Router configuration with all required dependencies
   */
  constructor(config: ToolRouterConfig) {
    this.router = config.router;
    this.formatter = config.formatter;
    this.agentRegistry = config.agentRegistry;
    this.rateLimiter = config.rateLimiter;
    this.gitHandlers = config.gitHandlers;
    this.toolHandlers = config.toolHandlers;
    this.buddyHandlers = config.buddyHandlers;
  }

  /**
   * Route tool call to appropriate handler
   *
   * @param params - MCP tool call parameters
   * @returns Tool execution result
   */
  async routeToolCall(params: unknown): Promise<CallToolResult> {
    // Type guard: validate params structure
    if (
      !params ||
      typeof params !== 'object' ||
      !('name' in params) ||
      typeof params.name !== 'string' ||
      params.name.trim() === '' || // Check for empty tool name
      !('arguments' in params) ||
      !params.arguments ||
      typeof params.arguments !== 'object'
    ) {
      throw new ValidationError(
        'Invalid request parameters',
        {
          component: 'ToolRouter',
          method: 'routeToolCall',
          providedParams: params,
          requiredFields: ['name (string, non-empty)', 'arguments (object)'],
        }
      );
    }

    // Rate limiting check
    if (!this.rateLimiter.consume(1)) {
      const status = this.rateLimiter.getStatus();
      throw new OperationError(
        'Rate limit exceeded. Please try again in a moment.',
        {
          component: 'ToolRouter',
          method: 'routeToolCall',
          rateLimitStatus: status,
          hint: 'Too many requests. The server allows up to 30 requests per minute.',
        }
      );
    }

    const toolName = params.name;
    const args = params.arguments;

    // Route to appropriate handler based on tool name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await this.dispatch(toolName, args as any);
  }

  /**
   * Dispatch tool call to appropriate handler
   *
   * Internal routing logic that maps tool names to handler methods. Supports:
   * - Buddy tools (buddy_*)
   * - Git tools (git-*)
   * - Workflow tools (get-workflow-guidance, etc.)
   * - Database backup tools (create_database_backup, etc.)
   * - Legacy tool names for backward compatibility
   * - Direct agent invocation (fallback)
   *
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments (validated by individual handlers)
   * @returns Promise resolving to MCP CallToolResult
   *
   * @throws ValidationError if input validation fails
   * @throws NotFoundError if tool/agent not found
   * @throws OperationError for execution failures
   *
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async dispatch(toolName: string, args: any): Promise<CallToolResult> {
    // Buddy tools
    if (toolName === 'buddy_agents') {
      return await this.toolHandlers.handleListAgents();
    }

    if (toolName === 'buddy_skills') {
      return await this.toolHandlers.handleListSkills(args);
    }

    if (toolName === 'buddy_uninstall') {
      return await this.toolHandlers.handleUninstall(args);
    }

    // Buddy Commands
    if (toolName === 'buddy_do') {
      return await this.buddyHandlers.handleBuddyDo(args);
    }

    if (toolName === 'buddy_stats') {
      return await this.buddyHandlers.handleBuddyStats(args);
    }

    if (toolName === 'buddy_remember') {
      return await this.buddyHandlers.handleBuddyRemember(args);
    }

    if (toolName === 'buddy_help') {
      return await this.buddyHandlers.handleBuddyHelp(args);
    }

    // Workflow Guidance tools
    if (toolName === 'get-workflow-guidance') {
      return await this.toolHandlers.handleGetWorkflowGuidance(args);
    }

    if (toolName === 'get-session-health') {
      return await this.toolHandlers.handleGetSessionHealth();
    }

    if (toolName === 'reload-context') {
      return await this.toolHandlers.handleReloadContext(args);
    }

    if (toolName === 'record-token-usage') {
      return await this.toolHandlers.handleRecordTokenUsage(args);
    }

    // Planning tools
    if (toolName === 'generate-smart-plan') {
      return await this.toolHandlers.handleGenerateSmartPlan(args);
    }

    // Git Assistant tools
    if (toolName === 'git-save-work') {
      return await this.gitHandlers.handleGitSaveWork(args);
    }

    if (toolName === 'git-list-versions') {
      return await this.gitHandlers.handleGitListVersions(args);
    }

    if (toolName === 'git-status') {
      return await this.gitHandlers.handleGitStatus(args);
    }

    if (toolName === 'git-show-changes') {
      return await this.gitHandlers.handleGitShowChanges(args);
    }

    if (toolName === 'git-go-back') {
      return await this.gitHandlers.handleGitGoBack(args);
    }

    if (toolName === 'git-create-backup') {
      return await this.gitHandlers.handleGitCreateBackup(args);
    }

    if (toolName === 'git-setup') {
      return await this.gitHandlers.handleGitSetup(args);
    }

    if (toolName === 'git-help') {
      return await this.gitHandlers.handleGitHelp(args);
    }

    // Memory tools
    if (toolName === 'recall-memory') {
      return await this.toolHandlers.handleRecallMemory(args);
    }

    if (toolName === 'create-entities') {
      return await this.toolHandlers.handleCreateEntities(args);
    }

    if (toolName === 'add-observations') {
      return await this.toolHandlers.handleAddObservations(args);
    }

    if (toolName === 'create-relations') {
      return await this.toolHandlers.handleCreateRelations(args);
    }

    // DevOps tools
    if (toolName === 'devops-generate-ci-config') {
      return await this.toolHandlers.handleGenerateCIConfig(args);
    }

    if (toolName === 'devops-analyze-deployment') {
      return await this.toolHandlers.handleAnalyzeDeployment(args);
    }

    if (toolName === 'devops-setup-ci') {
      return await this.toolHandlers.handleSetupCI(args);
    }

    // Workflow Automation tools
    if (toolName === 'workflow-create') {
      return await this.toolHandlers.handleCreateWorkflow(args);
    }

    if (toolName === 'workflow-list') {
      return await this.toolHandlers.handleListWorkflows(args);
    }

    // Database Backup tools
    if (toolName === 'create_database_backup') {
      try {
        const validatedInput = CreateBackupInputSchema.parse(args);
        return await executeCreateBackup(validatedInput, this.formatter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(formatValidationError(error), {
            component: 'ToolRouter',
            method: 'dispatch',
            schema: 'CreateBackupInputSchema',
            providedArgs: args,
          });
        }
        throw error;
      }
    }

    if (toolName === 'list_database_backups') {
      try {
        const validatedInput = ListBackupsInputSchema.parse(args);
        return await executeListBackups(validatedInput, this.formatter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(formatValidationError(error), {
            component: 'ToolRouter',
            method: 'dispatch',
            schema: 'ListBackupsInputSchema',
            providedArgs: args,
          });
        }
        throw error;
      }
    }

    if (toolName === 'restore_database_backup') {
      try {
        const validatedInput = RestoreBackupInputSchema.parse(args);
        return await executeRestoreBackup(validatedInput, this.formatter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(formatValidationError(error), {
            component: 'ToolRouter',
            method: 'dispatch',
            schema: 'RestoreBackupInputSchema',
            providedArgs: args,
          });
        }
        throw error;
      }
    }

    if (toolName === 'clean_database_backups') {
      try {
        const validatedInput = CleanBackupsInputSchema.parse(args);
        return await executeCleanBackups(validatedInput, this.formatter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(formatValidationError(error), {
            component: 'ToolRouter',
            method: 'dispatch',
            schema: 'CleanBackupsInputSchema',
            providedArgs: args,
          });
        }
        throw error;
      }
    }

    if (toolName === 'get_backup_stats') {
      try {
        const validatedInput = BackupStatsInputSchema.parse(args);
        return await executeBackupStats(validatedInput, this.formatter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(formatValidationError(error), {
            component: 'ToolRouter',
            method: 'dispatch',
            schema: 'BackupStatsInputSchema',
            providedArgs: args,
          });
        }
        throw error;
      }
    }

    // Individual agent invocation (advanced mode)
    return await this.handleAgentInvocation(toolName, args);
  }

  /**
   * Handle individual agent invocation
   *
   * Fallback handler for direct agent invocation (e.g., "frontend-developer" tool).
   * Validates agent exists, creates a task, routes it through the main pipeline,
   * and formats the response.
   *
   * **Workflow**:
   * 1. Validate input schema (task_description/taskDescription + priority)
   * 2. Verify agent exists in registry
   * 3. Create Task object with unique ID
   * 4. Route through main Router (TaskAnalyzer → AgentRouter → PromptEnhancer)
   * 5. Format response using ResponseFormatter
   * 6. Return enhanced prompt to Claude
   *
   * @param agentName - Agent to invoke (must be registered)
   * @param args - Task arguments (validated by Zod TaskInputSchema)
   * @returns Promise resolving to MCP CallToolResult with formatted response
   *
   * @throws ValidationError if input validation fails
   * @throws NotFoundError if agent doesn't exist
   * @throws OperationError if routing fails
   *
   * @example
   * ```typescript
   * // Direct agent invocation
   * await handleAgentInvocation('frontend-developer', {
   *   taskDescription: 'Create a login form',
   *   priority: 1
   * });
   * ```
   *
   * @private
   */
  private async handleAgentInvocation(
    agentName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any
  ): Promise<CallToolResult> {
    // Validate input using Zod schema
    let validatedInput: ValidatedTaskInput;
    try {
      validatedInput = TaskInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Log validation error with context
        logError(error, {
          component: 'ToolRouter',
          method: 'handleAgentInvocation',
          operation: 'validating task input schema',
          data: { agentName, schema: 'TaskInputSchema' },
        });
        console.error('ToolRouter validation error:', error.message);

        const validationError = new ValidationError(
          formatValidationError(error),
          {
            component: 'ToolRouter',
            method: 'handleAgentInvocation',
            schema: 'TaskInputSchema',
            providedArgs: args,
          }
        );

        // Return formatted validation error instead of throwing
        const errorResponse: AgentResponse = {
          agentType: agentName as AgentType,
          taskDescription: 'Invalid input',
          status: 'error',
          error: validationError,
        };

        const formattedError = this.formatter.format(errorResponse);

        return {
          content: [
            {
              type: 'text' as const,
              text: formattedError,
            },
          ],
          isError: true,
        };
      }
      // Log unexpected error
      logError(error, {
        component: 'ToolRouter',
        method: 'handleAgentInvocation',
        operation: 'parsing task input',
        data: { agentName },
      });
      console.error('ToolRouter unexpected error:', error);
      throw error;
    }

    // Extract validated task description and priority
    const taskDescription = validatedInput.taskDescription || validatedInput.task_description!;
    const priority = validatedInput.priority;

    try {
      // Validate agent name
      if (!this.isValidAgent(agentName)) {
        throw new NotFoundError(
          `Unknown agent: ${agentName}`,
          'agent',
          agentName,
          { availableAgents: this.agentRegistry.getAllAgents().map(a => a.name) }
        );
      }

      // Create task
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: taskDescription,
        priority,
      };

      // Route task through the pipeline
      const startTime = Date.now();
      const result = await this.router.routeTask(task);
      const duration = Date.now() - startTime;

      // Build agent response
      const agentResponse: AgentResponse = {
        agentType: result.routing.selectedAgent,
        taskDescription: task.description,
        status: result.approved ? 'success' : 'error',
        enhancedPrompt: result.routing.enhancedPrompt,
        metadata: {
          duration,
          tokensUsed: result.analysis.estimatedTokens,
          model: result.routing.enhancedPrompt.suggestedModel,
        },
      };

      // If not approved (budget exceeded), add error
      if (!result.approved) {
        agentResponse.status = 'error';
        agentResponse.error = new Error(result.message);
      }

      // Format response using ResponseFormatter
      const formattedOutput = this.formatter.format(agentResponse);

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedOutput,
          },
        ],
      };
    } catch (error) {
      // Log error with full context and stack trace
      logError(error, {
        component: 'ToolRouter',
        method: 'handleAgentInvocation',
        operation: `routing task to agent: ${agentName}`,
        data: { agentName, taskDescription: taskDescription.substring(0, 100) },
      });
      console.error('ToolRouter routing error:', error);

      // Error handling - format error response
      // Safe cast: agentName has been validated by isValidAgent
      const errorResponse: AgentResponse = {
        agentType: agentName as AgentType,
        taskDescription: taskDescription,
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };

      const formattedError = this.formatter.format(errorResponse);

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedError,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Validate if agent name is valid
   *
   * Type guard function that checks if the provided agent name exists in the
   * agent registry. Narrows the string type to AgentType for type safety.
   *
   * @param name - Agent name to validate
   * @returns true if agent exists, false otherwise
   *
   * @private
   */
  private isValidAgent(name: string): name is AgentType {
    return this.agentRegistry.hasAgent(name as AgentType);
  }
}
