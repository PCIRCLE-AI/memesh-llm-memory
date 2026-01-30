/**
 * TaskAnalyzer - Intelligent Task Analyzer
 *
 * Features:
 * - Analyze task complexity (simple/medium/complex)
 * - Estimate required resources (tokens, memory)
 * - Recommend execution mode (parallel/sequential)
 * - Calculate estimated cost
 */

import { Task, TaskAnalysis, TaskComplexity, ExecutionMode, TaskCapability } from './types.js';
import { MODEL_COSTS, CLAUDE_MODELS } from '../config/models.js';
import { type MicroDollars, calculateTokenCost, addCosts } from '../utils/money.js';
import { ValidationError } from '../errors/index.js'; // ✅ FIX HIGH-6: Import ValidationError

/**
 * Complexity detection configuration
 * Centralized indicator arrays for easier maintenance
 */
interface ComplexityRule {
  level: TaskComplexity;
  indicators: string[];
  wordCountLimit?: number;
  priority: number;
}

const COMPLEXITY_RULES: ComplexityRule[] = [
  // Complex tasks (highest priority)
  {
    level: 'complex',
    indicators: [
      'analyze system',
      'architecture',
      'design database',
      'database schema',
      'refactor codebase',
      'implement algorithm',
      'optimize performance',
      'security audit',
      'multi-step',
      'comprehensive',
      'security considerations',
    ],
    priority: 1,
  },
  // Medium tasks
  {
    level: 'medium',
    indicators: [
      'validation',
      'create function',
      'email',
      'user',
      'api',
      'endpoint',
      'component',
      'service',
      'authentication',
      'authorization',
    ],
    priority: 2,
  },
  // Simple tasks (requires word count check)
  {
    level: 'simple',
    indicators: [
      'format',
      'rename',
      'simple',
      'basic',
      'quick fix',
      'typo',
      'comment',
    ],
    wordCountLimit: 15,
    priority: 3,
  },
];

export class TaskAnalyzer {
  constructor() {
    // Constructor intentionally empty - configuration loaded when needed
  }

  /**
   * Analyze task and return detailed analysis results
   */
  async analyze(task: Task): Promise<TaskAnalysis> {
    const complexity = this.determineComplexity(task);
    const estimatedTokens = this.estimateTokens(task, complexity);
    const requiredCapabilities = this.detectRequiredCapabilities(task, complexity);
    const executionMode = this.determineExecutionMode(task);
    const estimatedCost = this.calculateEstimatedCost(estimatedTokens, complexity);
    const reasoning = this.generateReasoning(task, complexity, estimatedTokens);

    return {
      taskId: task.id,
      taskType: task.description.substring(0, 50), // First 50 chars as task type
      complexity,
      estimatedTokens,
      estimatedCost,
      requiredCapabilities,
      executionMode,
      reasoning,
    };
  }

  /**
   * Determine task complexity
   *
   * ✅ FIX HIGH-6: Added input validation to prevent DoS attacks
   */
  private determineComplexity(task: Task): TaskComplexity {
    // ✅ FIX HIGH-6: Validate description length to prevent DoS
    const MAX_DESCRIPTION_LENGTH = 10000; // 10KB max
    if (!task.description || typeof task.description !== 'string') {
      throw new ValidationError('Task description must be a non-empty string', {
        component: 'TaskAnalyzer',
        method: 'determineComplexity',
        providedType: typeof task.description,
      });
    }

    if (task.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(
        `Task description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`,
        {
          component: 'TaskAnalyzer',
          method: 'determineComplexity',
          providedLength: task.description.length,
          maxLength: MAX_DESCRIPTION_LENGTH,
        }
      );
    }

    const description = task.description.toLowerCase();
    const wordCount = task.description.split(/\s+/).length;

    // Check rules in priority order
    for (const rule of COMPLEXITY_RULES) {
      if (this.matchesRule(description, wordCount, rule)) {
        return rule.level;
      }
    }

    // Fallback: word count-based classification
    if (wordCount > 20) {
      return 'complex';
    }

    if (wordCount < 5) {
      return 'simple';
    }

    return 'medium';
  }

  /**
   * Check if task description matches a complexity rule
   */
  private matchesRule(
    description: string,
    wordCount: number,
    rule: ComplexityRule
  ): boolean {
    const hasIndicator = rule.indicators.some(indicator =>
      description.includes(indicator)
    );

    if (!hasIndicator) {
      return false;
    }

    // Check word count limit if specified
    if (rule.wordCountLimit !== undefined && wordCount >= rule.wordCountLimit) {
      return false;
    }

    return true;
  }

  /**
   * Estimate required tokens for task
   */
  private estimateTokens(task: Task, complexity: TaskComplexity): number {
    const baseTokens = task.description.length * 0.3; // Rough estimate: 1 token ≈ 3.33 chars

    const complexityMultiplier = {
      simple: 1.5,
      medium: 3.0,
      complex: 5.0,
    };

    return Math.ceil(baseTokens * complexityMultiplier[complexity]);
  }

