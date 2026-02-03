/**
 * SmartMemoryQuery Tests
 *
 * TDD tests for context-aware memory search with relevance ranking.
 *
 * Test coverage:
 * - Exact content matching
 * - Tag matching
 * - Tech stack boost
 * - Importance ranking
 * - Recency boost
 * - Combined scoring
 * - Edge cases (empty query, no matches)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartMemoryQuery } from '../../../src/memory/SmartMemoryQuery.js';
import type { UnifiedMemory } from '../../../src/memory/types/unified-memory.js';

describe('SmartMemoryQuery', () => {
  let smartQuery: SmartMemoryQuery;
  let testMemories: UnifiedMemory[];

  beforeEach(() => {
    smartQuery = new SmartMemoryQuery();

    // Create test memory dataset
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    testMemories = [
      {
        id: 'mem-1',
        type: 'knowledge',
        content: 'Use TypeScript strict mode for better type safety',
        tags: ['typescript', 'best-practice', 'type-safety'],
        importance: 0.9,
        timestamp: now,
      },
      {
        id: 'mem-2',
        type: 'mistake',
        content: 'Forgot to validate user input in login endpoint',
        tags: ['security', 'validation', 'api'],
        importance: 0.95,
        timestamp: lastWeek,
      },
      {
        id: 'mem-3',
        type: 'decision',
        content: 'Chose PostgreSQL over MySQL for advanced features',
        tags: ['database', 'postgresql', 'architecture'],
        importance: 0.8,
        timestamp: lastMonth,
      },
      {
        id: 'mem-4',
        type: 'knowledge',
        content: 'React hooks best practices for state management',
        tags: ['react', 'hooks', 'frontend'],
        importance: 0.7,
        timestamp: now,
      },
      {
        id: 'mem-5',
        type: 'conversation',
        content: 'Discussed API rate limiting strategies',
        tags: ['api', 'performance', 'rate-limiting'],
        importance: 0.6,
        timestamp: lastWeek,
      },
    ];
  });

  describe('Exact content matching', () => {
    it('should rank exact content matches highest', () => {
      const results = smartQuery.search('TypeScript strict mode', testMemories);

      // mem-1 should be first (exact match in content)
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('mem-1');
    });

    it('should handle partial content matches', () => {
      const results = smartQuery.search('PostgreSQL', testMemories);

      // mem-3 should be in results (partial match)
      expect(results.length).toBeGreaterThan(0);
      const hasPostgresMemory = results.some(m => m.id === 'mem-3');
      expect(hasPostgresMemory).toBe(true);
    });
  });

  describe('Tag matching', () => {
    it('should score tag matches highly', () => {
      const results = smartQuery.search('security', testMemories);

      // mem-2 has 'security' tag
      expect(results.length).toBeGreaterThan(0);
      const securityMemory = results.find(m => m.id === 'mem-2');
      expect(securityMemory).toBeDefined();
    });

    it('should rank multiple tag matches higher', () => {
      const results = smartQuery.search('api', testMemories);

      // Both mem-2 and mem-5 have 'api' tag
      expect(results.length).toBeGreaterThanOrEqual(2);
      const hasApiMemories = results.filter(m =>
        m.id === 'mem-2' || m.id === 'mem-5'
      );
      expect(hasApiMemories.length).toBe(2);
    });
  });

  describe('Tech stack boost', () => {
    it('should boost memories matching tech stack', () => {
      const results = smartQuery.search('typescript', testMemories, {
        techStack: ['typescript', 'react'],
      });

      // mem-1 has exact tag match "typescript" + tech stack boost
      // Should rank first
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('mem-1');

      // Verify tech stack boost is applied
      const hasTechStackMatch = results.some(m =>
        m.id === 'mem-1' || m.id === 'mem-4'
      );
      expect(hasTechStackMatch).toBe(true);
    });

    it('should work without tech stack context', () => {
      const results = smartQuery.search('validation', testMemories);

      // Should still return results without tech stack
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Importance ranking', () => {
    it('should prioritize high-importance memories', () => {
      const results = smartQuery.search('validation', testMemories);

      // mem-2 has highest importance (0.95)
      expect(results.length).toBeGreaterThan(0);
      const validationMemory = results.find(m => m.id === 'mem-2');
      expect(validationMemory).toBeDefined();
    });

    it('should factor importance into overall score', () => {
      // Create two memories with same content but different importance
      const memories: UnifiedMemory[] = [
        {
          id: 'high-imp',
          type: 'knowledge',
          content: 'Testing importance ranking',
          tags: ['test'],
          importance: 0.9,
          timestamp: new Date(),
        },
        {
          id: 'low-imp',
          type: 'knowledge',
          content: 'Testing importance ranking',
          tags: ['test'],
          importance: 0.3,
          timestamp: new Date(),
        },
      ];

      const results = smartQuery.search('Testing importance', memories);

      // High importance should rank first
      expect(results[0].id).toBe('high-imp');
    });
  });

  describe('Recency boost', () => {
    it('should boost recent memories (< 7 days)', () => {
      const results = smartQuery.search('best practices', testMemories);

      // mem-1 and mem-4 are from today, should rank higher
      expect(results.length).toBeGreaterThan(0);
      const topResults = results.slice(0, 2);
      const hasRecentMemories = topResults.some(m =>
        m.id === 'mem-1' || m.id === 'mem-4'
      );
      expect(hasRecentMemories).toBe(true);
    });

    it('should apply moderate boost for memories < 30 days', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const moderate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const memories: UnifiedMemory[] = [
        {
          id: 'very-recent',
          type: 'knowledge',
          content: 'Recent memory test',
          tags: ['test'],
          importance: 0.5,
          timestamp: recent,
        },
        {
          id: 'moderately-recent',
          type: 'knowledge',
          content: 'Recent memory test',
          tags: ['test'],
          importance: 0.5,
          timestamp: moderate,
        },
      ];

      const results = smartQuery.search('Recent memory', memories);

      // Very recent should rank first due to stronger recency boost
      expect(results[0].id).toBe('very-recent');
    });
  });

  describe('Combined scoring', () => {
    it('should combine all scoring factors correctly', () => {
      const now = new Date();
      const memories: UnifiedMemory[] = [
        {
          id: 'perfect-match',
          type: 'knowledge',
          content: 'TypeScript best practices for production',
          tags: ['typescript', 'best-practice', 'production'],
          importance: 0.95,
          timestamp: now,
        },
        {
          id: 'partial-match',
          type: 'knowledge',
          content: 'Some other content about coding',
          tags: ['coding'],
          importance: 0.5,
          timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        },
      ];

      const results = smartQuery.search('TypeScript best practices', memories, {
        techStack: ['typescript'],
      });

      // perfect-match should score much higher:
      // - Exact content match: +100
      // - Multiple matching tags: +150 (3 tags)
      // - Tech stack boost: 1.5x
      // - High importance: 0.95x
      // - Recent: 1.2x
      expect(results[0].id).toBe('perfect-match');
    });
  });

  describe('Edge cases', () => {
    it('should return all memories for empty query', () => {
      const results = smartQuery.search('', testMemories);

      expect(results.length).toBe(testMemories.length);
    });

    it('should return empty array for no matches', () => {
      const results = smartQuery.search('xyzzy-nonexistent-term-12345', testMemories);

      expect(results).toEqual([]);
    });

    it('should handle memories with undefined tags', () => {
      const memories: UnifiedMemory[] = [
        {
          id: 'no-tags',
          type: 'knowledge',
          content: 'Memory without tags',
          tags: [],
          importance: 0.5,
          timestamp: new Date(),
        },
      ];

      const results = smartQuery.search('Memory without', memories);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('no-tags');
    });

    it('should handle whitespace-only query', () => {
      const results = smartQuery.search('   ', testMemories);

      // Should treat as empty query
      expect(results.length).toBe(testMemories.length);
    });
  });
});
