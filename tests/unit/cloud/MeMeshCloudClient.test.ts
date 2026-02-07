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
    client = new MeMeshCloudClient('mk_test_key_123', 'https://test.memesh-backend.fly.dev', 5000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('should call /agents/me and return agent info on success', async () => {
      const mockAgent = {
        id: 'agent-1',
        agentType: 'claude',
        agentName: 'Test Agent',
        status: 'online',
        capabilities: {},
        createdAt: '2026-01-01T00:00:00Z',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockAgent), { status: 200 })
      );

      const result = await client.authenticate();
      expect(result.valid).toBe(true);
      expect(result.agentId).toBe('agent-1');
      expect(result.agentType).toBe('claude');
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
        space: 'default',
      })).rejects.toThrow('MeMesh Cloud API key not configured');
    });

    it('should POST to /memory/write with x-api-key header', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'mem-1' }), { status: 200 })
      );

      const id = await client.writeMemory({
        content: 'Test memory',
        space: 'default',
        tags: ['test'],
      });

      expect(id).toBe('mem-1');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test.memesh-backend.fly.dev/memory/write',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'mk_test_key_123',
          }),
        })
      );
    });
  });

  describe('writeMemories (batch)', () => {
    it('should POST batch to /memory/batch endpoint', async () => {
      const mockResult = {
        total: 2,
        succeeded: 2,
        failed: 0,
        successes: [
          { index: 0, id: 'm1', content: 'Memory 1', createdAt: '2026-01-01' },
          { index: 1, id: 'm2', content: 'Memory 2', createdAt: '2026-01-01' },
        ],
        failures: [],
        transactional: false,
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const result = await client.writeMemories([
        { content: 'Memory 1', space: 'default', tags: ['a'] },
        { content: 'Memory 2', space: 'default', tags: ['b'] },
      ]);

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.successes).toHaveLength(2);

      // Verify batch payload shape
      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.memories).toHaveLength(2);
      expect(body.transactional).toBe(false);
    });

    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.writeMemories([{
        content: 'test',
        space: 'default',
      }])).rejects.toThrow('MeMesh Cloud API key not configured');
    });
  });

  describe('searchMemory', () => {
    it('should GET /memory/search with query params', async () => {
      const mockResult = [
        { id: 'm1', content: 'Result', space: 'default', tags: ['a'], createdAt: '2026-01-01' },
      ];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const results = await client.searchMemory('api design', { limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('m1');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/memory/search');
      expect(calledUrl).toContain('query=api+design');
      expect(calledUrl).toContain('limit=10');
    });

    it('should pass spaces filter when provided', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 })
      );

      await client.searchMemory('test', { spaces: ['work', 'personal'] });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('spaces=work%2Cpersonal');
    });

    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.searchMemory('test'))
        .rejects.toThrow('MeMesh Cloud API key not configured');
    });
  });

  describe('getSyncStatus', () => {
    it('should return disconnected when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      const result = await noKeyClient.getSyncStatus(42);
      expect(result.connected).toBe(false);
      expect(result.localCount).toBe(42);
      expect(result.cloudCount).toBe(0);
    });

    it('should return sync status from /memory/count', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ count: 100 }), { status: 200 })
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
    it('should POST to /agents/register and return CloudAgentInfo', async () => {
      const mockAgent = {
        id: 'agent-1',
        agentType: 'claude',
        agentName: 'Test Agent',
        status: 'online',
        capabilities: { platform: 'claude-code' },
        createdAt: '2026-01-01T00:00:00Z',
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockAgent), { status: 200 })
      );

      const result = await client.registerAgent({
        agentType: 'claude',
        agentName: 'Test Agent',
        capabilities: { platform: 'claude-code' },
      });

      expect(result.id).toBe('agent-1');
      expect(result.agentType).toBe('claude');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/agents/register');
    });

    it('should throw when not configured', async () => {
      const noKeyClient = new MeMeshCloudClient('');
      await expect(noKeyClient.registerAgent({
        agentType: 'test',
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
        space: 'default',
      })).rejects.toThrow('MeMesh Cloud API error: 500');
    });

    it('should truncate long error bodies to 200 chars', async () => {
      const longBody = 'x'.repeat(500);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(longBody, { status: 500 })
      );

      try {
        await client.writeMemory({ content: 'test', space: 'default' });
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
        space: 'default',
      })).rejects.toThrow('timed out');
    });

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
