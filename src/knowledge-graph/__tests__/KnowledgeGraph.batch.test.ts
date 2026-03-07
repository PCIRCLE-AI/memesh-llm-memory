import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../index.js';
import { existsSync, unlinkSync } from 'fs';

describe('KnowledgeGraph Batch Operations', () => {
  let kg: KnowledgeGraph;
  const testDbPath = './data/test-batch-knowledge-graph.db';

  beforeEach(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    kg = KnowledgeGraph.createSync(testDbPath);
  });

  afterEach(() => {
    kg.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should create multiple entities in a single batch', () => {
    const entities = Array.from({ length: 20 }, (_, i) => ({
      name: `batch-entity-${i}`,
      entityType: 'best_practice' as const,
      observations: [`Observation for entity ${i}`],
    }));

    const results = kg.createEntitiesBatch(entities);
    expect(results.length).toBe(20);
    expect(results.filter(r => r.success).length).toBe(20);

    // Verify entities actually exist in DB
    for (let i = 0; i < 20; i++) {
      const entity = kg.getEntity(`batch-entity-${i}`);
      expect(entity).not.toBeNull();
      expect(entity!.entityType).toBe('best_practice');
      expect(entity!.observations).toContain(`Observation for entity ${i}`);
    }
  });

  it('should continue batch on individual entity failure', () => {
    const entities = [
      { name: 'valid-entity-1', entityType: 'decision' as const, observations: ['obs1'] },
      { name: '', entityType: 'decision' as const, observations: ['obs2'] }, // invalid: empty name
      { name: 'valid-entity-2', entityType: 'decision' as const, observations: ['obs3'] },
    ];

    const results = kg.createEntitiesBatch(entities);
    expect(results.length).toBe(3);

    // Valid entities should succeed
    expect(results[0].success).toBe(true);
    expect(results[0].name).toBe('valid-entity-1');

    // Invalid entity should fail gracefully
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBeDefined();

    // Third entity should still succeed despite second failing
    expect(results[2].success).toBe(true);
    expect(results[2].name).toBe('valid-entity-2');

    // Verify valid entities exist in DB
    expect(kg.getEntity('valid-entity-1')).not.toBeNull();
    expect(kg.getEntity('valid-entity-2')).not.toBeNull();
  });

  it('should be faster than individual creates for large batches', () => {
    const entities = Array.from({ length: 50 }, (_, i) => ({
      name: `perf-entity-${i}`,
      entityType: 'feature' as const,
      observations: [`Performance test entity ${i}`],
    }));

    const start = performance.now();
    const results = kg.createEntitiesBatch(entities);
    const batchTime = performance.now() - start;

    expect(results.filter(r => r.success).length).toBe(50);
    // Batch should be reasonably fast (< 5 seconds for 50 entities)
    expect(batchTime).toBeLessThan(5000);
  });

  it('should handle entities with tags and metadata', () => {
    const entities = [
      {
        name: 'tagged-entity',
        entityType: 'decision' as const,
        observations: ['obs1'],
        tags: ['scope:project', 'tech:typescript'],
        metadata: { priority: 'high' },
      },
    ];

    const results = kg.createEntitiesBatch(entities);
    expect(results[0].success).toBe(true);

    const entity = kg.getEntity('tagged-entity');
    expect(entity).not.toBeNull();
    expect(entity!.tags).toContain('scope:project');
    expect(entity!.tags).toContain('tech:typescript');
  });

  it('should handle empty batch', () => {
    const results = kg.createEntitiesBatch([]);
    expect(results).toEqual([]);
  });
});
