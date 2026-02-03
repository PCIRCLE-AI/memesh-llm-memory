import { logger } from './logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
import chalk from 'chalk';
import boxen from 'boxen';
function sanitizeSensitiveData(text) {
    if (!text)
        return text;
    return text.split('\n').map(line => {
        if (looksLikeSensitive(line)) {
            return `[REDACTED:${hashValue(line)}]`;
        }
        return line;
    }).join('\n');
}
function safeStringifyWithLimit(data, maxLength = 2000) {
    try {
        const str = JSON.stringify(data);
        if (str.length > maxLength) {
            return str.substring(0, maxLength) + `... (truncated, ${str.length} total chars)`;
        }
        return str;
    }
    catch (error) {
        return `[Stringify failed: ${error instanceof Error ? error.message : String(error)}]`;
    }
}
function extractCauseChain(error, maxDepth = 10) {
    if (!(error instanceof Error) || !error.cause) {
        return undefined;
    }
    const chain = [];
    let current = error.cause;
    const seen = new WeakSet();
    while (current && chain.length < maxDepth) {
        if (typeof current === 'object' && current !== null) {
            if (seen.has(current)) {
                chain.push({ message: '[Circular cause reference]', type: 'CircularRef' });
                break;
            }
            seen.add(current);
        }
        if (current instanceof Error) {
            chain.push({
                message: current.message,
                type: current.constructor.name,
                stack: current.stack ? sanitizeSensitiveData(current.stack) : undefined,
            });
            current = current.cause;
        }
        else {
            chain.push({
                message: String(current),
                type: typeof current,
            });
            break;
        }
    }
    return chain.length > 0 ? chain : undefined;
}
export function logError(error, context) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const causeChain = extractCauseChain(errorObj);
    logger.error(`Error in ${context.component}.${context.method}`, {
        message: errorObj.message,
        stack: sanitizeSensitiveData(errorObj.stack || ''),
        errorType: errorObj.constructor.name,
        requestId: context.requestId,
        ...(causeChain && { causeChain }),
        context: {
            component: context.component,
            method: context.method,
            operation: context.operation,
            data: context.data ? sanitizeSensitiveData(safeStringifyWithLimit(context.data)) : undefined,
        },
    });
}
export function handleError(error, context, userMessage) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const causeChain = extractCauseChain(errorObj);
    logger.error(`Error in ${context.component}.${context.method}`, {
        message: errorObj.message,
        stack: sanitizeSensitiveData(errorObj.stack || ''),
        errorType: errorObj.constructor.name,
        requestId: context.requestId,
        ...(causeChain && { causeChain }),
        context: {
            component: context.component,
            method: context.method,
            operation: context.operation,
            data: context.data ? sanitizeSensitiveData(safeStringifyWithLimit(context.data)) : undefined,
        },
    });
    return {
        message: userMessage || errorObj.message,
        stack: sanitizeSensitiveData(errorObj.stack || ''),
        type: errorObj.constructor.name,
        context,
        ...(causeChain && { causeChain }),
    };
}
export function withErrorHandling(fn, context) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            logError(error, context);
            throw error;
        }
    };
}
export function formatMCPError(error, context) {
    const handled = handleError(error, context);
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    error: handled.message,
                    type: handled.type,
                    component: context.component,
                    method: context.method,
                    ...(process.env.NODE_ENV === 'development' && { stack: handled.stack }),
                }, null, 2),
            },
        ],
        isError: true,
    };
}
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function getErrorStack(error) {
    if (error instanceof Error && error.stack) {
        return sanitizeSensitiveData(error.stack);
    }
    return undefined;
}
const RECOVERY_SUGGESTIONS = [
    {
        pattern: /not a git repository/i,
        suggestion: 'Run `git init` to initialize a Git repository',
        category: 'GIT',
        example: {
            current: 'Not a Git repository',
            expected: 'Has .git folder',
            quickFix: [
                'cd ~/your-project',
                'git init',
            ],
        },
    },
    {
        pattern: /nothing to commit/i,
        suggestion: 'No changes detected. Make some changes to files first',
        category: 'GIT',
        example: {
            current: 'No staged changes',
            expected: 'Files added to staging area',
            quickFix: [
                'git status',
                'git add <file>',
                'git commit -m "message"',
            ],
        },
    },
    {
        pattern: /invalid reference/i,
        suggestion: 'Use `git log --oneline` to find a valid commit hash',
        category: 'GIT',
        example: {
            quickFix: [
                'git log --oneline',
                'git show <commit-hash>',
            ],
        },
    },
    {
        pattern: /permission denied/i,
        suggestion: 'Check file/directory permissions. You may need to change ownership or run with elevated privileges',
        category: 'FILESYSTEM',
        example: {
            quickFix: [
                'ls -la <file>',
                'chmod 755 <file>',
                'sudo chown $USER <file>',
            ],
        },
    },
    {
        pattern: /ENOENT|no such file/i,
        suggestion: 'Check that the file or directory path exists',
        category: 'FILESYSTEM',
        example: {
            current: 'Path does not exist',
            expected: 'Valid file or directory path',
            quickFix: [
                'ls -la <directory>',
                'mkdir -p <directory>',
            ],
        },
    },
    {
        pattern: /insufficient disk space/i,
        suggestion: 'Free up disk space by removing old backups or temporary files',
        category: 'FILESYSTEM',
        example: {
            quickFix: [
                'df -h',
                'du -sh *',
                'rm -rf /tmp/*',
            ],
        },
    },
    {
        pattern: /ECONNREFUSED|connection refused/i,
        suggestion: 'Check if the service is running and verify the host and port are correct',
        category: 'NETWORK',
        example: {
            current: 'Service not responding',
            expected: 'Service listening on port',
            quickFix: [
                'netstat -an | grep <port>',
                'curl http://localhost:<port>',
            ],
        },
    },
    {
        pattern: /ETIMEDOUT|timeout/i,
        suggestion: 'Check network connectivity. The service may be slow or unreachable',
        category: 'NETWORK',
        example: {
            quickFix: [
                'ping <host>',
                'curl -v <url>',
            ],
        },
    },
    {
        pattern: /ENOTFOUND|DNS/i,
        suggestion: 'Check that the hostname is correct and DNS is working properly',
        category: 'NETWORK',
        example: {
            quickFix: [
                'nslookup <hostname>',
                'ping <hostname>',
            ],
        },
    },
    {
        pattern: /validation.*failed|invalid.*input/i,
        suggestion: 'Check the input parameters. Make sure required fields are provided and have correct types',
        category: 'VALIDATION',
    },
    {
        pattern: /expected.*received/i,
        suggestion: 'Check the parameter type. Make sure you\'re passing the correct data type',
        category: 'VALIDATION',
    },
    {
        pattern: /unauthorized|authentication.*failed/i,
        suggestion: 'Check your credentials or API keys. They may be expired or incorrect',
        category: 'AUTH',
        example: {
            current: 'Invalid or expired credentials',
            expected: 'Valid API key or token',
            quickFix: [
                'echo $API_KEY',
                'export API_KEY=your-key-here',
            ],
        },
    },
    {
        pattern: /forbidden|access denied/i,
        suggestion: 'Check your permissions. You may not have access to this resource',
        category: 'AUTH',
    },
    {
        pattern: /SQLITE_BUSY|database.*locked/i,
        suggestion: 'Wait a moment and retry. Another process may be using the database',
        category: 'DATABASE',
        example: {
            current: 'Database locked',
            expected: 'Database accessible',
            quickFix: [
                'lsof <database-file>',
                'kill <process-id>',
            ],
        },
    },
    {
        pattern: /no such table/i,
        suggestion: 'The database may need to be initialized or migrated',
        category: 'DATABASE',
        example: {
            quickFix: [
                'npm run db:migrate',
                'npm run db:seed',
            ],
        },
    },
    {
        pattern: /out of memory|ENOMEM/i,
        suggestion: 'Close other applications or increase available memory',
        category: 'RESOURCE',
        example: {
            quickFix: [
                'free -h',
                'top',
            ],
        },
    },
    {
        pattern: /too many open files|EMFILE/i,
        suggestion: 'Close unused files or increase the file descriptor limit',
        category: 'RESOURCE',
        example: {
            quickFix: [
                'ulimit -n',
                'ulimit -n 4096',
            ],
        },
    },
    {
        pattern: /rate limit|too many requests/i,
        suggestion: 'Wait a few minutes before retrying. You\'ve hit the rate limit',
        category: 'API',
    },
    {
        pattern: /quota exceeded/i,
        suggestion: 'Check your usage quota. You may need to upgrade your plan or wait for reset',
        category: 'API',
    },
];
export function getCategoryBadge(category) {
    const badges = {
        GIT: chalk.bgYellow.black(' GIT '),
        FILESYSTEM: chalk.bgBlue.white(' FILESYSTEM '),
        NETWORK: chalk.bgMagenta.white(' NETWORK '),
        DATABASE: chalk.bgCyan.black(' DATABASE '),
        AUTH: chalk.bgRed.white(' AUTH '),
        VALIDATION: chalk.bgGreen.black(' VALIDATION '),
        RESOURCE: chalk.bgRed.white(' RESOURCE '),
        API: chalk.bgMagenta.white(' API '),
    };
    return badges[category];
}
export function formatSuggestionBlock(suggestion, example) {
    let content = suggestion;
    if (example) {
        if (example.current) {
            content += `\n\n${chalk.dim('Current:')} ${chalk.red(example.current)}`;
        }
        if (example.expected) {
            content += `\n${chalk.dim('Expected:')} ${chalk.green(example.expected)}`;
        }
        if (example.quickFix && example.quickFix.length > 0) {
            content += `\n\n${chalk.dim('Quick fix:')}`;
            example.quickFix.forEach(cmd => {
                content += `\n  ${chalk.cyan(cmd)}`;
            });
        }
    }
    return boxen(content, {
        title: '💡 Suggestion',
        titleAlignment: 'left',
        borderStyle: 'round',
        borderColor: 'yellow',
        padding: 1,
    });
}
export function getRecoverySuggestion(error) {
    const errorMessage = getErrorMessage(error);
    for (const { pattern, suggestion, category, example } of RECOVERY_SUGGESTIONS) {
        if (pattern.test(errorMessage)) {
            return { suggestion, category, example };
        }
    }
    return undefined;
}
export function formatErrorWithSuggestion(error, operation) {
    const errorMessage = getErrorMessage(error);
    const suggestionData = getRecoverySuggestion(error);
    let result = `❌ Failed to ${operation}`;
    if (suggestionData) {
        result += `\n   Category: ${getCategoryBadge(suggestionData.category)}`;
    }
    result += `\n   Error: ${chalk.red(errorMessage)}`;
    if (suggestionData) {
        result += `\n\n${formatSuggestionBlock(suggestionData.suggestion, suggestionData.example)}`;
    }
    return result;
}
//# sourceMappingURL=errorHandler.js.map