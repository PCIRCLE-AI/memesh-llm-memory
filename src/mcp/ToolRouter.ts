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
import { RateLimiter } from '../utils/RateLimiter.js';
import {
  ToolHandlers,
  BuddyHandlers,
  handleBuddySecretStore,
  handleBuddySecretGet,
  handleBuddySecretList,
  handleBuddySecretDelete,
} from './handlers/index.js';
import type { SecretManager } from '../memory/SecretManager.js';
import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import { handleA2ABoard, A2ABoardInputSchema } from './tools/a2a-board.js';
import { handleA2AClaimTask, A2AClaimTaskInputSchema } from './tools/a2a-claim-task.js';
import { handleA2AFindTasks, A2AFindTasksInputSchema } from './tools/a2a-find-tasks.js';
import { handleCloudSync, CloudSyncInputSchema } from './tools/memesh-cloud-sync.js';

/**
 * Tool Router Configuration
 */
export interface ToolRouterConfig {
  rateLimiter: RateLimiter;
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;

  /**
   * Secret Manager for secure secret storage (Phase 0.7.0)
   */
  secretManager?: SecretManager;

  /**
   * Knowledge Graph for cloud sync operations
   */
  knowledgeGraph?: KnowledgeGraph;

  /**
   * CSRF protection for future HTTP transport
   * Allowed request origins (for HTTP mode only, stdio doesn't need this)
   * @default undefined (stdio mode, no origin validation)
   */
  allowedOrigins?: string[];

  /**
   * Transport mode
   * @default 'stdio' (current implementation)
   */
  transportMode?: 'stdio' | 'http';
}

/**
 * ✅ FIX ISSUE-2: Tool name validation regex
 *
 * MCP tool names must follow a strict pattern to prevent injection attacks
 * and ensure protocol compatibility:
 * - Only lowercase alphanumeric characters, hyphens, and underscores
 * - Must start and end with an alphanumeric character
 * - Maximum length of 64 characters
 * - Minimum length of 1 character
 *
 * This aligns with the MCP protocol convention where tool names like
 * 'buddy-do', 'memesh-remember', 'a2a-board' are used.
 */
const TOOL_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const TOOL_NAME_MAX_LENGTH = 64;

/**
 * ✅ FIX MINOR (Round 1): Sanitize tool name for safe embedding in error messages.
 * Truncates to max 64 chars and escapes special characters to prevent log injection.
 *
 * @param toolName - Raw tool name input
 * @returns Sanitized string safe for embedding in error messages
 */
