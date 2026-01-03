/**
 * Local Embedding Provider
 *
 * Implements embedding generation using local models via transformers.js
 * Supports offline operation and caching for improved performance
 *
 * @packageDocumentation
 */

import { IEmbeddingProvider, ModelInfo } from '../types';
import { logger } from '../../../utils/logger.js';

/**
 * Default model configurations
 */
const MODEL_CONFIGS = {
  'all-MiniLM-L6-v2': { dimensions: 384, maxTokens: 256 },
  'all-mpnet-base-v2': { dimensions: 768, maxTokens: 384 },
  'paraphrase-multilingual-MiniLM-L12-v2': { dimensions: 384, maxTokens: 128 },
  'bge-small-en-v1.5': { dimensions: 384, maxTokens: 512 },
  'bge-base-en-v1.5': { dimensions: 768, maxTokens: 512 },
} as const;

type ModelName = keyof typeof MODEL_CONFIGS;

export interface LocalProviderOptions {
  modelPath: string;
  model?: string;
  dimensions?: number;
  maxTokens?: number;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
}

/**
 * Local Embedding Provider
 *
 * Uses local models loaded from file system for offline embedding generation
 * Implements LRU cache for improved performance on repeated texts
 */
export class LocalProvider implements IEmbeddingProvider {
  private modelPath: string;
  private model: string;
  private dimensions: number;
  private maxTokens: number;
  private cacheEnabled: boolean;
  private embeddingCache: Map<string, number[]>;
  private maxCacheSize: number;
  private modelInstance: any | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(options: LocalProviderOptions) {
    this.modelPath = options.modelPath;
    this.model = options.model || 'all-MiniLM-L6-v2';
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.embeddingCache = new Map();

    // Get model config or use provided dimensions
    const modelConfig = MODEL_CONFIGS[this.model as ModelName];
    this.dimensions = options.dimensions || modelConfig?.dimensions || 384;
    this.maxTokens = options.maxTokens || modelConfig?.maxTokens || 256;

    logger.info('LocalProvider initialized', {
      modelPath: this.modelPath,
      model: this.model,
      dimensions: this.dimensions,
      cacheEnabled: this.cacheEnabled,
    });
  }

  /**
   * Initialize the local model
   * Uses lazy loading - model is only loaded on first use
   */
  private async initializeModel(): Promise<void> {
    if (this.modelInstance) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Dynamically import @xenova/transformers to avoid bundling if not used
        const { pipeline } = await import('@xenova/transformers');

        logger.info('Loading local embedding model', {
          model: this.model,
          path: this.modelPath,
        });

        // Load the feature extraction pipeline
        this.modelInstance = await pipeline('feature-extraction', this.modelPath, {
          quantized: true, // Use quantized models for faster inference
        });

        logger.info('Local embedding model loaded successfully', {
          model: this.model,
        });
      } catch (error) {
        logger.error('Failed to load local embedding model', {
          error: error instanceof Error ? error.message : String(error),
          modelPath: this.modelPath,
        });

        // Provide helpful error message
        if (error instanceof Error) {
          if (error.message.includes('ENOENT') || error.message.includes('not found')) {
            throw new Error(
              `Model not found at ${this.modelPath}. ` +
              `Please ensure the model is downloaded to the correct location.`
            );
          }

          if (error.message.includes('transformers')) {
            throw new Error(
              `Failed to load @xenova/transformers. ` +
              `Please install it: npm install @xenova/transformers`
            );
          }
        }

        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    // Check cache first
    if (this.cacheEnabled && this.embeddingCache.has(text)) {
      logger.debug('Cache hit for embedding', { textLength: text.length });
      return this.embeddingCache.get(text)!;
    }

    // Ensure model is loaded
    await this.initializeModel();

    try {
      // Generate embedding using transformers.js
      const output = await this.modelInstance(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract embedding from output
      let embedding: number[];

      if (output.data) {
        // Output is a tensor - convert to array
        embedding = Array.from(output.data);
      } else if (Array.isArray(output)) {
        embedding = output;
      } else {
        throw new Error(`Unexpected model output format: ${typeof output}`);
      }

      // Ensure correct dimensions
      if (embedding.length !== this.dimensions) {
        logger.warn('Embedding dimension mismatch', {
          expected: this.dimensions,
          received: embedding.length,
          model: this.model,
        });
      }

      // Cache the result
      if (this.cacheEnabled) {
        this.addToCache(text, embedding);
      }

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : String(error),
        model: this.model,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process texts, utilizing cache when possible
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Get model information
   */
  getModelInfo(): ModelInfo {
    return {
      provider: 'Local',
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: this.maxTokens,
    };
  }

  /**
   * Add embedding to cache with LRU eviction
   */
  private addToCache(text: string, embedding: number[]): void {
    if (this.embeddingCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey !== undefined) {
        this.embeddingCache.delete(firstKey);
      }
    }

    this.embeddingCache.set(text, embedding);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    logger.info('Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.embeddingCache.size,
      maxSize: this.maxCacheSize,
      // TODO: Track hits/misses for accurate hit rate - See issue #6
      hitRate: 0,
    };
  }

  /**
   * Dispose of the model and free resources
   */
  async dispose(): Promise<void> {
    if (this.modelInstance && typeof this.modelInstance.dispose === 'function') {
      await this.modelInstance.dispose();
    }
    this.modelInstance = null;
    this.initializationPromise = null;
    this.clearCache();
    logger.info('LocalProvider disposed');
  }
}
