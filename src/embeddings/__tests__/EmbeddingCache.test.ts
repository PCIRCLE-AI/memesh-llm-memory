import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EmbeddingService } from '../EmbeddingService.js';

describe('EmbeddingService Cache', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = new EmbeddingService();
    await service.initialize();
  }, 60000);

  afterAll(async () => {
    await service.dispose();
  });

  it('should return identical results for identical text', async () => {
    const result1 = await service.encode('test authentication');
    const result2 = await service.encode('test authentication');

    expect(result1).toEqual(result2);
    expect(result1.length).toBe(384);
  });

  it('should return a copy, not the same reference (mutation safety)', async () => {
    const result1 = await service.encode('cache mutation test');
    const result2 = await service.encode('cache mutation test');

    // Values should be equal
    expect(result1).toEqual(result2);

    // But references should differ (independent copies)
    expect(result1).not.toBe(result2);

    // Mutating one should not affect the other
    result1[0] = 999;
    const result3 = await service.encode('cache mutation test');
    expect(result3[0]).not.toBe(999);
  });

  it('should return different results for different text', async () => {
    const result1 = await service.encode('authentication');
    const result2 = await service.encode('database migration');

    expect(result1).not.toEqual(result2);
  });

  it('should be faster on cache hit than cache miss', async () => {
    const text = 'performance benchmark test embedding';

    // First call - cache miss (includes ONNX inference)
    const startMiss = performance.now();
    await service.encode(text);
    const missDuration = performance.now() - startMiss;

    // Second call - cache hit
    const startHit = performance.now();
    await service.encode(text);
    const hitDuration = performance.now() - startHit;

    // Cache hit should be significantly faster
    expect(hitDuration).toBeLessThan(missDuration);
  });
});
