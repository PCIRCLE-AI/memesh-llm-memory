/**
 * Tests for a2a-cancel-task MCP Tool
 *
 * Comprehensive test coverage for cancelling tasks from the unified task board.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleA2ACancelTask, A2ACancelTaskInputSchema } from '../a2a-cancel-task.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the agentId module
vi.mock('../../../a2a/utils/agentId.js', () => ({
  generateAgentId: vi.fn(() => 'test-host-testuser-claude-code'),
}));

describe('a2a-cancel-task MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(
      os.tmpdir(),
      `test-a2a-cancel-task-${Date.now()}-${Math.random().toString(36).substring(7)}.db`
    );
    taskBoard = new TaskBoard(testDbPath);
  });

  afterEach(() => {
    taskBoard.close();
    // Cleanup test database files
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      fs.unlinkSync(testDbPath + '-wal');
    } catch {
      // Ignore WAL file
    }
    try {
      fs.unlinkSync(testDbPath + '-shm');
    } catch {
      // Ignore SHM file
    }
  });

  describe('Input Validation', () => {
    it('should accept valid taskId', () => {
      const result = A2ACancelTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept taskId with optional reason', () => {
      const result = A2ACancelTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'No longer needed',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = A2ACancelTaskInputSchema.safeParse({
        taskId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing taskId', () => {
      const result = A2ACancelTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty taskId', () => {
      const result = A2ACancelTaskInputSchema.safeParse({ taskId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject reason exceeding 500 characters', () => {
      const result = A2ACancelTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept reason at exactly 500 characters', () => {
      const result = A2ACancelTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'x'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('handleA2ACancelTask - Successfully Cancel Tasks', () => {
    it('should cancel pending task successfully', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test task to cancel',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('cancelled successfully');
      expect(text).toContain('cancelled');
    });

    it('should cancel in_progress task successfully', () => {
      const taskId = taskBoard.createTask({
        subject: 'In progress task',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'some-agent');

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('cancelled successfully');
    });

    it('should update task status to cancelled', () => {
      const taskId = taskBoard.createTask({
        subject: 'Status update test',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      handleA2ACancelTask({ taskId }, testDbPath);

      // Verify the task status changed
      const task = taskBoard.getTask(taskId);
      expect(task).not.toBeNull();
      expect(task!.status).toBe('cancelled');
      expect(task!.cancelled_by).toBe('test-host-testuser-claude-code');
    });

    it('should clear task owner when cancelled', () => {
      const taskId = taskBoard.createTask({
        subject: 'Owner clear test',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'some-agent');

      // Verify task has owner before cancel
      const taskBefore = taskBoard.getTask(taskId);
      expect(taskBefore!.owner).toBe('some-agent');

      handleA2ACancelTask({ taskId }, testDbPath);

      // Verify owner is cleared after cancel
      const taskAfter = taskBoard.getTask(taskId);
      expect(taskAfter!.owner).toBeUndefined();
    });
  });

  describe('handleA2ACancelTask - Error Cases', () => {
    it('should fail to cancel completed task', () => {
      const taskId = taskBoard.createTask({
        subject: 'Completed task',
        status: 'completed',
        creator_platform: 'test',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('Cannot cancel');
    });

    it('should fail to cancel already cancelled task', () => {
      const taskId = taskBoard.createTask({
        subject: 'Already cancelled task',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.cancelTask(taskId, 'previous-agent', 'First cancellation');

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });

    it('should fail to cancel non-existent task', () => {
      const result = handleA2ACancelTask({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });

    it('should handle invalid UUID format gracefully', () => {
      const result = handleA2ACancelTask({ taskId: 'invalid-uuid-format' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });
  });

  describe('handleA2ACancelTask - Reason Handling', () => {
    it('should include reason in output when provided', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const result = handleA2ACancelTask({
        taskId,
        reason: 'Requirements changed',
      }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Requirements changed');
    });

    it('should store reason in database when provided', () => {
      const taskId = taskBoard.createTask({
        subject: 'Reason storage test',
        status: 'pending',
        creator_platform: 'test',
      });

      handleA2ACancelTask({
        taskId,
        reason: 'Budget constraints',
      }, testDbPath);

      const task = taskBoard.getTask(taskId);
      expect(task!.cancel_reason).toBe('Budget constraints');
    });

    it('should work without reason', () => {
      const taskId = taskBoard.createTask({
        subject: 'No reason test',
        status: 'pending',
        creator_platform: 'test',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('cancelled successfully');
    });
  });

  describe('handleA2ACancelTask - Output Format', () => {
    it('should show cancelled_by in output', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('test-host-testuser-claude-code');
    });

    it('should return proper MCP tool result structure', () => {
      const taskId = taskBoard.createTask({
        subject: 'Format test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include success indicator in output', () => {
      const taskId = taskBoard.createTask({
        subject: 'Success indicator test',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toMatch(/[✅]/);
    });

    it('should include error indicator for failures', () => {
      const result = handleA2ACancelTask(
        { taskId: '550e8400-e29b-41d4-a716-446655440000' },
        testDbPath
      );
      const text = result.content[0].text;

      expect(text).toMatch(/[❌]/);
    });

    it('should show task short ID in output', () => {
      const taskId = taskBoard.createTask({
        subject: 'Short ID test',
        status: 'pending',
        creator_platform: 'test',
      });

      const result = handleA2ACancelTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      // Should contain the first 8 characters of the UUID
      expect(text).toContain(taskId.substring(0, 8));
    });
  });

  describe('handleA2ACancelTask - Task History', () => {
    it('should record cancel action in task history', () => {
      const taskId = taskBoard.createTask({
        subject: 'History test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      handleA2ACancelTask({ taskId }, testDbPath);

      // Verify history was recorded
      const history = taskBoard.getTaskHistory(taskId);
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('cancelled');
      expect(history[0].old_status).toBe('pending');
      expect(history[0].new_status).toBe('cancelled');
      expect(history[0].agent_id).toBe('test-host-testuser-claude-code');
    });

    it('should record cancel after claim in history', () => {
      const taskId = taskBoard.createTask({
        subject: 'Claim then cancel test',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      taskBoard.claimTask(taskId, 'first-agent');
      // Close original taskBoard to ensure WAL checkpoint and writes are committed
      taskBoard.close();

      handleA2ACancelTask({ taskId }, testDbPath);

      // Re-open taskBoard to read history
      taskBoard = new TaskBoard(testDbPath);
      const history = taskBoard.getTaskHistory(taskId);
      // Should have both claimed and cancelled entries
      expect(history).toHaveLength(2);
      // History is returned newest first - verify by action type (order may vary slightly)
      const actions = history.map(h => h.action);
      expect(actions).toContain('cancelled');
      expect(actions).toContain('claimed');
      // The cancelled entry should have old_status of in_progress
      const cancelledEntry = history.find(h => h.action === 'cancelled');
      expect(cancelledEntry?.old_status).toBe('in_progress');
    });
  });
});
