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

    // Configure retry settings from environment with sensible defaults
    this.retryConfig = {
      maxRetries: parseInt(process.env.A2A_RETRY_MAX_ATTEMPTS || '3', 10),
      baseDelay: parseInt(process.env.A2A_RETRY_INITIAL_DELAY_MS || '1000', 10),
      enableJitter: true,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      timeout: parseInt(process.env.A2A_RETRY_TIMEOUT_MS || '30000', 10),
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
   * **Local errors are NOT retryable**:
   * - AGENT_NOT_FOUND (no HTTP status)
   * - Zod validation errors (no HTTP status)
   * - createError() without status (no HTTP status)
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

          const url = `${agent.baseUrl}/a2a/tasks/${taskId}`;

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
          if (params?.limit) queryParams.set('limit', params.limit.toString());
          if (params?.offset) queryParams.set('offset', params.offset.toString());

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

          const url = `${agent.baseUrl}/a2a/tasks/${taskId}/cancel`;

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
