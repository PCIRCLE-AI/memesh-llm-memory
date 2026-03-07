import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteVecAdapter } from '../SqliteVecAdapter.js';
import type { VectorSearchAdapter } from '../VectorSearchAdapter.js';

describe('SqliteVecAdapter', () => {
  let db: Database.Database;
  let adapter: VectorSearchAdapter;

  beforeAll(() => {
    db = new Database(':memory:');
    adapter = new SqliteVecAdapter();
  });

  afterAll(() => {
    db.close();
  });

  it('should implement VectorSearchAdapter interface', () => {
    expect(adapter.loadExtension).toBeDefined();
    expect(adapter.createVectorTable).toBeDefined();
    expect(adapter.insertEmbedding).toBeDefined();
    expect(adapter.deleteEmbedding).toBeDefined();
    expect(adapter.knnSearch).toBeDefined();
    expect(adapter.getEmbedding).toBeDefined();
    expect(adapter.hasEmbedding).toBeDefined();
    expect(adapter.getEmbeddingCount).toBeDefined();
  });

  it('should load extension and create table without error', () => {
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
  });

  it('should perform KNN search', () => {
    const query = new Float32Array(384).fill(0.1);
    const results = adapter.knnSearch(db, query, 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].entityName).toBe('test-entity');
    expect(typeof results[0].distance).toBe('number');
  });

  it('should delete embedding', () => {
    adapter.deleteEmbedding(db, 'test-entity');
    expect(adapter.hasEmbedding(db, 'test-entity')).toBe(false);
  });

  it('should report correct count', () => {
    const embedding = new Float32Array(384).fill(0.2);
    adapter.insertEmbedding(db, 'entity-a', embedding);
    adapter.insertEmbedding(db, 'entity-b', embedding);
    expect(adapter.getEmbeddingCount(db)).toBe(2);
  });

  it('should reject wrong dimensions', () => {
    const badEmbedding = new Float32Array(100).fill(0.1);
    expect(() => adapter.insertEmbedding(db, 'bad', badEmbedding)).toThrow(/dimensions/i);
  });
});
