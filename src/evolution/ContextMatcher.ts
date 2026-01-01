/**
 * Context Matcher - Computes similarity between pattern contexts (Phase 2)
 *
 * Uses weighted similarity matching with:
 * - Exact matching for categorical fields (agent_type, task_type, complexity)
 * - Jaccard similarity for set-based fields (config_keys)
 */

import { logger } from '../utils/logger.js';
import type { PatternContext, ContextualPattern } from './types.js';

export interface MatchOptions {
  /**
   * Weights for different context dimensions
   * Default: { agent_type: 0.4, task_type: 0.3, complexity: 0.2, config_keys: 0.1 }
   */
  weights?: {
    agent_type: number;
    task_type: number;
    complexity: number;
    config_keys: number;
  };

  /**
   * Minimum similarity threshold (0-1)
   */
  min_similarity?: number;

  /**
   * Maximum number of results to return
   */
  top_k?: number;
}

export interface PatternMatch {
  /**
   * The matched pattern
   */
  pattern: ContextualPattern;

  /**
   * Context similarity score (0-1)
   */
  similarity: number;

  /**
   * Combined score (similarity * confidence)
   */
  score: number;
}

export class ContextMatcher {
  /**
   * Default context similarity weights
   *
   * Rationale:
   * - agent_type (0.4): Strongest signal - same agent type means similar capabilities
   * - task_type (0.3): Second strongest - same task type means similar requirements
   * - complexity (0.2): Moderate signal - complexity affects strategy choice
   * - config_keys (0.1): Weakest signal - configuration is most variable
   *
   * Total: 1.0 (ensures similarity score is normalized 0-1)
   */
  private defaultWeights = {
    agent_type: 0.4,
    task_type: 0.3,
    complexity: 0.2,
    config_keys: 0.1,
  };

  /**
   * Check if two optional values match (both equal OR both undefined)
   * @returns true if match, false otherwise
   */
  private valuesMatch<T>(val1: T | undefined, val2: T | undefined): boolean {
    if (val1 !== undefined && val2 !== undefined) {
      return val1 === val2;
    }
    return val1 === undefined && val2 === undefined;
  }

  /**
   * Compute weighted similarity between two contexts
   *
   * Similarity is computed as the sum of weights for matching dimensions.
   * Weights should sum to 1.0 for the total possible similarity.
   *
   * @param ctx1 First context
   * @param ctx2 Second context
   * @param weights Optional custom weights
   * @returns Similarity score (0-1)
   */
  computeSimilarity(
    ctx1: PatternContext,
    ctx2: PatternContext,
    weights?: MatchOptions['weights']
  ): number {
    const w = weights || this.defaultWeights;

    // Validate weights sum to ~1.0 (allow small floating point error)
    if (weights) {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        logger.warn('[ContextMatcher] Weights do not sum to 1.0', {
          weights,
          sum,
        });
      }
    }

    let similarity = 0;

    // Categorical field matching (agent_type, task_type, complexity)
    if (this.valuesMatch(ctx1.agent_type, ctx2.agent_type)) {
      similarity += w.agent_type;
    }

    if (this.valuesMatch(ctx1.task_type, ctx2.task_type)) {
      similarity += w.task_type;
    }

    if (this.valuesMatch(ctx1.complexity, ctx2.complexity)) {
      similarity += w.complexity;
    }

    // Config keys matching (Jaccard similarity)
    if (ctx1.config_keys !== undefined && ctx2.config_keys !== undefined) {
      const jaccardSimilarity = this.jaccardSimilarity(
        ctx1.config_keys,
        ctx2.config_keys
      );
      similarity += w.config_keys * jaccardSimilarity;
    } else if (ctx1.config_keys === undefined && ctx2.config_keys === undefined) {
      // Both undefined = perfect match (1.0 Jaccard similarity)
      similarity += w.config_keys;
    }

    return similarity;
  }

  /**
   * Find best matching patterns for a given context
   *
   * @param currentContext The context to match against
   * @param patterns Available patterns
   * @param options Matching options
   * @returns Sorted array of pattern matches (best first)
   */
  findBestMatches(
    currentContext: PatternContext,
    patterns: ContextualPattern[],
    options: MatchOptions = {}
  ): PatternMatch[] {
    // Validate current context has at least one defined field
    const hasDefinedField = Object.values(currentContext).some(
      (v) => v !== undefined
    );
    if (!hasDefinedField) {
      logger.warn(
        '[ContextMatcher] Current context has no defined fields',
        { currentContext }
      );
      return [];
    }

    if (patterns.length === 0) {
      return [];
    }

    // Compute similarity and score for each pattern
    const matches: PatternMatch[] = patterns.map((pattern) => {
      const similarity = this.computeSimilarity(
        currentContext,
        pattern.context,
        options.weights
      );
      const score = similarity * pattern.confidence;

      return {
        pattern,
        similarity,
        score,
      };
    });

    // Filter by minimum similarity if specified
    let filteredMatches = matches;
    if (options.min_similarity !== undefined) {
      const minSimilarity = options.min_similarity; // Extract to variable
      filteredMatches = matches.filter((m) => m.similarity >= minSimilarity);
    }

    // Sort by score (descending)
    filteredMatches.sort((a, b) => b.score - a.score);

    // Limit results if top_k is specified
    if (options.top_k !== undefined) {
      filteredMatches = filteredMatches.slice(0, options.top_k);
    }

    return filteredMatches;
  }

  /**
   * Compute Jaccard similarity between two sets
   *
   * Jaccard similarity = |A ∩ B| / |A ∪ B|
   *
   * Edge cases:
   * - Both empty: 1.0 (identical)
   * - One empty, one non-empty: 0.0 (no overlap)
   * - Duplicate elements in arrays: handled by Set deduplication
   *
   * @param set1 First set
   * @param set2 Second set
   * @returns Jaccard similarity (0-1)
   */
  private jaccardSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) {
      return 1.0; // Both empty sets are considered identical
    }

    const s1 = new Set(set1);
    const s2 = new Set(set2);

    // Intersection
    const intersection = new Set([...s1].filter((x) => s2.has(x)));

    // Union
    const union = new Set([...s1, ...s2]);

    return intersection.size / union.size;
  }
}
