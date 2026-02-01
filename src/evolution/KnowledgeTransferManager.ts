// src/evolution/KnowledgeTransferManager.ts
import type { LearningManager } from './LearningManager.js';
import type { TransferabilityChecker } from './TransferabilityChecker.js';
import type {
  ContextualPattern,
  PatternContext,
  TransferablePattern,
  PatternTransferability,
} from './types.js';

/**
 * Options for finding transferable patterns
 */
export interface FindTransferableOptions {
  /**
   * Minimum confidence threshold for source patterns
   * @default 0.7
   */
  minConfidence?: number;

  /**
   * Minimum observations threshold for source patterns
   * @default 10
   */
  minObservations?: number;

  /**
   * Minimum applicability score for transfer
   * @default 0.7
   */
  minApplicabilityScore?: number;
}

/**
 * Knowledge Transfer Manager
 *
 * Orchestrates cross-agent pattern discovery and transfer
 */
export class KnowledgeTransferManager {
  /**
   * Default thresholds for pattern transfer
   */
  private readonly DEFAULT_OPTIONS: Required<FindTransferableOptions> = {
    minConfidence: 0.7,
    minObservations: 10,
    minApplicabilityScore: 0.7,
  };

  constructor(
    private readonly learningManager: LearningManager,
    private readonly transferabilityChecker: TransferabilityChecker
  ) {}

  /**
   * Find patterns from source agent that are transferable to target agent
   *
   * @param sourceAgentId - Source agent ID
   * @param targetAgentId - Target agent ID
   * @param targetContext - Target agent context
   * @param options - Filtering options
   * @returns Array of transferable patterns
   */
  async findTransferablePatterns(
    sourceAgentId: string,
    targetAgentId: string,
    targetContext: PatternContext,
    options: FindTransferableOptions = {}
  ): Promise<TransferablePattern[]> {
    // Merge with defaults
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Step 1: Get all patterns from source agent
    const sourcePatterns = this.learningManager.getPatterns(sourceAgentId, {
      minConfidence: opts.minConfidence,
    });

    // Step 2: Filter by observations thresholds
    const qualifiedPatterns = sourcePatterns.filter(
      (pattern) => pattern.observationCount >= opts.minObservations
    );

    // Step 3: Assess transferability for each qualified pattern
    const transferablePatterns: TransferablePattern[] = [];

    for (const pattern of qualifiedPatterns) {
      // Convert LearnedPattern to ContextualPattern for compatibility
      const contextualPattern = {
        id: pattern.id,
        type: pattern.type,
        description: pattern.description,
        confidence: pattern.confidence,
        observations: pattern.observationCount,
        success_rate: pattern.successRate,
        avg_execution_time: 0, // Not tracked in simplified version
        last_seen: pattern.updatedAt.toISOString(),
        context: {
          agent_type: pattern.agentId,
          task_type: pattern.taskType,
          complexity: pattern.conditions.taskComplexity,
        },
      };

      const assessment = this.transferabilityChecker.assessTransferability(
        contextualPattern,
        sourceAgentId,
        targetAgentId,
        targetContext
      );

      // Step 4: Filter by applicability score
      if (assessment.applicabilityScore >= opts.minApplicabilityScore) {
        transferablePatterns.push({
          pattern: contextualPattern,
          sourceAgentId,
          transferredAt: new Date(),
          originalConfidence: pattern.confidence,
          adaptedForContext: targetContext,
        });
      }
    }

    return transferablePatterns;
  }
}
