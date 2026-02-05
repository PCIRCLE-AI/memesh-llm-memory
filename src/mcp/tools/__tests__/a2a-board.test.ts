/**
 * Tests for a2a-board MCP Tool
 *
 * Comprehensive test coverage for Kanban-style task visualization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleA2ABoard, A2ABoardInput, A2ABoardInputSchema } from '../a2a-board.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('a2a-board MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(os.tmpdir(), `test-a2a-board-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
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
    it('should accept empty input', () => {
      const result = A2ABoardInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid status filter', () => {
      const result = A2ABoardInputSchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(true);
    });

    it('should accept valid platform filter', () => {
      const result = A2ABoardInputSchema.safeParse({ platform: 'claude-code' });
      expect(result.success).toBe(true);
    });

    it('should accept valid owner filter', () => {
      const result = A2ABoardInputSchema.safeParse({ owner: 'agent-abc-123' });
      expect(result.success).toBe(true);
    });

    it('should accept multiple filters combined', () => {
      const result = A2ABoardInputSchema.safeParse({
        status: 'in_progress',
        platform: 'cursor',
        owner: 'agent-xyz-789',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const result = A2ABoardInputSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2ABoard - Empty Board', () => {
    it('should return empty board when no tasks exist', () => {
      const result = handleA2ABoard({}, testDbPath);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('📋 A2A Task Board');
      expect(text).toContain('0 tasks');
      expect(text).toContain('📥 PENDING (0)');
      expect(text).toContain('🔄 IN PROGRESS (0)');
      expect(text).toContain('✅ COMPLETED (0)');
      expect(text).toContain('(none)');
      expect(text).toContain('Filtered by: (none)');
    });
  });

  describe('handleA2ABoard - With Tasks', () => {
    beforeEach(() => {
      // Create test tasks with different statuses and platforms
      taskBoard.createTask({
        subject: 'Implement feature X',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      taskBoard.createTask({
        subject: 'Fix bug Y',
        status: 'pending',
        creator_platform: 'chatgpt',
      });

      taskBoard.createTask({
        subject: 'Review PR #123',
        status: 'in_progress',
        creator_platform: 'claude-code',
        owner: 'agent-abc-123',
      });

      taskBoard.createTask({
        subject: 'Write tests',
        status: 'in_progress',
        creator_platform: 'cursor',
        owner: 'agent-def-456',
      });

      taskBoard.createTask({
        subject: 'Setup CI/CD',
        status: 'completed',
        creator_platform: 'vscode',
        owner: 'agent-ghi-789',
      });
    });

    it('should display all tasks grouped by status', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      // Check summary
      expect(text).toContain('5 tasks');
      expect(text).toContain('2 pending');
      expect(text).toContain('2 in_progress');
      expect(text).toContain('1 completed');

      // Check pending section
      expect(text).toContain('📥 PENDING (2)');
      expect(text).toContain('Implement feature X');
      expect(text).toContain('Fix bug Y');

      // Check in_progress section
      expect(text).toContain('🔄 IN PROGRESS (2)');
      expect(text).toContain('Review PR #123');
      expect(text).toContain('Write tests');

      // Check completed section
      expect(text).toContain('✅ COMPLETED (1)');
      expect(text).toContain('Setup CI/CD');
    });

    it('should show platform and owner for each task', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Platform: claude-code');
      expect(text).toContain('Platform: chatgpt');
      expect(text).toContain('Platform: cursor');
      expect(text).toContain('Platform: vscode');

      expect(text).toContain('Owner: (unassigned)');
      expect(text).toContain('Owner: agent-abc-123');
      expect(text).toContain('Owner: agent-def-456');
      expect(text).toContain('Owner: agent-ghi-789');
    });

    it('should show short task IDs', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      // Task IDs should be 8 characters (UUID prefix)
      const idPattern = /\[([a-f0-9]{8})\]/g;
      const matches = text.match(idPattern);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(5); // 5 tasks
    });
  });

  describe('handleA2ABoard - Filtering', () => {
    // Note: Use unique task names that won't conflict with title "A2A Task Board"
    // Avoid names like "Task B" which is a substring of "Task Board"
    beforeEach(() => {
      taskBoard.createTask({
        subject: 'Alpha item',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      taskBoard.createTask({
        subject: 'Beta item',
        status: 'pending',
        creator_platform: 'chatgpt',
      });

      taskBoard.createTask({
        subject: 'Gamma item',
        status: 'in_progress',
        creator_platform: 'claude-code',
        owner: 'agent-1',
      });

      taskBoard.createTask({
        subject: 'Delta item',
        status: 'completed',
        creator_platform: 'cursor',
        owner: 'agent-2',
      });
    });

    it('should filter by status', () => {
      const result = handleA2ABoard({ status: 'pending' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('2 tasks');
      expect(text).toContain('Alpha item');
      expect(text).toContain('Beta item');
      expect(text).not.toContain('Gamma item');
      expect(text).not.toContain('Delta item');
      expect(text).toContain('Filtered by: status=pending');
    });

    it('should filter by platform', () => {
      const result = handleA2ABoard({ platform: 'claude-code' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('2 tasks');
      expect(text).toContain('Alpha item');
      expect(text).toContain('Gamma item');
      expect(text).not.toContain('Beta item');
      expect(text).not.toContain('Delta item');
      expect(text).toContain('Filtered by: platform=claude-code');
    });

    it('should filter by owner', () => {
      const result = handleA2ABoard({ owner: 'agent-1' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('1 task');
      expect(text).toContain('Gamma item');
      expect(text).not.toContain('Alpha item');
      expect(text).not.toContain('Beta item');
      expect(text).not.toContain('Delta item');
      expect(text).toContain('Filtered by: owner=agent-1');
    });

    it('should combine multiple filters', () => {
      const result = handleA2ABoard(
        { status: 'in_progress', platform: 'claude-code' },
        testDbPath
      );
      const text = result.content[0].text;

      expect(text).toContain('1 task');
      expect(text).toContain('Gamma item');
      expect(text).toContain('Filtered by: status=in_progress, platform=claude-code');
    });

    it('should return empty results when no tasks match filter', () => {
      const result = handleA2ABoard({ platform: 'nonexistent' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('0 tasks');
      expect(text).toContain('Filtered by: platform=nonexistent');
    });
  });

  describe('handleA2ABoard - Deleted Tasks', () => {
    beforeEach(() => {
      taskBoard.createTask({
        subject: 'Active task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      taskBoard.createTask({
        subject: 'Deleted task',
        status: 'deleted',
        creator_platform: 'claude-code',
      });
    });

    it('should show deleted section when deleted tasks exist', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('🗑️ DELETED (1)');
      expect(text).toContain('Deleted task');
    });

    it('should show deleted section when filtering by deleted status', () => {
      const result = handleA2ABoard({ status: 'deleted' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('🗑️ DELETED (1)');
      expect(text).toContain('Deleted task');
      expect(text).not.toContain('Active task');
    });
  });

  describe('handleA2ABoard - Summary Statistics', () => {
    it('should show correct singular form for 1 task', () => {
      taskBoard.createTask({
        subject: 'Single task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('1 task (');
      expect(text).not.toContain('1 tasks');
    });

    it('should show correct plural form for multiple tasks', () => {
      taskBoard.createTask({
        subject: 'Task 1',
        status: 'pending',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'Task 2',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('2 tasks');
    });

    it('should only show non-zero status counts in summary', () => {
      taskBoard.createTask({
        subject: 'Pending only',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('1 pending');
      expect(text).not.toContain('0 in_progress');
      expect(text).not.toContain('0 completed');
    });
  });

  describe('handleA2ABoard - Output Format', () => {
    it('should have correct header structure', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toMatch(/^📋 A2A Task Board\n={16}\n\n/);
      expect(text).toContain('📊 Summary:');
    });

    it('should have section separators', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      // Check for separator lines (unicode box-drawing character)
      expect(text).toMatch(/─+/);
    });

    it('should have footer with filter info', () => {
      const result = handleA2ABoard({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('---');
      expect(text).toMatch(/Filtered by: .+$/m);
    });

    it('should return proper MCP tool result structure', () => {
      const result = handleA2ABoard({}, testDbPath);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});
