/**
 * ToolRouter Test Suite
 *
 * Comprehensive tests for MCP tool routing logic.
 * Tests cover:
 * - Tool name routing/dispatching
 * - Input validation
 * - Rate limiting
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRouter, type ToolRouterConfig } from '../ToolRouter.js';
import type { RateLimiter } from '../../utils/RateLimiter.js';
import type { ToolHandlers } from '../handlers/ToolHandlers.js';
import type { BuddyHandlers } from '../handlers/BuddyHandlers.js';
import { ValidationError, NotFoundError, OperationError } from '../../errors/index.js';

describe('ToolRouter', () => {
  let mockRateLimiter: RateLimiter;
  let mockToolHandlers: ToolHandlers;
  let mockBuddyHandlers: BuddyHandlers;
  let toolRouter: ToolRouter;

  beforeEach(() => {
    mockRateLimiter = {
      consume: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockReturnValue({
        remaining: 25,
        total: 30,
        resetTime: Date.now() + 60000,
      }),
    } as unknown as RateLimiter;

    mockToolHandlers = {
      handleGetWorkflowGuidance: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Workflow guidance' }],
      }),
      handleGetSessionHealth: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Session health' }],
      }),
      handleGenerateSmartPlan: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Plan generated' }],
      }),
      handleHookToolUse: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hook recorded' }],
      }),
    } as unknown as ToolHandlers;

    mockBuddyHandlers = {
      handleBuddyDo: vi.fn().mockImplementation((args: any) => {
        if (args.task === null) {
          return Promise.resolve({
            content: [{ type: 'text', text: 'ValidationError: Invalid buddy-do input' }],
            isError: true,
          });
        }
        return Promise.resolve({
          content: [{ type: 'text', text: 'Buddy do result' }],
        });
      }),
      handleBuddyRemember: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Buddy remember result' }],
      }),
      handleBuddyHelp: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Buddy help' }],
      }),
    } as unknown as BuddyHandlers;

    const config: ToolRouterConfig = {
      rateLimiter: mockRateLimiter,
      toolHandlers: mockToolHandlers,
      buddyHandlers: mockBuddyHandlers,
    };

    toolRouter = new ToolRouter(config);
  });

  describe('routeToolCall', () => {
    it('should validate request parameters', async () => {
      await expect(async () => {
        await toolRouter.routeToolCall(null);
      }).rejects.toThrow(ValidationError);

      await expect(async () => {
        await toolRouter.routeToolCall(undefined);
      }).rejects.toThrow(ValidationError);

      await expect(async () => {
        await toolRouter.routeToolCall({});
      }).rejects.toThrow(ValidationError);

      await expect(async () => {
        await toolRouter.routeToolCall({ name: 'test' });
      }).rejects.toThrow(ValidationError);
    });

    it('should enforce rate limiting', async () => {
      vi.mocked(mockRateLimiter.consume).mockReturnValue(false);

      await expect(async () => {
        await toolRouter.routeToolCall({
          name: 'buddy-do',
          arguments: { task: 'test' },
        });
      }).rejects.toThrow(OperationError);
    });

    it('should route valid tool calls', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-do',
        arguments: { task: 'Create a component' },
      });

      expect(result.content).toHaveLength(1);
      expect(mockRateLimiter.consume).toHaveBeenCalledWith(1);
    });
  });

  describe('Buddy Commands', () => {
    it('should route buddy-do', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-do',
        arguments: { task: 'Create feature' },
      });

      expect(mockBuddyHandlers.handleBuddyDo).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Buddy do result');
    });

    it('should route buddy-remember', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-remember',
        arguments: { query: 'authentication' },
      });

      expect(mockBuddyHandlers.handleBuddyRemember).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Buddy remember result');
    });

    it('should route buddy-help', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-help',
        arguments: {},
      });

      expect(mockBuddyHandlers.handleBuddyHelp).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Buddy help');
    });
  });

  describe('Workflow Tools', () => {
    it('should route get-workflow-guidance', async () => {
      await toolRouter.routeToolCall({
        name: 'get-workflow-guidance',
        arguments: { phase: 'idle' },
      });

      expect(mockToolHandlers.handleGetWorkflowGuidance).toHaveBeenCalled();
    });

    it('should route get-session-health', async () => {
      await toolRouter.routeToolCall({
        name: 'get-session-health',
        arguments: {},
      });

      expect(mockToolHandlers.handleGetSessionHealth).toHaveBeenCalled();
    });
  });

  // Planning Tools tests removed - generate-smart-plan tool deleted per MCP compliance
  // Planning delegated to Claude's built-in capabilities

  describe('Hook Tools', () => {
    it('should route hook-tool-use', async () => {
      await toolRouter.routeToolCall({
        name: 'hook-tool-use',
        arguments: { toolName: 'Write', success: true },
      });

      expect(mockToolHandlers.handleHookToolUse).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should propagate handler exceptions', async () => {
      vi.mocked(mockToolHandlers.handleGetSessionHealth).mockRejectedValue(
        new Error('Handler error')
      );

      await expect(async () => {
        await toolRouter.routeToolCall({
          name: 'get-session-health',
          arguments: {},
        });
      }).rejects.toThrow('Handler error');
    });

    it('should handle invalid JSON in arguments', async () => {
      await expect(async () => {
        await toolRouter.routeToolCall({
          name: 'buddy-do',
          arguments: 'invalid' as any,
        });
      }).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool name', async () => {
      await expect(async () => {
        await toolRouter.routeToolCall({
          name: '',
          arguments: {},
        });
      }).rejects.toThrow(ValidationError);
    });

    it('should reject unknown tools', async () => {
      await expect(async () => {
        await toolRouter.routeToolCall({
          name: 'unknown-tool',
          arguments: {},
        });
      }).rejects.toThrow(NotFoundError);
    });

    it('should handle null in arguments', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-do',
        arguments: { task: null } as any,
      });

      expect(result.isError).toBe(true);
    });
  });
});
