import { SimpleDatabaseFactory } from '../../config/simple-config.js';
import { safeJsonParse } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { getHomeDir } from '../../utils/paths.js';
export class KnowledgeGraphSQLite {
    db;
    options;
    initialized;
    constructor(options = {}) {
        this.options = {
            dbPath: options.dbPath || path.join(getHomeDir(), '.claude', 'knowledge-graph.db'),
            verbose: options.verbose || false,
        };
        this.db = this.options.dbPath === ':memory:'
            ? SimpleDatabaseFactory.createTestDatabase()
            : SimpleDatabaseFactory.getInstance(this.options.dbPath);
        this.initialized = false;
    }
    async initialize() {
        if (this.initialized)
            return;
        this.createTables();
        this.createIndexes();
        this.initialized = true;
    }
    async close() {
        this.db.close();
        this.initialized = false;
    }
    createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        name TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT NOT NULL,
        observation TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_name) REFERENCES entities(name) ON DELETE CASCADE
      );
    `);
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
    createIndexes() {
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
    async createEntity(entity) {
        const entityType = entity.entityType || 'unknown';
        const observations = entity.observations || [];
        const now = new Date();
        const fullEntity = {
            ...entity,
            entityType,
            observations,
            createdAt: now,
            updatedAt: now,
        };
        const existing = await this.getEntity(fullEntity.name);
        if (existing) {
            logger.warn(`Entity "${fullEntity.name}" already exists, updating instead`);
            return await this.updateEntity(fullEntity.name, {
                entityType: fullEntity.entityType,
                observations: [...existing.observations, ...fullEntity.observations],
                metadata: fullEntity.metadata,
            }) || fullEntity;
        }
        const entityStmt = this.db.prepare(`
      INSERT INTO entities (name, entity_type, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        try {
            entityStmt.run(fullEntity.name, fullEntity.entityType, fullEntity.metadata ? JSON.stringify(fullEntity.metadata) : null, fullEntity.createdAt?.toISOString() ?? now.toISOString(), fullEntity.updatedAt?.toISOString() ?? now.toISOString());
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
                logger.warn(`Duplicate entity detected: ${fullEntity.name}`);
                const existing = await this.getEntity(fullEntity.name);
                return existing || fullEntity;
            }
            throw error;
        }
        if (fullEntity.observations.length > 0) {
            const obsStmt = this.db.prepare(`
        INSERT INTO observations (entity_name, observation, created_at)
        VALUES (?, ?, ?)
      `);
            const insertMany = this.db.transaction((observations) => {
                for (const obs of observations) {
                    obsStmt.run(fullEntity.name, obs, now.toISOString());
                }
            });
            insertMany(fullEntity.observations);
        }
        return fullEntity;
    }
    async getEntity(name) {
        const entityStmt = this.db.prepare('SELECT * FROM entities WHERE name = ?');
        const entityRow = entityStmt.get(name);
        if (!entityRow)
            return undefined;
        const obsStmt = this.db.prepare(`
      SELECT observation FROM observations
      WHERE entity_name = ?
      ORDER BY created_at ASC
    `);
        const observations = obsStmt.all(name).map((row) => row.observation);
        return this.rowToEntity(entityRow, observations);
    }
    async updateEntity(name, updates) {
        const entity = await this.getEntity(name);
        if (!entity)
            return undefined;
        const fields = [];
        const values = [];
        if (updates.entityType !== undefined) {
            fields.push('entity_type = ?');
            values.push(updates.entityType);
        }
        if (updates.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(updates.metadata));
        }
        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(name);
        if (fields.length > 1) {
            const stmt = this.db.prepare(`
        UPDATE entities SET ${fields.join(', ')} WHERE name = ?
      `);
            stmt.run(...values);
        }
        if (updates.observations !== undefined) {
            this.db.prepare('DELETE FROM observations WHERE entity_name = ?').run(name);
            if (updates.observations.length > 0) {
                const obsStmt = this.db.prepare(`
          INSERT INTO observations (entity_name, observation, created_at)
          VALUES (?, ?, ?)
        `);
                const insertMany = this.db.transaction((observations) => {
                    for (const obs of observations) {
                        obsStmt.run(name, obs, new Date().toISOString());
                    }
                });
                insertMany(updates.observations);
            }
        }
        return this.getEntity(name);
    }
    async deleteEntity(name) {
        const stmt = this.db.prepare('DELETE FROM entities WHERE name = ?');
        const result = stmt.run(name);
        return result.changes > 0;
    }
    async searchEntities(query, options = {}) {
        const lowerQuery = query.toLowerCase();
        let sql = `
      SELECT DISTINCT e.* FROM entities e
      LEFT JOIN observations o ON e.name = o.entity_name
      WHERE 1=1
    `;
        const params = [];
        sql += ` AND (
      LOWER(e.name) LIKE ? ESCAPE '\\' OR
      LOWER(e.entity_type) LIKE ? ESCAPE '\\' OR
      LOWER(o.observation) LIKE ? ESCAPE '\\'
    )`;
        const escapedQuery = lowerQuery.replace(/[%_\\]/g, '\\$&');
        const searchPattern = `%${escapedQuery}%`;
        params.push(searchPattern, searchPattern, searchPattern);
        if (options.entityType) {
            sql += ' AND e.entity_type = ?';
            params.push(options.entityType);
        }
        const offset = options.offset || 0;
        const limit = options.limit || 100;
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        const entities = [];
        for (const row of rows) {
            const obsStmt = this.db.prepare(`
        SELECT observation FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `);
            const observations = obsStmt.all(row.name).map((r) => r.observation);
            entities.push(this.rowToEntity(row, observations));
        }
        return entities;
    }
    async getAllEntities() {
        const stmt = this.db.prepare('SELECT * FROM entities ORDER BY created_at DESC');
        const rows = stmt.all();
        const entities = [];
        for (const row of rows) {
            const obsStmt = this.db.prepare(`
        SELECT observation FROM observations
        WHERE entity_name = ?
        ORDER BY created_at ASC
      `);
            const observations = obsStmt.all(row.name).map((r) => r.observation);
            entities.push(this.rowToEntity(row, observations));
        }
        return entities;
    }
    async createRelation(relation) {
        const now = new Date();
        const fullRelation = {
            ...relation,
            createdAt: now,
        };
        const stmt = this.db.prepare(`
      INSERT INTO relations (from_entity, to_entity, relation_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(fullRelation.from, fullRelation.to, fullRelation.relationType, fullRelation.metadata ? JSON.stringify(fullRelation.metadata) : null, fullRelation.createdAt?.toISOString() ?? now.toISOString());
        return fullRelation;
    }
    async getRelations(entityName) {
        const stmt = this.db.prepare(`
      SELECT * FROM relations
      WHERE from_entity = ?
      ORDER BY created_at ASC
    `);
        const rows = stmt.all(entityName);
        return rows.map((row) => this.rowToRelation(row));
    }
    async deleteRelation(from, to, relationType) {
        const stmt = this.db.prepare(`
      DELETE FROM relations
      WHERE from_entity = ? AND to_entity = ? AND relation_type = ?
    `);
        const result = stmt.run(from, to, relationType);
        return result.changes > 0;
    }
    async getConnectedEntities(entityName, maxDepth = 2) {
        const visited = new Set();
        const queue = [{ name: entityName, depth: 0 }];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.name) || current.depth > maxDepth)
                continue;
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
    async getStats() {
        const entitiesCount = this.db
            .prepare('SELECT COUNT(*) as count FROM entities')
            .get();
        const relationsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM relations')
            .get();
        const typeBreakdown = this.db
            .prepare(`
        SELECT entity_type, COUNT(*) as count
        FROM entities
        GROUP BY entity_type
      `)
            .all();
        const entityTypeBreakdown = {};
        for (const row of typeBreakdown) {
            entityTypeBreakdown[row.entity_type] = row.count;
        }
        return {
            totalEntities: entitiesCount.count,
            totalRelations: relationsCount.count,
            entityTypeBreakdown,
        };
    }
    rowToEntity(row, observations) {
        return {
            name: row.name,
            entityType: row.entity_type,
            observations,
            metadata: safeJsonParse(row.metadata, undefined),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
    rowToRelation(row) {
        return {
            from: row.from_entity,
            to: row.to_entity,
            relationType: row.relation_type,
            metadata: safeJsonParse(row.metadata, undefined),
            createdAt: new Date(row.created_at),
        };
    }
    getDb() {
        return this.db;
    }
    async optimize() {
        this.db.pragma('optimize');
        this.db.exec('VACUUM');
    }
    async getDatabaseStats() {
        const stats = await this.getStats();
        const obsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM observations')
            .get();
        return {
            total_entities: stats.totalEntities,
            total_observations: obsCount.count,
            total_relations: stats.totalRelations,
            avg_observations_per_entity: stats.totalEntities > 0 ? obsCount.count / stats.totalEntities : 0,
        };
    }
}
//# sourceMappingURL=KnowledgeGraphSQLite.js.map