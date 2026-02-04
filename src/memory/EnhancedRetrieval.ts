/**
 * EnhancedRetrieval - Simplified Memory Search
 *
 * Provides basic search capabilities. Intelligence (semantic understanding,
 * relevance ranking, cross-language matching) is delegated to Claude via
 * MCP tool descriptions.
 *
 * Features:
 * - Exact match: Direct string matching (FTS5 in KnowledgeGraph, LIKE fallback)
 * - Tag match: Search by memory tags
 * - Type filtering: Filter results by memory type
 *
 * What this does NOT do (Claude does via prompts):
 * - Semantic similarity calculation
 * - Cross-language matching
 * - Relevance ranking
 * - Advanced fuzzy matching (delegated to Claude)
 */

import type { UnifiedMemory, MemoryType } from './types/unified-memory.js';
import type { UnifiedMemoryStore } from './UnifiedMemoryStore.js';

/**
 * Match type indicating how a memory was found
 */
export type MatchType = 'exact' | 'tag';

/**
 * Search result with basic metadata
 */
export interface EnhancedSearchResult {
  /** The memory that matched */
  memory: UnifiedMemory;
  /** How the memory was matched */
  matchType: MatchType;
  /** Simple score: 1.0 for exact, 0.8 for tag */
  score: number;
}

/**
 * Search options
 */
export interface EnhancedSearchOptions {
  /** Enable tag matching (default: true) */
  enableTags?: boolean;
  /** Maximum number of results (default: 50) */
  limit?: number;
  /** Filter by memory types */
  types?: MemoryType[];
}

/**
 * Default search options
 */
const DEFAULT_OPTIONS: Required<EnhancedSearchOptions> = {
  enableTags: true,
  limit: 50,
  types: [],
};

/**
 * EnhancedRetrieval - Basic search with type filtering
 *
 * NOTE: This is intentionally simple. Complex logic (semantic matching,
 * relevance ranking, cross-language search) is handled by Claude via
 * prompts in MCP tool descriptions.
 */
export class EnhancedRetrieval {
  constructor(private store: UnifiedMemoryStore) {}

  /**
   * Search for memories matching the query
   *
   * Returns all candidate matches. The calling LLM should review and filter based on
   * semantic relevance, as described in the MCP tool description.
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  async search(query: string, options?: EnhancedSearchOptions): Promise<EnhancedSearchResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const results: Map<string, EnhancedSearchResult> = new Map();

    // 1. Exact match (SQLite FTS5 handles fuzzy matching automatically)
    const exactMatches = await this.exactMatch(query);
    for (const memory of exactMatches) {
      if (this.matchesTypeFilter(memory, opts.types)) {
        results.set(memory.id!, {
          memory,
          score: 1.0,
          matchType: 'exact',
        });
      }
    }

    // 2. Tag match
    if (opts.enableTags) {
      const tagMatches = await this.tagMatch(query);
      for (const memory of tagMatches) {
        if (this.matchesTypeFilter(memory, opts.types)) {
          const existing = results.get(memory.id!);
          if (!existing) {
            // Only add if not already found by exact match
            results.set(memory.id!, {
              memory,
              score: 0.8,
              matchType: 'tag',
            });
          }
        }
      }
    }

    // Convert to array and sort by score (exact matches first)
    const sortedResults = Array.from(results.values()).sort((a, b) => b.score - a.score);

    // Apply limit
    return sortedResults.slice(0, opts.limit);
  }

  /**
   * Exact string match search using SQLite FTS5
   *
   * @param query - Search query
   * @returns Array of matching memories
   */
  async exactMatch(query: string): Promise<UnifiedMemory[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    return this.store.search(query);
  }

  /**
   * Search memories by tag
   *
   * @param query - Tag to search for
   * @returns Array of matching memories
   */
  async tagMatch(query: string): Promise<UnifiedMemory[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Search by tag
    const matches = await this.store.searchByTags([normalizedQuery]);
    return matches;
  }

  /**
   * Check if memory matches type filter
   */
  private matchesTypeFilter(memory: UnifiedMemory, types: MemoryType[]): boolean {
    if (!types || types.length === 0) {
      return true;
    }
    return types.includes(memory.type);
  }
}
