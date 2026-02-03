import { logger } from './logger.js';
const DEFAULT_RETRYABLE_STATUS_CODES = [429, 503];
function isRetryableError(error, retryableStatusCodes, customCheck) {
    if (customCheck && customCheck(error)) {
        return true;
    }
    if (error && typeof error === 'object') {
        if ('status' in error && typeof error.status === 'number') {
            return retryableStatusCodes.includes(error.status);
        }
        if ('response' in error && error.response && typeof error.response === 'object') {
            const response = error.response;
            if (response.status && retryableStatusCodes.includes(response.status)) {
                return true;
            }
        }
    }
    if (error instanceof Error) {
        const networkErrorCodes = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ENETUNREACH',
            'EAI_AGAIN',
        ];
        const errorObj = error;
        if (typeof errorObj.code === 'string' && networkErrorCodes.includes(errorObj.code)) {
            if (errorObj.syscall || errorObj.errno !== undefined) {
                return true;
            }
            logger.warn('[Retry] Suspicious error code without syscall/errno', {
                code: errorObj.code,
                hasMessage: !!errorObj.message,
                errorType: typeof error,
            });
        }
        if (networkErrorCodes.some(code => error.message.includes(code))) {
            return true;
        }
        if (error.name === 'FetchError' || error.name === 'NetworkError') {
            return true;
        }
        if (error.message && error.message.includes('timed out after')) {
            return true;
        }
    }
    return false;
}
function calculateDelay(attempt, baseDelay, enableJitter) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    if (!enableJitter) {
        return exponentialDelay;
    }
    const jitterRange = exponentialDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.round(exponentialDelay + jitter);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function withTimeout(operation, timeoutMs, operationName) {
    if (timeoutMs <= 0) {
        return operation();
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);
    try {
        const result = await Promise.race([
            operation(),
            new Promise((_, reject) => {
                controller.signal.addEventListener('abort', () => {
                    reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
                });
            }),
        ]);
        clearTimeout(timeoutId);
        return result;
    }
    catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return String(error);
}
export async function retryWithBackoff(operation, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, enableJitter = true, retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES, isRetryable: customIsRetryable, operationName = 'API operation', timeout = 30000, } = options;
    let lastError;
    let totalDelay = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            logger.debug(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} for ${operationName}`);
            const result = await withTimeout(operation, timeout, operationName);
            if (attempt > 0) {
                logger.info(`[Retry] ✅ ${operationName} succeeded on attempt ${attempt + 1} after ${totalDelay}ms delay`, {
                    operation: operationName,
                    attempts: attempt + 1,
                    totalDelay,
                });
            }
            return result;
        }
        catch (error) {
            lastError = error;
            const shouldRetry = isRetryableError(error, retryableStatusCodes, customIsRetryable);
            if (!shouldRetry) {
                logger.warn(`[Retry] ❌ ${operationName} failed with non-retryable error`, {
                    operation: operationName,
                    error: getErrorMessage(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    attempt: attempt + 1,
                });
                throw error;
            }
            if (attempt >= maxRetries) {
                logger.error(`[Retry] ❌ ${operationName} failed after ${maxRetries + 1} attempts`, {
                    operation: operationName,
                    attempts: maxRetries + 1,
                    totalDelay,
                    error: getErrorMessage(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
                throw lastError;
            }
            const delay = calculateDelay(attempt, baseDelay, enableJitter);
            totalDelay += delay;
            logger.warn(`[Retry] ⚠️  ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
                operation: operationName,
                attempt: attempt + 1,
                delay,
                totalDelay,
                error: getErrorMessage(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            await sleep(delay);
        }
    }
    throw lastError;
}
export async function retryWithBackoffDetailed(operation, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, enableJitter = true, retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES, isRetryable: customIsRetryable, operationName = 'API operation', timeout = 30000, } = options;
    let lastError;
    let totalDelay = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            logger.debug(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} for ${operationName}`);
            const result = await withTimeout(operation, timeout, operationName);
            if (attempt > 0) {
                logger.info(`[Retry] ✅ ${operationName} succeeded on attempt ${attempt + 1} after ${totalDelay}ms delay`, {
                    operation: operationName,
                    attempts: attempt + 1,
                    totalDelay,
                });
            }
            return {
                success: true,
                result,
                attempts: attempt + 1,
                totalDelay,
            };
        }
        catch (error) {
            lastError = error;
            const shouldRetry = isRetryableError(error, retryableStatusCodes, customIsRetryable);
            if (!shouldRetry) {
                logger.warn(`[Retry] ❌ ${operationName} failed with non-retryable error`, {
                    operation: operationName,
                    error: getErrorMessage(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    attempt: attempt + 1,
                });
                return {
                    success: false,
                    error: error instanceof Error ? error : new Error(String(error)),
                    attempts: attempt + 1,
                    totalDelay,
                };
            }
            if (attempt >= maxRetries) {
                logger.error(`[Retry] ❌ ${operationName} failed after ${maxRetries + 1} attempts`, {
                    operation: operationName,
                    attempts: maxRetries + 1,
                    totalDelay,
                    error: getErrorMessage(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
                return {
                    success: false,
                    error: lastError instanceof Error ? lastError : new Error(String(lastError)),
                    attempts: maxRetries + 1,
                    totalDelay,
                };
            }
            const delay = calculateDelay(attempt, baseDelay, enableJitter);
            totalDelay += delay;
            logger.warn(`[Retry] ⚠️  ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
                operation: operationName,
                attempt: attempt + 1,
                delay,
                totalDelay,
                error: getErrorMessage(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            await sleep(delay);
        }
    }
    return {
        success: false,
        error: lastError instanceof Error ? lastError : new Error(String(lastError)),
        attempts: maxRetries + 1,
        totalDelay,
    };
}
export function createRetryable(fn, options = {}) {
    return (...args) => retryWithBackoff(() => fn(...args), options);
}
//# sourceMappingURL=retry.js.map