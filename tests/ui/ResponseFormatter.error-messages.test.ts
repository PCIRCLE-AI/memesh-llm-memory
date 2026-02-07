/**
 * Error Messages - User-First Tests
 *
 * Tests for improved error message formatting with clear guidance
 * Task 9: Update Error Messages to Be User-First
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseFormatter } from '../../src/ui/ResponseFormatter.js';
import type { AgentResponse } from '../../src/ui/ResponseFormatter.js';

describe('Error Messages - User-First', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  describe('Configuration Errors', () => {
    it('should format missing configuration error with clear guidance', () => {
      const error = new Error('MCP server configuration is missing or invalid');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Execute development task',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should have clear error indicator
      expect(formatted).toContain('❌');

      // Should explain what happened
      expect(formatted).toMatch(/configuration|not configured|missing/i);

      // Should provide fix steps
      expect(formatted).toMatch(/fix steps?:/i);
      expect(formatted).toMatch(/1\./); // Numbered steps
      expect(formatted).toMatch(/2\./);

      // Should NOT show stack trace in normal mode
      expect(formatted).not.toContain('at Object');
      expect(formatted).not.toContain('at Module');
    });

    it('should provide specific guidance for MCP server issues', () => {
      const error = new Error('MCP server not found or not running');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Execute task',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should indicate service/integration issue
      expect(formatted).toMatch(/service|integration|connect/i);

      // Should provide troubleshooting steps
      expect(formatted).toMatch(/fix steps?:/i);
    });
  });

  describe('Validation Errors', () => {
    it('should format validation error with clear fix steps', () => {
      const error = new Error('Invalid input: taskDescription is required');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: '',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should indicate validation error
      expect(formatted).toMatch(/invalid|validation/i);

      // Should provide fix guidance
      expect(formatted).toMatch(/fix steps?:/i);
      expect(formatted).toMatch(/buddy-help/i); // Reference help command

      // Should NOT show technical details
      expect(formatted).not.toContain('ValidationError');
      expect(formatted).not.toContain('at validateInput');
    });

    it('should explain why validation failed', () => {
      const error = new Error('Invalid task priority: must be one of low, normal, high, urgent');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should show root cause
      expect(formatted).toMatch(/root cause/i);
      expect(formatted).toContain('must be one of');

      // Should provide examples or fix steps
      expect(formatted).toMatch(/fix steps?:/i);
    });
  });

  describe('Network/API Errors', () => {
    it('should format connection error with retry guidance', () => {
      const error = new Error('Failed to connect to MeMesh server: ECONNREFUSED');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Send task',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should indicate connection issue
      expect(formatted).toMatch(/connection|connect/i);

      // Should suggest retry or restart
      expect(formatted).toMatch(/retry|restart|wait/i);

      // Should provide troubleshooting steps
      expect(formatted).toMatch(/fix steps?:/i);
    });

    it('should format timeout error with clear explanation', () => {
      const error = new Error('Request timeout: Operation took too long');
      const response: AgentResponse = {
        agentType: 'buddy-remember',
        taskDescription: 'Get task status',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should indicate timeout
      expect(formatted).toMatch(/timeout|too long/i);

      // Should explain impact
      expect(formatted).toMatch(/root cause/i);

      // Should NOT show full stack trace
      expect(formatted).not.toContain('at Timeout');
    });
  });

  describe('Authorization Errors', () => {
    it('should format permission error with clear fix steps', () => {
      const error = new Error('Permission denied: insufficient privileges');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Execute task',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should indicate permission issue
      expect(formatted).toMatch(/permission|denied|unauthorized/i);

      // Should provide fix steps
      expect(formatted).toMatch(/fix steps?:/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined error gracefully', () => {
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error: undefined as unknown as Error,
      };

      const formatted = formatter.format(response);

      // Should still show error indicator
      expect(formatted).toContain('❌');

      // Should have fallback message
      expect(formatted).toMatch(/error|unexpected/i);

      // Should provide general guidance
      expect(formatted).toMatch(/fix steps?|help/i);
    });

    it('should handle error with empty message', () => {
      const error = new Error('');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should show error indicator
      expect(formatted).toContain('❌');

      // Should have fallback description
      expect(formatted).toMatch(/unexpected|error/i);
    });

    it('should NOT show stack trace in normal mode', () => {
      const error = new Error('Test error with stack');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      // Ensure DEBUG is not set
      delete process.env.DEBUG;

      const formatted = formatter.format(response);

      // Should NOT contain stack trace keywords
      expect(formatted).not.toContain('at Object');
      expect(formatted).not.toContain('at Module');
      expect(formatted).not.toContain('at Function');
      expect(formatted).not.toContain('.ts:');
      expect(formatted).not.toContain('.js:');
    });

    it('should show stack trace in debug mode', () => {
      const error = new Error('Test error with stack');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      // Enable DEBUG mode
      process.env.DEBUG = 'true';

      const formatted = formatter.format(response);

      // Should contain stack trace section
      expect(formatted).toMatch(/stack trace/i);

      // Clean up
      delete process.env.DEBUG;
    });
  });

  describe('User-First Format Structure', () => {
    it('should follow user-first format pattern', () => {
      const error = new Error('Database connection failed');
      const response: AgentResponse = {
        agentType: 'buddy-remember',
        taskDescription: 'Search memory',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should have clear sections
      expect(formatted).toMatch(/root cause/i); // What happened
      expect(formatted).toMatch(/fix steps?:/i); // How to fix

      // Should have help footer
      expect(formatted).toMatch(/need.*help|get.*help/i);
    });

    it('should prioritize actionable guidance over technical details', () => {
      const error = new Error('TypeScript compilation error in module X');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Execute task',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should focus on what user can do
      expect(formatted).toMatch(/fix steps?:/i);

      // Should not overwhelm with technical jargon
      expect(formatted).not.toContain('TypeError:');
      expect(formatted).not.toContain('ReferenceError:');

      // Should provide clear guidance
      expect(formatted).toMatch(/1\./); // Numbered steps
    });
  });

  describe('Help References', () => {
    it('should reference buddy-help for command guidance', () => {
      const error = new Error('Invalid command syntax');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should reference help command
      expect(formatted).toMatch(/buddy-help/i);
    });

    it('should include relevant documentation links', () => {
      const error = new Error('Configuration error: MCP server misconfigured');
      const response: AgentResponse = {
        agentType: 'buddy-do',
        taskDescription: 'Test',
        status: 'error',
        error,
      };

      const formatted = formatter.format(response);

      // Should have documentation section or link
      expect(formatted).toMatch(/documentation|docs|guide/i);
    });
  });
});
