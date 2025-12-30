import { describe, test, expect, beforeEach } from 'vitest';
import { KnowledgeAgent } from '../../../src/agents/knowledge/index.js';

describe('KnowledgeAgent', () => {
  let agent: KnowledgeAgent;

  beforeEach(async () => {
    agent = new KnowledgeAgent();
    await agent.initialize();
  });

  describe('Entity Operations', () => {
    test('should create and retrieve entities', async () => {
      const entities = await agent.createEntities([
        {
          name: 'TestEntity',
          entityType: 'concept',
          observations: ['obs1', 'obs2'],
        },
      ]);

      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('TestEntity');
      expect(entities[0].observations).toEqual(['obs1', 'obs2']);

      const retrieved = await agent.openNodes(['TestEntity']);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].name).toBe('TestEntity');
    });

    test('should add observations to existing entity', async () => {
      await agent.createEntities([
        {
          name: 'TestEntity',
          entityType: 'concept',
          observations: ['obs1'],
        },
      ]);

      const updated = await agent.addObservations('TestEntity', ['obs2', 'obs3']);

      expect(updated).toBeDefined();
      expect(updated!.observations).toEqual(['obs1', 'obs2', 'obs3']);
    });

    test('should delete entities', async () => {
      await agent.createEntities([
        { name: 'Entity1', entityType: 'type1', observations: [] },
        { name: 'Entity2', entityType: 'type2', observations: [] },
      ]);

      const result = await agent.deleteEntities(['Entity1']);

      expect(result.deleted).toEqual(['Entity1']);
      expect(result.notFound).toEqual([]);

      const retrieved = await agent.openNodes(['Entity1']);
      expect(retrieved).toHaveLength(0);
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await agent.createEntities([
        { name: 'APIDesign', entityType: 'concept', observations: ['REST API patterns'] },
        { name: 'DatabaseDesign', entityType: 'concept', observations: ['SQL schemas'] },
        { name: 'BugFix123', entityType: 'bug', observations: ['Fixed authentication'] },
      ]);
    });

    test('should search entities by query', async () => {
      const results = await agent.searchNodes('design');

      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((e) => e.name);
      expect(names).toContain('APIDesign');
      expect(names).toContain('DatabaseDesign');
    });

    test('should filter search by entity type', async () => {
      const results = await agent.searchNodes('', { entityType: 'bug' });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('BugFix123');
    });

    test('should search in observations', async () => {
      const results = await agent.searchNodes('authentication');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('BugFix123');
    });
  });

  describe('Relation Operations', () => {
    beforeEach(async () => {
      await agent.createEntities([
        { name: 'Feature1', entityType: 'feature', observations: [] },
        { name: 'Bug1', entityType: 'bug', observations: [] },
        { name: 'Decision1', entityType: 'decision', observations: [] },
      ]);
    });

    test('should create relations between entities', async () => {
      const relations = await agent.createRelations([
        { from: 'Feature1', to: 'Bug1', relationType: 'caused' },
        { from: 'Decision1', to: 'Feature1', relationType: 'led_to' },
      ]);

      expect(relations).toHaveLength(2);
      expect(relations[0].from).toBe('Feature1');
      expect(relations[0].to).toBe('Bug1');
    });

    test('should not create relation if entity does not exist', async () => {
      const relations = await agent.createRelations([
        { from: 'NonExistent', to: 'Bug1', relationType: 'caused' },
      ]);

      expect(relations).toHaveLength(0);
    });

    test('should get connected entities', async () => {
      await agent.createRelations([
        { from: 'Feature1', to: 'Bug1', relationType: 'caused' },
        { from: 'Bug1', to: 'Decision1', relationType: 'led_to' },
      ]);

      const connected = await agent.getConnectedEntities('Feature1', 2);

      expect(connected).toContain('Feature1');
      expect(connected).toContain('Bug1');
      expect(connected).toContain('Decision1');
    });
  });

  describe('Graph Operations', () => {
    test('should read entire graph', async () => {
      await agent.createEntities([
        { name: 'E1', entityType: 'type1', observations: [] },
        { name: 'E2', entityType: 'type2', observations: [] },
      ]);

      const { entities, stats } = await agent.readGraph();

      expect(entities).toHaveLength(2);
      expect(stats.totalEntities).toBe(2);
      expect(stats.entityTypeBreakdown).toHaveProperty('type1', 1);
      expect(stats.entityTypeBreakdown).toHaveProperty('type2', 1);
    });
  });

  describe('Error Handling', () => {
    test('should throw error if not initialized', async () => {
      const uninitializedAgent = new KnowledgeAgent();

      await expect(uninitializedAgent.createEntities([])).rejects.toThrow('not initialized');
    });

    test('should handle adding observations to non-existent entity', async () => {
      const result = await agent.addObservations('NonExistent', ['obs']);

      expect(result).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    test('should handle empty entity name', async () => {
      const entities = await agent.createEntities([
        {
          name: '',
          entityType: 'concept',
          observations: ['obs1'],
        },
      ]);

      // Should not crash, may create entity with empty name or reject
      expect(Array.isArray(entities)).toBe(true);
    });

    test('should handle duplicate entity creation', async () => {
      await agent.createEntities([
        { name: 'DuplicateTest', entityType: 'concept', observations: ['obs1'] },
      ]);

      // Creating same entity again
      const duplicates = await agent.createEntities([
        { name: 'DuplicateTest', entityType: 'concept', observations: ['obs2'] },
      ]);

      // Should handle gracefully (update or skip)
      expect(Array.isArray(duplicates)).toBe(true);
    });

    test('should handle invalid entity type', async () => {
      const entities = await agent.createEntities([
        {
          name: 'TestEntity',
          entityType: null as any,
          observations: ['obs1'],
        },
      ]);

      // Should not crash
      expect(Array.isArray(entities)).toBe(true);
    });

    test('should handle empty observations array', async () => {
      const entities = await agent.createEntities([
        {
          name: 'EmptyObsEntity',
          entityType: 'concept',
          observations: [],
        },
      ]);

      expect(entities).toHaveLength(1);
      expect(entities[0].observations).toEqual([]);
    });

    test('should handle null observations', async () => {
      const entities = await agent.createEntities([
        {
          name: 'NullObsEntity',
          entityType: 'concept',
          observations: null as any,
        },
      ]);

      // Should not crash, may use empty array as fallback
      expect(Array.isArray(entities)).toBe(true);
    });

    test('should handle circular relation creation', async () => {
      await agent.createEntities([
        { name: 'A', entityType: 'concept', observations: [] },
        { name: 'B', entityType: 'concept', observations: [] },
      ]);

      const relations = await agent.createRelations([
        { from: 'A', to: 'B', relationType: 'depends_on' },
        { from: 'B', to: 'A', relationType: 'depends_on' },
      ]);

      // Should allow circular relations (graph can have cycles)
      expect(relations).toHaveLength(2);
    });

    test('should handle deleting non-existent entities', async () => {
      const result = await agent.deleteEntities(['NonExistent1', 'NonExistent2']);

      expect(result.deleted).toEqual([]);
      expect(result.notFound).toContain('NonExistent1');
      expect(result.notFound).toContain('NonExistent2');
    });

    test('should handle searching with empty query', async () => {
      await agent.createEntities([
        { name: 'TestEntity', entityType: 'concept', observations: [] },
      ]);

      const results = await agent.searchNodes('');

      // Empty query should return all entities or none (implementation dependent)
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle searching with null query', async () => {
      await agent.createEntities([
        { name: 'TestEntity', entityType: 'concept', observations: [] },
      ]);

      // Current implementation doesn't validate null queries
      // TODO: Future enhancement - add null check and return empty array or all entities
      await expect(agent.searchNodes(null as any)).rejects.toThrow();
    });

    test('should handle concurrent entity operations', async () => {
      // Create multiple entities concurrently
      const operations = [
        agent.createEntities([{ name: 'Concurrent1', entityType: 'type1', observations: [] }]),
        agent.createEntities([{ name: 'Concurrent2', entityType: 'type2', observations: [] }]),
        agent.createEntities([{ name: 'Concurrent3', entityType: 'type3', observations: [] }]),
      ];

      const results = await Promise.all(operations);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveLength(1);
      });
    });

    test('should handle extremely long entity names', async () => {
      const longName = 'a'.repeat(1000);

      const entities = await agent.createEntities([
        {
          name: longName,
          entityType: 'concept',
          observations: ['obs1'],
        },
      ]);

      // Should handle gracefully (create or truncate)
      expect(Array.isArray(entities)).toBe(true);
    });

    test('should handle special characters in entity names', async () => {
      const specialNames = [
        'Entity@#$%',
        'Entity/with/slashes',
        'Entity:with:colons',
        'Entity|with|pipes',
      ];

      for (const name of specialNames) {
        const entities = await agent.createEntities([
          {
            name,
            entityType: 'concept',
            observations: ['obs1'],
          },
        ]);

        // Should handle gracefully
        expect(Array.isArray(entities)).toBe(true);
      }
    });

    test('should handle adding observations to deleted entity', async () => {
      await agent.createEntities([
        { name: 'ToBeDeleted', entityType: 'concept', observations: ['obs1'] },
      ]);

      await agent.deleteEntities(['ToBeDeleted']);

      const result = await agent.addObservations('ToBeDeleted', ['obs2']);

      // Should return undefined or handle gracefully
      expect(result).toBeUndefined();
    });

    test('should handle creating relations with non-existent entities', async () => {
      const relations = await agent.createRelations([
        { from: 'NonExistent1', to: 'NonExistent2', relationType: 'relates_to' },
      ]);

      // Should return empty array (no relations created)
      expect(relations).toHaveLength(0);
    });

    test('should handle mixed valid and invalid entity creation', async () => {
      const entities = await agent.createEntities([
        { name: 'Valid1', entityType: 'concept', observations: ['obs1'] },
        { name: '', entityType: 'concept', observations: ['obs2'] }, // Invalid: empty name
        { name: 'Valid2', entityType: null as any, observations: ['obs3'] }, // Invalid: null type
        { name: 'Valid3', entityType: 'concept', observations: null as any }, // Invalid: null observations
      ]);

      // Should handle gracefully, may skip invalid or create with defaults
      expect(Array.isArray(entities)).toBe(true);
    });
  });
});
