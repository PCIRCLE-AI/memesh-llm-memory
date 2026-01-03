import { logger } from './logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
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
export function logError(error, context) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error in ${context.component}.${context.method}`, {
        message: errorObj.message,
        stack: sanitizeSensitiveData(errorObj.stack || ''),
        errorType: errorObj.constructor.name,
        context: {
            component: context.component,
            method: context.method,
            operation: context.operation,
            data: context.data ? sanitizeSensitiveData(JSON.stringify(context.data)) : undefined,
        },
    });
}
export function handleError(error, context, userMessage) {
    logError(error, context);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return {
        message: userMessage || errorObj.message,
        stack: sanitizeSensitiveData(errorObj.stack || ''),
        type: errorObj.constructor.name,
        context,
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
//# sourceMappingURL=errorHandler.js.map