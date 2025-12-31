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
        type: 'feature' as any, // Using 'feature' as a valid EntityType
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

      // Mock searchEntities to return the entity only for 'feature' type
      (mockKG.searchEntities as any).mockImplementation((query: any) => {
        if (query.type === 'feature') {
          return [mockEntity];
        }
        return [];
      });

      const recent = await manager.recallRecentWork({ limit: 5 });

      expect(recent).toHaveLength(1);
      expect(recent[0].type).toBe('feature');
      expect(recent[0].name).toContain('Code Change');
    });

    it('should limit results based on options', async () => {
      const mockEntities: Entity[] = [
        {
          name: 'Entity 1',
          type: 'feature' as any,
          observations: ['obs1'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T10:00:00Z'),
        },
        {
          name: 'Entity 2',
          type: 'bug_fix' as any,
          observations: ['obs2'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T09:00:00Z'),
        },
        {
          name: 'Entity 3',
          type: 'decision' as any,
          observations: ['obs3'],
          tags: [],
          metadata: {},
          createdAt: new Date('2025-12-30T08:00:00Z'),
        },
      ];

      // Mock returns one entity per type
      (mockKG.searchEntities as any).mockImplementation((query: any) => {
        return mockEntities.filter(e => e.type === query.type);
      });

      const recent = await manager.recallRecentWork({ limit: 2 });

      expect(recent).toHaveLength(2);
    });

    it('should filter by entity types', async () => {
      const mockFeatures: Entity[] = [
        {
          name: 'Feature 1',
          type: 'feature' as any,
          observations: ['feature obs'],
          tags: [],
          metadata: {},
        },
      ];

      (mockKG.searchEntities as any).mockReturnValue(mockFeatures);

      const recent = await manager.recallRecentWork({
        limit: 10,
        types: ['feature'],
      });

      expect(mockKG.searchEntities).toHaveBeenCalledWith({
        type: 'feature',
        limit: 10,
      });
    });

    it('should use default limit if not specified', async () => {
      (mockKG.searchEntities as any).mockReturnValue([]);

      await manager.recallRecentWork();

      expect(mockKG.searchEntities).toHaveBeenCalled();
    });
  });
});
