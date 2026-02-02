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
import { ErrorClassifier } from '../errors/ErrorClassifier.js';

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
  private readonly LARGE_RESULT_THRESHOLD = 500; // characters

  // Error classification
  private readonly errorClassifier: ErrorClassifier;

  constructor() {
    this.errorClassifier = new ErrorClassifier();
  }

  /**
   * Format complete agent response
   * @param response Agent execution result
   * @returns Formatted string for Terminal output
   */
  format(response: AgentResponse): string {
    // Detect response complexity
    const complexity = this.detectComplexity(response);

    // Route to appropriate formatter based on complexity
    switch (complexity) {
      case 'simple':
        return this.formatSimple(response);
      case 'medium':
        return this.formatMedium(response);
      case 'complex':
        return this.formatComplex(response);
      default:
        return this.formatComplex(response); // Fallback to full format
    }
  }

  /**
   * Detect response complexity
   * @param response Agent execution result
   * @returns Complexity level: 'simple' | 'medium' | 'complex'
   */
  private detectComplexity(response: AgentResponse): 'simple' | 'medium' | 'complex' {
    // Complex if:
    // - Has error
    // - Has enhanced prompt (Prompt Enhancement Mode)
    // - Has large results (>500 chars)
    if (response.error) {
      return 'complex';
    }

    if (response.enhancedPrompt) {
      return 'complex';
    }

    if (response.results) {
      const resultString = this.resultsToString(response.results);
      if (resultString.length > this.LARGE_RESULT_THRESHOLD) {
        return 'complex';
      }
    }

    // Medium if:
    // - Has structured object results
    if (response.results && typeof response.results === 'object' && !Array.isArray(response.results)) {
      return 'medium';
    }

    // Simple otherwise
    return 'simple';
  }

  /**
   * Format simple response (minimal formatting)
   * @param response Agent execution result
   * @returns Single-line or minimal formatted output
   */
  private formatSimple(response: AgentResponse): string {
    const statusIcon = this.getStatusIcon(response.status);
    return `${statusIcon} ${response.taskDescription}`;
  }

  /**
   * Format medium complexity response with Next Steps
   * @param response Agent execution result
   * @returns Multi-line format without heavy borders but with actionable guidance
   */
  private formatMedium(response: AgentResponse): string {
    const sections: string[] = [];

    // Icon + bold task description
    const statusIcon = this.getStatusIcon(response.status);
    sections.push(chalk.bold(`${statusIcon} ${response.taskDescription}`));

    // Results (no box)
    if (response.results && response.status === 'success') {
      try {
        sections.push(''); // Empty line for separation
        sections.push(this.formatResults(response.results));
      } catch (error) {
        sections.push(chalk.green('Results: [Error formatting results]'));
      }
    }

    // Next Steps / Actionable Guidance (if available)
    const nextSteps = this.generateNextSteps(response);
    if (nextSteps) {
      try {
        sections.push(''); // Empty line for separation
        sections.push(nextSteps);
      } catch (error) {
        // Silently skip next steps on error (non-critical)
      }
    }

    // Metadata (if available)
    if (response.metadata) {
      try {
        const metadataStr = this.formatMetadata(response.metadata);
        if (metadataStr) {
          sections.push(''); // Empty line for separation
          sections.push(metadataStr);
        }
      } catch (error) {
        // Silently skip metadata on error (non-critical)
      }
    }

    return sections.join('\n');
  }

  /**
   * Format complex response (full boxed format with enhanced visual hierarchy)
   * @param response Agent execution result
   * @returns Full formatted output with improved scannability and structure
   */
  private formatComplex(response: AgentResponse): string {
    const sections: string[] = [];

    // Header - Agent Type and Status (CRITICAL - Always prominent)
    try {
      sections.push(this.formatHeader(response));
    } catch (error) {
      sections.push(chalk.red('[Error formatting header]'));
    }

    // Task Description with icon
    try {
      sections.push(this.formatSection(
        icons.task || '📋',
        'Task',
        response.taskDescription
      ));
    } catch (error) {
      sections.push(chalk.gray('Task: [Error formatting description]'));
    }

    // Enhanced Prompt (if Prompt Enhancement Mode)
    if (response.enhancedPrompt) {
      try {
        sections.push(this.formatDivider());
        sections.push(this.formatEnhancedPrompt(response.enhancedPrompt));
      } catch (error) {
        sections.push(chalk.magenta('[Error formatting enhanced prompt]'));
      }
    }

    // Results (if available) - HIGH PRIORITY
    if (response.results && response.status === 'success') {
      try {
        sections.push(this.formatDivider());
        sections.push(this.formatResults(response.results));
      } catch (error) {
        sections.push(chalk.green('Results: [Error formatting results]'));
      }
    }

    // Error (if failed) - CRITICAL PRIORITY
    if (response.error && response.status === 'error') {
      try {
        sections.push(this.formatDivider());
        sections.push(this.formatError(response.error));
      } catch (error) {
        sections.push(chalk.red('[Error formatting error details]'));
      }
    }

    // Next Steps / Actionable Guidance (if available)
    const nextSteps = this.generateNextSteps(response);
    if (nextSteps) {
      try {
        sections.push(this.formatDivider());
        sections.push(nextSteps);
      } catch (error) {
        // Silently skip next steps on error (non-critical)
      }
    }

    // Metadata - Duration, Tokens, Model (LOW PRIORITY - Subtle)
    if (response.metadata) {
      try {
        const metadataStr = this.formatMetadata(response.metadata);
        if (metadataStr) {
          sections.push('');
          sections.push(metadataStr);
        }
      } catch (error) {
        // Silently skip metadata on error (non-critical)
      }
    }

    // Attribution Footer (conditional)
    if (this.shouldShowAttribution(response)) {
      try {
        sections.push(this.formatAttribution());
      } catch (error) {
        // Silently skip attribution on error (non-critical)
      }
    }

    return sections.join('\n');
  }

  /**
   * Convert results to string for size checking
   */
  private resultsToString(results: unknown): string {
    if (typeof results === 'string') {
      return results;
    } else if (Array.isArray(results) || typeof results === 'object') {
      return JSON.stringify(results);
    } else {
      return String(results);
    }
  }

  /**
   * Determine if attribution footer should be shown
   */
  private shouldShowAttribution(response: AgentResponse): boolean {
    // Always show if SHOW_ATTRIBUTION=always
    if (process.env.SHOW_ATTRIBUTION === 'always') {
      return true;
    }

    // Show for complex responses
    const complexity = this.detectComplexity(response);
    return complexity === 'complex';
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
   * @deprecated Use formatSection instead for better visual hierarchy
   */
  private formatTaskDescription(description: string): string {
    return chalk.gray('Task: ') + chalk.white(description);
  }

  /**
   * Format a section with consistent styling
   * @param icon Section icon (emoji or symbol)
   * @param title Section title
   * @param content Section content
   * @returns Formatted section with icon, title, and content
   */
  private formatSection(icon: string, title: string, content: string): string {
    const header = `${icon} ${chalk.bold(title)}`;
    return `${header}\n${chalk.white(content)}`;
  }

  /**
   * Format a visual section divider
   * @returns Subtle divider line
   */
  private formatDivider(): string {
    return chalk.dim('─'.repeat(60));
  }

  /**
   * Generate actionable next steps based on response context
   * @param response Agent execution result
   * @returns Formatted next steps section or null if not applicable
   */
  private generateNextSteps(response: AgentResponse): string | null {
    const suggestions: string[] = [];

    // Error-specific next steps
    if (response.status === 'error' && response.error) {
      suggestions.push('Review the error message and stack trace above');
      suggestions.push('Check recent changes that might have caused this error');
      suggestions.push('Try: buddy-remember "similar errors" to find past solutions');
    }

    // Success-specific next steps (based on agent type)
    if (response.status === 'success') {
      switch (response.agentType) {
        case 'buddy-do':
          suggestions.push('Verify the implementation meets requirements');
          suggestions.push('Run tests to ensure nothing broke');
          suggestions.push('Consider: buddy-remember "this implementation" to store decision');
          break;
        case 'buddy-remember':
          // Check if results were found
          const hasResults = response.results &&
            typeof response.results === 'object' &&
            'count' in response.results &&
            (response.results.count as number) > 0;

          if (!hasResults) {
            suggestions.push('Try a broader search term');
            suggestions.push('Use buddy-do to create new memories for this topic');
          } else {
            suggestions.push('Review the memories above for relevant context');
            suggestions.push('Apply these learnings to your current task');
          }
          break;
      }
    }

    // No suggestions? Don't show section
    if (suggestions.length === 0) {
      return null;
    }

    const header = `${icons.lightbulb || '💡'} ${chalk.bold.cyan('Next Steps')}`;
    const items = suggestions.map((s, i) => `  ${i + 1}. ${chalk.white(s)}`).join('\n');

    return `${header}\n${items}`;
  }

  /**
   * Format enhanced prompt (for Prompt Enhancement Mode) with improved hierarchy
   */
  private formatEnhancedPrompt(prompt: EnhancedPrompt): string {
    const icon = icons.rocket || '🚀';
    const header = `${chalk.magenta(icon)} ${chalk.bold.magenta('Enhanced Prompt')}`;
    const sections: string[] = [header];

    // System Prompt
    sections.push('');
    sections.push(chalk.bold('System:'));
    sections.push(chalk.white(this.truncateText(prompt.systemPrompt, this.MAX_PROMPT_LENGTH)));

    const guardrails = this.extractGuardrails(prompt.metadata);
    const userPrompt = guardrails
      ? this.stripGuardrails(prompt.userPrompt, guardrails)
      : prompt.userPrompt;

    // User Prompt
    sections.push('');
    sections.push(chalk.bold('User:'));
    sections.push(chalk.white(this.truncateText(userPrompt, this.MAX_PROMPT_LENGTH)));

    // Guardrails (if present) - highlighted
    if (guardrails) {
      sections.push('');
      sections.push(chalk.bold.yellow(`${icons.warning || '⚠️'} Guardrails:`));
      sections.push(chalk.white(guardrails));
    }

    // Suggested Model
    if (prompt.suggestedModel) {
      sections.push('');
      sections.push(chalk.dim('Suggested Model: ') + chalk.cyan(prompt.suggestedModel));
    }

    return sections.join('\n');
  }

  private extractGuardrails(metadata?: EnhancedPrompt['metadata']): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const record = metadata as Record<string, unknown>;
    return typeof record.guardrails === 'string' ? record.guardrails : null;
  }

  private stripGuardrails(userPrompt: string, guardrails: string): string {
    const index = userPrompt.lastIndexOf(guardrails);
    if (index === -1) {
      return userPrompt;
    }

    return userPrompt.slice(0, index).trimEnd();
  }

  /**
   * Format results with enhanced visual hierarchy
   */
  private formatResults(results: unknown): string {
    const icon = icons.success || '✓';
    const header = `${chalk.green(icon)} ${chalk.bold.green('Results')}`;
    const sections: string[] = [header];

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
   * Format error with enhanced prominence and actionability
   * Uses ErrorClassifier for intelligent error analysis and recovery guidance
   */
  private formatError(error: Error): string {
    // Classify error for enhanced formatting
    const classified = this.errorClassifier.classify(error, {});

    const sections: string[] = [];

    // CRITICAL: Error header with severity badge
    const errorIcon = icons.error || '❌';
    const header = `${chalk.red(errorIcon)} ${chalk.bold.red(classified.title)}`;
    sections.push(header);
    sections.push('');

    // Severity and category badge
    const severityBadge = this.getSeverityBadge(classified.severity);
    sections.push(`${severityBadge} ${chalk.bold(classified.category.toUpperCase())}`);
    sections.push('');

    // Error description
    sections.push(chalk.white(classified.description));
    sections.push('');

    // Root cause analysis
    sections.push(chalk.bold('Root Cause:'));
    sections.push(chalk.yellow(`  ${classified.rootCause}`));
    sections.push('');

    // Fix steps (actionable guidance)
    if (classified.fixSteps.length > 0) {
      sections.push(chalk.bold('Fix Steps:'));
      classified.fixSteps.forEach((step, i) => {
        sections.push(chalk.white(`  ${i + 1}. ${step}`));
      });
      sections.push('');
    }

    // Auto-fix notification
    if (classified.autoFixAvailable) {
      sections.push(chalk.cyan(`${icons.lightbulb || '💡'} Auto-fix available!`));
      sections.push(chalk.dim('  Run: buddy-fix --auto'));
      sections.push('');
    }

    // Related documentation
    if (classified.relatedDocs.length > 0) {
      sections.push(chalk.bold('Related Documentation:'));
      classified.relatedDocs.forEach((doc) => {
        sections.push(chalk.cyan(`  • ${doc.title}: ${chalk.underline(doc.url)}`));
      });
      sections.push('');
    }

    // Related commands
    if (classified.relatedCommands.length > 0) {
      sections.push(chalk.bold('Related Commands:'));
      classified.relatedCommands.forEach((cmd) => {
        sections.push(chalk.cyan(`  $ ${cmd}`));
      });
      sections.push('');
    }

    // Troubleshooting tips
    if (classified.troubleshootingTips.length > 0) {
      sections.push(chalk.bold('Troubleshooting Tips:'));
      classified.troubleshootingTips.forEach((tip) => {
        sections.push(chalk.dim(`  • ${tip}`));
      });
      sections.push('');
    }

    // Stack trace (if debug mode) - subtle, truncated
    if (error.stack && process.env.DEBUG) {
      sections.push(chalk.dim('Stack Trace (DEBUG):'));
      sections.push(chalk.dim(this.truncateText(error.stack, this.MAX_STACK_LENGTH)));
      sections.push('');
    }

    // Get help footer
    sections.push(chalk.dim('─'.repeat(60)));
    sections.push(chalk.dim('Need more help?'));
    sections.push(chalk.cyan('  $ memesh report-issue'));
    sections.push(chalk.dim('  https://github.com/PCIRCLE-AI/claude-code-buddy/issues'));

    return sections.join('\n');
  }

  /**
   * Get severity badge with appropriate color
   */
  private getSeverityBadge(severity: string): string {
    switch (severity) {
      case 'critical':
        return chalk.red.bold('[CRITICAL]');
      case 'high':
        return chalk.red('[HIGH]');
      case 'medium':
        return chalk.yellow('[MEDIUM]');
      case 'low':
        return chalk.gray('[LOW]');
      default:
        return chalk.gray('[UNKNOWN]');
    }
  }

  /**
   * Format metadata (duration, tokens, model) - Subtle, low visual priority
   */
  private formatMetadata(metadata: AgentResponse['metadata']): string {
    const items: string[] = [];

    if (metadata?.duration !== undefined) {
      const duration = this.formatDuration(metadata.duration);
      items.push(chalk.dim(`Duration: ${duration}`));
    }

    if (metadata?.tokensUsed !== undefined) {
      const tokens = this.formatNumber(metadata.tokensUsed);
      items.push(chalk.dim(`Tokens: ${tokens}`));
    }

    if (metadata?.model) {
      items.push(chalk.dim(`Model: ${metadata.model}`));
    }

    return items.length > 0 ? chalk.dim(items.join(' • ')) : '';
  }

  /**
   * Format attribution footer
   */
  private formatAttribution(): string {
    return chalk.gray('─'.repeat(60)) + '\n' +
      chalk.gray('Powered by ') + chalk.bold.cyan('MeMesh') + chalk.gray(' | MCP Server');
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

    const truncated = chars.length - maxLength;
    const truncatedChars = this.formatNumber(truncated);

    return chars.slice(0, maxLength).join('') +
      chalk.yellow(`\n... (truncated ${truncatedChars} characters, use --full to see complete output)`);
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
