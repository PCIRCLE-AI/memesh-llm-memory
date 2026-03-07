/**
 * MemorySearchEngine - Search, filter, rank, and deduplicate memory results
 *
 * Extracted from UnifiedMemoryStore to separate search concerns from storage.
 * All methods are pure data operations that do not require KnowledgeGraph access.
 *
 * Responsibilities:
 * - Content-based query filtering (substring match)
 * - Search filter application (time range, importance, type, limit)
 * - Result deduplication by content hash
 * - Relevance ranking via SmartMemoryQuery delegation
 */

import type { UnifiedMemory, SearchOptions } from './types/unified-memory.js';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { SmartMemoryQuery } from './SmartMemoryQuery.js';

export class MemorySearchEngine {
  private readonly smartQuery: SmartMemoryQuery;

  constructor() {
    this.smartQuery = new SmartMemoryQuery();
  }

  /**
   * Filter memories by query string (substring match on content and context)
   *
   * @param memories - Memories to filter
   * @param query - Query string to match against content and context
   * @returns Memories whose content or context contains the query (case-insensitive)
   */
  filterByQuery(memories: UnifiedMemory[], query: string): UnifiedMemory[] {
    if (!query || !query.trim()) {
      return memories;
    }

    const lowerQuery = query.toLowerCase();
    return memories.filter(
      (m) =>
        m.content.toLowerCase().includes(lowerQuery) ||
        m.context?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Apply common search filters (time range, importance, type, limit)
   *
   * @param memories - Memories to filter
   * @param options - Search options
   * @returns Filtered memories
   */
  applySearchFilters(memories: UnifiedMemory[], options?: SearchOptions): UnifiedMemory[] {
    let filtered = memories;

    // Apply time range filter
    if (options?.timeRange && options.timeRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (options.timeRange) {
        case 'last-24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last-7-days':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last-30-days':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((m) => m.timestamp.getTime() >= cutoffDate.getTime());
    }

    // Apply importance filter
    if (options?.minImportance !== undefined) {
      filtered = filtered.filter((m) => m.importance >= options.minImportance!);
    }

    // Apply type filter
    if (options?.types && options.types.length > 0) {
      filtered = filtered.filter((m) => options.types!.includes(m.type));
    }

    // Apply limit after all filters
    if (options?.limit && filtered.length > options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Deduplicate memory search results by content
   *
   * When the same content exists under multiple entity IDs (e.g., pre-migration
   * data without content_hash, or edge cases in concurrent storage), this method
   * ensures only one result per unique content is returned.
   *
   * Strategy:
   * - Uses a SHA-256 hash of content for efficient O(1) lookup
   * - When duplicates are found, keeps the entry with the highest importance
   *   (breaks ties by most recent timestamp)
   * - Operates in O(n) time and O(n) space, suitable for search result sets
   *
   * @param memories - Array of memories that may contain duplicates
   * @returns Deduplicated array preserving the best entry per unique content
   */
  deduplicateResults(memories: UnifiedMemory[]): UnifiedMemory[] {
    if (memories.length <= 1) {
      return memories;
    }

    // Map: content hash -> best memory for that content
    const seen = new Map<string, UnifiedMemory>();

    for (const memory of memories) {
      // If content is empty, use the memory ID as the hash key to avoid
      // incorrectly deduplicating distinct memories that both have empty content
      // (entityToMemory defaults content to '' when no content observation exists)
      const contentHash =
        memory.content === ''
          ? `empty:${memory.id ?? uuidv4()}`
          : createHash('sha256').update(memory.content).digest('hex');
      const existing = seen.get(contentHash);

      if (!existing) {
        seen.set(contentHash, memory);
      } else {
        // Defensive: treat NaN importance as 0 to prevent incorrect comparisons
        const memoryImportance = Number.isFinite(memory.importance) ? memory.importance : 0;
        const existingImportance = Number.isFinite(existing.importance)
          ? existing.importance
          : 0;

        // Keep the entry with higher importance; break ties with more recent timestamp
        const shouldReplace =
          memoryImportance > existingImportance ||
          (memoryImportance === existingImportance &&
            memory.timestamp.getTime() > existing.timestamp.getTime());

        if (shouldReplace) {
          seen.set(contentHash, memory);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Rank memories by relevance using SmartMemoryQuery
   *
   * @param query - Search query string
   * @param memories - Memories to rank
   * @param options - Search options with optional context (techStack, projectPath)
   * @returns Ranked memories (highest relevance first)
   */
  rankByRelevance(
    query: string,
    memories: UnifiedMemory[],
    options?: SearchOptions & { projectPath?: string; techStack?: string[] }
  ): UnifiedMemory[] {
    return this.smartQuery.search(query, memories, options);
  }

  /**
   * Full search pipeline: filter by query -> deduplicate -> rank -> apply limit
   *
   * This orchestrates the complete post-retrieval search pipeline.
   * The caller is responsible for fetching candidate memories from storage.
   *
   * @param query - Search query string
   * @param candidates - Candidate memories from storage layer
   * @param options - Search options
   * @param finalLimit - Maximum number of results to return
   * @returns Processed and ranked memories
   */
  processSearchResults(
    query: string,
    candidates: UnifiedMemory[],
    options?: SearchOptions & { projectPath?: string; techStack?: string[] },
    finalLimit?: number
  ): UnifiedMemory[] {
    // Step 1: Deduplicate
    const deduplicated = this.deduplicateResults(candidates);

    // Step 2: Rank by relevance
    const ranked = this.rankByRelevance(query, deduplicated, options);

    // Step 3: Apply final limit
    if (finalLimit && finalLimit > 0) {
      return ranked.slice(0, finalLimit);
    }

    return ranked;
  }
}
