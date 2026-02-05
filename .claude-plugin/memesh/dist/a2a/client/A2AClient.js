import { AgentRegistry } from '../storage/AgentRegistry.js';
import { ErrorCodes, createError, getErrorMessage } from '../errors/index.js';
import { retryWithBackoff } from '../../utils/retry.js';
import { getTraceContext, injectTraceContext, } from '../../utils/tracing/index.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';
const RETRY_BOUNDS = {
    maxRetries: { min: 0, max: 10, default: 3 },
    baseDelay: { min: 100, max: 60_000, default: 1_000 },
    timeout: { min: 1_000, max: 300_000, default: 30_000 },
};
const MAX_RESPONSE_SIZE = 10_000_000;
const TaskResultSchema = z.object({
    taskId: z.string().max(255),
    state: z.enum(['COMPLETED', 'FAILED', 'TIMEOUT']),
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().max(10_000).optional(),
    executedAt: z.string().datetime(),
    executedBy: z.string().max(255),
    durationMs: z.number().min(0).max(86_400_000).optional(),
});
function clampRetryValue(raw, name, bounds) {
    if (Number.isNaN(raw)) {
        logger.warn(`[A2AClient] Invalid (NaN) env var for ${name}, using default ${bounds.default}`);
        return bounds.default;
    }
    if (raw < bounds.min) {
        logger.warn(`[A2AClient] ${name} value ${raw} is below minimum ${bounds.min}, clamping to ${bounds.min}`);
        return bounds.min;
    }
    if (raw > bounds.max) {
        logger.warn(`[A2AClient] ${name} value ${raw} exceeds maximum ${bounds.max}, clamping to ${bounds.max}`);
        return bounds.max;
    }
    return raw;
}
export class A2AClient {
    registry;
    retryConfig;
    constructor(retryConfig) {
        this.registry = AgentRegistry.getInstance();
        const envMaxRetries = clampRetryValue(parseInt(process.env.A2A_RETRY_MAX_ATTEMPTS || String(RETRY_BOUNDS.maxRetries.default), 10), 'maxRetries', RETRY_BOUNDS.maxRetries);
        const envBaseDelay = clampRetryValue(parseInt(process.env.A2A_RETRY_INITIAL_DELAY_MS || String(RETRY_BOUNDS.baseDelay.default), 10), 'baseDelay', RETRY_BOUNDS.baseDelay);
        const envTimeout = clampRetryValue(parseInt(process.env.A2A_RETRY_TIMEOUT_MS || String(RETRY_BOUNDS.timeout.default), 10), 'timeout', RETRY_BOUNDS.timeout);
        this.retryConfig = {
            maxRetries: envMaxRetries,
            baseDelay: envBaseDelay,
            enableJitter: true,
            retryableStatusCodes: [429, 500, 502, 503, 504],
            timeout: envTimeout,
            ...retryConfig,
        };
    }
    validateId(id, fieldName) {
        if (!id || typeof id !== 'string') {
            throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'must be non-empty string');
        }
        if (id.length > 255) {
            throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'exceeds maximum length of 255');
        }
        if (id.includes('..') || id.includes('/') || id.includes('\\')) {
            throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'contains invalid characters');
        }
    }
    getAuthHeaders() {
        const token = process.env.MEMESH_A2A_TOKEN;
        if (!token) {
            throw createError(ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED);
        }
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
        const traceContext = getTraceContext();
        if (traceContext) {
            headers = injectTraceContext(headers, traceContext);
        }
        return headers;
    }
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        let completed = false;
        const timeoutId = setTimeout(() => {
            if (!completed) {
                controller.abort();
            }
        }, this.retryConfig.timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            completed = true;
            return response;
        }
        catch (error) {
            completed = true;
            if (error instanceof Error && error.name === 'AbortError') {
                throw createError(ErrorCodes.REQUEST_TIMEOUT, url, this.retryConfig.timeout);
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    isRetryableHttpError(error) {
        if (error && typeof error === 'object') {
            const errorObj = error;
            if (errorObj.code === ErrorCodes.REQUEST_TIMEOUT) {
                return true;
            }
            if (errorObj.status !== undefined) {
                const status = errorObj.status;
                if (status === 401 || status === 403) {
                    return false;
                }
                if (status >= 400 && status < 500 && status !== 429) {
                    return false;
                }
                return true;
            }
        }
        return false;
    }
    async sendMessage(targetAgentId, request) {
        try {
            return await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const url = `${agent.baseUrl}/a2a/send-message`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(request),
                });
                return await this.handleResponse(response);
            }, {
                ...this.retryConfig,
                operationName: `A2A sendMessage to ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.TASK_SEND_FAILED, targetAgentId, getErrorMessage(error));
        }
    }
    async getTask(targetAgentId, taskId) {
        try {
            return await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                });
                return await this.handleResponse(response);
            }, {
                ...this.retryConfig,
                operationName: `A2A getTask ${taskId} from ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.TASK_GET_FAILED, taskId, targetAgentId, getErrorMessage(error));
        }
    }
    async listTasks(targetAgentId, params) {
        try {
            return await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const queryParams = new URLSearchParams();
                if (params?.status)
                    queryParams.set('status', params.status);
                if (params?.limit !== undefined)
                    queryParams.set('limit', params.limit.toString());
                if (params?.offset !== undefined)
                    queryParams.set('offset', params.offset.toString());
                const url = `${agent.baseUrl}/a2a/tasks?${queryParams.toString()}`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                });
                return await this.handleResponse(response);
            }, {
                ...this.retryConfig,
                operationName: `A2A listTasks from ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.TASK_LIST_FAILED, targetAgentId, getErrorMessage(error));
        }
    }
    async getAgentCard(targetAgentId) {
        try {
            return await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const url = `${agent.baseUrl}/a2a/agent-card`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                });
                return await this.handleResponse(response);
            }, {
                ...this.retryConfig,
                operationName: `A2A getAgentCard from ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.AGENT_REGISTRY_ERROR, getErrorMessage(error));
        }
    }
    async cancelTask(targetAgentId, taskId) {
        try {
            await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}/cancel`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                });
                return await this.handleResponse(response);
            }, {
                ...this.retryConfig,
                operationName: `A2A cancelTask ${taskId} on ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.TASK_CANCEL_FAILED, taskId, targetAgentId, getErrorMessage(error));
        }
    }
    async getTaskResult(targetAgentId, taskId) {
        this.validateId(targetAgentId, 'targetAgentId');
        this.validateId(taskId, 'taskId');
        try {
            return await retryWithBackoff(async () => {
                const agent = this.registry.get(targetAgentId);
                if (!agent) {
                    throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
                }
                const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}/result`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                });
                const rawResult = await this.handleResponse(response);
                const validatedResult = TaskResultSchema.parse(rawResult);
                return validatedResult;
            }, {
                ...this.retryConfig,
                operationName: `A2A getTaskResult ${taskId} from ${targetAgentId}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw createError(ErrorCodes.INVALID_RESPONSE_SCHEMA, error.message);
            }
            throw createError(ErrorCodes.TASK_GET_FAILED, taskId, targetAgentId, getErrorMessage(error));
        }
    }
    async updateTaskState(taskId, state, data) {
        try {
            return await retryWithBackoff(async () => {
                const url = `${process.env.MEMESH_BASE_URL || 'http://localhost:3000'}/a2a/tasks/${encodeURIComponent(taskId)}/state`;
                const response = await this.fetchWithTimeout(url, {
                    method: 'PATCH',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        state,
                        ...data,
                    }),
                });
                if (!response.ok) {
                    let errorMessage;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message;
                    }
                    catch (jsonError) {
                        if (process.env.NODE_ENV !== 'test') {
                            console.warn(`[A2AClient] Failed to parse error response as JSON for task ${taskId}:`, jsonError instanceof Error ? jsonError.message : String(jsonError));
                        }
                    }
                    throw createError(ErrorCodes.HTTP_ERROR, response.status, errorMessage);
                }
            }, {
                ...this.retryConfig,
                operationName: `A2A updateTaskState ${taskId} to ${state}`,
                isRetryable: this.isRetryableHttpError.bind(this),
            });
        }
        catch (error) {
            throw createError(ErrorCodes.TASK_UPDATE_FAILED, taskId, state, getErrorMessage(error));
        }
    }
    validateContentType(response) {
        const contentType = response.headers.get('content-type');
        if (!contentType) {
            logger.warn('[A2AClient] Response missing Content-Type header', {
                status: response.status,
                url: response.url,
            });
            return;
        }
        if (!contentType.includes('application/json')) {
            throw createError(ErrorCodes.INVALID_CONTENT_TYPE, contentType, response.status);
        }
    }
    async handleResponse(response) {
        this.validateContentType(response);
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
            throw createError(ErrorCodes.RESPONSE_TOO_LARGE, contentLength);
        }
        if (!response.ok) {
            if (response.status === 401) {
                throw createError(ErrorCodes.AUTH_FAILED);
            }
            let errorMessage;
            try {
                const errorData = (await response.json());
                if (errorData.error) {
                    errorMessage = errorData.error.message;
                }
            }
            catch (jsonError) {
                if (process.env.NODE_ENV !== 'test') {
                    console.warn(`[A2AClient] Failed to parse error response as JSON (HTTP ${response.status}):`, jsonError instanceof Error ? jsonError.message : String(jsonError));
                }
            }
            throw createError(ErrorCodes.HTTP_ERROR, response.status, errorMessage);
        }
        let result;
        try {
            const text = await response.clone().text();
            if (text.length > MAX_RESPONSE_SIZE) {
                throw createError(ErrorCodes.RESPONSE_TOO_LARGE, text.length);
            }
            result = JSON.parse(text);
        }
        catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === ErrorCodes.RESPONSE_TOO_LARGE) {
                throw error;
            }
            result = (await response.json());
        }
        if (!result.success || !result.data) {
            const error = result.error || { code: 'UNKNOWN', message: 'Unknown error' };
            throw new Error(`[${error.code}] ${error.message}`);
        }
        return result.data;
    }
    listAvailableAgents() {
        return this.registry.listActive().map((agent) => agent.agentId);
    }
}
//# sourceMappingURL=A2AClient.js.map