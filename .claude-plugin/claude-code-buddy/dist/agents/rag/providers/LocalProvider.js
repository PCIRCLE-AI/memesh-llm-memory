import { logger } from '../../../utils/logger.js';
const MODEL_CONFIGS = {
    'all-MiniLM-L6-v2': { dimensions: 384, maxTokens: 256 },
    'all-mpnet-base-v2': { dimensions: 768, maxTokens: 384 },
    'paraphrase-multilingual-MiniLM-L12-v2': { dimensions: 384, maxTokens: 128 },
    'bge-small-en-v1.5': { dimensions: 384, maxTokens: 512 },
    'bge-base-en-v1.5': { dimensions: 768, maxTokens: 512 },
};
export class LocalProvider {
    modelPath;
    model;
    dimensions;
    maxTokens;
    cacheEnabled;
    embeddingCache;
    maxCacheSize;
    modelInstance = null;
    initializationPromise = null;
    constructor(options) {
        this.modelPath = options.modelPath;
        this.model = options.model || 'all-MiniLM-L6-v2';
        this.cacheEnabled = options.cacheEnabled ?? true;
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.embeddingCache = new Map();
        const modelConfig = MODEL_CONFIGS[this.model];
        this.dimensions = options.dimensions || modelConfig?.dimensions || 384;
        this.maxTokens = options.maxTokens || modelConfig?.maxTokens || 256;
        logger.info('LocalProvider initialized', {
            modelPath: this.modelPath,
            model: this.model,
            dimensions: this.dimensions,
            cacheEnabled: this.cacheEnabled,
        });
    }
    async initializeModel() {
        if (this.modelInstance) {
            return;
        }
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            try {
                const { pipeline } = await import('@xenova/transformers');
                logger.info('Loading local embedding model', {
                    model: this.model,
                    path: this.modelPath,
                });
                this.modelInstance = await pipeline('feature-extraction', this.modelPath, {
                    quantized: true,
                });
                logger.info('Local embedding model loaded successfully', {
                    model: this.model,
                });
            }
            catch (error) {
                logger.error('Failed to load local embedding model', {
                    error: error instanceof Error ? error.message : String(error),
                    modelPath: this.modelPath,
                });
                if (error instanceof Error) {
                    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                        throw new Error(`Model not found at ${this.modelPath}. ` +
                            `Please ensure the model is downloaded to the correct location.`);
                    }
                    if (error.message.includes('transformers')) {
                        throw new Error(`Failed to load @xenova/transformers. ` +
                            `Please install it: npm install @xenova/transformers`);
                    }
                }
                throw error;
            }
        })();
        return this.initializationPromise;
    }
    async embed(text) {
        if (this.cacheEnabled && this.embeddingCache.has(text)) {
            logger.debug('Cache hit for embedding', { textLength: text.length });
            return this.embeddingCache.get(text);
        }
        await this.initializeModel();
        try {
            const output = await this.modelInstance(text, {
                pooling: 'mean',
                normalize: true,
            });
            let embedding;
            if (output.data) {
                embedding = Array.from(output.data);
            }
            else if (Array.isArray(output)) {
                embedding = output;
            }
            else {
                throw new Error(`Unexpected model output format: ${typeof output}`);
            }
            if (embedding.length !== this.dimensions) {
                logger.warn('Embedding dimension mismatch', {
                    expected: this.dimensions,
                    received: embedding.length,
                    model: this.model,
                });
            }
            if (this.cacheEnabled) {
                this.addToCache(text, embedding);
            }
            return embedding;
        }
        catch (error) {
            logger.error('Failed to generate embedding', {
                error: error instanceof Error ? error.message : String(error),
                model: this.model,
            });
            throw error;
        }
    }
    async embedBatch(texts) {
        const embeddings = [];
        for (const text of texts) {
            const embedding = await this.embed(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }
    getModelInfo() {
        return {
            provider: 'Local',
            model: this.model,
            dimensions: this.dimensions,
            maxTokens: this.maxTokens,
        };
    }
    addToCache(text, embedding) {
        if (this.embeddingCache.size >= this.maxCacheSize) {
            const firstKey = this.embeddingCache.keys().next().value;
            if (firstKey !== undefined) {
                this.embeddingCache.delete(firstKey);
            }
        }
        this.embeddingCache.set(text, embedding);
    }
    clearCache() {
        this.embeddingCache.clear();
        logger.info('Embedding cache cleared');
    }
    getCacheStats() {
        return {
            size: this.embeddingCache.size,
            maxSize: this.maxCacheSize,
            hitRate: 0,
        };
    }
    async dispose() {
        if (this.modelInstance && typeof this.modelInstance.dispose === 'function') {
            await this.modelInstance.dispose();
        }
        this.modelInstance = null;
        this.initializationPromise = null;
        this.clearCache();
        logger.info('LocalProvider disposed');
    }
}
//# sourceMappingURL=LocalProvider.js.map