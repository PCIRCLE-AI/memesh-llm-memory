/**
 * Test: Request Validation (MAJOR-1)
 *
 * Tests for sendMessage request validation to ensure:
 * 1. Valid requests pass validation
 * 2. Invalid message.parts are rejected
 * 3. Missing required fields are rejected
 * 4. Oversized input is rejected
 * 5. Each MessagePart type is validated correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { A2ARoutes } from '../routes.js';
import { TaskQueue } from '../../storage/TaskQueue.js';
import { validateSendMessageRequest } from '../validation/index.js';
import type { AgentCard } from '../../types/index.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Test fixtures
const TEST_AGENT_ID = 'test-agent-validation';
let testDbPath: string;
let taskQueue: TaskQueue;
let routes: A2ARoutes;

const mockAgentCard: AgentCard = {
  name: 'Test Agent',
  version: '1.0.0',
  description: 'Test agent for validation',
  skills: [],
};

// Mock Express request/response
function mockRequest(body: unknown): Request {
  return {
    body,
    params: {},
    query: {},
    header: vi.fn(),
    method: 'POST',
    path: '/a2a/sendMessage',
    ip: '127.0.0.1',
  } as unknown as Request;
}

function mockResponse(): Response & { jsonData?: unknown; statusCode?: number } {
  const res: Partial<Response> & { jsonData?: unknown; statusCode?: number } = {
    status: vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: unknown) => {
      res.jsonData = data;
      return res;
    }),
    setHeader: vi.fn(),
  };
  return res as Response & { jsonData?: unknown; statusCode?: number };
}

describe('Request Validation (MAJOR-1)', () => {
  beforeEach(() => {
    // Create temp directory for test database
    const tmpDir = os.tmpdir();
    testDbPath = path.join(tmpDir, `test-validation-${Date.now()}.db`);
    taskQueue = new TaskQueue(TEST_AGENT_ID, testDbPath);
    routes = new A2ARoutes(TEST_AGENT_ID, taskQueue, mockAgentCard);
  });

  afterEach(() => {
    taskQueue.close();
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also clean up WAL files
      if (fs.existsSync(`${testDbPath}-wal`)) {
        fs.unlinkSync(`${testDbPath}-wal`);
      }
      if (fs.existsSync(`${testDbPath}-shm`)) {
        fs.unlinkSync(`${testDbPath}-shm`);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validateSendMessageRequest', () => {
    it('should accept valid sendMessage request with text part', () => {
      const validRequest = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello, world!' }],
        },
      };

      const result = validateSendMessageRequest(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.message.parts[0]).toEqual({
        type: 'text',
        text: 'Hello, world!',
      });
    });

    it('should accept valid request with taskId', () => {
      const validRequest = {
        taskId: 'existing-task-id',
        message: {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Response text' }],
        },
      };

      const result = validateSendMessageRequest(validRequest);

      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('existing-task-id');
    });

    it('should reject request with missing message', () => {
      const invalidRequest = {};

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with missing message.parts', () => {
      const invalidRequest = {
        message: {
          role: 'user',
        },
      };

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with empty message.parts array', () => {
      const invalidRequest = {
        message: {
          role: 'user',
          parts: [],
        },
      };

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('at least one part');
    });

    it('should reject request with invalid role', () => {
      const invalidRequest = {
        message: {
          role: 'admin', // Invalid role
          parts: [{ type: 'text', text: 'test' }],
        },
      };

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject oversized text content', () => {
      const oversizedText = 'x'.repeat(102401); // > 100KB
      const invalidRequest = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: oversizedText }],
        },
      };

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('too long');
    });

    it('should reject too many message parts', () => {
      const tooManyParts = Array.from({ length: 101 }, (_, i) => ({
        type: 'text' as const,
        text: `Part ${i}`,
      }));

      const invalidRequest = {
        message: {
          role: 'user',
          parts: tooManyParts,
        },
      };

      const result = validateSendMessageRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Too many message parts');
    });
  });

  describe('MessagePart type validation', () => {
    describe('TextPart', () => {
      it('should accept valid text part', () => {
        const request = {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Valid text content' }],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should reject text part with empty text', () => {
        const request = {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: '' }],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('empty');
      });
    });

    describe('ImagePart', () => {
      it('should accept valid image part with URL source', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: 'https://example.com/image.png',
                },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should accept valid image part with base64 source', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  data: 'SGVsbG8gV29ybGQ=',
                  mimeType: 'image/png',
                },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should reject image part with invalid URL', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: 'not-a-valid-url',
                },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Invalid URL');
      });

      it('should reject image part with invalid base64', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  data: '!!!invalid-base64!!!',
                  mimeType: 'image/png',
                },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('base64');
      });

      it('should reject base64 image without mimeType', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  data: 'SGVsbG8gV29ybGQ=',
                  // Missing mimeType
                },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
      });
    });

    describe('ToolCallPart', () => {
      it('should accept valid tool call part', () => {
        const request = {
          message: {
            role: 'assistant',
            parts: [
              {
                type: 'tool_call',
                id: 'call-123',
                name: 'calculate_sum',
                input: { a: 1, b: 2 },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should reject tool call with empty id', () => {
        const request = {
          message: {
            role: 'assistant',
            parts: [
              {
                type: 'tool_call',
                id: '',
                name: 'calculate_sum',
                input: { a: 1 },
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
      });

      it('should reject tool call with invalid name format', () => {
        const request = {
          message: {
            role: 'assistant',
            parts: [
              {
                type: 'tool_call',
                id: 'call-123',
                name: '123-invalid-name', // Cannot start with number
                input: {},
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
      });
    });

    describe('ToolResultPart', () => {
      it('should accept valid tool result part with string content', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'tool_result',
                toolCallId: 'call-123',
                content: 'Result: 42',
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should accept valid tool result part with object content', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'tool_result',
                toolCallId: 'call-123',
                content: { result: 42, status: 'success' },
                isError: false,
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(true);
      });

      it('should reject tool result with empty toolCallId', () => {
        const request = {
          message: {
            role: 'user',
            parts: [
              {
                type: 'tool_result',
                toolCallId: '',
                content: 'result',
              },
            ],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid MessagePart type', () => {
      it('should reject unknown part type', () => {
        const request = {
          message: {
            role: 'user',
            parts: [{ type: 'unknown', data: 'test' }],
          },
        };

        const result = validateSendMessageRequest(request);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('A2ARoutes.sendMessage integration', () => {
    it('should pass valid request', async () => {
      const req = mockRequest({
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });
      const res = mockResponse();
      const next = vi.fn();

      await routes.sendMessage(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toMatchObject({
        success: true,
        data: {
          taskId: expect.any(String),
          status: 'SUBMITTED',
        },
      });
    });

    it('should reject request with missing message.parts', async () => {
      const req = mockRequest({
        message: {
          role: 'user',
          // Missing parts
        },
      });
      const res = mockResponse();
      const next = vi.fn();

      await routes.sendMessage(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should reject request with null message', async () => {
      const req = mockRequest({
        message: null,
      });
      const res = mockResponse();
      const next = vi.fn();

      await routes.sendMessage(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should handle errors gracefully and call next', async () => {
      // Close taskQueue to simulate error
      taskQueue.close();

      const req = mockRequest({
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test' }],
        },
      });
      const res = mockResponse();
      const next = vi.fn();

      await routes.sendMessage(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalled();
    });
  });
});
