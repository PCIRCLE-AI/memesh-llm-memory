import { logger } from '../../../utils/logger.js';
const MODEL_CONFIGS = {
    'sentence-transformers/all-MiniLM-L6-v2': { dimensions: 384, maxTokens: 256 },
    'sentence-transformers/all-mpnet-base-v2': { dimensions: 768, maxTokens: 384 },
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2': { dimensions: 384, maxTokens: 128 },
    'BAAI/bge-small-en-v1.5': { dimensions: 384, maxTokens: 512 },
    'BAAI/bge-base-en-v1.5': { dimensions: 768, maxTokens: 512 },
    'BAAI/bge-large-en-v1.5': { dimensions: 1024, maxTokens: 512 },
};
export class HuggingFaceProvider {
    apiKey;
    model;
    dimensions;
    maxTokens;
    batchSize;
    baseUrl = 'https://router.huggingface.co';
    constructor(options) {
        this.apiKey = options.apiKey;
        this.model = options.model || 'sentence-transformers/all-MiniLM-L6-v2';
        this.batchSize = options.batchSize || 50;
        const modelConfig = MODEL_CONFIGS[this.model];
        this.dimensions = options.dimensions || modelConfig?.dimensions || 384;
        this.maxTokens = options.maxTokens || modelConfig?.maxTokens || 256;
        logger.info('HuggingFaceProvider initialized', {
            model: this.model,
            dimensions: this.dimensions,
        });
    }
    async embed(text) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    input: text,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
            }
            const result = (await response.json());
            if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
                throw new Error(`Unexpected response format from Hugging Face API: ${JSON.stringify(result)}`);
            }
            const embedding = result.data[0].embedding;
            if (!Array.isArray(embedding)) {
                throw new Error(`Invalid embedding format: ${JSON.stringify(embedding)}`);
            }
            const normalized = this.normalizeEmbedding(embedding);
            if (normalized.length !== this.dimensions) {
                logger.warn('Embedding dimension mismatch', {
                    expected: this.dimensions,
                    received: normalized.length,
                    model: this.model,
                });
            }
            return normalized;
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
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            try {
                const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        input: batch,
                    }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
                }
                const result = (await response.json());
                if (!result.data || !Array.isArray(result.data)) {
                    throw new Error(`Unexpected batch response format: ${JSON.stringify(result)}`);
                }
                const batchEmbeddings = result.data.map((item) => {
                    if (!Array.isArray(item.embedding)) {
                        throw new Error(`Invalid embedding format in batch: ${JSON.stringify(item)}`);
                    }
                    return this.normalizeEmbedding(item.embedding);
                });
                embeddings.push(...batchEmbeddings);
                if (i + this.batchSize < texts.length) {
                    await this.sleep(50);
                }
            }
            catch (error) {
                logger.error('Failed to generate batch embeddings', {
                    error: error instanceof Error ? error.message : String(error),
                    batchIndex: i,
                    batchSize: batch.length,
                });
                throw error;
            }
        }
        return embeddings;
    }
    getModelInfo() {
        return {
            provider: 'Hugging Face',
            model: this.model,
            dimensions: this.dimensions,
            maxTokens: this.maxTokens,
        };
    }
    normalizeEmbedding(embedding) {
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0) {
            return embedding;
        }
        return embedding.map(val => val / magnitude);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=HuggingFaceProvider.js.map