  /**
   * Detect required task capabilities (based on task description keyword analysis)
   * Improvement: No longer based solely on complexity, but analyzes task content to detect actually needed capabilities
   */
  private detectRequiredCapabilities(task: Task, complexity: TaskComplexity): TaskCapability[] {
    const description = task.description.toLowerCase();
    const detectedCapabilities: TaskCapability[] = [];

    // Keyword to Agent mapping
    const keywordToAgent: Partial<Record<TaskCapability, { keywords: string[] }>> = {
      'code-review': {
        keywords: ['review', 'code review', 'check code', 'audit', 'quality', 'best practices'],
      },
      'testing': {
        keywords: ['test', 'testing', 'unit test', 'integration test', 'e2e', 'tdd', 'coverage'],
      },
      'debugging': {
        keywords: ['debug', 'bug', 'fix', 'error', 'issue', 'troubleshoot', 'investigate'],
      },
      'refactoring': {
        keywords: ['refactor', 'improve', 'optimize', 'clean up', 'restructure', 'simplify'],
      },
      'api-design': {
        keywords: ['api', 'endpoint', 'rest', 'graphql', 'interface design'],
      },
      'research': {
        keywords: ['research', 'investigate', 'study', 'compare', 'survey'],
      },
      'architecture': {
        keywords: ['architecture', 'design system', 'structure', 'architecture pattern', 'system design'],
      },
      'data-analysis': {
        keywords: ['data analysis', 'statistics', 'metrics', 'analytics', 'visualization'],
      },
      'documentation': {
        keywords: ['document', 'documentation', 'readme', 'api docs', 'guide', 'tutorial'],
      },
    };

    // Detect keywords in task description
    for (const [capability, config] of Object.entries(keywordToAgent)) {
      if (!config) continue;
      const { keywords } = config;
      if (keywords.some(keyword => description.includes(keyword))) {
        detectedCapabilities.push(capability as TaskCapability);
      }
    }

    // If no specific capability detected, return default Agent based on complexity
    if (detectedCapabilities.length === 0) {
      if (complexity === 'complex') {
        return ['architecture', 'general'];
      }
      return ['general'];
    }

    return detectedCapabilities;
  }

  /**
   * Determine execution mode
   */
  private determineExecutionMode(task: Task): ExecutionMode {
    const description = task.description.toLowerCase();

    // Parallel processing indicators
    const parallelIndicators = [
      'independent',
      'batch process',
      'multiple files',
      'parallel',
      'concurrent',
    ];

    const hasParallelIndicator = parallelIndicators.some(indicator =>
      description.includes(indicator)
    );

    return hasParallelIndicator ? 'parallel' : 'sequential';
  }

  /**
   * Calculate estimated cost (using integer arithmetic)
   *
   * @returns Cost in micro-dollars (μUSD) - integer for precision
   */
  private calculateEstimatedCost(tokens: number, complexity: TaskComplexity): MicroDollars {
    const modelCosts = {
      simple: MODEL_COSTS[CLAUDE_MODELS.HAIKU],
      medium: MODEL_COSTS[CLAUDE_MODELS.SONNET],
      complex: MODEL_COSTS[CLAUDE_MODELS.OPUS],
    };

    const costs = modelCosts[complexity];

    // Use integer arithmetic for precision
    const inputCost = calculateTokenCost(tokens, costs.input);
    const outputCost = calculateTokenCost(tokens, costs.output);

    return addCosts(inputCost, outputCost);
  }

  /**
   * Generate analysis reasoning explanation
   */
  private generateReasoning(
    task: Task,
    complexity: TaskComplexity,
    estimatedTokens: number
  ): string {
    const reasons: string[] = [];

    reasons.push(`Task complexity: ${complexity}`);
    reasons.push(`Estimated tokens: ${estimatedTokens}`);

    if (complexity === 'complex') {
      reasons.push('Requires advanced reasoning capabilities (Claude Opus recommended)');
    } else if (complexity === 'simple') {
      reasons.push('Simple task suitable for Claude Haiku (cost-efficient)');
    } else {
      reasons.push('Standard task suitable for Claude Sonnet (balanced performance)');
    }

    const wordCount = task.description.split(/\s+/).length;
    if (wordCount > 100) {
      reasons.push(`Long description (${wordCount} words) indicates complex requirements`);
    }

    return reasons.join('. ');
  }

  /**
   * Analyze multiple tasks in batch
   *
   * ✅ FIX MAJOR-2: Limit concurrency to prevent resource exhaustion
   */
  async analyzeBatch(tasks: Task[]): Promise<TaskAnalysis[]> {
    const CONCURRENCY_LIMIT = 10; // Maximum 10 concurrent analyses
    const results: TaskAnalysis[] = [];

    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
      const batch = tasks.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(batch.map(task => this.analyze(task)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get task priority recommendation
   */
  suggestPriority(analysis: TaskAnalysis): number {
    // Higher complexity = higher priority
    const complexityPriority = {
      simple: 1,
      medium: 2,
      complex: 3,
    };

    return complexityPriority[analysis.complexity];
  }
}
