// src/core/WorkflowGuidanceEngine.ts
import type { LearningManager } from '../evolution/LearningManager.js';

/**
 * Workflow phase enum
 */
export type WorkflowPhase =
  | 'idle'
  | 'code-written'
  | 'test-complete'
  | 'commit-ready'
  | 'committed';

/**
 * Workflow context for analysis
 */
export interface WorkflowContext {
  phase: WorkflowPhase;
  filesChanged?: string[];
  testsPassing?: boolean;
  reviewed?: boolean;
  committed?: boolean;
  lastAction?: string;
}

/**
 * Recommendation action types
 */
export type RecommendationAction =
  | 'run-tests'
  | 'fix-tests'
  | 'code-review'
  | 'commit-changes'
  | 'run-specific-agent'
  | 'update-docs'
  | 'check-dependencies';

/**
 * Recommendation priority levels
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Single workflow recommendation
 */
export interface WorkflowRecommendation {
  action: RecommendationAction;
  priority: RecommendationPriority;
  description: string;
  reasoning: string;
  estimatedTime?: string;
  suggestedAgent?: string;
}

/**
 * Complete guidance result
 */
export interface WorkflowGuidance {
  recommendations: WorkflowRecommendation[];
  confidence: number; // 0-1
  reasoning: string[];
  learnedFromPatterns: boolean;
}

/**
 * Analyzes workflow state and generates intelligent recommendations
 */
export class WorkflowGuidanceEngine {
  constructor(private learningManager: LearningManager) {}

  /**
   * Analyze workflow context and generate recommendations
   */
  analyzeWorkflow(context: WorkflowContext): WorkflowGuidance {
    const recommendations: WorkflowRecommendation[] = [];
    const reasoning: string[] = [];
    let learnedFromPatterns = false;

    // Check learned patterns from LearningManager
    const patterns = this.learningManager.getPatterns();
    if (patterns.length > 0) {
      const relevantPatterns = patterns.filter(
        (p) => p.successRate > 0.7 && p.observationCount >= 5
      );

      if (relevantPatterns.length > 0) {
        learnedFromPatterns = true;
        reasoning.push(
          `Applied ${relevantPatterns.length} learned pattern(s) from past successes`
        );

        // Extract recommendations from patterns
        for (const pattern of relevantPatterns) {
          for (const action of pattern.actions) {
            if (action === 'fix-tests' && !context.testsPassing) {
              recommendations.push({
                action: 'fix-tests',
                priority: 'high',
                description: 'Fix failing tests',
                reasoning: `Based on learned pattern: fix tests (${(pattern.successRate * 100).toFixed(0)}% success rate)`,
              });
            }
          }
        }
      }
    }

    // Phase-based recommendations
    if (context.phase === 'code-written') {
      if (!context.testsPassing) {
        recommendations.push({
          action: 'run-tests',
          priority: 'high',
          description: 'Run tests to verify code changes',
          reasoning:
            'Code has been written but tests have not been verified',
          estimatedTime: '1-2 minutes',
        });
        reasoning.push('Tests should be run after code changes');
      }
    }

    if (context.phase === 'test-complete') {
      if (context.testsPassing && !context.reviewed) {
        recommendations.push({
          action: 'code-review',
          priority: 'medium',
          description: 'Request code review',
          reasoning: 'Tests are passing, ready for code review',
          estimatedTime: '5-10 minutes',
          suggestedAgent: 'code-reviewer',
        });
        reasoning.push('Code review recommended after tests pass');
      }

      if (!context.testsPassing) {
        recommendations.push({
          action: 'fix-tests',
          priority: 'high',
          description: 'Fix failing tests before proceeding',
          reasoning: 'Tests must pass before code can be committed',
          estimatedTime: '5-15 minutes',
        });
        reasoning.push('Failing tests must be addressed');
      }
    }

    // Calculate confidence based on patterns and context clarity
    const confidence = this.calculateConfidence(
      context,
      recommendations,
      learnedFromPatterns
    );

    return {
      recommendations,
      confidence,
      reasoning,
      learnedFromPatterns,
    };
  }

  /**
   * Calculate confidence score for recommendations
   */
  private calculateConfidence(
    context: WorkflowContext,
    recommendations: WorkflowRecommendation[],
    learnedFromPatterns: boolean
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if learned from patterns
    if (learnedFromPatterns) {
      confidence += 0.2;
    }

    // Increase confidence if context is clear
    if (context.phase !== 'idle' && recommendations.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if multiple signals align
    if (context.filesChanged && context.filesChanged.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
