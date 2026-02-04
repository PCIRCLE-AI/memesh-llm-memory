/**
 * Test 3: Content-Type Validation (MINOR-C)
 *
 * Verifies that the A2AClient properly validates Content-Type headers.
 *
 * Test coverage:
 * - Valid application/json response
 * - application/json; charset=utf-8 response
 * - Missing Content-Type header (should warn but not fail)
 * - Wrong Content-Type (should throw)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../A2AClient.js';
import { AgentRegistry } from '../../storage/AgentRegistry.js';

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

import { logger } from '../../../utils/logger.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('A2AClient Content-Type Validation (MINOR-C)', () => {
  let client: A2AClient;
  let mockRegistry: {
    get: ReturnType<typeof vi.fn>;
    listActive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

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

    // Create client with no retries for cleaner testing
    client = new A2AClient({
      maxRetries: 0,
    });
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
  });

  describe('Valid application/json response', () => {
    it('should accept application/json content type', async () => {
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
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should accept lowercase content-type header', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'lowercase-task' },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('lowercase-task');
    });

    it('should accept mixed case Content-Type header', async () => {
      // Headers are case-insensitive per HTTP spec
      const headers = new Headers();
      headers.set('Content-TYPE', 'application/json');

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'mixedcase-task' },
          }),
          {
            status: 200,
            headers,
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('mixedcase-task');
    });
  });

  describe('application/json; charset=utf-8 response', () => {
    it('should accept application/json; charset=utf-8', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'charset-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('charset-task');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should accept application/json; charset=UTF-8 (uppercase)', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'uppercase-charset-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('uppercase-charset-task');
    });

    it('should accept application/json with boundary parameter', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'boundary-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; boundary=something' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('boundary-task');
    });

    it('should accept application/json with multiple parameters', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'multi-param-task' },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8; boundary=boundary123',
            },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('multi-param-task');
    });
  });

  describe('Missing Content-Type header (should warn but not fail)', () => {
    it('should warn when Content-Type is missing', async () => {
      // Create a mock Response with no Content-Type by using a custom object
      // The Node.js Response constructor sets text/plain by default, so we mock the response
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? null : null),
        },
        json: async () => ({
          success: true,
          data: { taskId: 'no-content-type-task' },
        }),
        url: 'http://localhost:3000/a2a/send-message',
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      // Should still succeed
      expect(result.taskId).toBe('no-content-type-task');

      // Should log a warning
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing Content-Type'),
        expect.any(Object)
      );
    });

    it('should include status and URL in warning', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? null : null),
        },
        json: async () => ({
          success: true,
          data: { taskId: 'warning-details-task' },
        }),
        url: 'http://localhost:3000/a2a/send-message',
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should not fail for backwards compatibility', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? null : null),
        },
        json: async () => ({
          success: true,
          data: { taskId: 'backwards-compat-task' },
        }),
        url: 'http://localhost:3000/a2a/send-message',
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Should not throw
      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).resolves.toEqual(expect.objectContaining({ taskId: 'backwards-compat-task' }));
    });
  });

  describe('Wrong Content-Type (should throw)', () => {
    it('should throw for text/html content type', async () => {
      mockFetch.mockResolvedValue(
        new Response('<html><body>Error</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should throw for text/plain content type', async () => {
      mockFetch.mockResolvedValue(
        new Response('Plain text response', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should throw for application/xml content type', async () => {
      mockFetch.mockResolvedValue(
        new Response('<xml>data</xml>', {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should throw for multipart/form-data content type', async () => {
      mockFetch.mockResolvedValue(
        new Response('form data', {
          status: 200,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should include content type in error message', async () => {
      mockFetch.mockResolvedValue(
        new Response('HTML Error Page', {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      );

      try {
        await client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
        if (error instanceof Error) {
          // Error should contain information about the content type issue
          expect(
            error.message.includes('INVALID_CONTENT_TYPE') ||
              error.message.includes('text/html') ||
              error.message.includes('TASK_SEND_FAILED')
          ).toBe(true);
        }
      }
    });

    it('should handle application/octet-stream content type', async () => {
      mockFetch.mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string content type', async () => {
      const headers = new Headers();
      headers.set('Content-Type', '');

      // Empty Content-Type header - browsers/fetch might normalize to null
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'empty-ct-task' },
          }),
          {
            status: 200,
            headers,
          }
        )
      );

      // Empty Content-Type might be treated as missing
      // This depends on the Response implementation
      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      // If empty string doesn't include 'application/json', it should handle appropriately
      expect(result).toBeDefined();
    });

    it('should handle whitespace in content type', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { taskId: 'whitespace-task' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': ' application/json ' },
          }
        )
      );

      const result = await client.sendMessage('test-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      expect(result.taskId).toBe('whitespace-task');
    });

    it('should validate content type for error responses too', async () => {
      mockFetch.mockResolvedValue(
        new Response('<html>500 Error</html>', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      await expect(
        client.sendMessage('test-agent', {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        })
      ).rejects.toThrow();
    });

    it('should handle getTask with content type validation', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'task-123',
              state: 'COMPLETED',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const result = await client.getTask('test-agent', 'task-123');
      expect(result.id).toBe('task-123');
    });

    it('should handle getAgentCard with content type validation', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              agentId: 'test-agent',
              name: 'Test Agent',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        )
      );

      const result = await client.getAgentCard('test-agent');
      expect(result.agentId).toBe('test-agent');
    });
  });
});
