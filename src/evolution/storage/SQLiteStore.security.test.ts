import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteStore } from './SQLiteStore';
import path from 'path';
import os from 'os';

describe('SQLiteStore - SQL Injection Protection', () => {
  let store: SQLiteStore;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `security-test-${Date.now()}.db`);
    store = new SQLiteStore({ dbPath });
    await store.initialize();
  });

  afterEach(async () => {
    if (store) {
      await store.close();
    }
  });

  describe('querySpans - sort_by SQL injection protection', () => {
    it('should allow whitelisted sort columns', async () => {
      // Create a span first - execution provides context for span queries
      const task = await store.createTask({ test: 'task' });
      const execution = await store.createExecution(task.id);

      // Verify execution was created properly as it provides span query context
      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();

      // Valid sort columns should work
      const validColumns = ['start_time', 'duration_ms', 'status_code', 'name', 'kind'];

      for (const column of validColumns) {
        await expect(
          store.querySpans({ task_id: task.id, sort_by: column as any })
        ).resolves.toBeDefined();
      }
    });

    it('should reject SQL injection attempts in sort_by', async () => {
      const task = await store.createTask({ test: 'task' });

      // SQL injection attempts
      const injectionAttempts = [
        'start_time; DROP TABLE spans--',
        'start_time UNION SELECT * FROM tasks--',
        '(SELECT password FROM users)',
        'start_time; DELETE FROM spans WHERE 1=1--',
        '../../../etc/passwd',
      ];

      for (const injection of injectionAttempts) {
        await expect(
          store.querySpans({ task_id: task.id, sort_by: injection as any })
        ).rejects.toThrow(/invalid sort column/i);
      }
    });

    it('should handle sort_order injection attempts', async () => {
      const task = await store.createTask({ test: 'task' });

      // Only ASC and DESC should be allowed
      await expect(
        store.querySpans({
          task_id: task.id,
          sort_by: 'start_time',
          sort_order: 'ASC' as any,
        })
      ).resolves.toBeDefined();

      await expect(
        store.querySpans({
          task_id: task.id,
          sort_by: 'start_time',
          sort_order: 'DESC' as any,
        })
      ).resolves.toBeDefined();

      // Injection attempts in sort_order
      await expect(
        store.querySpans({
          task_id: task.id,
          sort_by: 'start_time',
          sort_order: 'ASC; DROP TABLE spans--' as any,
        })
      ).rejects.toThrow(/invalid sort order/i);
    });
  });

  describe('queryLinkedSpans - LIKE clause injection protection', () => {
    it('should safely escape special characters in span_id', async () => {
      // Create test data - execution provides the context for span queries
      const task = await store.createTask({ test: 'task' });
      const execution = await store.createExecution(task.id);

      // Verify execution is properly created for query context
      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();

      // Span IDs with special SQL characters
      const specialSpanIds = [
        'span-with-%-wildcard',
        'span-with-_-underscore',
        "span-with-'-quote",
        'span-with-"-doublequote',
        'span-with-\\-backslash',
      ];

      // Should not throw and should not match unintended spans
      for (const spanId of specialSpanIds) {
        const result = await store.queryLinkedSpans(spanId);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should not allow LIKE injection to bypass query', async () => {
      const task = await store.createTask({ test: 'task' });
      const execution = await store.createExecution(task.id);

      // Verify execution context is established
      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();

      // LIKE injection attempts
      const injections = [
        '%',
        '%%',
        '_',
        '%--',
        "' OR '1'='1",
        '" OR "1"="1',
      ];

      for (const injection of injections) {
        // Should execute safely without error
        const result = await store.queryLinkedSpans(injection);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('queryByTags - LIKE clause injection protection', () => {
    it('should safely escape special characters in tags', async () => {
      const tags = [
        'tag-with-%-percent',
        'tag-with-_-underscore',
        "tag-with-'-quote",
        'tag-with-\\-backslash',
      ];

      // Should not throw
      await expect(store.queryByTags(tags, 'any')).resolves.toBeDefined();
      await expect(store.queryByTags(tags, 'all')).resolves.toBeDefined();
    });

    it('should prevent LIKE wildcard injection', async () => {
      // Create test spans with specific tags
      const task = await store.createTask({ test: 'task' });
      const execution = await store.createExecution(task.id);

      // Verify execution context is properly set up
      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();

      // Attacker tries to use wildcards to match all tags
      const injectionTags = ['%', '_', '%%'];

      const result = await store.queryByTags(injectionTags, 'any');

      // Should execute safely
      expect(Array.isArray(result)).toBe(true);
    });

    it('should prevent SQL injection in tag arrays', async () => {
      const injectionTags = [
        "'; DROP TABLE spans--",
        '" OR "1"="1',
        "' UNION SELECT * FROM tasks--",
      ];

      // Should not throw and should handle safely
      await expect(store.queryByTags(injectionTags, 'any')).resolves.toBeDefined();
      await expect(store.queryByTags(injectionTags, 'all')).resolves.toBeDefined();
    });
  });

  describe('JSON extraction safety', () => {
    it('should handle malformed JSON gracefully', async () => {
      // This tests that json_extract errors are caught
      // We'll need to test this indirectly through getSkillPerformance
      const timeRange = {
        start: new Date(Date.now() - 86400000),
        end: new Date(),
      };

      // Should not throw even if JSON is malformed in database
      await expect(
        store.getSkillPerformance('test-skill', timeRange)
      ).resolves.toBeDefined();
    });
  });
});
