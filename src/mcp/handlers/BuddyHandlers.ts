/**
 * Buddy Command Handlers Module
 *
 * Handles user-friendly buddy commands (buddy_do, buddy_stats, buddy_remember, buddy_help).
 * Extracted from server.ts for better modularity.
 */

import { z } from 'zod';
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
  executeBuddyStats,
  BuddyStatsInputSchema,
  type ValidatedBuddyStatsInput,
} from '../tools/buddy-stats.js';
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
 * Encapsulates all buddy command handlers (buddy_do, buddy_stats, buddy_remember, buddy_help)
 */
export class BuddyHandlers {
  private router: Router;
  private formatter: ResponseFormatter;
  private projectMemoryManager: ProjectMemoryManager;

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
   */
  async handleBuddyDo(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
        throw new ValidationError(
          'Invalid buddy_do input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyDo',
            schema: 'BuddyDoInputSchema',
            providedArgs: args,
          }
        );
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
   * Handle buddy_stats command - Performance dashboard
   */
  async handleBuddyStats(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input
    let validatedInput: ValidatedBuddyStatsInput;
    try {
      validatedInput = BuddyStatsInputSchema.parse(args);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyStats',
        operation: 'validating buddy_stats input',
        data: { providedArgs: args },
      });

      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid buddy_stats input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyStats',
            schema: 'BuddyStatsInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    try {
      return await executeBuddyStats(validatedInput, this.formatter);
    } catch (error) {
      logError(error, {
        component: 'BuddyHandlers',
        method: 'handleBuddyStats',
        operation: 'executing buddy_stats command',
        data: { period: validatedInput.period },
      });
      throw error;
    }
  }

  /**
   * Handle buddy_remember command - Recall project memory
   */
  async handleBuddyRemember(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
        throw new ValidationError(
          'Invalid buddy_remember input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyRemember',
            schema: 'BuddyRememberInputSchema',
            providedArgs: args,
          }
        );
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
        throw new ValidationError(
          'Invalid buddy_help input',
          {
            component: 'BuddyHandlers',
            method: 'handleBuddyHelp',
            schema: 'BuddyHelpInputSchema',
            providedArgs: args,
          }
        );
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
