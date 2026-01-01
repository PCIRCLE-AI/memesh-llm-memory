import Database from 'better-sqlite3';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { Entity, Relation } from '../types';
import { logger } from '../../../utils/logger.js';

export class KnowledgeGraphStore {
  private db: Database.Database | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string = './data/knowledge-graph.db') {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure data directory exists (async)
      const dir = path.dirname(this.dbPath);
      try {
        await fsPromises.access(dir);
      } catch {
        // Directory doesn't exist, create it
        await fsPromises.mkdir(dir, { recursive: true });
      }

      // Open database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints

      // Read and execute schema (async)
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fsPromises.readFile(schemaPath, 'utf-8');
      this.db.exec(schema);

      this.initialized = true;
      logger.info('Knowledge Graph storage initialized', { dbPath: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize Knowledge Graph storage', { error });
      throw error;
    }
  }

  /**
   * Create a new entity
   */
  async createEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();

    const db = this.db!;
    const transaction = db.transaction(() => {
      // Insert entity
      const insertEntity = db.prepare(`
        INSERT INTO entities (name, entity_type)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET
          entity_type = excluded.entity_type,
          updated_at = strftime('%s', 'now')
      `);
      insertEntity.run(entity.name, entity.entityType);

      // Insert observations
      const insertObservation = db.prepare(`
        INSERT INTO observations (entity_name, content)
        VALUES (?, ?)
      `);

      for (const observation of entity.observations) {
        insertObservation.run(entity.name, observation);
      }
    });

    transaction();
    logger.debug('Entity created', { entityName: entity.name });
  }

  /**
   * Get entity by name
   */
  async getEntity(name: string): Promise<Entity | null> {
    this.ensureInitialized();

    const db = this.db!;

    // Get entity
    const entityRow = db.prepare(`
      SELECT name, entity_type
      FROM entities
      WHERE name = ?
    `).get(name) as { name: string; entity_type: string } | undefined;

    if (!entityRow) {
      return null;
    }

    // Get observations
    const observationRows = db.prepare(`
      SELECT content
      FROM observations
      WHERE entity_name = ?
      ORDER BY created_at ASC
    `).all(name) as { content: string }[];

    return {
      name: entityRow.name,
      entityType: entityRow.entity_type,
      observations: observationRows.map(row => row.content),
    };
  }

  /**
   * Update entity (replace observations)
   */
  async updateEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();

    const db = this.db!;
    const transaction = db.transaction(() => {
      // Update entity metadata
      db.prepare(`
        UPDATE entities
        SET entity_type = ?, updated_at = strftime('%s', 'now')
        WHERE name = ?
      `).run(entity.entityType, entity.name);

      // Delete old observations
      db.prepare(`DELETE FROM observations WHERE entity_name = ?`).run(entity.name);

      // Insert new observations
      const insertObservation = db.prepare(`
        INSERT INTO observations (entity_name, content)
        VALUES (?, ?)
      `);

      for (const observation of entity.observations) {
        insertObservation.run(entity.name, observation);
      }
    });

    transaction();
    logger.debug('Entity updated', { entityName: entity.name });
  }

  /**
   * Delete entity
   */
  async deleteEntity(name: string): Promise<void> {
    this.ensureInitialized();

    this.db!.prepare(`DELETE FROM entities WHERE name = ?`).run(name);
    logger.debug('Entity deleted', { entityName: name });
  }

  /**
   * Search entities by query (full-text search on observations)
   */
  async searchEntities(query: string, options: {
    entityType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Entity[]> {
    this.ensureInitialized();

    const db = this.db!;
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Build query
    let sql = `
      SELECT DISTINCT e.name, e.entity_type
      FROM entities e
      LEFT JOIN observations o ON e.name = o.entity_name
      WHERE (
        e.name LIKE ? OR
        o.content LIKE ?
      )
    `;

    const params: any[] = [`%${query}%`, `%${query}%`];

    if (options.entityType) {
      sql += ` AND e.entity_type = ?`;
      params.push(options.entityType);
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const entityRows = db.prepare(sql).all(...params) as { name: string; entity_type: string }[];

    // Fetch full entities
    const entities: Entity[] = [];
    for (const row of entityRows) {
      const entity = await this.getEntity(row.name);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Create a relation
   */
  async createRelation(relation: Relation): Promise<void> {
    this.ensureInitialized();

    this.db!.prepare(`
      INSERT INTO relations (from_entity, to_entity, relation_type)
      VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(relation.from, relation.to, relation.relationType);

    logger.debug('Relation created', {
      from: relation.from,
      to: relation.to,
      type: relation.relationType
    });
  }

  /**
   * Get all relations for an entity
   */
  async getRelations(entityName: string): Promise<Relation[]> {
    this.ensureInitialized();

    const rows = this.db!.prepare(`
      SELECT from_entity, to_entity, relation_type
      FROM relations
      WHERE from_entity = ? OR to_entity = ?
    `).all(entityName, entityName) as {
      from_entity: string;
      to_entity: string;
      relation_type: string
    }[];

    return rows.map(row => ({
      from: row.from_entity,
      to: row.to_entity,
      relationType: row.relation_type,
    }));
  }

  /**
   * Delete a specific relation
   */
  async deleteRelation(from: string, to: string, relationType: string): Promise<void> {
    this.ensureInitialized();

    this.db!.prepare(`
      DELETE FROM relations
      WHERE from_entity = ? AND to_entity = ? AND relation_type = ?
    `).run(from, to, relationType);

    logger.debug('Relation deleted', { from, to, type: relationType });
  }

  /**
   * Get all entities
   */
  async getAllEntities(): Promise<Entity[]> {
    this.ensureInitialized();

    const entityRows = this.db!.prepare(`
      SELECT name, entity_type
      FROM entities
      ORDER BY name ASC
    `).all() as { name: string; entity_type: string }[];

    const entities: Entity[] = [];
    for (const row of entityRows) {
      const entity = await this.getEntity(row.name);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('Knowledge Graph storage closed');
    }
  }

  /**
   * Ensure database is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('KnowledgeGraphStore not initialized. Call initialize() first.');
    }
  }
}
