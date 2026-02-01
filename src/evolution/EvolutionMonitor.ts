/**
 * Evolution Monitor - Simplified
 *
 * Provides basic metrics for monitoring agent performance.
 * Intelligence (dashboard generation, trend analysis) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Access to performance tracker and learning manager
 * - Basic metrics retrieval
 *
 * Removed (delegated to LLM):
 * - Dashboard summary generation
 * - Time series analysis
 * - Trend detection
 * - Alert system
 */

import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearningManager } from './LearningManager.js';
import { logger } from '../utils/logger.js';

/**
 * Evolution Monitor - Simplified
 *
 * Intelligence delegated to LLM:
 * - Dashboard generation → LLM analyzes metrics and creates summaries
 * - Trend analysis → LLM identifies patterns
 * - Alert generation → LLM detects anomalies
 */
export class EvolutionMonitor {
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;

  constructor(
    performanceTracker?: PerformanceTracker,
    learningManager?: LearningManager
  ) {
    this.performanceTracker = performanceTracker as PerformanceTracker;
    this.learningManager = learningManager as LearningManager;

    logger.info('Evolution monitor initialized (simplified)');
  }

  /**
   * Get performance tracker
   *
   * LLM can access tracker directly to analyze metrics
   */
  getPerformanceTracker(): PerformanceTracker {
    return this.performanceTracker;
  }

  /**
   * Get learning manager
   *
   * LLM can access manager directly to retrieve patterns
   */
  getLearningManager(): LearningManager {
    return this.learningManager;
  }
}
