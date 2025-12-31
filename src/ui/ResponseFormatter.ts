/**
 * ResponseFormatter - Terminal UI formatting for MCP Agent Responses
 *
 * Formats agent responses for beautiful Terminal output
 * Used by MCP Server to present results to Claude Code
 *
 * Design Philosophy:
 * - Clean, professional formatting using boxen and chalk
 * - Consistent with theme.ts design system
 * - Optimized for readability in Terminal
 * - No real-time updates (static output)
 */

import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { theme, icons } from './theme.js';

/**
 * Agent Response Interface
 * Data structure for agent execution results
 */
export interface AgentResponse {
  agentType: string;
  taskDescription: string;
  status: 'success' | 'error' | 'partial';
  results?: Record<string, unknown> | string | Array<unknown>;
  enhancedPrompt?: EnhancedPrompt;
  error?: Error;
  metadata?: {
    duration?: number; // milliseconds
    tokensUsed?: number;
    model?: string;
  };
}

/**
 * Enhanced Prompt Interface
 * For Prompt Enhancement Mode
 */
export interface EnhancedPrompt {
  systemPrompt: string;
  userPrompt: string;
  suggestedModel?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ResponseFormatter
 *
 * Formats agent responses into beautiful Terminal output
 */
export class ResponseFormatter {
  // Configuration constants
  private readonly MAX_PROMPT_LENGTH = 300;
  private readonly MAX_STACK_LENGTH = 500;
  /**
   * Format complete agent response
   * @param response Agent execution result
   * @returns Formatted string for Terminal output
   */
  format(response: AgentResponse): string {
    const sections: string[] = [];

    // Header - Agent Type and Status
    try {
      sections.push(this.formatHeader(response));
    } catch (error) {
      sections.push(chalk.red('[Error formatting header]'));
    }

    // Task Description
    try {
      sections.push(this.formatTaskDescription(response.taskDescription));
    } catch (error) {
      sections.push(chalk.gray('Task: [Error formatting description]'));
    }

    // Enhanced Prompt (if Prompt Enhancement Mode)
    if (response.enhancedPrompt) {
      try {
        sections.push(this.formatEnhancedPrompt(response.enhancedPrompt));
      } catch (error) {
        sections.push(chalk.magenta('[Error formatting enhanced prompt]'));
      }
    }

    // Results (if available)
    if (response.results && response.status === 'success') {
      try {
        sections.push(this.formatResults(response.results));
      } catch (error) {
        sections.push(chalk.green('Results: [Error formatting results]'));
      }
    }

    // Error (if failed)
    if (response.error && response.status === 'error') {
      try {
        sections.push(this.formatError(response.error));
      } catch (error) {
        sections.push(chalk.red('[Error formatting error details]'));
      }
    }

    // Metadata - Duration, Tokens, Model
    if (response.metadata) {
      try {
        sections.push(this.formatMetadata(response.metadata));
      } catch (error) {
        // Silently skip metadata on error (non-critical)
      }
    }

    // Attribution Footer
    try {
      sections.push(this.formatAttribution());
    } catch (error) {
      // Silently skip attribution on error (non-critical)
    }

    return sections.join('\n\n');
  }

  /**
   * Format header with agent type and status
   */
  private formatHeader(response: AgentResponse): string {
    const statusIcon = this.getStatusIcon(response.status);
    const statusColor = this.getStatusColor(response.status);
    const agentName = chalk.bold.cyan(response.agentType.toUpperCase());

    const headerText = `${statusIcon} ${agentName} ${statusColor(response.status.toUpperCase())}`;

    return boxen(headerText, {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: 'cyan',
      borderStyle: 'round',
    });
  }

  /**
   * Format task description
   */
  private formatTaskDescription(description: string): string {
    return chalk.gray('Task: ') + chalk.white(description);
  }

  /**
   * Format enhanced prompt (for Prompt Enhancement Mode)
   */
  private formatEnhancedPrompt(prompt: EnhancedPrompt): string {
    const sections: string[] = [chalk.bold.magenta('Enhanced Prompt:')];

    // System Prompt
    sections.push(chalk.gray('System:'));
    sections.push(chalk.white(this.truncateText(prompt.systemPrompt, this.MAX_PROMPT_LENGTH)));

    // User Prompt
    sections.push(chalk.gray('User:'));
    sections.push(chalk.white(this.truncateText(prompt.userPrompt, this.MAX_PROMPT_LENGTH)));

    // Suggested Model
    if (prompt.suggestedModel) {
      sections.push(chalk.gray('Suggested Model: ') + chalk.cyan(prompt.suggestedModel));
    }

    return sections.join('\n');
  }

