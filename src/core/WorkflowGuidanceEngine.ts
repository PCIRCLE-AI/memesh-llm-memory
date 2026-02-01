/**
 * Workflow Guidance Engine - Intelligent Development Workflow Recommendations
 *
 * Analyzes the current development workflow state and generates intelligent,
 * context-aware recommendations for next steps. Leverages learned patterns from
 * past successful workflows to improve recommendations over time.
 *
 * Features:
 * - **Phase-Based Analysis**: Recommends actions based on current workflow phase
 * - **Learning Integration**: Uses LearningManager patterns to improve recommendations
 * - **Confidence Scoring**: Provides confidence levels (0-1) for recommendations
 * - **Priority Classification**: Categorizes recommendations by priority (low to critical)
 * - **Agent Suggestions**: Recommends specific agents for certain actions
 *
 * Workflow Phases:
 * 1. **idle**: No active work
 * 2. **code-written**: Code changes made, tests not run
 * 3. **test-complete**: Tests run (may have passed or failed)
 * 4. **commit-ready**: Tests passed, ready to commit
 * 5. **committed**: Changes committed to version control
 *
 * @example
 * ```typescript
 * import { WorkflowGuidanceEngine } from './WorkflowGuidanceEngine.js';
 * import { LearningManager } from '../evolution/LearningManager.js';
 *
 * const learningManager = new LearningManager();
 * const engine = new WorkflowGuidanceEngine(learningManager);
 *
 * // Analyze workflow after writing code
 * const guidance = engine.analyzeWorkflow({
 *   phase: 'code-written',
 *   filesChanged: ['src/api/users.ts', 'src/api/auth.ts'],
 *   testsPassing: undefined // Tests not run yet
 * });
 *
 * console.log(`Confidence: ${(guidance.confidence * 100).toFixed(1)}%`);
 * guidance.recommendations.forEach(rec => {
 *   console.log(`[${rec.priority}] ${rec.action}: ${rec.description}`);
 *   console.log(`  Reasoning: ${rec.reasoning}`);
 *   if (rec.estimatedTime) {
 *     console.log(`  Time: ${rec.estimatedTime}`);
 *   }
 * });
 * ```
 */

