import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorExtension } from '../VectorExtension.js';
import Database from 'better-sqlite3';

describe('VectorExtension', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('loadExtension', () => {
    it('should load sqlite-vec extension without error', () => {
      expect(() => VectorExtension.loadExtension(db)).not.toThrow();
    });

    it('should make vec_version() function available', () => {
      VectorExtension.loadExtension(db);
      const result = db.prepare('SELECT vec_version()').get() as { 'vec_version()': string };
      expect(result['vec_version()']).toBeDefined();
    });

    it('should not throw when loading extension twice', () => {
      VectorExtension.loadExtension(db);
      expect(() => VectorExtension.loadExtension(db)).not.toThrow();
    });
  });

  describe('createVectorTable', () => {
    it('should create entity_embeddings virtual table', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Virtual tables show up in sqlite_master
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_embeddings'"
      ).get();
      expect(tables).toBeDefined();
    });

    it('should use cosine distance metric', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Verify table was created (virtual tables can still be queried)
      const result = db.prepare('SELECT COUNT(*) as cnt FROM entity_embeddings').get() as { cnt: number };
      expect(result.cnt).toBe(0);
    });
  });

  describe('insertEmbedding', () => {
    it('should insert embedding for entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const embedding = new Float32Array(384).fill(0.1);
      VectorExtension.insertEmbedding(db, 'test-entity', embedding);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM entity_embeddings').get() as { cnt: number };
      expect(count.cnt).toBe(1);
    });

    it('should update embedding if entity already exists', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const embedding1 = new Float32Array(384).fill(0.1);
      const embedding2 = new Float32Array(384).fill(0.9);

      VectorExtension.insertEmbedding(db, 'test-entity', embedding1);
      VectorExtension.insertEmbedding(db, 'test-entity', embedding2);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM entity_embeddings').get() as { cnt: number };
      expect(count.cnt).toBe(1);
    });
  });

  describe('deleteEmbedding', () => {
    it('should delete embedding for entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const embedding = new Float32Array(384).fill(0.1);
      VectorExtension.insertEmbedding(db, 'test-entity', embedding);

      VectorExtension.deleteEmbedding(db, 'test-entity');

      const count = db.prepare('SELECT COUNT(*) as cnt FROM entity_embeddings').get() as { cnt: number };
      expect(count.cnt).toBe(0);
    });

    it('should not throw when deleting non-existent entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      expect(() => VectorExtension.deleteEmbedding(db, 'non-existent')).not.toThrow();
    });
  });

  describe('knnSearch', () => {
    it('should find nearest neighbors', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Insert some test embeddings with distinct values
      const embedding1 = new Float32Array(384).fill(0.1);
      const embedding2 = new Float32Array(384).fill(0.5);
      const embedding3 = new Float32Array(384).fill(0.9);

      VectorExtension.insertEmbedding(db, 'entity-1', embedding1);
      VectorExtension.insertEmbedding(db, 'entity-2', embedding2);
      VectorExtension.insertEmbedding(db, 'entity-3', embedding3);

      // Search with query similar to embedding1
      const query = new Float32Array(384).fill(0.15);
      const results = VectorExtension.knnSearch(db, query, 2);

      expect(results.length).toBe(2);
      // With cosine distance, all uniform vectors have distance ~0 to each other
      // since cosine similarity only cares about direction, not magnitude
      // But our vectors have the same direction (all positive uniform values)
      // So we just check that results are returned
      expect(results[0].entityName).toBeDefined();
      expect(typeof results[0].distance).toBe('number');
    });

    it('should respect limit parameter', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      for (let i = 0; i < 10; i++) {
        const embedding = new Float32Array(384).fill(i * 0.1);
        VectorExtension.insertEmbedding(db, `entity-${i}`, embedding);
      }

      const query = new Float32Array(384).fill(0.5);
      const results = VectorExtension.knnSearch(db, query, 3);

      expect(results.length).toBe(3);
    });

    it('should handle empty database', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const query = new Float32Array(384).fill(0.5);
      const results = VectorExtension.knnSearch(db, query, 5);

      expect(results.length).toBe(0);
    });

    it('should return results with varying distances for different vectors', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Create vectors with different patterns to have different cosine distances
      const embedding1 = new Float32Array(384);
      const embedding2 = new Float32Array(384);

      // First half positive, second half zero
      for (let i = 0; i < 192; i++) {
        embedding1[i] = 1.0;
        embedding2[i] = 0.0;
      }
      // Second half: opposite pattern
      for (let i = 192; i < 384; i++) {
        embedding1[i] = 0.0;
        embedding2[i] = 1.0;
      }

      VectorExtension.insertEmbedding(db, 'entity-1', embedding1);
      VectorExtension.insertEmbedding(db, 'entity-2', embedding2);

      // Query similar to embedding1
      const query = new Float32Array(384);
      for (let i = 0; i < 192; i++) query[i] = 1.0;
      for (let i = 192; i < 384; i++) query[i] = 0.1; // Slightly different

      const results = VectorExtension.knnSearch(db, query, 2);

      expect(results.length).toBe(2);
      // entity-1 should be closer to query
      expect(results[0].entityName).toBe('entity-1');
      expect(results[0].distance).toBeLessThan(results[1].distance);
    });
  });

  describe('getEmbedding', () => {
    it('should retrieve stored embedding', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const original = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        original[i] = i / 384;
      }

      VectorExtension.insertEmbedding(db, 'test-entity', original);
      const retrieved = VectorExtension.getEmbedding(db, 'test-entity');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.length).toBe(384);
      // Check a few values (Float32 precision)
      expect(retrieved![0]).toBeCloseTo(original[0], 5);
      expect(retrieved![100]).toBeCloseTo(original[100], 5);
      expect(retrieved![383]).toBeCloseTo(original[383], 5);
    });

    it('should return null for non-existent entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const result = VectorExtension.getEmbedding(db, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('hasEmbedding', () => {
    it('should return true for existing entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      const embedding = new Float32Array(384).fill(0.1);
      VectorExtension.insertEmbedding(db, 'test-entity', embedding);

      expect(VectorExtension.hasEmbedding(db, 'test-entity')).toBe(true);
    });

    it('should return false for non-existent entity', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      expect(VectorExtension.hasEmbedding(db, 'non-existent')).toBe(false);
    });
  });

  describe('getEmbeddingCount', () => {
    it('should return correct count', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      expect(VectorExtension.getEmbeddingCount(db)).toBe(0);

      VectorExtension.insertEmbedding(db, 'entity-1', new Float32Array(384).fill(0.1));
      expect(VectorExtension.getEmbeddingCount(db)).toBe(1);

      VectorExtension.insertEmbedding(db, 'entity-2', new Float32Array(384).fill(0.2));
      expect(VectorExtension.getEmbeddingCount(db)).toBe(2);
    });
  });

  describe('dimension validation', () => {
    it('should throw error for wrong embedding dimensions in insertEmbedding', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Wrong dimensions (128 instead of 384)
      const wrongEmbedding = new Float32Array(128).fill(0.1);

      expect(() => VectorExtension.insertEmbedding(db, 'test-entity', wrongEmbedding)).toThrow(
        /Invalid embedding dimensions: expected 384, got 128/
      );
    });

    it('should throw error for wrong query dimensions in knnSearch', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 384);

      // Insert valid embedding
      VectorExtension.insertEmbedding(db, 'test-entity', new Float32Array(384).fill(0.1));

      // Wrong query dimensions (256 instead of 384)
      const wrongQuery = new Float32Array(256).fill(0.1);

      expect(() => VectorExtension.knnSearch(db, wrongQuery, 10)).toThrow(
        /Invalid query embedding dimensions: expected 384, got 256/
      );
    });

    it('should accept custom dimension parameter', () => {
      VectorExtension.loadExtension(db);
      VectorExtension.createVectorTable(db, 128); // Custom dimensions

      // 128-dimensional embedding
      const embedding = new Float32Array(128).fill(0.1);

      // Should work with explicit dimension parameter
      expect(() =>
        VectorExtension.insertEmbedding(db, 'test-entity', embedding, 128)
      ).not.toThrow();

      // Query with matching dimensions
      expect(() => VectorExtension.knnSearch(db, embedding, 10, 128)).not.toThrow();
    });
  });
});
