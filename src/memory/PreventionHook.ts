/**
 * PreventionHook - Simplified
 *
 * Intelligence (pattern extraction, operation checking) delegated to LLM via MCP tool descriptions.
 *
 * This module is marked for potential removal in future phases as prevention logic
 * should be handled by the LLM via prompt engineering and tool descriptions.
 */

import { MistakePatternEngine } from './MistakePatternEngine.js';
import { logger } from '../utils/logger.js';

/**
 * Operation context for tool call interception
 */
export interface Operation {
  /** Name of the tool being used */
  tool: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Current context information */
  context: {
    /** Recently used tools */
    recentTools: string[];
    /** Current task description */
    currentTask: string;
    /** Files that have been read in this session */
    filesRead: string[];
    /** Files that have been modified in this session */
    filesModified: string[];
  };
}

/**
 * Result of hook evaluation
 */
export interface HookResult {
  /** Whether to proceed with the tool call */
  proceed: boolean | 'pending';
  /** Reason for blocking (if blocked) */
  reason?: string;
  /** Warning messages (non-blocking) */
  warnings?: string[];
  /** Suggestion messages */
  suggestions?: string[];
  /** Whether user confirmation is required */
  requireUserConfirmation?: boolean;
}

/**
 * PreventionHook - Simplified (marked for deprecation)
 *
 * Intelligence delegated to LLM:
 * - Pattern extraction → LLM analyzes mistakes
 * - Operation checking → LLM evaluates tool calls
 * - Rule matching → LLM recognizes patterns
 */
export class PreventionHook {
  constructor(private engine: MistakePatternEngine) {}

  /**
   * Hook before tool call - Simplified to always proceed
   *
   * Prevention logic delegated to LLM via:
   * - SessionStart hook with prevention reminders
   * - Tool descriptions with usage guidelines
   * - Prompt engineering for safe practices
   *
   * @param operation - Tool operation to check
   * @returns Hook result (always proceed in simplified version)
   */
  async beforeToolCall(operation: Operation): Promise<HookResult> {
    logger.debug('[PreventionHook] Tool call (prevention delegated to LLM)', {
      tool: operation.tool,
    });

    // Always proceed - prevention delegated to LLM
    return {
      proceed: true,
      warnings: [],
      suggestions: [],
    };
  }

  /**
   * Get statistics about stored prevention rules
   *
   * @returns Basic statistics
   */
  async getStatistics(): Promise<{
    totalRules: number;
    byCategory: Record<string, number>;
  }> {
    return this.engine.getStatistics();
  }
}
