/**
 * Knowledge Graph - SQLite-based implementation
 *
 * Lightweight, standalone knowledge graph with no external dependencies
 * Perfect for personal AI assistants and code intelligence
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { NotFoundError } from '../errors/index.js';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
import type { SQLParams } from '../evolution/storage/types.js';
import { logger } from '../utils/logger.js';
import { QueryCache } from '../db/QueryCache.js';

export class KnowledgeGraph {
  private db: Database.Database;
  private dbPath: string;
  private queryCache: QueryCache<string, any>;

  /**
   * Private constructor - use KnowledgeGraph.create() instead
   */
  private constructor(dbPath: string, db: Database.Database) {
    this.dbPath = dbPath;
    this.db = db;

    // Initialize query cache with 1000 entries, 5 minute TTL
    this.queryCache = new QueryCache({
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000,
      debug: false,
    });
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
    // Default to data/knowledge-graph.db
    const resolvedPath = dbPath || join(process.cwd(), 'data', 'knowledge-graph.db');

    // Ensure data directory exists (async)
    const dataDir = join(process.cwd(), 'data');
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
    const resolvedPath = dbPath || join(process.cwd(), 'data', 'knowledge-graph.db');

    // Ensure data directory exists (sync)
    const dataDir = join(process.cwd(), 'data');
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
  }

  /**
   * Escape special characters in LIKE patterns to prevent SQL injection
   *
   * Escapes: %, _, \, [
   * These characters have special meaning in SQL LIKE patterns
   */
  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')  // Backslash first (escape character)
      .replace(/%/g, '\\%')    // Percent (matches any sequence)
      .replace(/_/g, '\\_')    // Underscore (matches single character)
      .replace(/\[/g, '\\[');  // Left bracket (character class)
  }

  /**
   * Create a new entity in the knowledge graph
   */
  createEntity(entity: Entity): number {
    const stmt = this.db.prepare(`
      INSERT INTO entities (name, type, metadata)
      VALUES (?, ?, json(?))
      ON CONFLICT(name) DO UPDATE SET
        type = excluded.type,
        metadata = excluded.metadata
    `);

    const result = stmt.run(
      entity.name,
      entity.entityType,
      JSON.stringify(entity.metadata || {})
    );

    const entityId = result.lastInsertRowid as number;

    // Get actual entity ID if it was a conflict update
    const actualEntity = this.db
      .prepare('SELECT id FROM entities WHERE name = ?')
      .get(entity.name) as { id: number };

    const actualId = actualEntity.id;

    // Clear old observations if updating
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
    return actualId;
  }

  /**
   * Create a relation between two entities
   */
  createRelation(relation: Relation): void {
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
      JSON.stringify(relation.metadata || {})
    );

    // Invalidate cache for relation queries
    this.queryCache.invalidatePattern(/^relations:/);
    this.queryCache.invalidatePattern(/^trace:/);

    logger.info(`[KG] Created relation: ${relation.from} -[${relation.relationType}]-> ${relation.to}`);
  }

  /**
   * Search entities
   */
  searchEntities(query: SearchQuery): Entity[] {
    // Generate cache key from query parameters
    const cacheKey = `entities:${JSON.stringify(query)}`;

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - execute query
    let sql = `
      SELECT e.*,
        GROUP_CONCAT(o.content, '|||') as observations,
        GROUP_CONCAT(t.tag, ',') as tags
      FROM entities e
      LEFT JOIN observations o ON e.id = o.entity_id
      LEFT JOIN tags t ON e.id = t.entity_id
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
      sql += " AND e.name LIKE ? ESCAPE '\\'";
      params.push(`%${this.escapeLikePattern(query.namePattern)}%`);
    }

    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
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
        observations: string | null;
        tags: string | null;
        metadata: string | null;
        created_at: string;
      };

      // Optimized: Avoid intermediate arrays from split().filter()
      let tags: string[] = [];
      if (r.tags) {
        const tagParts = r.tags.split(',');
        const filteredTags: string[] = [];
        for (let j = 0; j < tagParts.length; j++) {
          const tag = tagParts[j];
          if (tag) filteredTags.push(tag);
        }
        tags = filteredTags;
      }

      entities[i] = {
        id: r.id,
        name: r.name,
        entityType: r.type as EntityType,
        observations: r.observations ? r.observations.split('|||') : [],
        tags,
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        createdAt: new Date(r.created_at)
      };
    }

    // Cache the results
    this.queryCache.set(cacheKey, entities);

    return entities;
  }

  /**
   * Get a specific entity by name
   */
  getEntity(name: string): Entity | null {
    const results = this.searchEntities({ namePattern: name, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Trace relations from an entity
   */
  traceRelations(entityName: string, depth: number = 2): RelationTrace | null {
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
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
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
   */
  deleteEntity(name: string): boolean {
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
