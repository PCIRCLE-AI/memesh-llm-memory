/**
 * Buddy Command Handlers Module
 *
 * Provides user-friendly "buddy" commands for common operations.
 *
 * Available Commands:
 * - buddy_do: Record tasks to knowledge graph
 * - buddy_remember: Recall project memory (search knowledge graph)
 * - buddy_help: Get help and usage instructions
 *
 * @module BuddyHandlers
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../../errors/index.js';
import { logError } from '../../utils/errorHandler.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ProjectAutoTracker } from '../../memory/ProjectAutoTracker.js';

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
 * Provides simplified, user-friendly interfaces for common operations.
 */
export class BuddyHandlers {
  private formatter: ResponseFormatter;
  private projectMemoryManager: ProjectMemoryManager | undefined;
  private autoTracker?: ProjectAutoTracker;

  constructor(
    formatter: ResponseFormatter,
    projectMemoryManager: ProjectMemoryManager | undefined,
    autoTracker?: ProjectAutoTracker
  ) {
    this.formatter = formatter;
    this.projectMemoryManager = projectMemoryManager;
    this.autoTracker = autoTracker;
  }

  /**
   * Check if local memory systems are available
   * @returns true if running in cloud-only mode (local storage unavailable)
   */
  private isCloudOnlyMode(): boolean {
    return this.projectMemoryManager === undefined;
  }

  /**
   * Return cloud-only mode error message
   * @param toolName - Name of the tool being called
   */
  private cloudOnlyModeError(toolName: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Tool '${toolName}' is not available in cloud-only mode.\n\n` +
                `This MCP server is running without local SQLite storage (better-sqlite3 unavailable).\n\n` +
                `To use local memory tools:\n` +
                `1. Install better-sqlite3: npm install better-sqlite3\n` +
                `2. Restart the MCP server\n\n` +
                `OR use cloud sync tools instead:\n` +
                `- memesh-cloud-sync: Sync with cloud storage (requires MEMESH_API_KEY)`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Handle buddy_do command - Record task to knowledge graph
   */
  async handleBuddyDo(
    args: unknown
  ): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('buddy-do');
    }

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
      return await executeBuddyDo(validatedInput, this.formatter, this.autoTracker);
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
   */
  async handleBuddyRemember(
    args: unknown
  ): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('buddy-remember');
    }

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
      // Safe to use non-null assertion - cloud-only mode check at method start ensures non-null
      return await executeBuddyRemember(validatedInput, this.projectMemoryManager!, this.formatter);
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
