/**
 * Embeddings Module
 *
 * Provides text-to-vector embedding capabilities for semantic search in MeMesh.
 * Uses the all-MiniLM-L6-v2 ONNX model for generating 384-dimensional embeddings.
 *
 * Components:
 * - ModelManager: Downloads and manages the ONNX embedding model
 * - EmbeddingService: Text-to-vector conversion using transformers.js
 * - VectorExtension: SQLite-vec integration for vector storage and KNN search
 *
 * @example
 * ```typescript
 * import {
 *   ModelManager,
 *   EmbeddingService,
 *   LazyEmbeddingService,
 *   VectorExtension
 * } from './embeddings/index.js';
 * import Database from 'better-sqlite3';
 *
 * // Generate embeddings
 * const embeddingService = await LazyEmbeddingService.get();
 * const embedding = await embeddingService.encode('hello world');
 *
 * // Vector storage and search
 * const db = new Database(':memory:');
 * VectorExtension.loadExtension(db);
 * VectorExtension.createVectorTable(db, 384);
 *
 * VectorExtension.insertEmbedding(db, 'my-entity', embedding);
 *
 * const queryEmb = await embeddingService.encode('greeting');
 * const results = VectorExtension.knnSearch(db, queryEmb, 10);
 * ```
 */

export { ModelManager } from './ModelManager.js';
export { EmbeddingService, LazyEmbeddingService } from './EmbeddingService.js';
export {
  VectorExtension,
  type KnnSearchResult,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from './VectorExtension.js';
