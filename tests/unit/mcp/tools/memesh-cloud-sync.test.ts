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
}> = []) {
  return {
    searchEntities: vi.fn(() => entities),
  };
}

// -- Helpers -----------------------------------------------------------------

function parseResult(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text);
}

function defaultInput(overrides: Partial<CloudSyncInput> = {}): CloudSyncInput {
  return { action: 'status', space: 'default', limit: 100, dryRun: false, ...overrides };
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

      const result = await handleCloudSync(defaultInput());
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
      });

      const result = await handleCloudSync(defaultInput(), kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.action).toBe('status');
      expect(data.connected).toBe(true);
      expect(data.local.count).toBe(1);
      expect(data.cloud.count).toBe(10);
      expect(data.delta).toBe(-9);
    });

    it('should return 0 local count when no KG', async () => {
      mockClient.getSyncStatus.mockResolvedValue({
        connected: true,
        localCount: 0,
        cloudCount: 5,
      });

      const result = await handleCloudSync(defaultInput());
      const data = parseResult(result);

      expect(data.local.count).toBe(0);
    });

    it('should pass namePattern from query input to KG search', async () => {
      const kg = createMockKG([]);
      mockClient.getSyncStatus.mockResolvedValue({
        connected: true, localCount: 0, cloudCount: 0,
      });

      await handleCloudSync(defaultInput({ query: 'api' }), kg);

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

      await handleCloudSync(defaultInput({ query: '' }), kg);

      expect(kg.searchEntities).toHaveBeenCalledWith({
        namePattern: undefined,
        limit: 1000,
      });
    });
  });

  // -- Push action ----------------------------------------------------------

  describe('push action', () => {
    it('should return error when no KG available', async () => {
      const result = await handleCloudSync(defaultInput({ action: 'push' }));
      const data = parseResult(result);

      expect(data.success).toBe(false);
      expect(data.message).toContain('Knowledge Graph not available');
    });

    it('should return 0 pushed when no entities found', async () => {
      const kg = createMockKG([]);

      const result = await handleCloudSync(defaultInput({ action: 'push' }), kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pushed).toBe(0);
    });

    it('should perform dry run without calling cloud API', async () => {
      const kg = createMockKG([
        { name: 'entity1', entityType: 'concept', observations: ['obs1', 'obs2'] },
        { name: 'entity2', entityType: 'decision', observations: ['obs3'] },
      ]);

      const result = await handleCloudSync(defaultInput({ action: 'push', dryRun: true }), kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
      expect(data.wouldPush).toBe(2);
      expect(data.space).toBe('default');
      expect(data.preview).toHaveLength(2);
      expect(data.preview[0].name).toBe('entity1');
      expect(mockClient.writeMemories).not.toHaveBeenCalled();
    });

    it('should push entities to cloud and return results', async () => {
      const kg = createMockKG([
        { name: 'e1', entityType: 'concept', observations: ['obs1'], tags: ['tag1'] },
      ]);

      mockClient.writeMemories.mockResolvedValue({
        total: 1,
        succeeded: 1,
        failed: 0,
        successes: [{ index: 0, id: 'cloud-id-1', content: '[concept] e1: obs1', createdAt: '2026-01-01' }],
        failures: [],
        transactional: false,
      });

      const result = await handleCloudSync(defaultInput({ action: 'push' }), kg);
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pushed).toBe(1);
      expect(data.failed).toBe(0);
      expect(data.total).toBe(1);

      // Verify memory format sent to cloud
      expect(mockClient.writeMemories).toHaveBeenCalledWith([
        expect.objectContaining({
          content: expect.stringContaining('[concept] e1'),
          space: 'default',
          tags: expect.arrayContaining(['concept', 'tag1']),
          source: 'memesh-local',
        }),
      ]);
    });

    it('should push to non-default space', async () => {
      const kg = createMockKG([
        { name: 'e1', entityType: 'concept', observations: ['obs1'] },
      ]);

      mockClient.writeMemories.mockResolvedValue({
        total: 1, succeeded: 1, failed: 0,
        successes: [{ index: 0, id: 'id1', content: 'test', createdAt: '2026-01-01' }],
        failures: [], transactional: false,
      });

      await handleCloudSync(defaultInput({ action: 'push', space: 'work' }), kg);

      expect(mockClient.writeMemories).toHaveBeenCalledWith([
        expect.objectContaining({ space: 'work' }),
      ]);
    });

    it('should report partial failures from cloud', async () => {
      const kg = createMockKG([
        { name: 'e1', entityType: 'concept', observations: ['o1'] },
        { name: 'e2', entityType: 'concept', observations: ['o2'] },
      ]);

      mockClient.writeMemories.mockResolvedValue({
        total: 2,
        succeeded: 1,
        failed: 1,
        successes: [{ index: 0, id: 'id1', content: 'test', createdAt: '2026-01-01' }],
        failures: [{ index: 1, content: 'test', errorCode: 'DUPLICATE', errorMessage: 'Duplicate content' }],
        transactional: false,
      });

      const result = await handleCloudSync(defaultInput({ action: 'push' }), kg);
      const data = parseResult(result);

      expect(data.pushed).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.errorDetails).toHaveLength(1);
      expect(data.errorDetails[0]).toBe('Duplicate content');
    });

    it('should pass namePattern from query to KG search on push', async () => {
      const kg = createMockKG([]);

      await handleCloudSync(defaultInput({ action: 'push', query: 'test', limit: 50 }), kg);

      expect(kg.searchEntities).toHaveBeenCalledWith({
        namePattern: 'test',
        limit: 50,
      });
    });
  });

  // -- Pull action ----------------------------------------------------------

  describe('pull action', () => {
    it('should return 0 pulled when no cloud memories', async () => {
      mockClient.searchMemory.mockResolvedValue([]);

      const result = await handleCloudSync(defaultInput({ action: 'pull' }));
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pulled).toBe(0);
    });

    it('should perform dry run for pull', async () => {
      mockClient.searchMemory.mockResolvedValue([
        { id: 'm1', content: 'Memory 1', space: 'default', tags: ['a'], createdAt: '2026-01-01' },
      ]);

      const result = await handleCloudSync(defaultInput({ action: 'pull', dryRun: true }));
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
      expect(data.wouldPull).toBe(1);
      expect(data.preview).toHaveLength(1);
      expect(data.preview[0].space).toBe('default');
    });

    it('should return pulled memories with space field', async () => {
      mockClient.searchMemory.mockResolvedValue([
        { id: 'm1', content: 'Memory content', space: 'default', tags: ['tag1'], createdAt: '2026-01-01' },
        { id: 'm2', content: 'Another memory', space: 'work', tags: [], createdAt: '2026-01-02' },
      ]);

      const result = await handleCloudSync(defaultInput({ action: 'pull' }));
      const data = parseResult(result);

      expect(data.success).toBe(true);
      expect(data.pulled).toBe(2);
      expect(data.memories).toHaveLength(2);
      expect(data.memories[0].id).toBe('m1');
      expect(data.memories[0].space).toBe('default');
      expect(data.memories[1].space).toBe('work');
    });

    it('should pass query and limit to cloud searchMemory', async () => {
      mockClient.searchMemory.mockResolvedValue([]);

      await handleCloudSync(defaultInput({ action: 'pull', query: 'my-query', limit: 25 }));

      expect(mockClient.searchMemory).toHaveBeenCalledWith('my-query', {
        limit: 25,
        spaces: undefined,
      });
    });

    it('should pass spaces filter for non-default space', async () => {
      mockClient.searchMemory.mockResolvedValue([]);

      await handleCloudSync(defaultInput({ action: 'pull', space: 'work' }));

      expect(mockClient.searchMemory).toHaveBeenCalledWith('*', {
        limit: 100,
        spaces: ['work'],
      });
    });

    it('should use wildcard when query is empty', async () => {
      mockClient.searchMemory.mockResolvedValue([]);

      await handleCloudSync(defaultInput({ action: 'pull' }));

      expect(mockClient.searchMemory).toHaveBeenCalledWith('*', {
        limit: 100,
        spaces: undefined,
      });
    });
  });
});