import type { LearningManager } from '../evolution/LearningManager.js';
import type { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import { MistakePatternManager, type MistakePattern } from './MistakePatternManager.js';
import { SkillsKnowledgeIntegrator } from './SkillsKnowledgeIntegrator.js';
import { StateError, ValidationError } from '../errors/index.js';

/**
 * Workflow phase enum
 *
 * Represents the current stage in the development workflow lifecycle.
 * Each phase has specific recommended actions and validation requirements.
 *
 * @example
 * ```typescript
 * const phase: WorkflowPhase = 'code-written';
 *
 * // Typical progression:
 * // idle → code-written → test-complete → commit-ready → committed → idle
 * ```
 */
export type WorkflowPhase =
  | 'idle'
  | 'code-written'
  | 'test-complete'
  | 'commit-ready'
  | 'committed';

/**
 * Workflow context for analysis
 *
 * Captures the current state of the development workflow to enable
 * intelligent recommendation generation. All fields except phase are optional.
 *
 * @example
 * ```typescript
 * // After writing code, before running tests
 * const context: WorkflowContext = {
 *   phase: 'code-written',
 *   filesChanged: ['src/api/users.ts'],
 *   testsPassing: undefined, // Tests not run yet
 *   reviewed: false
 * };
 *
 * // After tests pass
 * const context2: WorkflowContext = {
 *   phase: 'test-complete',
 *   filesChanged: ['src/api/users.ts'],
 *   testsPassing: true,
 *   reviewed: false,
 *   lastAction: 'npm test'
 * };
 * ```
 */
export interface WorkflowContext {
  /** Current workflow phase */
  phase: WorkflowPhase;

  /** List of file paths that have been modified */
  filesChanged?: string[];

  /** Test status: undefined = not run, true = passed, false = failed */
  testsPassing?: boolean;

  /** Whether code has been reviewed */
  reviewed?: boolean;

  /** Whether changes have been committed */
  committed?: boolean;

  /** Last action taken (for context) */
  lastAction?: string;
}

/**
 * Recommendation action types
 *
 * Defines the specific actions that can be recommended by the workflow engine.
 * Each action corresponds to a concrete step in the development process.
 *
 * @example
 * ```typescript
 * const action: RecommendationAction = 'run-tests';
 * ```
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
 *
 * Indicates the urgency and importance of a recommendation.
 * Higher priority recommendations should be addressed first.
 *
 * @example
 * ```typescript
 * const priority: RecommendationPriority = 'high';
 * // Critical: Must do now (security issues, broken tests blocking work)
 * // High: Should do soon (run tests, fix failures)
 * // Medium: Good to do (code review, update docs)
 * // Low: Nice to have (check dependencies, optimizations)
 * ```
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Single workflow recommendation
 *
 * Represents a specific recommended action with context about why it's
 * recommended, how important it is, and optionally which agent should handle it.
 *
 * @example
 * ```typescript
 * const recommendation: WorkflowRecommendation = {
 *   action: 'code-review',
 *   priority: 'medium',
 *   description: 'Request code review',
 *   reasoning: 'Tests are passing, ready for code review',
 *   estimatedTime: '5-10 minutes',
 *   suggestedAgent: 'code-reviewer'
 * };
 * ```
 */
export interface WorkflowRecommendation {
  /** Type of action to take */
  action: RecommendationAction;

  /** Priority level of this recommendation */
  priority: RecommendationPriority;

  /** Human-readable description of the recommendation */
  description: string;

  /** Explanation of why this action is recommended */
  reasoning: string;

  /** Estimated time to complete (e.g., "1-2 minutes", "5-10 minutes") */
  estimatedTime?: string;

  /** Agent type that should handle this action (if applicable) */
  suggestedAgent?: string;
}

/**
 * Complete guidance result
 *
 * Contains all recommendations and metadata about the analysis.
 * Includes confidence score and reasoning for transparency.
 *
 * @example
 * ```typescript
 * const guidance: WorkflowGuidance = {
 *   recommendations: [
 *     {
 *       action: 'run-tests',
 *       priority: 'high',
 *       description: 'Run tests to verify code changes',
 *       reasoning: 'Code has been written but tests have not been run',
 *       estimatedTime: '1-2 minutes'
 *     }
 *   ],
 *   confidence: 0.8,
 *   reasoning: [
 *     'Tests should be run after code changes',
 *     'Applied 3 learned pattern(s) from past successes'
 *   ],
 *   learnedFromPatterns: true,
 *   mistakePatterns: []
 * };
 * ```
 */
export interface WorkflowGuidance {
  /** List of recommended actions sorted by priority */
  recommendations: WorkflowRecommendation[];

  /** Confidence score (0.0 to 1.0) for these recommendations */
  confidence: number;

  /** List of reasoning statements explaining the recommendations */
  reasoning: string[];

  /** Whether learned patterns influenced these recommendations */
  learnedFromPatterns: boolean;

  /** Mistake patterns relevant to current phase (top 3 by weight) */
  mistakePatterns: MistakePattern[];
}

/**
 * Workflow Guidance Engine Class
 *
 * Analyzes workflow state and generates intelligent recommendations for next steps.
 * Integrates with LearningManager to leverage learned patterns from past workflows.
 *
 * Pattern Filtering Thresholds:
 * - Minimum pattern confidence: 0.7 (70%)
 * - Minimum observation count: 5 observations
 *
 * @example
 * ```typescript
 * import { WorkflowGuidanceEngine } from './WorkflowGuidanceEngine.js';
 * import { LearningManager } from '../evolution/LearningManager.js';
 *
 * const learningManager = new LearningManager();
 * const engine = new WorkflowGuidanceEngine(learningManager);
 *
 * // Get recommendations for current workflow state
 * const guidance = engine.analyzeWorkflow({
 *   phase: 'code-written',
 *   filesChanged: ['src/api/users.ts'],
 *   testsPassing: undefined
 * });
 *
 * // Display recommendations
 * guidance.recommendations.forEach(rec => {
 *   console.log(`[${rec.priority}] ${rec.description}`);
 * });
 * ```
 */
export class WorkflowGuidanceEngine {
  // Constants for pattern filtering
  private static readonly MIN_PATTERN_CONFIDENCE = 0.7;
  private static readonly MIN_OBSERVATION_COUNT = 5;
  private static readonly MAX_MISTAKE_PATTERNS = 3; // Top 3 patterns by weight
  private static readonly MISTAKE_WARNING_THRESHOLD = 0.7; // High weight patterns

  private mistakePatternManager?: MistakePatternManager;
  private skillsIntegrator: SkillsKnowledgeIntegrator;

  /**
   * Create a new WorkflowGuidanceEngine
   *
   * @param learningManager - LearningManager instance for accessing learned patterns
   * @param memoryStore - Optional UnifiedMemoryStore for mistake pattern learning
   */
  constructor(
    private learningManager: LearningManager,
    memoryStore?: UnifiedMemoryStore
  ) {
    if (memoryStore) {
      this.mistakePatternManager = new MistakePatternManager(memoryStore);
    }

    // Initialize skills integrator and load skills asynchronously
    this.skillsIntegrator = new SkillsKnowledgeIntegrator();
    this.skillsIntegrator.scanSkills();
  }

  /**
   * Analyze workflow context and generate recommendations
   *
   * Examines the current workflow state and generates prioritized recommendations
   * for next actions. Considers learned patterns from LearningManager to improve
   * recommendations based on past successful workflows.
   *
   * Recommendation Logic:
   * - **code-written phase**: Recommends running tests if not run or tests failed
   * - **test-complete phase**: Recommends code review if tests passed, or fixing tests if failed
   * - Uses learned patterns with confidence ≥ 0.7 and observation count ≥ 5
   * - Calculates confidence score based on context clarity and learned patterns
   *
   * @param context - Current workflow state with phase and optional metadata
   * @returns WorkflowGuidance with recommendations, confidence score, and reasoning
   * @throws StateError if context is null/undefined
   * @throws ValidationError if phase is not a valid WorkflowPhase
   *
   * @example
   * ```typescript
   * import { WorkflowGuidanceEngine } from './WorkflowGuidanceEngine.js';
   *
   * const engine = new WorkflowGuidanceEngine(learningManager);
   *
   * // After writing code
   * const guidance1 = engine.analyzeWorkflow({
   *   phase: 'code-written',
   *   filesChanged: ['src/api/users.ts', 'src/api/auth.ts'],
   *   testsPassing: undefined
   * });
   * // Recommended: run-tests (high priority)
   *
   * // After tests fail
   * const guidance2 = engine.analyzeWorkflow({
   *   phase: 'test-complete',
   *   filesChanged: ['src/api/users.ts'],
   *   testsPassing: false
   * });
   * // Recommended: fix-tests (high priority)
   *
   * // After tests pass
   * const guidance3 = engine.analyzeWorkflow({
   *   phase: 'test-complete',
   *   filesChanged: ['src/api/users.ts'],
   *   testsPassing: true,
   *   reviewed: false
   * });
   * // Recommended: code-review (medium priority)
   *
   * // Handle errors
   * try {
   *   const invalid = engine.analyzeWorkflow({
   *     phase: 'invalid-phase' as any
   *   });
   * } catch (error) {
   *   if (error instanceof ValidationError) {
   *     console.error('Invalid workflow phase');
   *   }
   * }
   * ```
   */
  async analyzeWorkflow(context: WorkflowContext): Promise<WorkflowGuidance> {
    // Input validation
    if (!context) {
      throw new StateError('WorkflowContext is required', {
        component: 'WorkflowGuidanceEngine',
        method: 'analyzeWorkflow',
      });
    }

    const validPhases: WorkflowPhase[] = [
      'idle',
      'code-written',
      'test-complete',
      'commit-ready',
      'committed',
    ];
    if (!validPhases.includes(context.phase)) {
      throw new ValidationError(`Invalid workflow phase: ${context.phase}`, {
        providedPhase: context.phase,
        validPhases,
      });
    }
    const recommendations: WorkflowRecommendation[] = [];
    const reasoning: string[] = [];
    let learnedFromPatterns = false;

    // Extract mistake patterns for current phase
    let mistakePatterns: MistakePattern[] = [];
    if (this.mistakePatternManager) {
      mistakePatterns = await this.mistakePatternManager.getTopPatterns(
        context.phase,
        WorkflowGuidanceEngine.MAX_MISTAKE_PATTERNS
      );

      // Add warnings for high-weight patterns
      const highWeightPatterns = mistakePatterns.filter(
        (p) => p.weight >= WorkflowGuidanceEngine.MISTAKE_WARNING_THRESHOLD
      );

      if (highWeightPatterns.length > 0) {
        reasoning.push(
          `⚠️  Found ${highWeightPatterns.length} recurring mistake pattern(s) in this phase`
        );
        // Add prevention recommendations
        highWeightPatterns.forEach((pattern) => {
          reasoning.push(`  - ${pattern.description}: ${pattern.prevention}`);
        });
      }
    }

    // Check learned patterns from LearningManager
    // Use 'workflow-guidance' as the agent ID for workflow-level patterns
    const patterns = this.learningManager.getPatterns('workflow-guidance');
    if (patterns.length > 0) {
      const relevantPatterns = patterns.filter(
        (p) =>
          p.confidence > WorkflowGuidanceEngine.MIN_PATTERN_CONFIDENCE &&
          p.observationCount >= WorkflowGuidanceEngine.MIN_OBSERVATION_COUNT
      );

      if (relevantPatterns.length > 0) {
        learnedFromPatterns = true;
        reasoning.push(
          `Applied ${relevantPatterns.length} learned pattern(s) from past successes`
        );
        // Patterns inform confidence calculation, not direct recommendations
      }
    }

    // Phase-based recommendations
    if (context.phase === 'code-written') {
      // testsPassing === undefined means tests not run yet
      // testsPassing === false means tests ran but failed
      if (
        context.testsPassing === undefined ||
        context.testsPassing === false
      ) {
        recommendations.push({
          action: 'run-tests',
          priority: 'high',
          description: 'Run tests to verify code changes',
          reasoning:
            context.testsPassing === undefined
              ? 'Code has been written but tests have not been run'
              : 'Tests were run but are failing',
          estimatedTime: '1-2 minutes',
        });
        reasoning.push('Tests should be run after code changes');
      }

      // Add skills-based enhancements for code-written phase
      const skillsEnhancements = this.skillsIntegrator.getRecommendationEnhancements(
        context.phase
      );
      if (skillsEnhancements.length > 0) {
        reasoning.push('📚 Skills Knowledge:');
        skillsEnhancements.forEach((enhancement) => {
          reasoning.push(`  - ${enhancement}`);
        });
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

      // testsPassing === false means tests ran but failed
      if (context.testsPassing === false) {
        recommendations.push({
          action: 'fix-tests',
          priority: 'high',
          description: 'Fix failing tests before proceeding',
          reasoning: 'Tests must pass before code can be committed',
          estimatedTime: '5-15 minutes',
        });
        reasoning.push('Failing tests must be addressed');
      }

      // Add skills-based enhancements for test-complete phase
      const skillsEnhancements = this.skillsIntegrator.getRecommendationEnhancements(
        context.phase
      );
      if (skillsEnhancements.length > 0) {
        reasoning.push('📚 Skills Knowledge:');
        skillsEnhancements.forEach((enhancement) => {
          reasoning.push(`  - ${enhancement}`);
        });
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
      mistakePatterns,
    };
  }

  /**
   * Calculate confidence score for recommendations
   *
   * Computes a confidence score (0.0 to 1.0) for the generated recommendations
   * based on context clarity, learned patterns, and available signals. Higher
   * confidence indicates stronger certainty in the recommendations.
   *
   * Confidence Calculation Algorithm:
   * - **Base confidence**: 0.5 (50%) - default starting point
   * - **Learned patterns**: +0.3 (30%) if high-quality patterns available
   * - **Clear context**: +0.2 (20%) if active phase with recommendations
   * - **Files changed**: +0.1 (10%) if files list available
   * - **Test status**: +0.1 (10%) if test status known (not undefined)
   * - **Maximum**: 1.0 (100%) - capped at full confidence
   *
   * Score Interpretation:
   * - **0.5-0.6** (50-60%): Basic recommendation with limited context
   * - **0.7-0.8** (70-80%): Good recommendation with clear context
   * - **0.9-1.0** (90-100%): High confidence with learned patterns + rich context
   *
   * @param context - Current workflow state with phase and optional signals
   * @param recommendations - Array of generated recommendations (affects confidence if non-empty)
   * @param learnedFromPatterns - Whether high-quality learned patterns influenced recommendations
   * @returns Confidence score between 0.0 and 1.0 (inclusive)
   *
   * @example
   * ```typescript
   * // Low confidence: minimal context
   * const score1 = calculateConfidence(
   *   { phase: 'idle' },
   *   [],
   *   false
   * );
   * // Returns: 0.5 (base confidence only)
   *
   * // Medium confidence: clear context, no patterns
   * const score2 = calculateConfidence(
   *   { phase: 'code-written', filesChanged: ['api.ts'], testsPassing: undefined },
   *   [{ action: 'run-tests', priority: 'high', ... }],
   *   false
   * );
   * // Returns: 0.8 (base 0.5 + clear context 0.2 + files 0.1 + no test status yet)
   *
   * // High confidence: learned patterns + rich context
   * const score3 = calculateConfidence(
   *   { phase: 'test-complete', filesChanged: ['api.ts'], testsPassing: true },
   *   [{ action: 'code-review', priority: 'medium', ... }],
   *   true
   * );
   * // Returns: 1.0 (base 0.5 + patterns 0.3 + clear 0.2 + files 0.1 + tests 0.1 = 1.1, capped at 1.0)
   * ```
   */
  private calculateConfidence(
    context: WorkflowContext,
    recommendations: WorkflowRecommendation[],
    learnedFromPatterns: boolean
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if learned from high-quality patterns
    if (learnedFromPatterns) {
      confidence += 0.3; // Increased from 0.2
    }

    // Increase confidence if context is clear
    if (context.phase !== 'idle' && recommendations.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if multiple signals align
    if (context.filesChanged && context.filesChanged.length > 0) {
      confidence += 0.1;
    }

    // Increase confidence if test status is known (not undefined)
    if (context.testsPassing !== undefined) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
