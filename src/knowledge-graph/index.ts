/**
 * Knowledge Graph - SQLite-based implementation
 *
 * Lightweight, standalone knowledge graph with no external dependencies
 * Perfect for personal AI assistants and code intelligence
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NotFoundError } from '../errors/index.js';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
import type { SQLParams } from '../evolution/storage/types.js';

export class KnowledgeGraph {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to data/knowledge-graph.db
    this.dbPath = dbPath || join(process.cwd(), 'data', 'knowledge-graph.db');

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.db = SimpleDatabaseFactory.getInstance(this.dbPath);
    this.initialize();

    console.log(`[KnowledgeGraph] Initialized at: ${this.dbPath}`);
  }

  private initialize() {

    // Create schema
    const schema = `
      -- Entities table
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags(entity_id);
    `;

    this.db.exec(schema);
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
      entity.type,
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

    console.log(`[KG] Created entity: ${entity.name} (type: ${entity.type})`);
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

    console.log(`[KG] Created relation: ${relation.from} -[${relation.relationType}]-> ${relation.to}`);
  }

  /**
   * Search entities
   */
  searchEntities(query: SearchQuery): Entity[] {
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

    if (query.type) {
      sql += ' AND e.type = ?';
      params.push(query.type);
    }

    if (query.tag) {
      sql += ' AND e.id IN (SELECT entity_id FROM tags WHERE tag = ?)';
      params.push(query.tag);
    }

    if (query.namePattern) {
      sql += ' AND e.name LIKE ?';
      params.push(`%${query.namePattern}%`);
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

    return rows.map(row => {
      // Type assertion after runtime validation via database query
      const r = row as {
        id: number;
        name: string;
        type: string;
        observations: string | null;
        tags: string | null;
        metadata: string | null;
        created_at: string;
      };
      return {
        id: r.id,
        name: r.name,
        type: r.type as EntityType,
        observations: r.observations ? r.observations.split('|||') : [],
        tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        createdAt: new Date(r.created_at)
      };
    });
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
    const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
    const entity = getEntityId.get(entityName) as { id: number } | undefined;

    if (!entity) {
      return null;
    }

    const relations = this.db.prepare(`
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

    return {
      entity: entityName,
      relations: relations.map(row => {
        // Type assertion after runtime validation via database query
        const r = row as {
          from_name: string;
          to_name: string;
          relation_type: string;
          metadata: string | null;
        };
        return {
          from: r.from_name,
          to: r.to_name,
          relationType: r.relation_type as RelationType,
          metadata: r.metadata ? JSON.parse(r.metadata) : {}
        };
      }),
      depth
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntities: number;
    totalRelations: number;
    entitiesByType: Record<string, number>;
  } {
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

    return {
      totalEntities: totalEntities.count,
      totalRelations: totalRelations.count,
      entitiesByType
    };
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

    console.log(`[KG] Deleted entity: ${name}`);
    return result.changes > 0;
  }

  /**
   * Close the database connection
   */
  close() {
    this.db.close();
    console.log('[KG] Database connection closed');
  }
}

// Export types
export type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
