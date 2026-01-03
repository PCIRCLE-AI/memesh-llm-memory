import OpenAI from 'openai';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { ConfigurationError, OperationError, ValidationError } from '../../errors/index.js';
const EMBEDDING_PRICING = {
    'text-embedding-3-small': 0.00002,
    'text-embedding-3-large': 0.00013,
    'text-embedding-ada-002': 0.0001,
};
export class EmbeddingService {
    client = null;
    model;
    costTracker;
    apiKey;
    initializationPromise = null;
    constructor(apiKey, model) {
        this.apiKey = apiKey || appConfig.openai.apiKey;
        this.model = model || appConfig.openai.embeddings.model;
        this.costTracker = {
            embeddingCalls: 0,
            totalTokens: 0,
            estimatedCost: 0,
            lastUpdated: new Date(),
        };
        if (this.apiKey) {
            this.initializationPromise = this.initialize();
        }
    }
    async initialize() {
        if (!this.apiKey)
            return;
        this.client = new OpenAI({
            apiKey: this.apiKey,
        });
    }
    isAvailable() {
        return this.client !== null || this.apiKey !== undefined;
    }
    async ensureClient() {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (!this.client) {
            throw new ConfigurationError('OpenAI API key not provided. Embedding service is unavailable. ' +
                'Please set OPENAI_API_KEY environment variable if you need embedding features.', {
                configKey: 'OPENAI_API_KEY',
                provider: 'OpenAI',
                service: 'EmbeddingService',
            });
        }
        return this.client;
    }
    async createEmbedding(text) {
        const client = await this.ensureClient();
        try {
            const response = await client.embeddings.create({
                model: this.model,
                input: text,
                encoding_format: 'float',
            });
            const tokens = response.usage.total_tokens;
            this.updateCostTracker(tokens);
            return response.data[0].embedding;
        }
        catch (error) {
            logger.error('Failed to create embedding', { error });
            throw new OperationError(`Embedding creation failed: ${error}`, {
                operation: 'createEmbedding',
                model: this.model,
                textLength: text.length,
                originalError: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async createEmbeddingsBatch(texts) {
        const client = await this.ensureClient();
        const maxBatchSize = 2048;
        const batches = [];
        for (let i = 0; i < texts.length; i += maxBatchSize) {
            batches.push(texts.slice(i, i + maxBatchSize));
        }
        const allEmbeddings = [];
        for (const batch of batches) {
            try {
                const response = await client.embeddings.create({
                    model: this.model,
                    input: batch,
                    encoding_format: 'float',
                });
                const tokens = response.usage.total_tokens;
                this.updateCostTracker(tokens);
                const embeddings = response.data
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.embedding);
                allEmbeddings.push(...embeddings);
            }
            catch (error) {
                logger.error('Failed to create embeddings batch', { error });
                throw new OperationError(`Batch embedding creation failed: ${error}`, {
                    operation: 'createEmbeddingsBatch',
                    model: this.model,
                    batchSize: batch.length,
                    totalTexts: texts.length,
                    originalError: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return allEmbeddings;
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new ValidationError('Embedding dimensions must match for cosine similarity calculation', {
                dimensionA: a.length,
                dimensionB: b.length,
                expectedDimension: this.getModelDimension(),
            });
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    estimateTokens(text) {
        const avgCharsPerToken = 3;
        return Math.ceil(text.length / avgCharsPerToken);
    }
    estimateCost(texts) {
        const totalTokens = texts.reduce((sum, text) => sum + this.estimateTokens(text), 0);
        const pricePerToken = EMBEDDING_PRICING[this.model] || 0.0001;
        return (totalTokens / 1000) * pricePerToken;
    }
    updateCostTracker(tokens) {
        this.costTracker.embeddingCalls++;
        this.costTracker.totalTokens += tokens;
        const pricePerToken = EMBEDDING_PRICING[this.model] || 0.0001;
        this.costTracker.estimatedCost = (this.costTracker.totalTokens / 1000) * pricePerToken;
        this.costTracker.lastUpdated = new Date();
    }
    getCostTracker() {
        return { ...this.costTracker };
    }
    resetCostTracker() {
        this.costTracker = {
            embeddingCalls: 0,
            totalTokens: 0,
            estimatedCost: 0,
            lastUpdated: new Date(),
        };
    }
    getModel() {
        return this.model;
    }
    getModelDimension() {
        const dimensions = {
            'text-embedding-3-small': 1536,
            'text-embedding-3-large': 3072,
            'text-embedding-ada-002': 1536,
        };
        return dimensions[this.model] || 1536;
    }
    async createEmbeddings(texts) {
        return this.createEmbeddingsBatch(texts);
    }
    getModelInfo() {
        return {
            provider: 'OpenAI',
            model: this.model,
            dimensions: this.getModelDimension(),
        };
    }
    async embed(text) {
        return this.createEmbedding(text);
    }
    async embedBatch(texts) {
        return this.createEmbeddingsBatch(texts);
    }
}
let embeddingServiceInstance = null;
export function getEmbeddingService() {
    if (!embeddingServiceInstance) {
        embeddingServiceInstance = new EmbeddingService();
    }
    return embeddingServiceInstance;
}
//# sourceMappingURL=embeddings.js.map