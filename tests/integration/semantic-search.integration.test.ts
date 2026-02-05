/**
 * Semantic Search Integration Tests
 *
 * Tests the full flow of:
 * - Entity creation → Automatic embedding generation → Semantic search
 * - Hybrid search combining semantic + keyword results
 * - Backfill embeddings for existing entities
 *
 * These tests use an in-memory database and run against the actual
 * embedding model (all-MiniLM-L6-v2 ONNX).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KnowledgeGraphSQLite } from '../../src/agents/knowledge/KnowledgeGraphSQLite.js';
import { LazyEmbeddingService } from '../../src/embeddings/index.js';

describe('Semantic Search Integration', () => {
  let kg: KnowledgeGraphSQLite;

  beforeAll(async () => {
    // Use in-memory database for tests
    kg = new KnowledgeGraphSQLite({ dbPath: ':memory:' });
    await kg.initialize();

    // Create test entities with various topics
    const testEntities = [
      {
        name: 'JWT Authentication',
        entityType: 'decision',
        observations: ['Use JWT for stateless API auth', 'Access tokens expire in 15 minutes']
      },
      {
        name: 'OAuth Integration',
        entityType: 'feature',
        observations: ['Add Google OAuth as login option', 'Store refresh tokens securely']
      },
      {
        name: 'Database Indexing',
        entityType: 'optimization',
        observations: ['Add index on user_id column', 'Improved query performance by 80%']
      },
      {
        name: 'React Component Testing',
        entityType: 'practice',
        observations: ['Use React Testing Library', 'Test user interactions, not implementation']
      },
    ];

    for (const entity of testEntities) {
      await kg.createEntity(entity, { generateEmbedding: false });
    }

    // Manually generate embeddings to control timing
    const embeddingService = await LazyEmbeddingService.get();
    for (const entity of testEntities) {
      const text = [entity.name, ...entity.observations].join(' ');
      const embedding = await embeddingService.encode(text);
      kg.updateEntityEmbedding(entity.name, embedding);
    }
  }, 120000); // Allow 2 minutes for model loading

  afterAll(async () => {
    await kg.close();
    await LazyEmbeddingService.dispose();
  });

  describe('Full flow: create entity → embedding → semantic search', () => {
    it('should find auth-related memories for login query', async () => {
      // Use lower minSimilarity to ensure results are returned
      const results = await kg.semanticSearch('how do we handle user login', {
        minSimilarity: 0.1
      });

      expect(results.length).toBeGreaterThan(0);

      // Should find auth-related entities
      const names = results.map(r => r.entity.name);
      const hasAuth = names.some(n => n.includes('JWT') || n.includes('OAuth'));
      expect(hasAuth).toBe(true);
    });

    it('should rank semantically similar results higher', async () => {
      const results = await kg.semanticSearch('authentication security');

      if (results.length >= 2) {
        // First result should be more similar than second
        expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
      }
    });

    it('should filter by minSimilarity', async () => {
      const highThreshold = await kg.semanticSearch('random unrelated query xyz', {
        minSimilarity: 0.9
      });

      // Very high threshold should return no results for unrelated query
      expect(highThreshold.length).toBe(0);
    });

    it('should not rank unrelated content above auth content for auth query', async () => {
      const results = await kg.semanticSearch('how do we handle authentication');

      // Should find auth-related entities in top results
      if (results.length >= 2) {
        const authIndex = results.findIndex(r =>
          r.entity.name.includes('JWT') || r.entity.name.includes('OAuth')
        );
        const dbIndex = results.findIndex(r =>
          r.entity.name.includes('Database')
        );

        // Auth content should rank higher (lower index) than unrelated content
        if (authIndex >= 0 && dbIndex >= 0) {
          expect(authIndex).toBeLessThan(dbIndex);
        }
      }
    });

    it('should respect entity type filter', async () => {
      const results = await kg.semanticSearch('authentication', {
        entityTypes: ['decision']
      });

      // All results should be of type 'decision'
      for (const r of results) {
        expect(r.entity.entityType).toBe('decision');
      }
    });

    it('should return results with similarity scores between 0 and 1', async () => {
      const results = await kg.semanticSearch('testing');

      for (const r of results) {
        expect(r.similarity).toBeGreaterThanOrEqual(0);
        expect(r.similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Hybrid search', () => {
    it('should combine semantic and keyword results', async () => {
      const results = await kg.hybridSearch('JWT token');

      expect(results.length).toBeGreaterThan(0);
      // JWT should be in results (keyword match + semantic match)
      const hasJWT = results.some(r => r.entity.name.includes('JWT'));
      expect(hasJWT).toBe(true);
    });

    it('should boost exact keyword matches', async () => {
      // Create additional entity for this test
      await kg.createEntity({
        name: 'API Rate Limiting',
        entityType: 'feature',
        observations: ['Limit to 100 requests per minute']
      }, { generateEmbedding: false });

      const embeddingService = await LazyEmbeddingService.get();
      const embedding = await embeddingService.encode('API Rate Limiting Limit to 100 requests per minute');
      kg.updateEntityEmbedding('API Rate Limiting', embedding);

      const results = await kg.hybridSearch('Database Indexing', {
        keywordWeight: 0.5,
        semanticWeight: 0.4,
        recencyWeight: 0.1
      });

      // Exact match "Database Indexing" should be in top results
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult.entity.name).toBe('Database Indexing');
      }
    });

    it('should respect limit parameter', async () => {
      const results = await kg.hybridSearch('development', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should work with custom weight configuration', async () => {
      const semanticHeavy = await kg.hybridSearch('authentication process', {
        semanticWeight: 0.9,
        keywordWeight: 0.05,
        recencyWeight: 0.05
      });

      const keywordHeavy = await kg.hybridSearch('authentication process', {
        semanticWeight: 0.1,
        keywordWeight: 0.8,
        recencyWeight: 0.1
      });

      // Both should return results
      expect(semanticHeavy.length).toBeGreaterThan(0);
      // Keyword heavy might return fewer if no exact matches
      // Just verify it doesn't throw
      expect(keywordHeavy).toBeDefined();
    });
  });

  describe('Embedding management', () => {
    it('should report correct embedding stats', () => {
      const stats = kg.getEmbeddingStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.withEmbeddings).toBeGreaterThan(0);
      expect(stats.withEmbeddings + stats.withoutEmbeddings).toBe(stats.total);
    });

    it('should retrieve stored embeddings', () => {
      const embedding = kg.getEntityEmbedding('JWT Authentication');

      expect(embedding).not.toBeNull();
      expect(embedding!.length).toBe(384); // all-MiniLM-L6-v2 dimensions
    });

    it('should return null for entities without embeddings', async () => {
      // Create entity without embedding
      await kg.createEntity({
        name: 'No Embedding Entity',
        entityType: 'test',
        observations: ['test observation']
      }, { generateEmbedding: false });

      const embedding = kg.getEntityEmbedding('No Embedding Entity');
      expect(embedding).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty query gracefully', async () => {
      const results = await kg.semanticSearch('');
      // Should not throw, may return results based on model behavior
      expect(results).toBeDefined();
    });

    it('should handle very long queries', async () => {
      const longQuery = 'authentication '.repeat(100);
      const results = await kg.semanticSearch(longQuery, { limit: 5 });
      expect(results).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const results = await kg.semanticSearch('JWT <authentication> "login" & security');
      expect(results).toBeDefined();
    });

    it('should handle unicode in query', async () => {
      const results = await kg.semanticSearch('認證 authentication 登入');
      expect(results).toBeDefined();
    });
  });

  describe('Backfill functionality', () => {
    it('should backfill embeddings for entities without them', async () => {
      // Create entity without embedding
      await kg.createEntity({
        name: 'Backfill Test Entity',
        entityType: 'test',
        observations: ['This entity needs embedding backfill']
      }, { generateEmbedding: false });

      // Verify no embedding
      expect(kg.getEntityEmbedding('Backfill Test Entity')).toBeNull();

      // Get entities without embeddings
      const entitiesWithoutEmbeddings = await kg.getEntitiesWithoutEmbeddings();
      const hasBackfillEntity = entitiesWithoutEmbeddings.some(
        e => e.name === 'Backfill Test Entity'
      );
      expect(hasBackfillEntity).toBe(true);

      // Run backfill for just this entity
      let progressCalled = false;
      const result = await kg.backfillEmbeddings({
        batchSize: 10,
        onProgress: (current, total) => {
          progressCalled = true;
          expect(current).toBeLessThanOrEqual(total);
        }
      });

      expect(result.processed).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
      expect(progressCalled).toBe(true);

      // Verify embedding now exists
      const embedding = kg.getEntityEmbedding('Backfill Test Entity');
      expect(embedding).not.toBeNull();
      expect(embedding!.length).toBe(384);
    }, 60000);
  });
});
