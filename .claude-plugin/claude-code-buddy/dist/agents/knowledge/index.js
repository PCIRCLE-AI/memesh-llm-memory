import { KnowledgeGraphSQLite } from './KnowledgeGraphSQLite.js';
import { StateError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';
export class KnowledgeAgent {
    graph;
    isInitialized = false;
    dbPath;
    constructor(dbPath) {
        this.graph = new KnowledgeGraphSQLite({ dbPath });
        this.dbPath = dbPath;
        if (dbPath) {
            logger.info(`KnowledgeAgent initialized with dbPath: ${dbPath}`);
        }
    }
    async initialize() {
        if (this.isInitialized) {
            logger.info('Knowledge Agent already initialized');
            return;
        }
        logger.info('Initializing Knowledge Agent...');
        await this.graph.initialize();
        this.isInitialized = true;
        logger.info('Knowledge Agent initialized successfully');
        await this.printStats();
    }
    async createEntities(entities) {
        this.ensureInitialized();
        const created = [];
        for (const entity of entities) {
            try {
                const result = await this.graph.createEntity(entity);
                created.push(result);
            }
            catch (error) {
                logger.warn(`Failed to create entity "${entity.name}":`, error);
            }
        }
        logger.info(`Created ${created.length} entities`);
        return created;
    }
    async addObservations(entityName, observations) {
        this.ensureInitialized();
        const entity = await this.graph.getEntity(entityName);
        if (!entity) {
            logger.warn(`Entity not found: ${entityName}`);
            return undefined;
        }
        const updated = await this.graph.updateEntity(entityName, {
            observations: [...entity.observations, ...observations],
        });
        logger.info(`Added ${observations.length} observations to ${entityName}`);
        return updated;
    }
    async searchNodes(query, options = {}) {
        this.ensureInitialized();
        const results = await this.graph.searchEntities(query, options);
        logger.info(`Found ${results.length} matching entities`);
        return results;
    }
    async openNodes(names) {
        this.ensureInitialized();
        const entities = [];
        for (const name of names) {
            const entity = await this.graph.getEntity(name);
            if (entity) {
                entities.push(entity);
            }
            else {
                logger.warn(`Entity not found: ${name}`);
            }
        }
        return entities;
    }
    async createRelations(relations) {
        this.ensureInitialized();
        const created = [];
        for (const relation of relations) {
            const fromEntity = await this.graph.getEntity(relation.from);
            const toEntity = await this.graph.getEntity(relation.to);
            if (!fromEntity || !toEntity) {
                logger.warn(`Cannot create relation: entity not found (from: ${relation.from}, to: ${relation.to})`);
                continue;
            }
            const result = await this.graph.createRelation(relation);
            created.push(result);
        }
        logger.info(`Created ${created.length} relations`);
        return created;
    }
    async deleteEntities(names) {
        this.ensureInitialized();
        const deleted = [];
        const notFound = [];
        for (const name of names) {
            const success = await this.graph.deleteEntity(name);
            if (success) {
                deleted.push(name);
            }
            else {
                notFound.push(name);
            }
        }
        logger.info(`Deleted ${deleted.length} entities`);
        if (notFound.length > 0) {
            logger.warn(`Not found: ${notFound.join(', ')}`);
        }
        return { deleted, notFound };
    }
    async readGraph() {
        this.ensureInitialized();
        const entities = await this.graph.getAllEntities();
        const stats = await this.graph.getStats();
        return { entities, stats };
    }
    async getConnectedEntities(entityName, maxDepth = 2) {
        this.ensureInitialized();
        const connected = await this.graph.getConnectedEntities(entityName, maxDepth);
        return Array.from(connected);
    }
    async printStats() {
        const stats = await this.graph.getStats();
        logger.info('Knowledge Graph Statistics:');
        logger.info(`  Total Entities: ${stats.totalEntities}`);
        logger.info(`  Total Relations: ${stats.totalRelations}`);
        logger.info(`  Entity Types:`);
        for (const [type, count] of Object.entries(stats.entityTypeBreakdown)) {
            logger.info(`    ${type}: ${count}`);
        }
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new StateError('Knowledge Agent not initialized. Call initialize() first.', {
                component: 'KnowledgeAgent',
                operation: 'ensureInitialized',
                dbPath: this.dbPath,
            });
        }
    }
    async close() {
        await this.graph.close();
        this.isInitialized = false;
        logger.info('Knowledge Agent closed');
    }
    async findSimilar(description, type) {
        this.ensureInitialized();
        const allEntities = await this.graph.getAllEntities();
        const filtered = type
            ? allEntities.filter(e => e.entityType === type)
            : allEntities;
        const descWords = new Set(description.toLowerCase().split(/\s+/));
        const results = [];
        for (const entity of filtered) {
            const entityText = [
                entity.name,
                ...entity.observations
            ].join(' ').toLowerCase();
            const entityWords = new Set(entityText.split(/\s+/));
            const commonWords = new Set([...descWords].filter(w => entityWords.has(w)));
            const similarity = commonWords.size / Math.max(descWords.size, entityWords.size);
            if (similarity > 0.1) {
                results.push({
                    name: entity.name,
                    similarity,
                    metadata: entity.metadata
                });
            }
        }
        return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
    }
    async getDecisions() {
        this.ensureInitialized();
        const decisions = await this.searchNodes('', { entityType: 'decision' });
        return decisions.map(entity => ({
            id: entity.name,
            description: entity.name,
            outcome: entity.observations.find(o => o.includes('outcome:'))?.replace('outcome:', '').trim() || '',
            timestamp: entity.createdAt ?? new Date(0)
        }));
    }
    async getLessonsLearned() {
        this.ensureInitialized();
        const lessons = await this.searchNodes('', { entityType: 'lesson_learned' });
        return lessons.map(entity => ({
            id: entity.name,
            lesson: entity.name,
            context: entity.observations.join(' | '),
            timestamp: entity.createdAt ?? new Date(0)
        }));
    }
    async getStats() {
        this.ensureInitialized();
        const graphStats = await this.graph.getStats();
        return {
            totalTasks: graphStats.entityTypeBreakdown['task'] || 0,
            totalDecisions: graphStats.entityTypeBreakdown['decision'] || 0,
            totalLessons: graphStats.entityTypeBreakdown['lesson_learned'] || 0
        };
    }
    async recordDecision(decision) {
        logger.warn('recordDecision is a stub method - use createEntities instead');
    }
    async recordFeature(feature) {
        logger.warn('recordFeature is a stub method - use createEntities instead');
    }
    async recordBugFix(bugFix) {
        logger.warn('recordBugFix is a stub method - use createEntities instead');
    }
    async recordBestPractice(practice) {
        logger.warn('recordBestPractice is a stub method - use createEntities instead');
    }
}
let knowledgeAgentInstance = null;
export function getKnowledgeAgent() {
    if (!knowledgeAgentInstance) {
        knowledgeAgentInstance = new KnowledgeAgent();
    }
    return knowledgeAgentInstance;
}
//# sourceMappingURL=index.js.map