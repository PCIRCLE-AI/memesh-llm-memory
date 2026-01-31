/**
 * Phase 0.6: Enhanced Auto-Memory End-to-End Integration Tests
 *
 * Comprehensive integration tests for the enhanced auto-memory system including:
 * - buddy-do integration with task start tracking
 * - HookIntegration error detection
 * - Complete auto-memory workflow (task start → decision → milestone → error)
 * - Data integrity across workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../../src/memory/ProjectAutoTracker.js';
import { EntityType } from '../../src/memory/EntityTypes.js';
import { HookIntegration } from '../../src/core/HookIntegration.js';
import { executeBuddyDo } from '../../src/mcp/tools/buddy-do.js';
import type { MCPToolInterface } from '../../src/core/MCPToolInterface.js';
import type { Router } from '../../src/orchestrator/router.js';
import type { ResponseFormatter } from '../../src/ui/ResponseFormatter.js';
import type { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import type { DevelopmentButler } from '../../src/butler/DevelopmentButler.js';

describe('Phase 0.6: Enhanced Auto-Memory End-to-End Integration', () => {
  let mockMCP: MCPToolInterface;
  let tracker: ProjectAutoTracker;
  let createEntitiesSpy: ReturnType<typeof vi.fn>;
  let mockRouter: Router;
  let mockFormatter: ResponseFormatter;

  beforeEach(() => {
    createEntitiesSpy = vi.fn().mockResolvedValue(undefined);
    mockMCP = {
      memory: {
        createEntities: createEntitiesSpy,
      },
      supportsMemory: () => true,
    } as unknown as MCPToolInterface;

    tracker = new ProjectAutoTracker(mockMCP);

    // Mock Router
    mockRouter = {
      routeTask: vi.fn().mockResolvedValue({
        routing: {
          selectedAgent: 'test-agent',
          enhancedPrompt: 'Test prompt',
          estimatedCost: 0.001,
        },
        analysis: {
          complexity: 'simple',
          requiredCapabilities: ['general'],
          estimatedTokens: 100,
        },
        approved: true,
        message: 'Success',
      }),
    } as unknown as Router;

    // Mock ResponseFormatter
    mockFormatter = {
      format: vi.fn().mockReturnValue('Formatted response'),
    } as unknown as ResponseFormatter;
  });

  describe('buddy-do Integration with Auto-Tracking', () => {
    it('should auto-record task start when buddy-do is called', async () => {
      const result = await executeBuddyDo(
        {
          task: 'Build authentication system because we need secure login so that only authorized users can access resources',
        },
        mockRouter,
        mockFormatter,
        tracker
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Verify task start was recorded
      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.TASK_START,
              observations: expect.arrayContaining([
                expect.stringMatching(/^GOAL:/),
                expect.stringMatching(/^REASON:/),
                expect.stringMatching(/^TASK:/),
              ]),
            }),
          ]),
        })
      );
    });

    it('should extract task metadata correctly', async () => {
      await executeBuddyDo(
        {
          task: 'Refactor user service to use TypeScript because type safety will prevent runtime errors',
        },
        mockRouter,
        mockFormatter,
        tracker
      );

      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      // Check goal extraction - the "to X" pattern captures the goal after "to"
      expect(observations.some((obs: string) =>
        obs.startsWith('GOAL:') && obs.includes('use TypeScript')
      )).toBe(true);

      // Check reason extraction
      expect(observations.some((obs: string) =>
        obs.includes('REASON: type safety will prevent runtime errors')
      )).toBe(true);
    });

    it('should handle task with multiple "because" clauses', async () => {
      await executeBuddyDo(
        {
          task: 'Optimize database queries because performance is slow because inefficient indexing',
        },
        mockRouter,
        mockFormatter,
        tracker
      );

      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      // Should extract first "because" clause
      expect(observations.some((obs: string) =>
        obs.includes('REASON: performance is slow')
      )).toBe(true);
    });

    it('should work without optional tracker parameter', async () => {
      const result = await executeBuddyDo(
        { task: 'Test task' },
        mockRouter,
        mockFormatter
        // No tracker provided
      );

      expect(result).toBeDefined();
      expect(createEntitiesSpy).not.toHaveBeenCalled();
    });
  });

  describe('HookIntegration Error Detection', () => {
    let hookIntegration: HookIntegration;
    let mockCheckpointDetector: CheckpointDetector;
    let mockButler: DevelopmentButler;

    beforeEach(() => {
      mockCheckpointDetector = {
        triggerCheckpoint: vi.fn().mockResolvedValue(undefined),
      } as unknown as CheckpointDetector;

      mockButler = {
        getToolInterface: () => mockMCP,
      } as unknown as DevelopmentButler;

      hookIntegration = new HookIntegration(
        mockCheckpointDetector,
        mockButler,
        tracker
      );
    });

    it('should detect error from command output', async () => {
      const errorOutput = `
        Error: Type 'string' is not assignable to type 'number'
        at line 42 in user.ts
      `;

      // Simulate command output with error
      await hookIntegration.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm run build' },
        output: errorOutput,
        success: false,
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was recorded
      expect(createEntitiesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: EntityType.ERROR_RESOLUTION,
              observations: expect.arrayContaining([
                expect.stringMatching(/ERROR TYPE:/),
                expect.stringMatching(/MESSAGE:/),
              ]),
            }),
          ]),
        })
      );
    });

    it('should detect test failures from vitest output', async () => {
      const testOutput = `
        Test Suites: 2 failed, 10 passed, 12 total
        Tests: 5 failed, 45 passed, 50 total
        FAIL tests/api/users.test.ts
          ● UserAPI › should validate email
            TypeError: Cannot read property 'email' of undefined
      `;

      await hookIntegration.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'vitest' },
        output: testOutput,
        success: false,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(createEntitiesSpy).toHaveBeenCalled();
    });

    it('should not record errors for successful commands', async () => {
      const successOutput = 'All tests passed!\n✓ 50 tests completed';

      await hookIntegration.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        output: successOutput,
        success: true,
      });

      // Should not record error for successful output
      const errorCalls = createEntitiesSpy.mock.calls.filter(
        (call: any) => call[0].entities[0].entityType === EntityType.ERROR_RESOLUTION
      );

      expect(errorCalls.length).toBe(0);
    });
  });

  describe('Complete Auto-Memory Workflow', () => {
    it('should record complete development workflow', async () => {
      // 1. Start task
      await tracker.recordTaskStart({
        task_description: 'Implement user authentication',
        goal: 'Implement user authentication',
        reason: 'security requirement',
        expected_outcome: 'users can login securely',
        priority: 'high',
      });

      // 2. Make decision
      await tracker.recordDecision({
        decision_description: 'Choose auth library',
        context: 'Need JWT authentication',
        options_considered: ['passport.js', 'jsonwebtoken', 'auth0'],
        chosen_option: 'jsonwebtoken',
        rationale: 'Lightweight and flexible',
        confidence: 'high',
      });

      // 3. Record milestone
      await tracker.recordProgressMilestone({
        milestone_description: 'JWT authentication working',
        significance: 'Core auth feature complete',
        impact: 'Can protect API endpoints',
        learnings: 'Token expiration needs careful handling',
      });

      // 4. Record error (if any)
      await tracker.recordError({
        error_type: 'JWT Error',
        error_message: 'Token expired',
        context: 'User session management',
        root_cause: 'Default expiration too short',
        resolution: 'Increased token lifetime to 24 hours',
        prevention: 'Add refresh token mechanism',
      });

      // Verify all entities were created
      expect(createEntitiesSpy).toHaveBeenCalledTimes(4);

      // Verify entity types
      const calls = createEntitiesSpy.mock.calls;
      const entityTypes = calls.map((call: any) => call[0].entities[0].entityType);

      expect(entityTypes).toContain(EntityType.TASK_START);
      expect(entityTypes).toContain(EntityType.DECISION);
      expect(entityTypes).toContain(EntityType.PROGRESS_MILESTONE);
      expect(entityTypes).toContain(EntityType.ERROR_RESOLUTION);
    });

    it('should maintain data integrity across workflow', async () => {
      const taskMeta = {
        task_description: 'Complete feature X',
        goal: 'Complete feature X',
        priority: 'normal' as const,
      };

      await tracker.recordTaskStart(taskMeta);

      const call = createEntitiesSpy.mock.calls[0][0];
      const entity = call.entities[0];

      // Verify entity structure
      expect(entity.name).toBeDefined();
      expect(entity.entityType).toBe(EntityType.TASK_START);
      expect(entity.observations).toBeDefined();
      expect(Array.isArray(entity.observations)).toBe(true);
      expect(entity.observations.length).toBeGreaterThan(0);

      // Verify timestamp
      expect(entity.observations.some((obs: string) =>
        obs.startsWith('Timestamp:')
      )).toBe(true);
    });

    it('should handle workflow with minimal data', async () => {
      // Record task with minimal required fields
      await tracker.recordTaskStart({
        task_description: 'Simple task',
        goal: 'Simple task',
      });

      expect(createEntitiesSpy).toHaveBeenCalledTimes(1);

      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      expect(observations.some((obs: string) => obs.includes('GOAL:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('TASK:'))).toBe(true);
    });

    it('should record decision with all metadata', async () => {
      await tracker.recordDecision({
        decision_description: 'Select database',
        context: 'Need to store user data',
        options_considered: ['PostgreSQL', 'MongoDB', 'MySQL'],
        chosen_option: 'PostgreSQL',
        rationale: 'Strong ACID guarantees',
        trade_offs: 'More complex setup than MongoDB',
        confidence: 'high',
      });

      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      expect(observations.some((obs: string) => obs.includes('DECISION:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('CONTEXT:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('OPTIONS CONSIDERED:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('CHOSEN:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('RATIONALE:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('TRADE-OFFS:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('CONFIDENCE:'))).toBe(true);
    });

    it('should record milestone with next steps', async () => {
      await tracker.recordProgressMilestone({
        milestone_description: 'API endpoints complete',
        significance: 'Backend foundation ready',
        impact: 'Frontend can start integration',
        learnings: 'Input validation is critical',
        next_steps: 'Add rate limiting and caching',
      });

      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      expect(observations.some((obs: string) => obs.includes('MILESTONE:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('SIGNIFICANCE:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('IMPACT:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('LEARNINGS:'))).toBe(true);
      expect(observations.some((obs: string) => obs.includes('NEXT STEPS:'))).toBe(true);
    });

    it('should track multiple tasks in sequence', async () => {
      // Task 1
      await tracker.recordTaskStart({
        task_description: 'Task 1',
        goal: 'Task 1',
        priority: 'high',
      });

      // Task 2
      await tracker.recordTaskStart({
        task_description: 'Task 2',
        goal: 'Task 2',
        priority: 'normal',
      });

      expect(createEntitiesSpy).toHaveBeenCalledTimes(2);

      // Verify both tasks have unique names
      const call1 = createEntitiesSpy.mock.calls[0][0];
      const call2 = createEntitiesSpy.mock.calls[1][0];

      expect(call1.entities[0].name).not.toBe(call2.entities[0].name);
    });

    it('should handle concurrent entity creation', async () => {
      // Create multiple entities concurrently
      const promises = [
        tracker.recordTaskStart({
          task_description: 'Task 1',
          goal: 'Task 1',
        }),
        tracker.recordDecision({
          decision_description: 'Decision 1',
          context: 'Context',
          chosen_option: 'Option A',
          rationale: 'Reason',
        }),
        tracker.recordProgressMilestone({
          milestone_description: 'Milestone 1',
          significance: 'Important',
        }),
      ];

      await Promise.all(promises);

      expect(createEntitiesSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle very long task descriptions', async () => {
      const longDescription = 'A'.repeat(1000);

      await tracker.recordTaskStart({
        task_description: longDescription,
        goal: 'Long task',
      });

      expect(createEntitiesSpy).toHaveBeenCalled();
      const call = createEntitiesSpy.mock.calls[0][0];
      expect(call.entities[0].name).toBeDefined();
    });

    it('should handle special characters in observations', async () => {
      await tracker.recordError({
        error_type: 'SyntaxError',
        error_message: 'Unexpected token "<" in JSON at position 0',
        context: 'Parsing API response',
        resolution: 'Added JSON validation',
      });

      expect(createEntitiesSpy).toHaveBeenCalled();
      const call = createEntitiesSpy.mock.calls[0][0];
      const observations = call.entities[0].observations;

      expect(observations.some((obs: string) => obs.includes('Unexpected token "<"'))).toBe(true);
    });

    it('should handle empty arrays in decision options', async () => {
      await tracker.recordDecision({
        decision_description: 'Quick decision',
        context: 'No alternatives',
        options_considered: [],
        chosen_option: 'Only option',
        rationale: 'No choice',
      });

      expect(createEntitiesSpy).toHaveBeenCalled();
    });

    it('should handle multiline error messages', async () => {
      const multilineError = `First line of error
Second line with details
Third line with stack trace`;

      await tracker.recordError({
        error_type: 'MultilineError',
        error_message: multilineError,
        context: 'Complex error scenario',
        resolution: 'Fixed',
      });

      expect(createEntitiesSpy).toHaveBeenCalled();
    });
  });
});
