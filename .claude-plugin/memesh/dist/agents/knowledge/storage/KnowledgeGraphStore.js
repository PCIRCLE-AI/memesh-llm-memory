import Database from 'better-sqlite3';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger.js';
import { logError } from '../../../utils/errorHandler.js';
export class KnowledgeGraphStore {
    db = null;
    dbPath;
    initialized = false;
    constructor(dbPath = './data/knowledge-graph.db') {
        this.dbPath = dbPath;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const dir = path.dirname(this.dbPath);
            try {
                await fsPromises.access(dir);
            }
            catch {
                await fsPromises.mkdir(dir, { recursive: true });
            }
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = await fsPromises.readFile(schemaPath, 'utf-8');
            this.db.exec(schema);
            this.initialized = true;
            logger.info('Knowledge Graph storage initialized', { dbPath: this.dbPath });
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'initialize',
                operation: 'initializing knowledge graph database',
                data: { dbPath: this.dbPath },
            });
            throw error;
        }
    }
    async createEntity(entity) {
        this.ensureInitialized();
        try {
            const db = this.db;
            db.transaction(() => {
                try {
                    const insertEntity = db.prepare(`
            INSERT INTO entities (name, entity_type)
            VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET
              entity_type = excluded.entity_type,
              updated_at = strftime('%s', 'now')
          `);
                    insertEntity.run(entity.name, entity.entityType);
                    const insertObservation = db.prepare(`
            INSERT INTO observations (entity_name, content)
            VALUES (?, ?)
          `);
                    for (const observation of entity.observations) {
                        insertObservation.run(entity.name, observation);
                    }
                }
                catch (error) {
                    logError(error, {
                        component: 'KnowledgeGraphStore',
                        method: 'createEntity',
                        operation: 'database transaction: create entity and observations',
                        data: { entityName: entity.name, entityType: entity.entityType },
                    });
                    throw error;
                }
            }).immediate();
            logger.debug('Entity created', { entityName: entity.name });
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'createEntity',
                operation: 'creating entity',
                data: { entityName: entity.name, observationCount: entity.observations.length },
            });
            throw error;
        }
    }
    async getEntity(name) {
        this.ensureInitialized();
        try {
            const db = this.db;
            const entityRow = db.prepare(`
        SELECT name, entity_type
        FROM entities
        WHERE name = ?
      `).get(name);
            if (!entityRow) {
                return null;
            }
            const observationRows = db.prepare(`
        SELECT content
        FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `).all(name);
            return {
                name: entityRow.name,
                entityType: entityRow.entity_type,
                observations: observationRows.map(row => row.content),
            };
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'getEntity',
                operation: 'fetching entity from database',
                data: { entityName: name },
            });
            throw error;
        }
    }
    async updateEntity(entity) {
        this.ensureInitialized();
        try {
            const db = this.db;
            db.transaction(() => {
                try {
                    db.prepare(`
            UPDATE entities
            SET entity_type = ?, updated_at = strftime('%s', 'now')
            WHERE name = ?
          `).run(entity.entityType, entity.name);
                    db.prepare(`DELETE FROM observations WHERE entity_name = ?`).run(entity.name);
                    const insertObservation = db.prepare(`
            INSERT INTO observations (entity_name, content)
            VALUES (?, ?)
          `);
                    for (const observation of entity.observations) {
                        insertObservation.run(entity.name, observation);
                    }
                }
                catch (error) {
                    logError(error, {
                        component: 'KnowledgeGraphStore',
                        method: 'updateEntity',
                        operation: 'database transaction: update entity and replace observations',
                        data: { entityName: entity.name },
                    });
                    throw error;
                }
            }).immediate();
            logger.debug('Entity updated', { entityName: entity.name });
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'updateEntity',
                operation: 'updating entity',
                data: { entityName: entity.name, observationCount: entity.observations.length },
            });
            throw error;
        }
    }
    async deleteEntity(name) {
        this.ensureInitialized();
        try {
            this.db.prepare(`DELETE FROM entities WHERE name = ?`).run(name);
            logger.debug('Entity deleted', { entityName: name });
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'deleteEntity',
                operation: 'deleting entity from database',
                data: { entityName: name },
            });
            throw error;
        }
    }
    sanitizeSearchQuery(query) {
        return query
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '')
            .replace(/\]/g, '')
            .replace(/</g, '')
            .replace(/>/g, '')
            .replace(/{/g, '')
            .replace(/}/g, '')
            .trim();
    }
    async searchEntities(query, options = {}) {
        this.ensureInitialized();
        try {
            const db = this.db;
            const limit = options.limit || 100;
            const offset = options.offset || 0;
            const sanitizedQuery = this.sanitizeSearchQuery(query);
            let sql = `
        SELECT DISTINCT e.name, e.entity_type
        FROM entities e
        LEFT JOIN observations o ON e.name = o.entity_name
        WHERE (
          e.name LIKE ? ESCAPE '\\' OR
          o.content LIKE ? ESCAPE '\\'
        )
      `;
            const params = [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`];
            if (options.entityType) {
                sql += ` AND e.entity_type = ?`;
                params.push(options.entityType);
            }
            sql += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            const entityRows = db.prepare(sql).all(...params);
            const entities = [];
            for (const row of entityRows) {
                const entity = await this.getEntity(row.name);
                if (entity) {
                    entities.push(entity);
                }
            }
            return entities;
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'searchEntities',
                operation: 'searching entities in database',
                data: { query, options },
            });
            throw error;
        }
    }
    async createRelation(relation) {
        this.ensureInitialized();
        try {
            this.db.prepare(`
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
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'createRelation',
                operation: 'creating relation in database',
                data: { from: relation.from, to: relation.to, relationType: relation.relationType },
            });
            throw error;
        }
    }
    async getRelations(entityName) {
        this.ensureInitialized();
        try {
            const rows = this.db.prepare(`
        SELECT from_entity, to_entity, relation_type
        FROM relations
        WHERE from_entity = ? OR to_entity = ?
      `).all(entityName, entityName);
            return rows.map(row => ({
                from: row.from_entity,
                to: row.to_entity,
                relationType: row.relation_type,
            }));
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'getRelations',
                operation: 'fetching relations from database',
                data: { entityName },
            });
            throw error;
        }
    }
    async deleteRelation(from, to, relationType) {
        this.ensureInitialized();
        try {
            this.db.prepare(`
        DELETE FROM relations
        WHERE from_entity = ? AND to_entity = ? AND relation_type = ?
      `).run(from, to, relationType);
            logger.debug('Relation deleted', { from, to, type: relationType });
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'deleteRelation',
                operation: 'deleting relation from database',
                data: { from, to, relationType },
            });
            throw error;
        }
    }
    async getAllEntities() {
        this.ensureInitialized();
        try {
            const entityRows = this.db.prepare(`
        SELECT name, entity_type
        FROM entities
        ORDER BY name ASC
      `).all();
            const entities = [];
            for (const row of entityRows) {
                const entity = await this.getEntity(row.name);
                if (entity) {
                    entities.push(entity);
                }
            }
            return entities;
        }
        catch (error) {
            logError(error, {
                component: 'KnowledgeGraphStore',
                method: 'getAllEntities',
                operation: 'fetching all entities from database',
            });
            throw error;
        }
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            logger.info('Knowledge Graph storage closed');
        }
    }
    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('KnowledgeGraphStore not initialized. Call initialize() first.');
        }
    }
}
//# sourceMappingURL=KnowledgeGraphStore.js.map