function sanitizeToolNameForError(toolName: unknown): string {
  if (typeof toolName !== 'string') {
    return '[non-string]';
  }
  // Remove control characters, truncate, and escape quotes
  const cleaned = toolName
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // strip control chars
    .replace(/['"\\]/g, (ch) => `\\${ch}`)  // escape quotes and backslashes
    .substring(0, TOOL_NAME_MAX_LENGTH);
  return cleaned.length < toolName.length ? `${cleaned}...` : cleaned;
}

/**
 * Validate a tool name against MCP naming conventions
 *
 * @param toolName - Tool name to validate
 * @throws ValidationError if tool name is invalid
 */
function validateToolName(toolName: string): void {
  if (typeof toolName !== 'string') {
    throw new ValidationError(
      'Tool name must be a string',
      {
        component: 'ToolRouter',
        method: 'validateToolName',
        providedType: typeof toolName,
      }
    );
  }

  if (toolName.length === 0) {
    throw new ValidationError(
      'Tool name cannot be empty',
      {
        component: 'ToolRouter',
        method: 'validateToolName',
      }
    );
  }

  if (toolName.length > TOOL_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Tool name exceeds maximum length of ${TOOL_NAME_MAX_LENGTH} characters`,
      {
        component: 'ToolRouter',
        method: 'validateToolName',
        providedLength: toolName.length,
        maxLength: TOOL_NAME_MAX_LENGTH,
      }
    );
  }

  if (!TOOL_NAME_REGEX.test(toolName)) {
    // ✅ FIX MINOR (Round 1): Sanitize toolName before embedding in error message
    const safeName = sanitizeToolNameForError(toolName);
    throw new ValidationError(
      `Invalid tool name: '${safeName}'. Tool names must contain only lowercase alphanumeric characters, hyphens, and underscores, and must start and end with an alphanumeric character.`,
      {
        component: 'ToolRouter',
        method: 'validateToolName',
        providedName: safeName,
        pattern: TOOL_NAME_REGEX.source,
        hint: 'Example valid names: buddy-do, memesh-remember, a2a-board',
      }
    );
  }
}

/**
 * Tool Router
 *
 * Central routing hub for all MCP tool calls. Validates requests, applies rate limiting,
 * and dispatches to appropriate handler modules based on tool name.
 *
 * The router supports main categories of tools:
 * - **Buddy Tools**: buddy-do, buddy-remember, buddy-help
 * - **MeMesh Tools**: memesh-do, memesh-remember, memesh-help
 * - **A2A Tools**: a2a-board, a2a-claim-task, a2a-find-tasks
 * - **Hook Tools**: hook-tool-use
 *
 * Architecture:
 * - Rate limiting prevents DoS attacks (30 requests/minute default)
 * - Input validation using Zod schemas
 * - Structured error handling with custom error types
 *
 * @example
 * ```typescript
 * const router = new ToolRouter({
 *   rateLimiter,
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
  private rateLimiter: RateLimiter;
  private toolHandlers: ToolHandlers;
  private buddyHandlers: BuddyHandlers;
  private secretManager?: SecretManager;
  private knowledgeGraph?: KnowledgeGraph;

  private readonly allowedOrigins?: string[];
  private readonly transportMode: 'stdio' | 'http';

  /**
   * Create a new ToolRouter instance
   *
   * @param config - Router configuration with all required dependencies
   */
  constructor(config: ToolRouterConfig) {
    this.rateLimiter = config.rateLimiter;
    this.toolHandlers = config.toolHandlers;
    this.buddyHandlers = config.buddyHandlers;
    this.secretManager = config.secretManager;
    this.knowledgeGraph = config.knowledgeGraph;
    this.allowedOrigins = config.allowedOrigins;
    this.transportMode = config.transportMode || 'stdio';
  }

  /**
   * ✅ FIX HIGH-5: Validate request origin for CSRF protection
   *
   * Only applicable for HTTP transport mode. Stdio transport doesn't have origin headers.
   *
   * @param origin - Request origin header (if available)
   * @throws ValidationError if HTTP mode and origin is not allowed
   * @private
   */
  private validateRequestOrigin(origin?: string): void {
    // Skip validation for stdio transport (no CSRF risk)
    if (this.transportMode === 'stdio') {
      return;
    }

    // HTTP mode requires origin validation
    if (this.transportMode === 'http') {
      // If allowedOrigins is not configured, reject all requests (secure default)
      if (!this.allowedOrigins || this.allowedOrigins.length === 0) {
        throw new ValidationError(
          'CSRF protection: No allowed origins configured for HTTP mode',
          {
            component: 'ToolRouter',
            method: 'validateRequestOrigin',
            transportMode: this.transportMode,
            hint: 'Configure allowedOrigins in ToolRouterConfig for HTTP transport',
          }
        );
      }

      // Validate origin is provided
      if (!origin) {
        throw new ValidationError('CSRF protection: Missing origin header', {
          component: 'ToolRouter',
          method: 'validateRequestOrigin',
          transportMode: this.transportMode,
        });
      }

      // Validate origin is in allowed list
      if (!this.allowedOrigins.includes(origin)) {
        throw new ValidationError('CSRF protection: Invalid request origin', {
          component: 'ToolRouter',
          method: 'validateRequestOrigin',
          providedOrigin: origin,
          allowedOrigins: this.allowedOrigins,
        });
      }
    }
  }

  /**
   * Route tool call to appropriate handler
   *
   * @param params - MCP tool call parameters
   * @param requestHeaders - Optional request headers (for HTTP mode CSRF protection)
   * @param requestId - ✅ FIX HIGH-10: Optional request ID for tracing (generated if not provided)
   * @returns Tool execution result
   */
  async routeToolCall(
    params: unknown,
    requestHeaders?: Record<string, string>,
    requestId?: string
  ): Promise<CallToolResult> {
    // ✅ FIX HIGH-5: Validate request origin for CSRF protection (HTTP mode only)
    this.validateRequestOrigin(requestHeaders?.['origin']);

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
          requestId, // ✅ FIX HIGH-10: Include request ID in errors
          providedParams: params,
          requiredFields: ['name (string, non-empty)', 'arguments (object)'],
        }
      );
    }

    // ✅ FIX ISSUE-2: Validate tool name format at registration/call time
    // Rejects malformed or potentially malicious tool names early
    validateToolName(params.name);

    // Rate limiting check
    if (!this.rateLimiter.consume(1)) {
      const status = this.rateLimiter.getStatus();
      throw new OperationError(
        'Rate limit exceeded. Please try again in a moment.',
        {
          component: 'ToolRouter',
          method: 'routeToolCall',
          requestId, // ✅ FIX HIGH-10: Include request ID in errors
          rateLimitStatus: status,
          hint: 'Too many requests. The server allows up to 30 requests per minute.',
        }
      );
    }

    const toolName = params.name;
    const args = params.arguments;

    // Route to appropriate handler based on tool name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handlers validate args via Zod
    return await this.dispatch(toolName, args as any);
  }

  /**
   * Dispatch tool call to appropriate handler
   *
   * Internal routing logic that maps tool names to handler methods. Supports:
   * - Buddy tools (buddy-do, buddy-remember, buddy-help)
   * - Task board tools (a2a-board, a2a-claim-task, a2a-find-tasks)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each handler validates via Zod schemas
  private async dispatch(toolName: string, args: any): Promise<CallToolResult> {
    // Buddy Commands
    if (toolName === 'buddy-do') {
      return await this.buddyHandlers.handleBuddyDo(args);
    }

    if (toolName === 'buddy-remember') {
      return await this.buddyHandlers.handleBuddyRemember(args);
    }

    if (toolName === 'buddy-help') {
      return await this.buddyHandlers.handleBuddyHelp(args);
    }

    // Hook integration tools
    if (toolName === 'hook-tool-use') {
      return await this.toolHandlers.handleHookToolUse(args);
    }

    // Learning tools
    if (toolName === 'buddy-record-mistake') {
      return await this.toolHandlers.handleBuddyRecordMistake(args);
    }

    // Knowledge Graph tools
    if (toolName === 'create-entities') {
      return await this.toolHandlers.handleCreateEntities(args);
    }

    // Test Generation tools
    if (toolName === 'generate-tests') {
      return await this.toolHandlers.handleGenerateTests(args);
    }

    // Secret Management tools (Phase 0.7.0)
    if (toolName === 'buddy-secret-store') {
      if (!this.secretManager) {
        throw new OperationError(
          'Secret management is not configured',
          {
            component: 'ToolRouter',
            method: 'dispatch',
            toolName,
          }
        );
      }
      return await handleBuddySecretStore(args, this.secretManager);
    }

    if (toolName === 'buddy-secret-get') {
      if (!this.secretManager) {
        throw new OperationError(
          'Secret management is not configured',
          {
            component: 'ToolRouter',
            method: 'dispatch',
            toolName,
          }
        );
      }
      return await handleBuddySecretGet(args, this.secretManager);
    }

    if (toolName === 'buddy-secret-list') {
      if (!this.secretManager) {
        throw new OperationError(
          'Secret management is not configured',
          {
            component: 'ToolRouter',
            method: 'dispatch',
            toolName,
          }
        );
      }
      return await handleBuddySecretList(args, this.secretManager);
    }

    if (toolName === 'buddy-secret-delete') {
      if (!this.secretManager) {
        throw new OperationError(
          'Secret management is not configured',
          {
            component: 'ToolRouter',
            method: 'dispatch',
            toolName,
          }
        );
      }
      return await handleBuddySecretDelete(args, this.secretManager);
    }

    // Cloud Sync tools
    if (toolName === 'memesh-cloud-sync') {
      const validationResult = CloudSyncInputSchema.safeParse(args);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid input for ${toolName}: ${validationResult.error.message}`,
          { component: 'ToolRouter', method: 'dispatch', toolName, zodError: validationResult.error }
        );
      }
      return handleCloudSync(validationResult.data, this.knowledgeGraph);
    }

    // Task Board tools (local task management)
    if (toolName === 'a2a-board') {
      const validationResult = A2ABoardInputSchema.safeParse(args);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid input for ${toolName}: ${validationResult.error.message}`,
          { component: 'ToolRouter', method: 'dispatch', toolName, zodError: validationResult.error }
        );
      }
      return handleA2ABoard(validationResult.data);
    }

    if (toolName === 'a2a-claim-task') {
      const validationResult = A2AClaimTaskInputSchema.safeParse(args);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid input for ${toolName}: ${validationResult.error.message}`,
          { component: 'ToolRouter', method: 'dispatch', toolName, zodError: validationResult.error }
        );
      }
      return handleA2AClaimTask(validationResult.data);
    }

    if (toolName === 'a2a-find-tasks') {
      const validationResult = A2AFindTasksInputSchema.safeParse(args);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid input for ${toolName}: ${validationResult.error.message}`,
          { component: 'ToolRouter', method: 'dispatch', toolName, zodError: validationResult.error }
        );
      }
      return handleA2AFindTasks(validationResult.data);
    }

    // Sanitize toolName in error message
    const safeName = sanitizeToolNameForError(toolName);
    throw new NotFoundError(
      `Unknown tool: ${safeName}`,
      'tool',
      safeName
    );
  }
}
