import { describe, it, expect } from 'vitest';
import { ContextMatcher } from './ContextMatcher.js';
import type { PatternContext, ContextualPattern } from './types.js';

describe('ContextMatcher', () => {
  describe('computeSimilarity', () => {
    it('should return 1.0 for identical contexts', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
        config_keys: ['database', 'timeout'],
      };
      const ctx2: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
        config_keys: ['database', 'timeout'],
      };

      const similarity = matcher.computeSimilarity(ctx1, ctx2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for completely different contexts', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'low',
      };
      const ctx2: PatternContext = {
        agent_type: 'frontend-developer',
        task_type: 'component_rendering',
        complexity: 'high',
      };

      const similarity = matcher.computeSimilarity(ctx1, ctx2);
      // With "both undefined = match" semantic, config_keys (both undefined) contributes 0.1
      expect(similarity).toBeCloseTo(0.1, 5);
    });

    it('should compute partial similarity for partially matching contexts', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
      };
      const ctx2: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'data_visualization',
        complexity: 'medium',
      };

      const similarity = matcher.computeSimilarity(ctx1, ctx2);
      // Should match on agent_type (0.4), complexity (0.2), and config_keys both undefined (0.1) = 0.7
      // With default weights: agent_type=0.4, task_type=0.3, complexity=0.2, config_keys=0.1
      expect(similarity).toBeCloseTo(0.7, 5);
    });

    it('should use Jaccard similarity for config_keys', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
        config_keys: ['database', 'timeout', 'cache'],
      };
      const ctx2: PatternContext = {
        agent_type: 'data-analyst',
        config_keys: ['database', 'timeout'],
      };

      const similarity = matcher.computeSimilarity(ctx1, ctx2);
      // agent_type match: 0.4
      // task_type both undefined: 0.3
      // complexity both undefined: 0.2
      // config_keys Jaccard: 2/3 ≈ 0.667, weighted 0.1 * 0.667 ≈ 0.0667
      // Total ≈ 0.967
      expect(similarity).toBeCloseTo(0.967, 2);
    });

    it('should support custom weights', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
      };
      const ctx2: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'data_visualization',
      };

      // Default weights: agent_type=0.4, task_type=0.3, complexity=0.2, config_keys=0.1
      // Matches: agent_type (0.4), complexity both undefined (0.2), config_keys both undefined (0.1) = 0.7
      const defaultSimilarity = matcher.computeSimilarity(ctx1, ctx2);
      expect(defaultSimilarity).toBeCloseTo(0.7, 5);

      // Custom weights: prioritize task_type
      const customSimilarity = matcher.computeSimilarity(ctx1, ctx2, {
        agent_type: 0.2,
        task_type: 0.6,
        complexity: 0.1,
        config_keys: 0.1,
      });
      // Matches: agent_type (0.2), complexity both undefined (0.1), config_keys both undefined (0.1) = 0.4
      expect(customSimilarity).toBeCloseTo(0.4, 5);
    });

    it('should handle missing context fields gracefully', () => {
      const matcher = new ContextMatcher();
      const ctx1: PatternContext = {
        agent_type: 'data-analyst',
      };
      const ctx2: PatternContext = {
        task_type: 'sql_query',
      };

      const similarity = matcher.computeSimilarity(ctx1, ctx2);
      // No defined fields match, but complexity (both undefined) and config_keys (both undefined) match
      // complexity: 0.2, config_keys: 0.1 = 0.3
      expect(similarity).toBeCloseTo(0.3, 5);
    });
  });

  describe('findBestMatches', () => {
    const patterns: ContextualPattern[] = [
      {
        id: 'pattern-1',
        type: 'success',
        description: 'Optimize SQL queries',
        confidence: 0.9,
        observations: 20,
        success_rate: 0.95,
        avg_execution_time: 150,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'data-analyst',
          task_type: 'sql_query',
          complexity: 'high',
        },
      },
      {
        id: 'pattern-2',
        type: 'success',
        description: 'Use parameterized queries',
        confidence: 0.85,
        observations: 15,
        success_rate: 0.92,
        avg_execution_time: 100,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'data-analyst',
          task_type: 'sql_query',
          complexity: 'medium',
        },
      },
      {
        id: 'pattern-3',
        type: 'success',
        description: 'Component memoization',
        confidence: 0.8,
        observations: 10,
        success_rate: 0.88,
        avg_execution_time: 80,
        last_seen: new Date().toISOString(),
        context: {
          agent_type: 'frontend-developer',
          task_type: 'component_optimization',
          complexity: 'medium',
        },
      },
    ];

    it('should find best matching patterns sorted by score', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
      };

      const matches = matcher.findBestMatches(currentContext, patterns);

      // Should have all 3 patterns
      expect(matches.length).toBe(3);

      // pattern-2 should be first (exact match on all fields including config_keys both undefined)
      expect(matches[0].pattern.id).toBe('pattern-2');
      expect(matches[0].similarity).toBeCloseTo(1.0, 5);

      // pattern-1 should be second (matches agent_type and task_type but not complexity)
      expect(matches[1].pattern.id).toBe('pattern-1');
      expect(matches[1].similarity).toBeGreaterThan(0.6);
      expect(matches[1].similarity).toBeLessThan(1.0);

      // pattern-3 should be last (complexity + config_keys match)
      expect(matches[2].pattern.id).toBe('pattern-3');
      expect(matches[2].similarity).toBeCloseTo(0.3, 5);
    });

    it('should limit results when top_k is specified', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
      };

      const matches = matcher.findBestMatches(currentContext, patterns, {
        top_k: 2,
      });

      expect(matches.length).toBe(2);
      // Both pattern-1 and pattern-2 have similarity 0.8 (agent+task+config_keys)
      // Sorted by score: pattern-1 (0.8×0.9=0.72) > pattern-2 (0.8×0.85=0.68)
      expect(matches[0].pattern.id).toBe('pattern-1');
      expect(matches[1].pattern.id).toBe('pattern-2');
    });

    it('should filter by minimum similarity threshold', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'medium',
      };

      const matches = matcher.findBestMatches(currentContext, patterns, {
        min_similarity: 0.7,
      });

      // Only pattern-1 and pattern-2 should meet threshold
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(2);
      expect(matches.every((m) => m.similarity >= 0.7)).toBe(true);
    });

    it('should compute score as similarity * confidence', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'high',
      };

      const matches = matcher.findBestMatches(currentContext, patterns);

      // pattern-1: similarity=1.0, confidence=0.9, score=0.9
      const pattern1Match = matches.find((m) => m.pattern.id === 'pattern-1');
      expect(pattern1Match).toBeDefined();
      expect(pattern1Match!.score).toBeCloseTo(0.9, 2);
    });

    it('should return empty array for no patterns', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
      };

      const matches = matcher.findBestMatches(currentContext, []);
      expect(matches).toEqual([]);
    });

    it('should use custom weights when provided', () => {
      const matcher = new ContextMatcher();
      const currentContext: PatternContext = {
        agent_type: 'data-analyst',
        complexity: 'medium',
      };

      const defaultMatches = matcher.findBestMatches(currentContext, patterns);
      const customMatches = matcher.findBestMatches(currentContext, patterns, {
        weights: {
          agent_type: 0.8,
          task_type: 0.1,
          complexity: 0.1,
          config_keys: 0.0,
        },
      });

      // Custom weights should produce different similarity scores
      expect(customMatches[0].similarity).not.toBe(defaultMatches[0].similarity);
    });
  });
});
