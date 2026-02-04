import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../index.js';
import { existsSync, unlinkSync } from 'fs';

describe('KnowledgeGraph', () => {
  let kg: KnowledgeGraph;
  const testDbPath = './data/test-knowledge-graph.db';

  beforeEach(async () => {
    // Clean up test database if exists
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    // Use createSync for backward compatibility with synchronous tests
    kg = KnowledgeGraph.createSync(testDbPath);
  });

  afterEach(() => {
    kg.close();
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('deleteEntity', () => {
    it('should delete an entity by name', () => {
      // Create an entity
      kg.createEntity({
        name: 'TestEntity',
        entityType: 'feature',
        observations: ['observation1']
      });

      // Verify it exists
      const beforeDelete = kg.searchEntities({ namePattern: 'TestEntity' });
      expect(beforeDelete).toHaveLength(1);

      // Delete the entity
      kg.deleteEntity('TestEntity');

      // Verify it's gone
      const afterDelete = kg.searchEntities({ namePattern: 'TestEntity' });
      expect(afterDelete).toHaveLength(0);
    });

    it('should delete entity and its relations', () => {
      // Create entities
      kg.createEntity({
        name: 'Entity1',
        entityType: 'feature',
        observations: ['obs1']
      });
      kg.createEntity({
        name: 'Entity2',
        entityType: 'feature',
        observations: ['obs2']
      });

      // Create relation
      kg.createRelation({
        from: 'Entity1',
        to: 'Entity2',
        relationType: 'depends_on'
      });

      // Verify relation exists
      const relationsBeforeDelete = kg.traceRelations('Entity1');
      expect(relationsBeforeDelete).not.toBeNull();
      expect(relationsBeforeDelete!.relations).toHaveLength(1);

      // Delete Entity1
      kg.deleteEntity('Entity1');

      // Entity1 should be gone
      const entity1 = kg.searchEntities({ namePattern: 'Entity1' });
      expect(entity1).toHaveLength(0);

      // Relations involving Entity1 should be gone
      const relationsAfterDelete = kg.traceRelations('Entity1');
      expect(relationsAfterDelete).toBeNull();
    });

    it('should return false when deleting non-existent entity', () => {
      const result = kg.deleteEntity('NonExistent');
      expect(result).toBe(false);
    });
  });

  describe('searchEntities', () => {
    it('should return observations and tags without duplication', () => {
      kg.createEntity({
        name: 'EntityWithTags',
        entityType: 'feature',
        observations: ['alpha', 'beta|||gamma'],
        tags: ['tag-one', 'tag-two'],
      });

      const results = kg.searchEntities({ namePattern: 'EntityWithTags' });

      expect(results).toHaveLength(1);
      expect(results[0].observations).toEqual(['alpha', 'beta|||gamma']);
      expect(results[0].tags).toEqual(['tag-one', 'tag-two']);
    });

    it('should find entities by observation content, not just name', () => {
      // Create entity with specific observation content
      kg.createEntity({
        name: 'MemoryAboutGitWorkflow',
        entityType: 'knowledge',
        observations: [
          'Always use feature branches for development',
          'Never commit directly to main branch',
        ],
        tags: ['git', 'workflow'],
      });

      // Search by observation content (not entity name)
      const resultsByContent = kg.searchEntities({ namePattern: 'feature branches' });
      expect(resultsByContent).toHaveLength(1);
      expect(resultsByContent[0].name).toBe('MemoryAboutGitWorkflow');

      // Search by different observation content
      const resultsByOtherContent = kg.searchEntities({ namePattern: 'main branch' });
      expect(resultsByOtherContent).toHaveLength(1);
      expect(resultsByOtherContent[0].name).toBe('MemoryAboutGitWorkflow');

      // Search by entity name should still work
      const resultsByName = kg.searchEntities({ namePattern: 'GitWorkflow' });
      expect(resultsByName).toHaveLength(1);
      expect(resultsByName[0].name).toBe('MemoryAboutGitWorkflow');
    });
  });
});
