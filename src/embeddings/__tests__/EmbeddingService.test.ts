import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EmbeddingService } from '../EmbeddingService.js';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = new EmbeddingService();
    await service.initialize();
  }, 60000); // Model download may take time

  afterAll(async () => {
    await service.dispose();
  });

  describe('encode', () => {
    it('should generate 384-dimensional embedding', async () => {
      const embedding = await service.encode('hello world');
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(384);
    });

    it('should handle empty string', async () => {
      const embedding = await service.encode('');
      expect(embedding.length).toBe(384);
    });

    it('should be deterministic (same input = same output)', async () => {
      const text = 'test determinism';
      const embedding1 = await service.encode(text);
      const embedding2 = await service.encode(text);

      // Check first 10 elements match
      for (let i = 0; i < 10; i++) {
        expect(embedding1[i]).toBeCloseTo(embedding2[i], 5);
      }
    });

    it('should handle long text', async () => {
      const longText = 'word '.repeat(1000);
      const embedding = await service.encode(longText);
      expect(embedding.length).toBe(384);
    });
  });

  describe('encodeBatch', () => {
    it('should encode multiple texts', async () => {
      const texts = ['hello', 'world', 'test'];
      const embeddings = await service.encodeBatch(texts);

      expect(embeddings.length).toBe(3);
      embeddings.forEach(emb => {
        expect(emb.length).toBe(384);
      });
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vec = new Float32Array([1, 2, 3, 4, 5]);
      const similarity = service.cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return high similarity for similar texts', async () => {
      const emb1 = await service.encode('authentication login');
      const emb2 = await service.encode('user authentication system');
      const similarity = service.cosineSimilarity(emb1, emb2);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should return low similarity for unrelated texts', async () => {
      const emb1 = await service.encode('authentication login');
      const emb2 = await service.encode('banana fruit yellow');
      const similarity = service.cosineSimilarity(emb1, emb2);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('isInitialized', () => {
    it('should return true after initialization', () => {
      expect(service.isInitialized()).toBe(true);
    });
  });
});

describe('LazyEmbeddingService', () => {
  it('should return the same instance on multiple calls', async () => {
    const { LazyEmbeddingService } = await import('../EmbeddingService.js');

    const instance1 = await LazyEmbeddingService.get();
    const instance2 = await LazyEmbeddingService.get();

    expect(instance1).toBe(instance2);
  }, 120000);

  it('should allow retry after dispose', async () => {
    const { LazyEmbeddingService } = await import('../EmbeddingService.js');

    await LazyEmbeddingService.get();
    await LazyEmbeddingService.dispose();

    const instance2 = await LazyEmbeddingService.get();
    // After dispose, get() should create a new instance
    expect(instance2.isInitialized()).toBe(true);

    // Cleanup
    await LazyEmbeddingService.dispose();
  }, 120000);
});
