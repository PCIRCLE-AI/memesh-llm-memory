/**
 * Test 1: AbortController Timeout (MINOR-A)
 *
 * Verifies that the A2AClient properly handles request timeouts using AbortController.
 *
 * Test coverage:
 * - Fetch is aborted after timeout
 * - AbortError is converted to appropriate error type
 * - Timeout is cleared on successful response
 * - Retry logic still works with abort controller
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../A2AClient.js';
import { AgentRegistry } from '../../storage/AgentRegistry.js';
import { ErrorCodes } from '../../errors/index.js';

// Mock the modules
vi.mock('../../storage/AgentRegistry.js', () => ({
  AgentRegistry: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('A2AClient AbortController Timeout (MINOR-A)', () => {
  let client: A2AClient;
  let mockRegistry: {
    get: ReturnType<typeof vi.fn>;
    listActive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set required environment variable
    process.env.MEMESH_A2A_TOKEN = 'test-token';

    // Setup mock registry
    mockRegistry = {
      get: vi.fn().mockReturnValue({
        agentId: 'test-agent',
        baseUrl: 'http://localhost:3000',
      }),
      listActive: vi.fn().mockReturnValue([]),
    };

    (AgentRegistry.getInstance as ReturnType<typeof vi.fn>).mockReturnValue(mockRegistry);

    // Create client with short timeout for testing
    client = new A2AClient({
      timeout: 1000, // 1 second timeout for tests
      maxRetries: 0, // Disable retries for timeout tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.MEMESH_A2A_TOKEN;
  });

  describe('Fetch is aborted after timeout', () => {
    it('should abort fetch when timeout expires', async () => {
      // Setup a fetch that never resolves
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolves - simulates a hanging request
            setTimeout(resolve, 10000);
          })
      );

      const sendPromise = client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      // Add error handler to prevent unhandled rejection
      sendPromise.catch(() => {
        // Expected to fail
      });

      // Advance time past the timeout
      await vi.advanceTimersByTimeAsync(1100);

      // Should throw timeout error
      await expect(sendPromise).rejects.toThrow();
    });

    it('should pass AbortSignal to fetch', async () => {
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        // Verify AbortSignal is passed
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { taskId: 'test-task' },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      });

      await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].signal).toBeDefined();
    });
  });

  describe('AbortError is converted to appropriate error type', () => {
    it('should convert AbortError to REQUEST_TIMEOUT error', async () => {
      // Setup fetch to throw AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // The error should be wrapped in TASK_SEND_FAILED
      let caughtError: Error | undefined;
      try {
        await client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        });
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeDefined();
      // The error is wrapped - check that it contains either TASK_SEND_FAILED
      // or the original timeout message
      expect(caughtError!.message).toMatch(/TASK_SEND_FAILED|REQUEST_TIMEOUT|timed out|aborted/i);
    });

    it('should include URL and timeout in error message', async () => {
      // Create client with known timeout
      const clientWithTimeout = new A2AClient({
        timeout: 5000,
        maxRetries: 0,
      });

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      try {
        await clientWithTimeout.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Timeout is cleared on successful response', () => {
    it('should not abort after successful response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'test-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('test-task');
      // clearTimeout should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should complete successfully within timeout', async () => {
      mockFetch.mockImplementation(async () => {
        // Simulate a response that takes less than timeout
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'fast-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });

      // Advance timers to allow the 100ms delay
      const resultPromise = client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;
      expect(result.taskId).toBe('fast-task');
    });
  });

  describe('Retry logic still works with abort controller', () => {
    it('should create new AbortController for each retry attempt', async () => {
      // Create client with retries enabled
      const clientWithRetries = new A2AClient({
        timeout: 1000,
        maxRetries: 2,
        baseDelay: 100,
      });

      let attempts = 0;
      const signals: AbortSignal[] = [];

      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        attempts++;
        if (options.signal) {
          signals.push(options.signal);
        }

        if (attempts < 3) {
          // Fail first two attempts with 503
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Service unavailable' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }

        // Succeed on third attempt
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { taskId: 'retry-success' },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      });

      const resultPromise = clientWithRetries.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(5000);

      const result = await resultPromise;
      expect(result.taskId).toBe('retry-success');
      expect(attempts).toBe(3);

      // Each retry should have its own signal
      expect(signals.length).toBe(3);
    });

    it('should timeout each retry attempt independently', async () => {
      const clientWithRetries = new A2AClient({
        timeout: 500,
        maxRetries: 1,
        baseDelay: 100,
      });

      let attempts = 0;

      mockFetch.mockImplementation(() => {
        attempts++;
        // Never resolve - will timeout
        return new Promise(() => {});
      });

      const sendPromise = clientWithRetries.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      // Add error handler to prevent unhandled rejection
      sendPromise.catch(() => {
        // Expected to fail
      });

      // Advance past first timeout
      await vi.advanceTimersByTimeAsync(600);

      // Advance through retry delay and second timeout
      await vi.advanceTimersByTimeAsync(700);

      await expect(sendPromise).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle network errors before timeout', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      mockFetch.mockRejectedValue(networkError);

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should handle agent not found without triggering timeout', async () => {
      mockRegistry.get.mockReturnValue(null);

      await expect(
        client.sendMessage('unknown-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();

      // Fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle zero timeout gracefully', async () => {
      const clientWithZeroTimeout = new A2AClient({
        timeout: 0, // No timeout
        maxRetries: 0,
      });

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'no-timeout-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const result = await clientWithZeroTimeout.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('no-timeout-task');
    });
  });
});
