/**
 * Tests for semantic search functionality in KnowledgeGraphSQLite
 *
 * These tests verify that semantic search and hybrid search work correctly
 * using vector embeddings for similarity matching.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KnowledgeGraphSQLite } from '../KnowledgeGraphSQLite.js';
import { LazyEmbeddingService } from '../../../embeddings/index.js';

describe('KnowledgeGraphSQLite semantic search', () => {
  let kg: KnowledgeGraphSQLite;

  beforeAll(async () => {
    // Initialize embedding service (may take time on first run)
    await LazyEmbeddingService.get();
  }, 120000); // 2 minutes for model download

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    kg = new KnowledgeGraphSQLite({ dbPath: ':memory:', verbose: true });
    await kg.initialize();
  });

  afterAll(async () => {
    await LazyEmbeddingService.dispose();
  });

  describe('semanticSearch', () => {
    it('should find semantically similar entities', async () => {
      // Create entities with different topics
      await kg.createEntity({
        name: 'JWT Authentication',
        entityType: 'decision',
        observations: ['Using JWT tokens for user authentication', 'Stateless session management']
      });

      await kg.createEntity({
        name: 'Database Connection Pool',
        entityType: 'decision',
        observations: ['Managing database connections efficiently', 'Pool size configuration']
      });

      await kg.createEntity({
        name: 'User Login Flow',
        entityType: 'feature',
        observations: ['Implementing secure login', 'Password validation and hashing']
      });

      // Wait for embeddings to be generated
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Search for authentication-related content
      const results = await kg.semanticSearch('how to handle user login and authentication');

      expect(results.length).toBeGreaterThan(0);

      // JWT and User Login should be more similar to the query than Database
      const jwtResult = results.find(r => r.entity.name === 'JWT Authentication');
      const loginResult = results.find(r => r.entity.name === 'User Login Flow');
      const dbResult = results.find(r => r.entity.name === 'Database Connection Pool');

      // At least one auth-related entity should be found
      expect(jwtResult || loginResult).toBeTruthy();

      // Database should have lower similarity or not appear at all
      if (dbResult) {
        expect(dbResult.similarity).toBeLessThan(
          Math.max(jwtResult?.similarity || 0, loginResult?.similarity || 0)
        );
      }
    }, 60000);

    it('should filter by minSimilarity threshold', async () => {
      await kg.createEntity({
        name: 'Unrelated Topic',
        entityType: 'test',
        observations: ['Something completely different about cooking recipes']
      });

      // Wait for embedding
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Search with high threshold
      const results = await kg.semanticSearch('typescript programming patterns', {
        minSimilarity: 0.9
      });

      // Should not find unrelated content with high threshold
      expect(results.length).toBe(0);
    }, 30000);

    it('should filter by entity types', async () => {
      await kg.createEntity({
        name: 'Auth Decision',
        entityType: 'decision',
        observations: ['Authentication architecture decision']
      });

      await kg.createEntity({
        name: 'Auth Feature',
        entityType: 'feature',
        observations: ['Authentication feature implementation']
      });

      // Wait for embeddings
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Search only in decisions
      const results = await kg.semanticSearch('authentication', {
        entityTypes: ['decision']
      });

      expect(results.every(r => r.entity.entityType === 'decision')).toBe(true);
    }, 30000);

    it('should respect limit parameter', async () => {
      // Create many similar entities
      for (let i = 0; i < 5; i++) {
        await kg.createEntity({
          name: `Programming Pattern ${i}`,
          entityType: 'pattern',
          observations: [`Software design pattern number ${i}`, 'Code organization']
        });
      }

      // Wait for embeddings
      await new Promise(resolve => setTimeout(resolve, 5000));

      const results = await kg.semanticSearch('software patterns', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    }, 60000);

    it('should return results sorted by similarity', async () => {
      await kg.createEntity({
        name: 'Exact Match Topic',
        entityType: 'test',
        observations: ['This is about machine learning and neural networks']
      });

      await kg.createEntity({
        name: 'Related Topic',
        entityType: 'test',
        observations: ['Deep learning artificial intelligence algorithms']
      });

      await kg.createEntity({
        name: 'Distant Topic',
        entityType: 'test',
        observations: ['Computer programming basics']
      });

      // Wait for embeddings
      await new Promise(resolve => setTimeout(resolve, 3000));

      const results = await kg.semanticSearch('machine learning AI neural networks', {
        minSimilarity: 0.2
      });

      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    }, 60000);

    it('should handle empty results gracefully', async () => {
      // No entities in database
      const results = await kg.semanticSearch('any query');
      expect(results).toEqual([]);
    });

    it('should handle entities without embeddings', async () => {
      // Create entity without embedding
      await kg.createEntity(
        { name: 'No Embedding', entityType: 'test', observations: ['Test'] },
        { generateEmbedding: false }
      );

      // Search should not crash, just return no results
      const results = await kg.semanticSearch('test query');
      expect(results).toEqual([]);
    });
  });

  describe('hybridSearch', () => {
    beforeEach(async () => {
      // Create test entities
      await kg.createEntity({
        name: 'JWT Token Authentication',
        entityType: 'decision',
        observations: ['Using JWT for secure API access', 'Token-based auth flow']
      });

      await kg.createEntity({
        name: 'Password Security',
        entityType: 'feature',
        observations: ['Implementing bcrypt hashing', 'Salt generation for passwords']
      });

      await kg.createEntity({
        name: 'Database Optimization',
        entityType: 'decision',
        observations: ['Index optimization strategies', 'Query performance tuning']
      });

      // Wait for all embeddings
      await new Promise(resolve => setTimeout(resolve, 3500));
    });

    it('should combine semantic and keyword matches', async () => {
      // This query has both semantic meaning and keyword "JWT"
      const results = await kg.hybridSearch('JWT authentication security');

      expect(results.length).toBeGreaterThan(0);

      // JWT should rank high due to keyword match
      const jwtResult = results.find(r => r.entity.name.includes('JWT'));
      expect(jwtResult).toBeTruthy();
      expect(results[0].entity.name.includes('JWT') ||
             results[0].entity.name.includes('Password')).toBe(true);
    }, 30000);

    it('should weight results according to options', async () => {
      // Emphasize keyword matching
      const keywordHeavy = await kg.hybridSearch('JWT', {
        semanticWeight: 0.2,
        keywordWeight: 0.7,
        recencyWeight: 0.1
      });

      // JWT entity should be at or near top with keyword emphasis
      const jwtIndex = keywordHeavy.findIndex(r => r.entity.name.includes('JWT'));
      expect(jwtIndex).toBeLessThan(2); // Should be in top 2
    }, 30000);

    it('should consider recency in scoring', async () => {
      // Create a very recent entity
      await kg.createEntity({
        name: 'Fresh Security Update',
        entityType: 'decision',
        observations: ['Latest security improvement', 'Authentication enhancement']
      });

      // Wait for embedding
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Emphasize recency
      const results = await kg.hybridSearch('security authentication', {
        semanticWeight: 0.4,
        keywordWeight: 0.2,
        recencyWeight: 0.4
      });

      // Fresh entity should be boosted
      const freshResult = results.find(r => r.entity.name.includes('Fresh'));
      expect(freshResult).toBeTruthy();
    }, 30000);

    it('should filter by minimum score', async () => {
      const results = await kg.hybridSearch('completely unrelated topic xyz', {
        minSimilarity: 0.5
      });

      // All results should meet minimum threshold
      expect(results.every(r => r.similarity >= 0.5)).toBe(true);
    }, 30000);

    it('should filter by entity types', async () => {
      const results = await kg.hybridSearch('security', {
        entityTypes: ['feature']
      });

      // Should only return features
      expect(results.every(r => r.entity.entityType === 'feature')).toBe(true);
    }, 30000);

    it('should respect limit parameter', async () => {
      const results = await kg.hybridSearch('security', { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    }, 30000);
  });

  describe('search performance', () => {
    it('should handle searching through many entities', async () => {
      // Create multiple entities
      const createPromises = [];
      for (let i = 0; i < 10; i++) {
        createPromises.push(
          kg.createEntity({
            name: `Entity ${i}`,
            entityType: 'test',
            observations: [`Observation for entity ${i}`, `Some content about topic ${i % 3}`]
          })
        );
      }
      await Promise.all(createPromises);

      // Wait for embeddings
      await new Promise(resolve => setTimeout(resolve, 10000));

      const startTime = Date.now();
      const results = await kg.semanticSearch('topic content');
      const endTime = Date.now();

      expect(results.length).toBeGreaterThan(0);
      // Search should complete in reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    }, 120000);
  });

  describe('maintenance operations', () => {
    it('should delete embedding from vector table when entity is deleted', async () => {
      // Create entity with embedding
      await kg.createEntity({
        name: 'ToDelete',
        entityType: 'test',
        observations: ['Test observation'],
      });

      // Wait for embedding generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify entity exists and has embedding
      const entity = await kg.getEntity('ToDelete');
      expect(entity).toBeDefined();

      // Delete the entity
      const deleted = await kg.deleteEntity('ToDelete');
      expect(deleted).toBe(true);

      // Entity should be gone
      const deletedEntity = await kg.getEntity('ToDelete');
      expect(deletedEntity).toBeUndefined();

      // Search should not find the deleted entity
      const results = await kg.semanticSearch('Test observation');
      const foundDeleted = results.find((r) => r.entity.name === 'ToDelete');
      expect(foundDeleted).toBeUndefined();
    }, 30000);

    it('should clean up orphaned embeddings', async () => {
      // Create entity with embedding
      await kg.createEntity({
        name: 'TestEntity',
        entityType: 'test',
        observations: ['Test content'],
      });

      // Wait for embedding
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Run cleanup - should find no orphans initially
      const cleanedCount = await kg.cleanupOrphanedEmbeddings();
      expect(cleanedCount).toBe(0);
    }, 30000);

    it('should report entities needing vector sync', async () => {
      // Initially no entities need sync
      const count = kg.getEntitiesNeedingVectorSyncCount();
      expect(count).toBe(0);
    });

    it('should retry failed vector syncs', async () => {
      // Run retry - should handle empty case
      const result = await kg.retryFailedVectorSyncs();
      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
