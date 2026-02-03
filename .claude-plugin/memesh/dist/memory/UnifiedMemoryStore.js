import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { ValidationError, OperationError } from '../errors/index.js';
const MEMORY_TYPE_MAPPING = {
    mistake: 'lesson_learned',
    conversation: 'session_snapshot',
    knowledge: 'best_practice',
    decision: 'decision',
    experience: 'learning_experience',
    'prevention-rule': 'prevention_rule',
    'user-preference': 'user_preference',
};
const ENTITY_TYPE_MAPPING = {
    lesson_learned: 'mistake',
    session_snapshot: 'conversation',
    best_practice: 'knowledge',
    decision: 'decision',
    learning_experience: 'experience',
    prevention_rule: 'prevention-rule',
    user_preference: 'user-preference',
};
const MEMORY_ID_PREFIX = 'unified-memory-';
export class UnifiedMemoryStore {
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
    }
    static async create(dbPath) {
        try {
            const knowledgeGraph = await KnowledgeGraph.create(dbPath);
            const instance = new UnifiedMemoryStore(knowledgeGraph);
            logger.info(`[UnifiedMemoryStore] Initialized with database at: ${dbPath || 'default'}`);
            return instance;
        }
        catch (error) {
            logger.error(`[UnifiedMemoryStore] Initialization failed: ${error}`);
            throw new OperationError(`Failed to create UnifiedMemoryStore: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'create',
                dbPath,
                cause: error,
            });
        }
    }
    async store(memory, context) {
        try {
            if (!memory.content || memory.content.trim() === '') {
                throw new ValidationError('Memory content cannot be empty', {
                    component: 'UnifiedMemoryStore',
                    method: 'store',
                    memoryType: memory.type,
                });
            }
            if (!memory.type) {
                throw new ValidationError('Memory type is required', {
                    component: 'UnifiedMemoryStore',
                    method: 'store',
                });
            }
            const id = memory.id || `${MEMORY_ID_PREFIX}${uuidv4()}`;
            const timestamp = memory.timestamp || new Date();
            let tagsToUse = [...memory.tags];
            const hasScope = tagsToUse.some(tag => tag.startsWith('scope:'));
            if (!hasScope) {
                const scopeTag = context?.projectPath ? 'scope:project' : 'scope:global';
                tagsToUse.push(scopeTag);
            }
            if (context) {
                logger.info(`[UnifiedMemoryStore] Storing memory with tags: ${tagsToUse.join(', ')}`);
            }
            const entityType = MEMORY_TYPE_MAPPING[memory.type];
            if (!entityType) {
                throw new ValidationError(`Invalid memory type: ${memory.type}`, {
                    component: 'UnifiedMemoryStore',
                    method: 'store',
                    memoryType: memory.type,
                    validTypes: Object.keys(MEMORY_TYPE_MAPPING),
                });
            }
            const observations = [
                `content: ${memory.content}`,
                `importance: ${memory.importance}`,
                `timestamp: ${timestamp.toISOString()}`,
            ];
            if (memory.context) {
                observations.push(`context: ${memory.context}`);
            }
            if (memory.metadata) {
                try {
                    observations.push(`metadata: ${JSON.stringify(memory.metadata)}`);
                }
                catch (error) {
                    logger.warn(`[UnifiedMemoryStore] Failed to serialize metadata: ${error}`);
                }
            }
            const entity = {
                name: id,
                entityType,
                observations,
                tags: tagsToUse,
                metadata: {
                    memoryType: memory.type,
                    importance: memory.importance,
                    timestamp: timestamp.toISOString(),
                    ...(memory.metadata || {}),
                },
            };
            try {
                this.knowledgeGraph.createEntity(entity);
            }
            catch (error) {
                logger.error(`[UnifiedMemoryStore] Failed to create entity: ${error}`);
                throw new OperationError(`Failed to store memory: ${error instanceof Error ? error.message : String(error)}`, {
                    component: 'UnifiedMemoryStore',
                    method: 'store',
                    operation: 'createEntity',
                    memoryId: id,
                    memoryType: memory.type,
                    cause: error,
                });
            }
            if (memory.relations && memory.relations.length > 0) {
                for (const relatedId of memory.relations) {
                    try {
                        this.knowledgeGraph.createRelation({
                            from: id,
                            to: relatedId,
                            relationType: 'depends_on',
                            metadata: { createdAt: new Date().toISOString() },
                        });
                    }
                    catch (error) {
                        logger.warn(`Failed to create relation from ${id} to ${relatedId}: ${error}`);
                    }
                }
            }
            logger.info(`[UnifiedMemoryStore] Stored memory: ${id} (type: ${memory.type})`);
            return id;
        }
        catch (error) {
            if (error instanceof ValidationError || error instanceof OperationError) {
                throw error;
            }
            logger.error(`[UnifiedMemoryStore] Unexpected error in store: ${error}`);
            throw new OperationError(`Unexpected error storing memory: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'store',
                memoryType: memory.type,
                cause: error,
            });
        }
    }
    async get(id) {
        try {
            if (!id || id.trim() === '') {
                throw new ValidationError('Memory ID cannot be empty', {
                    component: 'UnifiedMemoryStore',
                    method: 'get',
                });
            }
            const entity = this.knowledgeGraph.getEntity(id);
            if (!entity) {
                return null;
            }
            return this.entityToMemory(entity);
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error(`[UnifiedMemoryStore] Error retrieving memory: ${error}`);
            throw new OperationError(`Failed to get memory: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'get',
                memoryId: id,
                cause: error,
            });
        }
    }
    async search(query, options) {
        try {
            return this.traditionalSearch(query, options);
        }
        catch (error) {
            logger.error(`[UnifiedMemoryStore] Search failed: ${error}`);
            throw new OperationError(`Memory search failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'search',
                query,
                options,
                cause: error,
            });
        }
    }
    async traditionalSearch(query, options) {
        try {
            const searchQuery = {};
            if (options?.types && options.types.length === 1) {
                searchQuery.entityType = MEMORY_TYPE_MAPPING[options.types[0]];
            }
            if (options?.tags && options.tags.length === 1) {
                searchQuery.tag = options.tags[0];
            }
            if (options?.limit) {
                searchQuery.limit = options.limit;
            }
            let entities;
            try {
                entities = this.knowledgeGraph.searchEntities(searchQuery);
            }
            catch (error) {
                logger.error(`[UnifiedMemoryStore] Entity search failed: ${error}`);
                throw new OperationError(`Entity search failed: ${error instanceof Error ? error.message : String(error)}`, {
                    component: 'UnifiedMemoryStore',
                    method: 'traditionalSearch',
                    searchQuery,
                    cause: error,
                });
            }
            entities = entities.filter((e) => e.name.startsWith(MEMORY_ID_PREFIX));
            if (options?.types && options.types.length > 1) {
                const entityTypes = options.types.map((t) => MEMORY_TYPE_MAPPING[t]);
                entities = entities.filter((e) => entityTypes.includes(e.entityType));
            }
            if (options?.tags && options.tags.length > 1) {
                entities = entities.filter((e) => e.tags && options.tags.some((t) => e.tags.includes(t)));
            }
            let memories = entities.map((e) => this.entityToMemory(e)).filter((m) => m !== null);
            if (query && query.trim()) {
                const lowerQuery = query.toLowerCase();
                memories = memories.filter((m) => m.content.toLowerCase().includes(lowerQuery) || m.context?.toLowerCase().includes(lowerQuery));
            }
            memories = this.applySearchFilters(memories, options);
            return memories;
        }
        catch (error) {
            if (error instanceof OperationError) {
                throw error;
            }
            logger.error(`[UnifiedMemoryStore] Traditional search failed: ${error}`);
            throw new OperationError(`Traditional search failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'traditionalSearch',
                query,
                options,
                cause: error,
            });
        }
    }
    applySearchFilters(memories, options) {
        let filtered = memories;
        if (options?.timeRange && options.timeRange !== 'all') {
            const now = new Date();
            let cutoffDate;
            switch (options.timeRange) {
                case 'last-24h':
                    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case 'last-7-days':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'last-30-days':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    cutoffDate = new Date(0);
            }
            filtered = filtered.filter((m) => m.timestamp >= cutoffDate);
        }
        if (options?.minImportance !== undefined) {
            filtered = filtered.filter((m) => m.importance >= options.minImportance);
        }
        if (options?.types && options.types.length > 0) {
            filtered = filtered.filter((m) => options.types.includes(m.type));
        }
        if (options?.limit && filtered.length > options.limit) {
            filtered = filtered.slice(0, options.limit);
        }
        return filtered;
    }
    async searchByType(type, options) {
        return this.search('', { ...options, types: [type] });
    }
    async searchByTags(tags, options) {
        return this.search('', { ...options, tags });
    }
    async update(id, updates) {
        try {
            if (!id || id.trim() === '') {
                throw new ValidationError('Memory ID cannot be empty', {
                    component: 'UnifiedMemoryStore',
                    method: 'update',
                });
            }
            if (!updates || Object.keys(updates).length === 0) {
                throw new ValidationError('Updates cannot be empty', {
                    component: 'UnifiedMemoryStore',
                    method: 'update',
                    memoryId: id,
                });
            }
            const existing = await this.get(id);
            if (!existing) {
                return false;
            }
            const updatedMemory = {
                ...existing,
                ...updates,
                id,
                timestamp: existing.timestamp,
            };
            await this.store(updatedMemory);
            logger.info(`[UnifiedMemoryStore] Updated memory: ${id}`);
            return true;
        }
        catch (error) {
            if (error instanceof ValidationError || error instanceof OperationError) {
                throw error;
            }
            logger.error(`[UnifiedMemoryStore] Update failed: ${error}`);
            throw new OperationError(`Failed to update memory: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'update',
                memoryId: id,
                cause: error,
            });
        }
    }
    async delete(id) {
        try {
            if (!id || id.trim() === '') {
                throw new ValidationError('Memory ID cannot be empty', {
                    component: 'UnifiedMemoryStore',
                    method: 'delete',
                });
            }
            const deleted = this.knowledgeGraph.deleteEntity(id);
            if (deleted) {
                logger.info(`[UnifiedMemoryStore] Deleted memory: ${id}`);
            }
            return deleted;
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error(`[UnifiedMemoryStore] Delete failed: ${error}`);
            throw new OperationError(`Failed to delete memory: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'delete',
                memoryId: id,
                cause: error,
            });
        }
    }
    close() {
        try {
            this.knowledgeGraph.close();
            logger.info('[UnifiedMemoryStore] Database connection closed');
        }
        catch (error) {
            logger.error(`[UnifiedMemoryStore] Error closing database: ${error}`);
            throw new OperationError(`Failed to close memory store: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'UnifiedMemoryStore',
                method: 'close',
                cause: error,
            });
        }
    }
    entityToMemory(entity) {
        let content = '';
        let context;
        let importance = 0.5;
        let timestamp = entity.createdAt || new Date();
        let metadata;
        for (const obs of entity.observations) {
            if (obs.startsWith('content: ')) {
                content = obs.substring('content: '.length);
            }
            else if (obs.startsWith('context: ')) {
                context = obs.substring('context: '.length);
            }
            else if (obs.startsWith('importance: ')) {
                importance = parseFloat(obs.substring('importance: '.length)) || 0.5;
            }
            else if (obs.startsWith('timestamp: ')) {
                timestamp = new Date(obs.substring('timestamp: '.length));
            }
            else if (obs.startsWith('metadata: ')) {
                try {
                    metadata = JSON.parse(obs.substring('metadata: '.length));
                }
                catch {
                }
            }
        }
        if (entity.metadata?.importance !== undefined) {
            importance = entity.metadata.importance;
        }
        const memoryType = ENTITY_TYPE_MAPPING[entity.entityType] || 'knowledge';
        return {
            id: entity.name,
            type: memoryType,
            content,
            context,
            tags: entity.tags || [],
            importance,
            timestamp,
            metadata,
        };
    }
}
//# sourceMappingURL=UnifiedMemoryStore.js.map