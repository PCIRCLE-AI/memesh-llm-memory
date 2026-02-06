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
  private projectMemoryManager: ProjectMemoryManager;
  private autoTracker?: ProjectAutoTracker;

  constructor(
    formatter: ResponseFormatter,
    projectMemoryManager: ProjectMemoryManager,
    autoTracker?: ProjectAutoTracker
  ) {
    this.formatter = formatter;
    this.projectMemoryManager = projectMemoryManager;
    this.autoTracker = autoTracker;
  }

  /**
   * Handle buddy_do command - Record task to knowledge graph
   */
  async handleBuddyDo(
    args: unknown
  ): Promise<CallToolResult> {
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
