/**
 * @fileoverview Tests for TaskBoard unified storage schema
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskBoard } from '../TaskBoard.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('TaskBoard', () => {
  let taskBoard: TaskBoard;
  let testDbPath: string;

  beforeEach(() => {
    // Create unique test database for each test
    const testDir = path.join(os.tmpdir(), 'taskboard-tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testDbPath = path.join(testDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    taskBoard = new TaskBoard(testDbPath);
  });

  afterEach(() => {
    // Clean up
    if (taskBoard) {
      taskBoard.close();
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Database Configuration', () => {
    it('should enable WAL mode for concurrent access', () => {
      // Query journal mode
      const db = (taskBoard as any).db;
      const result = db.pragma('journal_mode', { simple: true });
      expect(result).toBe('wal');
    });

    it('should enable foreign keys', () => {
      const db = (taskBoard as any).db;
      const result = db.pragma('foreign_keys', { simple: true });
      expect(result).toBe(1);
    });
  });

  describe('Schema Validation', () => {
    it('should create tasks table with correct schema', () => {
      const tables = taskBoard.getTables();
      expect(tables).toContain('tasks');

      const schema = taskBoard.getTableSchema('tasks');
      const columnNames = schema.map((col) => col.name);

      // Verify all required columns exist
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('subject');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('activeForm');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('owner');
      expect(columnNames).toContain('creator_platform');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('metadata');

      // Verify column types
      const idCol = schema.find((col) => col.name === 'id');
      expect(idCol?.type).toBe('TEXT');

      const statusCol = schema.find((col) => col.name === 'status');
      expect(statusCol?.type).toBe('TEXT');

      const createdAtCol = schema.find((col) => col.name === 'created_at');
      expect(createdAtCol?.type).toBe('INTEGER');
    });

    it('should create task_dependencies table', () => {
      const tables = taskBoard.getTables();
      expect(tables).toContain('task_dependencies');

      const schema = taskBoard.getTableSchema('task_dependencies');
      const columnNames = schema.map((col) => col.name);

      expect(columnNames).toContain('task_id');
      expect(columnNames).toContain('blocks');

      // Verify types
      const taskIdCol = schema.find((col) => col.name === 'task_id');
      expect(taskIdCol?.type).toBe('TEXT');

      const blocksCol = schema.find((col) => col.name === 'blocks');
      expect(blocksCol?.type).toBe('TEXT');
    });

    it('should create agents table', () => {
      const tables = taskBoard.getTables();
      expect(tables).toContain('agents');

      const schema = taskBoard.getTableSchema('agents');
      const columnNames = schema.map((col) => col.name);

      // Verify all required columns
      expect(columnNames).toContain('agent_id');
      expect(columnNames).toContain('platform');
      expect(columnNames).toContain('hostname');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('base_url');
      expect(columnNames).toContain('port');
      expect(columnNames).toContain('process_pid');
      expect(columnNames).toContain('skills');
      expect(columnNames).toContain('last_heartbeat');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('created_at');

      // Verify types
      const agentIdCol = schema.find((col) => col.name === 'agent_id');
      expect(agentIdCol?.type).toBe('TEXT');

      const portCol = schema.find((col) => col.name === 'port');
      expect(portCol?.type).toBe('INTEGER');
    });

    it('should create task_history table', () => {
      const tables = taskBoard.getTables();
      expect(tables).toContain('task_history');

      const schema = taskBoard.getTableSchema('task_history');
      const columnNames = schema.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('task_id');
      expect(columnNames).toContain('agent_id');
      expect(columnNames).toContain('action');
      expect(columnNames).toContain('old_status');
      expect(columnNames).toContain('new_status');
      expect(columnNames).toContain('timestamp');

      // Verify types
      const idCol = schema.find((col) => col.name === 'id');
      expect(idCol?.type).toBe('INTEGER');

      const timestampCol = schema.find((col) => col.name === 'timestamp');
      expect(timestampCol?.type).toBe('INTEGER');
    });
  });

  describe('Constraint Enforcement', () => {
    it('should enforce foreign key on task_dependencies', () => {
      const db = (taskBoard as any).db;

      expect(() => {
        db.prepare('INSERT INTO task_dependencies (task_id, blocks) VALUES (?, ?)').run(
          'non-existent',
          'task-1'
        );
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('should enforce status CHECK constraint', () => {
      const db = (taskBoard as any).db;

      expect(() => {
        db.prepare(`
          INSERT INTO tasks (id, subject, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test', 'invalid_status', Date.now(), Date.now());
      }).toThrow(/CHECK constraint failed/);
    });

    it('should CASCADE delete dependencies when task deleted', () => {
      const db = (taskBoard as any).db;
      const now = Date.now();

      // Insert tasks
      db.prepare('INSERT INTO tasks (id, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        'task-1',
        'T1',
        'pending',
        now,
        now
      );
      db.prepare('INSERT INTO tasks (id, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        'task-2',
        'T2',
        'pending',
        now,
        now
      );

      // Insert dependency
      db.prepare('INSERT INTO task_dependencies (task_id, blocks) VALUES (?, ?)').run('task-1', 'task-2');

      // Verify dependency exists
      let deps = db.prepare('SELECT * FROM task_dependencies WHERE task_id = ?').all('task-1');
      expect(deps).toHaveLength(1);

      // Delete task-1
      db.prepare('DELETE FROM tasks WHERE id = ?').run('task-1');

      // Verify dependency deleted (CASCADE)
      deps = db.prepare('SELECT * FROM task_dependencies WHERE task_id = ?').all('task-1');
      expect(deps).toHaveLength(0);
    });

    it('should CASCADE delete task_history when task deleted', () => {
      const db = (taskBoard as any).db;
      const now = Date.now();

      // Insert task
      db.prepare('INSERT INTO tasks (id, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        'task-1',
        'T1',
        'pending',
        now,
        now
      );

      // Insert history entry
      db.prepare(
        'INSERT INTO task_history (task_id, agent_id, action, old_status, new_status, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('task-1', 'agent-1', 'created', null, 'pending', now);

      // Verify history exists
      let history = db.prepare('SELECT * FROM task_history WHERE task_id = ?').all('task-1');
      expect(history).toHaveLength(1);

      // Delete task
      db.prepare('DELETE FROM tasks WHERE id = ?').run('task-1');

      // Verify history deleted (CASCADE)
      history = db.prepare('SELECT * FROM task_history WHERE task_id = ?').all('task-1');
      expect(history).toHaveLength(0);
    });

    it('should enforce agent status CHECK constraint', () => {
      const db = (taskBoard as any).db;

      expect(() => {
        db.prepare(`
          INSERT INTO agents (agent_id, platform, hostname, username, last_heartbeat, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('agent-1', 'claude-code', 'localhost', 'user', Date.now(), 'invalid_status', Date.now());
      }).toThrow(/CHECK constraint failed/);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid table name in getTableSchema', () => {
      expect(() => taskBoard.getTableSchema('DROP TABLE tasks')).toThrow('Invalid table name');
    });

    it('should throw on SQL injection attempt in getTableSchema', () => {
      expect(() => taskBoard.getTableSchema("tasks'; DROP TABLE tasks; --")).toThrow('Invalid table name');
    });

    it('should throw on path traversal attempt', () => {
      expect(() => new TaskBoard('../../etc/passwd')).toThrow(/Path traversal not allowed/);
    });

    it('should throw on empty dbPath', () => {
      expect(() => new TaskBoard('')).toThrow('dbPath must be a non-empty string');
    });

    it('should throw on non-string dbPath', () => {
      expect(() => new TaskBoard('   ')).toThrow('dbPath must be a non-empty string');
    });

    it('should handle close() being called multiple times (idempotency)', () => {
      expect(() => {
        taskBoard.close();
        taskBoard.close();
      }).not.toThrow();
    });
  });

  describe('Task CRUD Operations', () => {
    describe('createTask', () => {
      it('should create task with all fields', () => {
        const taskId = taskBoard.createTask({
          subject: 'Test Task',
          description: 'This is a test task',
          activeForm: 'form-1',
          status: 'pending',
          owner: 'agent-1',
          creator_platform: 'claude-code',
          metadata: { priority: 'high', tags: ['test', 'important'] },
        });

        expect(taskId).toBeDefined();
        expect(typeof taskId).toBe('string');
        expect(taskId.length).toBeGreaterThan(0);

        // Verify task was created
        const task = taskBoard.getTask(taskId);
        expect(task).toBeDefined();
        expect(task?.subject).toBe('Test Task');
        expect(task?.description).toBe('This is a test task');
        expect(task?.activeForm).toBe('form-1');
        expect(task?.status).toBe('pending');
        expect(task?.owner).toBe('agent-1');
        expect(task?.creator_platform).toBe('claude-code');
        expect(task?.metadata).toBe(JSON.stringify({ priority: 'high', tags: ['test', 'important'] }));
      });

      it('should create task with minimal required fields', () => {
        const taskId = taskBoard.createTask({
          subject: 'Minimal Task',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        expect(taskId).toBeDefined();

        const task = taskBoard.getTask(taskId);
        expect(task).toBeDefined();
        expect(task?.subject).toBe('Minimal Task');
        expect(task?.status).toBe('pending');
        expect(task?.creator_platform).toBe('claude-code');
        expect(task?.description).toBeUndefined();
        expect(task?.owner).toBeUndefined();
        expect(task?.metadata).toBeUndefined();
      });

      it('should throw on empty subject', () => {
        expect(() =>
          taskBoard.createTask({
            subject: '',
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task subject is required');
      });

      it('should throw on whitespace-only subject', () => {
        expect(() =>
          taskBoard.createTask({
            subject: '   ',
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task subject is required');
      });

      it('should throw on missing subject', () => {
        expect(() =>
          taskBoard.createTask({
            subject: undefined as any,
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task subject is required');
      });

      it('should throw on missing status', () => {
        expect(() =>
          taskBoard.createTask({
            subject: 'Test',
            status: undefined as any,
            creator_platform: 'claude-code',
          })
        ).toThrow('Task status is required');
      });

      it('should throw on missing creator_platform', () => {
        expect(() =>
          taskBoard.createTask({
            subject: 'Test',
            status: 'pending',
            creator_platform: undefined as any,
          })
        ).toThrow('Creator platform is required');
      });

      it('should set created_at and updated_at timestamps', () => {
        const beforeCreate = Date.now();
        const taskId = taskBoard.createTask({
          subject: 'Time Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });
        const afterCreate = Date.now();

        const task = taskBoard.getTask(taskId);
        expect(task?.created_at).toBeGreaterThanOrEqual(beforeCreate);
        expect(task?.created_at).toBeLessThanOrEqual(afterCreate);
        expect(task?.updated_at).toBe(task?.created_at);
      });

      it('should generate unique task IDs', () => {
        const id1 = taskBoard.createTask({
          subject: 'Task 1',
          status: 'pending',
          creator_platform: 'claude-code',
        });
        const id2 = taskBoard.createTask({
          subject: 'Task 2',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        expect(id1).not.toBe(id2);
      });

      it('should throw when subject exceeds maximum length', () => {
        const longSubject = 'a'.repeat(501); // Exceeds MAX_SUBJECT_LENGTH of 500
        expect(() =>
          taskBoard.createTask({
            subject: longSubject,
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task subject exceeds maximum length of 500 characters');
      });

      it('should throw when description exceeds maximum length', () => {
        const longDescription = 'a'.repeat(10001); // Exceeds MAX_DESCRIPTION_LENGTH of 10000
        expect(() =>
          taskBoard.createTask({
            subject: 'Test',
            description: longDescription,
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task description exceeds maximum length of 10000 characters');
      });

      it('should throw when activeForm exceeds maximum length', () => {
        const longActiveForm = 'a'.repeat(501); // Exceeds MAX_ACTIVE_FORM_LENGTH of 500
        expect(() =>
          taskBoard.createTask({
            subject: 'Test',
            activeForm: longActiveForm,
            status: 'pending',
            creator_platform: 'claude-code',
          })
        ).toThrow('Task activeForm exceeds maximum length of 500 characters');
      });
    });

    describe('getTask', () => {
      it('should return existing task', () => {
        const taskId = taskBoard.createTask({
          subject: 'Get Task Test',
          description: 'Test description',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });

        const task = taskBoard.getTask(taskId);
        expect(task).toBeDefined();
        expect(task?.id).toBe(taskId);
        expect(task?.subject).toBe('Get Task Test');
        expect(task?.description).toBe('Test description');
        expect(task?.status).toBe('in_progress');
        expect(task?.owner).toBe('agent-1');
      });

      it('should return null for non-existent task', () => {
        // Use valid UUID format that doesn't exist
        const task = taskBoard.getTask('12345678-1234-4567-8901-234567890123');
        expect(task).toBeNull();
      });

      it('should deserialize metadata correctly', () => {
        const metadata = { key: 'value', nested: { prop: 123 } };
        const taskId = taskBoard.createTask({
          subject: 'Metadata Test',
          status: 'pending',
          creator_platform: 'claude-code',
          metadata,
        });

        const task = taskBoard.getTask(taskId);
        expect(task?.metadata).toBe(JSON.stringify(metadata));
      });

      it('should throw on invalid task ID format', () => {
        expect(() => taskBoard.getTask('not-a-uuid')).toThrow('Invalid task ID format: not-a-uuid');
      });

      it('should handle corrupted metadata gracefully', () => {
        const db = (taskBoard as any).db;
        const taskId = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
        const now = Date.now();

        // Manually insert task with corrupted JSON metadata
        db.prepare(`
          INSERT INTO tasks (id, subject, status, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(taskId, 'Corrupted Task', 'pending', now, now, '{invalid json');

        // Should not throw, but return undefined metadata
        const task = taskBoard.getTask(taskId);
        expect(task).not.toBeNull();
        expect(task?.metadata).toBeUndefined();
      });
    });

    describe('listTasks', () => {
      beforeEach(() => {
        // Create test tasks
        taskBoard.createTask({
          subject: 'Task 1',
          status: 'pending',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });
        taskBoard.createTask({
          subject: 'Task 2',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });
        taskBoard.createTask({
          subject: 'Task 3',
          status: 'completed',
          owner: 'agent-2',
          creator_platform: 'mcp-server',
        });
        taskBoard.createTask({
          subject: 'Task 4',
          status: 'pending',
          owner: 'agent-2',
          creator_platform: 'mcp-server',
        });
      });

      it('should list all tasks when no filter provided', () => {
        const tasks = taskBoard.listTasks();
        expect(tasks).toHaveLength(4);
      });

      it('should filter tasks by status', () => {
        const pending = taskBoard.listTasks({ status: 'pending' });
        expect(pending).toHaveLength(2);
        expect(pending.every((t) => t.status === 'pending')).toBe(true);

        const inProgress = taskBoard.listTasks({ status: 'in_progress' });
        expect(inProgress).toHaveLength(1);
        expect(inProgress[0].subject).toBe('Task 2');

        const completed = taskBoard.listTasks({ status: 'completed' });
        expect(completed).toHaveLength(1);
        expect(completed[0].subject).toBe('Task 3');
      });

      it('should filter tasks by owner', () => {
        const agent1Tasks = taskBoard.listTasks({ owner: 'agent-1' });
        expect(agent1Tasks).toHaveLength(2);
        expect(agent1Tasks.every((t) => t.owner === 'agent-1')).toBe(true);

        const agent2Tasks = taskBoard.listTasks({ owner: 'agent-2' });
        expect(agent2Tasks).toHaveLength(2);
        expect(agent2Tasks.every((t) => t.owner === 'agent-2')).toBe(true);
      });

      it('should filter tasks by creator_platform', () => {
        const claudeTasks = taskBoard.listTasks({ creator_platform: 'claude-code' });
        expect(claudeTasks).toHaveLength(2);
        expect(claudeTasks.every((t) => t.creator_platform === 'claude-code')).toBe(true);

        const mcpTasks = taskBoard.listTasks({ creator_platform: 'mcp-server' });
        expect(mcpTasks).toHaveLength(2);
        expect(mcpTasks.every((t) => t.creator_platform === 'mcp-server')).toBe(true);
      });

      it('should filter tasks by multiple criteria', () => {
        const filtered = taskBoard.listTasks({
          status: 'pending',
          owner: 'agent-2',
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].subject).toBe('Task 4');
        expect(filtered[0].status).toBe('pending');
        expect(filtered[0].owner).toBe('agent-2');
      });

      it('should return empty array when no tasks match filter', () => {
        const tasks = taskBoard.listTasks({ status: 'deleted' });
        expect(tasks).toHaveLength(0);
      });
    });

    describe('updateTaskStatus', () => {
      it('should update task status', () => {
        const taskId = taskBoard.createTask({
          subject: 'Update Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        taskBoard.updateTaskStatus(taskId, 'in_progress');

        const task = taskBoard.getTask(taskId);
        expect(task?.status).toBe('in_progress');
      });

      it('should update updated_at timestamp', async () => {
        const taskId = taskBoard.createTask({
          subject: 'Timestamp Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        const originalTask = taskBoard.getTask(taskId);
        const originalUpdatedAt = originalTask?.updated_at;

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        taskBoard.updateTaskStatus(taskId, 'in_progress');

        const updatedTask = taskBoard.getTask(taskId);
        expect(updatedTask?.updated_at).toBeGreaterThan(originalUpdatedAt!);
        expect(updatedTask?.created_at).toBe(originalTask?.created_at);
      });

      it('should throw on non-existent task', () => {
        expect(() => {
          // Use valid UUID format that doesn't exist
          taskBoard.updateTaskStatus('12345678-1234-4567-8901-234567890123', 'in_progress');
        }).toThrow('Task not found');
      });

      it('should throw on invalid status', () => {
        const taskId = taskBoard.createTask({
          subject: 'Invalid Status Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        expect(() => {
          taskBoard.updateTaskStatus(taskId, 'invalid_status' as any);
        }).toThrow(/CHECK constraint failed/);
      });

      it('should throw on invalid task ID format in updateTaskStatus', () => {
        expect(() => {
          taskBoard.updateTaskStatus('not-a-uuid', 'in_progress');
        }).toThrow('Invalid task ID format: not-a-uuid');
      });
    });

    describe('deleteTask', () => {
      it('should delete task', () => {
        const taskId = taskBoard.createTask({
          subject: 'Delete Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        // Verify task exists
        expect(taskBoard.getTask(taskId)).toBeDefined();

        // Delete task
        taskBoard.deleteTask(taskId);

        // Verify task is gone
        expect(taskBoard.getTask(taskId)).toBeNull();
      });

      it('should throw on non-existent task', () => {
        expect(() => {
          // Use valid UUID format that doesn't exist
          taskBoard.deleteTask('12345678-1234-4567-8901-234567890123');
        }).toThrow('Task not found');
      });

      it('should cascade delete dependencies', () => {
        const db = (taskBoard as any).db;

        // Create tasks
        const task1 = taskBoard.createTask({
          subject: 'Task 1',
          status: 'pending',
          creator_platform: 'claude-code',
        });
        const task2 = taskBoard.createTask({
          subject: 'Task 2',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        // Create dependency
        db.prepare('INSERT INTO task_dependencies (task_id, blocks) VALUES (?, ?)').run(task1, task2);

        // Verify dependency exists
        let deps = db.prepare('SELECT * FROM task_dependencies WHERE task_id = ?').all(task1);
        expect(deps).toHaveLength(1);

        // Delete task1
        taskBoard.deleteTask(task1);

        // Verify dependency deleted (CASCADE)
        deps = db.prepare('SELECT * FROM task_dependencies WHERE task_id = ?').all(task1);
        expect(deps).toHaveLength(0);
      });

      it('should cascade delete task history', () => {
        const db = (taskBoard as any).db;

        // Create task
        const taskId = taskBoard.createTask({
          subject: 'History Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        // Create history entry
        db.prepare(
          'INSERT INTO task_history (task_id, agent_id, action, old_status, new_status, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(taskId, 'agent-1', 'created', null, 'pending', Date.now());

        // Verify history exists
        let history = db.prepare('SELECT * FROM task_history WHERE task_id = ?').all(taskId);
        expect(history).toHaveLength(1);

        // Delete task
        taskBoard.deleteTask(taskId);

        // Verify history deleted (CASCADE)
        history = db.prepare('SELECT * FROM task_history WHERE task_id = ?').all(taskId);
        expect(history).toHaveLength(0);
      });

      it('should throw on invalid task ID format in deleteTask', () => {
        expect(() => {
          taskBoard.deleteTask('not-a-uuid');
        }).toThrow('Invalid task ID format: not-a-uuid');
      });
    });
  });
});
