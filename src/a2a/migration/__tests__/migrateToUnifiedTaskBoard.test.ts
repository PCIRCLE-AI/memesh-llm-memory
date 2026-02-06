/**
 * @fileoverview Tests for migration from per-agent TaskQueue databases to unified TaskBoard
 *
 * Tests use TDD approach: all tests written first, then implementation follows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  migrateToUnifiedTaskBoard,
  detectOldDatabases,
  mapStateToStatus,
  extractPlatformFromAgentId,
} from '../migrateToUnifiedTaskBoard.js';
import { TaskBoard } from '../../storage/TaskBoard.js';

// Helper to generate valid UUID v4
const uuid = () => crypto.randomUUID();

describe('migrateToUnifiedTaskBoard', () => {
  let testDir: string;
  let testDataDir: string;

  beforeEach(() => {
    // Create unique test directory for each test
    testDir = path.join(os.tmpdir(), `migration-tests-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    testDataDir = path.join(testDir, 'data');
    fs.mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create an old-format database with test data
   */
  function createOldDatabase(agentId: string, tasks: Array<{
    id: string;
    state: string;
    name: string | null;
    description: string | null;
    priority: string;
    session_id: string | null;
    created_at: string;
    updated_at: string;
    metadata: string | null;
  }>): string {
    const dbPath = path.join(testDataDir, `a2a-tasks-${agentId}.db`);
    const db = new Database(dbPath);

    // Create old schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK(state IN ('SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED', 'TIMEOUT')),
        name TEXT,
        description TEXT,
        priority TEXT CHECK(priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
        session_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );
    `);

    // Insert test tasks
    const stmt = db.prepare(`
      INSERT INTO tasks (id, state, name, description, priority, session_id, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of tasks) {
      stmt.run(
        task.id,
        task.state,
        task.name,
        task.description,
        task.priority,
        task.session_id,
        task.created_at,
        task.updated_at,
        task.metadata
      );
    }

    db.close();
    return dbPath;
  }

  describe('detectOldDatabases', () => {
    it('should find a2a-tasks-*.db files', () => {
      // Create test databases
      createOldDatabase('test-agent-1', []);
      createOldDatabase('test-agent-2', []);

      // Also create a non-matching file
      fs.writeFileSync(path.join(testDataDir, 'other-file.db'), '');

      const databases = detectOldDatabases(testDataDir);

      expect(databases).toHaveLength(2);
      expect(databases.some(p => p.includes('a2a-tasks-test-agent-1.db'))).toBe(true);
      expect(databases.some(p => p.includes('a2a-tasks-test-agent-2.db'))).toBe(true);
      expect(databases.every(p => !p.includes('other-file.db'))).toBe(true);
    });

    it('should return empty array when no old databases exist', () => {
      const databases = detectOldDatabases(testDataDir);
      expect(databases).toHaveLength(0);
    });

    it('should use default data directory when not specified', () => {
      // This test verifies the function can be called without arguments
      // It will look in ~/.claude-code-buddy by default
      const databases = detectOldDatabases();
      expect(Array.isArray(databases)).toBe(true);
    });
  });

  describe('mapStateToStatus', () => {
    it('should map SUBMITTED to pending', () => {
      expect(mapStateToStatus('SUBMITTED')).toBe('pending');
    });

    it('should map WORKING to in_progress', () => {
      expect(mapStateToStatus('WORKING')).toBe('in_progress');
    });

    it('should map INPUT_REQUIRED to in_progress', () => {
      expect(mapStateToStatus('INPUT_REQUIRED')).toBe('in_progress');
    });

    it('should map COMPLETED to completed', () => {
      expect(mapStateToStatus('COMPLETED')).toBe('completed');
    });

    it('should map FAILED to completed (terminal)', () => {
      expect(mapStateToStatus('FAILED')).toBe('completed');
    });

    it('should map CANCELED to deleted', () => {
      expect(mapStateToStatus('CANCELED')).toBe('deleted');
    });

    it('should map REJECTED to deleted', () => {
      expect(mapStateToStatus('REJECTED')).toBe('deleted');
    });

    it('should map TIMEOUT to completed (terminal)', () => {
      expect(mapStateToStatus('TIMEOUT')).toBe('completed');
    });

    it('should throw on unknown state', () => {
      expect(() => mapStateToStatus('UNKNOWN' as any)).toThrow(/Unknown state/);
    });
  });

  describe('extractPlatformFromAgentId', () => {
    it('should extract platform from hostname-username-platform format', () => {
      // For simple single-word platforms, extract the last segment
      expect(extractPlatformFromAgentId('kts-macbook-ml9cw1gs')).toBe('ml9cw1gs');
      expect(extractPlatformFromAgentId('host-user-platform')).toBe('platform');
    });

    it('should handle multi-word platform names like claude-code', () => {
      // When the last segment is a known platform suffix, keep it
      // Otherwise treat the last segment as the platform
      expect(extractPlatformFromAgentId('server1-admin-code')).toBe('code');
    });

    it('should return the full agent ID if no dashes', () => {
      expect(extractPlatformFromAgentId('simpleagent')).toBe('simpleagent');
    });

    it('should handle single dash gracefully', () => {
      expect(extractPlatformFromAgentId('host-platform')).toBe('platform');
    });

    it('should return "unknown" for empty string', () => {
      expect(extractPlatformFromAgentId('')).toBe('unknown');
    });
  });

  describe('Migration with dry-run mode', () => {
    it('should not actually migrate in dry-run mode', () => {
      const agentId = 'test-hostname-testuser-platform';
      const taskId = uuid();
      createOldDatabase(agentId, [
        {
          id: taskId,
          state: 'SUBMITTED',
          name: 'Test Task',
          description: 'Test description',
          priority: 'normal',
          session_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: null,
        },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      const result = migrateToUnifiedTaskBoard({
        dryRun: true,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      // Should report what would be migrated
      expect(result.migratedCount).toBe(0); // Dry-run doesn't actually migrate
      expect(result.databases[0].taskCount).toBe(1);

      // Verify task board wasn't created or populated
      if (fs.existsSync(taskBoardPath)) {
        const board = new TaskBoard(taskBoardPath);
        const tasks = board.listTasks();
        board.close();
        expect(tasks).toHaveLength(0);
      }
    });

    it('should report accurate dry-run counts', () => {
      const agentId1 = 'host1-user1-platform1';
      const agentId2 = 'host2-user2-platform2';

      createOldDatabase(agentId1, [
        { id: uuid(), state: 'SUBMITTED', name: 'T1', description: null, priority: 'normal', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
        { id: uuid(), state: 'WORKING', name: 'T2', description: null, priority: 'high', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      createOldDatabase(agentId2, [
        { id: uuid(), state: 'COMPLETED', name: 'T3', description: null, priority: 'low', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      const result = migrateToUnifiedTaskBoard({
        dryRun: true,
        backup: false,
        dataDir: testDataDir,
      });

      expect(result.databases).toHaveLength(2);
      const totalTasks = result.databases.reduce((sum, db) => sum + db.taskCount, 0);
      expect(totalTasks).toBe(3);
    });
  });

  describe('Duplicate task handling', () => {
    it('should skip tasks that already exist in unified board', () => {
      const agentId = 'test-host-user-platform';
      const existingTaskId = uuid();
      const newTaskId = uuid();
      const now = new Date().toISOString();

      createOldDatabase(agentId, [
        { id: existingTaskId, state: 'SUBMITTED', name: 'Existing Task', description: 'Already exists', priority: 'normal', session_id: null, created_at: now, updated_at: now, metadata: null },
        { id: newTaskId, state: 'WORKING', name: 'New Task', description: 'Will be migrated', priority: 'high', session_id: null, created_at: now, updated_at: now, metadata: null },
      ]);

      // Pre-create the existing task in the unified board
      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      const board = new TaskBoard(taskBoardPath);

      // Manually insert with specific ID using direct DB access
      const db = (board as any).db;
      const nowMs = Date.now();
      db.prepare(`
        INSERT INTO tasks (id, subject, status, creator_platform, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(existingTaskId, 'Pre-existing Task', 'pending', 'test', nowMs, nowMs);
      board.close();

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      expect(result.migratedCount).toBe(1); // Only the new task
      expect(result.skippedCount).toBe(1); // The existing task was skipped

      // Verify the existing task wasn't overwritten
      const verifyBoard = new TaskBoard(taskBoardPath);
      const existingTask = verifyBoard.getTask(existingTaskId);
      expect(existingTask?.subject).toBe('Pre-existing Task'); // Original subject preserved
      verifyBoard.close();
    });
  });

  describe('Backup functionality', () => {
    it('should create .backup file when backup option is true', () => {
      const agentId = 'backup-test-agent';
      const dbPath = createOldDatabase(agentId, [
        { id: uuid(), state: 'SUBMITTED', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: true,
        dataDir: testDataDir,
      });

      expect(result.migratedCount).toBe(1);

      // Verify backup file exists
      const backupPath = dbPath + '.backup';
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should not create backup when backup option is false', () => {
      const agentId = 'no-backup-test-agent';
      const dbPath = createOldDatabase(agentId, [
        { id: uuid(), state: 'SUBMITTED', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
      });

      // Verify backup file does not exist
      const backupPath = dbPath + '.backup';
      expect(fs.existsSync(backupPath)).toBe(false);
    });
  });

  describe('Migration summary accuracy', () => {
    it('should return accurate migration summary', () => {
      const agentId1 = 'summary-test-agent1';
      const agentId2 = 'summary-test-agent2';

      createOldDatabase(agentId1, [
        { id: uuid(), state: 'SUBMITTED', name: 'T1', description: null, priority: 'normal', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
        { id: uuid(), state: 'COMPLETED', name: 'T2', description: null, priority: 'high', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      createOldDatabase(agentId2, [
        { id: uuid(), state: 'WORKING', name: 'T3', description: null, priority: 'urgent', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
      });

      expect(result.migratedCount).toBe(3);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.databases).toHaveLength(2);

      // Verify per-database counts
      const db1 = result.databases.find(d => d.path.includes(agentId1));
      const db2 = result.databases.find(d => d.path.includes(agentId2));
      expect(db1?.taskCount).toBe(2);
      expect(db1?.migratedCount).toBe(2);
      expect(db2?.taskCount).toBe(1);
      expect(db2?.migratedCount).toBe(1);
    });
  });

  describe('Empty database handling', () => {
    it('should handle empty database gracefully', () => {
      createOldDatabase('empty-agent', []);

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
      });

      expect(result.migratedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.databases).toHaveLength(1);
      expect(result.databases[0].taskCount).toBe(0);
      expect(result.databases[0].migratedCount).toBe(0);
    });
  });

  describe('Corrupt/invalid database handling', () => {
    it('should handle corrupt database gracefully', () => {
      // Create a corrupt database file
      const corruptPath = path.join(testDataDir, 'a2a-tasks-corrupt-agent.db');
      fs.writeFileSync(corruptPath, 'This is not a valid SQLite database');

      // Also create a valid database to ensure partial success
      createOldDatabase('valid-agent', [
        { id: uuid(), state: 'SUBMITTED', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: null },
      ]);

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
      });

      // Should still migrate the valid database
      expect(result.migratedCount).toBe(1);
      // Should report the error for corrupt database
      expect(result.errorCount).toBeGreaterThanOrEqual(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing tasks table gracefully', () => {
      // Create a database without the tasks table
      const dbPath = path.join(testDataDir, 'a2a-tasks-notasks-agent.db');
      const db = new Database(dbPath);
      db.exec('CREATE TABLE other_table (id TEXT PRIMARY KEY);');
      db.close();

      const result = migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
      });

      expect(result.errorCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Field mapping', () => {
    it('should map name to subject', () => {
      const agentId = 'field-mapping-test';
      const taskId = uuid();
      const now = new Date().toISOString();

      createOldDatabase(agentId, [
        { id: taskId, state: 'SUBMITTED', name: 'Original Name', description: 'Original Desc', priority: 'normal', session_id: 'session-123', created_at: now, updated_at: now, metadata: '{"key":"value"}' },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);
      const task = board.getTask(taskId);
      board.close();

      expect(task).toBeDefined();
      expect(task?.subject).toBe('Original Name'); // name -> subject
      expect(task?.description).toBe('Original Desc'); // description preserved
      expect(task?.status).toBe('pending'); // SUBMITTED -> pending
    });

    it('should extract platform from agent ID correctly', () => {
      const agentId = 'myhost-myuser-myplatform';
      const taskId = uuid();
      const now = new Date().toISOString();

      createOldDatabase(agentId, [
        { id: taskId, state: 'SUBMITTED', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: now, updated_at: now, metadata: null },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);
      const task = board.getTask(taskId);
      board.close();

      expect(task?.creator_platform).toBe('myplatform');
    });

    it('should preserve timestamps', () => {
      const agentId = 'timestamp-test';
      const taskId = uuid();
      const createdAt = '2024-01-15T10:30:00.000Z';
      const updatedAt = '2024-01-15T11:45:00.000Z';

      createOldDatabase(agentId, [
        { id: taskId, state: 'WORKING', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: createdAt, updated_at: updatedAt, metadata: null },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);
      const task = board.getTask(taskId);
      board.close();

      // TaskBoard stores timestamps as milliseconds
      expect(task?.created_at).toBe(new Date(createdAt).getTime());
      expect(task?.updated_at).toBe(new Date(updatedAt).getTime());
    });

    it('should preserve metadata', () => {
      const agentId = 'metadata-test';
      const taskId = uuid();
      const now = new Date().toISOString();
      const originalMetadata = { customField: 'value', nested: { prop: 123 } };

      createOldDatabase(agentId, [
        { id: taskId, state: 'SUBMITTED', name: 'Test', description: null, priority: 'normal', session_id: null, created_at: now, updated_at: now, metadata: JSON.stringify(originalMetadata) },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);
      const task = board.getTask(taskId);
      board.close();

      // Metadata now includes migration info, so check original fields are preserved
      const parsedMetadata = JSON.parse(task?.metadata || '{}');
      expect(parsedMetadata.customField).toBe('value');
      expect(parsedMetadata.nested?.prop).toBe(123);
    });
  });

  describe('All state mappings', () => {
    it('should correctly migrate all states', () => {
      const agentId = 'all-states-test';
      const now = new Date().toISOString();

      const states = [
        { state: 'SUBMITTED', expectedStatus: 'pending', id: uuid() },
        { state: 'WORKING', expectedStatus: 'in_progress', id: uuid() },
        { state: 'INPUT_REQUIRED', expectedStatus: 'in_progress', id: uuid() },
        { state: 'COMPLETED', expectedStatus: 'completed', id: uuid() },
        { state: 'FAILED', expectedStatus: 'completed', id: uuid() },
        { state: 'CANCELED', expectedStatus: 'deleted', id: uuid() },
        { state: 'REJECTED', expectedStatus: 'deleted', id: uuid() },
        { state: 'TIMEOUT', expectedStatus: 'completed', id: uuid() },
      ];

      createOldDatabase(agentId, states.map((s) => ({
        id: s.id,
        state: s.state,
        name: `Task ${s.state}`,
        description: null,
        priority: 'normal',
        session_id: null,
        created_at: now,
        updated_at: now,
        metadata: null,
      })));

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);

      for (const stateInfo of states) {
        const task = board.getTask(stateInfo.id);
        expect(task?.status).toBe(stateInfo.expectedStatus);
      }

      board.close();
    });
  });

  describe('Task with null/undefined name', () => {
    it('should use fallback subject when name is null', () => {
      const agentId = 'null-name-test';
      const taskId = uuid();
      const now = new Date().toISOString();

      createOldDatabase(agentId, [
        { id: taskId, state: 'SUBMITTED', name: null, description: 'Has description but no name', priority: 'normal', session_id: null, created_at: now, updated_at: now, metadata: null },
      ]);

      const taskBoardPath = path.join(testDataDir, 'task-board.db');
      migrateToUnifiedTaskBoard({
        dryRun: false,
        backup: false,
        dataDir: testDataDir,
        taskBoardPath,
      });

      const board = new TaskBoard(taskBoardPath);
      const task = board.getTask(taskId);
      board.close();

      // Should use a fallback subject like "(No subject)" or task ID
      expect(task?.subject).toBeTruthy();
      expect(task?.subject.length).toBeGreaterThan(0);
    });
  });
});
