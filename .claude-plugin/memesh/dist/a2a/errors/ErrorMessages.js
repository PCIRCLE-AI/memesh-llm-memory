import { ErrorCodes } from './ErrorCodes.js';
export const ErrorMessages = {
    [ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED]: 'MEMESH_A2A_TOKEN environment variable is not configured',
    [ErrorCodes.AUTH_FAILED]: 'Authentication failed - invalid A2A token',
    [ErrorCodes.AUTH_TOKEN_MISSING]: 'A2A authentication token is missing',
    [ErrorCodes.AGENT_NOT_FOUND]: (agentId) => `Agent not found: ${agentId}`,
    [ErrorCodes.AGENT_ALREADY_PROCESSING]: (phase = 'Phase 1.0') => `Agent already processing a task (${phase} limitation)`,
    [ErrorCodes.AGENT_REGISTRY_ERROR]: (error) => `Agent registry operation failed: ${error}`,
    [ErrorCodes.TASK_NOT_FOUND]: (taskId) => `Task not found: ${taskId}`,
    [ErrorCodes.TASK_TIMEOUT]: (taskId, timeoutSeconds) => `Task timeout detected: ${taskId} (timeout: ${timeoutSeconds}s)`,
    [ErrorCodes.TASK_SEND_FAILED]: (targetAgentId, error) => `Failed to send message to ${targetAgentId}: ${error}`,
    [ErrorCodes.TASK_GET_FAILED]: (taskId, targetAgentId, error) => `Failed to get task ${taskId} from ${targetAgentId}: ${error}`,
    [ErrorCodes.TASK_LIST_FAILED]: (targetAgentId, error) => `Failed to list tasks from ${targetAgentId}: ${error}`,
    [ErrorCodes.TASK_CANCEL_FAILED]: (taskId, targetAgentId, error) => `Failed to cancel task ${taskId} on ${targetAgentId}: ${error}`,
    [ErrorCodes.PORT_NOT_AVAILABLE]: (min, max) => `No available port in range ${min}-${max}`,
    [ErrorCodes.SERVER_ERROR]: (error) => `Server error: ${error}`,
    [ErrorCodes.INVALID_JSON]: (context, preview) => `Invalid JSON data in ${context}${preview ? `: ${preview}` : ''}`,
    [ErrorCodes.DATABASE_ERROR]: (operation, error) => `Database ${operation} failed: ${error}`,
    [ErrorCodes.TIMEOUT_CHECKER_ERROR]: (error) => `TimeoutChecker error: ${error}`,
    [ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN]: (failureCount, maxRetries) => `TimeoutChecker circuit breaker is open (${failureCount}/${maxRetries} consecutive failures). Service temporarily degraded.`,
    [ErrorCodes.HTTP_ERROR]: (status, message) => `HTTP error ${status}${message ? `: ${message}` : ''}`,
    [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred',
};
export function formatErrorMessage(code, ...args) {
    const template = ErrorMessages[code];
    if (typeof template === 'function') {
        return template(...args);
    }
    return template;
}
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function createError(code, ...args) {
    const message = formatErrorMessage(code, ...args);
    const error = new Error(message);
    error.code = code;
    if (code === 'HTTP_ERROR' && typeof args[0] === 'number') {
        error.status = args[0];
    }
    if (code === 'AUTH_FAILED') {
        error.status = 401;
    }
    return error;
}
//# sourceMappingURL=ErrorMessages.js.map