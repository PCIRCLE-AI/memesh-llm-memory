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

interface EntityRow {
  name: string;
  entity_type: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
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
      dbPath: options.dbPath || `${process.env.HOME}/.claude/knowledge-graph.db`,
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

  // ========================================================================
  // Entity Operations
  // ========================================================================

  async createEntity(entity: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity> {
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
    }

    return this.getEntity(name);
  }

  async deleteEntity(name: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM entities WHERE name = ?');
    const result = stmt.run(name);

    // Foreign key cascades will automatically delete:
    // - observations (ON DELETE CASCADE)
    // - relations where from_entity or to_entity = name (ON DELETE CASCADE)

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
    sql += ` AND (
      LOWER(e.name) LIKE ? OR
      LOWER(e.entity_type) LIKE ? OR
      LOWER(o.observation) LIKE ?
    )`;
    const searchPattern = `%${lowerQuery}%`;
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
}
