import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectMemoryCleanup } from '../ProjectMemoryCleanup.js';
import type { KnowledgeGraph } from '../../knowledge-graph';

describe('ProjectMemoryCleanup', () => {
  let cleanup: ProjectMemoryCleanup;
  let mockKG: KnowledgeGraph;

  beforeEach(() => {
    mockKG = {
      searchEntities: vi.fn(),
      deleteEntity: vi.fn()
    } as any;

    cleanup = new ProjectMemoryCleanup(mockKG);
  });

  it('should delete entities older than 30 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

    // Mock should return entity only for code_change type
    (mockKG.searchEntities as any).mockImplementation((query: any) => {
      if (query.entityType === 'code_change') {
        return [
          {
            name: 'CodeChange-old',
            entityType: 'code_change',
            observations: [`Timestamp: ${oldDate.toISOString()}`]
          }
        ];
      }
      return [];
    });

    (mockKG.deleteEntity as any).mockReturnValue(true);

    const deleted = await cleanup.cleanupOldMemories();

    expect(deleted.deleted).toBe(1);
    expect(deleted.failed).toBe(0);
    expect(mockKG.deleteEntity).toHaveBeenCalledWith('CodeChange-old');
  });

  it('should NOT delete entities within 30 days', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

    (mockKG.searchEntities as any).mockReturnValue([
      {
        name: 'CodeChange-recent',
        entityType: 'code_change',
        observations: [`Timestamp: ${recentDate.toISOString()}`]
      }
    ]);

    const deleted = await cleanup.cleanupOldMemories();

    expect(deleted.deleted).toBe(0);
    expect(deleted.failed).toBe(0);
    expect(mockKG.deleteEntity).not.toHaveBeenCalled();
  });

  it('should handle entities without timestamp observations', async () => {
    (mockKG.searchEntities as any).mockReturnValue([
      {
        name: 'Entity-no-timestamp',
        entityType: 'code_change',
        observations: ['Some observation without timestamp']
      }
    ]);

    const deleted = await cleanup.cleanupOldMemories();

    // Should not delete if no valid timestamp found
    expect(deleted.deleted).toBe(0);
    expect(deleted.failed).toBe(0);
    expect(mockKG.deleteEntity).not.toHaveBeenCalled();
  });

  it('should process all memory types (code_change, test_result, session_snapshot)', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);

    // Mock will be called 3 times (once per type)
    let callCount = 0;
    (mockKG.searchEntities as any).mockImplementation((query: any) => {
      callCount++;
      if (callCount === 1) {
        // code_change
        return [
          {
            name: 'CodeChange-old',
            entityType: 'code_change',
            observations: [`Timestamp: ${oldDate.toISOString()}`]
          }
        ];
      } else if (callCount === 2) {
        // test_result
        return [
          {
            name: 'TestResult-old',
            entityType: 'test_result',
            observations: [`Timestamp: ${oldDate.toISOString()}`]
          }
        ];
      } else {
        // session_snapshot
        return [
          {
            name: 'Snapshot-old',
            entityType: 'session_snapshot',
            observations: [`Timestamp: ${oldDate.toISOString()}`]
          }
        ];
      }
    });

    (mockKG.deleteEntity as any).mockReturnValue(true);

    const deleted = await cleanup.cleanupOldMemories();

    expect(deleted.deleted).toBe(3);
    expect(deleted.failed).toBe(0);
    expect(mockKG.searchEntities).toHaveBeenCalledTimes(3);
    expect(mockKG.deleteEntity).toHaveBeenCalledTimes(3);
  });

  it('should handle mixed old and recent entities', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

    // Mock should return both entities only for code_change type
    (mockKG.searchEntities as any).mockImplementation((query: any) => {
      if (query.entityType === 'code_change') {
        return [
          {
            name: 'Entity-old',
            entityType: 'code_change',
            observations: [`Timestamp: ${oldDate.toISOString()}`]
          },
          {
            name: 'Entity-recent',
            entityType: 'code_change',
            observations: [`Timestamp: ${recentDate.toISOString()}`]
          }
        ];
      }
      return [];
    });

    (mockKG.deleteEntity as any).mockReturnValue(true);

    const deleted = await cleanup.cleanupOldMemories();

    // Should only delete old entity
    expect(deleted.deleted).toBe(1);
    expect(deleted.failed).toBe(0);
    expect(mockKG.deleteEntity).toHaveBeenCalledWith('Entity-old');
    expect(mockKG.deleteEntity).not.toHaveBeenCalledWith('Entity-recent');
  });
});
