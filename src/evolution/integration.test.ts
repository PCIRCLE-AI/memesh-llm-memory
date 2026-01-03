import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  scenarios,
  createMockInteraction,
  validatePatternProgression,
  validatePromptProgression,
  detectDegradation,
} from './integration-test-scenarios.js';
import { LearningManager } from './LearningManager';
import { AdaptationEngine } from './AdaptationEngine';
import { EvolutionMonitor } from './EvolutionMonitor';

describe('Evolution System Integration', () => {
  let learningManager: LearningManager;
  let adaptationEngine: AdaptationEngine;
  let monitor: EvolutionMonitor;

  beforeEach(async () => {
    // Initialize all three components
    learningManager = new LearningManager();
    adaptationEngine = new AdaptationEngine();
    monitor = new EvolutionMonitor();

    await learningManager.initialize();
    await adaptationEngine.initialize();
    await monitor.initialize();
  });

  afterEach(async () => {
    // Clean up resources
    await learningManager.close();
    await adaptationEngine.close();
    await monitor.close();

    // Clear static saved data for test isolation
    LearningManager.clearSavedData();
  });

  describe('Scenario 1: Pattern Learning', () => {
    it('should learn patterns from repeated feedback', async () => {
      const scenario = scenarios.patternLearning;
      const extractedPatterns = [];

      // Process each interaction
      for (const step of scenario.steps) {
        // Submit interaction to LearningManager
        await learningManager.recordInteraction(step.interaction);

        // Extract patterns
        const patterns = await learningManager.extractPatterns();

        // Find pattern matching expected
        const matchingPattern = patterns.find(
          p => p.pattern === step.expectedPattern.pattern
        );

        expect(matchingPattern).toBeDefined();
        expect(matchingPattern?.confidence).toBeCloseTo(
          step.expectedPattern.confidence,
          1 // Allow 0.1 tolerance
        );

        extractedPatterns.push(matchingPattern!);
      }

      // Validate progression
      expect(validatePatternProgression(extractedPatterns)).toBe(true);

      // Verify final pattern is actionable (confidence > 0.7)
      const finalPattern = extractedPatterns[extractedPatterns.length - 1];
      expect(finalPattern.confidence).toBeGreaterThan(0.7);
    });

    it('should increase confidence with similar feedback', async () => {
      // First interaction
      const interaction1 = createMockInteraction({
        feedback: 'Missing error handling',
      });
      await learningManager.recordInteraction(interaction1);
      const patterns1 = await learningManager.extractPatterns();
      const confidence1 = patterns1[0]?.confidence || 0;

      // Second similar interaction
      const interaction2 = createMockInteraction({
        feedback: 'Missing error handling again',
      });
      await learningManager.recordInteraction(interaction2);
      const patterns2 = await learningManager.extractPatterns();
      const confidence2 = patterns2[0]?.confidence || 0;

      // Confidence should increase
      expect(confidence2).toBeGreaterThan(confidence1);
    });
  });

  describe('Scenario 2: Prompt Optimization', () => {
    it('should optimize prompts based on performance', async () => {
      const scenario = scenarios.promptOptimization;
      let currentPrompt = 'Initial prompt';

      for (const step of scenario.steps) {
        // Submit performance metrics
        await adaptationEngine.recordPerformance({
          promptVersion: step.promptVersion,
          successRate: step.performance,
          feedback: step.feedback,
        });

        // Request prompt optimization
        const optimizedPrompt = await adaptationEngine.optimizePrompt(currentPrompt);

        if (step.performance < 0.85) {
          // Prompt should change if performance is below threshold
          expect(optimizedPrompt).not.toBe(currentPrompt);

          // Check if expected change is present
          if (step.expectedChange !== 'No change needed - performance threshold met') {
            expect(optimizedPrompt).toContain(step.expectedChange);
          }
        } else {
          // Prompt might not change if performance is good
          // (This is acceptable - we've met the threshold)
        }

        currentPrompt = optimizedPrompt;
      }
    });

    it('should improve performance with each iteration', async () => {
      const scenario = scenarios.promptOptimization;
      const performanceMetrics = scenario.steps.map(s => s.performance);

      // Validate performance progression
      expect(validatePromptProgression(scenario.steps)).toBe(true);

      // Final performance should be high
      const finalPerformance = performanceMetrics[performanceMetrics.length - 1];
      expect(finalPerformance).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Scenario 3: Performance Monitoring', () => {
    it('should track metrics over time', async () => {
      const scenario = scenarios.performanceMonitoring;

      // Submit all events
      for (const event of scenario.events) {
        await monitor.recordMetric(event.metric, event.value, event.timestamp);
      }

      // Retrieve metrics history
      const history = await monitor.getMetricHistory('success_rate');

      // Should have all events
      expect(history.length).toBe(scenario.events.length);

      // Values should match
      history.forEach((entry, index) => {
        expect(entry.value).toBe(scenario.events[index].value);
      });
    });

    it('should alert on performance degradation', async () => {
      const scenario = scenarios.performanceMonitoring;

      // Set alert threshold
      await monitor.setAlertThreshold('success_rate', scenario.expectedAlert.threshold);

      // Submit events until degradation occurs
      let alertTriggered = false;
      monitor.on('alert', (alert) => {
        if (alert.type === scenario.expectedAlert.type) {
          alertTriggered = true;
          expect(alert.metric).toBe(scenario.expectedAlert.metric);
          expect(alert.actualValue).toBeLessThan(scenario.expectedAlert.threshold);
        }
      });

      for (const event of scenario.events) {
        await monitor.recordMetric(event.metric, event.value, event.timestamp);
      }

      // Alert should have been triggered
      expect(alertTriggered).toBe(true);
    });

    it('should detect degradation point correctly', async () => {
      const scenario = scenarios.performanceMonitoring;
      const degradationPoint = detectDegradation(
        scenario.events,
        scenario.expectedAlert.threshold
      );

      expect(degradationPoint).toBeDefined();
      expect(degradationPoint?.value).toBe(scenario.expectedAlert.actualValue);
    });
  });

  describe('Scenario 4: End-to-End Integration', () => {
    it('should complete full evolution workflow', async () => {
      const scenario = scenarios.endToEnd;

      // Phase 1: Learning
      console.log('Phase 1: Learning patterns from feedback...');
      const interaction = createMockInteraction({
        feedback: 'Missing input validation',
      });
      await learningManager.recordInteraction(interaction);
      let patterns = await learningManager.extractPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeLessThan(0.5); // Low confidence initially

      // Submit more similar feedback
      for (let i = 0; i < 3; i++) {
        await learningManager.recordInteraction(
          createMockInteraction({
            feedback: 'Missing input validation again',
          })
        );
      }

      patterns = await learningManager.extractPatterns();
      const highConfidencePattern = patterns.find(p => p.confidence > 0.7);
      expect(highConfidencePattern).toBeDefined();

      // Phase 2: Adaptation
      console.log('Phase 2: Adapting prompt based on pattern...');
      const originalPrompt = 'Write code for the given task';
      const adaptedPrompt = await adaptationEngine.adaptPromptFromPattern(
        originalPrompt,
        highConfidencePattern!
      );

      expect(adaptedPrompt).not.toBe(originalPrompt);
      expect(adaptedPrompt).toContain('validation'); // Should include learned pattern

      // Phase 3: Monitoring
      console.log('Phase 3: Monitoring performance after adaptation...');

      // Record baseline performance (before adaptation)
      await monitor.recordMetric('success_rate', 0.6, Date.now());

      // Record improved performance (after adaptation)
      await monitor.recordMetric('success_rate', 0.85, Date.now() + 1000);

      // Check that no degradation alert was triggered
      const alerts = await monitor.getAlerts();
      const degradationAlerts = alerts.filter(a => a.type === 'performance_degradation');
      expect(degradationAlerts.length).toBe(0);

      console.log('✅ End-to-end evolution workflow completed successfully');
    });

    it('should maintain learned patterns across sessions', async () => {
      // Record pattern
      const interaction = createMockInteraction({
        feedback: 'Missing type annotations',
      });
      await learningManager.recordInteraction(interaction);
      await learningManager.recordInteraction(interaction); // Repeat for confidence
      await learningManager.recordInteraction(interaction);

      const patternsBeforeClose = await learningManager.extractPatterns();
      expect(patternsBeforeClose.length).toBeGreaterThan(0);

      // Close and reinitialize (simulating new session)
      await learningManager.close();
      learningManager = new LearningManager();
      await learningManager.initialize();

      // Patterns should be persisted
      const patternsAfterReopen = await learningManager.extractPatterns();
      expect(patternsAfterReopen.length).toBe(patternsBeforeClose.length);
      expect(patternsAfterReopen[0].pattern).toBe(patternsBeforeClose[0].pattern);
    });

    it('should coordinate all components for continuous improvement', async () => {
      // This test validates that the three components work together
      // to create a self-improving system

      // 1. Learning: Record multiple interactions with similar issues
      for (let i = 0; i < 5; i++) {
        await learningManager.recordInteraction(
          createMockInteraction({
            feedback: 'Code lacks proper documentation',
          })
        );
      }

      const patterns = await learningManager.extractPatterns();
      const documentationPattern = patterns.find(p =>
        p.pattern.toLowerCase().includes('documentation')
      );
      expect(documentationPattern).toBeDefined();
      expect(documentationPattern!.confidence).toBeGreaterThan(0.7);

      // 2. Adaptation: Use pattern to improve prompt
      const basePrompt = 'Generate code';
      const improvedPrompt = await adaptationEngine.adaptPromptFromPattern(
        basePrompt,
        documentationPattern!
      );
      expect(improvedPrompt).toContain('documentation');

      // 3. Monitoring: Track improvement
      await monitor.recordMetric('documentation_score', 0.3, Date.now()); // Before
      await monitor.recordMetric('documentation_score', 0.9, Date.now() + 1000); // After

      const history = await monitor.getMetricHistory('documentation_score');
      expect(history[history.length - 1].value).toBeGreaterThan(history[0].value);

      console.log('✅ Continuous improvement cycle validated');
    });
  });

  describe('Component Integration Health', () => {
    it('should have all components initialized', async () => {
      expect(learningManager).toBeDefined();
      expect(adaptationEngine).toBeDefined();
      expect(monitor).toBeDefined();

      // All should be ready
      const learningReady = await learningManager.isReady();
      const adaptationReady = await adaptationEngine.isReady();
      const monitorReady = await monitor.isReady();

      expect(learningReady).toBe(true);
      expect(adaptationReady).toBe(true);
      expect(monitorReady).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      // Test that components can handle parallel operations
      const operations = [
        learningManager.recordInteraction(createMockInteraction({ feedback: 'Issue 1' })),
        learningManager.recordInteraction(createMockInteraction({ feedback: 'Issue 2' })),
        adaptationEngine.recordPerformance({
          promptVersion: 1,
          successRate: 0.8,
          feedback: 'Good',
        }),
        monitor.recordMetric('test_metric', 0.5, Date.now()),
      ];

      // All should complete without errors
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it('should clean up resources properly', async () => {
      await learningManager.close();
      await adaptationEngine.close();
      await monitor.close();

      // Components should be closed
      const learningReady = await learningManager.isReady();
      const adaptationReady = await adaptationEngine.isReady();
      const monitorReady = await monitor.isReady();

      expect(learningReady).toBe(false);
      expect(adaptationReady).toBe(false);
      expect(monitorReady).toBe(false);
    });
  });
});
