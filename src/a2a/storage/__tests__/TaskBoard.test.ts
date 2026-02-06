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

  describe('Task Claiming and Releasing', () => {
    describe('claimTask', () => {
      it('should claim a pending task successfully', () => {
        const taskId = taskBoard.createTask({
          subject: 'Pending Task',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        taskBoard.claimTask(taskId, 'agent-1');

        const task = taskBoard.getTask(taskId);
        expect(task?.status).toBe('in_progress');
        expect(task?.owner).toBe('agent-1');
      });

      it('should throw when claiming non-pending task', () => {
        const taskId = taskBoard.createTask({
          subject: 'In Progress Task',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });

        expect(() => {
          taskBoard.claimTask(taskId, 'agent-2');
        }).toThrow(/not in pending status/);
      });

      it('should throw when claiming non-existent task', () => {
        expect(() => {
          taskBoard.claimTask('12345678-1234-4567-8901-234567890123', 'agent-1');
        }).toThrow('Task not found');
      });

      it('should update task owner and status when claimed', () => {
        const taskId = taskBoard.createTask({
          subject: 'Claim Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        const beforeClaim = taskBoard.getTask(taskId);
        expect(beforeClaim?.owner).toBeUndefined();
        expect(beforeClaim?.status).toBe('pending');

        taskBoard.claimTask(taskId, 'agent-1');

        const afterClaim = taskBoard.getTask(taskId);
        expect(afterClaim?.owner).toBe('agent-1');
        expect(afterClaim?.status).toBe('in_progress');
      });

      it('should record history when task is claimed', () => {
        const taskId = taskBoard.createTask({
          subject: 'History Claim Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        taskBoard.claimTask(taskId, 'agent-1');

        const history = taskBoard.getTaskHistory(taskId);
        expect(history).toHaveLength(1);
        expect(history[0].task_id).toBe(taskId);
        expect(history[0].agent_id).toBe('agent-1');
        expect(history[0].action).toBe('claimed');
        expect(history[0].old_status).toBe('pending');
        expect(history[0].new_status).toBe('in_progress');
        expect(history[0].timestamp).toBeGreaterThan(0);
      });

      it('should throw on empty agent ID', () => {
        const taskId = taskBoard.createTask({
          subject: 'Test Task',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        expect(() => {
          taskBoard.claimTask(taskId, '');
        }).toThrow('Agent ID is required');
      });

      it('should throw on whitespace-only agent ID', () => {
        const taskId = taskBoard.createTask({
          subject: 'Test Task',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        expect(() => {
          taskBoard.claimTask(taskId, '   ');
        }).toThrow('Agent ID is required');
      });

      it('should throw on invalid task ID format', () => {
        expect(() => {
          taskBoard.claimTask('not-a-uuid', 'agent-1');
        }).toThrow('Invalid task ID format');
      });
    });

    describe('releaseTask', () => {
      it('should release a claimed task back to pending', () => {
        const taskId = taskBoard.createTask({
          subject: 'Claimed Task',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });

        taskBoard.releaseTask(taskId);

        const task = taskBoard.getTask(taskId);
        expect(task?.status).toBe('pending');
        expect(task?.owner).toBeUndefined();
      });

      it('should update task owner to null and status to pending', () => {
        const taskId = taskBoard.createTask({
          subject: 'Release Test',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });

        const beforeRelease = taskBoard.getTask(taskId);
        expect(beforeRelease?.owner).toBe('agent-1');
        expect(beforeRelease?.status).toBe('in_progress');

        taskBoard.releaseTask(taskId);

        const afterRelease = taskBoard.getTask(taskId);
        expect(afterRelease?.owner).toBeUndefined();
        expect(afterRelease?.status).toBe('pending');
      });

      it('should record history when task is released', () => {
        const taskId = taskBoard.createTask({
          subject: 'History Release Test',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        });

        taskBoard.releaseTask(taskId);

        const history = taskBoard.getTaskHistory(taskId);
        expect(history).toHaveLength(1);
        expect(history[0].task_id).toBe(taskId);
        expect(history[0].agent_id).toBe('agent-1');
        expect(history[0].action).toBe('released');
        expect(history[0].old_status).toBe('in_progress');
        expect(history[0].new_status).toBe('pending');
        expect(history[0].timestamp).toBeGreaterThan(0);
      });

      it('should throw on non-existent task', () => {
        expect(() => {
          taskBoard.releaseTask('12345678-1234-4567-8901-234567890123');
        }).toThrow('Task not found');
      });

      it('should throw on invalid task ID format', () => {
        expect(() => {
          taskBoard.releaseTask('not-a-uuid');
        }).toThrow('Invalid task ID format');
      });
    });

    describe('getTaskHistory', () => {
      it('should return task history in reverse chronological order', async () => {
        const taskId = taskBoard.createTask({
          subject: 'History Order Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        // Claim task
        taskBoard.claimTask(taskId, 'agent-1');

        // Wait a bit to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Release task
        taskBoard.releaseTask(taskId);

        // Wait a bit to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Claim again
        taskBoard.claimTask(taskId, 'agent-2');

        const history = taskBoard.getTaskHistory(taskId);
        expect(history).toHaveLength(3);

        // Verify newest first (reverse chronological)
        expect(history[0].action).toBe('claimed');
        expect(history[0].agent_id).toBe('agent-2');
        expect(history[1].action).toBe('released');
        expect(history[1].agent_id).toBe('agent-1');
        expect(history[2].action).toBe('claimed');
        expect(history[2].agent_id).toBe('agent-1');

        // Verify timestamps are in descending order
        expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
        expect(history[1].timestamp).toBeGreaterThan(history[2].timestamp);
      });

      it('should return empty array for task with no history', () => {
        const taskId = taskBoard.createTask({
          subject: 'No History Task',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        const history = taskBoard.getTaskHistory(taskId);
        expect(history).toHaveLength(0);
      });

      it('should return empty array for non-existent task', () => {
        const history = taskBoard.getTaskHistory('12345678-1234-4567-8901-234567890123');
        expect(history).toHaveLength(0);
      });

      it('should include all history entry fields', () => {
        const taskId = taskBoard.createTask({
          subject: 'Fields Test',
          status: 'pending',
          creator_platform: 'claude-code',
        });

        taskBoard.claimTask(taskId, 'agent-1');

        const history = taskBoard.getTaskHistory(taskId);
        expect(history).toHaveLength(1);

        const entry = history[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('task_id');
        expect(entry).toHaveProperty('agent_id');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('old_status');
        expect(entry).toHaveProperty('new_status');
        expect(entry).toHaveProperty('timestamp');

        expect(typeof entry.id).toBe('number');
        expect(typeof entry.task_id).toBe('string');
        expect(typeof entry.agent_id).toBe('string');
        expect(typeof entry.action).toBe('string');
        expect(typeof entry.timestamp).toBe('number');
      });

      it('should throw on invalid task ID format', () => {
        expect(() => {
          taskBoard.getTaskHistory('not-a-uuid');
        }).toThrow('Invalid task ID format');
      });
    });
  });

  describe('Agent Registry', () => {
    describe('registerAgent', () => {
      it('should register agent with all fields', () => {
        const beforeRegister = Date.now();
        taskBoard.registerAgent({
          agent_id: 'agent-1',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'test-user',
          base_url: 'http://localhost:3000',
          port: 3000,
          process_pid: 12345,
          skills: ['code-review', 'refactoring', 'testing'],
        });
        const afterRegister = Date.now();

        const agent = taskBoard.getAgent('agent-1');
        expect(agent).toBeDefined();
        expect(agent?.agent_id).toBe('agent-1');
        expect(agent?.platform).toBe('claude-code');
        expect(agent?.hostname).toBe('localhost');
        expect(agent?.username).toBe('test-user');
        expect(agent?.base_url).toBe('http://localhost:3000');
        expect(agent?.port).toBe(3000);
        expect(agent?.process_pid).toBe(12345);
        expect(agent?.skills).toBe(JSON.stringify(['code-review', 'refactoring', 'testing']));
        expect(agent?.status).toBe('active');
        expect(agent?.last_heartbeat).toBeGreaterThanOrEqual(beforeRegister);
        expect(agent?.last_heartbeat).toBeLessThanOrEqual(afterRegister);
        expect(agent?.created_at).toBeGreaterThanOrEqual(beforeRegister);
        expect(agent?.created_at).toBeLessThanOrEqual(afterRegister);
      });

      it('should register agent with minimal fields (only required)', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-minimal',
          platform: 'mcp-server',
          hostname: 'server1',
          username: 'user1',
        });

        const agent = taskBoard.getAgent('agent-minimal');
        expect(agent).toBeDefined();
        expect(agent?.agent_id).toBe('agent-minimal');
        expect(agent?.platform).toBe('mcp-server');
        expect(agent?.hostname).toBe('server1');
        expect(agent?.username).toBe('user1');
        expect(agent?.base_url).toBeNull();
        expect(agent?.port).toBeNull();
        expect(agent?.process_pid).toBeNull();
        expect(agent?.skills).toBeNull();
        expect(agent?.status).toBe('active');
      });

      it('should upsert agent on re-registration (preserving created_at)', async () => {
        // First registration
        taskBoard.registerAgent({
          agent_id: 'agent-upsert',
          platform: 'claude-code',
          hostname: 'host1',
          username: 'user1',
          skills: ['skill1'],
        });

        const firstAgent = taskBoard.getAgent('agent-upsert');
        const originalCreatedAt = firstAgent?.created_at;
        const originalHeartbeat = firstAgent?.last_heartbeat;

        // Wait to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Re-register with updated info
        taskBoard.registerAgent({
          agent_id: 'agent-upsert',
          platform: 'claude-code-v2',
          hostname: 'host2',
          username: 'user2',
          skills: ['skill2', 'skill3'],
        });

        const secondAgent = taskBoard.getAgent('agent-upsert');
        expect(secondAgent?.platform).toBe('claude-code-v2');
        expect(secondAgent?.hostname).toBe('host2');
        expect(secondAgent?.username).toBe('user2');
        expect(secondAgent?.skills).toBe(JSON.stringify(['skill2', 'skill3']));
        expect(secondAgent?.created_at).toBe(originalCreatedAt); // PRESERVED
        expect(secondAgent?.last_heartbeat).toBeGreaterThan(originalHeartbeat!); // UPDATED
      });

      it('should throw on missing agent_id', () => {
        expect(() =>
          taskBoard.registerAgent({
            agent_id: '',
            platform: 'claude-code',
            hostname: 'localhost',
            username: 'user',
          })
        ).toThrow(/agent_id.*required/);
      });

      it('should throw on missing platform', () => {
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: '',
            hostname: 'localhost',
            username: 'user',
          })
        ).toThrow(/platform.*required/);
      });

      it('should throw on missing hostname', () => {
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: 'claude-code',
            hostname: '',
            username: 'user',
          })
        ).toThrow(/hostname.*required/);
      });

      it('should throw on missing username', () => {
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: 'claude-code',
            hostname: 'localhost',
            username: '',
          })
        ).toThrow(/username.*required/);
      });

      it('should serialize skills to JSON correctly', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-skills',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
          skills: ['skill-a', 'skill-b', 'skill-c'],
        });

        const agent = taskBoard.getAgent('agent-skills');
        expect(agent?.skills).toBe(JSON.stringify(['skill-a', 'skill-b', 'skill-c']));

        // Verify it's valid JSON
        const parsed = JSON.parse(agent!.skills!);
        expect(parsed).toEqual(['skill-a', 'skill-b', 'skill-c']);
      });

      it('should throw on agent_id exceeding max length', () => {
        const longAgentId = 'a'.repeat(501); // MAX_AGENT_ID_LENGTH is 500
        expect(() =>
          taskBoard.registerAgent({
            agent_id: longAgentId,
            platform: 'claude-code',
            hostname: 'localhost',
            username: 'user',
          })
        ).toThrow(/agent_id exceeds maximum length of 500 characters/);
      });

      it('should throw on platform exceeding max length', () => {
        const longPlatform = 'p'.repeat(101); // MAX_PLATFORM_LENGTH is 100
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: longPlatform,
            hostname: 'localhost',
            username: 'user',
          })
        ).toThrow(/platform exceeds maximum length of 100 characters/);
      });

      it('should throw on hostname exceeding max length', () => {
        const longHostname = 'h'.repeat(256); // MAX_HOSTNAME_LENGTH is 255
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: 'claude-code',
            hostname: longHostname,
            username: 'user',
          })
        ).toThrow(/hostname exceeds maximum length of 255 characters/);
      });

      it('should throw on username exceeding max length', () => {
        const longUsername = 'u'.repeat(256); // MAX_USERNAME_LENGTH is 255
        expect(() =>
          taskBoard.registerAgent({
            agent_id: 'agent-1',
            platform: 'claude-code',
            hostname: 'localhost',
            username: longUsername,
          })
        ).toThrow(/username exceeds maximum length of 255 characters/);
      });
    });

    describe('getAgent', () => {
      it('should return existing agent', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-get',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
        });

        const agent = taskBoard.getAgent('agent-get');
        expect(agent).toBeDefined();
        expect(agent?.agent_id).toBe('agent-get');
      });

      it('should return null for non-existent agent', () => {
        const agent = taskBoard.getAgent('non-existent-agent');
        expect(agent).toBeNull();
      });

      it('should parse skills JSON correctly', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-parse',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
          skills: ['a', 'b'],
        });

        const agent = taskBoard.getAgent('agent-parse');
        expect(agent?.skills).toBe(JSON.stringify(['a', 'b']));
      });

      it('should return null for corrupted skills JSON', () => {
        // Manually insert agent with corrupted JSON
        const db = (taskBoard as any).db;
        const now = Date.now();
        db.prepare(`
          INSERT INTO agents (agent_id, platform, hostname, username, skills, last_heartbeat, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('agent-corrupted', 'claude-code', 'localhost', 'user', '{invalid json', now, 'active', now);

        const agent = taskBoard.getAgent('agent-corrupted');
        expect(agent).toBeDefined();
        expect(agent?.agent_id).toBe('agent-corrupted');
        expect(agent?.skills).toBeNull(); // Should return null for corrupted JSON
      });
    });

    describe('listAgents', () => {
      beforeEach(() => {
        // Create test agents
        taskBoard.registerAgent({
          agent_id: 'agent-1',
          platform: 'claude-code',
          hostname: 'host1',
          username: 'user1',
        });
        taskBoard.registerAgent({
          agent_id: 'agent-2',
          platform: 'claude-code',
          hostname: 'host2',
          username: 'user2',
        });
        taskBoard.registerAgent({
          agent_id: 'agent-3',
          platform: 'mcp-server',
          hostname: 'host3',
          username: 'user3',
        });

        // Manually set one agent to inactive for filtering tests
        const db = (taskBoard as any).db;
        db.prepare("UPDATE agents SET status = 'inactive' WHERE agent_id = ?").run('agent-2');
      });

      it('should list all agents when no filter provided', () => {
        const agents = taskBoard.listAgents();
        expect(agents).toHaveLength(3);
      });

      it('should filter agents by status', () => {
        const active = taskBoard.listAgents({ status: 'active' });
        expect(active).toHaveLength(2);
        expect(active.every((a) => a.status === 'active')).toBe(true);

        const inactive = taskBoard.listAgents({ status: 'inactive' });
        expect(inactive).toHaveLength(1);
        expect(inactive[0].agent_id).toBe('agent-2');
      });

      it('should filter agents by platform', () => {
        const claudeAgents = taskBoard.listAgents({ platform: 'claude-code' });
        expect(claudeAgents).toHaveLength(2);
        expect(claudeAgents.every((a) => a.platform === 'claude-code')).toBe(true);

        const mcpAgents = taskBoard.listAgents({ platform: 'mcp-server' });
        expect(mcpAgents).toHaveLength(1);
        expect(mcpAgents[0].agent_id).toBe('agent-3');
      });

      it('should filter agents by multiple criteria', () => {
        const filtered = taskBoard.listAgents({
          status: 'active',
          platform: 'claude-code',
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].agent_id).toBe('agent-1');
        expect(filtered[0].status).toBe('active');
        expect(filtered[0].platform).toBe('claude-code');
      });

      it('should return empty array when no agents match filter', () => {
        const agents = taskBoard.listAgents({ platform: 'non-existent-platform' });
        expect(agents).toHaveLength(0);
      });

      it('should parse skills for all agents', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-with-skills',
          platform: 'test',
          hostname: 'host',
          username: 'user',
          skills: ['s1', 's2'],
        });

        const agents = taskBoard.listAgents({ platform: 'test' });
        expect(agents).toHaveLength(1);
        expect(agents[0].skills).toBe(JSON.stringify(['s1', 's2']));
      });

      it('should return null for agents with corrupted skills JSON', () => {
        // Manually insert agents with corrupted JSON
        const db = (taskBoard as any).db;
        const now = Date.now();
        db.prepare(`
          INSERT INTO agents (agent_id, platform, hostname, username, skills, last_heartbeat, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('agent-corrupted-1', 'corrupted-platform', 'host1', 'user1', '[invalid', now, 'active', now);

        db.prepare(`
          INSERT INTO agents (agent_id, platform, hostname, username, skills, last_heartbeat, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('agent-corrupted-2', 'corrupted-platform', 'host2', 'user2', 'not json at all', now, 'active', now);

        const agents = taskBoard.listAgents({ platform: 'corrupted-platform' });
        expect(agents).toHaveLength(2);
        expect(agents[0].skills).toBeNull(); // Should return null for corrupted JSON
        expect(agents[1].skills).toBeNull(); // Should return null for corrupted JSON
      });
    });

    describe('updateAgentSkills', () => {
      it('should update agent skills', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-update-skills',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
          skills: ['old-skill'],
        });

        taskBoard.updateAgentSkills('agent-update-skills', ['new-skill-1', 'new-skill-2']);

        const agent = taskBoard.getAgent('agent-update-skills');
        expect(agent?.skills).toBe(JSON.stringify(['new-skill-1', 'new-skill-2']));
      });

      it('should allow updating skills to empty array', () => {
        taskBoard.registerAgent({
          agent_id: 'agent-clear-skills',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
          skills: ['skill1', 'skill2'],
        });

        taskBoard.updateAgentSkills('agent-clear-skills', []);

        const agent = taskBoard.getAgent('agent-clear-skills');
        expect(agent?.skills).toBe(JSON.stringify([]));
      });

      it('should throw on non-existent agent', () => {
        expect(() => {
          taskBoard.updateAgentSkills('non-existent', ['skill']);
        }).toThrow(/Agent not found/);
      });

      it('should throw on empty agent_id', () => {
        expect(() => {
          taskBoard.updateAgentSkills('', ['skill']);
        }).toThrow(/Agent ID is required/);
      });
    });

    describe('updateAgentHeartbeat', () => {
      it('should update agent heartbeat timestamp', async () => {
        taskBoard.registerAgent({
          agent_id: 'agent-heartbeat',
          platform: 'claude-code',
          hostname: 'localhost',
          username: 'user',
        });

        const before = taskBoard.getAgent('agent-heartbeat');
        const originalHeartbeat = before?.last_heartbeat;

        // Wait to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        taskBoard.updateAgentHeartbeat('agent-heartbeat');

        const after = taskBoard.getAgent('agent-heartbeat');
        expect(after?.last_heartbeat).toBeGreaterThan(originalHeartbeat!);
      });

      it('should throw on non-existent agent', () => {
        expect(() => {
          taskBoard.updateAgentHeartbeat('non-existent');
        }).toThrow(/Agent not found/);
      });

      it('should throw on empty agent_id', () => {
        expect(() => {
          taskBoard.updateAgentHeartbeat('');
        }).toThrow(/Agent ID is required/);
      });
    });
  });

  describe('Cancelled Status', () => {
    it('should allow creating tasks with cancelled status', () => {
      const taskId = taskBoard.createTask({
        subject: 'Cancelled task',
        status: 'cancelled',
        creator_platform: 'test',
      });

      const task = taskBoard.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });

    it('should support cancelled_by and cancel_reason columns', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task to cancel',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.cancelTask(taskId, 'test-agent', 'No longer needed');

      const task = taskBoard.getTask(taskId);
      expect(task?.status).toBe('cancelled');
      expect(task?.cancelled_by).toBe('test-agent');
      expect(task?.cancel_reason).toBe('No longer needed');
    });

    it('should not allow cancelling completed tasks', () => {
      const taskId = taskBoard.createTask({
        subject: 'Completed task',
        status: 'completed',
        creator_platform: 'test',
      });

      expect(() => taskBoard.cancelTask(taskId, 'test-agent')).toThrow('Cannot cancel completed task');
    });

    it('should not allow cancelling already cancelled tasks', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task to cancel',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.cancelTask(taskId, 'test-agent');

      expect(() => taskBoard.cancelTask(taskId, 'test-agent')).toThrow('Task already cancelled');
    });

    it('should record history when task is cancelled', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task to cancel',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.cancelTask(taskId, 'test-agent', 'No longer needed');

      const history = taskBoard.getTaskHistory(taskId);
      expect(history.some((h) => h.action === 'cancelled')).toBe(true);
    });

    it('should throw on non-existent task', () => {
      expect(() => {
        taskBoard.cancelTask('12345678-1234-4567-8901-234567890123', 'test-agent');
      }).toThrow('Task not found');
    });

    it('should throw on invalid task ID format', () => {
      expect(() => {
        taskBoard.cancelTask('not-a-uuid', 'test-agent');
      }).toThrow('Invalid task ID format');
    });

    it('should not allow cancelling deleted tasks', () => {
      const taskId = taskBoard.createTask({
        subject: 'Deleted task',
        status: 'deleted',
        creator_platform: 'test',
      });

      expect(() => taskBoard.cancelTask(taskId, 'test-agent')).toThrow('Task not found');
    });

    it('should allow cancelling in_progress tasks', () => {
      const taskId = taskBoard.createTask({
        subject: 'In progress task',
        status: 'in_progress',
        owner: 'agent-1',
        creator_platform: 'test',
      });

      taskBoard.cancelTask(taskId, 'test-agent', 'Cancelled by user');

      const task = taskBoard.getTask(taskId);
      expect(task?.status).toBe('cancelled');
      expect(task?.cancelled_by).toBe('test-agent');
      expect(task?.cancel_reason).toBe('Cancelled by user');
      expect(task?.owner).toBeUndefined(); // Owner should be cleared
    });

    it('should allow cancelling without a reason', () => {
      const taskId = taskBoard.createTask({
        subject: 'Task to cancel',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.cancelTask(taskId, 'test-agent');

      const task = taskBoard.getTask(taskId);
      expect(task?.status).toBe('cancelled');
      expect(task?.cancelled_by).toBe('test-agent');
      expect(task?.cancel_reason).toBeUndefined();
    });
  });
});
