/**
 * EmbeddingService - Text-to-Vector Conversion using ONNX Models
 *
 * Provides text embedding generation capabilities using the all-MiniLM-L6-v2 model
 * via @xenova/transformers. Generates 384-dimensional vectors suitable for semantic
 * search and similarity calculations.
 *
 * Features:
 * - Generate 384-dimensional embeddings from text
 * - Batch encoding for multiple texts
 * - Cosine similarity calculation
 * - Lazy-loading singleton for efficient resource management
 *
 * @example
 * ```typescript
 * import { EmbeddingService, LazyEmbeddingService } from './EmbeddingService.js';
 *
 * // Direct usage
 * const service = new EmbeddingService();
 * await service.initialize();
 * const embedding = await service.encode('hello world');
 * await service.dispose();
 *
 * // Singleton usage (recommended)
 * const service = await LazyEmbeddingService.get();
 * const embedding = await service.encode('hello world');
 * ```
 */

import path from 'path';
import { pipeline, env } from '@xenova/transformers';
import { ModelManager } from './ModelManager.js';
import { logger } from '../utils/logger.js';

// Configure transformers.js to use local cache
const modelDir = new ModelManager().getModelDir();
env.cacheDir = path.dirname(modelDir);
env.allowRemoteModels = true;

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline<'feature-extraction'>>>;

/**
 * Service for generating text embeddings using ONNX models
 *
 * Uses the all-MiniLM-L6-v2 model which produces 384-dimensional
 * normalized embeddings suitable for semantic similarity tasks.
 */
export class EmbeddingService {
  /** Embedding vector dimensions (all-MiniLM-L6-v2 produces 384-dim vectors) */
  private static readonly DIMENSIONS = 384;

  /** HuggingFace model identifier for @xenova/transformers */
  private static readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

  /** Feature extraction pipeline instance */
  private extractor: FeatureExtractionPipeline | null = null;

  /** Initialization state flag */
  private initialized = false;

  /**
   * Initialize the embedding service (loads model)
   *
   * Must be called before using encode() or encodeBatch().
   * The model will be downloaded from HuggingFace on first use
   * and cached locally for subsequent uses.
   *
   * @throws Error if model initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing EmbeddingService...', { model: EmbeddingService.MODEL_NAME });

    try {
      // Use transformers.js pipeline for feature extraction
      this.extractor = await pipeline('feature-extraction', EmbeddingService.MODEL_NAME, {
        quantized: false, // Use full precision model for better accuracy
      });

      this.initialized = true;
      logger.info('EmbeddingService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EmbeddingService', { error });
      throw new Error(
        `Failed to initialize embedding service: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Check if service is initialized
   *
   * @returns true if initialize() has been successfully called
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Encode text into embedding vector
   *
   * Converts input text into a 384-dimensional normalized vector
   * using mean pooling across all tokens.
   *
   * @param text - Input text to encode
   * @returns Float32Array of 384 dimensions
   * @throws Error if service is not initialized
   *
   * @example
   * ```typescript
   * const embedding = await service.encode('hello world');
   * console.log(embedding.length); // 384
   * ```
   */
  async encode(text: string): Promise<Float32Array> {
    if (!this.extractor) {
      throw new Error('EmbeddingService not initialized. Call initialize() first.');
    }

    const result = await this.extractor(text, {
      pooling: 'mean', // Average across all token embeddings
      normalize: true, // L2 normalize for cosine similarity
    });

    // Result is a Tensor - extract data as Float32Array
    return new Float32Array(result.data as ArrayLike<number>);
  }

  /**
   * Batch encode multiple texts
   *
   * Encodes multiple texts sequentially. For large batches,
   * consider using Promise.all with smaller chunks for better
   * memory management.
   *
   * @param texts - Array of texts to encode
   * @returns Array of Float32Array embeddings
   * @throws Error if service is not initialized
   *
   * @example
   * ```typescript
   * const embeddings = await service.encodeBatch(['hello', 'world']);
   * console.log(embeddings.length); // 2
   * ```
   */
  async encodeBatch(texts: string[]): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];

    for (const text of texts) {
      const embedding = await this.encode(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * Cosine similarity measures the angle between two vectors,
   * returning a value between -1 (opposite) and 1 (identical).
   * Values closer to 1 indicate more similar texts.
   *
   * @param a - First embedding vector
   * @param b - Second embedding vector
   * @returns Similarity score between -1 and 1
   * @throws Error if vector dimensions don't match
   *
   * @example
   * ```typescript
   * const emb1 = await service.encode('hello');
   * const emb2 = await service.encode('hi');
   * const similarity = service.cosineSimilarity(emb1, emb2);
   * console.log(similarity); // ~0.7 (high similarity)
   * ```
   */
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
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

  /**
   * Get embedding dimensions
   *
   * @returns Number of dimensions (384 for all-MiniLM-L6-v2)
   */
  getDimensions(): number {
    return EmbeddingService.DIMENSIONS;
  }

  /**
   * Cleanup resources
   *
   * Releases the model from memory. Call this when the service
   * is no longer needed to free resources.
   */
  async dispose(): Promise<void> {
    this.extractor = null;
    this.initialized = false;
    logger.debug('EmbeddingService disposed');
  }
}

/**
 * Lazy-loading singleton for EmbeddingService
 *
 * Provides efficient access to a shared EmbeddingService instance.
 * The model is loaded only once on first access and reused for
 * all subsequent calls.
 *
 * @example
 * ```typescript
 * // Get the singleton instance (initializes on first call)
 * const service = await LazyEmbeddingService.get();
 * const embedding = await service.encode('hello world');
 *
 * // Cleanup when done
 * await LazyEmbeddingService.dispose();
 * ```
 */
export class LazyEmbeddingService {
  /** Singleton instance */
  private static instance: EmbeddingService | null = null;

  /** Promise for ongoing initialization */
  private static initPromise: Promise<EmbeddingService> | null = null;

  /**
   * Get the singleton EmbeddingService instance
   *
   * Creates and initializes the service on first call.
   * Subsequent calls return the same initialized instance.
   * If initialization fails, the promise is reset to allow retry.
   *
   * @returns Initialized EmbeddingService instance
   * @throws Error if initialization fails (can be retried)
   */
  static async get(): Promise<EmbeddingService> {
    // Fast path: return already initialized instance
    if (this.instance?.isInitialized()) {
      return this.instance;
    }

    // Initialize if not already in progress
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.instance = new EmbeddingService();
          await this.instance.initialize();
          return this.instance;
        } catch (error) {
          // Reset on failure to allow retry
          this.initPromise = null;
          this.instance = null;
          throw error;
        }
      })();
    }

    return this.initPromise;
  }

  /**
   * Dispose the singleton instance
   *
   * Releases resources and resets the singleton.
   * Next call to get() will create a new instance.
   */
  static async dispose(): Promise<void> {
    if (this.instance) {
      await this.instance.dispose();
      this.instance = null;
      this.initPromise = null;
    }
  }
}
