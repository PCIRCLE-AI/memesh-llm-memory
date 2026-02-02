/**
 * Security tests for A2A tool input validation
 * Tests input validation for a2a-list-tasks and a2a-report-result
 */

import { describe, it, expect } from 'vitest';
import { A2AListTasksInputSchema } from '../../../../src/mcp/tools/a2a-list-tasks.js';
import { A2AReportResultInputSchema } from '../../../../src/mcp/tools/a2a-report-result.js';

describe('A2A Input Validation - Security', () => {
  describe('IMPORTANT-1: a2a-list-tasks Input Validation', () => {
    describe('Valid agentId formats', () => {
      it('should accept alphanumeric agentId', () => {
        const input = { agentId: 'agent123' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept agentId with hyphens', () => {
        const input = { agentId: 'agent-123-test' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept agentId with underscores', () => {
        const input = { agentId: 'agent_123_test' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept mixed case agentId', () => {
        const input = { agentId: 'AgentID123' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid agentId formats (security)', () => {
      it('should reject empty agentId', () => {
        const input = { agentId: '' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('cannot be empty');
        }
      });

      it('should reject agentId with special characters (injection prevention)', () => {
        const injectionAttempts = [
          'agent; DROP TABLE tasks;',
          'agent<script>alert(1)</script>',
          'agent/../../../etc/passwd',
          'agent$(whoami)',
          'agent`ls -la`',
          'agent|cat /etc/passwd',
          'agent&rm -rf /',
        ];

        injectionAttempts.forEach((agentId) => {
          const input = { agentId };
          const result = A2AListTasksInputSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('alphanumeric');
          }
        });
      });

      it('should reject agentId exceeding max length (DoS prevention)', () => {
        const input = { agentId: 'a'.repeat(101) };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('too long');
        }
      });

      it('should reject agentId with spaces', () => {
        const input = { agentId: 'agent 123' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject agentId with dots (path traversal prevention)', () => {
        const input = { agentId: '../../../etc/passwd' };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('IMPORTANT-1: a2a-report-result Input Validation', () => {
    describe('Valid taskId formats', () => {
      it('should accept alphanumeric taskId', () => {
        const input = {
          taskId: 'task123',
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept taskId with hyphens', () => {
        const input = {
          taskId: 'task-123-abc',
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept taskId with underscores', () => {
        const input = {
          taskId: 'task_123_abc',
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid taskId formats (security)', () => {
      it('should reject empty taskId', () => {
        const input = {
          taskId: '',
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('cannot be empty');
        }
      });

      it('should reject taskId with special characters (injection prevention)', () => {
        const injectionAttempts = [
          'task; DROP TABLE results;',
          'task<script>alert(1)</script>',
          'task../../secrets',
          'task$(cat /etc/passwd)',
        ];

        injectionAttempts.forEach((taskId) => {
          const input = {
            taskId,
            result: 'Success',
            success: true,
          };
          const result = A2AReportResultInputSchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });

      it('should reject taskId exceeding max length (DoS prevention)', () => {
        const input = {
          taskId: 'a'.repeat(101),
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('too long');
        }
      });
    });

    describe('Result field validation', () => {
      it('should accept normal result string', () => {
        const input = {
          taskId: 'task-123',
          result: 'Task completed successfully',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should reject excessively large result (DoS prevention)', () => {
        const input = {
          taskId: 'task-123',
          result: 'x'.repeat(100001), // Exceeds 100KB limit
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('too long');
        }
      });

      it('should accept empty result string', () => {
        const input = {
          taskId: 'task-123',
          result: '',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Error field validation', () => {
      it('should accept error message when success=false', () => {
        const input = {
          taskId: 'task-123',
          result: '',
          success: false,
          error: 'Task failed due to timeout',
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should reject excessively large error message (DoS prevention)', () => {
        const input = {
          taskId: 'task-123',
          result: '',
          success: false,
          error: 'x'.repeat(10001), // Exceeds 10KB limit
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('too long');
        }
      });

      it('should accept missing error field', () => {
        const input = {
          taskId: 'task-123',
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Required fields validation', () => {
      it('should reject missing taskId', () => {
        const input = {
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing result', () => {
        const input = {
          taskId: 'task-123',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing success', () => {
        const input = {
          taskId: 'task-123',
          result: 'Success',
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject non-boolean success field', () => {
        const input = {
          taskId: 'task-123',
          result: 'Success',
          success: 'true' as any,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject non-string taskId', () => {
        const input = {
          taskId: 123 as any,
          result: 'Success',
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject non-string result', () => {
        const input = {
          taskId: 'task-123',
          result: { data: 'Success' } as any,
          success: true,
        };
        const result = A2AReportResultInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});
