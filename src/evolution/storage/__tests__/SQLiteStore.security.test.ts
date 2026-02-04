/**
 * ✅ SECURITY FIX (HIGH-2): SQL Injection Prevention Tests
 *
 * Tests for queryByTags() JSON_EACH implementation to ensure:
 * 1. No SQL injection via crafted tag strings
 * 2. Exact matching only (no LIKE pattern issues)
 * 3. Correct handling of special characters
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteStore } from '../SQLiteStore.js';
import type { Span } from '../types.js';

describe('SQLiteStore - SQL Injection Prevention (HIGH-2)', () => {
  let store: SQLiteStore;
  let _testTaskId: string;
  let _testExecutionId: string;

  beforeEach(async () => {
    store = new SQLiteStore({ dbPath: ':memory:' });
    await store.initialize();

    // ✅ Create required task and execution (Foreign Key constraints)
    const task = await store.createTask({ input: {} });
    _testTaskId = task.id;

    const execution = await store.createExecution(_testTaskId);
    _testExecutionId = execution.id;
  });

  afterEach(async () => {
    await store.close();
  });

  /**
   * Helper: Create test span with specific tags
   */
  async function createSpanWithTags(tags: string[]): Promise<Span> {
    const span: Span = {
      trace_id: 'trace-test',
      span_id: `span-${Date.now()}-${Math.random()}`,
      task_id: _testTaskId, // ✅ Use actual task ID
      execution_id: _testExecutionId, // ✅ Use actual execution ID
      name: 'test-span',
      kind: 'internal', // ✅ Use lowercase 'internal' (valid enum value)
      start_time: Date.now(),
      status: { code: 'OK' },
      attributes: {},
      resource: {
        'task.id': _testTaskId,
        'execution.id': _testExecutionId,
        'execution.attempt': 1,
      },
      tags,
    };

    await store.recordSpan(span);
    return span;
  }

  describe('SQL Injection Attack Prevention', () => {
    it('should prevent SQL injection via single quote in tag', async () => {
      // Create span with normal tag
      const span1 = await createSpanWithTags(['normal-tag']);

      // Attempt SQL injection: ' OR '1'='1
      const maliciousTag = "' OR '1'='1";
      const span2 = await createSpanWithTags([maliciousTag]);

      // Query with malicious tag should only return span2, not all spans
      const results = await store.queryByTags([maliciousTag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span2.span_id);
      // Should NOT return span1 (would indicate SQL injection)
      expect(results.find((s) => s.span_id === span1.span_id)).toBeUndefined();
    });

    it('should prevent SQL injection via UNION attack', async () => {
      await createSpanWithTags(['test']);

      // Attempt UNION-based SQL injection
      const maliciousTag = "test' UNION SELECT * FROM spans --";

      const results = await store.queryByTags([maliciousTag], 'any');

      // Should return no results (tag doesn't exist), not expose data
      expect(results).toHaveLength(0);
    });

    it('should prevent SQL injection via comment injection', async () => {
      await createSpanWithTags(['test']);

      // Attempt comment injection: test' --
      const maliciousTag = "test' --";

      const results = await store.queryByTags([maliciousTag], 'any');

      // Should not find anything (exact match required)
      expect(results).toHaveLength(0);
    });

    it('should prevent SQL injection via double quote', async () => {
      await createSpanWithTags(['test']);

      // Attempt injection with double quote
      const maliciousTag = 'test" OR "1"="1';

      const results = await store.queryByTags([maliciousTag], 'any');

      // Should only find spans with that exact tag (none)
      expect(results).toHaveLength(0);
    });
  });

  describe('Special Character Handling', () => {
    it('should handle tags with single quotes correctly', async () => {
      const tag = "user's tag";
      const span = await createSpanWithTags([tag]);

      const results = await store.queryByTags([tag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span.span_id);
    });

    it('should handle tags with double quotes correctly', async () => {
      const tag = 'tag with "quotes"';
      const span = await createSpanWithTags([tag]);

      const results = await store.queryByTags([tag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span.span_id);
    });

    it('should handle tags with percent signs (LIKE wildcard)', async () => {
      const tag = 'test%tag';
      const span1 = await createSpanWithTags([tag]);
      await createSpanWithTags(['test-tag']);
      await createSpanWithTags(['testabc-tag']);

      // Old LIKE approach would match span2 and span3
      // New JSON_EACH should only match exact tag
      const results = await store.queryByTags([tag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span1.span_id);
    });

    it('should handle tags with underscores (LIKE wildcard)', async () => {
      const tag = 'test_tag';
      const span1 = await createSpanWithTags([tag]);
      await createSpanWithTags(['test-tag']);
      await createSpanWithTags(['testXtag']);

      // Old LIKE approach would match span2 and span3
      // New JSON_EACH should only match exact tag
      const results = await store.queryByTags([tag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span1.span_id);
    });

    it('should handle tags with backslashes correctly', async () => {
      const tag = 'test\\tag';
      const span = await createSpanWithTags([tag]);

      const results = await store.queryByTags([tag], 'any');

      expect(results).toHaveLength(1);
      expect(results[0].span_id).toBe(span.span_id);
    });
  });

  describe('Mode: any (OR logic)', () => {
    it('should find spans with any of the specified tags', async () => {
      const span1 = await createSpanWithTags(['tag-a', 'tag-b']);
      const span2 = await createSpanWithTags(['tag-b', 'tag-c']);
      await createSpanWithTags(['tag-d']);

      const results = await store.queryByTags(['tag-a', 'tag-c'], 'any');

      // Should find span1 (has tag-a) and span2 (has tag-c)
      expect(results).toHaveLength(2);
      const spanIds = results.map((s) => s.span_id).sort();
      expect(spanIds).toEqual([span1.span_id, span2.span_id].sort());
    });

    it('should return empty array when tags array is empty', async () => {
      await createSpanWithTags(['tag-a']);

      const results = await store.queryByTags([], 'any');

      expect(results).toHaveLength(0);
    });
  });

  describe('Mode: all (AND logic)', () => {
    it('should find spans with all specified tags', async () => {
      const span1 = await createSpanWithTags(['tag-a', 'tag-b', 'tag-c']);
      const span2 = await createSpanWithTags(['tag-a', 'tag-b']);
      await createSpanWithTags(['tag-a']);

      const results = await store.queryByTags(['tag-a', 'tag-b'], 'all');

      // Should find span1 and span2 (both have tag-a AND tag-b)
      expect(results).toHaveLength(2);
      const spanIds = results.map((s) => s.span_id).sort();
      expect(spanIds).toEqual([span1.span_id, span2.span_id].sort());
    });

    it('should return empty array when tags array is empty', async () => {
      await createSpanWithTags(['tag-a']);

      const results = await store.queryByTags([], 'all');

      expect(results).toHaveLength(0);
    });
  });

  describe('Performance: Large tag arrays', () => {
    it('should handle reasonable number of tags efficiently', async () => {
      // Create spans with various tags
      const tags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
      await createSpanWithTags(tags.slice(0, 25));

      // Query with 50 tags (reasonable use case)
      const startTime = Date.now();
      const results = await store.queryByTags(tags, 'any');
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(100); // 100ms threshold
      expect(results).toHaveLength(1);
    });
  });
});
