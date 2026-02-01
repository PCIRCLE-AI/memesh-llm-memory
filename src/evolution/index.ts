/**
 * Evolution System - Simplified
 *
 * Stores and retrieves performance metrics and learned patterns.
 * Intelligence (pattern analysis, adaptation, learning) delegated to LLM via MCP tool descriptions.
 *
 * ## Components
 *
 * - **PerformanceTracker**: Records agent execution metrics
 * - **LearningManager**: Stores learned patterns
 * - **FeedbackCollector**: Records AI mistakes
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   PerformanceTracker,
 *   LearningManager,
 *   FeedbackCollector,
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
 * // 2. Store patterns (created by LLM)
 * const learner = new LearningManager();
 * learner.addPattern({
 *   id: 'pattern-1',
 *   type: 'success',
 *   agentId: 'code-review-agent',
 *   taskType: 'code-review',
 *   description: 'High quality code review pattern',
 *   conditions: { taskComplexity: 'medium' },
 *   action: { type: 'adjust_prompt', parameters: { strategy: 'quality-focused' } },
 *   confidence: 0.85,
 *   observationCount: 25,
 *   successCount: 22,
 *   successRate: 0.88,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 *
 * // 3. Record AI mistakes
 * const collector = new FeedbackCollector();
 * collector.recordAIMistake({
 *   action: 'Modified file without reading',
 *   errorType: AIErrorType.PROCEDURE_VIOLATION,
 *   userCorrection: 'Must read file before editing',
 *   correctMethod: 'Use Read tool first, then Edit',
 *   impact: 'Broke file indentation',
 *   preventionMethod: 'ALWAYS invoke Read before Edit',
 * });
 * ```
 */

// Core components
export { PerformanceTracker } from './PerformanceTracker.js';
export { LearningManager, type LearningConfig } from './LearningManager.js';
export { FeedbackCollector } from './FeedbackCollector.js';
export { EvolutionMonitor } from './EvolutionMonitor.js';

// Types
export type {
  PerformanceMetrics,
  LearnedPattern,
  AgentFeedback,
  EvolutionStats,
} from './types.js';

// AI Mistake Types
export {
  AIErrorType,
} from './types.js';
export type {
  AIMistake,
} from './types.js';
