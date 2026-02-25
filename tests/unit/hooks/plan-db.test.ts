import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import {
  queryActivePlans,
  addObservation,
  updateEntityMetadata,
  updateEntityTag,
  createRelation,
  sqliteBatchEntity,
  sqliteQueryJSON,
} from '../../../scripts/hooks/hook-utils.js';

describe('Plan DB Functions', () => {
  let dbPath;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `plan-db-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    dbPath = path.join(testDir, 'test.db');

    // Create schema matching MeMesh KG
    const schema = `
      CREATE TABLE entities (id INTEGER PRIMARY KEY, name TEXT UNIQUE, type TEXT, created_at TEXT, metadata TEXT DEFAULT '{}');
      CREATE TABLE observations (id INTEGER PRIMARY KEY, entity_id INTEGER, content TEXT, created_at TEXT);
      CREATE TABLE tags (id INTEGER PRIMARY KEY, entity_id INTEGER, tag TEXT);
      CREATE TABLE relations (id INTEGER PRIMARY KEY, from_entity_id INTEGER, to_entity_id INTEGER, relation_type TEXT, metadata TEXT DEFAULT '{}', created_at TEXT, UNIQUE(from_entity_id, to_entity_id, relation_type));
    `;
    execFileSync('sqlite3', [dbPath], { input: schema, encoding: 'utf-8' });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('queryActivePlans', () => {
    it('should return active plan entities', () => {
      const metadata = JSON.stringify({ totalSteps: 3, completed: 1, status: 'active', stepsDetail: [] });
      sqliteBatchEntity(dbPath,
        { name: 'Plan: test-plan', type: 'workflow_checkpoint', metadata },
        ['Step 1: Do something'], ['plan', 'active', 'scope:project']
      );

      const plans = queryActivePlans(dbPath);
      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Plan: test-plan');
      expect(plans[0].metadata.totalSteps).toBe(3);
    });

    it('should not return completed plans', () => {
      const metadata = JSON.stringify({ totalSteps: 2, completed: 2, status: 'completed' });
      sqliteBatchEntity(dbPath,
        { name: 'Plan: done-plan', type: 'workflow_checkpoint', metadata },
        ['Step 1'], ['plan', 'completed']
      );

      const plans = queryActivePlans(dbPath);
      expect(plans).toHaveLength(0);
    });

    it('should return empty array when DB does not exist', () => {
      expect(queryActivePlans('/nonexistent/path.db')).toEqual([]);
    });
  });

  describe('addObservation', () => {
    it('should add observation to existing entity', () => {
      sqliteBatchEntity(dbPath,
        { name: 'Plan: obs-test', type: 'workflow_checkpoint' },
        ['Initial observation'], ['plan']
      );

      const result = addObservation(dbPath, 'Plan: obs-test', 'New observation');
      expect(result).toBe(true);

      // Verify observation was added
      const obs = execFileSync('sqlite3', ['-json', dbPath,
        "SELECT content FROM observations WHERE entity_id = (SELECT id FROM entities WHERE name = 'Plan: obs-test') ORDER BY id"],
        { encoding: 'utf-8' });
      const rows = JSON.parse(obs);
      expect(rows).toHaveLength(2);
      expect(rows[1].content).toBe('New observation');
    });
  });

  describe('updateEntityMetadata', () => {
    it('should update entity metadata JSON', () => {
      sqliteBatchEntity(dbPath,
        { name: 'Plan: meta-test', type: 'workflow_checkpoint', metadata: JSON.stringify({ completed: 0 }) },
        [], ['plan']
      );

      const result = updateEntityMetadata(dbPath, 'Plan: meta-test', { completed: 1, status: 'active' });
      expect(result).toBe(true);

      // Verify metadata updated
      const row = execFileSync('sqlite3', [dbPath,
        "SELECT metadata FROM entities WHERE name = 'Plan: meta-test'"],
        { encoding: 'utf-8' }).trim();
      const meta = JSON.parse(row);
      expect(meta.completed).toBe(1);
    });
  });

  describe('updateEntityTag', () => {
    it('should swap tag from active to completed', () => {
      sqliteBatchEntity(dbPath,
        { name: 'Plan: tag-test', type: 'workflow_checkpoint' },
        [], ['plan', 'active']
      );

      const result = updateEntityTag(dbPath, 'Plan: tag-test', 'active', 'completed');
      expect(result).toBe(true);

      // Verify tag changed
      const tags = execFileSync('sqlite3', [dbPath,
        "SELECT tag FROM tags WHERE entity_id = (SELECT id FROM entities WHERE name = 'Plan: tag-test')"],
        { encoding: 'utf-8' }).trim().split('\n');
      expect(tags).toContain('completed');
      expect(tags).not.toContain('active');
    });
  });

  describe('createRelation', () => {
    it('should create relation between two entities', () => {
      sqliteBatchEntity(dbPath,
        { name: 'Commit abc: fix auth', type: 'commit' }, [], ['commit']);
      sqliteBatchEntity(dbPath,
        { name: 'Plan: auth-plan', type: 'workflow_checkpoint' }, [], ['plan']);

      const result = createRelation(dbPath, 'Commit abc: fix auth', 'Plan: auth-plan', 'depends_on');
      expect(result).toBe(true);

      // Verify relation created
      const rel = execFileSync('sqlite3', ['-json', dbPath,
        'SELECT relation_type FROM relations'], { encoding: 'utf-8' });
      const rows = JSON.parse(rel);
      expect(rows).toHaveLength(1);
      expect(rows[0].relation_type).toBe('depends_on');
    });

    it('should not fail on duplicate relation', () => {
      sqliteBatchEntity(dbPath, { name: 'E1', type: 'commit' }, [], []);
      sqliteBatchEntity(dbPath, { name: 'E2', type: 'workflow_checkpoint' }, [], []);

      createRelation(dbPath, 'E1', 'E2', 'depends_on');
      const result = createRelation(dbPath, 'E1', 'E2', 'depends_on');
      expect(result).toBe(true); // INSERT OR IGNORE
    });
  });

  describe('sqliteBatchEntity duplicate handling', () => {
    it('should return null when entity with same name already exists', () => {
      const first = sqliteBatchEntity(dbPath,
        { name: 'Plan: dup-test', type: 'workflow_checkpoint', metadata: '{"v":1}' },
        ['obs1'], ['plan']
      );
      expect(first).not.toBeNull();

      // Second insert with same name should fail (UNIQUE constraint)
      const second = sqliteBatchEntity(dbPath,
        { name: 'Plan: dup-test', type: 'workflow_checkpoint', metadata: '{"v":2}' },
        ['obs2'], ['plan']
      );
      expect(second).toBeNull();

      // Metadata should still be the original value
      const rows = JSON.parse(execFileSync('sqlite3', ['-json', dbPath,
        "SELECT metadata FROM entities WHERE name = 'Plan: dup-test'"],
        { encoding: 'utf-8' }));
      expect(JSON.parse(rows[0].metadata).v).toBe(1);
    });
  });

  describe('sqliteQueryJSON', () => {
    it('should return empty array for query with no matching rows', () => {
      const result = sqliteQueryJSON(dbPath,
        'SELECT * FROM entities WHERE name = ?', ['nonexistent']);
      expect(result).toEqual([]);
    });

    it('should return null for invalid database path', () => {
      const result = sqliteQueryJSON('/nonexistent/path.db',
        'SELECT * FROM entities');
      expect(result).toBeNull();
    });

    it('should return parsed rows for valid query', () => {
      sqliteBatchEntity(dbPath,
        { name: 'Test Entity', type: 'test' }, [], []);

      const result = sqliteQueryJSON(dbPath,
        'SELECT name, type FROM entities WHERE name = ?', ['Test Entity']);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Entity');
    });
  });
});
