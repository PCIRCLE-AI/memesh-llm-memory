import chalk from 'chalk';
import { icons } from '../ui/theme.js';
export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["CONFIGURATION"] = "configuration";
    ErrorCategory["CONNECTION"] = "connection";
    ErrorCategory["RUNTIME"] = "runtime";
    ErrorCategory["INTEGRATION"] = "integration";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["PERMISSION"] = "permission";
    ErrorCategory["RESOURCE"] = "resource";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory || (ErrorCategory = {}));
export var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["CRITICAL"] = "critical";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["LOW"] = "low";
})(ErrorSeverity || (ErrorSeverity = {}));
export var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["RETRY"] = "retry";
    RecoveryStrategy["FALLBACK"] = "fallback";
    RecoveryStrategy["MANUAL"] = "manual";
    RecoveryStrategy["AUTO_FIX"] = "auto_fix";
    RecoveryStrategy["GRACEFUL_DEGRADATION"] = "graceful";
    RecoveryStrategy["ABORT"] = "abort";
})(RecoveryStrategy || (RecoveryStrategy = {}));
export class ErrorClassifier {
    classify(error, context = {}) {
        if (!error) {
            error = new Error('Unknown error occurred');
        }
        if (!error.message || error.message.trim() === '') {
            error = new Error('An error occurred with no message');
        }
        const category = this.detectCategory(error, context);
        const errorDetails = this.getErrorDetails(error, category, context);
        return {
            ...errorDetails,
            category,
            originalError: error,
            context,
        };
    }
    format(classified) {
        const sections = [];
        sections.push(`${chalk.red(icons.error || '❌')} ${chalk.bold.red(classified.title)}`);
        sections.push('');
        const severityBadge = this.getSeverityBadge(classified.severity);
        sections.push(`${severityBadge} ${chalk.bold(classified.category.toUpperCase())}`);
        sections.push('');
        sections.push(chalk.white(classified.description));
        sections.push('');
        sections.push(chalk.bold('Root Cause:'));
        sections.push(chalk.yellow(`  ${classified.rootCause}`));
        sections.push('');
        if (classified.fixSteps.length > 0) {
            sections.push(chalk.bold('Fix Steps:'));
            classified.fixSteps.forEach((step, i) => {
                sections.push(chalk.white(`  ${i + 1}. ${step}`));
            });
            sections.push('');
        }
        if (classified.autoFixAvailable) {
            sections.push(chalk.cyan(`${icons.lightbulb || '💡'} Auto-fix available!`));
            sections.push(chalk.dim('  Run: buddy-fix --auto'));
            sections.push('');
        }
        if (classified.relatedDocs.length > 0) {
            sections.push(chalk.bold('Related Documentation:'));
            classified.relatedDocs.forEach((doc) => {
                sections.push(chalk.cyan(`  • ${doc.title}: ${chalk.underline(doc.url)}`));
            });
            sections.push('');
        }
        if (classified.relatedCommands.length > 0) {
            sections.push(chalk.bold('Related Commands:'));
            classified.relatedCommands.forEach((cmd) => {
                sections.push(chalk.cyan(`  $ ${cmd}`));
            });
            sections.push('');
        }
        if (classified.troubleshootingTips.length > 0) {
            sections.push(chalk.bold('Troubleshooting Tips:'));
            classified.troubleshootingTips.forEach((tip) => {
                sections.push(chalk.dim(`  • ${tip}`));
            });
            sections.push('');
        }
        sections.push(chalk.dim('─'.repeat(60)));
        sections.push(chalk.dim('Need more help?'));
        sections.push(chalk.cyan('  $ memesh report-issue'));
        sections.push(chalk.dim('  https://github.com/PCIRCLE-AI/claude-code-buddy/issues'));
        return sections.join('\n');
    }
    detectCategory(error, context) {
        const message = error.message.toLowerCase();
        const stack = error.stack?.toLowerCase() || '';
        if (message.includes('config') ||
            message.includes('configuration') ||
            message.includes('not configured') ||
            message.includes('environment variable') ||
            message.includes('memesh_') ||
            (message.includes('not found') && context.configPath)) {
            return ErrorCategory.CONFIGURATION;
        }
        if (message.includes('connect') ||
            message.includes('timeout') ||
            message.includes('too long') ||
            message.includes('econnrefused') ||
            message.includes('network')) {
            return ErrorCategory.CONNECTION;
        }
        if (message.includes('permission') ||
            message.includes('eacces') ||
            message.includes('forbidden') ||
            message.includes('unauthorized') ||
            message.includes('invalid token') ||
            message.includes('expired token') ||
            message.includes('invalid or expired')) {
            return ErrorCategory.PERMISSION;
        }
        if (message.includes('memory') ||
            message.includes('disk') ||
            message.includes('enospc') ||
            message.includes('limit exceeded')) {
            return ErrorCategory.RESOURCE;
        }
        if (message.includes('invalid') ||
            message.includes('validation') ||
            message.includes('schema') ||
            message.includes('required') ||
            message.includes('must be one of')) {
            return ErrorCategory.VALIDATION;
        }
        if (message.includes('database') ||
            message.includes('api') ||
            message.includes('external') ||
            stack.includes('node_modules')) {
            return ErrorCategory.INTEGRATION;
        }
        if (message.includes('error') ||
            message.includes('failed') ||
            message.includes('exception')) {
            return ErrorCategory.RUNTIME;
        }
        return ErrorCategory.UNKNOWN;
    }
    getErrorDetails(error, category, context) {
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
    getConfigurationErrorDetails(error, context) {
        const message = error.message.toLowerCase();
        if (message.includes('memesh_a2a_token') || message.includes('a2a token')) {
            return {
                code: 'A2A_TOKEN_MISSING',
                severity: ErrorSeverity.CRITICAL,
                title: 'Configuration Missing',
                description: 'MEMESH_A2A_TOKEN environment variable is not configured.',
                rootCause: 'A2A operations require a valid MeMesh token for agent communication.',
                recoveryStrategy: RecoveryStrategy.MANUAL,
                fixSteps: [
                    'Get your token from memesh.dev/settings',
                    'Add to .env file: MEMESH_A2A_TOKEN=your_token_here',
                    'Restart the MCP server',
                    'Try the command again',
                ],
                autoFixAvailable: false,
                relatedDocs: [
                    { title: 'A2A Setup Guide', url: 'docs/A2A_SETUP_GUIDE.md' },
                    { title: 'MeMesh Settings', url: 'https://memesh.dev/settings' },
                ],
                relatedCommands: ['buddy-help a2a'],
                troubleshootingTips: [
                    'Verify token is valid and not expired',
                    'Check .env file exists in project root',
                    'Ensure no trailing spaces in token value',
                ],
            };
        }
        return {
            code: 'CONFIG_ERROR',
            severity: ErrorSeverity.CRITICAL,
            title: 'Configuration Error',
            description: 'MeMesh configuration is missing or invalid.',
            rootCause: error.message || 'The MCP server configuration is not set up correctly.',
            recoveryStrategy: RecoveryStrategy.MANUAL,
            fixSteps: [
                'Check .env file for missing variables',
                'Verify configuration file syntax',
                'Restart the MCP server',
                'Try again: buddy-help',
            ],
            autoFixAvailable: false,
            relatedDocs: [
                { title: 'Setup Guide', url: 'docs/guides/SETUP.md' },
            ],
            relatedCommands: ['buddy-help'],
            troubleshootingTips: [
                'Check Claude Code is running',
                'Verify Node.js is in PATH',
                'Look for typos in config file',
            ],
        };
    }
    getConnectionErrorDetails(error, context) {
        const message = error.message.toLowerCase();
        if (message.includes('timeout') || message.includes('too long')) {
            return {
                code: 'TIMEOUT_ERROR',
                severity: ErrorSeverity.MEDIUM,
                title: 'Request Timeout',
                description: 'The operation took too long to complete.',
                rootCause: error.message || 'Request exceeded the maximum allowed time.',
                recoveryStrategy: RecoveryStrategy.RETRY,
                fixSteps: [
                    'Wait a moment and try again',
                    'Check network connectivity',
                    'Simplify the request if possible',
                    'Contact support if timeouts persist',
                ],
                autoFixAvailable: false,
                relatedDocs: [],
                relatedCommands: [],
                troubleshootingTips: [
                    'Try a simpler query first',
                    'Check if server is under heavy load',
                    'Verify internet connection is stable',
                ],
            };
        }
        return {
            code: 'CONNECTION_ERROR',
            severity: ErrorSeverity.HIGH,
            title: 'MCP Server Connection Failed',
            description: 'Cannot connect to MeMesh MCP server.',
            rootCause: error.message || 'The MCP server is not running or not responding.',
            recoveryStrategy: RecoveryStrategy.RETRY,
            fixSteps: [
                'Restart Claude Code',
                'Wait 5-10 seconds for MCP server to start',
                'Check server logs for errors',
                'Try the command again',
            ],
            autoFixAvailable: false,
            relatedDocs: [
                { title: 'Troubleshooting', url: 'docs/guides/TROUBLESHOOTING.md' },
            ],
            relatedCommands: ['buddy-help'],
            troubleshootingTips: [
                'Check Claude Code logs for MCP errors',
                'Verify network connectivity',
                'Try restarting your computer',
            ],
        };
    }
    getPermissionErrorDetails(error, context) {
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
    getResourceErrorDetails(error, context) {
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
    getValidationErrorDetails(error, context) {
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
    getIntegrationErrorDetails(error, context) {
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
    getRuntimeErrorDetails(error, context) {
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
    getUnknownErrorDetails(error, context) {
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
    getSeverityBadge(severity) {
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
export const errorClassifier = new ErrorClassifier();
//# sourceMappingURL=ErrorClassifier.js.map