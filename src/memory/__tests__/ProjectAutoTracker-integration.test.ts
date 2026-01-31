import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import { EntityType } from '../EntityTypes.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';

describe('ProjectAutoTracker - Phase 0.6 Integration', () => {
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

  describe('Phase 0.6 New Features', () => {
    it('should record task start with extracted metadata', async () => {
      await tracker.recordTaskStart({
        task_description: 'Build authentication system',
        goal: 'Build authentication system',
        reason: 'users need secure login',
        expected_outcome: 'JWT-based auth working',
        priority: 'high',
      });

      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.TASK_START,
              observations: expect.arrayContaining([
                expect.stringMatching(/^GOAL:/),
                expect.stringMatching(/^REASON:/),
                expect.stringMatching(/^EXPECTED:/),
              ]),
            }),
          ]),
        })
      );
    });

    it('should record decision with full metadata', async () => {
      await tracker.recordDecision({
        decision_description: 'Choose state management',
        context: 'React app needs global state',
        options_considered: ['Redux', 'Zustand', 'Context API'],
        chosen_option: 'Zustand',
        rationale: 'Simpler API, less boilerplate',
        trade_offs: 'Smaller ecosystem than Redux',
        confidence: 'medium',
      });

      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.DECISION,
              observations: expect.arrayContaining([
                expect.stringMatching(/^DECISION:/),
                expect.stringMatching(/^OPTIONS CONSIDERED:/),
                expect.stringMatching(/^CHOSEN:/),
              ]),
            }),
          ]),
        })
      );
    });

    it('should record progress milestone', async () => {
      await tracker.recordProgressMilestone({
        milestone_description: 'Tests all passing',
        significance: 'First green build',
        impact: 'Can deploy to staging',
        learnings: 'Mock external APIs in tests',
        next_steps: 'Set up CI/CD pipeline',
      });

      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.PROGRESS_MILESTONE,
            }),
          ]),
        })
      );
    });

    it('should record error resolution', async () => {
      await tracker.recordError({
        error_type: 'CORS Error',
        error_message: 'Access blocked by CORS policy',
        context: 'Frontend calling backend API',
        root_cause: 'Missing CORS headers',
        resolution: 'Added cors middleware',
        prevention: 'Configure CORS in all new APIs',
      });

      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.ERROR_RESOLUTION,
            }),
          ]),
        })
      );
    });
  });

  describe('Entity Type Validation', () => {
    it('should use EntityType enum for all entity types', async () => {
      // Test each Phase 0.6 entity type
      const calls: Array<() => Promise<void>> = [
        () => tracker.recordTaskStart({
          task_description: 'test',
          goal: 'test',
          priority: 'normal',
        }),
        () => tracker.recordDecision({
          decision_description: 'test',
          context: 'test',
          chosen_option: 'test',
          rationale: 'test',
        }),
        () => tracker.recordProgressMilestone({
          milestone_description: 'test',
          significance: 'test',
        }),
        () => tracker.recordError({
          error_type: 'test',
          error_message: 'test',
          context: 'test',
          resolution: 'test',
        }),
      ];

      for (const call of calls) {
        await call();
      }

      // Verify all calls used EntityType enum values
      const allCalls = createEntitiesSpy.mock.calls;
      expect(allCalls.length).toBe(4);

      allCalls.forEach((call) => {
        const entityType = call[0].entities[0].entityType;
        expect(Object.values(EntityType)).toContain(entityType);
      });
    });
  });

  describe('Data Completeness', () => {
    it('should include timestamps in all observations', async () => {
      await tracker.recordTaskStart({
        task_description: 'test task',
        goal: 'test goal',
        priority: 'normal',
      });

      const observations = createEntitiesSpy.mock.calls[0][0].entities[0].observations;
      expect(observations.some((obs: string) => obs.startsWith('Timestamp:'))).toBe(true);
    });

    it('should handle optional fields gracefully', async () => {
      // Decision without optional fields
      await tracker.recordDecision({
        decision_description: 'minimal decision',
        context: 'test context',
        chosen_option: 'option A',
        rationale: 'because',
      });

      expect(createEntitiesSpy).toHaveBeenCalledTimes(1);

      // Should not fail
      const observations = createEntitiesSpy.mock.calls[0][0].entities[0].observations;
      expect(observations.length).toBeGreaterThan(0);
    });
  });
});
