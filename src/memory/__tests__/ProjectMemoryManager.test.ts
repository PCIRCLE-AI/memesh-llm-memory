import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectMemoryManager } from '../ProjectMemoryManager';
import type { KnowledgeGraph } from '../../knowledge-graph';
import type { Entity } from '../../knowledge-graph/types';

describe('ProjectMemoryManager', () => {
  let manager: ProjectMemoryManager;
  let mockKG: KnowledgeGraph;

  beforeEach(() => {
    // Create mock KnowledgeGraph
    mockKG = {
      searchEntities: vi.fn(),
      getEntity: vi.fn(),
      createEntity: vi.fn(),
      createRelation: vi.fn(),
      traceRelations: vi.fn(),
      getStats: vi.fn(),
      close: vi.fn(),
    } as any;

    manager = new ProjectMemoryManager(mockKG);
  });

  describe('recallRecentWork', () => {
    it('should recall recent work from last session', async () => {
      const mockEntity: Entity = {
        name: 'Code Change 2025-12-30 123',
        entityType: 'code_change' as any, // Using 'code_change' as per spec
        observations: [
          'Files modified: 2',
          '  - src/test.ts',
          '  - src/utils.ts',
          'Description: Added new feature',
          'Timestamp: 2025-12-30T10:00:00Z',
        ],
        tags: [],
        metadata: {},
        createdAt: new Date('2025-12-30T10:00:00Z'),
      };

      // Mock searchEntities to return the entity only for 'code_change' type
      (mockKG.searchEntities as any).mockImplementation((query: any) => {
        if (query.entityType === 'code_change') {
          return [mockEntity];
        }
        return [];
      });

      const recent = await manager.recallRecentWork({ limit: 5 });

      expect(recent).toHaveLength(1);
      expect(recent[0].entityType).toBe('code_change');
      expect(recent[0].name).toContain('Code Change');
    });

    it('should limit results based on options', async () => {
      const mockEntities: Entity[] = [
        {
          name: 'Entity 1',
          entityType: 'code_change' as any,
          observations: ['obs1'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T10:00:00Z'),
        },
        {
          name: 'Entity 2',
          entityType: 'test_result' as any,
          observations: ['obs2'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T09:00:00Z'),
        },
        {
          name: 'Entity 3',
          entityType: 'session_snapshot' as any,
          observations: ['obs3'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T08:00:00Z'),
        },
      ];

      // Mock returns one entity per type
      (mockKG.searchEntities as any).mockImplementation((query: any) => {
        return mockEntities.filter(e => e.entityType === query.entityType);
      });

      const recent = await manager.recallRecentWork({ limit: 2 });

      expect(recent).toHaveLength(2);
    });

    it('should filter by entity types', async () => {
      const mockFeatures: Entity[] = [
        {
          name: 'Feature 1',
          entityType: 'code_change' as any,
          observations: ['feature obs'],
          tags: [],
          metadata: {},
        },
      ];

      (mockKG.searchEntities as any).mockReturnValue(mockFeatures);

      const recent = await manager.recallRecentWork({
        limit: 10,
        types: ['code_change'],
      });

      // Verify search was called with correct parameters
      expect(mockKG.searchEntities).toHaveBeenCalledWith({
        entityType: 'code_change',
        limit: 10,
      });

      // Verify the returned memories match expected data
      expect(recent).toHaveLength(1);
      expect(recent[0].entityType).toBe('code_change');
      expect(recent[0].name).toBe('Feature 1');
    });

    it('should use default limit if not specified', async () => {
      (mockKG.searchEntities as any).mockReturnValue([]);

      const recent = await manager.recallRecentWork();

      // Verify search was called (uses default parameters)
      expect(mockKG.searchEntities).toHaveBeenCalled();

      // Verify empty result when no entities found
      expect(recent).toEqual([]);
    });
  });
});
