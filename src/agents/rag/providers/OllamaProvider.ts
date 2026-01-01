/**
 * Ollama Embedding Provider
 *
 * Implements embedding generation using local Ollama instance
 * Supports nomic-embed-text and other Ollama embedding models
 *
 * @packageDocumentation
 */

import { IEmbeddingProvider, ModelInfo } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Default model configurations
 */
const MODEL_CONFIGS = {
  'nomic-embed-text': { dimensions: 768, maxTokens: 8192 },
  'mxbai-embed-large': { dimensions: 1024, maxTokens: 512 },
  'all-minilm': { dimensions: 384, maxTokens: 256 },
  'snowflake-arctic-embed': { dimensions: 1024, maxTokens: 512 },
} as const;

type ModelName = keyof typeof MODEL_CONFIGS;

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
  dimensions?: number;
  maxTokens?: number;
}

/**
 * Ollama Embedding Provider
 *
 * Uses local Ollama instance to generate embeddings
 */
export class OllamaProvider implements IEmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private dimensions: number;
  private maxTokens: number;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.model = options.model || 'nomic-embed-text';

    // Get model config or use provided dimensions
    const modelConfig = MODEL_CONFIGS[this.model as ModelName];
    this.dimensions = options.dimensions || modelConfig?.dimensions || 768;
    this.maxTokens = options.maxTokens || modelConfig?.maxTokens || 8192;

    logger.info('OllamaProvider initialized', {
      baseUrl: this.baseUrl,
      model: this.model,
      dimensions: this.dimensions,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
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

      const result = (await response.json()) as { embedding?: number[] };

      if (!result.embedding || !Array.isArray(result.embedding)) {
        throw new Error(`Invalid response from Ollama: missing or invalid embedding`);
      }

      const embedding = result.embedding;

      // Ollama embeddings are already normalized by default
      if (embedding.length !== this.dimensions) {
        logger.warn('Embedding dimension mismatch', {
          expected: this.dimensions,
          received: embedding.length,
          model: this.model,
        });
      }

      return embedding;
    } catch (error) {
      // Provide helpful error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(
            `Failed to connect to Ollama at ${this.baseUrl}. ` +
            `Please ensure Ollama is running (ollama serve) and accessible at ${this.baseUrl}`
          );
        }

        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(
            `Model '${this.model}' not found in Ollama. ` +
            `Please pull the model first: ollama pull ${this.model}`
          );
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

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Ollama doesn't have native batch API, so we process sequentially
    // with minimal delay to avoid overwhelming the local instance
    for (let i = 0; i < texts.length; i++) {
      try {
        const embedding = await this.embed(texts[i]);
        embeddings.push(embedding);

        // Small delay between requests to avoid overwhelming local instance
        if (i < texts.length - 1) {
          await this.sleep(10);
        }
      } catch (error) {
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

  /**
   * Get model information
   */
  getModelInfo(): ModelInfo {
    return {
      provider: 'Ollama',
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: this.maxTokens,
    };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Ollama is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models in Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const result = (await response.json()) as { models?: Array<{ name: string }> };
      return result.models?.map((m) => m.name) || [];
    } catch (error) {
      logger.error('Failed to list Ollama models', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
