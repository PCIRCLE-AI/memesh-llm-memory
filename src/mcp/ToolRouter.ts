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
import { ToolHandlers, BuddyHandlers } from './handlers/index.js';

/**
 * Tool Router Configuration
 */
export interface ToolRouterConfig {
  rateLimiter: RateLimiter;
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
}

/**
 * Tool Router
 *
 * Central routing hub for all MCP tool calls. Validates requests, applies rate limiting,
 * and dispatches to appropriate handler modules based on tool name.
 *
 * The router supports main categories of tools:
 * - **Buddy Tools**: buddy-do, buddy-remember, buddy-help
 * - **Workflow Guidance Tools**: get-workflow-guidance, get-session-health
 * - **Planning Tools**: generate-smart-plan
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

  /**
   * Create a new ToolRouter instance
   *
   * @param config - Router configuration with all required dependencies
   */
  constructor(config: ToolRouterConfig) {
    this.rateLimiter = config.rateLimiter;
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
   * - Workflow guidance tools (get-workflow-guidance, etc.)
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

    // Workflow Guidance tools
    if (toolName === 'get-workflow-guidance') {
      return await this.toolHandlers.handleGetWorkflowGuidance(args);
    }

    if (toolName === 'get-session-health') {
      return await this.toolHandlers.handleGetSessionHealth();
    }

    // Planning tools
    if (toolName === 'generate-smart-plan') {
      return await this.toolHandlers.handleGenerateSmartPlan(args);
    }

    // Hook integration tools
    if (toolName === 'hook-tool-use') {
      return await this.toolHandlers.handleHookToolUse(args);
    }

    throw new NotFoundError(
      `Unknown tool: ${toolName}`,
      'tool',
      toolName
    );
  }
}
