/**
 * MemorySearchEngine Tests
 *
 * Tests for the extracted search, filter, rank, and deduplication logic.
 * All tests use mock data - no KnowledgeGraph dependency required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySearchEngine } from '../MemorySearchEngine.js';
import type { UnifiedMemory } from '../types/unified-memory.js';

function makeMemory(overrides: Partial<UnifiedMemory> = {}): UnifiedMemory {
  return {
    id: `unified-memory-${Math.random().toString(36).slice(2)}`,
    type: 'knowledge',
    content: 'default content',
    tags: [],
    importance: 0.5,
    timestamp: new Date(),
    ...overrides,
  };
}

describe('MemorySearchEngine', () => {
  let engine: MemorySearchEngine;

  beforeEach(() => {
    engine = new MemorySearchEngine();
  });

  describe('filterByQuery()', () => {
    const memories = [
      makeMemory({ content: 'Forgot to handle null pointer exception' }),
      makeMemory({ content: 'Use early return pattern for readability' }),
      makeMemory({ content: 'Adopt React Query for state management', context: 'frontend review' }),
    ];

    it('should filter by content substring (case-insensitive)', () => {
      const results = engine.filterByQuery(memories, 'null pointer');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('null pointer');
    });

    it('should match case-insensitively', () => {
      const results = engine.filterByQuery(memories, 'REACT');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('React');
    });

    it('should match on context field', () => {
      const results = engine.filterByQuery(memories, 'frontend');
      expect(results).toHaveLength(1);
      expect(results[0].context).toContain('frontend');
    });

    it('should return all memories for empty query', () => {
      expect(engine.filterByQuery(memories, '')).toHaveLength(3);
      expect(engine.filterByQuery(memories, '   ')).toHaveLength(3);
    });

    it('should return empty array when nothing matches', () => {
      expect(engine.filterByQuery(memories, 'xyzzy-nonexistent')).toHaveLength(0);
    });
  });

  describe('applySearchFilters()', () => {
    describe('time range filtering', () => {
      const now = new Date();
      const memories = [
        makeMemory({ content: 'today', timestamp: now }),
        makeMemory({
          content: 'yesterday',
          timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        }),
        makeMemory({
          content: 'last week',
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        }),
        makeMemory({
          content: 'last month',
          timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        }),
        makeMemory({
          content: 'two months ago',
          timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        }),
      ];

      it('should filter by last-24h', () => {
        const results = engine.applySearchFilters(memories, { timeRange: 'last-24h' });
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.length).toBeLessThanOrEqual(2);
      });

      it('should filter by last-7-days', () => {
        const results = engine.applySearchFilters(memories, { timeRange: 'last-7-days' });
        expect(results.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter by last-30-days', () => {
        const results = engine.applySearchFilters(memories, { timeRange: 'last-30-days' });
        expect(results).toHaveLength(4);
      });

      it('should return all with timeRange: all', () => {
        const results = engine.applySearchFilters(memories, { timeRange: 'all' });
        expect(results).toHaveLength(5);
      });
    });

    describe('importance filtering', () => {
      const memories = [
        makeMemory({ content: 'low', importance: 0.3 }),
        makeMemory({ content: 'medium', importance: 0.6 }),
        makeMemory({ content: 'high', importance: 0.9 }),
      ];

      it('should filter by minimum importance', () => {
        const results = engine.applySearchFilters(memories, { minImportance: 0.5 });
        expect(results).toHaveLength(2);
        expect(results.every((m) => m.importance >= 0.5)).toBe(true);
      });

      it('should return all with minImportance: 0', () => {
        const results = engine.applySearchFilters(memories, { minImportance: 0 });
        expect(results).toHaveLength(3);
      });
    });

    describe('type filtering', () => {
      const memories = [
        makeMemory({ type: 'mistake', content: 'm1' }),
        makeMemory({ type: 'mistake', content: 'm2' }),
        makeMemory({ type: 'knowledge', content: 'k1' }),
        makeMemory({ type: 'decision', content: 'd1' }),
      ];

      it('should filter by single type', () => {
        const results = engine.applySearchFilters(memories, { types: ['mistake'] });
        expect(results).toHaveLength(2);
        expect(results.every((m) => m.type === 'mistake')).toBe(true);
      });

      it('should filter by multiple types', () => {
        const results = engine.applySearchFilters(memories, {
          types: ['mistake', 'decision'],
        });
        expect(results).toHaveLength(3);
      });
    });

    describe('limit', () => {
      const memories = Array.from({ length: 10 }, (_, i) =>
        makeMemory({ content: `item ${i}` })
      );

      it('should apply limit', () => {
        const results = engine.applySearchFilters(memories, { limit: 3 });
        expect(results).toHaveLength(3);
      });

      it('should return all when limit exceeds count', () => {
        const results = engine.applySearchFilters(memories, { limit: 100 });
        expect(results).toHaveLength(10);
      });
    });

    describe('combined filters', () => {
      it('should combine type, importance, and time filters', () => {
        const now = new Date();
        const memories = [
          makeMemory({
            type: 'mistake',
            content: 'recent important mistake',
            importance: 0.95,
            timestamp: now,
          }),
          makeMemory({
            type: 'mistake',
            content: 'old low mistake',
            importance: 0.3,
            timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          }),
          makeMemory({
            type: 'knowledge',
            content: 'recent knowledge',
            importance: 0.8,
            timestamp: now,
          }),
        ];

        const results = engine.applySearchFilters(memories, {
          types: ['mistake'],
          minImportance: 0.9,
          timeRange: 'last-7-days',
        });

        expect(results).toHaveLength(1);
        expect(results[0].content).toContain('recent important');
      });
    });
  });

  describe('deduplicateResults()', () => {
    it('should remove duplicates by content', () => {
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: 'same content', importance: 0.5 }),
        makeMemory({ id: 'unified-memory-b', content: 'same content', importance: 0.7 }),
        makeMemory({ id: 'unified-memory-c', content: 'unique content', importance: 0.5 }),
      ];

      const results = engine.deduplicateResults(memories);
      expect(results).toHaveLength(2);
    });

    it('should keep the entry with higher importance', () => {
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: 'dup', importance: 0.3 }),
        makeMemory({ id: 'unified-memory-b', content: 'dup', importance: 0.9 }),
      ];

      const results = engine.deduplicateResults(memories);
      expect(results).toHaveLength(1);
      expect(results[0].importance).toBe(0.9);
    });

    it('should break ties by most recent timestamp', () => {
      const older = new Date('2024-01-01');
      const newer = new Date('2024-06-01');
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: 'dup', importance: 0.5, timestamp: older }),
        makeMemory({ id: 'unified-memory-b', content: 'dup', importance: 0.5, timestamp: newer }),
      ];

      const results = engine.deduplicateResults(memories);
      expect(results).toHaveLength(1);
      expect(results[0].timestamp).toEqual(newer);
    });

    it('should not deduplicate empty-content memories against each other', () => {
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: '' }),
        makeMemory({ id: 'unified-memory-b', content: '' }),
      ];

      const results = engine.deduplicateResults(memories);
      expect(results).toHaveLength(2);
    });

    it('should return as-is when 0 or 1 memories', () => {
      expect(engine.deduplicateResults([])).toHaveLength(0);
      const single = [makeMemory()];
      expect(engine.deduplicateResults(single)).toEqual(single);
    });

    it('should handle NaN importance defensively', () => {
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: 'dup', importance: NaN }),
        makeMemory({ id: 'unified-memory-b', content: 'dup', importance: 0.5 }),
      ];

      const results = engine.deduplicateResults(memories);
      expect(results).toHaveLength(1);
      expect(results[0].importance).toBe(0.5);
    });
  });

  describe('rankByRelevance()', () => {
    it('should return all memories for empty query', () => {
      const memories = [makeMemory({ content: 'a' }), makeMemory({ content: 'b' })];
      const results = engine.rankByRelevance('', memories);
      expect(results).toHaveLength(2);
    });

    it('should rank matching memories higher', () => {
      const memories = [
        makeMemory({ content: 'unrelated content' }),
        makeMemory({ content: 'security vulnerability found', tags: ['security'] }),
      ];

      const results = engine.rankByRelevance('security', memories);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('security');
    });

    it('should filter out non-matching memories', () => {
      const memories = [
        makeMemory({ content: 'completely unrelated' }),
        makeMemory({ content: 'matching query term' }),
      ];

      const results = engine.rankByRelevance('matching', memories);
      expect(results).toHaveLength(1);
    });
  });

  describe('processSearchResults()', () => {
    it('should run full pipeline: dedup -> rank -> limit', () => {
      const memories = [
        makeMemory({ id: 'unified-memory-a', content: 'security best practice', importance: 0.5 }),
        makeMemory({ id: 'unified-memory-b', content: 'security best practice', importance: 0.9 }),
        makeMemory({ id: 'unified-memory-c', content: 'performance tips', importance: 0.7 }),
        makeMemory({ id: 'unified-memory-d', content: 'security audit results', importance: 0.8 }),
      ];

      const results = engine.processSearchResults('security', memories, undefined, 2);

      // Should have deduplicated the two "security best practice" entries
      // and limited to 2 results
      expect(results.length).toBeLessThanOrEqual(2);
      // All results should be security-related
      expect(results.every((m) => m.content.toLowerCase().includes('security'))).toBe(true);
    });

    it('should work without a limit', () => {
      const memories = [
        makeMemory({ content: 'alpha topic' }),
        makeMemory({ content: 'beta topic' }),
      ];

      const results = engine.processSearchResults('topic', memories);
      expect(results).toHaveLength(2);
    });
  });
});
