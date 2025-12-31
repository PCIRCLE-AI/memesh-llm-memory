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
});
