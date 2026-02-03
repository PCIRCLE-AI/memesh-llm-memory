/**
 * Knowledge Graph - SQLite-based implementation
 *
 * Lightweight, standalone knowledge graph with no external dependencies
 * Perfect for personal AI assistants and code intelligence
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
import type { SQLParams } from '../evolution/storage/types.js';
import { logger } from '../utils/logger.js';
import { QueryCache } from '../db/QueryCache.js';
import { safeJsonParse, safeJsonStringify } from '../utils/json.js';
import { getDataPath, getDataDirectory } from '../utils/PathResolver.js';
import { validateNonEmptyString } from '../utils/validation.js';

/**
 * Maximum allowed length for entity names.
 * Prevents excessively long names that could degrade search/index performance.
 */
const MAX_ENTITY_NAME_LENGTH = 512;

/**
 * Regex pattern for valid relation types.
 * Allows alphanumeric characters, underscores, and hyphens.
 * Must start with a letter or underscore (no leading hyphens or numbers).
 */
const VALID_RELATION_TYPE_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Regex to detect control characters (C0 and C1 control codes, excluding
 * common whitespace like \t, \n, \r which may appear in legitimate content).
 * Matches: U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F, U+0080-U+009F
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/;

export class KnowledgeGraph {
  private db: Database.Database;
  private queryCache: QueryCache<string, any>;

  /**
   * Private constructor - use KnowledgeGraph.create() instead
   */
  private constructor(_dbPath: string, db: Database.Database) {
    this.db = db;

    // Initialize query cache with 1000 entries, 5 minute TTL
    this.queryCache = new QueryCache({
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000,
      debug: false,
    });
  }

  /**
   * Validate an entity name for safe storage and search.
   *
   * Checks:
   * 1. Non-empty (uses existing validateNonEmptyString utility)
   * 2. Reasonable length (max MAX_ENTITY_NAME_LENGTH characters)
   * 3. No control characters that could cause display/search issues
   *
   * @param name - Entity name to validate
   * @throws {ValidationError} If the name is invalid
   */
  private validateEntityName(name: string): void {
    validateNonEmptyString(name, 'Entity name');

    if (name.length > MAX_ENTITY_NAME_LENGTH) {
      throw new ValidationError(
        `Entity name exceeds maximum length of ${MAX_ENTITY_NAME_LENGTH} characters (got ${name.length})`,
        {
          component: 'KnowledgeGraph',
          method: 'validateEntityName',
          nameLength: name.length,
          maxLength: MAX_ENTITY_NAME_LENGTH,
        }
      );
    }

    if (CONTROL_CHAR_PATTERN.test(name)) {
      throw new ValidationError(
        'Entity name must not contain control characters',
        {
          component: 'KnowledgeGraph',
          method: 'validateEntityName',
          // Truncate name to 100 chars to prevent log injection from overly long input
          name: name.slice(0, 100),
        }
      );
    }
  }

  /**
   * Validate a relation type for safe storage and search.
   *
   * Relation types must be alphanumeric with underscores and hyphens,
   * starting with a letter or underscore. This prevents issues with
   * special characters in search queries and ensures consistent naming.
   *
   * @param relationType - Relation type string to validate
   * @throws {ValidationError} If the relation type is invalid
   */
  private validateRelationType(relationType: string): void {
    validateNonEmptyString(relationType, 'Relation type');

    if (!VALID_RELATION_TYPE_PATTERN.test(relationType)) {
      throw new ValidationError(
        `Relation type must contain only alphanumeric characters, underscores, and hyphens, ` +
        `and must start with a letter or underscore. Got: "${relationType}"`,
        {
          component: 'KnowledgeGraph',
          method: 'validateRelationType',
          relationType,
          pattern: VALID_RELATION_TYPE_PATTERN.source,
        }
      );
    }
  }

