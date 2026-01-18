/**
 * TaskAnalyzer - 智能任務分析器
 *
 * 功能：
 * - 分析任務複雜度 (simple/medium/complex)
 * - 估算所需資源 (tokens, memory)
 * - 推薦執行模式 (parallel/sequential)
 * - 計算預估成本
 */

import { Task, TaskAnalysis, TaskComplexity, ExecutionMode, TaskCapability } from './types.js';
import { MODEL_COSTS, CLAUDE_MODELS } from '../config/models.js';
import { type MicroDollars, calculateTokenCost, addCosts } from '../utils/money.js';

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
   * 分析任務並返回詳細分析結果
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
   * 判斷任務複雜度
   */
  private determineComplexity(task: Task): TaskComplexity {
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
   * 估算任務所需 tokens
   */
  private estimateTokens(task: Task, complexity: TaskComplexity): number {
    const baseTokens = task.description.length * 0.3; // 粗略估算：1 token ≈ 3.33 chars

    const complexityMultiplier = {
      simple: 1.5,
      medium: 3.0,
      complex: 5.0,
    };

    return Math.ceil(baseTokens * complexityMultiplier[complexity]);
  }

  /**
   * 檢測任務所需能力（基於任務描述關鍵字分析）
   * 改進：不再僅基於複雜度，而是分析任務內容來檢測實際需要的能力
   */
  private detectRequiredCapabilities(task: Task, complexity: TaskComplexity): TaskCapability[] {
    const description = task.description.toLowerCase();
    const detectedCapabilities: TaskCapability[] = [];

    // 關鍵字到 Agent 的映射
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

    // 檢測任務描述中的關鍵字
    for (const [capability, config] of Object.entries(keywordToAgent)) {
      if (!config) continue;
      const { keywords } = config;
      if (keywords.some(keyword => description.includes(keyword))) {
        detectedCapabilities.push(capability as TaskCapability);
      }
    }

    // 如果沒有檢測到特定能力，根據複雜度返回默認 Agent
    if (detectedCapabilities.length === 0) {
      if (complexity === 'complex') {
        return ['architecture', 'general'];
      }
      return ['general'];
    }

    return detectedCapabilities;
  }

  /**
   * 判斷執行模式
   */
  private determineExecutionMode(task: Task): ExecutionMode {
    const description = task.description.toLowerCase();

    // 平行處理指標
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
   * 計算預估成本 (使用整數運算)
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
   * 生成分析推理說明
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
   * 批次分析多個任務
   */
  async analyzeBatch(tasks: Task[]): Promise<TaskAnalysis[]> {
    return Promise.all(tasks.map(task => this.analyze(task)));
  }

  /**
   * 獲取任務優先順序建議
   */
  suggestPriority(analysis: TaskAnalysis): number {
    // 複雜度越高，優先級越高
    const complexityPriority = {
      simple: 1,
      medium: 2,
      complex: 3,
    };

    return complexityPriority[analysis.complexity];
  }
}
