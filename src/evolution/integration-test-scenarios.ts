/**
 * Test Scenarios for Evolution System Integration Tests
 *
 * Provides mock data, helper functions, and validation utilities
 * for testing the Learning, Adaptation, and Monitoring components.
 */

/**
 * Mock interaction for testing
 */
export interface MockInteraction {
  agentId: string;
  taskType: string;
  success: boolean;
  feedback: string;
  context: Record<string, unknown>;
}

/**
 * Pattern step for learning scenarios
 */
interface PatternStep {
  interaction: MockInteraction;
  expectedPattern: {
    pattern: string;
    confidence: number;
  };
}

/**
 * Prompt optimization step
 */
interface PromptStep {
  promptVersion: number;
  performance: number;
  feedback: string;
  expectedChange: string;
}

/**
 * Performance monitoring event
 */
interface MonitoringEvent {
  metric: string;
  value: number;
  timestamp: number;
}

/**
 * Expected alert configuration
 */
interface ExpectedAlert {
  type: string;
  metric: string;
  threshold: number;
  actualValue: number;
}

/**
 * Test scenarios for integration testing
 */
export const scenarios = {
  /**
   * Pattern Learning Scenario
   * Tests progressive pattern recognition from repeated feedback
   */
  patternLearning: {
    steps: [
      {
        interaction: {
          agentId: 'test-agent',
          taskType: 'code-review',
          success: false,
          feedback: 'Missing error handling in async functions',
          context: { language: 'typescript', complexity: 'medium' },
        },
        expectedPattern: {
          // LearningManager returns 'always add error handling to async functions'
          pattern: 'always add error handling to async functions',
          confidence: 0.3,
        },
      },
      {
        interaction: {
          agentId: 'test-agent',
          taskType: 'code-review',
          success: false,
          feedback: 'Missing error handling for database operations',
          context: { language: 'typescript', complexity: 'medium' },
        },
        expectedPattern: {
          pattern: 'always add error handling to async functions',
          confidence: 0.6, // 2 observations = 0.6
        },
      },
      {
        interaction: {
          agentId: 'test-agent',
          taskType: 'code-review',
          success: false,
          feedback: 'Need better error handling in API calls',
          context: { language: 'typescript', complexity: 'medium' },
        },
        expectedPattern: {
          pattern: 'always add error handling to async functions',
          confidence: 0.9, // 3 observations = 0.9
        },
      },
    ] as PatternStep[],
  },

  /**
   * Prompt Optimization Scenario
   * Tests iterative prompt improvement based on performance
   */
  promptOptimization: {
    steps: [
      {
        promptVersion: 1,
        performance: 0.6,
        // AdaptationEngine looks for 'verbose' keyword
        feedback: 'Outputs are too verbose',
        expectedChange: 'concise',
      },
      {
        promptVersion: 2,
        performance: 0.75,
        // AdaptationEngine looks for 'examples' keyword
        feedback: 'Better but missing examples',
        expectedChange: 'examples',
      },
      {
        promptVersion: 3,
        performance: 0.85,
        feedback: 'Good quality outputs',
        expectedChange: 'No change needed - performance threshold met',
      },
    ] as PromptStep[],
  },

  /**
   * Performance Monitoring Scenario
   * Tests metric tracking and degradation detection
   */
  performanceMonitoring: {
    events: [
      { metric: 'success_rate', value: 0.9, timestamp: Date.now() - 4000 },
      { metric: 'success_rate', value: 0.85, timestamp: Date.now() - 3000 },
      { metric: 'success_rate', value: 0.75, timestamp: Date.now() - 2000 },
      { metric: 'success_rate', value: 0.65, timestamp: Date.now() - 1000 },
      { metric: 'success_rate', value: 0.55, timestamp: Date.now() },
    ] as MonitoringEvent[],
    expectedAlert: {
      type: 'performance_degradation',
      metric: 'success_rate',
      threshold: 0.7,
      actualValue: 0.65,
    } as ExpectedAlert,
  },

  /**
   * End-to-End Scenario
   * Used for full workflow integration testing
   */
  endToEnd: {
    phases: ['learning', 'adaptation', 'monitoring'],
    expectedOutcome: 'continuous_improvement',
  },
};

/**
 * Create a mock interaction with default values
 */
export function createMockInteraction(
  overrides: Partial<MockInteraction> = {}
): MockInteraction {
  return {
    agentId: 'test-agent',
    taskType: 'general',
    success: true,
    feedback: '',
    context: {},
    ...overrides,
  };
}

/**
 * Validate that pattern confidence increases over progression
 */
export function validatePatternProgression(
  patterns: Array<{ pattern: string; confidence: number }>
): boolean {
  if (patterns.length < 2) {
    return true; // Single pattern is valid
  }

  // Check that confidence generally increases (allowing for small variations)
  let previousConfidence = 0;
  for (const pattern of patterns) {
    // Allow for small decreases (up to 10%) but trend should be upward
    if (pattern.confidence < previousConfidence * 0.9) {
      return false;
    }
    previousConfidence = pattern.confidence;
  }

  return true;
}

/**
 * Validate that prompt performance improves over iterations
 */
export function validatePromptProgression(steps: PromptStep[]): boolean {
  if (steps.length < 2) {
    return true; // Single step is valid
  }

  // Check that performance generally improves
  let previousPerformance = 0;
  for (const step of steps) {
    // Allow for small decreases but trend should be upward
    if (step.performance < previousPerformance * 0.95) {
      return false;
    }
    previousPerformance = step.performance;
  }

  return true;
}

/**
 * Detect the point of performance degradation
 */
export function detectDegradation(
  events: MonitoringEvent[],
  threshold: number
): MonitoringEvent | undefined {
  // Find the first event where value drops below threshold
  for (const event of events) {
    if (event.value < threshold) {
      return event;
    }
  }
  return undefined;
}
