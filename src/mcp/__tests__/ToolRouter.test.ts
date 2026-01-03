/**
 * ToolRouter Test Suite
 *
 * Comprehensive tests for MCP tool routing logic.
 * Tests cover:
 * - Tool name routing/dispatching
 * - Input validation
 * - Rate limiting
 * - Error handling
 * - Response formatting
 * - Agent invocation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRouter, type ToolRouterConfig } from '../ToolRouter.js';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { AgentRegistry } from '../../core/AgentRegistry.js';
import type { RateLimiter } from '../../utils/RateLimiter.js';
import type { GitHandlers } from '../handlers/GitHandlers.js';
import type { ToolHandlers } from '../handlers/ToolHandlers.js';
import type { BuddyHandlers } from '../handlers/BuddyHandlers.js';
import { ValidationError, NotFoundError, OperationError } from '../../errors/index.js';

describe('ToolRouter', () => {
  let mockRouter: Router;
  let mockFormatter: ResponseFormatter;
  let mockAgentRegistry: AgentRegistry;
  let mockRateLimiter: RateLimiter;
  let mockGitHandlers: GitHandlers;
  let mockToolHandlers: ToolHandlers;
  let mockBuddyHandlers: BuddyHandlers;
  let toolRouter: ToolRouter;

  beforeEach(() => {
    // Create mock dependencies
    mockRouter = {
      routeTask: vi.fn().mockResolvedValue({
        analysis: {
          complexity: 5,
          domain: 'frontend',
          estimatedTokens: 1000,
        },
        routing: {
          selectedAgent: 'frontend-developer',
          reasoning: 'Frontend task',
          enhancedPrompt: {
            prompt: 'Enhanced prompt',
            suggestedModel: 'claude-3-5-sonnet-20241022',
          },
        },
        approved: true,
        message: 'Approved',
      }),
    } as unknown as Router;

    mockFormatter = {
      format: vi.fn().mockImplementation((response: any) => {
        // Include error message in formatted output when status is 'error'
        if (response.status === 'error' && response.error) {
          return `Error: ${response.error.message}`;
        }
        return 'Formatted output';
      }),
    } as unknown as ResponseFormatter;

    mockAgentRegistry = {
      getAllAgents: vi.fn().mockReturnValue([
        { name: 'frontend-developer', category: 'code' },
        { name: 'backend-developer', category: 'code' },
      ]),
      hasAgent: vi.fn().mockImplementation((name: string) => {
        return ['frontend-developer', 'backend-developer'].includes(name);
      }),
    } as unknown as AgentRegistry;

    mockRateLimiter = {
      consume: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockReturnValue({
        remaining: 25,
        total: 30,
        resetTime: Date.now() + 60000,
      }),
    } as unknown as RateLimiter;

    mockGitHandlers = {
      handleGitSaveWork: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '✅ Work saved' }],
      }),
      handleGitListVersions: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Versions list' }],
      }),
      handleGitStatus: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Git status' }],
      }),
      handleGitShowChanges: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Changes shown' }],
      }),
      handleGitGoBack: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Went back' }],
      }),
      handleGitCreateBackup: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Backup created' }],
      }),
      handleGitSetup: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Git setup complete' }],
      }),
      handleGitHelp: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Git help' }],
      }),
    } as unknown as GitHandlers;

    mockToolHandlers = {
      handleListAgents: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Agents list' }],
      }),
      handleListSkills: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Skills list' }],
      }),
      handleUninstall: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Uninstalled' }],
      }),
      handleGetWorkflowGuidance: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Workflow guidance' }],
      }),
      handleGetSessionHealth: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Session health' }],
      }),
      handleReloadContext: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Context reloaded' }],
      }),
      handleRecordTokenUsage: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tokens recorded' }],
      }),
      handleGenerateSmartPlan: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Plan generated' }],
      }),
      handleRecallMemory: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Memory recalled' }],
      }),
    } as unknown as ToolHandlers;

    mockBuddyHandlers = {
      handleBuddyDo: vi.fn().mockImplementation((args: any) => {
        // Handle validation errors (explicitly null taskDescription)
        if (args.taskDescription === null) {
          return Promise.resolve({
            content: [{ type: 'text', text: 'ValidationError: Invalid buddy-do input' }],
            isError: true,
          });
        }
        // Normal case
        return Promise.resolve({
          content: [{ type: 'text', text: 'Buddy do result' }],
        });
      }),
      handleBuddyStats: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Buddy stats' }],
      }),
      handleBuddyRemember: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Buddy remember result' }],
      }),
      handleBuddyHelp: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Buddy help' }],
      }),
    } as unknown as BuddyHandlers;

    const config: ToolRouterConfig = {
      router: mockRouter,
      formatter: mockFormatter,
      agentRegistry: mockAgentRegistry,
      rateLimiter: mockRateLimiter,
      gitHandlers: mockGitHandlers,
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
          arguments: { taskDescription: 'test' },
        });
      }).rejects.toThrow(OperationError);
    });

    it('should route valid tool calls', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-do',
        arguments: { taskDescription: 'Create a component' },
      });

      expect(result.content).toHaveLength(1);
      expect(mockRateLimiter.consume).toHaveBeenCalledWith(1);
    });
  });

  describe('Buddy Tools', () => {
    it('should route buddy-agents', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-agents',
        arguments: {},
      });

      expect(mockToolHandlers.handleListAgents).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Agents list');
    });

    it('should route buddy-skills', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-skills',
        arguments: { filter: 'all' },
      });

      expect(mockToolHandlers.handleListSkills).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Skills list');
    });

    it('should route buddy-uninstall', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-uninstall',
        arguments: {},
      });

      expect(mockToolHandlers.handleUninstall).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Uninstalled');
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

    it('should route buddy-stats', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-stats',
        arguments: {},
      });

      expect(mockBuddyHandlers.handleBuddyStats).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Buddy stats');
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

  describe('Git Tools', () => {
    it('should route git-save-work', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-save-work',
        arguments: { description: 'Commit message' },
      });

      expect(mockGitHandlers.handleGitSaveWork).toHaveBeenCalled();
      expect(result.content[0].text).toBe('✅ Work saved');
    });

    it('should route git-list-versions', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-list-versions',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitListVersions).toHaveBeenCalled();
    });

    it('should route git-status', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-status',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitStatus).toHaveBeenCalled();
    });

    it('should route git-show-changes', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-show-changes',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitShowChanges).toHaveBeenCalled();
    });

    it('should route git-go-back', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-go-back',
        arguments: { identifier: 'HEAD~1' },
      });

      expect(mockGitHandlers.handleGitGoBack).toHaveBeenCalled();
    });

    it('should route git-create-backup', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-create-backup',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitCreateBackup).toHaveBeenCalled();
    });

    it('should route git-setup', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-setup',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitSetup).toHaveBeenCalled();
    });

    it('should route git-help', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'git-help',
        arguments: {},
      });

      expect(mockGitHandlers.handleGitHelp).toHaveBeenCalled();
    });
  });

  describe('Workflow Tools', () => {
    it('should route get-workflow-guidance', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'get-workflow-guidance',
        arguments: { phase: 'implementation' },
      });

      expect(mockToolHandlers.handleGetWorkflowGuidance).toHaveBeenCalled();
    });

    it('should route get-session-health', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'get-session-health',
        arguments: {},
      });

      expect(mockToolHandlers.handleGetSessionHealth).toHaveBeenCalled();
    });

    it('should route reload-context', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'reload-context',
        arguments: { reason: 'Memory cleanup' },
      });

      expect(mockToolHandlers.handleReloadContext).toHaveBeenCalled();
    });

    it('should route record-token-usage', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'record-token-usage',
        arguments: { inputTokens: 100, outputTokens: 50 },
      });

      expect(mockToolHandlers.handleRecordTokenUsage).toHaveBeenCalled();
    });
  });

  describe('Planning Tools', () => {
    it('should route generate-smart-plan', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'generate-smart-plan',
        arguments: { featureDescription: 'User auth' },
      });

      expect(mockToolHandlers.handleGenerateSmartPlan).toHaveBeenCalled();
    });
  });

  describe('Memory Tools', () => {
    it('should route recall-memory', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'recall-memory',
        arguments: { query: 'test', limit: 5 },
      });

      expect(mockToolHandlers.handleRecallMemory).toHaveBeenCalled();
    });
  });

  describe('Agent Invocation', () => {
    it('should invoke valid agent directly', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'frontend-developer',
        arguments: { taskDescription: 'Create component' },
      });

      expect(mockRouter.routeTask).toHaveBeenCalled();
      expect(mockFormatter.format).toHaveBeenCalled();
      expect(result.content).toHaveLength(1);
    });

    it('should reject unknown agent', async () => {
      vi.mocked(mockAgentRegistry.hasAgent).mockReturnValue(false);

      const result = await toolRouter.routeToolCall({
        name: 'unknown-agent',
        arguments: { taskDescription: 'Test' },
      });

      expect(result.content[0].text).toContain('Unknown agent');
      expect(result.isError).toBe(true);
    });

    it('should validate task description for agent invocation', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'frontend-developer',
        arguments: {}, // Missing taskDescription
      });

      expect(result.content[0].text).toContain('Error');
      expect(result.isError).toBe(true);
    });

    it('should handle agent invocation errors', async () => {
      vi.mocked(mockRouter.routeTask).mockRejectedValue(
        new Error('Routing failed')
      );

      const result = await toolRouter.routeToolCall({
        name: 'frontend-developer',
        arguments: { taskDescription: 'Test' },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Routing failed');
    });

    it('should handle non-approved tasks', async () => {
      vi.mocked(mockRouter.routeTask).mockResolvedValue({
        analysis: { complexity: 10, domain: 'backend', estimatedTokens: 5000 },
        routing: {
          selectedAgent: 'backend-developer',
          reasoning: 'Backend task',
          enhancedPrompt: { prompt: 'Test', suggestedModel: 'claude-3-5-sonnet-20241022' },
        },
        approved: false,
        message: 'Budget exceeded',
      });

      const result = await toolRouter.routeToolCall({
        name: 'backend-developer',
        arguments: { taskDescription: 'Complex task' },
      });

      expect(mockFormatter.format).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle handler exceptions gracefully', async () => {
      vi.mocked(mockToolHandlers.handleListAgents).mockRejectedValue(
        new Error('Handler error')
      );

      await expect(async () => {
        await toolRouter.routeToolCall({
          name: 'buddy-agents',
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

    it('should log errors with context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(mockAgentRegistry.hasAgent).mockReturnValue(false);

      await toolRouter.routeToolCall({
        name: 'invalid-agent',
        arguments: { taskDescription: 'Test' },
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool name', async () => {
      await expect(async () => {
        await toolRouter.routeToolCall({
          name: '',
          arguments: {},
        });
      }).rejects.toThrow();
    });

    it('should handle very long tool names', async () => {
      const longName = 'a'.repeat(1000);
      vi.mocked(mockAgentRegistry.hasAgent).mockReturnValue(false);

      const result = await toolRouter.routeToolCall({
        name: longName,
        arguments: { taskDescription: 'Test' },
      });

      expect(result.isError).toBe(true);
    });

    it('should handle special characters in tool name', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'test@#$%',
        arguments: { taskDescription: 'Test' },
      });

      expect(result.isError).toBe(true);
    });

    it('should handle null in arguments', async () => {
      const result = await toolRouter.routeToolCall({
        name: 'buddy-do',
        arguments: { taskDescription: null } as any,
      });

      expect(result.isError).toBe(true);
    });
  });
});
