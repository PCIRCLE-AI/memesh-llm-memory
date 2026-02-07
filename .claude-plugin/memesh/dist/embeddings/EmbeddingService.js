import path from 'path';
import { pipeline, env } from '@xenova/transformers';
import { ModelManager } from './ModelManager.js';
import { logger } from '../utils/logger.js';
const modelDir = new ModelManager().getModelDir();
env.cacheDir = path.dirname(modelDir);
env.allowRemoteModels = true;
export class EmbeddingService {
    static DIMENSIONS = 384;
    static MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
    extractor = null;
    initialized = false;
    async initialize() {
        if (this.initialized) {
            return;
        }
        logger.info('Initializing EmbeddingService...', { model: EmbeddingService.MODEL_NAME });
        try {
            this.extractor = await pipeline('feature-extraction', EmbeddingService.MODEL_NAME, {
                quantized: false,
            });
            this.initialized = true;
            logger.info('EmbeddingService initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize EmbeddingService', { error });
            throw new Error(`Failed to initialize embedding service: ${error instanceof Error ? error.message : error}`);
        }
    }
    isInitialized() {
        return this.initialized;
    }
    async encode(text) {
        if (!this.extractor) {
            throw new Error('EmbeddingService not initialized. Call initialize() first.');
        }
        const result = await this.extractor(text, {
            pooling: 'mean',
            normalize: true,
        });
        return new Float32Array(result.data);
    }
    async encodeBatch(texts) {
        const embeddings = [];
        for (const text of texts) {
            const embedding = await this.encode(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        if (magnitude === 0) {
            return 0;
        }
        return dotProduct / magnitude;
    }
    getDimensions() {
        return EmbeddingService.DIMENSIONS;
    }
    async dispose() {
        this.extractor = null;
        this.initialized = false;
        logger.debug('EmbeddingService disposed');
    }
}
export class LazyEmbeddingService {
    static instance = null;
    static initPromise = null;
    static async get() {
        if (this.instance?.isInitialized()) {
            return this.instance;
        }
        if (!this.initPromise) {
            this.initPromise = (async () => {
                try {
                    this.instance = new EmbeddingService();
                    await this.instance.initialize();
                    return this.instance;
                }
                catch (error) {
                    this.initPromise = null;
                    this.instance = null;
                    throw error;
                }
            })();
        }
        return this.initPromise;
    }
    static async dispose() {
        if (this.instance) {
            await this.instance.dispose();
            this.instance = null;
            this.initPromise = null;
        }
    }
}
//# sourceMappingURL=EmbeddingService.js.map