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
});
