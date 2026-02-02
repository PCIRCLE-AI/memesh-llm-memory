/**
 * Error Classification System
 *
 * Categorizes errors and provides:
 * - Clear error descriptions
 * - Root cause analysis
 * - Step-by-step fix instructions
 * - Auto-recovery suggestions
 * - Related documentation
 *
 * Phase D: Error Handling Enhancement
 */

import chalk from 'chalk';
import { icons } from '../ui/theme.js';

/**
 * Error Categories
 */
export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  CONNECTION = 'connection',
  RUNTIME = 'runtime',
  INTEGRATION = 'integration',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RESOURCE = 'resource',
  UNKNOWN = 'unknown',
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  CRITICAL = 'critical',  // Blocks all functionality
  HIGH = 'high',          // Blocks core functionality
  MEDIUM = 'medium',      // Reduces functionality
  LOW = 'low',            // Minor inconvenience
}

/**
 * Recovery Strategy Types
 */
export enum RecoveryStrategy {
  RETRY = 'retry',                    // Retry the operation
  FALLBACK = 'fallback',              // Use alternative method
  MANUAL = 'manual',                  // Requires user intervention
  AUTO_FIX = 'auto_fix',              // Can be fixed automatically
  GRACEFUL_DEGRADATION = 'graceful',  // Continue with reduced functionality
  ABORT = 'abort',                    // Cannot recover
}

/**
 * Classified Error Information
 */
export interface ClassifiedError {
  // Error identity
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;

  // User-facing messages
  title: string;
  description: string;
  rootCause: string;

  // Recovery information
  recoveryStrategy: RecoveryStrategy;
  fixSteps: string[];
  autoFixAvailable: boolean;

  // Context and resources
  relatedDocs: Array<{ title: string; url: string }>;
  relatedCommands: string[];
  troubleshootingTips: string[];

  // Technical details
  originalError: Error;
  context: Record<string, unknown>;
}

/**
 * Error Classifier
 *
 * Analyzes errors and provides detailed classification with recovery guidance
 */
export class ErrorClassifier {
  /**
   * Classify an error and return detailed information
   */
  classify(error: Error, context: Record<string, unknown> = {}): ClassifiedError {
    // Detect error category
    const category = this.detectCategory(error, context);

    // Get error details based on category
    const errorDetails = this.getErrorDetails(error, category, context);

    return {
      ...errorDetails,
      category,
      originalError: error,
      context,
    };
  }

  /**
   * Format classified error for display
   */
  format(classified: ClassifiedError): string {
    const sections: string[] = [];

    // Header - Error icon and title
    sections.push(
      `${chalk.red(icons.error || '❌')} ${chalk.bold.red(classified.title)}`
    );
    sections.push('');

    // Severity badge
    const severityBadge = this.getSeverityBadge(classified.severity);
    sections.push(`${severityBadge} ${chalk.bold(classified.category.toUpperCase())}`);
    sections.push('');

    // Description
    sections.push(chalk.white(classified.description));
    sections.push('');

    // Root Cause
    sections.push(chalk.bold('Root Cause:'));
    sections.push(chalk.yellow(`  ${classified.rootCause}`));
    sections.push('');

    // Fix Steps
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

    // Related Documentation
    if (classified.relatedDocs.length > 0) {
      sections.push(chalk.bold('Related Documentation:'));
      classified.relatedDocs.forEach((doc) => {
        sections.push(chalk.cyan(`  • ${doc.title}: ${chalk.underline(doc.url)}`));
      });
      sections.push('');
    }

    // Related Commands
    if (classified.relatedCommands.length > 0) {
      sections.push(chalk.bold('Related Commands:'));
      classified.relatedCommands.forEach((cmd) => {
        sections.push(chalk.cyan(`  $ ${cmd}`));
      });
      sections.push('');
    }

    // Troubleshooting Tips
    if (classified.troubleshootingTips.length > 0) {
      sections.push(chalk.bold('Troubleshooting Tips:'));
      classified.troubleshootingTips.forEach((tip) => {
        sections.push(chalk.dim(`  • ${tip}`));
      });
      sections.push('');
    }

    // Get Help footer
    sections.push(chalk.dim('─'.repeat(60)));
    sections.push(chalk.dim('Need more help?'));
    sections.push(chalk.cyan('  $ memesh report-issue'));
    sections.push(chalk.dim('  https://github.com/PCIRCLE-AI/claude-code-buddy/issues'));

    return sections.join('\n');
  }

  /**
   * Detect error category from error message and context
   */
  private detectCategory(error: Error, context: Record<string, unknown>): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Configuration errors
    if (
      message.includes('config') ||
      message.includes('configuration') ||
      message.includes('not found') && context.configPath
    ) {
      return ErrorCategory.CONFIGURATION;
    }

