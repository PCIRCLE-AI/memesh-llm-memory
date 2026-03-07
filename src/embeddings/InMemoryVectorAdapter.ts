/**
 * InMemoryVectorAdapter - Pure TypeScript vector adapter for testing
 *
 * Uses in-memory Map + brute-force cosine similarity.
 * NO native dependencies required (no sqlite-vec).
 * Enables tests without native module compilation.
 */

import type Database from 'better-sqlite3';
import type { VectorSearchAdapter, KnnSearchResult } from './VectorSearchAdapter.js';
import { DEFAULT_EMBEDDING_DIMENSIONS } from './VectorSearchAdapter.js';

export class InMemoryVectorAdapter implements VectorSearchAdapter {
  private vectors = new Map<string, Float32Array>();

  loadExtension(_db: Database.Database): void {
    /* no-op for in-memory adapter */
  }

  createVectorTable(_db: Database.Database, _dimensions?: number): void {
    /* no-op for in-memory adapter */
  }

  insertEmbedding(
    _db: Database.Database,
    entityName: string,
    embedding: Float32Array,
    dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS
  ): void {
    if (embedding.length !== dimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${dimensions}, got ${embedding.length}. Entity: ${entityName}`
      );
    }
    this.vectors.set(entityName, new Float32Array(embedding));
  }

  deleteEmbedding(_db: Database.Database, entityName: string): void {
    this.vectors.delete(entityName);
  }

  knnSearch(
    _db: Database.Database,
    queryEmbedding: Float32Array,
    k: number,
    dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS
  ): KnnSearchResult[] {
    if (queryEmbedding.length !== dimensions) {
      throw new Error(
        `Invalid query embedding dimensions: expected ${dimensions}, got ${queryEmbedding.length}`
      );
    }

    const results: KnnSearchResult[] = [];
    for (const [name, vec] of this.vectors) {
      results.push({
        entityName: name,
        distance: this.cosineDistance(queryEmbedding, vec),
      });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  getEmbedding(_db: Database.Database, entityName: string): Float32Array | null {
    const vec = this.vectors.get(entityName);
    if (!vec) return null;
    return new Float32Array(vec);
  }

  hasEmbedding(_db: Database.Database, entityName: string): boolean {
    return this.vectors.has(entityName);
  }

  getEmbeddingCount(_db: Database.Database): number {
    return this.vectors.size;
  }

  private cosineDistance(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 1;
    return 1 - dot / denom;
  }
}
