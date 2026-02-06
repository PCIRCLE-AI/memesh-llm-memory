/**
 * Tests for a2a-claim-task MCP Tool
 *
 * Comprehensive test coverage for claiming tasks from the unified task board.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleA2AClaimTask, A2AClaimTaskInputSchema } from '../a2a-claim-task.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the agentId module
vi.mock('../../../a2a/utils/agentId.js', () => ({
  generateAgentId: vi.fn(() => 'test-agent-mock-id'),
}));

describe('a2a-claim-task MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(
      os.tmpdir(),
      `test-a2a-claim-task-${Date.now()}-${Math.random().toString(36).substring(7)}.db`
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
      const result = A2AClaimTaskInputSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing taskId', () => {
      const result = A2AClaimTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty taskId', () => {
      const result = A2AClaimTaskInputSchema.safeParse({ taskId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject non-string taskId', () => {
      const result = A2AClaimTaskInputSchema.safeParse({ taskId: 12345 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const result = A2AClaimTaskInputSchema.safeParse({ taskId: 'not-a-valid-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2AClaimTask - Successfully Claim Pending Task', () => {
    it('should successfully claim a pending task', () => {
      // Create a pending task
      const taskId = taskBoard.createTask({
        subject: 'Test task to claim',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('Task claimed successfully!');
      expect(text).toContain(taskId.substring(0, 8)); // Short ID
      expect(text).toContain('Test task to claim');
      expect(text).toContain('test-agent-mock-id'); // From mocked generateAgentId
      expect(text).toContain('in_progress');
    });

    it('should update task status to in_progress after claim', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task status test',
        status: 'pending',
        creator_platform: 'chatgpt',
      });

      handleA2AClaimTask({ taskId }, testDbPath);

      // Verify the task status changed
      const task = taskBoard.getTask(taskId);
      expect(task).not.toBeNull();
      expect(task!.status).toBe('in_progress');
      expect(task!.owner).toBe('test-agent-mock-id');
    });

    it('should return task details after successful claim', () => {
      const taskId = taskBoard.createTask({
        subject: 'Detailed task info',
        description: 'This is a detailed description',
        status: 'pending',
        creator_platform: 'cursor',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Detailed task info');
      expect(text).toContain('Status: in_progress');
    });
  });

  describe('handleA2AClaimTask - Error Cases', () => {
    it('should fail to claim non-existent task', () => {
      const fakeTaskId = '550e8400-e29b-41d4-a716-446655440000';

      const result = handleA2AClaimTask({ taskId: fakeTaskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('not found');
    });

    it('should fail to claim already claimed task (in_progress)', () => {
      // Create a task that's already in progress
      const taskId = taskBoard.createTask({
        subject: 'Already in progress task',
        status: 'in_progress',
        owner: 'other-agent-id',
        creator_platform: 'claude-code',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('not in pending status');
      expect(text).toContain('in_progress');
    });

    it('should fail to claim completed task', () => {
      const taskId = taskBoard.createTask({
        subject: 'Completed task',
        status: 'completed',
        owner: 'previous-agent',
        creator_platform: 'vscode',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('not in pending status');
      expect(text).toContain('completed');
    });

    it('should fail to claim deleted task', () => {
      const taskId = taskBoard.createTask({
        subject: 'Deleted task',
        status: 'deleted',
        creator_platform: 'claude-code',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
      expect(text).toContain('not in pending status');
      expect(text).toContain('deleted');
    });

    it('should handle invalid UUID format gracefully', () => {
      // Note: This tests the handler's behavior when receiving invalid input
      // that bypasses Zod validation (e.g., from direct function call)
      const result = handleA2AClaimTask({ taskId: 'invalid-uuid-format' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });
  });

  describe('handleA2AClaimTask - Output Format', () => {
    it('should return proper MCP tool result structure', () => {
      const taskId = taskBoard.createTask({
        subject: 'Format test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AClaimTask({ taskId }, testDbPath);

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

      const result = handleA2AClaimTask({ taskId }, testDbPath);
      const text = result.content[0].text;

      // Should have checkmark or success indicator
      expect(text).toMatch(/[✅]/);
    });

    it('should include error indicator for failures', () => {
      const result = handleA2AClaimTask(
        { taskId: '550e8400-e29b-41d4-a716-446655440000' },
        testDbPath
      );
      const text = result.content[0].text;

      // Should have error indicator
      expect(text).toMatch(/[❌]/);
    });
  });

  describe('handleA2AClaimTask - Task History', () => {
    it('should record claim action in task history', () => {
      const taskId = taskBoard.createTask({
        subject: 'History test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      handleA2AClaimTask({ taskId }, testDbPath);

      // Verify history was recorded
      const history = taskBoard.getTaskHistory(taskId);
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('claimed');
      expect(history[0].old_status).toBe('pending');
      expect(history[0].new_status).toBe('in_progress');
      expect(history[0].agent_id).toBe('test-agent-mock-id');
    });
  });
});
