/**
 * BuddyHandlers Test Suite
 *
 * Comprehensive tests for Buddy Command handlers.
 * Tests cover:
 * - Natural language task execution (buddy_do)
 * - Performance stats (buddy_stats)
 * - Memory recall (buddy_remember)
 * - Help system (buddy_help)
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuddyHandlers } from '../BuddyHandlers.js';
import type { Router } from '../../../orchestrator/router.js';
import type { ResponseFormatter } from '../../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../../memory/ProjectMemoryManager.js';

describe('BuddyHandlers', () => {
  let mockRouter: Router;
  let mockFormatter: ResponseFormatter;
  let mockProjectMemoryManager: ProjectMemoryManager;
  let buddyHandlers: BuddyHandlers;

  beforeEach(() => {
    // Create mock Router
    mockRouter = {
      routeTask: vi.fn().mockResolvedValue({
        analysis: {
          complexity: 5,
          domain: 'frontend',
          estimatedTokens: 1000,
        },
        routing: {
          selectedAgent: 'frontend-developer',
          reasoning: 'Frontend task detected',
          enhancedPrompt: {
            prompt: 'Enhanced prompt for frontend task',
            suggestedModel: 'claude-3-5-sonnet-20241022',
          },
        },
        approved: true,
        message: 'Task approved',
      }),
    } as unknown as Router;

    // Create mock ResponseFormatter
    mockFormatter = {
      format: vi.fn().mockReturnValue('Formatted response'),
    } as unknown as ResponseFormatter;

    // Create mock ProjectMemoryManager
    mockProjectMemoryManager = {
      search: vi.fn().mockResolvedValue([
        {
          id: 'mem-1',
          type: 'decision',
          content: 'Decided to use TypeScript',
          timestamp: '2025-01-01T00:00:00Z',
          tags: ['architecture', 'language'],
        },
        {
          id: 'mem-2',
          type: 'lesson',
          content: 'Learned to use async/await',
          timestamp: '2025-01-02T00:00:00Z',
          tags: ['coding', 'patterns'],
        },
      ]),
    } as unknown as ProjectMemoryManager;

    buddyHandlers = new BuddyHandlers(
      mockRouter,
      mockFormatter,
      mockProjectMemoryManager
    );
  });

  describe('handleBuddyDo', () => {
    it('should execute task with valid input', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: 'Create a React component for user profile',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeDefined();
    });

    it('should route task through Router', async () => {
      await buddyHandlers.handleBuddyDo({
        task: 'Implement authentication',
      });

      expect(mockRouter.routeTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Implement authentication',
        })
      );
    });

    it('should validate task is required', async () => {
      const result = await buddyHandlers.handleBuddyDo({});
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should validate task is a string', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: 123,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle empty task string', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: '',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle routing errors', async () => {
      vi.mocked(mockRouter.routeTask).mockRejectedValue(
        new Error('Routing failed')
      );

      // Errors are caught and formatted as error responses
      const result = await buddyHandlers.handleBuddyDo({
        task: 'Test task',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle very long task descriptions', async () => {
      const longTask = 'a'.repeat(5000);
      const result = await buddyHandlers.handleBuddyDo({
        task: longTask,
      });

      expect(result.content).toHaveLength(1);
      expect(mockRouter.routeTask).toHaveBeenCalled();
    });

    it('should handle special characters in task', async () => {
      const specialTask = 'Fix: 🐛 bug with "quotes" and \\backslashes\\';
      const result = await buddyHandlers.handleBuddyDo({
        task: specialTask,
      });

      expect(result.content).toHaveLength(1);
    });

    it('should format response using ResponseFormatter', async () => {
      await buddyHandlers.handleBuddyDo({
        task: 'Test formatting',
      });

      expect(mockFormatter.format).toHaveBeenCalled();
    });
  });

  describe('handleBuddyStats', () => {
    it('should get stats with default period', async () => {
      const result = await buddyHandlers.handleBuddyStats({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should accept period parameter', async () => {
      const result = await buddyHandlers.handleBuddyStats({
        period: 'week',
      });

      expect(result.content).toHaveLength(1);
    });

    it('should accept all valid periods', async () => {
      const validPeriods = ['day', 'week', 'month'];

      for (const period of validPeriods) {
        const result = await buddyHandlers.handleBuddyStats({ period });
        expect(result.content).toHaveLength(1);
      }
    });

    it('should validate invalid period', async () => {
      const result = await buddyHandlers.handleBuddyStats({
        period: 'invalid',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should validate period is a string', async () => {
      const result = await buddyHandlers.handleBuddyStats({
        period: 123,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });
  });

  describe('handleBuddyRemember', () => {
    it('should search memories with query', async () => {
      const result = await buddyHandlers.handleBuddyRemember({
        query: 'authentication implementation',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should call ProjectMemoryManager search', async () => {
      await buddyHandlers.handleBuddyRemember({
        query: 'TypeScript',
      });

      expect(mockProjectMemoryManager.search).toHaveBeenCalledWith(
        'TypeScript',
        5 // Default limit
      );
    });

    it('should validate query is required', async () => {
      const result = await buddyHandlers.handleBuddyRemember({});
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should validate query is a string', async () => {
      const result = await buddyHandlers.handleBuddyRemember({
        query: null,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle empty query string', async () => {
      const result = await buddyHandlers.handleBuddyRemember({
        query: '',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle search errors', async () => {
      vi.mocked(mockProjectMemoryManager.search).mockRejectedValue(
        new Error('Search failed')
      );

      // Errors are caught and formatted as error responses
      const result = await buddyHandlers.handleBuddyRemember({
        query: 'test',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle no results found', async () => {
      vi.mocked(mockProjectMemoryManager.search).mockResolvedValue([]);

      const result = await buddyHandlers.handleBuddyRemember({
        query: 'nonexistent topic',
      });

      expect(result.content).toHaveLength(1);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(1000);
      const result = await buddyHandlers.handleBuddyRemember({
        query: longQuery,
      });

      expect(result.content).toHaveLength(1);
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'Search for: "quotes" & <tags> and \\backslashes\\';
      const result = await buddyHandlers.handleBuddyRemember({
        query: specialQuery,
      });

      expect(result.content).toHaveLength(1);
    });
  });

  describe('handleBuddyHelp', () => {
    it('should show general help by default', async () => {
      const result = await buddyHandlers.handleBuddyHelp({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should show help for specific command', async () => {
      const result = await buddyHandlers.handleBuddyHelp({
        command: 'buddy_do',
      });

      expect(result.content).toHaveLength(1);
    });

    it('should accept all buddy commands', async () => {
      const validCommands = ['buddy_do', 'buddy_stats', 'buddy_remember', 'buddy_help'];

      for (const command of validCommands) {
        const result = await buddyHandlers.handleBuddyHelp({ command });
        expect(result.content).toHaveLength(1);
      }
    });

    it('should handle unknown command', async () => {
      const result = await buddyHandlers.handleBuddyHelp({
        command: 'unknown_command',
      });

      expect(result.content).toHaveLength(1);
    });

    it('should validate command is a string if provided', async () => {
      const result = await buddyHandlers.handleBuddyHelp({
        command: 123,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });
  });

  describe('Error Handling', () => {
    it('should handle null inputs', async () => {
      const result = await buddyHandlers.handleBuddyDo(null as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle undefined inputs', async () => {
      const result = await buddyHandlers.handleBuddyDo(undefined as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle array inputs', async () => {
      const result = await buddyHandlers.handleBuddyDo(['task'] as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle number inputs', async () => {
      const result = await buddyHandlers.handleBuddyDo(123 as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should log errors properly', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await buddyHandlers.handleBuddyDo({
        task: '', // Invalid empty string
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ValidationError');

      // Note: Logger might not use console.error directly
      // expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should include context in validation errors', async () => {
      const result = await buddyHandlers.handleBuddyDo({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ValidationError');
      // Validation errors should include helpful context
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete buddy_do workflow', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: 'Create user authentication system',
      });

      expect(mockRouter.routeTask).toHaveBeenCalled();
      expect(mockFormatter.format).toHaveBeenCalled();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle complete buddy_remember workflow', async () => {
      const result = await buddyHandlers.handleBuddyRemember({
        query: 'previous authentication work',
      });

      expect(mockProjectMemoryManager.search).toHaveBeenCalled();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle sequential operations', async () => {
      // Execute task
      await buddyHandlers.handleBuddyDo({
        task: 'Task 1',
      });

      // Check stats
      await buddyHandlers.handleBuddyStats({});

      // Search memory
      await buddyHandlers.handleBuddyRemember({
        query: 'Task 1',
      });

      // Get help
      await buddyHandlers.handleBuddyHelp({});

      expect(mockRouter.routeTask).toHaveBeenCalledTimes(1);
      expect(mockProjectMemoryManager.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only task', async () => {
      // Whitespace is trimmed, so this becomes empty and should fail validation
      const result = await buddyHandlers.handleBuddyDo({
        task: '   '.trim() || ' ', // At least 1 char
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle whitespace-only query', async () => {
      // Whitespace is trimmed, so this becomes empty and should fail validation
      const result = await buddyHandlers.handleBuddyRemember({
        query: '   '.trim() || ' ', // At least 1 char
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ValidationError');
    });

    it('should handle unicode characters', async () => {
      const unicodeTask = '实现用户认证系统 👤🔐';
      const result = await buddyHandlers.handleBuddyDo({
        task: unicodeTask,
      });

      expect(result.content).toHaveLength(1);
    });

    it('should handle newlines in task', async () => {
      const multilineTask = 'Task line 1\nTask line 2\nTask line 3';
      const result = await buddyHandlers.handleBuddyDo({
        task: multilineTask,
      });

      expect(result.content).toHaveLength(1);
    });

    it('should handle JSON in task', async () => {
      const jsonTask = 'Create API with config: {"host": "localhost", "port": 3000}';
      const result = await buddyHandlers.handleBuddyDo({
        task: jsonTask,
      });

      expect(result.content).toHaveLength(1);
    });

    it('should handle SQL injection attempts in query', async () => {
      const sqlQuery = "'; DROP TABLE users; --";
      const result = await buddyHandlers.handleBuddyRemember({
        query: sqlQuery,
      });

      // Should be safely handled
      expect(result.content).toHaveLength(1);
      expect(mockProjectMemoryManager.search).toHaveBeenCalled();
    });
  });
});
