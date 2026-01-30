/**
 * Self-Evolving Agent System
 *
 * Enables agents to learn from experience and improve performance over time
 *
 * ## Components
 *
 * - **PerformanceTracker**: Records and analyzes agent execution metrics
 * - **LearningManager**: Extracts patterns from performance data
 * - **AdaptationEngine**: Applies learned patterns to modify agent behavior
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   PerformanceTracker,
 *   LearningManager,
 *   AdaptationEngine,
 * } from './evolution';
 *
 * // 1. Track performance
 * const tracker = new PerformanceTracker();
 * tracker.track({
 *   agentId: 'code-review-agent',
 *   taskType: 'code-review',
 *   success: true,
 *   durationMs: 12000,
 *   cost: 0.05,
 *   qualityScore: 0.9,
 * });
 *
 * // 2. Learn patterns
 * const learner = new LearningManager(tracker);
 * const patterns = learner.analyzePatterns('code-review-agent');
 *
 * // 3. Adapt behavior
 * const adapter = new AdaptationEngine(learner, tracker);
 * adapter.configureAgent('code-review-agent', {
 *   agentId: 'code-review-agent',
 *   enabledAdaptations: {
 *     promptOptimization: true,
 *     modelSelection: true,
 *     timeoutAdjustment: true,
 *   },
 *   learningRate: 0.1,
 *   minConfidence: 0.7,
 *   minObservations: 10,
 *   maxPatterns: 100,
 * });
 *
 * const adapted = await adapter.adaptExecution(
 *   'code-review-agent',
 *   'code-review',
 *   { model: 'claude-sonnet-4-5', maxTokens: 4000 }
 * );
 * ```
 */

// Core components
export { PerformanceTracker } from './PerformanceTracker.js';
export { LearningManager, type LearningConfig } from './LearningManager.js';
export {
  AdaptationEngine,
  type AdaptationResult,
  type AdaptedExecution,
} from './AdaptationEngine.js';
export { EvolutionBootstrap } from './EvolutionBootstrap.js';

// NEW: Mistake Detection & Learning (Main AI Evolution)
export {
  FeedbackCollector,
  type FeedbackCollectorConfig,
  type RoutingApprovalInput,
  type TaskCompletionInput,
} from './FeedbackCollector.js';
export {
  LocalMistakeDetector,
  type CorrectionDetection,
  type Message,
} from './LocalMistakeDetector.js';
export {
  CloudEvolutionClient,
  createCloudClient,
  type CloudEvolutionConfig,
  type AdvancedMistakeDetection,
  type PatternRecognitionResult,
  type PreventionSuggestion,
} from './CloudEvolutionClient.js';

// Types
export type {
  PerformanceMetrics,
  LearnedPattern,
  AgentFeedback,
  AdaptationConfig,
  EvolutionStats,
} from './types.js';

// NEW: Main AI Mistake Types
export {
  AIErrorType,
} from './types.js';
export type {
  AIMistake,
  AIBehaviorPattern,
} from './types.js';

// Phase 3: Cross-Agent Knowledge Transfer
export { TransferabilityChecker } from './TransferabilityChecker.js';
export { KnowledgeTransferManager, type FindTransferableOptions } from './KnowledgeTransferManager.js';

// Phase 3: A/B Testing Framework
export { StatisticalAnalyzer, type WelchTTestResult } from './StatisticalAnalyzer.js';
export { ABTestManager, type CreateExperimentOptions } from './ABTestManager.js';

// Phase 3 Types
export type {
  PatternTransferability,
  TransferablePattern,
  ABTestExperiment,
  ABTestVariant,
  ABTestAssignment,
  ABTestResults,
  VariantStatistics,
  FederatedLearningConfig,
  LocalModelUpdate,
  GlobalModel,
  ContextualPattern,
  PatternContext,
  PatternExplanation,
} from './types.js';
