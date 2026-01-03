import { LocalIndex } from 'vectra';
import path from 'path';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { StateError, ValidationError, OperationError } from '../../errors/index.js';
export class VectorStore {
    index = null;
    config;
    isInitialized = false;
    dataPath;
    constructor(config) {
        this.config = {
            embeddingModel: config?.embeddingModel || appConfig.openai.embeddings.model,
            embeddingDimension: config?.embeddingDimension || 1536,
            maxBatchSize: config?.maxBatchSize || 100,
            cacheEnabled: config?.cacheEnabled ?? true,
        };
        this.dataPath = path.join(process.cwd(), 'data', 'vectorstore');
    }
    async initialize() {
        if (this.isInitialized) {
            logger.info('VectorStore already initialized');
            return;
        }
        try {
            this.index = new LocalIndex(this.dataPath);
            if (!(await this.index.isIndexCreated())) {
                await this.index.createIndex({ version: 1 });
                logger.info(`Created new Vectra index at ${this.dataPath}`);
            }
            else {
                logger.info(`Loaded existing Vectra index from ${this.dataPath}`);
            }
            this.isInitialized = true;
            logger.info('VectorStore initialized successfully (local file storage)');
        }
        catch (error) {
            logger.error('Failed to initialize VectorStore', { error });
            throw new OperationError(`VectorStore initialization failed: ${error}`, {
                operation: 'initialize',
                dataPath: this.dataPath,
                embeddingModel: this.config.embeddingModel,
                originalError: error instanceof Error ? error.message : String(error),
            });
        }
    }
    ensureInitialized() {
        if (!this.isInitialized || !this.index) {
            throw new StateError('VectorStore not initialized. Call initialize() first.', {
                component: 'VectorStore',
                operation: 'ensureInitialized',
                isInitialized: this.isInitialized,
                hasIndex: this.index !== null,
            });
        }
    }
    async addDocument(doc) {
        this.ensureInitialized();
        if (!doc.embedding) {
            throw new ValidationError('Document must have embedding before adding to vector store', {
                hasContent: !!doc.content,
                hasMetadata: !!doc.metadata,
                hasEmbedding: false,
                expectedEmbeddingDimension: this.config.embeddingDimension,
            });
        }
        const id = doc.id || this.generateId();
        await this.index.insertItem({
            id,
            vector: doc.embedding,
            metadata: {
                content: doc.content,
                ...this.sanitizeMetadata(doc.metadata),
            },
        });
    }
    async addDocuments(docs) {
        this.ensureInitialized();
        if (docs.length === 0) {
            return;
        }
        const missingEmbeddings = docs.filter((doc) => !doc.embedding);
        if (missingEmbeddings.length > 0) {
            throw new ValidationError(`${missingEmbeddings.length} documents missing embeddings`, {
                totalDocuments: docs.length,
                missingEmbeddingsCount: missingEmbeddings.length,
                validDocumentsCount: docs.length - missingEmbeddings.length,
                expectedEmbeddingDimension: this.config.embeddingDimension,
            });
        }
        const batches = this.createBatches(docs, this.config.maxBatchSize);
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} docs)`);
            for (const doc of batch) {
                const id = doc.id || this.generateId();
                await this.index.insertItem({
                    id,
                    vector: doc.embedding,
                    metadata: {
                        content: doc.content,
                        ...this.sanitizeMetadata(doc.metadata),
                    },
                });
            }
        }
        logger.info(`Successfully added ${docs.length} documents`);
    }
    async search(_options) {
        this.ensureInitialized();
        throw new OperationError('Use searchWithEmbedding() instead. This method is deprecated - generate query embedding first.', {
            operation: 'search',
            component: 'VectorStore',
            deprecatedMethod: 'search',
            recommendedMethod: 'searchWithEmbedding',
        });
    }
    async searchWithEmbedding(queryEmbedding, options = {}) {
        this.ensureInitialized();
        const topK = options.topK || 5;
        const scoreThreshold = options.scoreThreshold || 0;
        const results = await this.index.queryItems(queryEmbedding, "", topK);
        const searchResults = results
            .filter((result) => result.score >= scoreThreshold)
            .map((result) => {
            const metadata = result.item.metadata || {};
            const content = metadata.content || '';
            const { content: _, ...restMetadata } = metadata;
            return {
                id: result.item.id,
                content,
                metadata: restMetadata,
                score: result.score,
                distance: 1 - result.score,
            };
        });
        return searchResults;
    }
    async count() {
        this.ensureInitialized();
        return await this.index.listItemsByMetadata({}).then((items) => items.length);
    }
    async delete(ids) {
        this.ensureInitialized();
        for (const id of ids) {
            await this.index.deleteItem(id);
        }
    }
    async clear() {
        this.ensureInitialized();
        const allItems = await this.index.listItems();
        for (const item of allItems) {
            await this.index.deleteItem(item.id);
        }
        logger.info(`VectorStore cleared`);
    }
    async getCollectionInfo() {
        this.ensureInitialized();
        const count = await this.count();
        return {
            name: 'local_vectorstore',
            count,
            metadata: {
                path: this.dataPath,
                embeddingModel: this.config.embeddingModel,
                embeddingDimension: this.config.embeddingDimension,
            },
        };
    }
    async healthCheck() {
        try {
            return this.isInitialized && this.index !== null;
        }
        catch (error) {
            logger.error('VectorStore health check failed', { error });
            return false;
        }
    }
    generateId() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sanitizeMetadata(metadata) {
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined && value !== null) {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    async close() {
        this.isInitialized = false;
        this.index = null;
        logger.info('VectorStore closed');
    }
}
//# sourceMappingURL=vectorstore.js.map