import { logger } from '../../utils/logger.js';
export const HF_EMBEDDING_MODELS = {
    'all-MiniLM-L6-v2': 'sentence-transformers/all-MiniLM-L6-v2',
    'all-mpnet-base-v2': 'sentence-transformers/all-mpnet-base-v2',
    'bge-small-en-v1.5': 'BAAI/bge-small-en-v1.5',
    'bge-base-en-v1.5': 'BAAI/bge-base-en-v1.5',
};
export class HuggingFaceEmbeddingService {
    apiKey;
    model;
    costTracker;
    baseUrl = 'https://router.huggingface.co/hf-inference/models';
    constructor(apiKey, model) {
        this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
        this.model = model || process.env.HUGGINGFACE_MODEL || HF_EMBEDDING_MODELS['all-MiniLM-L6-v2'];
        this.costTracker = {
            embeddingCalls: 0,
            totalTokens: 0,
            estimatedCost: 0,
            lastUpdated: new Date(),
        };
    }
    isAvailable() {
        return this.apiKey !== undefined;
    }
    async createEmbedding(text) {
        if (!this.apiKey) {
            throw new Error('HuggingFace API key not provided. ' +
                'Please set HUGGINGFACE_API_KEY environment variable.');
        }
        try {
            const response = await fetch(`${this.baseUrl}/${this.model}/embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: text,
                    options: {
                        wait_for_model: true,
                    },
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
            }
            const data = await response.json();
            let embedding;
            if (Array.isArray(data)) {
                embedding = data;
            }
            else if (data.embeddings && Array.isArray(data.embeddings[0])) {
                embedding = data.embeddings[0];
            }
            else {
                throw new Error('Unexpected HuggingFace API response format');
            }
            this.costTracker.embeddingCalls++;
            this.costTracker.totalTokens += Math.ceil(text.length / 4);
            this.costTracker.estimatedCost = 0;
            this.costTracker.lastUpdated = new Date();
            logger.debug('HuggingFace embedding created', {
                model: this.model,
                textLength: text.length,
                embeddingDim: embedding.length,
            });
            return embedding;
        }
        catch (error) {
            logger.error('Failed to create HuggingFace embedding', { error });
            throw error;
        }
    }
    async createEmbeddings(texts) {
        if (!this.apiKey) {
            throw new Error('HuggingFace API key not provided');
        }
        try {
            const response = await fetch(`${this.baseUrl}/${this.model}/embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: texts,
                    options: {
                        wait_for_model: true,
                    },
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
            }
            const data = await response.json();
            let embeddings;
            if (Array.isArray(data) && Array.isArray(data[0])) {
                embeddings = data;
            }
            else if ('embeddings' in data && data.embeddings) {
                embeddings = data.embeddings;
            }
            else {
                throw new Error('Unexpected HuggingFace API response format');
            }
            this.costTracker.embeddingCalls += texts.length;
            this.costTracker.totalTokens += texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
            this.costTracker.estimatedCost = 0;
            this.costTracker.lastUpdated = new Date();
            logger.debug('HuggingFace batch embeddings created', {
                model: this.model,
                count: texts.length,
                embeddingDim: embeddings[0]?.length,
            });
            return embeddings;
        }
        catch (error) {
            logger.error('Failed to create HuggingFace batch embeddings', { error });
            throw error;
        }
    }
    getCostTracker() {
        return { ...this.costTracker };
    }
    getModelInfo() {
        const dimensionsMap = {
            [HF_EMBEDDING_MODELS['all-MiniLM-L6-v2']]: 384,
            [HF_EMBEDDING_MODELS['all-mpnet-base-v2']]: 768,
            [HF_EMBEDDING_MODELS['bge-small-en-v1.5']]: 384,
            [HF_EMBEDDING_MODELS['bge-base-en-v1.5']]: 768,
        };
        return {
            provider: 'huggingface',
            model: this.model,
            dimensions: dimensionsMap[this.model] || 768,
        };
    }
}
//# sourceMappingURL=huggingface-embeddings.js.map