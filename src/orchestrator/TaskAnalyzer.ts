/**
 * TaskAnalyzer - 智能任務分析器
 *
 * 功能：
 * - 分析任務複雜度 (simple/medium/complex)
 * - 估算所需資源 (tokens, memory)
 * - 推薦執行模式 (parallel/sequential)
 * - 計算預估成本
 */

import { Task, TaskAnalysis, TaskComplexity, ExecutionMode, AgentType } from './types.js';
import { MODEL_COSTS, CLAUDE_MODELS } from '../config/models.js';
import { appConfig } from '../config/index.js';

export class TaskAnalyzer {
  private simpleTaskThreshold: number;

  constructor() {
    this.simpleTaskThreshold = appConfig.orchestrator.simpleTaskThreshold;
  }

  /**
   * 分析任務並返回詳細分析結果
   */
  async analyze(task: Task): Promise<TaskAnalysis> {
    const complexity = this.determineComplexity(task);
    const estimatedTokens = this.estimateTokens(task, complexity);
    const requiredAgents = this.determineRequiredAgents(complexity);
    const executionMode = this.determineExecutionMode(task);
    const estimatedCost = this.calculateEstimatedCost(estimatedTokens, complexity);
    const reasoning = this.generateReasoning(task, complexity, estimatedTokens);

    return {
      taskId: task.id,
      complexity,
      estimatedTokens,
      estimatedCost,
      requiredAgents,
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

    // 複雜任務指標
    const complexIndicators = [
      'analyze system architecture',
      'design database schema',
      'refactor codebase',
      'implement algorithm',
      'optimize performance',
      'security audit',
      'multi-step',
      'comprehensive',
    ];

    // 簡單任務指標
    const simpleIndicators = [
      'format',
      'rename',
      'simple query',
      'basic validation',
      'quick fix',
      'typo',
      'comment',
    ];

    // 檢查複雜指標
    const hasComplexIndicator = complexIndicators.some(indicator =>
      description.includes(indicator)
    );

    // 檢查簡單指標
    const hasSimpleIndicator = simpleIndicators.some(indicator =>
      description.includes(indicator)
    );

    if (hasComplexIndicator || wordCount > 100) {
      return 'complex';
    }

    if (hasSimpleIndicator || wordCount < this.simpleTaskThreshold) {
      return 'simple';
    }

    return 'medium';
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
   * 確定所需 Agent 類型
   */
  private determineRequiredAgents(complexity: TaskComplexity): AgentType[] {
    switch (complexity) {
      case 'simple':
        return ['claude-haiku'];
      case 'medium':
        return ['claude-sonnet'];
      case 'complex':
        return ['claude-opus', 'claude-sonnet']; // Opus 優先，Sonnet 作為備選
      default:
        return ['claude-sonnet'];
    }
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
   * 計算預估成本 (USD)
   */
  private calculateEstimatedCost(tokens: number, complexity: TaskComplexity): number {
    const modelCosts = {
      simple: MODEL_COSTS[CLAUDE_MODELS.HAIKU],
      medium: MODEL_COSTS[CLAUDE_MODELS.SONNET],
      complex: MODEL_COSTS[CLAUDE_MODELS.OPUS],
    };

    const costs = modelCosts[complexity];
    const inputCost = (tokens / 1_000_000) * costs.input;
    const outputCost = (tokens / 1_000_000) * costs.output;

    return Number((inputCost + outputCost).toFixed(6));
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
