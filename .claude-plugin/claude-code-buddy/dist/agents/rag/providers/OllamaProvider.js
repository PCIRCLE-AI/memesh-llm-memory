import { logger } from '../../../utils/logger.js';
const MODEL_CONFIGS = {
    'nomic-embed-text': { dimensions: 768, maxTokens: 8192 },
    'mxbai-embed-large': { dimensions: 1024, maxTokens: 512 },
    'all-minilm': { dimensions: 384, maxTokens: 256 },
    'snowflake-arctic-embed': { dimensions: 1024, maxTokens: 512 },
};
export class OllamaProvider {
    baseUrl;
    model;
    dimensions;
    maxTokens;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:11434';
        this.model = options.model || 'nomic-embed-text';
        const modelConfig = MODEL_CONFIGS[this.model];
        this.dimensions = options.dimensions || modelConfig?.dimensions || 768;
        this.maxTokens = options.maxTokens || modelConfig?.maxTokens || 8192;
        logger.info('OllamaProvider initialized', {
            baseUrl: this.baseUrl,
            model: this.model,
            dimensions: this.dimensions,
        });
    }
    async embed(text) {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }
            const result = (await response.json());
            if (!result.embedding || !Array.isArray(result.embedding)) {
                throw new Error(`Invalid response from Ollama: missing or invalid embedding`);
            }
            const embedding = result.embedding;
            if (embedding.length !== this.dimensions) {
                logger.warn('Embedding dimension mismatch', {
                    expected: this.dimensions,
                    received: embedding.length,
                    model: this.model,
                });
            }
            return embedding;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                    throw new Error(`Failed to connect to Ollama at ${this.baseUrl}. ` +
                        `Please ensure Ollama is running (ollama serve) and accessible at ${this.baseUrl}`);
                }
                if (error.message.includes('model') && error.message.includes('not found')) {
                    throw new Error(`Model '${this.model}' not found in Ollama. ` +
                        `Please pull the model first: ollama pull ${this.model}`);
                }
            }
            logger.error('Failed to generate embedding', {
                error: error instanceof Error ? error.message : String(error),
                model: this.model,
                baseUrl: this.baseUrl,
            });
            throw error;
        }
    }
    async embedBatch(texts) {
        const embeddings = [];
        for (let i = 0; i < texts.length; i++) {
            try {
                const embedding = await this.embed(texts[i]);
                embeddings.push(embedding);
                if (i < texts.length - 1) {
                    await this.sleep(10);
                }
            }
            catch (error) {
                logger.error('Failed to generate batch embedding', {
                    error: error instanceof Error ? error.message : String(error),
                    textIndex: i,
                    totalTexts: texts.length,
                });
                throw error;
            }
        }
        return embeddings;
    }
    getModelInfo() {
        return {
            provider: 'Ollama',
            model: this.model,
            dimensions: this.dimensions,
            maxTokens: this.maxTokens,
        };
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async checkAvailability() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.status}`);
            }
            const result = (await response.json());
            return result.models?.map((m) => m.name) || [];
        }
        catch (error) {
            logger.error('Failed to list Ollama models', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
//# sourceMappingURL=OllamaProvider.js.map