/**
 * Buddy Command Handlers Module
 *
 * Provides user-friendly "buddy" commands for common operations. These commands
 * use natural language and hide technical complexity from users.
 *
 * **Available Commands**:
 * - **buddy_do**: Execute tasks with smart routing (replaces smart_route_task/sa_task)
 * - **buddy_remember**: Recall project memory (search knowledge graph)
 * - **buddy_help**: Get help and usage instructions
 *
 * **Design Philosophy**:
 * - Natural language interface
 * - Beginner-friendly error messages
 * - Contextual help and suggestions
 * - Progressive disclosure of advanced features
 *
 * @module BuddyHandlers
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../../errors/index.js';
import { logError } from '../../utils/errorHandler.js';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';

// Import buddy command functions and schemas
import {
  executeBuddyDo,
  BuddyDoInputSchema,
  type ValidatedBuddyDoInput,
} from '../tools/buddy-do.js';
import {
  executeBuddyRemember,
  BuddyRememberInputSchema,
  type ValidatedBuddyRememberInput,
} from '../tools/buddy-remember.js';
import {
  executeBuddyHelp,
  BuddyHelpInputSchema,
  type ValidatedBuddyHelpInput,
} from '../tools/buddy-help.js';

/**
 * Buddy Command Handler Class
 *
 * Provides simplified, user-friendly interfaces for common operations. Acts as
 * a facade over more complex underlying systems (Router, Memory, etc.).
 *
 * **Command Categories**:
 * - **Task Execution**: buddy_do (delegated to Router)
 * - **Memory**: buddy_remember (delegated to ProjectMemoryManager)
 * - **Help**: buddy_help (contextual documentation)
 *
 * **Error Handling**:
 * All commands use consistent error handling:
 * - Input validation with Zod schemas
 * - Structured error logging
 * - User-friendly error messages
 * - Suggested next steps on failures
 */
export class BuddyHandlers {
  private router: Router;
  private formatter: ResponseFormatter;
  private projectMemoryManager: ProjectMemoryManager;

  /**
   * Create a new BuddyHandlers instance
   *
   * @param router - Main task routing engine
   * @param formatter - Response formatting utility
   * @param projectMemoryManager - Project memory management system
   */
  constructor(
    router: Router,
    formatter: ResponseFormatter,
    projectMemoryManager: ProjectMemoryManager
  ) {
    this.router = router;
    this.formatter = formatter;
    this.projectMemoryManager = projectMemoryManager;
  }

  /**
   * Handle buddy_do command - Execute tasks with smart routing
   *
   * Natural language interface for task execution. Automatically routes tasks
   * to the most appropriate capability and returns enhanced prompts.
   *
   * This replaces smart_route_task/sa_task with:
   * - More forgiving input validation
   * - Friendlier error messages
   * - Contextual usage tips
   *
   * **Workflow**:
   * 1. Validate task description
   * 2. Route through main Router (TaskAnalyzer → AgentRouter)
   * 3. Format response with ResponseFormatter
   * 4. Return enhanced prompt + capability recommendation
   *
   * @param args - Buddy do arguments
   * @param args.task - Task description in natural language
   * @returns Promise resolving to formatted task response
   *
   * @throws ValidationError if task description is missing/invalid
   *
   * @example
   * ```typescript
   * await handleBuddyDo({
   *   task: 'Create a React component for user profile'
   * });
   *
   * // Returns:
   * // 🤖 Routing to: frontend-developer
   * // 📝 Enhanced Prompt:
   * // [Detailed instructions for building the component]
   * ```
   */
  async handleBuddyDo(
    args: unknown
  ): Promise<CallToolResult> {
    // Validate input
    let validatedInput: ValidatedBuddyDoInput;
    try {
      validatedInput = BuddyDoInputSchema.parse(args);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyDo',
        operation: 'validating buddy_do input',
        data: { providedArgs: args },
      });

      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Invalid buddy_do input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyDo',
            schema: 'BuddyDoInputSchema',
            providedArgs: args,
          }
        );

        // Return formatted validation error instead of throwing
        const errorText = `${validationError.name}: ${validationError.message}`;

        return {
          content: [
            {
              type: 'text' as const,
              text: errorText,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }

    try {
      return await executeBuddyDo(validatedInput, this.router, this.formatter);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyDo',
        operation: 'executing buddy_do command',
        data: { task: validatedInput.task },
      });
      throw error;
    }
  }

  /**
   * Handle buddy_remember command - Recall project memory
   *
   * Searches the knowledge graph for relevant project memories. Useful for:
   * - Recalling past decisions and their rationale
   * - Finding similar problems and solutions
   * - Understanding project history
   * - Discovering related features
   *
   * **Search Capabilities**:
   * - Semantic search (meaning-based, not just keywords)
   * - Entity relationship traversal
   * - Temporal filtering (recent vs. historical)
   * - Type-based filtering (decisions, lessons, features, etc.)
   *
   * @param args - Buddy remember arguments
   * @param args.query - Search query in natural language
   * @returns Promise resolving to formatted memory results
   *
   * @example
   * ```typescript
   * await handleBuddyRemember({
   *   query: 'authentication implementation'
   * });
   *
   * // Returns:
   * // 📚 Found 3 relevant memories:
   * // 1. 2025-01-01: Implemented JWT authentication
   * //    - Used passport.js library
   * //    - Token expiration: 24 hours
   * //    - Refresh token rotation enabled
   * // 2. 2024-12-15: Authentication architecture decision
   * //    - Chose JWT over sessions for scalability
   * //    ...
   * ```
   */
  async handleBuddyRemember(
    args: unknown
  ): Promise<CallToolResult> {
    // Validate input
    let validatedInput: ValidatedBuddyRememberInput;
    try {
      validatedInput = BuddyRememberInputSchema.parse(args);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyRemember',
        operation: 'validating buddy_remember input',
        data: { providedArgs: args },
      });

      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Invalid buddy_remember input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyRemember',
            schema: 'BuddyRememberInputSchema',
            providedArgs: args,
          }
        );

        // Return formatted validation error instead of throwing
        const errorText = `${validationError.name}: ${validationError.message}`;

        return {
          content: [
            {
              type: 'text' as const,
              text: errorText,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }

    try {
      return await executeBuddyRemember(validatedInput, this.projectMemoryManager, this.formatter);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyRemember',
        operation: 'executing buddy_remember command',
        data: { query: validatedInput.query },
      });
      throw error;
    }
  }

  /**
   * Handle buddy_help command - Get help and documentation
   */
  async handleBuddyHelp(
    args: unknown
  ): Promise<CallToolResult> {
    // Validate input
    let validatedInput: ValidatedBuddyHelpInput;
    try {
      validatedInput = BuddyHelpInputSchema.parse(args);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyHelp',
        operation: 'validating buddy_help input',
        data: { providedArgs: args },
      });

      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Invalid buddy_help input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyHelp',
            schema: 'BuddyHelpInputSchema',
            providedArgs: args,
          }
        );

        // Return formatted validation error instead of throwing
        const errorText = `${validationError.name}: ${validationError.message}`;

        return {
          content: [
            {
              type: 'text' as const,
              text: errorText,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }

    try {
      return await executeBuddyHelp(validatedInput, this.formatter);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyHelp',
        operation: 'executing buddy_help command',
        data: { command: validatedInput.command },
      });
      throw error;
    }
  }
}
