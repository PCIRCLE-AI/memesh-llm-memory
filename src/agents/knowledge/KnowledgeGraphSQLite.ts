/**
 * KnowledgeGraphSQLite - SQLite-backed persistent storage
 *
 * Migrated from in-memory storage to prevent data loss on restart.
 * Uses the same pattern as SQLiteStore from evolution system.
 */

import Database from 'better-sqlite3';
import { SimpleDatabaseFactory } from '../../config/simple-config.js';
import { safeJsonParse } from '../../utils/json.js';
import type { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';
import type { SQLParams } from '../../evolution/storage/types.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { getHomeDir } from '../../utils/paths.js';
import {
  LazyEmbeddingService,
  VectorExtension,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from '../../embeddings/index.js';

export interface KnowledgeGraphOptions {
  /**
   * Path to SQLite database file
   * Use ':memory:' for in-memory database (testing)
   * Default: ~/.claude/knowledge-graph.db
   */
  dbPath?: string;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Options for entity creation
 */
export interface CreateEntityOptions {
  /**
   * Whether to generate embedding automatically after creation
   * Default: true (if auto-embedding is enabled in config)
   */
  generateEmbedding?: boolean;
}

/**
 * Options for semantic search
 */
export interface SemanticSearchOptions {
  /** Maximum number of results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
  /** Filter by entity types */
  entityTypes?: string[];
}

/**
 * Result from semantic search
 */
export interface SemanticSearchResult {
  /** The matched entity */
  entity: Entity;
  /** Similarity score 0-1 (higher = more similar) */
  similarity: number;
}

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions {
  /** Maximum number of results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
  /** Weight for semantic similarity (default: 0.6) */
  semanticWeight?: number;
  /** Weight for keyword matching (default: 0.3) */
  keywordWeight?: number;
  /** Weight for recency (default: 0.1) */
  recencyWeight?: number;
  /** Filter by entity types */
  entityTypes?: string[];
}

interface EntityRow {
  name: string;
  entity_type: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  embedding: Buffer | null;
  embedding_model: string | null;
  embedding_version: number | null;
  embedded_at: string | null;
  needs_vector_sync: number | null;
}

/**
 * Convert Buffer to Float32Array (handles byte alignment)
 */
function bufferToFloat32Array(buffer: Buffer): Float32Array {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return new Float32Array(arrayBuffer);
}

/**
 * Create searchable text from entity name and observations
 */
function createEntityText(name: string, observations: string[]): string {
  if (observations.length === 0) {
    return name;
  }
  return [name, ...observations].join(' ');
}

interface ObservationRow {
  id: number;
  entity_name: string;
  observation: string;
  created_at: string;
}

interface RelationRow {
  id: number;
  from_entity: string;
  to_entity: string;
  relation_type: string;
  metadata: string | null;
  created_at: string;
}

export class KnowledgeGraphSQLite {
  private db: Database.Database;
  private options: Required<KnowledgeGraphOptions>;
  private initialized: boolean;

  constructor(options: KnowledgeGraphOptions = {}) {
    this.options = {
      dbPath: options.dbPath || path.join(getHomeDir(), '.claude', 'knowledge-graph.db'),
      verbose: options.verbose || false,
    };

    // Initialize SQLite database
    this.db = this.options.dbPath === ':memory:'
      ? SimpleDatabaseFactory.createTestDatabase()
      : SimpleDatabaseFactory.getInstance(this.options.dbPath);

    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.createTables();
    this.createIndexes();
    this.migrateEmbeddingColumns();

    this.initialized = true;
  }

  async close(): Promise<void> {
    this.db.close();
    this.initialized = false;
  }

  // ========================================================================
  // Schema Creation
  // ========================================================================

  private createTables(): void {
    // Entities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        name TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);

    // Observations table (normalized - one row per observation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT NOT NULL,
        observation TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_name) REFERENCES entities(name) ON DELETE CASCADE
      );
    `);

    // Relations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_entity TEXT NOT NULL,
        to_entity TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME NOT NULL,
        UNIQUE(from_entity, to_entity, relation_type),
        FOREIGN KEY (from_entity) REFERENCES entities(name) ON DELETE CASCADE,
        FOREIGN KEY (to_entity) REFERENCES entities(name) ON DELETE CASCADE
      );
    `);
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_updated_at ON entities(updated_at);

      CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_name);
      CREATE INDEX IF NOT EXISTS idx_observations_created_at ON observations(created_at);

      CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity);
      CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity);
      CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(relation_type);
    `);
  }

  /**
   * Migrate embedding columns to entities table (idempotent)
   * This migration adds support for vector semantic search.
   */
  private migrateEmbeddingColumns(): void {
    // Check if embedding column already exists
    const columns = this.db.prepare('PRAGMA table_info(entities)').all() as Array<{ name: string }>;
    const columnNames = new Set(columns.map((c) => c.name));

    if (!columnNames.has('embedding')) {
      logger.info('Migrating entities table: adding embedding columns...');

      // Add embedding columns using SQLite's ALTER TABLE
      // Note: SQLite db.exec() is safe here as it uses pre-defined SQL strings
      this.db.prepare('ALTER TABLE entities ADD COLUMN embedding BLOB').run();
      this.db.prepare(
        "ALTER TABLE entities ADD COLUMN embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2'"
      ).run();
      this.db.prepare('ALTER TABLE entities ADD COLUMN embedding_version INTEGER DEFAULT 1').run();
      this.db.prepare('ALTER TABLE entities ADD COLUMN embedded_at DATETIME').run();

      // Create partial index for entities with embeddings (optimization for queries)
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_entities_has_embedding
        ON entities(name)
        WHERE embedding IS NOT NULL
      `).run();

      logger.info('Embedding columns added to entities table');
    }

    // Add needs_vector_sync column for tracking failed vector table syncs
    if (!columnNames.has('needs_vector_sync')) {
      this.db.prepare(
        'ALTER TABLE entities ADD COLUMN needs_vector_sync INTEGER DEFAULT 0'
      ).run();

      // Create index for finding entities that need sync
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_entities_needs_sync
        ON entities(name)
        WHERE needs_vector_sync = 1
      `).run();

      logger.info('Added needs_vector_sync column for vector table sync tracking');
    }
  }

  // ========================================================================
  // Entity Operations
  // ========================================================================

  /**
   * Create a new entity in the knowledge graph
   * @param entity - Entity data (name, entityType, observations, metadata)
   * @param options - Creation options (e.g., generateEmbedding)
   * @returns The created entity
   */
  async createEntity(
    entity: Omit<Entity, 'createdAt' | 'updatedAt'>,
    options: CreateEntityOptions = {}
  ): Promise<Entity> {
    const { generateEmbedding = true } = options;

    // Input validation
    const entityType = entity.entityType || 'unknown';
    const observations = entity.observations || [];

    const now = new Date();
    const fullEntity: Entity = {
      ...entity,
      entityType,
      observations,
      createdAt: now,
      updatedAt: now,
    };

    // Check if entity already exists
    const existing = await this.getEntity(fullEntity.name);
    if (existing) {
      // Entity already exists - update instead of insert
      logger.warn(`Entity "${fullEntity.name}" already exists, updating instead`);
      return await this.updateEntity(fullEntity.name, {
        entityType: fullEntity.entityType,
        observations: [...existing.observations, ...fullEntity.observations],
        metadata: fullEntity.metadata,
      }) || fullEntity;
    }

    // Insert entity
    const entityStmt = this.db.prepare(`
      INSERT INTO entities (name, entity_type, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      entityStmt.run(
        fullEntity.name,
        fullEntity.entityType,
        fullEntity.metadata ? JSON.stringify(fullEntity.metadata) : null,
        fullEntity.createdAt?.toISOString() ?? now.toISOString(),
        fullEntity.updatedAt?.toISOString() ?? now.toISOString()
      );
    } catch (error) {
      // Handle constraint violations gracefully
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        logger.warn(`Duplicate entity detected: ${fullEntity.name}`);
        const existing = await this.getEntity(fullEntity.name);
        return existing || fullEntity;
      }
      throw error;
    }

    // Insert observations
    if (fullEntity.observations.length > 0) {
      const obsStmt = this.db.prepare(`
        INSERT INTO observations (entity_name, observation, created_at)
        VALUES (?, ?, ?)
      `);

      const insertMany = this.db.transaction((observations: string[]) => {
        for (const obs of observations) {
          obsStmt.run(fullEntity.name, obs, now.toISOString());
        }
      });

      insertMany(fullEntity.observations);
    }

    // Generate embedding asynchronously (non-blocking)
    if (generateEmbedding && this.isAutoEmbeddingEnabled()) {
      this.generateEntityEmbedding(fullEntity.name).catch(error => {
        logger.warn('Failed to generate embedding for entity', {
          entityName: fullEntity.name,
          error: error instanceof Error ? error.message : error
        });
      });
    }

    return fullEntity;
  }

  async getEntity(name: string): Promise<Entity | undefined> {
    // Get entity
    const entityStmt = this.db.prepare('SELECT * FROM entities WHERE name = ?');
    const entityRow = entityStmt.get(name) as EntityRow | undefined;

    if (!entityRow) return undefined;

    // Get observations
    const obsStmt = this.db.prepare(`
      SELECT observation FROM observations
      WHERE entity_name = ?
      ORDER BY created_at ASC
    `);
    const observations = (obsStmt.all(name) as ObservationRow[]).map((row) => row.observation);

    return this.rowToEntity(entityRow, observations);
  }

  async updateEntity(
    name: string,
    updates: Partial<Omit<Entity, 'name' | 'createdAt' | 'updatedAt'>>
  ): Promise<Entity | undefined> {
    const entity = await this.getEntity(name);
    if (!entity) return undefined;

    const fields: string[] = [];
    const values: SQLParams = [];

    if (updates.entityType !== undefined) {
      fields.push('entity_type = ?');
      values.push(updates.entityType);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    // Always update updated_at
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(name);

    if (fields.length > 1) { // More than just updated_at
      const stmt = this.db.prepare(`
        UPDATE entities SET ${fields.join(', ')} WHERE name = ?
      `);
      stmt.run(...values);
    }

    // Track if observations changed for embedding regeneration
    let observationsChanged = false;

    // Update observations if provided
    if (updates.observations !== undefined) {
      // Delete old observations
      this.db.prepare('DELETE FROM observations WHERE entity_name = ?').run(name);

      // Insert new observations
      if (updates.observations.length > 0) {
        const obsStmt = this.db.prepare(`
          INSERT INTO observations (entity_name, observation, created_at)
          VALUES (?, ?, ?)
        `);

        const insertMany = this.db.transaction((observations: string[]) => {
          for (const obs of observations) {
            obsStmt.run(name, obs, new Date().toISOString());
          }
        });

        insertMany(updates.observations);
      }

      observationsChanged = true;
    }

    // Regenerate embedding if observations changed
    if (observationsChanged && this.isAutoEmbeddingEnabled()) {
      this.generateEntityEmbedding(name).catch(error => {
        logger.warn('Failed to regenerate embedding after observation update', {
          entityName: name,
          error: error instanceof Error ? error.message : error
        });
      });
    }

    return this.getEntity(name);
  }

  async deleteEntity(name: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM entities WHERE name = ?');
    const result = stmt.run(name);

    // Foreign key cascades will automatically delete:
    // - observations (ON DELETE CASCADE)
    // - relations where from_entity or to_entity = name (ON DELETE CASCADE)

    // Clean up embedding from vector table if entity was deleted
    if (result.changes > 0 && this.vectorExtensionInitialized) {
      try {
        VectorExtension.deleteEmbedding(this.db, name);
      } catch (error) {
        // Log but don't fail - the entity is already deleted
        logger.warn('Failed to delete embedding from vector table', {
          entityName: name,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return result.changes > 0;
  }

  async searchEntities(query: string, options: SearchOptions = {}): Promise<Entity[]> {
    const lowerQuery = query.toLowerCase();
    let sql = `
      SELECT DISTINCT e.* FROM entities e
      LEFT JOIN observations o ON e.name = o.entity_name
      WHERE 1=1
    `;
    const params: SQLParams = [];

    // Search in name, entity_type, or observations
    // Escape LIKE special characters (%, _, \) to prevent pattern injection
    sql += ` AND (
      LOWER(e.name) LIKE ? ESCAPE '\\' OR
      LOWER(e.entity_type) LIKE ? ESCAPE '\\' OR
      LOWER(o.observation) LIKE ? ESCAPE '\\'
    )`;
    const escapedQuery = lowerQuery.replace(/[%_\\]/g, '\\$&');
    const searchPattern = `%${escapedQuery}%`;
    params.push(searchPattern, searchPattern, searchPattern);

    // Filter by entity type
    if (options.entityType) {
      sql += ' AND e.entity_type = ?';
      params.push(options.entityType);
    }

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as EntityRow[];

    // Get observations for each entity
    const entities: Entity[] = [];
    for (const row of rows) {
      const obsStmt = this.db.prepare(`
        SELECT observation FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `);
      const observations = (obsStmt.all(row.name) as ObservationRow[]).map((r) => r.observation);
      entities.push(this.rowToEntity(row, observations));
    }

    return entities;
  }

  async getAllEntities(): Promise<Entity[]> {
    const stmt = this.db.prepare('SELECT * FROM entities ORDER BY created_at DESC');
    const rows = stmt.all() as EntityRow[];

    // Get observations for each entity
    const entities: Entity[] = [];
    for (const row of rows) {
      const obsStmt = this.db.prepare(`
        SELECT observation FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `);
      const observations = (obsStmt.all(row.name) as ObservationRow[]).map((r) => r.observation);
      entities.push(this.rowToEntity(row, observations));
    }

    return entities;
  }

  // ========================================================================
  // Relation Operations
  // ========================================================================

  async createRelation(relation: Omit<Relation, 'createdAt'>): Promise<Relation> {
    const now = new Date();
    const fullRelation: Relation = {
      ...relation,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO relations (from_entity, to_entity, relation_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullRelation.from,
      fullRelation.to,
      fullRelation.relationType,
      fullRelation.metadata ? JSON.stringify(fullRelation.metadata) : null,
      fullRelation.createdAt?.toISOString() ?? now.toISOString()
    );

    return fullRelation;
  }

  async getRelations(entityName: string): Promise<Relation[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM relations
      WHERE from_entity = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(entityName) as RelationRow[];
    return rows.map((row) => this.rowToRelation(row));
  }

  async deleteRelation(from: string, to: string, relationType: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM relations
      WHERE from_entity = ? AND to_entity = ? AND relation_type = ?
    `);

    const result = stmt.run(from, to, relationType);
    return result.changes > 0;
  }

  // ========================================================================
  // Graph Operations
  // ========================================================================

  async getConnectedEntities(entityName: string, maxDepth: number = 2): Promise<Set<string>> {
    const visited = new Set<string>();
    const queue: Array<{ name: string; depth: number }> = [{ name: entityName, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.name) || current.depth > maxDepth) continue;

      visited.add(current.name);

      if (current.depth < maxDepth) {
        const relations = await this.getRelations(current.name);
        for (const rel of relations) {
          if (!visited.has(rel.to)) {
            queue.push({ name: rel.to, depth: current.depth + 1 });
          }
        }
      }
    }

    return visited;
  }

  async getStats(): Promise<{
    totalEntities: number;
    totalRelations: number;
    entityTypeBreakdown: Record<string, number>;
  }> {
    const entitiesCount = this.db
      .prepare('SELECT COUNT(*) as count FROM entities')
      .get() as { count: number };

    const relationsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM relations')
      .get() as { count: number };

    const typeBreakdown = this.db
      .prepare(`
        SELECT entity_type, COUNT(*) as count
        FROM entities
        GROUP BY entity_type
      `)
      .all() as Array<{ entity_type: string; count: number }>;

    const entityTypeBreakdown: Record<string, number> = {};
    for (const row of typeBreakdown) {
      entityTypeBreakdown[row.entity_type] = row.count;
    }

    return {
      totalEntities: entitiesCount.count,
      totalRelations: relationsCount.count,
      entityTypeBreakdown,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private rowToEntity(row: EntityRow, observations: string[]): Entity {
    return {
      name: row.name,
      entityType: row.entity_type,
      observations,
      metadata: safeJsonParse(row.metadata, undefined),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private rowToRelation(row: RelationRow): Relation {
    return {
      from: row.from_entity,
      to: row.to_entity,
      relationType: row.relation_type,
      metadata: safeJsonParse(row.metadata, undefined),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Get database instance for advanced queries or migrations
   */
  getDb(): Database.Database {
    return this.db;
  }

  // ========================================================================
  // Embedding Operations
  // ========================================================================

  /**
   * Check if auto-embedding is enabled via config table
   * Returns true by default if no config is set
   */
  private isAutoEmbeddingEnabled(): boolean {
    try {
      // Check if config table exists
      const tableExists = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='config'"
      ).get();

      if (!tableExists) {
        return true; // Default enabled if no config table
      }

      const config = this.db.prepare(
        "SELECT value FROM config WHERE key = 'embedding_enabled'"
      ).get() as { value: string } | undefined;

      return config?.value !== 'false';
    } catch {
      return true; // Default enabled on error
    }
  }

  /**
   * Generate and store embedding for an entity
   *
   * Creates an embedding from the entity name and observations combined.
   * This method is async and can be called without blocking.
   *
   * @param entityName - Name of the entity to generate embedding for
   * @throws Error if entity not found
   *
   * @example
   * ```typescript
   * await kg.generateEntityEmbedding('My Entity');
   * ```
   */
  async generateEntityEmbedding(entityName: string): Promise<void> {
    const entity = await this.getEntity(entityName);
    if (!entity) {
      throw new Error(`Entity not found: ${entityName}`);
    }

    const text = createEntityText(entity.name, entity.observations ?? []);

    try {
      const embeddingService = await LazyEmbeddingService.get();
      const embedding = await embeddingService.encode(text);
      this.updateEntityEmbedding(entityName, embedding);

      logger.debug('Generated embedding for entity', { entityName });
    } catch (error) {
      logger.error('Failed to generate embedding', {
        entityName,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update embedding for an entity
   *
   * Stores embedding in both:
   * 1. entities.embedding column (for backward compatibility and direct access)
   * 2. entity_embeddings virtual table (for efficient KNN search via sqlite-vec)
   *
   * @param entityName - Name of the entity to update
   * @param embedding - Float32Array containing the embedding vector (384 dimensions for all-MiniLM-L6-v2)
   * @param model - The embedding model used (default: 'all-MiniLM-L6-v2')
   * @param version - The embedding version (default: 1)
   */
  updateEntityEmbedding(
    entityName: string,
    embedding: Float32Array,
    model: string = 'all-MiniLM-L6-v2',
    version: number = 1
  ): void {
    // 1. Update in entities table (for backward compatibility)
    const stmt = this.db.prepare(`
      UPDATE entities
      SET embedding = ?,
          embedding_model = ?,
          embedding_version = ?,
          embedded_at = datetime('now'),
          updated_at = datetime('now'),
          needs_vector_sync = 0
      WHERE name = ?
    `);
    stmt.run(Buffer.from(embedding.buffer), model, version, entityName);

    // 2. Sync to entity_embeddings virtual table for efficient KNN search
    let syncFailed = false;
    try {
      this.ensureVectorExtension();
      VectorExtension.insertEmbedding(this.db, entityName, embedding);
    } catch (error) {
      syncFailed = true;
      // Log but don't fail - vector search is an optimization
      logger.warn('Failed to sync embedding to vector table', {
        entityName,
        error: error instanceof Error ? error.message : error,
      });
    }

    // 3. Mark entity for retry if vector sync failed
    if (syncFailed) {
      const markStmt = this.db.prepare(
        'UPDATE entities SET needs_vector_sync = 1 WHERE name = ?'
      );
      markStmt.run(entityName);
    }

    if (this.options.verbose) {
      logger.debug(`Updated embedding for entity: ${entityName}`, {
        model,
        version,
        syncFailed,
      });
    }
  }

  /** Flag to track if vector extension has been initialized */
  private vectorExtensionInitialized = false;

  /**
   * Ensure VectorExtension is loaded and entity_embeddings table exists
   */
  private ensureVectorExtension(): void {
    if (this.vectorExtensionInitialized) {
      return;
    }

    try {
      VectorExtension.loadExtension(this.db);
      VectorExtension.createVectorTable(this.db, DEFAULT_EMBEDDING_DIMENSIONS);
      this.vectorExtensionInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize VectorExtension', { error });
      throw error;
    }
  }

  /**
   * Get embedding for an entity
   * @param entityName - Name of the entity
   * @returns Float32Array containing the embedding, or null if not found
   */
  getEntityEmbedding(entityName: string): Float32Array | null {
    const stmt = this.db.prepare('SELECT embedding FROM entities WHERE name = ?');
    const row = stmt.get(entityName) as { embedding: Buffer | null } | undefined;

    if (!row?.embedding) {
      return null;
    }

    return bufferToFloat32Array(row.embedding);
  }

  /**
   * Get entities without embeddings (for backfill operations)
   * @param limit - Maximum number of entities to return (optional)
   * @returns Array of entities that don't have embeddings yet
   */
  async getEntitiesWithoutEmbeddings(limit?: number): Promise<Entity[]> {
    const sql = limit
      ? 'SELECT * FROM entities WHERE embedding IS NULL ORDER BY created_at ASC LIMIT ?'
      : 'SELECT * FROM entities WHERE embedding IS NULL ORDER BY created_at ASC';

    const stmt = this.db.prepare(sql);
    const rows = (limit ? stmt.all(limit) : stmt.all()) as EntityRow[];

    // Get observations for each entity
    const entities: Entity[] = [];
    for (const row of rows) {
      const obsStmt = this.db.prepare(`
        SELECT observation FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `);
      const observations = (obsStmt.all(row.name) as ObservationRow[]).map((r) => r.observation);
      entities.push(this.rowToEntity(row, observations));
    }

    return entities;
  }

  /**
   * Get count of entities with and without embeddings
   * Useful for monitoring backfill progress
   */
  getEmbeddingStats(): { withEmbeddings: number; withoutEmbeddings: number; total: number } {
    const withEmbeddings = this.db
      .prepare('SELECT COUNT(*) as count FROM entities WHERE embedding IS NOT NULL')
      .get() as { count: number };

    const withoutEmbeddings = this.db
      .prepare('SELECT COUNT(*) as count FROM entities WHERE embedding IS NULL')
      .get() as { count: number };

    return {
      withEmbeddings: withEmbeddings.count,
      withoutEmbeddings: withoutEmbeddings.count,
      total: withEmbeddings.count + withoutEmbeddings.count,
    };
  }

  /**
   * Backfill embeddings for all entities without one
   *
   * Generates and stores embeddings for all entities that don't have an embedding yet.
   * Progress can be monitored via the onProgress callback.
   *
   * @param options - Backfill options
   * @param options.batchSize - Number of entities to process per batch (default: 20)
   * @param options.onProgress - Callback for progress updates
   * @returns Object with processed and failed counts
   *
   * @example
   * ```typescript
   * const result = await kg.backfillEmbeddings({
   *   batchSize: 10,
   *   onProgress: (current, total) => console.log(`${current}/${total}`)
   * });
   * console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
   * ```
   */
  async backfillEmbeddings(
    options: {
      batchSize?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ processed: number; failed: number }> {
    const { batchSize = 20, onProgress } = options;

    const entities = await this.getEntitiesWithoutEmbeddings();
    const total = entities.length;
    let processed = 0;
    let failed = 0;

    if (total === 0) {
      return { processed: 0, failed: 0 };
    }

    const embeddingService = await LazyEmbeddingService.get();

    for (let i = 0; i < total; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);

      for (const entity of batch) {
        try {
          const text = createEntityText(entity.name, entity.observations ?? []);
          const embedding = await embeddingService.encode(text);

          // Store embedding
          this.updateEntityEmbedding(entity.name, embedding);

          processed++;
        } catch (error) {
          failed++;
          logger.warn(`Failed to generate embedding for entity: ${entity.name}`, { error });
        }
      }

      onProgress?.(Math.min(i + batch.length, total), total);
    }

    logger.info('Backfill embeddings completed', { processed, failed, total });
    return { processed, failed };
  }

  /**
   * Bulk update embeddings for multiple entities (more efficient for backfill)
   * @param embeddings - Array of { entityName, embedding } pairs
   * @param model - The embedding model used
   * @param version - The embedding version
   */
  bulkUpdateEmbeddings(
    embeddings: Array<{ entityName: string; embedding: Float32Array }>,
    model: string = 'all-MiniLM-L6-v2',
    version: number = 1
  ): void {
    const stmt = this.db.prepare(`
      UPDATE entities
      SET embedding = ?,
          embedding_model = ?,
          embedding_version = ?,
          embedded_at = datetime('now'),
          updated_at = datetime('now')
      WHERE name = ?
    `);

    const updateMany = this.db.transaction((items: typeof embeddings) => {
      for (const { entityName, embedding } of items) {
        stmt.run(Buffer.from(embedding.buffer), model, version, entityName);
      }
    });

    updateMany(embeddings);

    logger.info(`Bulk updated embeddings for ${embeddings.length} entities`, { model, version });
  }

  /**
   * Clean up orphaned embeddings from the vector table
   *
   * Removes embeddings that exist in entity_embeddings but don't have
   * a corresponding entity in the entities table. This can happen if:
   * - Entity deletion fails to clean up the vector table
   * - Manual database modifications
   * - Data inconsistency from crashes
   *
   * @returns Number of orphaned embeddings deleted
   */
  async cleanupOrphanedEmbeddings(): Promise<number> {
    if (!this.vectorExtensionInitialized) {
      try {
        this.ensureVectorExtension();
      } catch {
        // Vector extension not available
        return 0;
      }
    }

    try {
      // Find orphaned embeddings (in entity_embeddings but not in entities)
      const orphanStmt = this.db.prepare(`
        SELECT ee.entity_name
        FROM entity_embeddings ee
        LEFT JOIN entities e ON ee.entity_name = e.name
        WHERE e.name IS NULL
      `);
      const orphans = orphanStmt.all() as Array<{ entity_name: string }>;

      if (orphans.length === 0) {
        return 0;
      }

      // Delete orphaned embeddings
      const deleteStmt = this.db.prepare(
        'DELETE FROM entity_embeddings WHERE entity_name = ?'
      );

      const deleteMany = this.db.transaction((names: string[]) => {
        for (const name of names) {
          deleteStmt.run(name);
        }
      });

      const orphanNames = orphans.map((o) => o.entity_name);
      deleteMany(orphanNames);

      logger.info('Cleaned up orphaned embeddings', { count: orphans.length });
      return orphans.length;
    } catch (error) {
      logger.error('Failed to cleanup orphaned embeddings', {
        error: error instanceof Error ? error.message : error,
      });
      return 0;
    }
  }

  /**
   * Retry syncing embeddings to vector table for entities that failed previously
   *
   * Finds entities with needs_vector_sync = 1 and attempts to sync their
   * embeddings to the entity_embeddings virtual table.
   *
   * @param options - Retry options
   * @returns Statistics about retried syncs
   */
  async retryFailedVectorSyncs(
    options: {
      batchSize?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<{ succeeded: number; failed: number; total: number }> {
    const { batchSize = 50, onProgress } = options;

    // Initialize vector extension if not already
    try {
      this.ensureVectorExtension();
    } catch {
      logger.warn('Vector extension not available, cannot retry syncs');
      return { succeeded: 0, failed: 0, total: 0 };
    }

    // Find entities that need vector sync
    const pendingStmt = this.db.prepare(`
      SELECT name, embedding FROM entities
      WHERE needs_vector_sync = 1 AND embedding IS NOT NULL
    `);
    const pending = pendingStmt.all() as Array<{ name: string; embedding: Buffer }>;

    if (pending.length === 0) {
      return { succeeded: 0, failed: 0, total: 0 };
    }

    const total = pending.length;
    let succeeded = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const embedding = bufferToFloat32Array(row.embedding);

          // Try to sync to vector table
          VectorExtension.insertEmbedding(this.db, row.name, embedding);

          // Clear the sync flag
          this.db.prepare('UPDATE entities SET needs_vector_sync = 0 WHERE name = ?').run(row.name);

          succeeded++;
        } catch (error) {
          failed++;
          logger.warn(`Failed to retry vector sync for entity: ${row.name}`, {
            error: error instanceof Error ? error.message : error,
          });
        }
      }

      onProgress?.(Math.min(i + batch.length, total), total);
    }

    logger.info('Retry vector syncs completed', { succeeded, failed, total });
    return { succeeded, failed, total };
  }

  /**
   * Get count of entities needing vector sync
   */
  getEntitiesNeedingVectorSyncCount(): number {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM entities WHERE needs_vector_sync = 1'
    );
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Optimize database (run periodically)
   */
  async optimize(): Promise<void> {
    this.db.pragma('optimize');
    this.db.exec('VACUUM');
  }

  /**
   * Get database file size and table statistics
   */
  async getDatabaseStats(): Promise<{
    total_entities: number;
    total_observations: number;
    total_relations: number;
    avg_observations_per_entity: number;
  }> {
    const stats = await this.getStats();

    const obsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM observations')
      .get() as { count: number };

    return {
      total_entities: stats.totalEntities,
      total_observations: obsCount.count,
      total_relations: stats.totalRelations,
      avg_observations_per_entity:
        stats.totalEntities > 0 ? obsCount.count / stats.totalEntities : 0,
    };
  }

  // ========================================================================
  // Semantic Search Operations
  // ========================================================================

  /**
   * Semantic search using vector similarity
   *
   * Finds entities that are semantically similar to the query text,
   * using cosine similarity between embedding vectors.
   *
   * @param query - The search query text
   * @param options - Search configuration options
   * @returns Array of entities with similarity scores, sorted by similarity (highest first)
   *
   * @example
   * ```typescript
   * const results = await kg.semanticSearch('how to handle user login');
   * for (const { entity, similarity } of results) {
   *   console.log(`${entity.name}: ${similarity.toFixed(2)}`);
   * }
   * ```
   */
  async semanticSearch(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const { limit = 10, minSimilarity = 0.3, entityTypes } = options;

    // 1. Get embedding service (lazy load singleton)
    const embeddingService = await LazyEmbeddingService.get();

    // 2. Generate query embedding
    const queryEmbedding = await embeddingService.encode(query);

    // 3. Try to use VectorExtension for efficient KNN search
    try {
      this.ensureVectorExtension();

      // Request more results than needed to allow for filtering
      const knnLimit = entityTypes?.length ? limit * 3 : limit * 2;
      const knnResults = VectorExtension.knnSearch(this.db, queryEmbedding, knnLimit);

      // 4. Filter and transform results
      const results: SemanticSearchResult[] = [];

      for (const knn of knnResults) {
        // Convert cosine distance to similarity (distance=0 means identical, similarity=1)
        // For cosine distance metric: similarity = 1 - distance
        const similarity = 1 - knn.distance;

        if (similarity < minSimilarity) continue;

        const entity = await this.getEntity(knn.entityName);
        if (!entity) continue;

        // Filter by entityType if specified
        if (entityTypes?.length && !entityTypes.includes(entity.entityType)) continue;

        results.push({ entity, similarity });

        // Stop if we have enough results
        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      // Fallback to legacy O(n) search if VectorExtension fails
      logger.warn('VectorExtension KNN search failed, falling back to legacy search', {
        error: error instanceof Error ? error.message : error
      });

      return this.semanticSearchLegacy(query, queryEmbedding, embeddingService, options);
    }
  }

  /**
   * Legacy O(n) semantic search fallback
   * Used when VectorExtension is not available or fails
   */
  private async semanticSearchLegacy(
    _query: string,
    queryEmbedding: Float32Array,
    embeddingService: Awaited<ReturnType<typeof LazyEmbeddingService.get>>,
    options: SemanticSearchOptions
  ): Promise<SemanticSearchResult[]> {
    const { limit = 10, minSimilarity = 0.3, entityTypes } = options;

    // Get all entities with embeddings from database
    let sql = 'SELECT name, embedding FROM entities WHERE embedding IS NOT NULL';
    const params: SQLParams = [];

    if (entityTypes?.length) {
      const placeholders = entityTypes.map(() => '?').join(',');
      sql += ` AND entity_type IN (${placeholders})`;
      params.push(...entityTypes);
    }

    const rows = this.db.prepare(sql).all(...params) as Array<{
      name: string;
      embedding: Buffer;
    }>;

    // Calculate similarities for each entity
    const results: SemanticSearchResult[] = [];

    for (const row of rows) {
      const entityEmbedding = bufferToFloat32Array(row.embedding);
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, entityEmbedding);

      // Only include results above threshold
      if (similarity >= minSimilarity) {
        const entity = await this.getEntity(row.name);
        if (entity) {
          results.push({ entity, similarity });
        }
      }
    }

    // Sort by similarity (highest first) and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Hybrid search combining semantic and keyword matching
   *
   * Combines three scoring factors:
   * - Semantic similarity (default 60% weight): How semantically related the content is
   * - Keyword matching (default 30% weight): Exact text matches in name/observations
   * - Recency (default 10% weight): How recently the entity was created
   *
   * This approach provides better results than pure semantic search by also
   * considering exact matches and preferring recent content.
   *
   * @param query - The search query text
   * @param options - Search configuration options
   * @returns Array of entities with combined scores, sorted by score (highest first)
   *
   * @example
   * ```typescript
   * const results = await kg.hybridSearch('JWT authentication', {
   *   semanticWeight: 0.5,
   *   keywordWeight: 0.4,
   *   recencyWeight: 0.1
   * });
   * ```
   */
  async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0.3,
      semanticWeight = 0.6,
      keywordWeight = 0.3,
      recencyWeight = 0.1,
      entityTypes
    } = options;

    // 1. Semantic search with lower threshold to get candidates
    const semanticResults = await this.semanticSearch(query, {
      limit: limit * 2, // Get more candidates for merging
      minSimilarity: minSimilarity * 0.5, // Lower threshold for candidates
      entityTypes
    });

    // 2. Keyword search
    const keywordResults = await this.searchEntities(query, {
      limit: limit * 2,
      entityType: entityTypes?.[0] // searchEntities only supports single type
    });

    // 3. Merge and score results
    const scoreMap = new Map<string, {
      entity: Entity;
      score: number;
      semantic: number;
      keyword: number;
      recency: number;
    }>();

    // Add semantic results
    for (const r of semanticResults) {
      scoreMap.set(r.entity.name, {
        entity: r.entity,
        score: r.similarity * semanticWeight,
        semantic: r.similarity,
        keyword: 0,
        recency: 0
      });
    }

    // Add/update with keyword results
    for (const entity of keywordResults) {
      const existing = scoreMap.get(entity.name);
      const keywordScore = 1.0; // Keyword match = 1.0

      if (existing) {
        existing.keyword = keywordScore;
        existing.score += keywordScore * keywordWeight;
      } else {
        scoreMap.set(entity.name, {
          entity,
          score: keywordScore * keywordWeight,
          semantic: 0,
          keyword: keywordScore,
          recency: 0
        });
      }
    }

    // 4. Apply recency weight (newer = higher score)
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    for (const [, value] of scoreMap) {
      const createdAt = value.entity.createdAt?.getTime() ?? now;
      const age = now - createdAt;
      // Linear decay over 1 year: 1.0 for now, 0.0 for 1 year ago
      const recencyScore = Math.max(0, 1 - age / oneYearMs);
      value.recency = recencyScore;
      value.score += recencyScore * recencyWeight;
    }

    // 5. Filter by minimum similarity and sort
    const filteredResults = Array.from(scoreMap.values())
      .filter(v => v.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Log scoring breakdown for debugging
    if (this.options.verbose && filteredResults.length > 0) {
      logger.debug('Hybrid search scoring breakdown:', {
        query,
        topResults: filteredResults.slice(0, 3).map(v => ({
          name: v.entity.name,
          total: v.score.toFixed(3),
          semantic: v.semantic.toFixed(3),
          keyword: v.keyword.toFixed(3),
          recency: v.recency.toFixed(3)
        }))
      });
    }

    return filteredResults.map(v => ({
      entity: v.entity,
      similarity: v.score
    }));
  }
}