  /**
   * Create a new KnowledgeGraph instance (async factory method)
   *
   * @param dbPath - Optional database path (defaults to data/knowledge-graph.db)
   * @returns Promise<KnowledgeGraph> Initialized knowledge graph instance
   *
   * @example
   * ```typescript
   * // Create with default path
   * const kg = await KnowledgeGraph.create();
   *
   * // Create with custom path
   * const customKg = await KnowledgeGraph.create('./custom/path/kg.db');
   * ```
   */
  static async create(dbPath?: string): Promise<KnowledgeGraph> {
    // Use PathResolver for automatic fallback to legacy location
    const defaultPath = getDataPath('knowledge-graph.db');
    const resolvedPath = dbPath || defaultPath;

    // Ensure data directory exists (handles both new and legacy paths)
    const dataDir = getDataDirectory();
    try {
      await fsPromises.access(dataDir);
    } catch {
      // Directory doesn't exist, create it
      await fsPromises.mkdir(dataDir, { recursive: true });
    }

    // Get database instance
    const db = SimpleDatabaseFactory.getInstance(resolvedPath);

    // Create instance
    const instance = new KnowledgeGraph(resolvedPath, db);

    // Initialize schema
    instance.initialize();

    logger.info(`[KnowledgeGraph] Initialized at: ${resolvedPath}`);

    return instance;
  }

  /**
   * Create a KnowledgeGraph instance synchronously (legacy compatibility)
   *
   * **Deprecated**: Use `await KnowledgeGraph.create()` instead for async file operations.
   * This method is kept for backward compatibility but uses synchronous directory creation.
   *
   * @param dbPath - Optional database path (defaults to data/knowledge-graph.db)
   * @returns KnowledgeGraph instance
   */
  static createSync(dbPath?: string): KnowledgeGraph {
    // Use PathResolver for automatic fallback to legacy location
    const defaultPath = getDataPath('knowledge-graph.db');
    const resolvedPath = dbPath || defaultPath;

    // Ensure data directory exists (handles both new and legacy paths)
    const dataDir = getDataDirectory();
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Get database instance
    const db = SimpleDatabaseFactory.getInstance(resolvedPath);

    // Create instance
    const instance = new KnowledgeGraph(resolvedPath, db);

    // Initialize schema
    instance.initialize();

    logger.info(`[KnowledgeGraph] Initialized at: ${resolvedPath}`);

    return instance;
  }

  private initialize() {

    // Create schema
    // Note: DB column is named `type` for brevity, but maps to TypeScript `entityType`
    // to avoid confusion with reserved keywords and improve type safety
    const schema = `
      -- Entities table
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,  -- Maps to TypeScript 'entityType' field
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      );

      -- Observations table
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      -- Relations table
      CREATE TABLE IF NOT EXISTS relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_entity_id INTEGER NOT NULL,
        to_entity_id INTEGER NOT NULL,
        relation_type TEXT NOT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (to_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        UNIQUE(from_entity_id, to_entity_id, relation_type)
      );

      -- Tags table
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
      CREATE INDEX IF NOT EXISTS idx_entities_type_created ON entities(type, created_at);

      CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at);
      CREATE INDEX IF NOT EXISTS idx_observations_entity_created ON observations(entity_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(relation_type);
      CREATE INDEX IF NOT EXISTS idx_relations_from_type ON relations(from_entity_id, relation_type);
      CREATE INDEX IF NOT EXISTS idx_relations_to_type ON relations(to_entity_id, relation_type);
      CREATE INDEX IF NOT EXISTS idx_relations_created ON relations(created_at);

      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags(entity_id);
      CREATE INDEX IF NOT EXISTS idx_tags_entity_tag ON tags(entity_id, tag);
    `;

    this.db.exec(schema);

    // Run schema migrations
    this.runMigrations();
  }

