import Database from 'better-sqlite3';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { Entity, Relation } from '../types.js';
import { logger } from '../../../utils/logger.js';
import { logError } from '../../../utils/errorHandler.js';

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
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'initialize',
        operation: 'initializing knowledge graph database',
        data: { dbPath: this.dbPath },
      });
      throw error;
    }
  }

  /**
   * Create a new entity
   */
  async createEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();

    try {
      const db = this.db!;
      // ✅ FIX HIGH-2: Use IMMEDIATE mode to acquire write lock at transaction start
      // Prevents "database is locked" errors under concurrent writes
      db.transaction(() => {
        try {
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
        } catch (error) {
          logError(error, {
            component: 'KnowledgeGraphStore',
            method: 'createEntity',
            operation: 'database transaction: create entity and observations',
            data: { entityName: entity.name, entityType: entity.entityType },
          });
          // Transaction will rollback automatically
          throw error;
        }
      }).immediate();

      logger.debug('Entity created', { entityName: entity.name });
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'createEntity',
        operation: 'creating entity',
        data: { entityName: entity.name, observationCount: entity.observations.length },
      });
      throw error;
    }
  }

  /**
   * Get entity by name
   */
  async getEntity(name: string): Promise<Entity | null> {
    this.ensureInitialized();

    try {
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
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'getEntity',
        operation: 'fetching entity from database',
        data: { entityName: name },
      });
      throw error;
    }
  }

  /**
   * Update entity (replace observations)
   */
  async updateEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();

    try {
      const db = this.db!;
      // ✅ FIX HIGH-2: Use IMMEDIATE mode to acquire write lock at transaction start
      db.transaction(() => {
        try {
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
        } catch (error) {
          logError(error, {
            component: 'KnowledgeGraphStore',
            method: 'updateEntity',
            operation: 'database transaction: update entity and replace observations',
            data: { entityName: entity.name },
          });
          // Transaction will rollback automatically
          throw error;
        }
      }).immediate();

      logger.debug('Entity updated', { entityName: entity.name });
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'updateEntity',
        operation: 'updating entity',
        data: { entityName: entity.name, observationCount: entity.observations.length },
      });
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async deleteEntity(name: string): Promise<void> {
    this.ensureInitialized();

    try {
      this.db!.prepare(`DELETE FROM entities WHERE name = ?`).run(name);
      logger.debug('Entity deleted', { entityName: name });
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'deleteEntity',
        operation: 'deleting entity from database',
        data: { entityName: name },
      });
      throw error;
    }
  }

  /**
   * ✅ FIX MAJOR-1: Sanitize search query to prevent LIKE wildcard issues
   *
   * Escapes LIKE special characters using backslash as escape character.
   * The SQL query must use ESCAPE '\\' clause for this to work correctly.
   */
  private sanitizeSearchQuery(query: string): string {
    // Define escape character (must match ESCAPE clause in SQL query)
    const ESCAPE_CHAR = '\\';

    // Escape LIKE special characters (%, _, and the escape char itself)
    // Order matters: escape the escape character first to avoid double-escaping
    return query
      .replace(/\\/g, ESCAPE_CHAR + ESCAPE_CHAR)  // Escape backslash first
      .replace(/%/g, ESCAPE_CHAR + '%')           // Escape % wildcard
      .replace(/_/g, ESCAPE_CHAR + '_')           // Escape _ wildcard
      .replace(/\[/g, '')    // Remove [
      .replace(/]/g, '')     // Remove ]
      .replace(/</g, '')     // Remove <
      .replace(/>/g, '')     // Remove >
      .replace(/{/g, '')     // Remove {
      .replace(/}/g, '')     // Remove }
      .trim();               // Remove leading/trailing whitespace
  }

  /**
   * Search entities by query (full-text search on observations)
   *
   * ✅ FIX MAJOR-1: Now with input sanitization
   */
  async searchEntities(query: string, options: {
    entityType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Entity[]> {
    this.ensureInitialized();

    try {
      const db = this.db!;
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // ✅ FIX MAJOR-1: Sanitize user input
      const sanitizedQuery = this.sanitizeSearchQuery(query);

      // Build query (use ESCAPE clause for escaped wildcards)
      let sql = `
        SELECT DISTINCT e.name, e.entity_type
        FROM entities e
        LEFT JOIN observations o ON e.name = o.entity_name
        WHERE (
          e.name LIKE ? ESCAPE '\\' OR
          o.content LIKE ? ESCAPE '\\'
        )
      `;

      const params: any[] = [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`];

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
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'searchEntities',
        operation: 'searching entities in database',
        data: { query, options },
      });
      throw error;
    }
  }

  /**
   * Create a relation
   */
  async createRelation(relation: Relation): Promise<void> {
    this.ensureInitialized();

    try {
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
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'createRelation',
        operation: 'creating relation in database',
        data: { from: relation.from, to: relation.to, relationType: relation.relationType },
      });
      throw error;
    }
  }

  /**
   * Get all relations for an entity
   */
  async getRelations(entityName: string): Promise<Relation[]> {
    this.ensureInitialized();

    try {
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
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'getRelations',
        operation: 'fetching relations from database',
        data: { entityName },
      });
      throw error;
    }
  }

  /**
   * Delete a specific relation
   */
  async deleteRelation(from: string, to: string, relationType: string): Promise<void> {
    this.ensureInitialized();

    try {
      this.db!.prepare(`
        DELETE FROM relations
        WHERE from_entity = ? AND to_entity = ? AND relation_type = ?
      `).run(from, to, relationType);

      logger.debug('Relation deleted', { from, to, type: relationType });
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'deleteRelation',
        operation: 'deleting relation from database',
        data: { from, to, relationType },
      });
      throw error;
    }
  }

  /**
   * Get all entities
   */
  async getAllEntities(): Promise<Entity[]> {
    this.ensureInitialized();

    try {
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
    } catch (error) {
      logError(error, {
        component: 'KnowledgeGraphStore',
        method: 'getAllEntities',
        operation: 'fetching all entities from database',
      });
      throw error;
    }
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
