/**
 * UnifiedMemoryStore Tests
 *
 * TDD tests for the unified memory storage layer.
 * These tests define the expected behavior before implementation.
 *
 * Test coverage:
 * - Store and retrieve memory
 * - Search by query
 * - Search by type
 * - Search by tags
 * - Time range filtering
 * - Importance filtering
 * - Update and delete
 * - Integration with KnowledgeGraph
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedMemoryStore } from '../../../src/memory/UnifiedMemoryStore.js';
import { KnowledgeGraph } from '../../../src/knowledge-graph/index.js';
import type { UnifiedMemory, SearchOptions, MemoryType } from '../../../src/memory/types/unified-memory.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('UnifiedMemoryStore', () => {
  let store: UnifiedMemoryStore;
  let knowledgeGraph: KnowledgeGraph;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'unified-memory-test-'));
    dbPath = join(tempDir, 'test-kg.db');

    // Create KnowledgeGraph instance
    knowledgeGraph = await KnowledgeGraph.create(dbPath);

    // Create UnifiedMemoryStore
    store = new UnifiedMemoryStore(knowledgeGraph);
  });

  afterEach(() => {
    // Close database and cleanup
    knowledgeGraph.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('store()', () => {
    it('should store a memory and return an ID', async () => {
      const memory: UnifiedMemory = {
        type: 'mistake',
        content: 'Always validate user input before processing',
        context: 'Security review',
        tags: ['security', 'validation', 'input'],
        importance: 0.9,
        timestamp: new Date(),
      };

      const id = await store.store(memory);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should store memory with all fields', async () => {
      const memory: UnifiedMemory = {
        type: 'decision',
        content: 'Use TypeScript strict mode for all new projects',
        context: 'Architecture decision',
        tags: ['typescript', 'architecture', 'best-practice'],
        importance: 0.85,
        timestamp: new Date('2024-01-15'),
        relations: ['previous-decision-id'],
        metadata: { author: 'team-lead', approved: true },
      };

      const id = await store.store(memory);
      const retrieved = await store.get(id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.type).toBe('decision');
      expect(retrieved!.content).toBe(memory.content);
      expect(retrieved!.context).toBe(memory.context);
      expect(retrieved!.tags).toEqual(expect.arrayContaining(memory.tags));
      expect(retrieved!.importance).toBe(0.85);
      expect(retrieved!.metadata).toEqual(memory.metadata);
    });

    it('should store multiple memories with unique IDs', async () => {
      const memory1: UnifiedMemory = {
        type: 'knowledge',
        content: 'Knowledge item 1',
        tags: ['tag1'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const memory2: UnifiedMemory = {
        type: 'knowledge',
        content: 'Knowledge item 2',
        tags: ['tag2'],
        importance: 0.6,
        timestamp: new Date(),
      };

      const id1 = await store.store(memory1);
      const id2 = await store.store(memory2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('get()', () => {
    it('should retrieve a stored memory by ID', async () => {
      const memory: UnifiedMemory = {
        type: 'conversation',
        content: 'Discussed database optimization strategies',
        tags: ['database', 'performance'],
        importance: 0.7,
        timestamp: new Date(),
      };

      const id = await store.store(memory);
      const retrieved = await store.get(id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(id);
      expect(retrieved!.type).toBe('conversation');
      expect(retrieved!.content).toBe(memory.content);
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await store.get('non-existent-id-12345');
      expect(retrieved).toBeNull();
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      // Seed test data
      await store.store({
        type: 'mistake',
        content: 'Forgot to handle null pointer exception in user service',
        context: 'Bug fix review',
        tags: ['error-handling', 'null-check', 'user-service'],
        importance: 0.9,
        timestamp: new Date('2024-01-10'),
      });

      await store.store({
        type: 'knowledge',
        content: 'Use early return pattern for better readability',
        tags: ['clean-code', 'patterns'],
        importance: 0.7,
        timestamp: new Date('2024-01-12'),
      });

      await store.store({
        type: 'decision',
        content: 'Adopt React Query for server state management',
        tags: ['react', 'state-management', 'frontend'],
        importance: 0.85,
        timestamp: new Date('2024-01-14'),
      });
    });

    it('should search memories by query string', async () => {
      const results = await store.search('null pointer');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('null pointer');
    });

    it('should search memories by partial match', async () => {
      const results = await store.search('React');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content.toLowerCase()).toContain('react');
    });

    it('should return empty array for no matches', async () => {
      const results = await store.search('xyzzy-nonexistent-term');
      expect(results).toEqual([]);
    });

    it('should limit search results', async () => {
      const results = await store.search('', { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('searchByType()', () => {
    beforeEach(async () => {
      await store.store({
        type: 'mistake',
        content: 'Mistake 1',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      });

      await store.store({
        type: 'mistake',
        content: 'Mistake 2',
        tags: ['test'],
        importance: 0.6,
        timestamp: new Date(),
      });

      await store.store({
        type: 'knowledge',
        content: 'Knowledge 1',
        tags: ['test'],
        importance: 0.7,
        timestamp: new Date(),
      });
    });

    it('should filter memories by type', async () => {
      const mistakes = await store.searchByType('mistake');

      expect(mistakes.length).toBe(2);
      expect(mistakes.every((m) => m.type === 'mistake')).toBe(true);
    });

    it('should return empty array for type with no memories', async () => {
      const conversations = await store.searchByType('conversation');
      expect(conversations).toEqual([]);
    });

    it('should apply additional search options', async () => {
      const mistakes = await store.searchByType('mistake', { limit: 1 });
      expect(mistakes.length).toBe(1);
    });
  });

  describe('searchByTags()', () => {
    beforeEach(async () => {
      await store.store({
        type: 'knowledge',
        content: 'Security best practice',
        tags: ['security', 'best-practice'],
        importance: 0.9,
        timestamp: new Date(),
      });

      await store.store({
        type: 'knowledge',
        content: 'Performance optimization',
        tags: ['performance', 'optimization'],
        importance: 0.8,
        timestamp: new Date(),
      });

      await store.store({
        type: 'knowledge',
        content: 'Security performance tips',
        tags: ['security', 'performance'],
        importance: 0.85,
        timestamp: new Date(),
      });
    });

    it('should filter memories by single tag', async () => {
      const results = await store.searchByTags(['security']);

      expect(results.length).toBe(2);
      expect(results.every((m) => m.tags.includes('security'))).toBe(true);
    });

    it('should filter memories by multiple tags (OR logic)', async () => {
      const results = await store.searchByTags(['security', 'optimization']);

      expect(results.length).toBe(3);
    });

    it('should return empty array for non-existent tags', async () => {
      const results = await store.searchByTags(['non-existent-tag']);
      expect(results).toEqual([]);
    });
  });

  describe('Time range filtering', () => {
    beforeEach(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      await store.store({
        type: 'knowledge',
        content: 'Today memory',
        tags: ['recent'],
        importance: 0.5,
        timestamp: now,
      });

      await store.store({
        type: 'knowledge',
        content: 'Yesterday memory',
        tags: ['recent'],
        importance: 0.5,
        timestamp: yesterday,
      });

      await store.store({
        type: 'knowledge',
        content: 'Last week memory',
        tags: ['week'],
        importance: 0.5,
        timestamp: lastWeek,
      });

      await store.store({
        type: 'knowledge',
        content: 'Last month memory',
        tags: ['month'],
        importance: 0.5,
        timestamp: lastMonth,
      });

      await store.store({
        type: 'knowledge',
        content: 'Two months ago memory',
        tags: ['old'],
        importance: 0.5,
        timestamp: twoMonthsAgo,
      });
    });

    it('should filter by last-24h', async () => {
      const results = await store.search('', { timeRange: 'last-24h' });

      // Should include today and yesterday (within 24h window)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by last-7-days', async () => {
      const results = await store.search('', { timeRange: 'last-7-days' });

      // Should include today, yesterday, and last week (within 7 days)
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by last-30-days', async () => {
      const results = await store.search('', { timeRange: 'last-30-days' });

      // Should include all except two months ago
      expect(results.length).toBe(4);
    });

    it('should return all memories with timeRange: all', async () => {
      const results = await store.search('', { timeRange: 'all' });
      expect(results.length).toBe(5);
    });
  });

  describe('Importance filtering', () => {
    beforeEach(async () => {
      await store.store({
        type: 'knowledge',
        content: 'Low importance',
        tags: ['test'],
        importance: 0.3,
        timestamp: new Date(),
      });

      await store.store({
        type: 'knowledge',
        content: 'Medium importance',
        tags: ['test'],
        importance: 0.6,
        timestamp: new Date(),
      });

      await store.store({
        type: 'knowledge',
        content: 'High importance',
        tags: ['test'],
        importance: 0.9,
        timestamp: new Date(),
      });
    });

    it('should filter by minimum importance', async () => {
      const results = await store.search('', { minImportance: 0.5 });

      expect(results.length).toBe(2);
      expect(results.every((m) => m.importance >= 0.5)).toBe(true);
    });

    it('should return all memories with minImportance: 0', async () => {
      const results = await store.search('', { minImportance: 0 });
      expect(results.length).toBe(3);
    });

    it('should return only critical memories with high minImportance', async () => {
      const results = await store.search('', { minImportance: 0.8 });

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('High importance');
    });
  });

  describe('update()', () => {
    it('should update memory content', async () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Original content',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);
      const success = await store.update(id, { content: 'Updated content' });
      const updated = await store.get(id);

      expect(success).toBe(true);
      expect(updated!.content).toBe('Updated content');
    });

    it('should update memory tags', async () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test content',
        tags: ['old-tag'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);
      await store.update(id, { tags: ['new-tag-1', 'new-tag-2'] });
      const updated = await store.get(id);

      expect(updated!.tags).toContain('new-tag-1');
      expect(updated!.tags).toContain('new-tag-2');
    });

    it('should update memory importance', async () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test content',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);
      await store.update(id, { importance: 0.95 });
      const updated = await store.get(id);

      expect(updated!.importance).toBe(0.95);
    });

    it('should return false for non-existent ID', async () => {
      const success = await store.update('non-existent-id', { content: 'new' });
      expect(success).toBe(false);
    });
  });

  describe('delete()', () => {
    it('should delete a memory', async () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'To be deleted',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);
      const deleteSuccess = await store.delete(id);
      const retrieved = await store.get(id);

      expect(deleteSuccess).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const success = await store.delete('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('Combined search options', () => {
    beforeEach(async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      await store.store({
        type: 'mistake',
        content: 'Recent high-importance mistake',
        tags: ['security', 'critical'],
        importance: 0.95,
        timestamp: now,
      });

      await store.store({
        type: 'mistake',
        content: 'Old low-importance mistake',
        tags: ['minor'],
        importance: 0.3,
        timestamp: lastWeek,
      });

      await store.store({
        type: 'knowledge',
        content: 'Recent knowledge',
        tags: ['security'],
        importance: 0.8,
        timestamp: now,
      });
    });

    it('should combine type and importance filters', async () => {
      const results = await store.searchByType('mistake', { minImportance: 0.5 });

      expect(results.length).toBe(1);
      expect(results[0].content).toContain('high-importance');
    });

    it('should combine tags and time range filters', async () => {
      const results = await store.searchByTags(['security'], {
        timeRange: 'last-24h',
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should combine all filters', async () => {
      const results = await store.search('', {
        types: ['mistake'],
        tags: ['security'],
        timeRange: 'last-7-days',
        minImportance: 0.9,
        limit: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('mistake');
      expect(results[0].tags).toContain('security');
      expect(results[0].importance).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('KnowledgeGraph Integration', () => {
    it('should store memories as entities in KnowledgeGraph', async () => {
      const memory: UnifiedMemory = {
        type: 'decision',
        content: 'Use PostgreSQL for production database',
        tags: ['database', 'infrastructure'],
        importance: 0.9,
        timestamp: new Date(),
      };

      const id = await store.store(memory);

      // Verify entity exists in KnowledgeGraph
      const entity = knowledgeGraph.getEntity(id);
      expect(entity).not.toBeNull();
      expect(entity!.entityType).toBe('decision');
    });

    it('should create relations between memories', async () => {
      const memory1: UnifiedMemory = {
        type: 'decision',
        content: 'Original decision',
        tags: ['architecture'],
        importance: 0.8,
        timestamp: new Date(),
      };

      const id1 = await store.store(memory1);

      const memory2: UnifiedMemory = {
        type: 'decision',
        content: 'Follow-up decision',
        tags: ['architecture'],
        importance: 0.85,
        timestamp: new Date(),
        relations: [id1],
      };

      const id2 = await store.store(memory2);

      // Verify relation exists
      const trace = knowledgeGraph.traceRelations(id2);
      expect(trace).not.toBeNull();
      expect(trace!.relations.length).toBeGreaterThan(0);
    });
  });

  describe('Memory ID Security Validation', () => {
    it('should auto-generate ID when not provided', async () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory without ID',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);

      // ID should be auto-generated with format: unified-memory-<uuid>
      expect(id).toBeDefined();
      expect(id).toMatch(/^unified-memory-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should accept valid external ID with correct prefix', async () => {
      const validId = 'unified-memory-12345678-1234-1234-1234-123456789abc';
      const memory: UnifiedMemory = {
        id: validId,
        type: 'knowledge',
        content: 'Test memory with valid external ID',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);

      // Should accept the provided ID
      expect(id).toBe(validId);
    });

    it('should reject ID without correct prefix', async () => {
      const invalidId = 'invalid_id_12345';
      const memory: UnifiedMemory = {
        id: invalidId,
        type: 'knowledge',
        content: 'Test memory with invalid prefix',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      // Should throw validation error
      await expect(store.store(memory)).rejects.toThrow('Memory ID must start with prefix: unified-memory-');
    });

    it('should reject empty ID', async () => {
      const memory: UnifiedMemory = {
        id: '',
        type: 'knowledge',
        content: 'Test memory with empty ID',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      // Should throw validation error
      await expect(store.store(memory)).rejects.toThrow('Memory ID cannot be empty');
    });

    it('should reject whitespace-only ID', async () => {
      const memory: UnifiedMemory = {
        id: '   ',
        type: 'knowledge',
        content: 'Test memory with whitespace ID',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      // Should throw validation error
      await expect(store.store(memory)).rejects.toThrow('Memory ID cannot be empty');
    });
  });

  describe('Metadata Size Limit Validation', () => {
    it('should accept small metadata (< 1MB)', async () => {
      // Create ~500KB of metadata (well under the limit)
      const largeString = 'x'.repeat(500 * 1024);
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory with small metadata',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
        metadata: {
          data: largeString,
          description: 'This is valid metadata under 1MB',
        },
      };

      const id = await store.store(memory);

      // Should successfully store
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      // Verify retrieval
      const retrieved = await store.get(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.metadata).toBeDefined();
      expect(retrieved!.metadata!.data).toBe(largeString);
    });

    it('should reject oversized metadata (> 1MB)', async () => {
      // Create ~2MB of metadata (exceeds the limit)
      const largeString = 'x'.repeat(2 * 1024 * 1024);
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory with oversized metadata',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
        metadata: {
          data: largeString,
        },
      };

      // Should throw validation error
      await expect(store.store(memory)).rejects.toThrow(/Metadata size exceeds limit/);
      await expect(store.store(memory)).rejects.toThrow(/KB/); // Error should show KB
    });

    it('should handle edge case (exactly 1MB)', async () => {
      // Create exactly 1MB of metadata (should be rejected as >= limit)
      // Account for JSON overhead: {"data":"..."} adds ~11 bytes
      const exactSize = 1024 * 1024 - 11;
      const largeString = 'x'.repeat(exactSize);
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory with exactly 1MB metadata',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
        metadata: {
          data: largeString,
        },
      };

      // Should throw validation error (>= 1MB is rejected)
      await expect(store.store(memory)).rejects.toThrow(/Metadata size exceeds limit/);
    });

    it('should handle undefined metadata', async () => {
      // Memory without metadata should work normally
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory without metadata',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await store.store(memory);

      // Should successfully store
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      // Verify retrieval
      const retrieved = await store.get(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.metadata).toBeUndefined();
    });
  });
});