  /**
   * Run schema migrations
   *
   * ✅ CRITICAL-1: Add content_hash column for deduplication
   *
   * Migrations are idempotent and safe to run multiple times.
   * Each migration checks if it's needed before applying changes.
   */
  private runMigrations(): void {
    // Migration 1: Add content_hash column to entities table
    // This enables database-level deduplication and prevents TOCTOU race conditions
    try {
      // Check if content_hash column exists
      const tableInfo = this.db.pragma('table_info(entities)') as Array<{ name: string }>;
      const hasContentHash = tableInfo.some(
        (col) => col.name === 'content_hash'
      );

      if (!hasContentHash) {
        logger.info('[KG] Running migration: Adding content_hash column to entities table');

        // Add content_hash column
        this.db.exec(`
          ALTER TABLE entities ADD COLUMN content_hash TEXT;
        `);

        // Create unique index on content_hash
        // This prevents duplicate entities with same content at database level
        this.db.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_content_hash
          ON entities(content_hash)
          WHERE content_hash IS NOT NULL;
        `);

        logger.info('[KG] Migration complete: content_hash column added with unique index');
      }
    } catch (error) {
      logger.error('[KG] Migration failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Escape special characters in LIKE patterns to prevent SQL injection
   *
   * ✅ CRITICAL-9: SQL injection protection - proper LIKE pattern escaping
   *
   * Escapes: !, %, _, [, ]
   * These characters have special meaning in SQL LIKE patterns
   * Uses '!' as the ESCAPE character (safer than '\' - no conflict with paths/strings)
   *
   * Security guarantees:
   * 1. Input type validation (rejects non-strings)
   * 2. Escape character (!) escaped first (critical ordering)
   * 3. All LIKE wildcards properly escaped
   * 4. Used with parameterized queries only
   */
  private escapeLikePattern(pattern: string): string {
    // Validate input type to prevent type coercion attacks
    if (typeof pattern !== 'string') {
      throw new Error(`Pattern must be a string, got ${typeof pattern}`);
    }

    return pattern
      .replace(/!/g, '!!')     // Exclamation first (our escape character)
      .replace(/%/g, '!%')     // Percent (matches any sequence)
      .replace(/_/g, '!_')     // Underscore (matches single character)
      .replace(/\[/g, '![')    // Left bracket (character class start)
      .replace(/\]/g, '!]');   // Right bracket (character class end)
  }

  /**
   * Create a new entity in the knowledge graph
   *
   * CRITICAL-1 FIX: Uses content_hash for atomic deduplication
   * Returns the actual entity name (may differ from input if deduplicated)
   *
   * @param entity Entity to create
   * @returns Actual entity name (same as input if new, existing name if deduplicated)
   */
  createEntity(entity: Entity): string {
    // Validate entity name before any database operations
    this.validateEntityName(entity.name);

    try {
      // CRITICAL-1: Check content_hash first for deduplication
      // This prevents most duplicate cases before attempting INSERT
      // IMPORTANT: Only deduplicate if name is DIFFERENT (real duplicate)
      // If name is same, this is an update operation, not a duplicate
      if (entity.contentHash) {
        const existing = this.db
          .prepare('SELECT name FROM entities WHERE content_hash = ?')
          .get(entity.contentHash) as { name: string } | undefined;

        if (existing && existing.name !== entity.name) {
          // Different name + same content = real deduplication
          logger.info(
            `[KG] Deduplicated: content_hash match, using existing entity ${existing.name}`
          );
          return existing.name;
        }
        // If existing.name === entity.name, this is an update (same entity)
        // Continue to INSERT ... ON CONFLICT(name) DO UPDATE
      }

      // CRITICAL-1: INSERT with content_hash to prevent race conditions
      // Database UNIQUE constraint provides atomic deduplication
      const stmt = this.db.prepare(`
        INSERT INTO entities (name, type, metadata, content_hash)
        VALUES (?, ?, json(?), ?)
        ON CONFLICT(name) DO UPDATE SET
          type = excluded.type,
          metadata = excluded.metadata,
          content_hash = excluded.content_hash
      `);

      stmt.run(
        entity.name,
        entity.entityType,
        // CRITICAL-3: Use safeJsonStringify to handle circular references
        safeJsonStringify(entity.metadata || {}, '{}'),
        entity.contentHash || null
      );

      // Get actual entity ID
      const actualEntity = this.db
        .prepare('SELECT id FROM entities WHERE name = ?')
        .get(entity.name) as { id: number };

      const actualId = actualEntity.id;

      // Clear old observations/tags if updating
      this.db.prepare('DELETE FROM observations WHERE entity_id = ?').run(actualId);
      this.db.prepare('DELETE FROM tags WHERE entity_id = ?').run(actualId);

      // Add observations
      if (entity.observations && entity.observations.length > 0) {
        const obsStmt = this.db.prepare(`
          INSERT INTO observations (entity_id, content)
          VALUES (?, ?)
        `);

        for (const obs of entity.observations) {
          obsStmt.run(actualId, obs);
        }
      }

      // Add tags
      if (entity.tags && entity.tags.length > 0) {
        const tagStmt = this.db.prepare(`
          INSERT INTO tags (entity_id, tag)
          VALUES (?, ?)
        `);

        for (const tag of entity.tags) {
          tagStmt.run(actualId, tag);
        }
      }

      // Invalidate cache for entity queries
      this.queryCache.invalidatePattern(/^entities:/);

      logger.info(`[KG] Created entity: ${entity.name} (type: ${entity.entityType})`);
      return entity.name;
    } catch (error) {
      // CRITICAL-1: Handle race condition - if UNIQUE constraint on content_hash fails
      // This can happen if two concurrent requests pass the initial check
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed') &&
        error.message.includes('content_hash')
      ) {
        // Query existing entity by content_hash
        const existing = this.db
          .prepare('SELECT name FROM entities WHERE content_hash = ?')
          .get(entity.contentHash) as { name: string } | undefined;

        if (existing) {
          logger.warn(
            `[KG] Race condition detected: content_hash conflict, using existing entity ${existing.name}`
          );
          return existing.name;
        }
      }

      // Re-throw if not a content_hash conflict or couldn't find existing entity
      throw error;
    }
  }

  /**
   * Create a relation between two entities
   */
  createRelation(relation: Relation): void {
    // Validate entity names and relation type before database operations
    this.validateEntityName(relation.from);
    this.validateEntityName(relation.to);
    this.validateRelationType(relation.relationType);

    const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');

    const fromEntity = getEntityId.get(relation.from) as { id: number } | undefined;
    const toEntity = getEntityId.get(relation.to) as { id: number } | undefined;

    if (!fromEntity) {
      throw new NotFoundError(
        `Entity not found: ${relation.from}`,
        'entity',
        relation.from,
        { relationContext: 'from entity in relation creation' }
      );
    }
    if (!toEntity) {
      throw new NotFoundError(
        `Entity not found: ${relation.to}`,
        'entity',
        relation.to,
        { relationContext: 'to entity in relation creation' }
      );
    }

    const stmt = this.db.prepare(`
      INSERT INTO relations (from_entity_id, to_entity_id, relation_type, metadata)
      VALUES (?, ?, ?, json(?))
      ON CONFLICT(from_entity_id, to_entity_id, relation_type) DO UPDATE SET
        metadata = excluded.metadata
    `);

    stmt.run(
      fromEntity.id,
      toEntity.id,
      relation.relationType,
      // CRITICAL-3: Use safeJsonStringify to handle circular references
      safeJsonStringify(relation.metadata || {}, '{}')
    );

    // Invalidate cache for relation queries
    this.queryCache.invalidatePattern(/^relations:/);
    this.queryCache.invalidatePattern(/^trace:/);

    logger.info(`[KG] Created relation: ${relation.from} -[${relation.relationType}]-> ${relation.to}`);
  }

  /**
   * Search entities
   *
   * ✅ FIX LOW-2: Added limit/offset validation
   * ✅ CRITICAL-9: SQL injection safe - all user inputs use parameterized queries
   *
   * Security: This method is SQL-injection-safe because:
   * 1. All user inputs (entityType, tag, namePattern, limit, offset) use ? placeholders
   * 2. LIKE patterns are properly escaped with escapeLikePattern()
   * 3. All values are passed through params array to stmt.all(...params)
   * 4. No string concatenation of user input into SQL
   */
  searchEntities(query: SearchQuery): Entity[] {
    // ✅ FIX LOW-2: Validate limit and offset parameters
    const MAX_LIMIT = 1000;

    // ✅ MAJOR-1: Early return for limit === 0 (caller explicitly wants no results)
    if (query.limit === 0) {
      return [];
    }

    // ✅ MAJOR-2: Use local variable to avoid mutating caller's query object
    let effectiveLimit: number | undefined = query.limit;

    if (query.limit !== undefined) {
      if (query.limit < 0) {
        throw new ValidationError('Limit must be non-negative', {
          component: 'KnowledgeGraph',
          method: 'searchEntities',
          providedLimit: query.limit,
        });
      }
      if (query.limit > MAX_LIMIT) {
        logger.warn(`Limit ${query.limit} exceeds maximum, capping to ${MAX_LIMIT}`);
        effectiveLimit = MAX_LIMIT;
      }
    }

    if (query.offset !== undefined && query.offset < 0) {
      throw new ValidationError('Offset must be non-negative', {
        component: 'KnowledgeGraph',
        method: 'searchEntities',
        providedOffset: query.offset,
      });
    }

    // Validate namePattern: reject control characters but allow wildcards and longer patterns
    // Empty string is treated as "match all" (LIKE '%<empty>%' matches everything)
    if (query.namePattern !== undefined && query.namePattern !== '') {
      validateNonEmptyString(query.namePattern, 'Name pattern');
      if (CONTROL_CHAR_PATTERN.test(query.namePattern)) {
        throw new ValidationError(
          'Name pattern must not contain control characters',
          {
            component: 'KnowledgeGraph',
            method: 'searchEntities',
            namePattern: query.namePattern.slice(0, 100),
          }
        );
      }
    }

    // Generate cache key from query parameters
    // ✅ MAJOR-2: Use effectiveLimit in cache key to ensure correct cache behavior
    const cacheKeyQuery = { ...query, limit: effectiveLimit };
    const cacheKey = `entities:${JSON.stringify(cacheKeyQuery)}`;

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - execute query
    let sql = `
      SELECT e.*,
        (SELECT json_group_array(content) FROM observations o WHERE o.entity_id = e.id) as observations_json,
        (SELECT json_group_array(tag) FROM tags t WHERE t.entity_id = e.id) as tags_json
      FROM entities e
      WHERE 1=1
    `;

    const params: SQLParams = [];

    if (query.entityType) {
      sql += ' AND e.type = ?';
      params.push(query.entityType);
    }

    if (query.tag) {
      sql += ' AND e.id IN (SELECT entity_id FROM tags WHERE tag = ?)';
      params.push(query.tag);
    }

    if (query.namePattern) {
      sql += " AND e.name LIKE ? ESCAPE '!'";
      params.push(`%${this.escapeLikePattern(query.namePattern)}%`);
    }

    sql += ' ORDER BY e.created_at DESC';

    // ✅ MAJOR-1 & MAJOR-2: Use effectiveLimit and check !== undefined (not falsy)
    // to correctly handle limit=0 (already returned early) and avoid mutation
    if (effectiveLimit !== undefined) {
      sql += ' LIMIT ?';
      params.push(effectiveLimit);
    }

    if (query.offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown[];

    // Optimized: Pre-allocate array and use for loop
    const entities: Entity[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as {
        id: number;
        name: string;
        type: string;
        observations_json: string | null;
        tags_json: string | null;
        metadata: string | null;
        created_at: string;
      };

      const observations = safeJsonParse<string[]>(r.observations_json, [])
        .filter(value => value);
      const tags = safeJsonParse<string[]>(r.tags_json, [])
        .filter(value => value);

      entities[i] = {
        id: r.id,
        name: r.name,
        entityType: r.type as EntityType,
        observations,
        tags,
        metadata: r.metadata ? safeJsonParse<Record<string, unknown>>(r.metadata, {}) : {},
        createdAt: new Date(r.created_at)
      };
    }

    // Cache the results
    this.queryCache.set(cacheKey, entities);

    return entities;
  }

  /**
   * Get a specific entity by name
   * @throws {ValidationError} If the name is invalid
   */
  getEntity(name: string): Entity | null {
    // Validate entity name before any database operations
    this.validateEntityName(name);

    const results = this.searchEntities({ namePattern: name, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Trace relations from an entity
   * @throws {ValidationError} If the entity name is invalid
   */
  traceRelations(entityName: string, depth: number = 2): RelationTrace | null {
    // Validate entity name before any database operations
    this.validateEntityName(entityName);

    // Generate cache key
    const cacheKey = `trace:${entityName}:${depth}`;

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - execute query
    const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
    const entity = getEntityId.get(entityName) as { id: number } | undefined;

    if (!entity) {
      return null;
    }

    const relationRows = this.db.prepare(`
      SELECT
        e1.name as from_name,
        e2.name as to_name,
        r.relation_type,
        r.metadata
      FROM relations r
      JOIN entities e1 ON r.from_entity_id = e1.id
      JOIN entities e2 ON r.to_entity_id = e2.id
      WHERE r.from_entity_id = ? OR r.to_entity_id = ?
    `).all(entity.id, entity.id) as unknown[];

    // Optimized: Pre-allocate array and use for loop
    const relations: Relation[] = new Array(relationRows.length);
    for (let i = 0; i < relationRows.length; i++) {
      const r = relationRows[i] as {
        from_name: string;
        to_name: string;
        relation_type: string;
        metadata: string | null;
      };
      relations[i] = {
        from: r.from_name,
        to: r.to_name,
        relationType: r.relation_type as RelationType,
        // ✅ MAJOR-4: Use safeJsonParse instead of raw JSON.parse to prevent crash on malformed data
        metadata: r.metadata ? safeJsonParse<Record<string, unknown>>(r.metadata, {}) : {}
      };
    }

    const result = {
      entity: entityName,
      relations,
      depth
    };

    // Cache the result
    this.queryCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntities: number;
    totalRelations: number;
    entitiesByType: Record<string, number>;
  } {
    // Generate cache key
    const cacheKey = 'stats:all';

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - execute queries
    const totalEntities = this.db
      .prepare('SELECT COUNT(*) as count FROM entities')
      .get() as { count: number };

    const totalRelations = this.db
      .prepare('SELECT COUNT(*) as count FROM relations')
      .get() as { count: number };

    const byType = this.db
      .prepare('SELECT type, COUNT(*) as count FROM entities GROUP BY type')
      .all() as Array<{ type: string; count: number }>;

    const entitiesByType: Record<string, number> = {};
    byType.forEach(row => {
      entitiesByType[row.type] = row.count;
    });

    const result = {
      totalEntities: totalEntities.count,
      totalRelations: totalRelations.count,
      entitiesByType
    };

    // Cache the result (shorter TTL since stats change frequently)
    this.queryCache.set(cacheKey, result, 60 * 1000); // 1 minute TTL

    return result;
  }

  /**
   * Delete an entity and all its relations (cascade delete)
   * @param name - Entity name to delete
   * @returns true if entity was deleted, false if not found
   * @throws {ValidationError} If the name is invalid
   */
  deleteEntity(name: string): boolean {
    // Validate entity name before any database operations
    this.validateEntityName(name);

    const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
    const entity = getEntityId.get(name) as { id: number } | undefined;

    if (!entity) {
      return false;
    }

    // Delete the entity (cascade will handle observations, tags, and relations)
    const stmt = this.db.prepare('DELETE FROM entities WHERE name = ?');
    const result = stmt.run(name);

    // Invalidate all caches since entity deletion affects multiple queries
    this.queryCache.invalidatePattern(/^entities:/);
    this.queryCache.invalidatePattern(/^relations:/);
    this.queryCache.invalidatePattern(/^trace:/);
    this.queryCache.invalidatePattern(/^stats:/);

    logger.info(`[KG] Deleted entity: ${name}`);
    return result.changes > 0;
  }

  /**
   * Close the database connection
   */
  close() {
    // Cleanup cache
    this.queryCache.destroy();

    // Close database
    this.db.close();

    logger.info('[KG] Database connection and cache closed');
  }

  /**
   * Execute operations within a transaction
   *
   * Provides atomic operations with automatic rollback on error.
   * This ensures data consistency when performing multiple operations.
   *
   * @param fn - Callback function containing operations to execute
   * @returns Result from the callback function
   * @throws Error if transaction fails (automatically rolls back)
   *
   * @example
   * ```typescript
   * await kg.transaction(() => {
   *   kg.createEntity(entity);
   *   kg.createRelation(relation1);
   *   kg.createRelation(relation2);
   *   // All succeed or all fail together
   * });
   * ```
   */
  transaction<T>(fn: () => T): T {
    // CRITICAL-10: Proper transaction error handling with logging
    try {
      // better-sqlite3 transaction method handles begin/commit/rollback automatically
      const transactionFn = this.db.transaction(fn);
      return transactionFn();
    } catch (error) {
      // Log transaction failure with context
      logger.error('[KG] Transaction failed and rolled back:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw to propagate error to caller
      throw error;
    }
  }

  /**
   * Get cache statistics (for monitoring and debugging)
   */
  getCacheStats() {
    return this.queryCache.getStats();
  }

  /**
   * Clear cache manually (useful after bulk operations)
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('[KG] Cache cleared manually');
  }
}

// Export types
export type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
