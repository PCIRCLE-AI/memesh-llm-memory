/**
 * A2A HTTP Client
 *
 * Client for making HTTP requests to other A2A agents.
 * Provides type-safe methods for all A2A Protocol operations.
 *
 * Features:
 * - Automatic agent discovery via registry
 * - Bearer token authentication
 * - Error handling with proper status codes
 * - Type-safe request/response handling
 *
 * @module a2a/client
 */

import type {
  SendMessageRequest,
  SendMessageResponse,
  ServiceResponse,
  Task,
  TaskStatus,
  AgentCard,
} from '../types/index.js';
import { AgentRegistry } from '../storage/AgentRegistry.js';
import { ErrorCodes, createError, getErrorMessage } from '../errors/index.js';
import { retryWithBackoff, type RetryOptions } from '../../utils/retry.js';
import {
  getTraceContext,
  injectTraceContext,
  createTraceContext,
} from '../../utils/tracing/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Retry configuration bounds
 *
 * Defense-in-depth: Ensures env var parsing produces sane values.
 * Out-of-bounds values are clamped and a warning is logged.
 */
const RETRY_BOUNDS = {
  maxRetries: { min: 0, max: 10, default: 3 },
  baseDelay: { min: 100, max: 60_000, default: 1_000 },
  timeout: { min: 1_000, max: 300_000, default: 30_000 },
} as const;

/**
 * Validate and clamp a retry config value to safe bounds.
 *
 * Handles NaN (from failed parseInt) by falling back to the default.
 * Handles out-of-bounds values by clamping and logging a warning.
 *
 * @param raw - Raw parsed value (may be NaN)
 * @param name - Parameter name for logging
 * @param bounds - Min, max, and default for this parameter
 * @returns A valid number within bounds
 */
function clampRetryValue(
  raw: number,
  name: string,
  bounds: { min: number; max: number; default: number }
): number {
  if (Number.isNaN(raw)) {
    logger.warn(`[A2AClient] Invalid (NaN) env var for ${name}, using default ${bounds.default}`);
    return bounds.default;
  }

  if (raw < bounds.min) {
    logger.warn(
      `[A2AClient] ${name} value ${raw} is below minimum ${bounds.min}, clamping to ${bounds.min}`
    );
    return bounds.min;
  }

  if (raw > bounds.max) {
    logger.warn(
      `[A2AClient] ${name} value ${raw} exceeds maximum ${bounds.max}, clamping to ${bounds.max}`
    );
    return bounds.max;
  }

  return raw;
}

/**
 * A2AClient class
 *
 * HTTP client for communicating with other A2A agents.
 * Automatically discovers agents via the registry and handles authentication.
 *
 * @example
 * ```typescript
 * const client = new A2AClient();
 *
 * // Send message to another agent
 * const response = await client.sendMessage('agent-2', {
 *   message: {
 *     role: 'user',
 *     parts: [{ type: 'text', text: 'Calculate 2+2' }]
 *   }
 * });
 *
 * // Get task result
 * const task = await client.getTask('agent-2', response.taskId);
 * console.log(task.state); // COMPLETED, PENDING, etc.
 *
 * // List available agents
 * const agents = client.listAvailableAgents();
 * ```
 */
export class A2AClient {
  private registry: AgentRegistry;
  private retryConfig: RetryOptions;

  /**
   * Create a new A2A Client
   *
   * Requires MEMESH_A2A_TOKEN environment variable to be set for authentication.
   *
   * @param retryConfig - Optional retry configuration (defaults from environment variables)
   */
  constructor(retryConfig?: Partial<RetryOptions>) {
    this.registry = AgentRegistry.getInstance();

    // Parse env vars and validate/clamp to safe bounds
    const envMaxRetries = clampRetryValue(
      parseInt(process.env.A2A_RETRY_MAX_ATTEMPTS || String(RETRY_BOUNDS.maxRetries.default), 10),
      'maxRetries',
      RETRY_BOUNDS.maxRetries
    );
    const envBaseDelay = clampRetryValue(
      parseInt(process.env.A2A_RETRY_INITIAL_DELAY_MS || String(RETRY_BOUNDS.baseDelay.default), 10),
      'baseDelay',
      RETRY_BOUNDS.baseDelay
    );
    const envTimeout = clampRetryValue(
      parseInt(process.env.A2A_RETRY_TIMEOUT_MS || String(RETRY_BOUNDS.timeout.default), 10),
      'timeout',
      RETRY_BOUNDS.timeout
    );

    // Build config from validated env defaults, then let explicit config override.
    // Explicit retryConfig values are NOT re-validated because the caller is trusted
    // programmatic code (not untrusted external input).
    this.retryConfig = {
      maxRetries: envMaxRetries,
      baseDelay: envBaseDelay,
      enableJitter: true,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      timeout: envTimeout,
      ...retryConfig,
    };
  }

