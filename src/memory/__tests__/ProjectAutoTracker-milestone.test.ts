import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';

describe('ProjectAutoTracker - Progress Milestone Tracking', () => {
  let tracker: ProjectAutoTracker;
  let mockMCP: MCPToolInterface;
  let createEntitiesSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createEntitiesSpy = vi.fn().mockResolvedValue(undefined);
    mockMCP = {
      memory: {
        createEntities: createEntitiesSpy,
      },
    } as unknown as MCPToolInterface;

    tracker = new ProjectAutoTracker(mockMCP);
  });

  it('should record milestone with all fields', async () => {
    await tracker.recordProgressMilestone({
      milestone_description: 'API integration complete',
      significance: 'All 5 endpoints tested and working',
      impact: 'Frontend can now fetch real data',
      learnings: 'Rate limiting requires exponential backoff',
      next_steps: 'Add caching layer to reduce API calls',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'progress_milestone',
          name: expect.stringMatching(/^Milestone: API integration complete/),
          observations: expect.arrayContaining([
            expect.stringMatching(/^MILESTONE:/),
            expect.stringMatching(/^SIGNIFICANCE:/),
            expect.stringMatching(/^IMPACT:/),
            expect.stringMatching(/^LEARNINGS:/),
            expect.stringMatching(/^NEXT STEPS:/),
          ]),
        }),
      ]),
    });
  });

  it('should record milestone with minimal fields', async () => {
    await tracker.recordProgressMilestone({
      milestone_description: 'Tests passing',
      significance: 'All unit tests now green',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'progress_milestone',
          name: expect.stringMatching(/^Milestone: Tests passing/),
        }),
      ]),
    });
  });
});