  /**
   * Format results
   */
  private formatResults(results: unknown): string {
    const sections: string[] = [chalk.bold.green('Results:')];

    // Handle different result types
    if (typeof results === 'string') {
      sections.push(chalk.white(results));
    } else if (Array.isArray(results)) {
      sections.push(this.formatArray(results));
    } else if (typeof results === 'object' && results !== null) {
      sections.push(this.formatObject(results as Record<string, unknown>));
    } else {
      sections.push(chalk.white(String(results)));
    }

    return sections.join('\n');
  }

  /**
   * Format error
   */
  private formatError(error: Error): string {
    const sections: string[] = [chalk.bold.red('Error:')];

    sections.push(chalk.red(`${icons.error} ${error.name}: ${error.message}`));

    if (error.stack) {
      sections.push(chalk.gray('Stack Trace:'));
      sections.push(chalk.gray(this.truncateText(error.stack, this.MAX_STACK_LENGTH)));
    }

    return sections.join('\n');
  }

  /**
   * Format metadata (duration, tokens, model)
   */
  private formatMetadata(metadata: AgentResponse['metadata']): string {
    const items: string[] = [];

    if (metadata?.duration !== undefined) {
      const duration = this.formatDuration(metadata.duration);
      items.push(chalk.gray('Duration: ') + chalk.cyan(duration));
    }

    if (metadata?.tokensUsed !== undefined) {
      const tokens = this.formatNumber(metadata.tokensUsed);
      items.push(chalk.gray('Tokens: ') + chalk.cyan(tokens));
    }

    if (metadata?.model) {
      items.push(chalk.gray('Model: ') + chalk.cyan(metadata.model));
    }

    return items.length > 0 ? items.join(' | ') : '';
  }

  /**
   * Format attribution footer
   */
  private formatAttribution(): string {
    return chalk.gray('─'.repeat(60)) + '\n' +
      chalk.gray('Powered by ') + chalk.bold.cyan('Claude Code Buddy') + chalk.gray(' | MCP Server');
  }

  /**
   * Format array as table (if objects) or list
   */
  private formatArray(arr: unknown[]): string {
    if (arr.length === 0) {
      return chalk.gray('(empty array)');
    }

    // If array of objects, format as table
    if (typeof arr[0] === 'object' && arr[0] !== null) {
      return this.formatTable(arr as Array<Record<string, unknown>>);
    }

    // Otherwise, format as list
    return arr.map((item, i) => `  ${i + 1}. ${String(item)}`).join('\n');
  }

  /**
   * Format object as key-value pairs
   */
  private formatObject(obj: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const formattedValue = typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value);

      lines.push(`  ${chalk.gray(key + ':')} ${chalk.white(formattedValue)}`);
    }

    return lines.join('\n');
  }

  /**
   * Format array of objects as table
   */
  private formatTable(data: Array<Record<string, unknown>>): string {
    if (data.length === 0) return '';

    // Get all unique keys from all objects
    const keys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

    const table = new Table({
      head: keys.map(k => chalk.bold(k)),
      style: {
        head: [],
        border: ['gray'],
      },
    });

    // Add rows
    for (const item of data) {
      const row = keys.map(k => {
        const value = item[k];
        if (value === undefined || value === null) return chalk.gray('-');
        if (typeof value === 'object') return chalk.gray('[Object]');
        return String(value);
      });
      table.push(row);
    }

    return table.toString();
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: AgentResponse['status']): string {
    switch (status) {
      case 'success':
        return chalk.green(icons.success);
      case 'error':
        return chalk.red(icons.error);
      case 'partial':
        return chalk.yellow(icons.warning);
      default:
        return chalk.gray(icons.info);
    }
  }

  /**
   * Get status color function
   */
  private getStatusColor(status: AgentResponse['status']): typeof chalk.green {
    switch (status) {
      case 'success':
        return chalk.green;
      case 'error':
        return chalk.red;
      case 'partial':
        return chalk.yellow;
      default:
        return chalk.gray;
    }
  }

  /**
   * Truncate text to maximum length
   * Properly handles Unicode characters (emoji, CJK, etc.) by splitting on code points
   */
  private truncateText(text: string, maxLength: number): string {
    // Use Array.from to properly handle Unicode code points
    // This prevents breaking multi-byte characters (emoji, surrogate pairs)
    const chars = Array.from(text);

    if (chars.length <= maxLength) {
      return text;
    }

    return chars.slice(0, maxLength).join('') + chalk.gray('... (truncated)');
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      const seconds = Math.round(ms / 100) / 10;
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.round((ms % 60000) / 1000);
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
  }

  /**
   * Format large numbers with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
