/**
 * MeMesh Cloud REST Client
 *
 * Thin adapter connecting the local MCP server to MeMesh Cloud.
 * Activated only when MEMESH_API_KEY is set. No API key = pure offline mode.
 *
 * API contracts aligned with memesh-cloud NestJS server (2026-02).
 * Auth: x-api-key header. Base URL default: https://memesh-backend.fly.dev
 */

import * as fs from 'fs';
import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../errors/index.js';
import { getCredentialsPath } from '../cli/credentials.js';

// -- Types (matching Cloud API contracts) ------------------------------------

/** Memory returned from Cloud search */
export interface CloudMemory {
  id: string;
  content: string;
  summary?: string;
  space: string;
  tags: string[];
  similarity?: number;
  createdAt: string;
}

/** Request body for POST /memory/write */
export interface CloudMemoryWriteRequest {
  content: string;
  space: string;
  summary?: string;
  tags?: string[];
  sensitivity?: 'normal' | 'sensitive' | 'critical';
  source?: string;
}

/** Response from GET /memory/search (array) */
export type CloudMemorySearchResult = CloudMemory[];

/** Request body for POST /memory/batch */
export interface CloudBatchWriteRequest {
  memories: CloudMemoryWriteRequest[];
  transactional?: boolean;
}

/** Response from POST /memory/batch */
export interface CloudBatchWriteResult {
  total: number;
  succeeded: number;
  failed: number;
  successes: Array<{ index: number; id: string; content: string; createdAt: string }>;
  failures: Array<{ index: number; content: string; errorCode: string; errorMessage: string }>;
  transactional: boolean;
}

/** Request body for POST /agents/register */
export interface CloudAgentRegisterRequest {
  agentType: string;
  agentName?: string;
  agentVersion?: string;
  capabilities?: Record<string, unknown>;
}

/** Response from POST /agents/register and GET /agents/me */
export interface CloudAgentInfo {
  id: string;
  agentType: string;
  agentName: string;
  agentVersion?: string;
  status: string;
  capabilities: Record<string, unknown>;
  createdAt: string;
  lastHeartbeat?: string;
  pendingMessages?: number;
}

/** Computed sync status (not a direct API response) */
export interface CloudSyncStatus {
  connected: boolean;
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
    // Priority: constructor arg > env var > credentials file
    this.apiKey = apiKey ?? process.env.MEMESH_API_KEY ?? '';
    let fileBaseUrl: string | undefined;

    // If no API key from args/env, try credentials file
    if (!this.apiKey) {
      try {
        const credPath = getCredentialsPath();
        if (fs.existsSync(credPath)) {
          const content = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
          if (content?.apiKey) {
            this.apiKey = content.apiKey;
          }
          // Also read stored baseUrl for credential-file-based auth
          if (content?.baseUrl) {
            fileBaseUrl = content.baseUrl;
          }
        }
      } catch {
        // Silently ignore - credentials file is optional fallback
      }
    }

    // Priority for baseUrl: constructor arg > env var > credentials file > default
    this.baseUrl = (baseUrl ?? process.env.MEMESH_BASE_URL ?? fileBaseUrl ?? 'https://memesh-backend.fly.dev').replace(/\/+$/, '');
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

  /** Verify API key is valid by fetching current agent info */
  async authenticate(): Promise<{ valid: boolean; agentId?: string; agentType?: string }> {
    if (!this.isConfigured) {
      return { valid: false };
    }

    try {
      const agent = await this.request<CloudAgentInfo>('GET', '/agents/me');
      return { valid: true, agentId: agent.id, agentType: agent.agentType };
    } catch (error) {
      logger.warn('Cloud authentication failed', { error: String(error) });
      return { valid: false };
    }
  }

  // -- Memory Operations ----------------------------------------------------

  /** Write a single memory to the cloud */
  async writeMemory(memory: CloudMemoryWriteRequest): Promise<string> {
    this.requireAuth();

    const response = await this.request<{ id: string }>('POST', '/memory/write', memory);
    return response.id;
  }

  /** Write multiple memories in a single batch request */
  async writeMemories(
    memories: CloudMemoryWriteRequest[],
    transactional = false
  ): Promise<CloudBatchWriteResult> {
    this.requireAuth();

    return this.request<CloudBatchWriteResult>('POST', '/memory/batch', {
      memories,
      transactional,
    });
  }

  /** Search cloud memories by query (semantic search via pgvector) */
  async searchMemory(
    query: string,
    options?: { limit?: number; spaces?: string[] }
  ): Promise<CloudMemorySearchResult> {
    this.requireAuth();

    const params = new URLSearchParams({ query });
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.spaces?.length) params.set('spaces', options.spaces.join(','));

    return this.request<CloudMemorySearchResult>('GET', `/memory/search?${params}`);
  }

  /** Get memory count and compute sync status */
  async getSyncStatus(localCount: number): Promise<CloudSyncStatus> {
    if (!this.isConfigured) {
      return { connected: false, localCount, cloudCount: 0 };
    }

    try {
      const response = await this.request<{ count: number }>('GET', '/memory/count');
      return {
        connected: true,
        localCount,
        cloudCount: response.count,
      };
    } catch {
      return { connected: false, localCount, cloudCount: 0 };
    }
  }

  // -- Agent Registration ---------------------------------------------------

  /** Register this agent with MeMesh Cloud */
  async registerAgent(agent: CloudAgentRegisterRequest): Promise<CloudAgentInfo> {
    this.requireAuth();

    const result = await this.request<CloudAgentInfo>('POST', '/agents/register', agent);
    logger.info('Agent registered with MeMesh Cloud', { agentId: result.id, agentType: result.agentType });
    return result;
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
        'x-api-key': this.apiKey,
        'User-Agent': 'memesh-local/1.0',
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        headers['Content-Type'] = 'application/json';
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
      const isTimeout = error instanceof Error && error.name === 'AbortError';

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
  if (process.env.MEMESH_API_KEY) return true;

  // Check credentials file
  try {
    const credPath = getCredentialsPath();
    if (fs.existsSync(credPath)) {
      const content = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      return !!content?.apiKey;
    }
  } catch {
    // ignore
  }

  return false;
}

/** Reset singleton instance (for testing only) */
export function resetCloudClient(): void {
  _instance = null;
}
