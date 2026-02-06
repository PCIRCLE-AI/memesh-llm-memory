import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCloudSync, type CloudSyncInput } from '../../../../src/mcp/tools/memesh-cloud-sync.js';

// -- Mock cloud module -------------------------------------------------------

const mockClient = {
  getSyncStatus: vi.fn(),
  writeMemories: vi.fn(),
  searchMemory: vi.fn(),
};

vi.mock('../../../../src/cloud/index.js', () => ({
  getCloudClient: () => mockClient,
  isCloudEnabled: vi.fn(() => true),
}));

// Re-import to get the mocked isCloudEnabled for per-test overrides
const { isCloudEnabled } = await import('../../../../src/cloud/index.js');

// -- Mock KG -----------------------------------------------------------------

function createMockKG(entities: Array<{
  name: string;
  entityType: string;
  observations: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  contentHash?: string;
}> = []) {
  return {
    searchEntities: vi.fn(() => entities),
  };
}

// -- Helpers -----------------------------------------------------------------

function parseResult(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text);
}

// -- Tests -------------------------------------------------------------------

describe('handleCloudSync', () => {
  beforeEach(() => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -- Cloud not configured -------------------------------------------------

  describe('when cloud is not configured', () => {
    it('should return setup guide', async () => {
      vi.mocked(isCloudEnabled).mockReturnValue(false);

      const result = await handleCloudSync({ action: 'status', limit: 100, dryRun: false });
      const data = parseResult(result);

      expect(data.success).toBe(false);
      expect(data.message).toContain('MEMESH_API_KEY');
      expect(data.hint).toContain('memesh.ai');
    });
  });

  // -- Status action --------------------------------------------------------

  describe('status action', () => {
    it('should return counts when KG is available', async () => {
      const kg = createMockKG([
        { name: 'entity1', entityType: 'concept', observations: ['obs1'] },
      ]);

      mockClient.getSyncStatus.mockResolvedValue({
        connected: true,
        localCount: 1,
        cloudCount: 10,
        lastSync: '2025-01-01T00:00:00Z',
      });

      const input: CloudSyncInput = { action: 'status', limit: 100, dryRun: false };
      const result = await handleCloudSync(input, kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.action).toBe('status');
      expect(data.connected).toBe(true);
      expect(data.local.count).toBe(1);
      expect(data.cloud.count).toBe(10);
    });

    it('should return 0 local count when no KG', async () => {
      mockClient.getSyncStatus.mockResolvedValue({
        connected: true,
        localCount: 0,
        cloudCount: 5,
      });

      const result = await handleCloudSync({ action: 'status', limit: 100, dryRun: false });
      const data = parseResult(result);

      expect(data.local.count).toBe(0);
    });

    it('should pass namePattern from query input to KG search', async () => {
      const kg = createMockKG([]);
      mockClient.getSyncStatus.mockResolvedValue({
        connected: true, localCount: 0, cloudCount: 0,
      });

      await handleCloudSync({ action: 'status', query: 'api', limit: 100, dryRun: false }, kg);

      expect(kg.searchEntities).toHaveBeenCalledWith({
        namePattern: 'api',
        limit: 1000,
      });
    });

    it('should pass undefined namePattern when query is empty', async () => {
      const kg = createMockKG([]);
      mockClient.getSyncStatus.mockResolvedValue({
        connected: true, localCount: 0, cloudCount: 0,
      });

      await handleCloudSync({ action: 'status', query: '', limit: 100, dryRun: false }, kg);

      expect(kg.searchEntities).toHaveBeenCalledWith({
        namePattern: undefined,
        limit: 1000,
      });
    });
  });

  // -- Push action ----------------------------------------------------------

  describe('push action', () => {
    it('should return error when no KG available', async () => {
      const result = await handleCloudSync({ action: 'push', limit: 100, dryRun: false });
      const data = parseResult(result);

      expect(data.success).toBe(false);
      expect(data.message).toContain('Knowledge Graph not available');
    });

    it('should return 0 pushed when no entities found', async () => {
      const kg = createMockKG([]);

      const result = await handleCloudSync({ action: 'push', limit: 100, dryRun: false }, kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pushed).toBe(0);
    });

    it('should perform dry run without calling cloud API', async () => {
      const kg = createMockKG([
        { name: 'entity1', entityType: 'concept', observations: ['obs1', 'obs2'] },
        { name: 'entity2', entityType: 'decision', observations: ['obs3'] },
      ]);

      const result = await handleCloudSync({ action: 'push', limit: 100, dryRun: true }, kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
      expect(data.wouldPush).toBe(2);
      expect(data.preview).toHaveLength(2);
      expect(data.preview[0].name).toBe('entity1');
      expect(mockClient.writeMemories).not.toHaveBeenCalled();
    });

    it('should push entities to cloud and return results', async () => {
      const kg = createMockKG([
        { name: 'e1', entityType: 'concept', observations: ['obs1'], tags: ['tag1'] },
      ]);

      mockClient.writeMemories.mockResolvedValue({
        ids: ['cloud-id-1'],
        errors: [],
      });

      const result = await handleCloudSync({ action: 'push', limit: 100, dryRun: false }, kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pushed).toBe(1);
      expect(data.errors).toBe(0);

      // Verify memory format sent to cloud
      expect(mockClient.writeMemories).toHaveBeenCalledWith([
        expect.objectContaining({
          content: expect.stringContaining('[concept] e1'),
          tags: expect.arrayContaining(['concept', 'tag1']),
          metadata: expect.objectContaining({
            entityName: 'e1',
            entityType: 'concept',
            source: 'local-kg',
          }),
        }),
      ]);
    });

    it('should report partial errors from cloud', async () => {
      const kg = createMockKG([
        { name: 'e1', entityType: 'concept', observations: ['o1'] },
        { name: 'e2', entityType: 'concept', observations: ['o2'] },
      ]);

      mockClient.writeMemories.mockResolvedValue({
        ids: ['id1'],
        errors: ['Failed to write e2: duplicate'],
      });

      const result = await handleCloudSync({ action: 'push', limit: 100, dryRun: false }, kg);
      const data = parseResult(result);

      expect(data.pushed).toBe(1);
      expect(data.errors).toBe(1);
      expect(data.errorDetails).toHaveLength(1);
    });

    it('should pass namePattern from query to KG search on push', async () => {
      const kg = createMockKG([]);

      await handleCloudSync({ action: 'push', query: 'test', limit: 50, dryRun: false }, kg);

      expect(kg.searchEntities).toHaveBeenCalledWith({
        namePattern: 'test',
        limit: 50,
      });
    });
  });

  // -- Pull action ----------------------------------------------------------

  describe('pull action', () => {
    it('should return 0 pulled when no cloud memories', async () => {
      mockClient.searchMemory.mockResolvedValue({
        memories: [],
        total: 0,
        hasMore: false,
      });

      const result = await handleCloudSync({ action: 'pull', limit: 100, dryRun: false });
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pulled).toBe(0);
    });

    it('should perform dry run for pull', async () => {
      mockClient.searchMemory.mockResolvedValue({
        memories: [
          { id: 'm1', content: 'Memory 1', tags: ['a'], createdAt: '2025-01-01' },
        ],
        total: 1,
        hasMore: false,
      });

      const result = await handleCloudSync({ action: 'pull', limit: 100, dryRun: true });
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
      expect(data.wouldPull).toBe(1);
      expect(data.preview).toHaveLength(1);
    });

    it('should return pulled memories', async () => {
      mockClient.searchMemory.mockResolvedValue({
        memories: [
          { id: 'm1', content: 'Memory content', tags: ['tag1'], createdAt: '2025-01-01' },
          { id: 'm2', content: 'Another memory', tags: [], createdAt: '2025-01-02' },
        ],
        total: 2,
        hasMore: true,
      });

      const result = await handleCloudSync({ action: 'pull', limit: 100, dryRun: false });
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pulled).toBe(2);
      expect(data.hasMore).toBe(true);
      expect(data.memories).toHaveLength(2);
      expect(data.memories[0].id).toBe('m1');
    });

    it('should pass query and limit to cloud searchMemory', async () => {
      mockClient.searchMemory.mockResolvedValue({
        memories: [],
        total: 0,
        hasMore: false,
      });

      await handleCloudSync({ action: 'pull', query: 'my-query', limit: 25, dryRun: false });

      expect(mockClient.searchMemory).toHaveBeenCalledWith('my-query', { limit: 25 });
    });

    it('should use wildcard when query is empty', async () => {
      mockClient.searchMemory.mockResolvedValue({
        memories: [],
        total: 0,
        hasMore: false,
      });

      await handleCloudSync({ action: 'pull', limit: 100, dryRun: false });

      expect(mockClient.searchMemory).toHaveBeenCalledWith('*', { limit: 100 });
    });
  });
});
