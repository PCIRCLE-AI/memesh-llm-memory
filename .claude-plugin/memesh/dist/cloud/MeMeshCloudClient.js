import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../errors/index.js';
export class MeMeshCloudClient {
    baseUrl;
    apiKey;
    timeoutMs;
    constructor(apiKey, baseUrl, timeoutMs) {
        this.apiKey = apiKey ?? process.env.MEMESH_API_KEY ?? '';
        this.baseUrl = (baseUrl ?? process.env.MEMESH_BASE_URL ?? 'https://memesh-backend.fly.dev').replace(/\/+$/, '');
        this.timeoutMs = timeoutMs ?? parseInt(process.env.MEMESH_TIMEOUT_MS ?? '10000', 10);
        if (!this.apiKey) {
            logger.debug('MeMeshCloudClient created without API key - cloud features disabled');
        }
    }
    get isConfigured() {
        return this.apiKey.length > 0;
    }
    async authenticate() {
        if (!this.isConfigured) {
            return { valid: false };
        }
        try {
            const agent = await this.request('GET', '/agents/me');
            return { valid: true, agentId: agent.id, agentType: agent.agentType };
        }
        catch (error) {
            logger.warn('Cloud authentication failed', { error: String(error) });
            return { valid: false };
        }
    }
    async writeMemory(memory) {
        this.requireAuth();
        const response = await this.request('POST', '/memory/write', memory);
        return response.id;
    }
    async writeMemories(memories, transactional = false) {
        this.requireAuth();
        return this.request('POST', '/memory/batch', {
            memories,
            transactional,
        });
    }
    async searchMemory(query, options) {
        this.requireAuth();
        const params = new URLSearchParams({ query });
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.spaces?.length)
            params.set('spaces', options.spaces.join(','));
        return this.request('GET', `/memory/search?${params}`);
    }
    async getSyncStatus(localCount) {
        if (!this.isConfigured) {
            return { connected: false, localCount, cloudCount: 0 };
        }
        try {
            const response = await this.request('GET', '/memory/count');
            return {
                connected: true,
                localCount,
                cloudCount: response.count,
            };
        }
        catch {
            return { connected: false, localCount, cloudCount: 0 };
        }
    }
    async registerAgent(agent) {
        this.requireAuth();
        const result = await this.request('POST', '/agents/register', agent);
        logger.info('Agent registered with MeMesh Cloud', { agentId: result.id, agentType: result.agentType });
        return result;
    }
    requireAuth() {
        if (!this.isConfigured) {
            throw new ExternalServiceError('MeMesh Cloud API key not configured', {
                service: 'memesh-cloud',
                solution: 'Set MEMESH_API_KEY environment variable',
            });
        }
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const headers = {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'memesh-local/1.0',
            };
            const options = {
                method,
                headers,
                signal: controller.signal,
            };
            if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                const rawBody = await response.text().catch(() => 'unknown error');
                const errorBody = rawBody.length > 200 ? rawBody.substring(0, 200) + '...' : rawBody;
                throw new ExternalServiceError(`MeMesh Cloud API error: ${response.status}`, {
                    service: 'memesh-cloud',
                    endpoint: path,
                    statusCode: response.status,
                    response: errorBody,
                });
            }
            if (response.status === 204) {
                return undefined;
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof ExternalServiceError)
                throw error;
            const message = error instanceof Error ? error.message : String(error);
            const isTimeout = message.includes('abort');
            throw new ExternalServiceError(isTimeout
                ? `MeMesh Cloud request timed out after ${this.timeoutMs}ms`
                : `MeMesh Cloud request failed: ${message}`, {
                service: 'memesh-cloud',
                endpoint: path,
                timeout: isTimeout,
            });
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
let _instance = null;
export function getCloudClient() {
    if (!_instance) {
        _instance = new MeMeshCloudClient();
    }
    return _instance;
}
export function isCloudEnabled() {
    return !!process.env.MEMESH_API_KEY;
}
export function resetCloudClient() {
    _instance = null;
}
//# sourceMappingURL=MeMeshCloudClient.js.map