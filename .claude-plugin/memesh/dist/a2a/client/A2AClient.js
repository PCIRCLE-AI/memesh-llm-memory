import { AgentRegistry } from '../storage/AgentRegistry.js';
import { ErrorCodes, createError, getErrorMessage } from '../errors/index.js';
import { retryWithBackoff } from '../../utils/retry.js';
import { getTraceContext, injectTraceContext, } from '../../utils/tracing/index.js';
import { logger } from '../../utils/logger.js';
const RETRY_BOUNDS = {
    maxRetries: { min: 0, max: 10, default: 3 },
    baseDelay: { min: 100, max: 60_000, default: 1_000 },
    timeout: { min: 1_000, max: 300_000, default: 30_000 },
};
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
    isRetryableHttpError(error) {
        if (error && typeof error === 'object') {
            const httpError = error;
            if (httpError.status !== undefined) {
                const status = httpError.status;
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
                const response = await fetch(url, {
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
                const response = await fetch(url, {
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
                const response = await fetch(url, {
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
                const response = await fetch(url, {
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
                const response = await fetch(url, {
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
    async handleResponse(response) {
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
            catch {
            }
            throw createError(ErrorCodes.HTTP_ERROR, response.status, errorMessage);
        }
        const result = (await response.json());
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