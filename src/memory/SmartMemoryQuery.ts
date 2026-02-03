/**
 * SmartMemoryQuery - Context-aware memory search with relevance ranking
 *
 * Implements intelligent search with multi-level scoring:
 * 1. Exact content matching
 * 2. Tag matching
 * 3. Tech stack context boost
 * 4. Importance weighting
 * 5. Recency boost
 *
 * @module SmartMemoryQuery
 */

import type { UnifiedMemory, SearchOptions } from './types/unified-memory.js';

/**
 * SmartMemoryQuery - Context-aware memory search with relevance ranking
 *
 * Features:
 * - Multi-level search strategy (exact → tag → content)
 * - Context-aware scoring (tech stack boost)
 * - Relevance ranking (importance + recency + TF)
 *
 * @example
 * ```typescript
 * const smartQuery = new SmartMemoryQuery();
 * const results = smartQuery.search('authentication', memories, {
 *   techStack: ['typescript', 'nodejs'],
 * });
 * ```
 */
export class SmartMemoryQuery {
  /**
   * Search memories with context-aware ranking
   *
   * Applies intelligent scoring and ranking to find the most relevant memories.
   * Returns results sorted by relevance score (highest first).
   *
   * @param query Search query string
   * @param memories Base memory set to search
   * @param options Search options with optional context (techStack, projectPath)
   * @returns Ranked memories by relevance (filtered to score > 0)
   *
   * @example
   * ```typescript
   * const results = smartQuery.search('JWT authentication', memories, {
   *   techStack: ['nodejs', 'express'],
   * });
   * // Returns memories ranked by relevance to the query
   * ```
   */
  public search(
    query: string,
    memories: UnifiedMemory[],
    options?: SearchOptions & { projectPath?: string; techStack?: string[] }
  ): UnifiedMemory[] {
    // Empty or whitespace-only query returns all memories (no filtering)
    if (!query || query.trim() === '') {
      return memories;
    }

    const queryLower = query.toLowerCase();
    const techStack = options?.techStack || [];

    // Score each memory based on relevance
    const scored = memories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, queryLower, techStack),
    }));

    // Sort by score (highest first) and filter out non-matches (score = 0)
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);
  }

  /**
   * Calculate relevance score for a memory
   *
   * Scoring formula combines multiple factors:
   * - Exact match in content: 100 points base
   * - Tag match: 50 points per matching tag
   * - Content TF score: up to 20 points
   * - Tech stack boost: 1.5x multiplier
   * - Importance boost: score * importance
   * - Recency boost: up to 1.2x for recent memories
   *
   * @param memory Memory to score
   * @param queryLower Lowercase query string
   * @param techStack Tech stack context for boost
   * @returns Relevance score (0 = no match, higher = more relevant)
   *
   * @private
   */
  private calculateRelevanceScore(
    memory: UnifiedMemory,
    queryLower: string,
    techStack: string[]
  ): number {
    let score = 0;

    const contentLower = memory.content.toLowerCase();
    const tags = memory.tags || [];

    // 1. Exact/Partial content match (highest priority)
    if (contentLower.includes(queryLower)) {
      score += 100;

      // TF-based content scoring (bonus for multiple occurrences)
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
      const contentWords = contentLower.split(/\s+/).filter(w => w.length > 0);

      const termFrequency = queryWords.reduce((freq, word) => {
        return freq + contentWords.filter(cw => cw.includes(word)).length;
      }, 0);

      // Cap TF bonus at 20 points
      score += Math.min(termFrequency * 5, 20);
    }

    // 2. Tag matching (high priority)
    const matchingTags = tags.filter(
      tag =>
        tag.toLowerCase().includes(queryLower) ||
        queryLower.includes(tag.toLowerCase())
    );
    // Cap tag score at 200 points (max 4 tags) to prevent score overflow
    const tagScore = Math.min(matchingTags.length * 50, 200);
    score += tagScore;

    // If no content or tag match, return 0 (no relevance)
    if (score === 0) {
      return 0;
    }

    // 3. Tech stack boost (context-aware multiplier)
    const hasTechMatch = tags.some(tag =>
      techStack.some(tech => tag.toLowerCase().includes(tech.toLowerCase()))
    );
    if (hasTechMatch && techStack.length > 0) {
      score *= 1.5;
    }

    // 4. Importance boost (multiply by importance)
    score *= memory.importance;

    // 5. Recency boost (favor recent memories)
    const daysSinceCreation =
      (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 7) {
      score *= 1.2; // Strong boost for very recent (< 1 week)
    } else if (daysSinceCreation < 30) {
      score *= 1.1; // Moderate boost for recent (< 1 month)
    }
    // No boost for older memories (> 30 days)

    return score;
  }
}
