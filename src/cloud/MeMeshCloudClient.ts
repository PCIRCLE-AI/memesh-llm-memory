/**
 * MeMesh Cloud REST Client
 *
 * Thin adapter connecting the local MCP server to MeMesh Cloud (api.memesh.ai).
 * Activated only when MEMESH_API_KEY is set. No API key = pure offline mode.
 *
 * Provides: memory sync, agent registration, and authentication.
 */

import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../errors/index.js';

// -- Types ------------------------------------------------------------------

export interface CloudMemory {
  id: string;
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  contentHash?: string;
}

export interface CloudMemoryWriteRequest {
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  contentHash?: string;
}

export interface CloudMemorySearchResult {
  memories: CloudMemory[];
  total: number;
  hasMore: boolean;
}

export interface CloudAgentInfo {
  agentId: string;
  name: string;
  platform: string;
  specialization?: string;
  capabilities?: string[];
}

export interface CloudSyncStatus {
  connected: boolean;
  lastSync?: string;
  localCount: number;
  cloudCount: number;
}

// -- Client -----------------------------------------------------------------

export class MeMeshCloudClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    apiKey?: string,
    baseUrl?: string,
    timeoutMs?: number
  ) {
    // Read from env directly to avoid circular import with appConfig
    this.apiKey = apiKey ?? process.env.MEMESH_API_KEY ?? '';
    this.baseUrl = (baseUrl ?? process.env.MEMESH_BASE_URL ?? 'https://api.memesh.ai').replace(/\/+$/, '');
    this.timeoutMs = timeoutMs ?? parseInt(process.env.MEMESH_TIMEOUT_MS ?? '10000', 10);

    if (!this.apiKey) {
      logger.debug('MeMeshCloudClient created without API key - cloud features disabled');
    }
  }

  /** Check if client has valid credentials */
  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  // -- Authentication -------------------------------------------------------

  /** Verify API key is valid and get account info */
  async authenticate(): Promise<{ valid: boolean; userId?: string; plan?: string }> {
    if (!this.isConfigured) {
      return { valid: false };
    }

    try {
      const response = await this.request<{ userId: string; plan: string }>('GET', '/v1/auth/me');
      return { valid: true, userId: response.userId, plan: response.plan };
    } catch (error) {
      logger.warn('Cloud authentication failed', { error: String(error) });
      return { valid: false };
    }
  }

  // -- Memory Operations ----------------------------------------------------

  /** Write a memory to the cloud */
  async writeMemory(memory: CloudMemoryWriteRequest): Promise<string> {
    this.requireAuth();

    const response = await this.request<{ id: string }>('POST', '/v1/memories', memory);
    return response.id;
  }

  /** Write multiple memories in a single batch request */
  async writeMemories(memories: CloudMemoryWriteRequest[]): Promise<{ ids: string[]; errors: string[] }> {
    this.requireAuth();

    return this.request<{ ids: string[]; errors: string[] }>('POST', '/v1/memories/batch', {
      memories,
    });
  }

  /** Search cloud memories by query */
  async searchMemory(
    query: string,
    options?: { limit?: number; offset?: number; tags?: string[] }
  ): Promise<CloudMemorySearchResult> {
    this.requireAuth();

    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.tags?.length) params.set('tags', options.tags.join(','));

    return this.request<CloudMemorySearchResult>('GET', `/v1/memories/search?${params}`);
  }

  /** Get sync status: compare local and cloud memory counts */
  async getSyncStatus(localCount: number): Promise<CloudSyncStatus> {
    if (!this.isConfigured) {
      return { connected: false, localCount, cloudCount: 0 };
    }

    try {
      const response = await this.request<{ count: number; lastSync?: string }>(
        'GET',
        '/v1/memories/stats'
      );
      return {
        connected: true,
        lastSync: response.lastSync,
        localCount,
        cloudCount: response.count,
      };
    } catch {
      return { connected: false, localCount, cloudCount: 0 };
    }
  }

  // -- Agent Registration ---------------------------------------------------

  /** Register this agent with MeMesh Cloud */
  async registerAgent(agent: CloudAgentInfo): Promise<void> {
    this.requireAuth();

    await this.request('POST', '/v1/agents/register', agent);
    logger.info('Agent registered with MeMesh Cloud', { agentId: agent.agentId });
  }

  // -- HTTP Layer -----------------------------------------------------------

  private requireAuth(): void {
    if (!this.isConfigured) {
      throw new ExternalServiceError('MeMesh Cloud API key not configured', {
        service: 'memesh-cloud',
        solution: 'Set MEMESH_API_KEY environment variable',
      });
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'memesh-local/1.0',
      };

      const options: RequestInit = {
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
        // Truncate error body to prevent leaking sensitive data in logs
        const errorBody = rawBody.length > 200 ? rawBody.substring(0, 200) + '...' : rawBody;
        throw new ExternalServiceError(`MeMesh Cloud API error: ${response.status}`, {
          service: 'memesh-cloud',
          endpoint: path,
          statusCode: response.status,
          response: errorBody,
        });
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;

      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = message.includes('abort');

      throw new ExternalServiceError(
        isTimeout
          ? `MeMesh Cloud request timed out after ${this.timeoutMs}ms`
          : `MeMesh Cloud request failed: ${message}`,
        {
          service: 'memesh-cloud',
          endpoint: path,
          timeout: isTimeout,
        }
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

// -- Singleton access -------------------------------------------------------

let _instance: MeMeshCloudClient | null = null;

/** Get the shared MeMeshCloudClient instance (lazy-initialized) */
export function getCloudClient(): MeMeshCloudClient {
  if (!_instance) {
    _instance = new MeMeshCloudClient();
  }
  return _instance;
}

/** Check if Cloud integration is enabled without creating an instance */
export function isCloudEnabled(): boolean {
  return !!process.env.MEMESH_API_KEY;
}

/** Reset singleton instance (for testing only) */
export function resetCloudClient(): void {
  _instance = null;
}
