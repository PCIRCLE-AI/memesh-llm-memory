/**
 * Tests for a2a-release-task MCP Tool
 *
 * Comprehensive test coverage for releasing tasks back to the unified task board.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleA2AReleaseTask, A2AReleaseTaskInputSchema } from '../a2a-release-task.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('a2a-release-task MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(
      os.tmpdir(),
      `test-a2a-release-task-${Date.now()}-${Math.random().toString(36).substring(7)}.db`
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
    it('should accept valid taskId (UUID format)', () => {
      const result = A2AReleaseTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing taskId', () => {
      const result = A2AReleaseTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty taskId', () => {
      const result = A2AReleaseTaskInputSchema.safeParse({ taskId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject non-string taskId', () => {
      const result = A2AReleaseTaskInputSchema.safeParse({ taskId: 12345 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const result = A2AReleaseTaskInputSchema.safeParse({ taskId: 'not-a-valid-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2AReleaseTask - Successfully Release In-Progress Task', () => {
    it('should successfully release an in_progress task', () => {
      // Create an in_progress task
      const taskId = taskBoard.createTask({
        subject: 'Test task to release',
        status: 'in_progress',
        owner: 'test-agent-id',
        creator_platform: 'claude-code',
      });

      const result = handleA2AReleaseTask({ taskId }, testDbPath);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('Task released successfully!');
      expect(text).toContain(taskId.substring(0, 8)); // Short ID
      expect(text).toContain('Test task to release');
      expect(text).toContain('Status: pending');
      expect(text).toContain('(unassigned)');
      expect(text).toContain('Task is now available for other agents to claim');
    });

    it('should update task status to pending after release', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task status test',
        status: 'in_progress',
        owner: 'previous-owner',
        creator_platform: 'chatgpt',
      });

      handleA2AReleaseTask({ taskId }, testDbPath);

      // Verify the task status changed
      const task = taskBoard.getTask(taskId);
      expect(task).not.toBeNull();
      expect(task!.status).toBe('pending');
      expect(task!.owner).toBeUndefined();
    });

    it('should return task details after successful release', () => {
      const taskId = taskBoard.createTask({
        subject: 'Detailed task info',
        description: 'This is a detailed description',
        status: 'in_progress',
        owner: 'agent-xyz',
        creator_platform: 'cursor',
      });

      const result = handleA2AReleaseTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Detailed task info');
      expect(text).toContain('Status: pending');
      expect(text).toContain('(unassigned)');
    });
  });

  describe('handleA2AReleaseTask - Release Pending Task (Idempotent)', () => {
    it('should release a pending task (idempotent operation)', () => {
      // Create a pending task (no owner)
      const taskId = taskBoard.createTask({
        subject: 'Already pending task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AReleaseTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      // Should succeed even if already pending
      expect(text).toContain('Task released successfully!');
      expect(text).toContain('Status: pending');
      expect(text).toContain('(unassigned)');

      // Verify task is still pending
      const task = taskBoard.getTask(taskId);
      expect(task!.status).toBe('pending');
      expect(task!.owner).toBeUndefined();
    });
  });

  describe('handleA2AReleaseTask - Error Cases', () => {
    it('should fail to release non-existent task', () => {
      const fakeTaskId = '550e8400-e29b-41d4-a716-446655440000';

      const result = handleA2AReleaseTask({ taskId: fakeTaskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('not found');
    });

    it('should handle invalid UUID format gracefully', () => {
      // Note: This tests the handler's behavior when receiving invalid input
      // that bypasses Zod validation (e.g., from direct function call)
      const result = handleA2AReleaseTask({ taskId: 'invalid-uuid-format' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });
  });

  describe('handleA2AReleaseTask - Output Format', () => {
    it('should return proper MCP tool result structure', () => {
      const taskId = taskBoard.createTask({
        subject: 'Format test task',
        status: 'in_progress',
        owner: 'test-agent',
        creator_platform: 'claude-code',
      });

      const result = handleA2AReleaseTask({ taskId }, testDbPath);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include success indicator in output', () => {
      const taskId = taskBoard.createTask({
        subject: 'Success indicator test',
        status: 'in_progress',
        owner: 'agent-123',
        creator_platform: 'claude-code',
      });

      const result = handleA2AReleaseTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      // Should have checkmark or success indicator
      expect(text).toMatch(/[✅]/);
    });

    it('should include error indicator for failures', () => {
      const result = handleA2AReleaseTask(
        { taskId: '550e8400-e29b-41d4-a716-446655440000' },
        testDbPath
      );
      const text = result.content[0].text;

      // Should have error indicator
      expect(text).toMatch(/[❌]/);
    });
  });

  describe('handleA2AReleaseTask - Task History', () => {
    it('should record release action in task history', () => {
      const taskId = taskBoard.createTask({
        subject: 'History test task',
        status: 'in_progress',
        owner: 'releasing-agent',
        creator_platform: 'claude-code',
      });

      handleA2AReleaseTask({ taskId }, testDbPath);

      // Verify history was recorded
      const history = taskBoard.getTaskHistory(taskId);
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('released');
      expect(history[0].old_status).toBe('in_progress');
      expect(history[0].new_status).toBe('pending');
      expect(history[0].agent_id).toBe('releasing-agent');
    });

    it('should record release action for pending task with unknown owner', () => {
      const taskId = taskBoard.createTask({
        subject: 'No owner task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      handleA2AReleaseTask({ taskId }, testDbPath);

      // Verify history was recorded with 'unknown' owner
      const history = taskBoard.getTaskHistory(taskId);
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('released');
      expect(history[0].old_status).toBe('pending');
      expect(history[0].new_status).toBe('pending');
      expect(history[0].agent_id).toBe('unknown');
    });
  });
});
