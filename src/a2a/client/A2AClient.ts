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
  TaskResult,
} from '../types/index.js';
import { AgentRegistry } from '../storage/AgentRegistry.js';
import { ErrorCodes, createError, getErrorMessage } from '../errors/index.js';
import { retryWithBackoff, type RetryOptions } from '../../utils/retry.js';
import {
  getTraceContext,
  injectTraceContext,
} from '../../utils/tracing/index.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

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
 * Maximum response size to prevent DoS attacks (10MB)
 */
const MAX_RESPONSE_SIZE = 10_000_000;

/**
 * TaskResult schema for response validation
 *
 * Validates that responses from getTaskResult match expected structure
 * to prevent injection attacks and data corruption.
 */
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
   * Validate ID parameter (taskId or agentId)
   *
   * Security validation to prevent:
   * - Path traversal attacks (../, /, \)
   * - Excessive input size (DoS)
   * - Empty or invalid types
   *
   * @param id - The ID to validate
   * @param fieldName - Name of the field for error messages
   * @throws Error if validation fails
   */
  private validateId(id: string, fieldName: string): void {
    if (!id || typeof id !== 'string') {
      throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'must be non-empty string');
    }

    if (id.length > 255) {
      throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'exceeds maximum length of 255');
    }

    // Prevent path traversal patterns
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw createError(ErrorCodes.INVALID_PARAMETER, fieldName, 'contains invalid characters');
    }
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
   * Fetch with AbortController timeout
   *
   * Wraps fetch with an AbortController that aborts after the configured timeout.
   * This prevents individual fetch calls from hanging indefinitely if the server
   * never responds, even when retryWithBackoff has its own timeout logic.
   *
   * @param url - The URL to fetch
   * @param options - Standard fetch RequestInit options
   * @returns The fetch Response
   * @throws Error with REQUEST_TIMEOUT code if the request times out
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.retryConfig.timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      // Handle AbortError specifically and convert to REQUEST_TIMEOUT
      if (error instanceof Error && error.name === 'AbortError') {
        throw createError(ErrorCodes.REQUEST_TIMEOUT, url, this.retryConfig.timeout);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Determine if an HTTP error is retryable
   *
   * **Retry Strategy**:
   * - ✅ Retry on: 5xx server errors, 429 rate limit, network errors (ETIMEDOUT, ECONNREFUSED),
   *      REQUEST_TIMEOUT (AbortController timeout)
   * - ❌ Don't retry on: 4xx client errors, local validation errors (no status code)
   *
   * **Security Considerations**:
   * - Local validation errors (schema validation, missing agent) are NOT retried
   *   to prevent wasting resources on invalid requests
   * - Authentication errors (401, 403) are NOT retried to prevent brute force attempts
   * - Only transient errors (5xx, 429, network, timeout) are retried with exponential backoff
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
   * **Retryable timeout errors**:
   * - REQUEST_TIMEOUT (code check) - server didn't respond in time, worth retrying
   *
   * This prevents wasting 7-10s on errors that will never succeed on retry.
   *
   * @private
   */
  private isRetryableHttpError(error: unknown): boolean {
    // Check if it's an HTTP error with status code
    if (error && typeof error === 'object') {
      const errorObj = error as { status?: number; code?: string };

      // ✅ REQUEST_TIMEOUT is retryable (transient network issue)
      if (errorObj.code === ErrorCodes.REQUEST_TIMEOUT) {
        return true;
      }

      if (errorObj.status !== undefined) {
        const status = errorObj.status;
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

          const response = await this.fetchWithTimeout(url, {
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

          const response = await this.fetchWithTimeout(url, {
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

          const response = await this.fetchWithTimeout(url, {
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

          const response = await this.fetchWithTimeout(url, {
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

          const response = await this.fetchWithTimeout(url, {
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

  /**
   * Get task execution result
   *
   * Fetches the execution result of a completed task from the target agent.
   * This provides access to the actual output/return value of the task execution.
   *
   * Security features:
   * - ✅ Input validation to prevent path traversal
   * - ✅ Response size limits to prevent DoS
   * - ✅ Schema validation to prevent injection attacks
   *
   * @param targetAgentId - ID of the agent that executed the task
   * @param taskId - ID of the task to get result for
   * @returns Task execution result with success status and output
   * @throws Error if agent not found or request fails
   *
   * @example
   * ```typescript
   * const result = await client.getTaskResult('agent-2', 'task-123');
   * if (result.success) {
   *   console.log('Result:', result.result);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   */
  async getTaskResult(targetAgentId: string, taskId: string): Promise<TaskResult> {
    // ✅ FIX CRITICAL-2: Validate input parameters
    this.validateId(targetAgentId, 'targetAgentId');
    this.validateId(taskId, 'taskId');

    try {
      return await retryWithBackoff(
        async () => {
          const agent = this.registry.get(targetAgentId);
          if (!agent) {
            throw createError(ErrorCodes.AGENT_NOT_FOUND, targetAgentId);
          }

          const url = `${agent.baseUrl}/a2a/tasks/${encodeURIComponent(taskId)}/result`;

          const response = await this.fetchWithTimeout(url, {
            method: 'GET',
            headers: this.getAuthHeaders(),
          });

          // Get raw response and validate schema
          const rawResult = await this.handleResponse<unknown>(response);

          // ✅ FIX CRITICAL-3: Validate response schema
          const validatedResult = TaskResultSchema.parse(rawResult);
          return validatedResult as TaskResult;
        },
        {
          ...this.retryConfig,
          operationName: `A2A getTaskResult ${taskId} from ${targetAgentId}`,
          isRetryable: this.isRetryableHttpError.bind(this),
        }
      );
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        throw createError(ErrorCodes.INVALID_RESPONSE_SCHEMA, error.message);
      }
      throw createError(
        ErrorCodes.TASK_GET_FAILED,
        taskId,
        targetAgentId,
        getErrorMessage(error)
      );
    }
  }

  /**
   * Validate Content-Type header before parsing JSON
   *
   * Accepts 'application/json' and 'application/json; charset=utf-8'.
   * - Missing header: warn but allow (backwards compatibility)
   * - Wrong Content-Type: throw error with clear message
   *
   * @param response - The HTTP response to validate
   * @throws Error if Content-Type is present but not application/json
   */
  private validateContentType(response: Response): void {
    const contentType = response.headers.get('content-type');

    if (!contentType) {
      logger.warn('[A2AClient] Response missing Content-Type header', {
        status: response.status,
        url: response.url,
      });
      return; // Allow missing header for backwards compatibility
    }

    if (!contentType.includes('application/json')) {
      throw createError(ErrorCodes.INVALID_CONTENT_TYPE, contentType, response.status);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Validate Content-Type before attempting to parse JSON
    this.validateContentType(response);

    // ✅ FIX CRITICAL-1: Validate response size to prevent DoS
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw createError(ErrorCodes.RESPONSE_TOO_LARGE, contentLength);
    }

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

    // Read response as text to validate size (for streaming responses without content-length)
    // Use .clone() to allow multiple reads in case of error handling
    let result: ServiceResponse<T>;
    try {
      const text = await response.clone().text();
      if (text.length > MAX_RESPONSE_SIZE) {
        throw createError(ErrorCodes.RESPONSE_TOO_LARGE, text.length);
      }
      result = JSON.parse(text) as ServiceResponse<T>;
    } catch (error) {
      // If clone() fails or text() fails, fall back to direct json() call
      // This handles mock responses in tests that don't support .text()
      if (error && typeof error === 'object' && 'code' in error && error.code === ErrorCodes.RESPONSE_TOO_LARGE) {
        throw error;
      }
      result = (await response.json()) as ServiceResponse<T>;
    }

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
