import { join } from 'path';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { NotFoundError } from '../errors/index.js';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import { logger } from '../utils/logger.js';
import { QueryCache } from '../db/QueryCache.js';
export class KnowledgeGraph {
    db;
    dbPath;
    queryCache;
    constructor(dbPath, db) {
        this.dbPath = dbPath;
        this.db = db;
        this.queryCache = new QueryCache({
            maxSize: 1000,
            defaultTTL: 5 * 60 * 1000,
            debug: false,
        });
    }
    static async create(dbPath) {
        const resolvedPath = dbPath || join(process.cwd(), 'data', 'knowledge-graph.db');
        const dataDir = join(process.cwd(), 'data');
        try {
            await fsPromises.access(dataDir);
        }
        catch {
            await fsPromises.mkdir(dataDir, { recursive: true });
        }
        const db = SimpleDatabaseFactory.getInstance(resolvedPath);
        const instance = new KnowledgeGraph(resolvedPath, db);
        instance.initialize();
        logger.info(`[KnowledgeGraph] Initialized at: ${resolvedPath}`);
        return instance;
    }
    static createSync(dbPath) {
        const resolvedPath = dbPath || join(process.cwd(), 'data', 'knowledge-graph.db');
        const dataDir = join(process.cwd(), 'data');
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }
        const db = SimpleDatabaseFactory.getInstance(resolvedPath);
        const instance = new KnowledgeGraph(resolvedPath, db);
        instance.initialize();
        logger.info(`[KnowledgeGraph] Initialized at: ${resolvedPath}`);
        return instance;
    }
    initialize() {
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
    escapeLikePattern(pattern) {
        return pattern
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[');
    }
    createEntity(entity) {
        const stmt = this.db.prepare(`
      INSERT INTO entities (name, type, metadata)
      VALUES (?, ?, json(?))
      ON CONFLICT(name) DO UPDATE SET
        type = excluded.type,
        metadata = excluded.metadata
    `);
        const result = stmt.run(entity.name, entity.type, JSON.stringify(entity.metadata || {}));
        const entityId = result.lastInsertRowid;
        const actualEntity = this.db
            .prepare('SELECT id FROM entities WHERE name = ?')
            .get(entity.name);
        const actualId = actualEntity.id;
        this.db.prepare('DELETE FROM observations WHERE entity_id = ?').run(actualId);
        this.db.prepare('DELETE FROM tags WHERE entity_id = ?').run(actualId);
        if (entity.observations && entity.observations.length > 0) {
            const obsStmt = this.db.prepare(`
        INSERT INTO observations (entity_id, content)
        VALUES (?, ?)
      `);
            for (const obs of entity.observations) {
                obsStmt.run(actualId, obs);
            }
        }
        if (entity.tags && entity.tags.length > 0) {
            const tagStmt = this.db.prepare(`
        INSERT INTO tags (entity_id, tag)
        VALUES (?, ?)
      `);
            for (const tag of entity.tags) {
                tagStmt.run(actualId, tag);
            }
        }
        this.queryCache.invalidatePattern(/^entities:/);
        logger.info(`[KG] Created entity: ${entity.name} (type: ${entity.type})`);
        return actualId;
    }
    createRelation(relation) {
        const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
        const fromEntity = getEntityId.get(relation.from);
        const toEntity = getEntityId.get(relation.to);
        if (!fromEntity) {
            throw new NotFoundError(`Entity not found: ${relation.from}`, 'entity', relation.from, { relationContext: 'from entity in relation creation' });
        }
        if (!toEntity) {
            throw new NotFoundError(`Entity not found: ${relation.to}`, 'entity', relation.to, { relationContext: 'to entity in relation creation' });
        }
        const stmt = this.db.prepare(`
      INSERT INTO relations (from_entity_id, to_entity_id, relation_type, metadata)
      VALUES (?, ?, ?, json(?))
      ON CONFLICT(from_entity_id, to_entity_id, relation_type) DO UPDATE SET
        metadata = excluded.metadata
    `);
        stmt.run(fromEntity.id, toEntity.id, relation.relationType, JSON.stringify(relation.metadata || {}));
        this.queryCache.invalidatePattern(/^relations:/);
        this.queryCache.invalidatePattern(/^trace:/);
        logger.info(`[KG] Created relation: ${relation.from} -[${relation.relationType}]-> ${relation.to}`);
    }
    searchEntities(query) {
        const cacheKey = `entities:${JSON.stringify(query)}`;
        const cached = this.queryCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        let sql = `
      SELECT e.*,
        GROUP_CONCAT(o.content, '|||') as observations,
        GROUP_CONCAT(t.tag, ',') as tags
      FROM entities e
      LEFT JOIN observations o ON e.id = o.entity_id
      LEFT JOIN tags t ON e.id = t.entity_id
      WHERE 1=1
    `;
        const params = [];
        if (query.type) {
            sql += ' AND e.type = ?';
            params.push(query.type);
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
        const rows = stmt.all(...params);
        const entities = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            let tags = [];
            if (r.tags) {
                const tagParts = r.tags.split(',');
                const filteredTags = [];
                for (let j = 0; j < tagParts.length; j++) {
                    const tag = tagParts[j];
                    if (tag)
                        filteredTags.push(tag);
                }
                tags = filteredTags;
            }
            entities[i] = {
                id: r.id,
                name: r.name,
                type: r.type,
                observations: r.observations ? r.observations.split('|||') : [],
                tags,
                metadata: r.metadata ? JSON.parse(r.metadata) : {},
                createdAt: new Date(r.created_at)
            };
        }
        this.queryCache.set(cacheKey, entities);
        return entities;
    }
    getEntity(name) {
        const results = this.searchEntities({ namePattern: name, limit: 1 });
        return results.length > 0 ? results[0] : null;
    }
    traceRelations(entityName, depth = 2) {
        const cacheKey = `trace:${entityName}:${depth}`;
        const cached = this.queryCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
        const entity = getEntityId.get(entityName);
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
    `).all(entity.id, entity.id);
        const relations = new Array(relationRows.length);
        for (let i = 0; i < relationRows.length; i++) {
            const r = relationRows[i];
            relations[i] = {
                from: r.from_name,
                to: r.to_name,
                relationType: r.relation_type,
                metadata: r.metadata ? JSON.parse(r.metadata) : {}
            };
        }
        const result = {
            entity: entityName,
            relations,
            depth
        };
        this.queryCache.set(cacheKey, result);
        return result;
    }
    getStats() {
        const cacheKey = 'stats:all';
        const cached = this.queryCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const totalEntities = this.db
            .prepare('SELECT COUNT(*) as count FROM entities')
            .get();
        const totalRelations = this.db
            .prepare('SELECT COUNT(*) as count FROM relations')
            .get();
        const byType = this.db
            .prepare('SELECT type, COUNT(*) as count FROM entities GROUP BY type')
            .all();
        const entitiesByType = {};
        byType.forEach(row => {
            entitiesByType[row.type] = row.count;
        });
        const result = {
            totalEntities: totalEntities.count,
            totalRelations: totalRelations.count,
            entitiesByType
        };
        this.queryCache.set(cacheKey, result, 60 * 1000);
        return result;
    }
    deleteEntity(name) {
        const getEntityId = this.db.prepare('SELECT id FROM entities WHERE name = ?');
        const entity = getEntityId.get(name);
        if (!entity) {
            return false;
        }
        const stmt = this.db.prepare('DELETE FROM entities WHERE name = ?');
        const result = stmt.run(name);
        this.queryCache.invalidatePattern(/^entities:/);
        this.queryCache.invalidatePattern(/^relations:/);
        this.queryCache.invalidatePattern(/^trace:/);
        this.queryCache.invalidatePattern(/^stats:/);
        logger.info(`[KG] Deleted entity: ${name}`);
        return result.changes > 0;
    }
    close() {
        this.queryCache.destroy();
        this.db.close();
        logger.info('[KG] Database connection and cache closed');
    }
    getCacheStats() {
        return this.queryCache.getStats();
    }
    clearCache() {
        this.queryCache.clear();
        logger.info('[KG] Cache cleared manually');
    }
}
//# sourceMappingURL=index.js.map