  /**
   * Get authentication headers with Bearer token and trace context
   * @throws Error if MEMESH_A2A_TOKEN is not configured
   */
  private getAuthHeaders(): Record<string, string> {
    const token = process.env.MEMESH_A2A_TOKEN;
    if (!token) {
      throw createError(ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED);
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Inject trace context if available
    const traceContext = getTraceContext();
    if (traceContext) {
      headers = injectTraceContext(headers, traceContext);
    }

    return headers;
  }

  /**
   * Determine if an HTTP error is retryable
   *
   * **Retry Strategy**:
   * - ✅ Retry on: 5xx server errors, 429 rate limit, network errors (ETIMEDOUT, ECONNREFUSED)
   * - ❌ Don't retry on: 4xx client errors, local validation errors (no status code)
   *
   * **Security Considerations**:
   * - Local validation errors (schema validation, missing agent) are NOT retried
   *   to prevent wasting resources on invalid requests
   * - Authentication errors (401, 403) are NOT retried to prevent brute force attempts
   * - Only transient errors (5xx, 429, network) are retried with exponential backoff
   *
   * **Performance**:
   * - Not retrying validation errors saves 7-10s per invalid request
   * - Exponential backoff with jitter prevents thundering herd
   * - Typical retry sequence: 1s → 2s → 4s (max 3 attempts)
   *
   * **Local errors are NOT retryable**:
   * - AGENT_NOT_FOUND (no HTTP status) - agent doesn't exist, retry won't help
   * - Zod validation errors (no HTTP status) - invalid request schema, retry won't fix
   * - createError() without status (no HTTP status) - local logic error
   *
   * This prevents wasting 7-10s on errors that will never succeed on retry.
   *
   * @private
   */
  private isRetryableHttpError(error: unknown): boolean {
    // Check if it's an HTTP error with status code
    if (error && typeof error === 'object') {
      const httpError = error as { status?: number };
      if (httpError.status !== undefined) {
        const status = httpError.status;
        // Don't retry authentication errors (401, 403)
        if (status === 401 || status === 403) {
          return false;
        }
        // Don't retry other 4xx errors (except 429 rate limit)
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        // Retry on 5xx server errors and 429 rate limit
        return true;
      }
    }
    // ❌ No HTTP status = local error (AGENT_NOT_FOUND, validation errors)
    // These should NOT be retried as they will never succeed
    return false;
  }

  async sendMessage(
    targetAgentId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      return await retryWithBackoff(
        async () => {
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

          return await this.handleResponse<SendMessageResponse>(response);
        },
        {
          ...this.retryConfig,
          operationName: `A2A sendMessage to ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      throw createError(ErrorCodes.TASK_SEND_FAILED, targetAgentId, getErrorMessage(error));
    }
  }

  async getTask(targetAgentId: string, taskId: string): Promise<Task> {
    try {
      return await retryWithBackoff(
        async () => {
          const agent = this.registry.get(targetAgentId);
          if (!agent) {
            throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
          }

          // ✅ FIX MINOR-2: URI-encode taskId to handle special characters
          const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
          });

          return await this.handleResponse<Task>(response);
        },
        {
          ...this.retryConfig,
          operationName: `A2A getTask ${taskId} from ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      throw createError(
        ErrorCodes.TASK_GET_FAILED,
        taskId,
        targetAgentId,
        getErrorMessage(error)
      );
    }
  }

  async listTasks(
    targetAgentId: string,
    params?: { status?: string; limit?: number; offset?: number }
  ): Promise<TaskStatus[]> {
    try {
      return await retryWithBackoff(
        async () => {
          const agent = this.registry.get(targetAgentId);
          if (!agent) {
            throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
          }

          const queryParams = new URLSearchParams();
          if (params?.status) queryParams.set('status', params.status);
          // ✅ FIX MAJOR-1: Use !== undefined to allow limit=0 and offset=0
          if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
          if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());

          const url = `${agent.baseUrl}/a2a/tasks?${queryParams.toString()}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
          });

          return await this.handleResponse<TaskStatus[]>(response);
        },
        {
          ...this.retryConfig,
          operationName: `A2A listTasks from ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      throw createError(ErrorCodes.TASK_LIST_FAILED, targetAgentId, getErrorMessage(error));
    }
  }

  async getAgentCard(targetAgentId: string): Promise<AgentCard> {
    try {
      return await retryWithBackoff(
        async () => {
          const agent = this.registry.get(targetAgentId);
          if (!agent) {
            throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
          }

          const url = `${agent.baseUrl}/a2a/agent-card`;

          const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
          });

          return await this.handleResponse<AgentCard>(response);
        },
        {
          ...this.retryConfig,
          operationName: `A2A getAgentCard from ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      throw createError(ErrorCodes.AGENT_REGISTRY_ERROR, getErrorMessage(error));
    }
  }

  async cancelTask(targetAgentId: string, taskId: string): Promise<void> {
    try {
      await retryWithBackoff(
        async () => {
          const agent = this.registry.get(targetAgentId);
          if (!agent) {
            throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
          }

          // ✅ FIX MINOR-2: URI-encode taskId to handle special characters
          const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}/cancel`;

          const response = await fetch(url, {
            method: 'POST',
            headers: this.getAuthHeaders(),
          });

          return await this.handleResponse<{ taskId: string; status: string }>(response);
        },
        {
          ...this.retryConfig,
          operationName: `A2A cancelTask ${taskId} on ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      throw createError(
        ErrorCodes.TASK_CANCEL_FAILED,
        taskId,
        targetAgentId,
        getErrorMessage(error)
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        throw createError(ErrorCodes.AUTH_FAILED);
      }

      let errorMessage: string | undefined;
      try {
        const errorData = (await response.json()) as ServiceResponse<T>;
        if (errorData.error) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignore JSON parsing error
      }
      throw createError(ErrorCodes.HTTP_ERROR, response.status, errorMessage);
    }

    const result = (await response.json()) as ServiceResponse<T>;

    if (!result.success || !result.data) {
      const error = result.error || { code: 'UNKNOWN', message: 'Unknown error' };
      throw new Error(`[${error.code}] ${error.message}`);
    }

    return result.data;
  }

  listAvailableAgents(): string[] {
    return this.registry.listActive().map((agent) => agent.agentId);
  }
}
