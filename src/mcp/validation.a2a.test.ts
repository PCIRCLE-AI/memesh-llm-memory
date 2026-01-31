/**
 * A2A Tool Validation Schemas Tests
 */

import { describe, it, expect } from 'vitest';
import {
  A2ASendTaskInputSchema,
  A2AGetTaskInputSchema,
  A2AListTasksInputSchema,
  A2AListAgentsInputSchema,
} from './validation.js';

describe('A2A Tool Validation Schemas', () => {
  describe('A2ASendTaskInputSchema', () => {
    it('should validate valid send task input', () => {
      const validInput = {
        targetAgentId: 'agent-1',
        taskDescription: 'Build a React component',
        priority: 'normal' as const,
      };

      const result = A2ASendTaskInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetAgentId).toBe('agent-1');
        expect(result.data.taskDescription).toBe('Build a React component');
        expect(result.data.priority).toBe('normal');
      }
    });

    it('should validate with minimal input (no priority)', () => {
      const validInput = {
        targetAgentId: 'agent-1',
        taskDescription: 'Build a React component',
      };

      const result = A2ASendTaskInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty targetAgentId', () => {
      const invalidInput = {
        targetAgentId: '',
        taskDescription: 'Build a React component',
      };

      const result = A2ASendTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty taskDescription', () => {
      const invalidInput = {
        targetAgentId: 'agent-1',
        taskDescription: '',
      };

      const result = A2ASendTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing targetAgentId', () => {
      const invalidInput = {
        taskDescription: 'Build a React component',
      };

      const result = A2ASendTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing taskDescription', () => {
      const invalidInput = {
        targetAgentId: 'agent-1',
      };

      const result = A2ASendTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept valid priority values', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'] as const;
      priorities.forEach((priority) => {
        const input = {
          targetAgentId: 'agent-1',
          taskDescription: 'Test task',
          priority,
        };
        const result = A2ASendTaskInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid priority value', () => {
      const invalidInput = {
        targetAgentId: 'agent-1',
        taskDescription: 'Test task',
        priority: 'critical',
      };

      const result = A2ASendTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('A2AGetTaskInputSchema', () => {
    it('should validate valid get task input', () => {
      const validInput = {
        targetAgentId: 'agent-1',
        taskId: 'task-123',
      };

      const result = A2AGetTaskInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetAgentId).toBe('agent-1');
        expect(result.data.taskId).toBe('task-123');
      }
    });

    it('should reject empty targetAgentId', () => {
      const invalidInput = {
        targetAgentId: '',
        taskId: 'task-123',
      };

      const result = A2AGetTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty taskId', () => {
      const invalidInput = {
        targetAgentId: 'agent-1',
        taskId: '',
      };

      const result = A2AGetTaskInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result1 = A2AGetTaskInputSchema.safeParse({ targetAgentId: 'agent-1' });
      expect(result1.success).toBe(false);

      const result2 = A2AGetTaskInputSchema.safeParse({ taskId: 'task-123' });
      expect(result2.success).toBe(false);
    });
  });

  describe('A2AListTasksInputSchema', () => {
    it('should validate with no filters', () => {
      const validInput = {};

      const result = A2AListTasksInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate with state filter', () => {
      const validInput = {
        state: 'WORKING' as const,
      };

      const result = A2AListTasksInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe('WORKING');
      }
    });

    it('should validate with limit', () => {
      const validInput = {
        limit: 10,
      };

      const result = A2AListTasksInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('should validate with offset', () => {
      const validInput = {
        offset: 20,
      };

      const result = A2AListTasksInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(20);
      }
    });

    it('should accept valid state values', () => {
      const states = [
        'SUBMITTED',
        'WORKING',
        'INPUT_REQUIRED',
        'COMPLETED',
        'FAILED',
        'CANCELED',
        'REJECTED',
      ] as const;

      states.forEach((state) => {
        const input = { state };
        const result = A2AListTasksInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid state value', () => {
      const invalidInput = {
        state: 'INVALID_STATE',
      };

      const result = A2AListTasksInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative limit', () => {
      const invalidInput = {
        limit: -1,
      };

      const result = A2AListTasksInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject limit exceeding max (100)', () => {
      const invalidInput = {
        limit: 101,
      };

      const result = A2AListTasksInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const invalidInput = {
        offset: -1,
      };

      const result = A2AListTasksInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('A2AListAgentsInputSchema', () => {
    it('should validate empty input', () => {
      const validInput = {};

      const result = A2AListAgentsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate with status filter', () => {
      const validInput = {
        status: 'active' as const,
      };

      const result = A2AListAgentsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should accept valid status values', () => {
      const statuses = ['active', 'inactive', 'all'] as const;

      statuses.forEach((status) => {
        const input = { status };
        const result = A2AListAgentsInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status value', () => {
      const invalidInput = {
        status: 'unknown',
      };

      const result = A2AListAgentsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
