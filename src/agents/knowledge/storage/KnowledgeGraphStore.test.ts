import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraphStore } from './KnowledgeGraphStore';
import { Entity, Relation } from '../types';
import fs from 'fs';

describe('KnowledgeGraphStore', () => {
  let store: KnowledgeGraphStore;
  const testDbPath = './test-knowledge-graph.db';

  beforeEach(async () => {
    // Remove test DB if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    store = new KnowledgeGraphStore(testDbPath);
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Entity Operations', () => {
    it('should create and retrieve entity', async () => {
      const entity: Entity = {
        name: 'Test Entity',
        entityType: 'concept',
        observations: ['observation 1', 'observation 2'],
      };

      await store.createEntity(entity);
      const retrieved = await store.getEntity('Test Entity');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Entity');
      expect(retrieved?.entityType).toBe('concept');
      expect(retrieved?.observations).toEqual(['observation 1', 'observation 2']);
    });

    it('should update existing entity', async () => {
      const entity: Entity = {
        name: 'Update Test',
        entityType: 'concept',
        observations: ['old observation'],
      };

      await store.createEntity(entity);

      entity.observations.push('new observation');
      await store.updateEntity(entity);

      const retrieved = await store.getEntity('Update Test');
      expect(retrieved?.observations).toHaveLength(2);
      expect(retrieved?.observations).toContain('new observation');
    });

    it('should delete entity', async () => {
      const entity: Entity = {
        name: 'Delete Test',
        entityType: 'concept',
        observations: ['test'],
      };

      await store.createEntity(entity);
      await store.deleteEntity('Delete Test');

      const retrieved = await store.getEntity('Delete Test');
      expect(retrieved).toBeNull();
    });

    it('should search entities by query', async () => {
      await store.createEntity({
        name: 'JavaScript Tutorial',
        entityType: 'document',
        observations: ['Learn JavaScript basics'],
      });

      await store.createEntity({
        name: 'Python Guide',
        entityType: 'document',
        observations: ['Python programming guide'],
      });

      const results = await store.searchEntities('JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('JavaScript Tutorial');
    });
  });

  describe('Relation Operations', () => {
    beforeEach(async () => {
      // Create entities for relations
      await store.createEntity({
        name: 'Entity A',
        entityType: 'concept',
        observations: ['test'],
      });
      await store.createEntity({
        name: 'Entity B',
        entityType: 'concept',
        observations: ['test'],
      });
    });

    it('should create and retrieve relation', async () => {
      const relation: Relation = {
        from: 'Entity A',
        to: 'Entity B',
        relationType: 'depends_on',
      };

      await store.createRelation(relation);
      const relations = await store.getRelations('Entity A');

      expect(relations).toHaveLength(1);
      expect(relations[0].from).toBe('Entity A');
      expect(relations[0].to).toBe('Entity B');
      expect(relations[0].relationType).toBe('depends_on');
    });

    it('should delete relation', async () => {
      const relation: Relation = {
        from: 'Entity A',
        to: 'Entity B',
        relationType: 'depends_on',
      };

      await store.createRelation(relation);
      await store.deleteRelation('Entity A', 'Entity B', 'depends_on');

      const relations = await store.getRelations('Entity A');
      expect(relations).toHaveLength(0);
    });

    it('should get all relations for entity', async () => {
      await store.createEntity({
        name: 'Entity C',
        entityType: 'concept',
        observations: ['test'],
      });

      await store.createRelation({
        from: 'Entity A',
        to: 'Entity B',
        relationType: 'depends_on',
      });

      await store.createRelation({
        from: 'Entity A',
        to: 'Entity C',
        relationType: 'related_to',
      });

      const relations = await store.getRelations('Entity A');
      expect(relations).toHaveLength(2);
    });
  });

  describe('Persistence', () => {
    it('should persist data across store instances', async () => {
      // Create data
      await store.createEntity({
        name: 'Persistent Entity',
        entityType: 'concept',
        observations: ['persisted'],
      });

      // Close and reopen
      await store.close();
      store = new KnowledgeGraphStore(testDbPath);
      await store.initialize();

      // Verify data persisted
      const retrieved = await store.getEntity('Persistent Entity');
      expect(retrieved).toBeDefined();
      expect(retrieved?.observations).toContain('persisted');
    });
  });

  describe('Embedding Operations', () => {
    beforeEach(async () => {
      // Run migration to add embedding columns
      await store.migrateEmbeddingColumns();
    });

    it('should update and retrieve entity embedding', async () => {
      // Create entity
      await store.createEntity({
        name: 'Embedding Test',
        entityType: 'concept',
        observations: ['test observation'],
      });

      // Create a test embedding (384 dimensions for all-MiniLM-L6-v2)
      const embedding = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        embedding[i] = Math.random();
      }

      // Update embedding
      await store.updateEntityEmbedding('Embedding Test', embedding);

      // Retrieve embedding
      const retrieved = await store.getEntityEmbedding('Embedding Test');

      expect(retrieved).not.toBeNull();
      expect(retrieved).toBeInstanceOf(Float32Array);
      expect(retrieved?.length).toBe(384);

      // Verify values match (within floating point tolerance)
      for (let i = 0; i < 384; i++) {
        expect(retrieved![i]).toBeCloseTo(embedding[i], 5);
      }
    });

    it('should return null for entity without embedding', async () => {
      await store.createEntity({
        name: 'No Embedding',
        entityType: 'concept',
        observations: ['test'],
      });

      const embedding = await store.getEntityEmbedding('No Embedding');
      expect(embedding).toBeNull();
    });

    it('should get entities without embeddings', async () => {
      // Create entities
      await store.createEntity({
        name: 'Entity With Embedding',
        entityType: 'concept',
        observations: ['has embedding'],
      });
      await store.createEntity({
        name: 'Entity Without Embedding 1',
        entityType: 'concept',
        observations: ['no embedding'],
      });
      await store.createEntity({
        name: 'Entity Without Embedding 2',
        entityType: 'concept',
        observations: ['no embedding'],
      });

      // Add embedding to one entity
      const embedding = new Float32Array(384).fill(0.5);
      await store.updateEntityEmbedding('Entity With Embedding', embedding);

      // Get entities without embeddings
      const entitiesWithout = await store.getEntitiesWithoutEmbeddings();
      expect(entitiesWithout.length).toBe(2);
      expect(entitiesWithout.map(e => e.name)).toContain('Entity Without Embedding 1');
      expect(entitiesWithout.map(e => e.name)).toContain('Entity Without Embedding 2');
    });

    it('should respect limit in getEntitiesWithoutEmbeddings', async () => {
      // Create 3 entities without embeddings
      for (let i = 1; i <= 3; i++) {
        await store.createEntity({
          name: `Entity ${i}`,
          entityType: 'concept',
          observations: ['test'],
        });
      }

      const limited = await store.getEntitiesWithoutEmbeddings(2);
      expect(limited.length).toBe(2);
    });

    it('should get embedding stats', async () => {
      // Create entities
      await store.createEntity({
        name: 'With Embedding',
        entityType: 'concept',
        observations: ['test'],
      });
      await store.createEntity({
        name: 'Without Embedding',
        entityType: 'concept',
        observations: ['test'],
      });

      // Add embedding to one
      const embedding = new Float32Array(384).fill(0.5);
      await store.updateEntityEmbedding('With Embedding', embedding);

      // Check stats
      const stats = await store.getEmbeddingStats();
      expect(stats.withEmbeddings).toBe(1);
      expect(stats.withoutEmbeddings).toBe(1);
      expect(stats.total).toBe(2);
    });

    it('should bulk update embeddings', async () => {
      // Create entities
      await store.createEntity({
        name: 'Bulk Entity 1',
        entityType: 'concept',
        observations: ['test'],
      });
      await store.createEntity({
        name: 'Bulk Entity 2',
        entityType: 'concept',
        observations: ['test'],
      });

      // Bulk update
      const embeddings = [
        { entityName: 'Bulk Entity 1', embedding: new Float32Array(384).fill(0.1) },
        { entityName: 'Bulk Entity 2', embedding: new Float32Array(384).fill(0.2) },
      ];
      await store.bulkUpdateEmbeddings(embeddings);

      // Verify
      const emb1 = await store.getEntityEmbedding('Bulk Entity 1');
      const emb2 = await store.getEntityEmbedding('Bulk Entity 2');

      expect(emb1).not.toBeNull();
      expect(emb2).not.toBeNull();
      expect(emb1![0]).toBeCloseTo(0.1, 5);
      expect(emb2![0]).toBeCloseTo(0.2, 5);
    });

    it('should make migration idempotent', async () => {
      // Run migration multiple times - should not throw
      await store.migrateEmbeddingColumns();
      await store.migrateEmbeddingColumns();
      await store.migrateEmbeddingColumns();

      // Create entity and add embedding to verify columns work
      await store.createEntity({
        name: 'Idempotent Test',
        entityType: 'concept',
        observations: ['test'],
      });

      const embedding = new Float32Array(384).fill(0.5);
      await store.updateEntityEmbedding('Idempotent Test', embedding);

      const retrieved = await store.getEntityEmbedding('Idempotent Test');
      expect(retrieved).not.toBeNull();
    });
  });
});
