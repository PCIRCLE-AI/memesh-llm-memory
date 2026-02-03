/**
 * Learning Manager - Simplified
 *
 * Stores and retrieves learned patterns.
 * Intelligence (pattern analysis, extraction, optimization) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Store learned patterns
 * - Retrieve patterns with filtering
 * - In-memory storage for current session
 *
 * Removed (delegated to LLM):
 * - Automatic pattern analysis from performance metrics
 * - Success/failure pattern extraction
 * - Optimization opportunity identification
 * - Context-aware learning
 * - Multi-objective optimization
 * - Pattern explanation generation
 */

import { logger } from '../utils/logger.js';
import type { LearnedPattern } from './types.js';

export interface LearningConfig {
  /**
   * Maximum patterns to store per agent
   * Default: 100 (prevent unbounded memory growth)
   */
  maxPatternsPerAgent: number;
}

/**
 * Learning Manager - Simplified
 *
 * Intelligence delegated to LLM:
 * - Pattern analysis → LLM analyzes performance data and creates patterns
 * - Success/failure extraction → LLM identifies what works/doesn't work
 * - Optimization identification → LLM suggests improvements
 * - Context matching → LLM understands context
 */
export class LearningManager {
  private patterns: Map<string, LearnedPattern[]> = new Map(); // agentId -> patterns[]
  private config: LearningConfig;

  constructor(config?: Partial<LearningConfig>) {
    // Validate config
    if (config?.maxPatternsPerAgent !== undefined) {
      if (!Number.isFinite(config.maxPatternsPerAgent)) {
        throw new Error('maxPatternsPerAgent must be finite');
      }
      if (!Number.isSafeInteger(config.maxPatternsPerAgent) || config.maxPatternsPerAgent <= 0) {
        throw new Error('maxPatternsPerAgent must be a positive integer');
      }
    }

    this.config = {
      maxPatternsPerAgent: config?.maxPatternsPerAgent || 100,
    };

    logger.info('Learning manager initialized (simplified)', this.config);
  }

  /**
   * Add a learned pattern
   *
   * LLM should analyze performance data and create patterns.
   * This method simply stores the pattern.
   *
   * @param pattern - Learned pattern to store
   */
  addPattern(pattern: LearnedPattern): void {
    const agentId = pattern.agentId;

    if (!this.patterns.has(agentId)) {
      this.patterns.set(agentId, []);
    }

    const existing = this.patterns.get(agentId)!;

    // Check if pattern already exists
    const existingPatternIndex = existing.findIndex((p) => p.id === pattern.id);

    if (existingPatternIndex !== -1) {
      // Update existing pattern
      existing[existingPatternIndex] = {
        ...pattern,
        updatedAt: new Date(),
      };

      logger.debug('Pattern updated', {
        patternId: pattern.id,
        agentId,
        taskType: pattern.taskType,
      });
    } else {
      // Add new pattern
      existing.push(pattern);

      logger.debug('Pattern added', {
        patternId: pattern.id,
        agentId,
        taskType: pattern.taskType,
        confidence: pattern.confidence,
      });

      // Trim if exceeds max (keep highest confidence patterns)
      if (existing.length > this.config.maxPatternsPerAgent) {
        existing.sort((a, b) => b.confidence - a.confidence);
        this.patterns.set(agentId, existing.slice(0, this.config.maxPatternsPerAgent));

        logger.debug('Trimmed patterns for agent', {
          agentId,
          kept: this.config.maxPatternsPerAgent,
          removed: existing.length - this.config.maxPatternsPerAgent,
        });
      }
    }
  }

  /**
   * Get patterns for an agent
   *
   * @param agentId - Agent identifier
   * @param filter - Optional filters for type, taskType, minConfidence
   * @returns Array of learned patterns matching the filters
   */
  getPatterns(
    agentId: string,
    filter?: {
      type?: LearnedPattern['type'];
      taskType?: string;
      minConfidence?: number;
    }
  ): LearnedPattern[] {
    // Validate filter.minConfidence
    if (filter?.minConfidence !== undefined) {
      if (!Number.isFinite(filter.minConfidence)) {
        throw new Error('minConfidence must be finite');
      }
      if (filter.minConfidence < 0 || filter.minConfidence > 1) {
        throw new Error('minConfidence must be between 0 and 1');
      }
    }

    let patterns = this.patterns.get(agentId) || [];

    if (filter) {
      if (filter.type) {
        patterns = patterns.filter((p) => p.type === filter.type);
      }
      if (filter.taskType) {
        patterns = patterns.filter((p) => p.taskType === filter.taskType);
      }
      if (filter.minConfidence !== undefined) {
        patterns = patterns.filter((p) => p.confidence >= filter.minConfidence!);
      }
    }

    return patterns;
  }

  /**
   * Clear patterns for an agent
   *
   * @param agentId - Agent identifier
   */
  clearPatterns(agentId: string): void {
    this.patterns.delete(agentId);
    logger.info('Patterns cleared', { agentId });
  }

  /**
   * Get all agents with learned patterns
   *
   * @returns Array of agent IDs
   */
  getAgentsWithPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }
}
