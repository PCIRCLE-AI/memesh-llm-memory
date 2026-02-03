import { KnowledgeGraphStore } from './storage/KnowledgeGraphStore.js';
import { logger } from '../../utils/logger.js';
export class KnowledgeGraph {
    store;
    initialized = false;
    constructor(dbPath) {
        this.store = new KnowledgeGraphStore(dbPath);
    }
    async initialize() {
        if (this.initialized)
            return;
        await this.store.initialize();
        this.initialized = true;
        logger.info('Knowledge Graph initialized with persistent storage');
    }
    async createEntity(entity) {
        this.ensureInitialized();
        await this.store.createEntity(entity);
    }
    async getEntity(name) {
        this.ensureInitialized();
        return await this.store.getEntity(name);
    }
    async updateEntity(entity) {
        this.ensureInitialized();
        await this.store.updateEntity(entity);
    }
    async deleteEntity(name) {
        this.ensureInitialized();
        await this.store.deleteEntity(name);
    }
    async searchEntities(query, options = {}) {
        this.ensureInitialized();
        return await this.store.searchEntities(query, options);
    }
    async getAllEntities() {
        this.ensureInitialized();
        return await this.store.getAllEntities();
    }
    async createRelation(relation) {
        this.ensureInitialized();
        await this.store.createRelation(relation);
    }
    async getRelations(entityName) {
        this.ensureInitialized();
        return await this.store.getRelations(entityName);
    }
    async deleteRelation(from, to, relationType) {
        this.ensureInitialized();
        await this.store.deleteRelation(from, to, relationType);
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
        this.ensureInitialized();
        const entities = await this.store.getAllEntities();
        const entityTypeBreakdown = {};
        for (const entity of entities) {
            entityTypeBreakdown[entity.entityType] = (entityTypeBreakdown[entity.entityType] || 0) + 1;
        }
        let totalRelations = 0;
        const countedRelations = new Set();
        for (const entity of entities) {
            const relations = await this.store.getRelations(entity.name);
            for (const rel of relations) {
                const relKey = `${rel.from}:${rel.to}:${rel.relationType}`;
                if (!countedRelations.has(relKey)) {
                    countedRelations.add(relKey);
                    totalRelations++;
                }
            }
        }
        return {
            totalEntities: entities.length,
            totalRelations,
            entityTypeBreakdown,
        };
    }
    async close() {
        await this.store.close();
        this.initialized = false;
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Knowledge Graph not initialized. Call initialize() first.');
        }
    }
}
//# sourceMappingURL=KnowledgeGraph.js.map