/**
 * Unified Memory Types
 *
 * Type definitions for the UnifiedMemoryStore - the foundation
 * for Phase 0.7.0 memory system upgrade.
 *
 * This fixes the FATAL FLAW where:
 * - buddy-record-mistake stores to FeedbackCollector
 * - buddy-remember searches KnowledgeGraph
 * - They don't communicate!
 *
 * UnifiedMemoryStore provides a single storage layer using KnowledgeGraph
 * for all memory types.
 */

/**
 * Memory types supported by the unified store
 */
export type MemoryType = 'mistake' | 'conversation' | 'knowledge' | 'decision' | 'experience' | 'prevention-rule' | 'user-preference';

/**
 * Unified memory entry structure
 */
export interface UnifiedMemory {
  /** Unique identifier (entity name in KnowledgeGraph) */
  id?: string;

  /** Type of memory */
  type: MemoryType;

  /** Main content of the memory */
  content: string;

  /** Optional context/situation when this memory was created */
  context?: string;

  /** Tags for categorization and search */
  tags: string[];

  /** Importance score (0-1, higher = more important) */
  importance: number;

  /** When this memory was created */
  timestamp: Date;

  /** Related memory IDs for building knowledge graph */
  relations?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Scope metadata for hierarchical memory organization */
  scopeMetadata?: import('./memory-scope.js').MemoryScopeMetadata;
}

/**
 * Options for searching memories
 */
export interface SearchOptions {
  /** Filter by memory types */
  types?: MemoryType[];

  /** Filter by tags (OR logic - matches any tag) */
  tags?: string[];

  /** Filter by time range */
  timeRange?: 'last-24h' | 'last-7-days' | 'last-30-days' | 'all';

  /** Maximum number of results */
  limit?: number;

  /** Minimum importance score (0-1) */
  minImportance?: number;
}

/**
 * Result of a memory search with scoring
 */
export interface SearchResult {
  /** The memory entry */
  memory: UnifiedMemory;

  /** Relevance score (0-1) */
  score: number;
}

/**
 * Mapping from MemoryType to KnowledgeGraph EntityType
 */
export const MEMORY_TYPE_TO_ENTITY_TYPE: Record<MemoryType, string> = {
  mistake: 'lesson_learned',
  conversation: 'session_snapshot',
  knowledge: 'best_practice',
  decision: 'decision',
  experience: 'learning_experience',
  'prevention-rule': 'prevention_rule',
  'user-preference': 'user_preference',
};

/**
 * Reverse mapping from EntityType to MemoryType
 */
export const ENTITY_TYPE_TO_MEMORY_TYPE: Record<string, MemoryType> = {
  lesson_learned: 'mistake',
  session_snapshot: 'conversation',
  best_practice: 'knowledge',
  decision: 'decision',
  learning_experience: 'experience',
  prevention_rule: 'prevention-rule',
  user_preference: 'user-preference',
};
