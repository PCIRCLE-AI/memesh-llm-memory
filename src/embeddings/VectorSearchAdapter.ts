/**
 * VectorSearchAdapter - Abstract interface for vector similarity search
 *
 * Decouples vector search operations from specific implementations (sqlite-vec, etc.)
 * Enables swapping backends without changing consuming code.
 */

import type Database from 'better-sqlite3';

/**
 * Result from KNN search
 */
export interface KnnSearchResult {
  /** Name of the entity */
  entityName: string;
  /** Distance from query vector (lower = more similar for cosine distance) */
  distance: number;
}

/**
 * Default embedding dimensions for all-MiniLM-L6-v2 model
 */
export const DEFAULT_EMBEDDING_DIMENSIONS = 384;

/**
 * Abstract interface for vector search operations on SQLite databases.
 *
 * Implementations must handle:
 * - Extension/module loading
 * - Virtual table creation
 * - CRUD operations on embeddings
 * - K-nearest neighbor search
 */
export interface VectorSearchAdapter {
  /** Load the vector search extension into the database */
  loadExtension(db: Database.Database): void;

  /** Create the vector storage table */
  createVectorTable(db: Database.Database, dimensions?: number): void;

  /** Insert or update an embedding */
  insertEmbedding(
    db: Database.Database,
    entityName: string,
    embedding: Float32Array,
    dimensions?: number
  ): void;

  /** Delete an embedding */
  deleteEmbedding(db: Database.Database, entityName: string): void;

  /** K-nearest neighbor search */
  knnSearch(
    db: Database.Database,
    queryEmbedding: Float32Array,
    k: number,
    dimensions?: number
  ): KnnSearchResult[];

  /** Get embedding for a specific entity */
  getEmbedding(db: Database.Database, entityName: string): Float32Array | null;

  /** Check if an entity has an embedding */
  hasEmbedding(db: Database.Database, entityName: string): boolean;

  /** Get total count of stored embeddings */
  getEmbeddingCount(db: Database.Database): number;
}
