/**
 * Tests for a2a-find-tasks MCP Tool
 *
 * Comprehensive test coverage for finding tasks by skill-based matching
 * from the unified task board.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleA2AFindTasks, A2AFindTasksInputSchema } from '../a2a-find-tasks.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('a2a-find-tasks MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(
      os.tmpdir(),
      `test-a2a-find-tasks-${Date.now()}-${Math.random().toString(36).substring(7)}.db`
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
    it('should accept empty input (no filters)', () => {
      const result = A2AFindTasksInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept skills array', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        skills: ['typescript', 'testing'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept status filter', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        status: 'in_progress',
      });
      expect(result.success).toBe(true);
    });

    it('should accept limit parameter', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should accept combined parameters', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        skills: ['typescript'],
        status: 'pending',
        limit: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit below 1', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 50', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        limit: 51,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-array skills', () => {
      const result = A2AFindTasksInputSchema.safeParse({
        skills: 'typescript',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2AFindTasks - Find All Pending Tasks (No Skills Filter)', () => {
    it('should return all pending tasks when no skills provided', () => {
      // Create test tasks
      taskBoard.createTask({
        subject: 'Task 1',
        status: 'pending',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'Task 2',
        status: 'pending',
        creator_platform: 'chatgpt',
      });
      taskBoard.createTask({
        subject: 'Task 3',
        status: 'in_progress',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({}, testDbPath);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('Found 2 task(s)');
      expect(text).toContain('Task 1');
      expect(text).toContain('Task 2');
      expect(text).not.toContain('Task 3'); // in_progress, not pending
    });
  });

  describe('handleA2AFindTasks - Find Tasks Matching Single Skill in Subject', () => {
    it('should find tasks with skill keyword in subject (case-insensitive)', () => {
      taskBoard.createTask({
        subject: 'Implement TypeScript validator',
        status: 'pending',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'Write Python script',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({ skills: ['typescript'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 1 task(s)');
      expect(text).toContain('TypeScript validator');
      expect(text).toContain('Matched skills: typescript');
      expect(text).not.toContain('Python');
    });
  });

  describe('handleA2AFindTasks - Find Tasks Matching Skill in Metadata', () => {
    it('should find tasks with skill in metadata.required_skills', () => {
      taskBoard.createTask({
        subject: 'Backend API task',
        status: 'pending',
        creator_platform: 'claude-code',
        metadata: {
          required_skills: ['nodejs', 'testing'],
        },
      });
      taskBoard.createTask({
        subject: 'Frontend task',
        status: 'pending',
        creator_platform: 'chatgpt',
        metadata: {
          required_skills: ['react', 'css'],
        },
      });

      const result = handleA2AFindTasks({ skills: ['testing'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 1 task(s)');
      expect(text).toContain('Backend API task');
      expect(text).toContain('Matched skills: testing');
    });
  });

  describe('handleA2AFindTasks - Multiple Skills Matching with Relevance Sorting', () => {
    it('should sort tasks by number of matched skills (most matches first)', () => {
      // Task with 3 unique skill matches (typescript + testing + nodejs)
      taskBoard.createTask({
        subject: 'Full stack project',
        status: 'pending',
        creator_platform: 'claude-code',
        metadata: {
          required_skills: ['typescript', 'testing', 'nodejs'],
        },
      });

      // Task with 1 unique skill match (testing from subject only)
      taskBoard.createTask({
        subject: 'Simple testing task',
        status: 'pending',
        creator_platform: 'chatgpt',
        metadata: {
          required_skills: ['python'],
        },
      });

      // Task with 2 unique skill matches (typescript + testing)
      taskBoard.createTask({
        subject: 'TypeScript validator',
        status: 'pending',
        creator_platform: 'cursor',
        metadata: {
          required_skills: ['testing'],
        },
      });

      const result = handleA2AFindTasks({ skills: ['typescript', 'testing', 'nodejs'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 3 task(s)');

      // Check order - tasks with more unique skill matches should appear first
      const task1Pos = text.indexOf('Full stack project');  // 3 matches
      const task2Pos = text.indexOf('Simple testing task'); // 1 match
      const task3Pos = text.indexOf('TypeScript validator'); // 2 matches

      // Task 1 (3 matches) should be first
      // Task 3 (2 matches) should be second
      // Task 2 (1 match) should be last
      expect(task1Pos).toBeLessThan(task3Pos);
      expect(task3Pos).toBeLessThan(task2Pos);
    });
  });

  describe('handleA2AFindTasks - No Matching Tasks', () => {
    it('should return helpful message when no tasks match', () => {
      taskBoard.createTask({
        subject: 'Python backend task',
        status: 'pending',
        creator_platform: 'claude-code',
        metadata: {
          required_skills: ['python', 'django'],
        },
      });

      const result = handleA2AFindTasks({ skills: ['rust', 'go'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('No tasks found');
      expect(text).toContain('rust');
      expect(text).toContain('go');
      expect(text).toContain('pending');
      expect(text).toContain('Tip:');
    });

    it('should return empty result message when no tasks exist', () => {
      const result = handleA2AFindTasks({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('No tasks found');
    });
  });

  describe('handleA2AFindTasks - Limit Parameter', () => {
    it('should respect limit parameter', () => {
      // Create 5 tasks
      for (let i = 1; i <= 5; i++) {
        taskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'claude-code',
        });
      }

      const result = handleA2AFindTasks({ limit: 3 }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 3 task(s)');
      expect(text).toContain('Showing 3 of 5');
    });

    it('should use default limit of 10', () => {
      // Create 15 tasks
      for (let i = 1; i <= 15; i++) {
        taskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'claude-code',
        });
      }

      const result = handleA2AFindTasks({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 10 task(s)');
      expect(text).toContain('Showing 10 of 15');
    });
  });

  describe('handleA2AFindTasks - Status Filter', () => {
    it('should filter by status', () => {
      taskBoard.createTask({
        subject: 'Pending task',
        status: 'pending',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'In progress task',
        status: 'in_progress',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'Completed task',
        status: 'completed',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({ status: 'in_progress' }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Found 1 task(s)');
      expect(text).toContain('In progress task');
      expect(text).not.toContain('Pending task');
      expect(text).not.toContain('Completed task');
    });

    it('should default to pending status', () => {
      taskBoard.createTask({
        subject: 'Pending task',
        status: 'pending',
        creator_platform: 'claude-code',
      });
      taskBoard.createTask({
        subject: 'In progress task',
        status: 'in_progress',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('Pending task');
      expect(text).not.toContain('In progress task');
    });
  });

  describe('handleA2AFindTasks - Output Format', () => {
    it('should return proper MCP tool result structure', () => {
      taskBoard.createTask({
        subject: 'Format test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({}, testDbPath);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include search indicator in output', () => {
      taskBoard.createTask({
        subject: 'Test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({}, testDbPath);
      const text = result.content[0].text;

      // Should have search indicator emoji
      expect(text).toMatch(/[🔍]/);
    });

    it('should include task details in output', () => {
      const taskId = taskBoard.createTask({
        subject: 'Detailed task',
        status: 'pending',
        creator_platform: 'cursor',
      });

      const result = handleA2AFindTasks({}, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain(taskId.substring(0, 8)); // Short ID
      expect(text).toContain('Detailed task');
      expect(text).toContain('pending');
      expect(text).toContain('cursor');
    });
  });

  describe('handleA2AFindTasks - Edge Cases', () => {
    it('should handle empty skills array', () => {
      taskBoard.createTask({
        subject: 'Test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({ skills: [] }, testDbPath);
      const text = result.content[0].text;

      // Empty skills array should return all tasks matching status
      expect(text).toContain('Found 1 task(s)');
    });

    it('should handle tasks without metadata', () => {
      taskBoard.createTask({
        subject: 'Task without metadata',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const result = handleA2AFindTasks({ skills: ['typescript'] }, testDbPath);
      const text = result.content[0].text;

      // Should not crash, just no match
      expect(text).toContain('No tasks found');
    });

    it('should handle tasks with empty required_skills array', () => {
      taskBoard.createTask({
        subject: 'Task with empty skills',
        status: 'pending',
        creator_platform: 'claude-code',
        metadata: {
          required_skills: [],
        },
      });

      const result = handleA2AFindTasks({ skills: ['typescript'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('No tasks found');
    });

    it('should handle partial word matches in subject', () => {
      taskBoard.createTask({
        subject: 'TypeScript integration',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      // "type" should NOT match "TypeScript" (we want whole word or skill matches)
      const result = handleA2AFindTasks({ skills: ['typescript'] }, testDbPath);
      const text = result.content[0].text;

      // "typescript" should match "TypeScript" (case-insensitive)
      expect(text).toContain('Found 1 task(s)');
    });
  });
});
