import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';

describe('ProjectAutoTracker - Decision Tracking', () => {
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

  it('should record decision with all fields', async () => {
    await tracker.recordDecision({
      decision_description: 'Choose authentication method',
      context: 'Building user login system',
      options_considered: ['JWT', 'Session cookies', 'OAuth only'],
      chosen_option: 'JWT with refresh tokens',
      rationale: 'Stateless, scalable, and supports mobile apps',
      trade_offs: 'More complex than sessions, requires token refresh logic',
      confidence: 'high',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'decision',
          name: expect.stringMatching(/^Decision: JWT with refresh tokens/),
          observations: expect.arrayContaining([
            expect.stringMatching(/^DECISION:/),
            expect.stringMatching(/^CONTEXT:/),
            expect.stringMatching(/^OPTIONS CONSIDERED:/),
            expect.stringMatching(/^CHOSEN:/),
            expect.stringMatching(/^RATIONALE:/),
            expect.stringMatching(/^TRADE-OFFS:/),
            expect.stringMatching(/^CONFIDENCE:/),
          ]),
        }),
      ]),
    });
  });

  it('should record decision with minimal fields', async () => {
    await tracker.recordDecision({
      decision_description: 'Use TypeScript',
      context: 'New project setup',
      chosen_option: 'TypeScript',
      rationale: 'Type safety and better tooling',
    });

    expect(createEntitiesSpy).toHaveBeenCalledWith({
      entities: expect.arrayContaining([
        expect.objectContaining({
          entityType: 'decision',
          name: expect.stringMatching(/^Decision: TypeScript/),
        }),
      ]),
    });
  });
});
