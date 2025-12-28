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
  metadata?: Record<string, any>;
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
    sections.push(this.formatHeader(response));

    // Task Description
    sections.push(this.formatTaskDescription(response.taskDescription));

    // Enhanced Prompt (if Prompt Enhancement Mode)
    if (response.enhancedPrompt) {
      sections.push(this.formatEnhancedPrompt(response.enhancedPrompt));
    }

    // Results (if available)
    if (response.results && response.status === 'success') {
      sections.push(this.formatResults(response.results));
    }

    // Error (if failed)
    if (response.error && response.status === 'error') {
      sections.push(this.formatError(response.error));
    }

    // Metadata - Duration, Tokens, Model
    if (response.metadata) {
      sections.push(this.formatMetadata(response.metadata));
    }

    // Attribution Footer
    sections.push(this.formatAttribution());

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
  private formatResults(results: any): string {
    const sections: string[] = [chalk.bold.green('Results:')];

    // Handle different result types
    if (typeof results === 'string') {
      sections.push(chalk.white(results));
    } else if (Array.isArray(results)) {
      sections.push(this.formatArray(results));
    } else if (typeof results === 'object') {
      sections.push(this.formatObject(results));
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
      chalk.gray('Powered by ') + chalk.bold.cyan('Smart-Agents') + chalk.gray(' | MCP Server');
  }

  /**
   * Format array as table (if objects) or list
   */
  private formatArray(arr: any[]): string {
    if (arr.length === 0) {
      return chalk.gray('(empty array)');
    }

    // If array of objects, format as table
    if (typeof arr[0] === 'object' && arr[0] !== null) {
      return this.formatTable(arr);
    }

    // Otherwise, format as list
    return arr.map((item, i) => `  ${i + 1}. ${String(item)}`).join('\n');
  }

  /**
   * Format object as key-value pairs
   */
  private formatObject(obj: Record<string, any>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const formattedValue = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);

      lines.push(`  ${chalk.gray(key + ':')} ${chalk.white(formattedValue)}`);
    }

    return lines.join('\n');
  }

  /**
   * Format array of objects as table
   */
  private formatTable(data: any[]): string {
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
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + chalk.gray('... (truncated)');
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
