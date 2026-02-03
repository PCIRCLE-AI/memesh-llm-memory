/**
 * ResponseFormatter Test Suite
 *
 * Comprehensive tests for response formatting with visual hierarchy
 * Covers all complexity levels, section formatters, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseFormatter, type AgentResponse } from '../../src/ui/ResponseFormatter.js';

describe('ResponseFormatter', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  // ============================================================================
  // Complexity Detection Tests
  // ============================================================================
  describe('Complexity Detection', () => {
    it('should detect simple response (string result, no metadata)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Simple task',
        status: 'success',
        results: 'Simple string result',
      };

      const formatted = formatter.format(response);

      // Simple format: minimal header with operation name (no boxes, no dividers)
      expect(formatted).toContain('Test Agent'); // Operation name
      expect(formatted).not.toContain('─'.repeat(60)); // No dividers
      expect(formatted).not.toContain('╭'); // No boxes
    });

    it('should detect medium response (structured object)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Medium task',
        status: 'success',
        results: {
          key1: 'value1',
          key2: 'value2',
        },
      };

      const formatted = formatter.format(response);

      // Medium format: minimal header + results, no heavy borders
      expect(formatted).toContain('Test Agent'); // Operation name
      expect(formatted).toContain('key1');
      expect(formatted).not.toContain('╭'); // No boxes
    });

    it('should detect complex response (has error)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Error task',
        status: 'error',
        error: new Error('Test error'),
      };

      const formatted = formatter.format(response);

      // Complex format: minimal header + dividers (no boxes)
      expect(formatted).toContain('Test Agent'); // Operation name
      expect(formatted).toContain('─'.repeat(60)); // Has dividers
      expect(formatted).toContain('Error');
    });

    it('should detect complex response (has enhanced prompt)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Enhanced task',
        status: 'success',
        enhancedPrompt: {
          systemPrompt: 'Test system prompt',
          userPrompt: 'Test user prompt',
        },
      };

      const formatted = formatter.format(response);

      // Complex format: minimal header + dividers (no boxes)
      expect(formatted).toContain('Test Agent'); // Operation name
      expect(formatted).toContain('─'.repeat(60)); // Has dividers
      expect(formatted).toContain('Enhanced Prompt');
    });

    it('should detect complex response (large results)', () => {
      const largeResult = 'x'.repeat(600); // > 500 chars threshold
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Large task',
        status: 'success',
        results: largeResult,
      };

      const formatted = formatter.format(response);

      // Complex format for large results: minimal header (no box)
      expect(formatted).toContain('Test Agent'); // Operation name
    });
  });

  // ============================================================================
  // Section Formatter Tests
  // ============================================================================
  describe('Section Formatters', () => {
    describe('formatResults', () => {
      it('should format results with success icon', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'success',
          results: { key: 'value' },
        };

        const formatted = formatter.format(response);

        expect(formatted).toContain('✓'); // Success icon
        expect(formatted).toContain('Results');
      });

      it('should format string results (simple format)', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test task',
          status: 'success',
          results: 'Test result string',
        };

        const formatted = formatter.format(response);

        // Simple format: minimal header with operation name
        expect(formatted).toContain('✓');
        expect(formatted).toContain('Test Agent'); // Operation name
        // String results are treated as simple, so full content not shown
      });

      it('should format object results', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'success',
          results: {
            key1: 'value1',
            key2: 123,
            key3: true,
          },
        };

        const formatted = formatter.format(response);

        expect(formatted).toContain('key1');
        expect(formatted).toContain('value1');
        expect(formatted).toContain('key2');
        expect(formatted).toContain('123');
      });

      it('should format array results (simple format)', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test task',
          status: 'success',
          results: ['item1', 'item2', 'item3'],
        };

        const formatted = formatter.format(response);

        // Simple array is treated as simple format with minimal header
        expect(formatted).toContain('✓');
        expect(formatted).toContain('Test Agent'); // Operation name
      });
    });

    describe('formatError', () => {
      it('should format error with ErrorClassifier details', () => {
        const testError = new Error('Test error message');
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'error',
          error: testError,
        };

        const formatted = formatter.format(response);

        expect(formatted).toContain('✗'); // Error icon in header box
        expect(formatted).toContain('Root Cause:'); // ErrorClassifier output
        expect(formatted).toContain('Fix Steps:'); // ErrorClassifier output
        // Note: ErrorClassifier may categorize the error, so original message might not appear verbatim
      });

      it('should include enhanced error details with ErrorClassifier', () => {
        const testError = new Error('Test error');
        testError.stack = 'Error: Test error\n    at test.ts:10:5';

        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'error',
          error: testError,
        };

        const formatted = formatter.format(response);

        // Should include ErrorClassifier output
        expect(formatted).toContain('Root Cause:');
        expect(formatted).toContain('Fix Steps:');
        expect(formatted).toContain('Need more help?');

        // Stack trace only shown in DEBUG mode
        // (not asserting stack trace presence in normal mode)
      });
    });

    describe('formatMetadata', () => {
      it('should format metadata with bullet separators (medium format)', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'success',
          results: {
            // Object results trigger medium format
            key: 'value',
          },
          metadata: {
            duration: 2345,
            tokensUsed: 1234,
            model: 'claude-sonnet-4.5',
          },
        };

        const formatted = formatter.format(response);

        expect(formatted).toContain('Duration');
        expect(formatted).toContain('2.3s'); // Formatted duration
        expect(formatted).toContain('Tokens');
        expect(formatted).toContain('1,234'); // Formatted number
        expect(formatted).toContain('Model');
        expect(formatted).toContain('claude-sonnet-4.5');
        expect(formatted).toContain('•'); // Bullet separator
      });

      it('should format duration correctly (medium format)', () => {
        const testCases = [
          { ms: 123, expected: '123ms' },
          { ms: 2345, expected: '2.3s' },
          { ms: 65000, expected: '1m 5s' },
          { ms: 125000, expected: '2m 5s' },
        ];

        testCases.forEach(({ ms, expected }) => {
          const response: AgentResponse = {
            agentType: 'test-agent',
            taskDescription: 'Test',
            status: 'success',
            results: { key: 'value' }, // Object to trigger medium format
            metadata: { duration: ms },
          };

          const formatted = formatter.format(response);
          expect(formatted).toContain(expected);
        });
      });

      it('should format numbers with commas (medium format)', () => {
        const response: AgentResponse = {
          agentType: 'test-agent',
          taskDescription: 'Test',
          status: 'success',
          results: { key: 'value' }, // Object to trigger medium format
          metadata: { tokensUsed: 1234567 },
        };

        const formatted = formatter.format(response);

        expect(formatted).toContain('1,234,567');
      });
    });
  });

  // ============================================================================
  // Next Steps Generation Tests
  // ============================================================================
  describe('Next Steps Generation', () => {
    it('should generate next steps for errors', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'error',
        error: new Error('Test error'),
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('💡'); // Next Steps icon
      expect(formatted).toContain('Next Steps');
      expect(formatted).toContain('Review the error message');
      expect(formatted).toContain('Check recent changes');
    });

    it('should generate next steps for buddy-do success', () => {
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test task',
        status: 'success',
        results: { message: 'Task completed' },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Next Steps');
      expect(formatted).toContain('Verify the implementation');
      expect(formatted).toContain('Run tests');
      expect(formatted).toContain('buddy-remember');
    });

    it('should generate next steps for buddy-remember with no results', () => {
      const response: AgentResponse = {
        agentType: 'buddy-remember',
        taskDescription: 'Search memory',
        status: 'success',
        results: {
          query: 'test query',
          count: 0,
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Next Steps');
      expect(formatted).toContain('Try a broader search term');
      expect(formatted).toContain('buddy-do to create new memories');
    });

    it('should generate next steps for buddy-remember with results', () => {
      const response: AgentResponse = {
        agentType: 'buddy-remember',
        taskDescription: 'Search memory',
        status: 'success',
        results: {
          query: 'test query',
          count: 3,
          memories: [{ id: 1, content: 'test' }],
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Next Steps');
      expect(formatted).toContain('Review the memories');
      expect(formatted).toContain('Apply these learnings');
    });
  });

  // ============================================================================
  // Enhanced Prompt Tests
  // ============================================================================
  describe('Enhanced Prompt Formatting', () => {
    it('should format enhanced prompt with sections', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        enhancedPrompt: {
          systemPrompt: 'System prompt text',
          userPrompt: 'User prompt text',
          suggestedModel: 'claude-opus-4.5',
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('🚀'); // Enhanced Prompt icon
      expect(formatted).toContain('Enhanced Prompt');
      expect(formatted).toContain('System:');
      expect(formatted).toContain('System prompt text');
      expect(formatted).toContain('User:');
      expect(formatted).toContain('User prompt text');
      expect(formatted).toContain('Suggested Model');
      expect(formatted).toContain('claude-opus-4.5');
    });

    it('should format guardrails with warning icon', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        enhancedPrompt: {
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt with guardrails',
          metadata: {
            guardrails: 'CRITICAL: Do not modify API',
          },
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Guardrails');
      expect(formatted).toContain('CRITICAL: Do not modify API');
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'x'.repeat(400); // > 300 chars
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        enhancedPrompt: {
          systemPrompt: longPrompt,
          userPrompt: 'short',
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('truncated');
      expect(formatted).toContain('characters');
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty results', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        results: '',
      };

      const formatted = formatter.format(response);

      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle undefined results', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
      };

      const formatted = formatter.format(response);

      expect(formatted).toBeTruthy();
      expect(formatted).toContain('Test');
    });

    it('should handle null values in objects', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        results: {
          key1: null,
          key2: undefined,
          key3: 'value',
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toBeTruthy();
      expect(formatted).toContain('key3');
      expect(formatted).toContain('value');
    });

    it('should handle Unicode characters (emoji, CJK)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: '測試任務 with emoji 🚀',
        status: 'success',
        results: { message: '結果 with emoji ✅' }, // Object to show results
      };

      const formatted = formatter.format(response);

      // Operation name shown instead of task description
      expect(formatted).toContain('Test Agent');
      expect(formatted).toContain('結果');
      expect(formatted).toContain('✅');
    });

    it('should handle very long task descriptions', () => {
      const longDescription = 'Task '.repeat(100);
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: longDescription,
        status: 'success',
        results: 'test',
      };

      const formatted = formatter.format(response);

      expect(formatted).toBeTruthy();
      // Operation name shown instead of task description
      expect(formatted).toContain('Test Agent');
    });

    it('should handle missing metadata gracefully', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        results: 'test',
        metadata: {},
      };

      const formatted = formatter.format(response);

      expect(formatted).toBeTruthy();
      // Should not crash, metadata section just won't appear
    });

    it('should handle partial metadata (medium format)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        results: { key: 'value' }, // Object to trigger medium format
        metadata: {
          duration: 123,
          // Missing tokensUsed and model
        },
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Duration');
      expect(formatted).toContain('123ms');
    });
  });

  // ============================================================================
  // Visual Hierarchy Tests
  // ============================================================================
  describe('Visual Hierarchy', () => {
    it('should include section dividers for complex responses', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'error',
        error: new Error('Test'),
      };

      const formatted = formatter.format(response);

      // Should have multiple dividers
      const dividerCount = (formatted.match(/─{60}/g) || []).length;
      expect(dividerCount).toBeGreaterThan(0);
    });

    it('should not include dividers for simple responses', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        results: 'Simple result',
      };

      const formatted = formatter.format(response);

      // Should not have dividers
      expect(formatted).not.toContain('─'.repeat(60));
    });

    it('should use minimal header for complex responses (no boxes)', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'success',
        enhancedPrompt: {
          systemPrompt: 'test',
          userPrompt: 'test',
        },
      };

      const formatted = formatter.format(response);

      // Minimal header - no boxes
      expect(formatted).toContain('Test Agent');
      expect(formatted).not.toContain('╭');
      expect(formatted).not.toContain('╰');
    });

    it('should include attribution footer for complex responses', () => {
      const response: AgentResponse = {
        agentType: 'test-agent',
        taskDescription: 'Test',
        status: 'error',
        error: new Error('Test'),
      };

      const formatted = formatter.format(response);

      expect(formatted).toContain('Powered by');
      expect(formatted).toContain('MeMesh');
    });
  });

  // ============================================================================
  // Minimal Design (Design B) Tests
  // ============================================================================
  describe('ResponseFormatter - Minimal Design (Design B)', () => {
    describe('Minimal Header (no boxes)', () => {
      it('should format success with operation name and result summary', () => {
        const response: AgentResponse = {
          agentType: 'memesh-remember',
          taskDescription: 'Search memory for "api design"',
          status: 'success',
          results: {
            count: 3,
            memories: [{}, {}, {}],
          },
        };

        const formatted = formatter.format(response);

        // Should have operation name (not MEMESH-REMEMBER)
        expect(formatted).toContain('Memory Search');

        // Should have result summary (not generic SUCCESS)
        expect(formatted).toContain('Found 3 memories');

        // Should NOT have boxes
        expect(formatted).not.toContain('╭');
        expect(formatted).not.toContain('╰');

        // Should have minimal divider
        expect(formatted).toContain('─'.repeat(60));
      });

      it('should use contextual operation names for all tools', () => {
        const testCases = [
          { agentType: 'memesh-do', expected: 'Task Router' },
          { agentType: 'memesh-help', expected: 'Help Center' },
          { agentType: 'create-entities', expected: 'Knowledge Storage' },
          { agentType: 'a2a-send-task', expected: 'Agent Communication' },
        ];

        testCases.forEach(({ agentType, expected }) => {
          const response: AgentResponse = {
            agentType,
            taskDescription: 'Test',
            status: 'success',
            results: 'Test result',
          };

          const formatted = formatter.format(response);
          expect(formatted).toContain(expected);
        });
      });

      it('should format contextual success messages', () => {
        const testCases = [
          {
            agentType: 'memesh-remember',
            results: { count: 2, memories: [{}, {}] },
            expected: 'Found 2 memories',
          },
          {
            agentType: 'a2a-list-agents',
            results: { agents: [{}, {}, {}, {}, {}] },
            expected: '5 agents available',
          },
          {
            agentType: 'create-entities',
            results: { created: 3 },
            expected: 'Created 3 entities',
          },
        ];

        testCases.forEach(({ agentType, results, expected }) => {
          const response: AgentResponse = {
            agentType,
            taskDescription: 'Test',
            status: 'success',
            results,
          };

          const formatted = formatter.format(response);
          expect(formatted).toContain(expected);
        });
      });
    });

    describe('Backward Compatibility', () => {
      it('should handle buddy-* prefixed tools with deprecation notice', () => {
        const response: AgentResponse = {
          agentType: 'buddy-remember',
          taskDescription: 'Search memory',
          status: 'success',
          results: { count: 1, memories: [{}] },
        };

        const formatted = formatter.format(response);

        // Should show deprecation notice
        expect(formatted).toContain('⚠ Deprecation Notice');
        expect(formatted).toContain('buddy-remember is deprecated');
        expect(formatted).toContain('use memesh-remember instead');

        // But still work correctly
        expect(formatted).toContain('Memory Search');
      });
    });
  });
});
