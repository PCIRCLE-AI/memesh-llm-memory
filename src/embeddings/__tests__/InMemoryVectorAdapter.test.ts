import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { InMemoryVectorAdapter } from '../InMemoryVectorAdapter.js';
import type { VectorSearchAdapter } from '../VectorSearchAdapter.js';

describe('InMemoryVectorAdapter', () => {
  let db: Database.Database;
  let adapter: InMemoryVectorAdapter;

  beforeEach(() => {
    db = new Database(':memory:');
    adapter = new InMemoryVectorAdapter();
  });

  it('should implement VectorSearchAdapter interface', () => {
    const iface: VectorSearchAdapter = adapter;
    expect(iface.loadExtension).toBeDefined();
    expect(iface.createVectorTable).toBeDefined();
    expect(iface.insertEmbedding).toBeDefined();
    expect(iface.deleteEmbedding).toBeDefined();
    expect(iface.knnSearch).toBeDefined();
    expect(iface.getEmbedding).toBeDefined();
    expect(iface.hasEmbedding).toBeDefined();
    expect(iface.getEmbeddingCount).toBeDefined();
  });

  it('should have loadExtension and createVectorTable as no-ops', () => {
    expect(() => adapter.loadExtension(db)).not.toThrow();
    expect(() => adapter.createVectorTable(db, 384)).not.toThrow();
  });

  it('should insert and retrieve embedding', () => {
    const embedding = new Float32Array(384).fill(0.1);
    adapter.insertEmbedding(db, 'test-entity', embedding);
    expect(adapter.hasEmbedding(db, 'test-entity')).toBe(true);
    const retrieved = adapter.getEmbedding(db, 'test-entity');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.length).toBe(384);
    // Should be a copy, not the same reference
    expect(retrieved).not.toBe(embedding);
    // Values should match
    for (let i = 0; i < 384; i++) {
      expect(retrieved![i]).toBeCloseTo(embedding[i]);
    }
  });

  it('should overwrite existing embedding on re-insert', () => {
    const embedding1 = new Float32Array(384).fill(0.1);
    const embedding2 = new Float32Array(384).fill(0.9);
    adapter.insertEmbedding(db, 'entity', embedding1);
    adapter.insertEmbedding(db, 'entity', embedding2);
    expect(adapter.getEmbeddingCount(db)).toBe(1);
    const retrieved = adapter.getEmbedding(db, 'entity');
    expect(retrieved![0]).toBeCloseTo(0.9);
  });

  it('should perform KNN search', () => {
    const embedding = new Float32Array(384).fill(0.1);
    adapter.insertEmbedding(db, 'test-entity', embedding);
    const query = new Float32Array(384).fill(0.1);
    const results = adapter.knnSearch(db, query, 5);
    expect(results.length).toBe(1);
    expect(results[0].entityName).toBe('test-entity');
    expect(typeof results[0].distance).toBe('number');
    // Identical vectors should have distance ~0
    expect(results[0].distance).toBeCloseTo(0, 5);
  });

  it('should return results sorted by distance (most similar first)', () => {
    // Insert vectors with different similarities to query
    const query = new Float32Array(384).fill(1.0);

    const similar = new Float32Array(384).fill(0.9);
    const lessSimilar = new Float32Array(384).fill(0.5);
    const dissimilar = new Float32Array(384);
    dissimilar[0] = 1.0; // Only one dimension set

    adapter.insertEmbedding(db, 'similar', similar);
    adapter.insertEmbedding(db, 'less-similar', lessSimilar);
    adapter.insertEmbedding(db, 'dissimilar', dissimilar);

    const results = adapter.knnSearch(db, query, 3);
    expect(results.length).toBe(3);
    // similar and less-similar are both uniform vectors, so both have distance 0 to uniform query
    // dissimilar has only one dimension, so it should be furthest
    expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
    expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
  });

  it('should limit KNN results to k', () => {
    for (let i = 0; i < 10; i++) {
      const embedding = new Float32Array(384).fill(i * 0.1);
      adapter.insertEmbedding(db, `entity-${i}`, embedding);
    }
    const query = new Float32Array(384).fill(0.5);
    const results = adapter.knnSearch(db, query, 3);
    expect(results.length).toBe(3);
  });

  it('should delete embedding', () => {
    const embedding = new Float32Array(384).fill(0.1);
    adapter.insertEmbedding(db, 'test-entity', embedding);
    expect(adapter.hasEmbedding(db, 'test-entity')).toBe(true);
    adapter.deleteEmbedding(db, 'test-entity');
    expect(adapter.hasEmbedding(db, 'test-entity')).toBe(false);
    expect(adapter.getEmbedding(db, 'test-entity')).toBeNull();
  });

  it('should not throw when deleting non-existent embedding', () => {
    expect(() => adapter.deleteEmbedding(db, 'non-existent')).not.toThrow();
  });

  it('should report correct count', () => {
    expect(adapter.getEmbeddingCount(db)).toBe(0);
    const embedding = new Float32Array(384).fill(0.2);
    adapter.insertEmbedding(db, 'entity-a', embedding);
    adapter.insertEmbedding(db, 'entity-b', embedding);
    expect(adapter.getEmbeddingCount(db)).toBe(2);
    adapter.deleteEmbedding(db, 'entity-a');
    expect(adapter.getEmbeddingCount(db)).toBe(1);
  });

  it('should reject wrong dimensions on insert', () => {
    const badEmbedding = new Float32Array(100).fill(0.1);
    expect(() => adapter.insertEmbedding(db, 'bad', badEmbedding)).toThrow(/dimensions/i);
  });

  it('should reject wrong dimensions on knnSearch', () => {
    const badQuery = new Float32Array(100).fill(0.1);
    expect(() => adapter.knnSearch(db, badQuery, 5)).toThrow(/dimensions/i);
  });

  it('should return empty results for KNN search with no embeddings', () => {
    const query = new Float32Array(384).fill(0.1);
    const results = adapter.knnSearch(db, query, 5);
    expect(results).toEqual([]);
  });

  it('should handle zero vector correctly in cosine distance', () => {
    const zeroVec = new Float32Array(384).fill(0);
    adapter.insertEmbedding(db, 'zero', zeroVec);
    const query = new Float32Array(384).fill(0.1);
    const results = adapter.knnSearch(db, query, 1);
    expect(results.length).toBe(1);
    // Zero vector should have distance 1 (max cosine distance)
    expect(results[0].distance).toBeCloseTo(1, 5);
  });
});
