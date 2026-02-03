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
        this.ensureInitialized();
        const observations = [
            `reason: ${decision.reason}`,
            `outcome: ${decision.outcome}`,
            ...decision.alternatives.map(alt => `alternative: ${alt}`),
            ...decision.tradeoffs.map(t => `tradeoff: ${t}`),
            ...decision.tags.map(tag => `tag: ${tag}`),
        ];
        const [entity] = await this.createEntities([{
                name: decision.name,
                entityType: 'decision',
                observations,
                metadata: {
                    alternatives: decision.alternatives,
                    tradeoffs: decision.tradeoffs,
                    tags: decision.tags,
                    recordedAt: new Date().toISOString(),
                },
            }]);
        logger.info(`Recorded decision: ${decision.name}`);
        return entity;
    }
    async recordFeature(feature) {
        this.ensureInitialized();
        const observations = [
            `description: ${feature.description}`,
            `implementation: ${feature.implementation}`,
            ...(feature.challenges || []).map(c => `challenge: ${c}`),
            ...feature.tags.map(tag => `tag: ${tag}`),
        ];
        const [entity] = await this.createEntities([{
                name: feature.name,
                entityType: 'feature',
                observations,
                metadata: {
                    challenges: feature.challenges || [],
                    tags: feature.tags,
                    recordedAt: new Date().toISOString(),
                },
            }]);
        logger.info(`Recorded feature: ${feature.name}`);
        return entity;
    }
    async recordBugFix(bugFix) {
        this.ensureInitialized();
        const observations = [
            `root_cause: ${bugFix.rootCause}`,
            `solution: ${bugFix.solution}`,
            `prevention: ${bugFix.prevention}`,
            ...bugFix.tags.map(tag => `tag: ${tag}`),
        ];
        const [entity] = await this.createEntities([{
                name: bugFix.name,
                entityType: 'bug_fix',
                observations,
                metadata: {
                    rootCause: bugFix.rootCause,
                    solution: bugFix.solution,
                    prevention: bugFix.prevention,
                    tags: bugFix.tags,
                    recordedAt: new Date().toISOString(),
                },
            }]);
        logger.info(`Recorded bug fix: ${bugFix.name}`);
        return entity;
    }
    async recordBestPractice(practice) {
        this.ensureInitialized();
        const observations = [
            `description: ${practice.description}`,
            `why: ${practice.why}`,
            ...(practice.example ? [`example: ${practice.example}`] : []),
            ...(practice.tags || []).map(tag => `tag: ${tag}`),
        ];
        const [entity] = await this.createEntities([{
                name: practice.name,
                entityType: 'best_practice',
                observations,
                metadata: {
                    why: practice.why,
                    example: practice.example,
                    tags: practice.tags || [],
                    recordedAt: new Date().toISOString(),
                },
            }]);
        logger.info(`Recorded best practice: ${practice.name}`);
        return entity;
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