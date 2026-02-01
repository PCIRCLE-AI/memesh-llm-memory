/**
 * Integration Tests: DevelopmentButler + WorkflowGuidanceEngine
 *
 * Tests the integration between DevelopmentButler and WorkflowGuidanceEngine
 * for providing workflow guidance at checkpoints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';
import { Router } from '../../src/orchestrator/router.js';

describe('DevelopmentButler + WorkflowGuidanceEngine Integration', () => {
  let butler: DevelopmentButler;
  let checkpointDetector: CheckpointDetector;
  let toolInterface: MCPToolInterface;
  let router: Router;

  beforeEach(() => {
    checkpointDetector = new CheckpointDetector();
    toolInterface = new MCPToolInterface();
    router = new Router();

    // Create butler with learningManager from router
    butler = new DevelopmentButler(
      checkpointDetector,
      toolInterface,
      router.getLearningManager()
    );
  });

  describe('Test 1: Should provide workflow guidance after code-written checkpoint', () => {
    it('should analyze workflow context and return guidance recommendations', async () => {
      // Arrange
      const checkpointData = {
        files: ['src/api/users.ts'],
        hasTests: false,
        type: 'new-file',
        filesChanged: ['src/api/users.ts'],
        testsPassing: undefined, // Tests not run yet
      };

      // Act
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Assert
      expect(result).toBeDefined();
      expect(result.guidance).toBeDefined();
      expect(result.guidance.recommendations).toHaveLength(1);
      expect(result.guidance.recommendations[0].action).toBe('run-tests');
      expect(result.guidance.recommendations[0].priority).toBe('high');
      expect(result.guidance.confidence).toBeGreaterThan(0.5);
      expect(result.requestId).toMatch(/^req_/);
    });

    it('should track active request for later response recording', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts'],
        testsPassing: undefined,
      };

      // Act
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Assert - request should be tracked
      expect(result.requestId).toBeDefined();

      // Should be able to record response without error
      await expect(
        butler.recordUserResponse(result.requestId, {
          accepted: true,
          wasOverridden: false,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Test 2: Should format guidance as non-blocking confirmation request', () => {
    it('should format workflow recommendation as user-friendly request', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts', 'src/api/posts.ts'],
        testsPassing: undefined,
      };

      // Act
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Assert - formatted request should be human-readable
      expect(result.formattedRequest).toBeDefined();
      expect(result.formattedRequest).toContain('CCB Workflow Guidance');
      expect(result.formattedRequest).toContain('run-tests');
      expect(result.formattedRequest).toContain('high');

      // Should include reasoning
      expect(result.formattedRequest).toContain('Reasoning');

      // Should include alternatives if available
      // Note: code-written phase may not have alternatives, but format should support it
    });

    it('should include top recommendation and alternatives in formatted request', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts'],
        testsPassing: false, // Tests ran but failed
      };

      // Act
      const result = await butler.processCheckpoint('test-complete', checkpointData);

      // Assert
      expect(result.formattedRequest).toContain('fix-tests');
      expect(result.guidance.recommendations[0].action).toBe('fix-tests');
    });
  });

  describe('Test 3: Should track user responses for learning', () => {
    it('should record user acceptance to FeedbackCollector', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts'],
        testsPassing: undefined,
      };
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Act - user accepts recommendation
      await butler.recordUserResponse(result.requestId, {
        accepted: true,
        wasOverridden: false,
      });

      // Assert - should not throw
      // Feedback is recorded to LearningManager (verified via no error)
    });

    it('should record user override to FeedbackCollector', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts'],
        testsPassing: undefined,
      };
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Act - user overrides with different action
      await butler.recordUserResponse(result.requestId, {
        accepted: true,
        wasOverridden: true,
        selectedAction: 'code-review', // User chose different action
      });

      // Assert - should not throw
      // Override feedback is recorded for learning
    });

    it('should throw error if request ID not found', async () => {
      // Arrange
      const invalidRequestId = 'req_invalid_12345';

      // Act & Assert
      await expect(
        butler.recordUserResponse(invalidRequestId, {
          accepted: true,
          wasOverridden: false,
        })
      ).rejects.toThrow('Request req_invalid_12345 not found');
    });

    it('should clean up active request after recording response', async () => {
      // Arrange
      const checkpointData = {
        filesChanged: ['src/api/users.ts'],
        testsPassing: undefined,
      };
      const result = await butler.processCheckpoint('code-written', checkpointData);

      // Act - record response
      await butler.recordUserResponse(result.requestId, {
        accepted: true,
        wasOverridden: false,
      });

      // Assert - second attempt should fail (request cleaned up)
      await expect(
        butler.recordUserResponse(result.requestId, {
          accepted: true,
          wasOverridden: false,
        })
      ).rejects.toThrow('not found');
    });
  });
});
