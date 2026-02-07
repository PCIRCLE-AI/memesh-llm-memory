/**
 * Tests for auto-embedding functionality in KnowledgeGraphSQLite
 *
 * These tests verify that embeddings are automatically generated
 * when entities are created or updated.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KnowledgeGraphSQLite } from '../KnowledgeGraphSQLite.js';
import { LazyEmbeddingService } from '../../../embeddings/index.js';

describe('KnowledgeGraphSQLite auto-embedding', () => {
  let kg: KnowledgeGraphSQLite;

  beforeAll(async () => {
    // Initialize embedding service (may take time on first run)
    await LazyEmbeddingService.get();
  }, 120000); // 2 minutes for model download

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    kg = new KnowledgeGraphSQLite({ dbPath: ':memory:' });
    await kg.initialize();
  });

  afterAll(async () => {
    await LazyEmbeddingService.dispose();
  });

  describe('createEntity with auto-embedding', () => {
    it('should generate embedding when creating entity', async () => {
      const entity = await kg.createEntity({
        name: 'Test Entity',
        entityType: 'test',
        observations: ['This is a test observation']
      });

      expect(entity.name).toBe('Test Entity');

      // Wait for async embedding generation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const embedding = kg.getEntityEmbedding('Test Entity');
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding?.length).toBe(384);
    }, 30000);

    it('should skip embedding when generateEmbedding=false', async () => {
      const entity = await kg.createEntity(
        { name: 'No Embed Entity', entityType: 'test', observations: [] },
        { generateEmbedding: false }
      );

      expect(entity.name).toBe('No Embed Entity');

      // Wait a bit to ensure no async operation happens
      await new Promise(resolve => setTimeout(resolve, 200));

      const embedding = kg.getEntityEmbedding('No Embed Entity');
      expect(embedding).toBeNull();
    });

    it('should handle multiple entities with embeddings', async () => {
      // Create entities
      await kg.createEntity({
        name: 'Entity 1',
        entityType: 'test',
        observations: ['First observation']
      });

      await kg.createEntity({
        name: 'Entity 2',
        entityType: 'test',
        observations: ['Second observation']
      });

      // Wait for embeddings
      await new Promise(resolve => setTimeout(resolve, 2000));

      const emb1 = kg.getEntityEmbedding('Entity 1');
      const emb2 = kg.getEntityEmbedding('Entity 2');

      expect(emb1).toBeInstanceOf(Float32Array);
      expect(emb2).toBeInstanceOf(Float32Array);

      // Embeddings should be different for different entities
      expect(emb1![0]).not.toEqual(emb2![0]);
    }, 30000);
  });

  describe('updateEntity with embedding regeneration', () => {
    it('should regenerate embedding when observations are added', async () => {
      // Create entity with initial observation
      await kg.createEntity({
        name: 'Obs Test',
        entityType: 'test',
        observations: ['Initial observation']
      });

      // Wait for initial embedding
      await new Promise(resolve => setTimeout(resolve, 1000));

      const emb1 = kg.getEntityEmbedding('Obs Test');
      expect(emb1).toBeInstanceOf(Float32Array);

      // Update with new observation
      await kg.updateEntity('Obs Test', {
        observations: ['Initial observation', 'New important observation about something different']
      });

      // Wait for regenerated embedding
      await new Promise(resolve => setTimeout(resolve, 1000));

      const emb2 = kg.getEntityEmbedding('Obs Test');
      expect(emb2).toBeInstanceOf(Float32Array);

      // Embeddings should be different (new observation changes semantic meaning)
      // Note: They might be similar but not exactly equal
      let areDifferent = false;
      for (let i = 0; i < emb1!.length; i++) {
        if (Math.abs(emb1![i] - emb2![i]) > 0.001) {
          areDifferent = true;
          break;
        }
      }
      expect(areDifferent).toBe(true);
    }, 30000);

    it('should not regenerate embedding when only metadata changes', async () => {
      // Create entity
      await kg.createEntity({
        name: 'Metadata Test',
        entityType: 'test',
        observations: ['Some observation']
      });

      // Wait for initial embedding
      await new Promise(resolve => setTimeout(resolve, 1000));

      const emb1 = kg.getEntityEmbedding('Metadata Test');

      // Update only metadata (not observations)
      await kg.updateEntity('Metadata Test', {
        metadata: { key: 'value' }
      });

      // Short wait
      await new Promise(resolve => setTimeout(resolve, 200));

      const emb2 = kg.getEntityEmbedding('Metadata Test');

      // Embeddings should be identical (metadata doesn't affect embedding)
      expect(emb1).toEqual(emb2);
    }, 30000);
  });

  describe('generateEntityEmbedding', () => {
    it('should generate embedding for existing entity', async () => {
      // Create entity without auto-embedding
      await kg.createEntity(
        { name: 'Manual Embed', entityType: 'test', observations: ['Test observation'] },
        { generateEmbedding: false }
      );

      // Verify no embedding yet
      expect(kg.getEntityEmbedding('Manual Embed')).toBeNull();

      // Manually generate embedding
      await kg.generateEntityEmbedding('Manual Embed');

      // Now should have embedding
      const embedding = kg.getEntityEmbedding('Manual Embed');
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding?.length).toBe(384);
    }, 30000);

    it('should throw error for non-existent entity', async () => {
      await expect(
        kg.generateEntityEmbedding('Non Existent')
      ).rejects.toThrow('Entity not found: Non Existent');
    });
  });

  describe('embedding stats', () => {
    it('should track entities with and without embeddings', async () => {
      // Create entity with embedding
      await kg.createEntity({
        name: 'With Embedding',
        entityType: 'test',
        observations: ['Test']
      });

      // Create entity without embedding
      await kg.createEntity(
        { name: 'Without Embedding', entityType: 'test', observations: ['Test'] },
        { generateEmbedding: false }
      );

      // Wait for embedding generation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = kg.getEmbeddingStats();
      expect(stats.total).toBe(2);
      expect(stats.withEmbeddings).toBe(1);
      expect(stats.withoutEmbeddings).toBe(1);
    }, 30000);
  });
});
