import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MeMeshCloudClient,
  getCloudClient,
  isCloudEnabled,
  resetCloudClient,
} from '../../../src/cloud/MeMeshCloudClient.js';

describe('MeMeshCloudClient', () => {
  let client: MeMeshCloudClient;

  beforeEach(() => {
    client = new MeMeshCloudClient('mk_test_key_123', 'https://api.test.memesh.ai', 5000);
  });

  describe('constructor', () => {
    it('should create client with explicit parameters', () => {
      const c = new MeMeshCloudClient('key', 'https://example.com/', 3000);
      expect(c.isConfigured).toBe(true);
    });

    it('should strip trailing slash from base URL', () => {
      const c = new MeMeshCloudClient('key', 'https://example.com/');
      expect(c.isConfigured).toBe(true);
    });

    it('should report not configured when no API key', () => {
      const c = new MeMeshCloudClient('', 'https://example.com');
      expect(c.isConfigured).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      expect(client.isConfigured).toBe(true);
    });

    it('should return false when API key is empty', () => {
      const noKeyClient = new MeMeshCloudClient('');
      expect(noKeyClient.isConfigured).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('should return invalid when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      const result = await noKeyClient.authenticate();
      expect(result.valid).toBe(false);
    });

    it('should call auth endpoint and return user info on success', async () => {
      const mockResponse = { userId: 'user-1', plan: 'pro' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await client.authenticate();
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.plan).toBe('pro');
    });

    it('should return invalid on auth failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const result = await client.authenticate();
      expect(result.valid).toBe(false);
    });
  });

  describe('writeMemory', () => {
    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.writeMemory({
        content: 'test',
        tags: ['test'],
      })).rejects.toThrow('MeMesh Cloud API key not configured');
    });

    it('should POST to memories endpoint', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'mem-1' }), { status: 200 })
      );

      const id = await client.writeMemory({
        content: 'Test memory',
        tags: ['test'],
      });

      expect(id).toBe('mem-1');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.test.memesh.ai/v1/memories',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mk_test_key_123',
          }),
        })
      );
    });
  });

  describe('writeMemories (batch)', () => {
    it('should POST batch to memories/batch endpoint', async () => {
      const mockResult = { ids: ['m1', 'm2'], errors: [] };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const result = await client.writeMemories([
        { content: 'Memory 1', tags: ['a'] },
        { content: 'Memory 2', tags: ['b'] },
      ]);

      expect(result.ids).toEqual(['m1', 'm2']);
      expect(result.errors).toEqual([]);
    });
  });

  describe('searchMemory', () => {
    it('should GET search endpoint with query params', async () => {
      const mockResult = { memories: [], total: 0, hasMore: false };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      await client.searchMemory('api design', { limit: 10, tags: ['decision'] });

      const calledUrl = (fetchSpy.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/v1/memories/search');
      expect(calledUrl).toContain('q=api+design');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('tags=decision');
    });
  });

  describe('getSyncStatus', () => {
    it('should return disconnected when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      const result = await noKeyClient.getSyncStatus(42);
      expect(result.connected).toBe(false);
      expect(result.localCount).toBe(42);
    });

    it('should return sync status from cloud', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ count: 100, lastSync: '2025-01-01T00:00:00Z' }), { status: 200 })
      );

      const result = await client.getSyncStatus(50);
      expect(result.connected).toBe(true);
      expect(result.localCount).toBe(50);
      expect(result.cloudCount).toBe(100);
    });

    it('should return disconnected on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getSyncStatus(50);
      expect(result.connected).toBe(false);
    });
  });

  describe('registerAgent', () => {
    it('should POST to agents/register endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await expect(client.registerAgent({
        agentId: 'agent-1',
        name: 'Alpha',
        platform: 'claude-code',
      })).resolves.not.toThrow();
    });
  });

  describe('writeMemories (requireAuth)', () => {
    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.writeMemories([{
        content: 'test',
        tags: [],
      }])).rejects.toThrow('MeMesh Cloud API key not configured');
    });
  });

  describe('searchMemory (requireAuth)', () => {
    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.searchMemory('test'))
        .rejects.toThrow('MeMesh Cloud API key not configured');
    });
  });

  describe('registerAgent (requireAuth)', () => {
    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.registerAgent({
        agentId: 'a1',
        name: 'Test',
        platform: 'test',
      })).rejects.toThrow('MeMesh Cloud API key not configured');
    });
  });

  describe('error handling', () => {
    it('should throw ExternalServiceError on HTTP errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      );

      await expect(client.writeMemory({
        content: 'test',
        tags: [],
      })).rejects.toThrow('MeMesh Cloud API error: 500');
    });

    it('should truncate long error bodies to 200 chars', async () => {
      const longBody = 'x'.repeat(500);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(longBody, { status: 500 })
      );

      try {
        await client.writeMemory({ content: 'test', tags: [] });
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        const err = error as Error & { context?: Record<string, unknown> };
        expect(err.context?.response).toBeDefined();
        const responseStr = String(err.context?.response);
        expect(responseStr.length).toBeLessThanOrEqual(204); // 200 + '...'
      }
    });

    it('should throw timeout error on abort', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new DOMException('The operation was aborted', 'AbortError')
      );

      await expect(client.writeMemory({
        content: 'test',
        tags: [],
      })).rejects.toThrow('timed out');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

describe('getCloudClient / isCloudEnabled / resetCloudClient', () => {
  afterEach(() => {
    resetCloudClient();
    vi.restoreAllMocks();
  });

  it('isCloudEnabled should return false when MEMESH_API_KEY not set', () => {
    const orig = process.env.MEMESH_API_KEY;
    delete process.env.MEMESH_API_KEY;
    expect(isCloudEnabled()).toBe(false);
    if (orig) process.env.MEMESH_API_KEY = orig;
  });

  it('isCloudEnabled should return true when MEMESH_API_KEY is set', () => {
    const orig = process.env.MEMESH_API_KEY;
    process.env.MEMESH_API_KEY = 'mk_test';
    expect(isCloudEnabled()).toBe(true);
    if (orig) process.env.MEMESH_API_KEY = orig;
    else delete process.env.MEMESH_API_KEY;
  });

  it('getCloudClient should return a singleton', () => {
    const a = getCloudClient();
    const b = getCloudClient();
    expect(a).toBe(b);
  });

  it('resetCloudClient should clear the singleton', () => {
    const a = getCloudClient();
    resetCloudClient();
    const b = getCloudClient();
    expect(a).not.toBe(b);
  });
});
