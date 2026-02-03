/**
 * UnifiedMemoryStore
 *
 * The foundation for Phase 0.7.0 memory system upgrade.
 *
 * This fixes the FATAL FLAW where:
 * - buddy-record-mistake stores to FeedbackCollector
 * - buddy-remember searches KnowledgeGraph
 * - They don't communicate!
 *
 * UnifiedMemoryStore provides a single storage layer using KnowledgeGraph
 * for ALL memory types, ensuring consistent storage and retrieval.
 */

import { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity, EntityType } from '../knowledge-graph/types.js';
import type {
  UnifiedMemory,
  MemoryType,
  SearchOptions,
  MEMORY_TYPE_TO_ENTITY_TYPE,
  ENTITY_TYPE_TO_MEMORY_TYPE,
} from './types/unified-memory.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { ValidationError, OperationError, NotFoundError } from '../errors/index.js';
import { SmartMemoryQuery } from './SmartMemoryQuery.js';
import { AutoTagger } from './AutoTagger.js';

/**
 * Mapping from MemoryType to KnowledgeGraph EntityType
 */
const MEMORY_TYPE_MAPPING: Record<MemoryType, EntityType> = {
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
const ENTITY_TYPE_MAPPING: Record<string, MemoryType> = {
  lesson_learned: 'mistake',
  session_snapshot: 'conversation',
  best_practice: 'knowledge',
  decision: 'decision',
  learning_experience: 'experience',
  prevention_rule: 'prevention-rule',
  user_preference: 'user-preference',
};

/**
 * Prefix for unified memory entities to avoid collisions
 */
const MEMORY_ID_PREFIX = 'unified-memory-';

/**
 * UnifiedMemoryStore - Single storage layer for all memory types
 *
 * Uses KnowledgeGraph as the underlying storage, ensuring all memory
 * operations (store, search, update, delete) work through a single
 * consistent interface.
 */
export class UnifiedMemoryStore {
  constructor(private knowledgeGraph: KnowledgeGraph) {
    // No auto-tagger or query engine - intelligence delegated to Claude via MCP tool descriptions
  }

  /**
   * Create a new UnifiedMemoryStore instance (async factory method)
   *
   * @param dbPath - Optional database path for the underlying KnowledgeGraph
   * @returns Promise<UnifiedMemoryStore> Initialized memory store instance
   * @throws {OperationError} If initialization fails
   *
   * @example
   * ```typescript
   * // Create with default path
   * const store = await UnifiedMemoryStore.create();
   *
   * // Create with custom path
   * const customStore = await UnifiedMemoryStore.create('/tmp/memory.db');
   * ```
   */
  static async create(dbPath?: string): Promise<UnifiedMemoryStore> {
    try {
      // Initialize KnowledgeGraph with provided path or use default
      const knowledgeGraph = await KnowledgeGraph.create(dbPath);

      // Create and return UnifiedMemoryStore instance
      const instance = new UnifiedMemoryStore(knowledgeGraph);

      logger.info(`[UnifiedMemoryStore] Initialized with database at: ${dbPath || 'default'}`);
      return instance;
    } catch (error) {
      logger.error(`[UnifiedMemoryStore] Initialization failed: ${error}`);
      throw new OperationError(
        `Failed to create UnifiedMemoryStore: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'create',
          dbPath,
          cause: error,
        }
      );
    }
  }

  /**
   * Store a memory entry
   *
   * @param memory - The memory to store
   * @param context - Optional context for auto-tagging (projectPath, techStack)
   * @returns The unique ID of the stored memory
   * @throws {ValidationError} If memory type is invalid or content is missing
   * @throws {OperationError} If entity creation or relation creation fails
   */
  async store(
    memory: UnifiedMemory,
    context?: { projectPath?: string; techStack?: string[] }
  ): Promise<string> {
    try {
      // Validate input
      if (!memory.content || memory.content.trim() === '') {
        throw new ValidationError('Memory content cannot be empty', {
          component: 'UnifiedMemoryStore',
          method: 'store',
          memoryType: memory.type,
        });
      }

      if (!memory.type) {
        throw new ValidationError('Memory type is required', {
          component: 'UnifiedMemoryStore',
          method: 'store',
        });
      }

      // Validate and generate memory ID
      let id: string;
      if (memory.id !== undefined) {
        // External ID provided - validate (including empty string check)
        if (memory.id.trim() === '') {
          throw new ValidationError('Memory ID cannot be empty', {
            component: 'UnifiedMemoryStore',
            method: 'store',
            data: { providedId: memory.id },
          });
        }
        if (!memory.id.startsWith(MEMORY_ID_PREFIX)) {
          throw new ValidationError(`Memory ID must start with prefix: ${MEMORY_ID_PREFIX}`, {
            component: 'UnifiedMemoryStore',
            method: 'store',
            data: {
              providedId: memory.id,
              requiredPrefix: MEMORY_ID_PREFIX,
            },
          });
        }
        id = memory.id;
      } else {
        // Auto-generate ID
        id = `${MEMORY_ID_PREFIX}${uuidv4()}`;
      }

      // Ensure timestamp is provided (default to now if missing)
      const timestamp = memory.timestamp || new Date();

      // Generate tags: combine user-provided + auto-generated
      const autoTagger = new AutoTagger();
      const tagsToUse = autoTagger.generateTags(memory.content, memory.tags, context);

      if (context) {
        logger.info(`[UnifiedMemoryStore] Storing memory with tags: ${tagsToUse.join(', ')}`);
      }

      // Map memory type to entity type
      const entityType = MEMORY_TYPE_MAPPING[memory.type];
      if (!entityType) {
        throw new ValidationError(`Invalid memory type: ${memory.type}`, {
          component: 'UnifiedMemoryStore',
          method: 'store',
          memoryType: memory.type,
          validTypes: Object.keys(MEMORY_TYPE_MAPPING),
        });
      }

      // Build observations array with structured data
      const observations: string[] = [
        `content: ${memory.content}`,
        `importance: ${memory.importance}`,
        `timestamp: ${timestamp.toISOString()}`,
      ];

      if (memory.context) {
        observations.push(`context: ${memory.context}`);
      }

      // Store metadata as observation with size validation
      if (memory.metadata) {
        try {
          const metadataJson = JSON.stringify(memory.metadata);

          // Validate metadata size (1MB limit)
          // Use Buffer for accurate byte size (Node.js compatible, works in all versions)
          const sizeInBytes = Buffer.byteLength(metadataJson, 'utf8');
          const MAX_METADATA_SIZE = 1024 * 1024; // 1MB in bytes

          if (sizeInBytes >= MAX_METADATA_SIZE) {
            throw new ValidationError(
              `Metadata size exceeds limit: ${(sizeInBytes / 1024).toFixed(2)}KB / ${(MAX_METADATA_SIZE / 1024).toFixed(2)}KB`,
              {
                component: 'UnifiedMemoryStore',
                method: 'store',
                data: {
                  metadataSize: sizeInBytes,
                  limit: MAX_METADATA_SIZE,
                  sizeMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
                },
              }
            );
          }

          observations.push(`metadata: ${metadataJson}`);
        } catch (error) {
          // Re-throw ValidationError
          if (error instanceof ValidationError) {
            throw error;
          }
          logger.warn(`[UnifiedMemoryStore] Failed to serialize metadata: ${error}`);
        }
      }

      // Create entity in KnowledgeGraph
      const entity: Entity = {
        name: id,
        entityType,
        observations,
        tags: tagsToUse,
        metadata: {
          memoryType: memory.type,
          importance: memory.importance,
          timestamp: timestamp.toISOString(),
          ...(memory.metadata || {}),
        },
      };

      // Create entity with error handling
      try {
        this.knowledgeGraph.createEntity(entity);
      } catch (error) {
        logger.error(`[UnifiedMemoryStore] Failed to create entity: ${error}`);
        throw new OperationError(
          `Failed to store memory: ${error instanceof Error ? error.message : String(error)}`,
          {
            component: 'UnifiedMemoryStore',
            method: 'store',
            operation: 'createEntity',
            memoryId: id,
            memoryType: memory.type,
            cause: error,
          }
        );
      }

      // Create relations if specified
      if (memory.relations && memory.relations.length > 0) {
        for (const relatedId of memory.relations) {
          try {
            this.knowledgeGraph.createRelation({
              from: id,
              to: relatedId,
              relationType: 'depends_on',
              metadata: { createdAt: new Date().toISOString() },
            });
          } catch (error) {
            // Log but don't fail if relation creation fails
            logger.warn(`Failed to create relation from ${id} to ${relatedId}: ${error}`);
          }
        }
      }

      logger.info(`[UnifiedMemoryStore] Stored memory: ${id} (type: ${memory.type})`);
      return id;
    } catch (error) {
      // Re-throw custom errors as-is
      if (error instanceof ValidationError || error instanceof OperationError) {
        throw error;
      }

      // Wrap unexpected errors
      logger.error(`[UnifiedMemoryStore] Unexpected error in store: ${error}`);
      throw new OperationError(
        `Unexpected error storing memory: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'store',
          memoryType: memory.type,
          cause: error,
        }
      );
    }
  }

  /**
   * Get a memory by ID
   *
   * @param id - The memory ID
   * @returns The memory or null if not found
   * @throws {ValidationError} If id is invalid
   * @throws {OperationError} If entity retrieval fails
   */
  async get(id: string): Promise<UnifiedMemory | null> {
    try {
      // Validate input
      if (!id || id.trim() === '') {
        throw new ValidationError('Memory ID cannot be empty', {
          component: 'UnifiedMemoryStore',
          method: 'get',
        });
      }

      const entity = this.knowledgeGraph.getEntity(id);

      if (!entity) {
        return null;
      }

      return this.entityToMemory(entity);
    } catch (error) {
      // Re-throw custom errors as-is
      if (error instanceof ValidationError) {
        throw error;
      }

      // Wrap unexpected errors
      logger.error(`[UnifiedMemoryStore] Error retrieving memory: ${error}`);
      throw new OperationError(
        `Failed to get memory: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'get',
          memoryId: id,
          cause: error,
        }
      );
    }
  }

  /**
   * Search memories by query string
   *
   * Uses SmartMemoryQuery for intelligent multi-level search when context is provided.
   * Falls back to traditional search when no context is available.
   *
   * @param query - The search query
   * @param options - Search options (can include projectPath and techStack for smart search)
   * @returns Array of matching memories
   * @throws {OperationError} If search operation fails
   */
  async search(
    query: string,
    options?: SearchOptions & { projectPath?: string; techStack?: string[] }
  ): Promise<UnifiedMemory[]> {
    try {
      // Step 1: Use traditional search (SQLite FTS5 + tag matching) to get base results
      const baseResults = await this.traditionalSearch(query, options);

      // Step 2: Apply SmartMemoryQuery for context-aware ranking
      const smartQuery = new SmartMemoryQuery();
      const rankedResults = smartQuery.search(query, baseResults, options);

      return rankedResults;
    } catch (error) {
      logger.error(`[UnifiedMemoryStore] Search failed: ${error}`);
      throw new OperationError(
        `Memory search failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'search',
          query,
          options,
          cause: error,
        }
      );
    }
  }

  /**
   * Traditional search implementation (for backward compatibility)
   *
   * @param query - The search query
   * @param options - Search options
   * @returns Array of matching memories
   * @throws {OperationError} If entity search fails
   */
  private async traditionalSearch(query: string, options?: SearchOptions): Promise<UnifiedMemory[]> {
    try {
      // Get all entities that match the criteria
      const searchQuery: { entityType?: EntityType; tag?: string; namePattern?: string; limit?: number } = {};

      // Apply type filter if single type specified
      if (options?.types && options.types.length === 1) {
        searchQuery.entityType = MEMORY_TYPE_MAPPING[options.types[0]];
      }

      // Apply tag filter if single tag specified
      if (options?.tags && options.tags.length === 1) {
        searchQuery.tag = options.tags[0];
      }

      // Apply limit
      if (options?.limit) {
        searchQuery.limit = options.limit;
      }

      // Get entities with error handling
      let entities: Entity[];
      try {
        entities = this.knowledgeGraph.searchEntities(searchQuery);
      } catch (error) {
        logger.error(`[UnifiedMemoryStore] Entity search failed: ${error}`);
        throw new OperationError(
          `Entity search failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            component: 'UnifiedMemoryStore',
            method: 'traditionalSearch',
            searchQuery,
            cause: error,
          }
        );
      }

      // Filter by memory prefix (only get unified memories)
      entities = entities.filter((e) => e.name.startsWith(MEMORY_ID_PREFIX));

      // Filter by multiple types if specified
      if (options?.types && options.types.length > 1) {
        const entityTypes = options.types.map((t) => MEMORY_TYPE_MAPPING[t]);
        entities = entities.filter((e) => entityTypes.includes(e.entityType));
      }

      // Filter by multiple tags if specified (OR logic)
      if (options?.tags && options.tags.length > 1) {
        entities = entities.filter((e) => e.tags && options.tags!.some((t) => e.tags!.includes(t)));
      }

      // Convert to memories
      let memories = entities.map((e) => this.entityToMemory(e)).filter((m): m is UnifiedMemory => m !== null);

      // Apply query filter (search in content)
      if (query && query.trim()) {
        const lowerQuery = query.toLowerCase();
        memories = memories.filter(
          (m) => m.content.toLowerCase().includes(lowerQuery) || m.context?.toLowerCase().includes(lowerQuery)
        );
      }

      // Apply filters
      memories = this.applySearchFilters(memories, options);

      return memories;
    } catch (error) {
      // Re-throw OperationError as-is
      if (error instanceof OperationError) {
        throw error;
      }

      // Wrap unexpected errors
      logger.error(`[UnifiedMemoryStore] Traditional search failed: ${error}`);
      throw new OperationError(
        `Traditional search failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'traditionalSearch',
          query,
          options,
          cause: error,
        }
      );
    }
  }

  /**
   * Apply common search filters (time range, importance, limit)
   *
   * @param memories - Memories to filter
   * @param options - Search options
   * @returns Filtered memories
   */
  private applySearchFilters(memories: UnifiedMemory[], options?: SearchOptions): UnifiedMemory[] {
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

      filtered = filtered.filter((m) => m.timestamp >= cutoffDate);
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
   * Search memories by type
   *
   * Retrieves all memories of a specific type. Useful for getting all mistakes,
   * decisions, knowledge entries, or conversation snapshots.
   *
   * @param type - The memory type to filter by ('mistake' | 'conversation' | 'knowledge' | 'decision')
   * @param options - Additional search options
   * @param options.limit - Maximum number of results (default: 50)
   * @param options.minImportance - Minimum importance score (0-1)
   * @param options.tags - Additional tag filters
   * @param options.timeRange - Filter by time range ('last-24h', 'last-7-days', 'last-30-days', 'all')
   * @returns Promise<UnifiedMemory[]> Array of memories of the specified type
   *
   * @example
   * ```typescript
   * // Get all recorded mistakes
   * const mistakes = await store.searchByType('mistake');
   *
   * // Get recent important decisions
   * const decisions = await store.searchByType('decision', {
   *   minImportance: 0.7,
   *   timeRange: 'last-7-days'
   * });
   *
   * // Get knowledge entries with specific tags
   * const apiKnowledge = await store.searchByType('knowledge', {
   *   tags: ['api', 'rest']
   * });
   * ```
   */
  async searchByType(type: MemoryType, options?: SearchOptions): Promise<UnifiedMemory[]> {
    return this.search('', { ...options, types: [type] });
  }

  /**
   * Search memories by tags using OR logic
   *
   * Returns memories that match ANY of the provided tags. This is useful for
   * finding related memories across different categories or topics.
   *
   * @param tags - Array of tags to filter by (OR logic - matches any tag)
   * @param options - Additional search options
   * @param options.limit - Maximum number of results (default: 50)
   * @param options.minImportance - Minimum importance score (0-1)
   * @param options.types - Filter by memory types
   * @param options.timeRange - Filter by time range ('last-24h', 'last-7-days', 'last-30-days', 'all')
   * @returns Promise<UnifiedMemory[]> Array of matching memories, sorted by importance
   *
   * @example
   * ```typescript
   * // Find memories tagged with either 'security' or 'api'
   * const memories = await store.searchByTags(['security', 'api']);
   *
   * // With options - find important critical memories
   * const important = await store.searchByTags(['critical'], {
   *   minImportance: 0.8,
   *   limit: 10
   * });
   *
   * // Filter by type and tags
   * const mistakes = await store.searchByTags(['production', 'bug'], {
   *   types: ['mistake']
   * });
   * ```
   */
  async searchByTags(tags: string[], options?: SearchOptions): Promise<UnifiedMemory[]> {
    return this.search('', { ...options, tags });
  }

  /**
   * Update a memory
   *
   * @param id - The memory ID
   * @param updates - Partial updates to apply
   * @returns true if updated, false if not found
   * @throws {ValidationError} If id or updates are invalid
   * @throws {OperationError} If update operation fails
   */
  async update(id: string, updates: Partial<UnifiedMemory>): Promise<boolean> {
    try {
      // Validate input
      if (!id || id.trim() === '') {
        throw new ValidationError('Memory ID cannot be empty', {
          component: 'UnifiedMemoryStore',
          method: 'update',
        });
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationError('Updates cannot be empty', {
          component: 'UnifiedMemoryStore',
          method: 'update',
          memoryId: id,
        });
      }

      const existing = await this.get(id);

      if (!existing) {
        return false;
      }

      // Merge updates with existing memory
      const updatedMemory: UnifiedMemory = {
        ...existing,
        ...updates,
        id, // Preserve ID
        timestamp: existing.timestamp, // Preserve original timestamp
      };

      // Re-store with same ID (will update via UPSERT)
      await this.store(updatedMemory);

      logger.info(`[UnifiedMemoryStore] Updated memory: ${id}`);
      return true;
    } catch (error) {
      // Re-throw custom errors as-is
      if (error instanceof ValidationError || error instanceof OperationError) {
        throw error;
      }

      // Wrap unexpected errors
      logger.error(`[UnifiedMemoryStore] Update failed: ${error}`);
      throw new OperationError(
        `Failed to update memory: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'update',
          memoryId: id,
          cause: error,
        }
      );
    }
  }

  /**
   * Delete a memory
   *
   * @param id - The memory ID
   * @returns true if deleted, false if not found
   * @throws {ValidationError} If id is invalid
   * @throws {OperationError} If deletion fails
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Validate input
      if (!id || id.trim() === '') {
        throw new ValidationError('Memory ID cannot be empty', {
          component: 'UnifiedMemoryStore',
          method: 'delete',
        });
      }

      const deleted = this.knowledgeGraph.deleteEntity(id);

      if (deleted) {
        logger.info(`[UnifiedMemoryStore] Deleted memory: ${id}`);
      }

      return deleted;
    } catch (error) {
      // Re-throw custom errors as-is
      if (error instanceof ValidationError) {
        throw error;
      }

      // Wrap unexpected errors
      logger.error(`[UnifiedMemoryStore] Delete failed: ${error}`);
      throw new OperationError(
        `Failed to delete memory: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'delete',
          memoryId: id,
          cause: error,
        }
      );
    }
  }

  // Methods autoTagMemory() and detectProjectTechStack() removed.
  // Tag generation and tech stack detection delegated to Claude via MCP tool descriptions.

  /**
   * Close the database connection and cleanup resources
   *
   * Must be called to properly shut down the memory store and release
   * all database connections.
   *
   * @throws {OperationError} If shutdown fails
   *
   * @example
   * ```typescript
   * const store = await UnifiedMemoryStore.create();
   * // ... use the store ...
   * store.close(); // Cleanup when done
   * ```
   */
  close(): void {
    try {
      this.knowledgeGraph.close();
      logger.info('[UnifiedMemoryStore] Database connection closed');
    } catch (error) {
      logger.error(`[UnifiedMemoryStore] Error closing database: ${error}`);
      throw new OperationError(
        `Failed to close memory store: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'UnifiedMemoryStore',
          method: 'close',
          cause: error,
        }
      );
    }
  }

  /**
   * Convert a KnowledgeGraph Entity to UnifiedMemory
   */
  private entityToMemory(entity: Entity): UnifiedMemory | null {
    // Parse content from observations
    let content = '';
    let context: string | undefined;
    let importance = 0.5;
    let timestamp = entity.createdAt || new Date();
    let metadata: Record<string, unknown> | undefined;

    for (const obs of entity.observations) {
      if (obs.startsWith('content: ')) {
        content = obs.substring('content: '.length);
      } else if (obs.startsWith('context: ')) {
        context = obs.substring('context: '.length);
      } else if (obs.startsWith('importance: ')) {
        importance = parseFloat(obs.substring('importance: '.length)) || 0.5;
      } else if (obs.startsWith('timestamp: ')) {
        timestamp = new Date(obs.substring('timestamp: '.length));
      } else if (obs.startsWith('metadata: ')) {
        try {
          metadata = JSON.parse(obs.substring('metadata: '.length));
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Get importance from metadata if available
    if (entity.metadata?.importance !== undefined) {
      importance = entity.metadata.importance as number;
    }

    // Get memory type from entity type
    const memoryType = ENTITY_TYPE_MAPPING[entity.entityType] || 'knowledge';

    return {
      id: entity.name,
      type: memoryType,
      content,
      context,
      tags: entity.tags || [],
      importance,
      timestamp,
      metadata,
    };
  }
}