    // Connection errors
    if (
      message.includes('connect') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('network')
    ) {
      return ErrorCategory.CONNECTION;
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('eacces') ||
      message.includes('forbidden') ||
      message.includes('unauthorized')
    ) {
      return ErrorCategory.PERMISSION;
    }

    // Resource errors
    if (
      message.includes('memory') ||
      message.includes('disk') ||
      message.includes('enospc') ||
      message.includes('limit exceeded')
    ) {
      return ErrorCategory.RESOURCE;
    }

    // Validation errors
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('schema') ||
      message.includes('required')
    ) {
      return ErrorCategory.VALIDATION;
    }

    // Integration errors
    if (
      message.includes('database') ||
      message.includes('api') ||
      message.includes('external') ||
      stack.includes('node_modules')
    ) {
      return ErrorCategory.INTEGRATION;
    }

    // Runtime errors (default for application errors)
    if (
      message.includes('error') ||
      message.includes('failed') ||
      message.includes('exception')
    ) {
      return ErrorCategory.RUNTIME;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Get detailed error information based on category
   */
  private getErrorDetails(
    error: Error,
    category: ErrorCategory,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    switch (category) {
      case ErrorCategory.CONFIGURATION:
        return this.getConfigurationErrorDetails(error, context);
      case ErrorCategory.CONNECTION:
        return this.getConnectionErrorDetails(error, context);
      case ErrorCategory.PERMISSION:
        return this.getPermissionErrorDetails(error, context);
      case ErrorCategory.RESOURCE:
        return this.getResourceErrorDetails(error, context);
      case ErrorCategory.VALIDATION:
        return this.getValidationErrorDetails(error, context);
      case ErrorCategory.INTEGRATION:
        return this.getIntegrationErrorDetails(error, context);
      case ErrorCategory.RUNTIME:
        return this.getRuntimeErrorDetails(error, context);
      default:
        return this.getUnknownErrorDetails(error, context);
    }
  }

  /**
   * Configuration error details
   */
  private getConfigurationErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'CONFIG_ERROR',
      severity: ErrorSeverity.CRITICAL,
      title: 'Configuration Error',
      description: 'MeMesh configuration is missing or invalid.',
      rootCause: 'The MCP server configuration is not set up correctly in Claude Code.',
      recoveryStrategy: RecoveryStrategy.MANUAL,
      fixSteps: [
        'Run interactive setup: memesh setup',
        'Verify configuration: memesh config validate',
        'Restart Claude Code',
        'Try again: buddy-help',
      ],
      autoFixAvailable: true,
      relatedDocs: [
        { title: 'Quick Start', url: 'https://memesh.pcircle.ai/quick-start' },
        { title: 'Manual Setup', url: 'https://memesh.pcircle.ai/manual-setup' },
      ],
      relatedCommands: ['memesh setup', 'memesh config validate'],
      troubleshootingTips: [
        'Check Claude Code is running',
        'Verify Node.js is in PATH',
        'Look for typos in config file',
      ],
    };
  }

  /**
   * Connection error details
   */
  private getConnectionErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'CONNECTION_ERROR',
      severity: ErrorSeverity.HIGH,
      title: 'MCP Server Connection Failed',
      description: 'Cannot connect to MeMesh MCP server.',
      rootCause: 'The MCP server is not running or not responding.',
      recoveryStrategy: RecoveryStrategy.RETRY,
      fixSteps: [
        'Restart Claude Code',
        'Wait 5-10 seconds for MCP server to start',
        'Check server logs for errors',
        'If problem persists, run: memesh setup',
      ],
      autoFixAvailable: false,
      relatedDocs: [
        { title: 'Troubleshooting MCP', url: 'https://memesh.pcircle.ai/troubleshoot/mcp' },
      ],
      relatedCommands: ['memesh config validate'],
      troubleshootingTips: [
        'Check Claude Code logs for MCP errors',
        'Verify network connectivity',
        'Try restarting your computer',
      ],
    };
  }

  /**
   * Permission error details
   */
  private getPermissionErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'PERMISSION_ERROR',
      severity: ErrorSeverity.MEDIUM,
      title: 'Permission Denied',
      description: 'MeMesh does not have permission to access required resources.',
      rootCause: 'File system permissions or security settings are blocking access.',
      recoveryStrategy: RecoveryStrategy.MANUAL,
      fixSteps: [
        'Check file permissions: ls -la <path>',
        'Grant read/write access if needed',
        'On macOS: Check System Preferences > Privacy',
        'Try running with elevated permissions',
      ],
      autoFixAvailable: false,
      relatedDocs: [
        { title: 'Permission Issues', url: 'https://memesh.pcircle.ai/troubleshoot/permissions' },
      ],
      relatedCommands: [],
      troubleshootingTips: [
        'Check if file/directory exists',
        'Verify user has correct permissions',
        'Look for security software blocking access',
      ],
    };
  }

  /**
   * Resource error details
   */
  private getResourceErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'RESOURCE_ERROR',
      severity: ErrorSeverity.HIGH,
      title: 'Resource Exhaustion',
      description: 'System resources (memory, disk, limits) have been exhausted.',
      rootCause: 'The operation exceeded available system resources.',
      recoveryStrategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
      fixSteps: [
        'Free up disk space or memory',
        'Close unnecessary applications',
        'Reduce task complexity',
        'Contact support if limits are too low',
      ],
      autoFixAvailable: false,
      relatedDocs: [
        { title: 'Resource Limits', url: 'https://memesh.pcircle.ai/limits' },
      ],
      relatedCommands: [],
      troubleshootingTips: [
        'Check disk space: df -h',
        'Check memory: top or htop',
        'Look for memory leaks',
      ],
    };
  }

  /**
   * Validation error details
   */
  private getValidationErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'VALIDATION_ERROR',
      severity: ErrorSeverity.MEDIUM,
      title: 'Invalid Input',
      description: 'The provided input does not meet validation requirements.',
      rootCause: error.message,
      recoveryStrategy: RecoveryStrategy.MANUAL,
      fixSteps: [
        'Check input format matches requirements',
        'Review command syntax: buddy-help',
        'Ensure all required fields are provided',
        'Try with simpler input first',
      ],
      autoFixAvailable: false,
      relatedDocs: [
        { title: 'Command Reference', url: 'https://memesh.pcircle.ai/commands' },
      ],
      relatedCommands: ['buddy-help', 'buddy-help --all'],
      troubleshootingTips: [
        'Use quotes for multi-word strings',
        'Check for special characters',
        'Verify input length limits',
      ],
    };
  }

  /**
   * Integration error details
   */
  private getIntegrationErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'INTEGRATION_ERROR',
      severity: ErrorSeverity.HIGH,
      title: 'External Integration Failed',
      description: 'Failed to connect to external service or dependency.',
      rootCause: 'Database, API, or external service is unavailable or returned an error.',
      recoveryStrategy: RecoveryStrategy.RETRY,
      fixSteps: [
        'Check external service status',
        'Verify API keys and credentials',
        'Check network connectivity',
        'Review service logs for details',
      ],
      autoFixAvailable: false,
      relatedDocs: [],
      relatedCommands: [],
      troubleshootingTips: [
        'Check service status page',
        'Verify API rate limits',
        'Test with simple request first',
      ],
    };
  }

  /**
   * Runtime error details
   */
  private getRuntimeErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'RUNTIME_ERROR',
      severity: ErrorSeverity.MEDIUM,
      title: 'Runtime Error',
      description: 'An unexpected error occurred during execution.',
      rootCause: error.message,
      recoveryStrategy: RecoveryStrategy.RETRY,
      fixSteps: [
        'Try the command again',
        'Simplify the task if possible',
        'Check for recent changes',
        'Report issue if error persists',
      ],
      autoFixAvailable: false,
      relatedDocs: [
        { title: 'Troubleshooting', url: 'https://memesh.pcircle.ai/troubleshoot' },
      ],
      relatedCommands: ['memesh report-issue'],
      troubleshootingTips: [
        'Check error stack trace for clues',
        'Look for similar past issues',
        'Enable debug logging if available',
      ],
    };
  }

  /**
   * Unknown error details
   */
  private getUnknownErrorDetails(
    error: Error,
    context: Record<string, unknown>
  ): Omit<ClassifiedError, 'category' | 'originalError' | 'context'> {
    return {
      code: 'UNKNOWN_ERROR',
      severity: ErrorSeverity.MEDIUM,
      title: 'Unexpected Error',
      description: 'An unexpected error occurred.',
      rootCause: error.message || 'Unknown cause',
      recoveryStrategy: RecoveryStrategy.ABORT,
      fixSteps: [
        'Report this error: memesh report-issue',
        'Include error message and steps to reproduce',
        'Check GitHub issues for similar reports',
      ],
      autoFixAvailable: false,
      relatedDocs: [],
      relatedCommands: ['memesh report-issue'],
      troubleshootingTips: [
        'Copy full error message',
        'Note what you were doing when error occurred',
        'Check if error is reproducible',
      ],
    };
  }

  /**
   * Get severity badge with color
   */
  private getSeverityBadge(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return chalk.red.bold('[CRITICAL]');
      case ErrorSeverity.HIGH:
        return chalk.red('[HIGH]');
      case ErrorSeverity.MEDIUM:
        return chalk.yellow('[MEDIUM]');
      case ErrorSeverity.LOW:
        return chalk.gray('[LOW]');
      default:
        return chalk.gray('[UNKNOWN]');
    }
  }
}

/**
 * Global error classifier instance
 */
export const errorClassifier = new ErrorClassifier();
