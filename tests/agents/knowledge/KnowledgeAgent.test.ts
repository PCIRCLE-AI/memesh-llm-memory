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
});
