import { logger } from './logger.js';
export async function withErrorHandling(fn, context) {
    try {
        return await fn();
    }
    catch (error) {
        logger.error(`Error in ${context}`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
    }
}
export async function withErrorHandlingThrow(fn, context) {
    try {
        return await fn();
    }
    catch (error) {
        logger.error(`Error in ${context}`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}
//# sourceMappingURL=async-error-handler.js.map