/**
 * CostTracker - 成本追蹤與預算管理
 *
 * 功能：
 * - 追蹤每個任務的成本
 * - 計算累積成本
 * - 預算警報
 * - 成本報告生成
 *
 * 使用整數運算 (micro-dollars) 避免浮點精度錯誤
 */

import { CostRecord, CostStats } from './types.js';
import { MODEL_COSTS } from '../config/models.js';
import { appConfig } from '../config/index.js';
import {
  type MicroDollars,
  toMicroDollars,
  toDollars,
  formatMoney,
  calculateTokenCost,
  addCosts,
  calculateBudgetPercentage,
} from '../utils/money.js';
import { logger } from '../utils/logger.js';

export class CostTracker {
  private costs: CostRecord[] = [];
  /** Monthly budget in micro-dollars (μUSD) */
  private monthlyBudget: MicroDollars;
  private alertThreshold: number;

  constructor() {
    // Convert USD budget to micro-dollars for precise tracking
    this.monthlyBudget = toMicroDollars(appConfig.costs.monthlyBudget);
    this.alertThreshold = appConfig.costs.alertThreshold;
  }

  /**
   * 記錄任務成本
   *
   * @returns Cost in micro-dollars (μUSD)
   */
  recordCost(
    taskId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): MicroDollars {
    const cost = this.calculateCost(modelName, inputTokens, outputTokens);

    const record: CostRecord = {
      timestamp: new Date(),
      taskId,
      modelName,
      inputTokens,
      outputTokens,
      cost,
    };

    this.costs.push(record);

    // 檢查是否超過預算警告閾值
    this.checkBudgetAlert();

    return cost;
  }

  /**
   * 計算特定模型的成本 (使用整數運算)
   *
   * @returns Cost in micro-dollars (μUSD) - integer for precision
   */
  private calculateCost(
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): MicroDollars {
    const costs = MODEL_COSTS[modelName as keyof typeof MODEL_COSTS];

    // Error handling for unknown models or models without input/output pricing
    if (!costs || !('input' in costs && 'output' in costs)) {
      logger.warn(
        `⚠️  Unknown model or unsupported cost structure: ${modelName}\n` +
        `   Using fallback pricing (Claude Sonnet: $3/$15 per 1M tokens) for cost estimation.\n` +
        `   Please add this model to MODEL_COSTS configuration.`
      );

      // Use Claude Sonnet as conservative fallback pricing
      // Integer arithmetic: no floating-point errors
      const inputCost = calculateTokenCost(inputTokens, 3.0);
      const outputCost = calculateTokenCost(outputTokens, 15.0);

      return addCosts(inputCost, outputCost);
    }

    // TypeScript now knows costs has input and output properties
    // Use integer arithmetic for precision
    const inputCost = calculateTokenCost(inputTokens, costs.input);
    const outputCost = calculateTokenCost(outputTokens, costs.output);

    return addCosts(inputCost, outputCost);
  }

  /**
   * 獲取成本統計 (使用整數運算)
   */
  getStats(): CostStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 篩選本月成本
    const monthlyCosts = this.costs.filter(
      record => record.timestamp >= monthStart
    );

    // Integer addition - no floating-point errors
    const totalCost = monthlyCosts.reduce(
      (sum, record) => (sum + record.cost) as MicroDollars,
      0 as MicroDollars
    );

    const taskCount = monthlyCosts.length;
    const averageCostPerTask = taskCount > 0
      ? Math.round(totalCost / taskCount) as MicroDollars
      : 0 as MicroDollars;

    // 按模型統計成本 (integer arithmetic)
    const costByModel = monthlyCosts.reduce((acc, record) => {
      const currentCost = (acc[record.modelName] || 0) as number;
      acc[record.modelName] = (currentCost + record.cost) as MicroDollars;
      return acc;
    }, {} as Record<string, MicroDollars>);

    const remainingBudget = (this.monthlyBudget - totalCost) as MicroDollars;

    return {
      totalCost,
      taskCount,
      averageCostPerTask,
      costByModel,
      monthlySpend: totalCost,
      remainingBudget,
    };
  }

  /**
   * 檢查預算警告
   */
  private checkBudgetAlert(): void {
    const stats = this.getStats();
    const budgetUsagePercent = calculateBudgetPercentage(
      stats.monthlySpend,
      this.monthlyBudget
    ) / 100;

    if (budgetUsagePercent >= this.alertThreshold) {
      logger.warn(
        `\n⚠️  BUDGET ALERT ⚠️\n` +
        `Monthly spend: ${formatMoney(stats.monthlySpend, 2)} / ${formatMoney(this.monthlyBudget, 2)}\n` +
        `Usage: ${(budgetUsagePercent * 100).toFixed(1)}%\n` +
        `Remaining: ${formatMoney(stats.remainingBudget, 2)}\n`
      );
    }
  }

  /**
   * 獲取特定時間範圍的成本
   *
   * @returns Cost in micro-dollars (μUSD)
   */
  getCostByDateRange(startDate: Date, endDate: Date): MicroDollars {
    const filtered = this.costs.filter(
      record => record.timestamp >= startDate && record.timestamp <= endDate
    );

    return filtered.reduce(
      (sum, record) => (sum + record.cost) as MicroDollars,
      0 as MicroDollars
    );
  }

  /**
   * 獲取特定任務的成本
   *
   * @returns Cost in micro-dollars (μUSD)
   */
  getCostByTask(taskId: string): MicroDollars {
    const taskCosts = this.costs.filter(record => record.taskId === taskId);
    return taskCosts.reduce(
      (sum, record) => (sum + record.cost) as MicroDollars,
      0 as MicroDollars
    );
  }

  /**
   * 生成成本報告
   */
  generateReport(): string {
    const stats = this.getStats();
    const budgetUsagePercent = calculateBudgetPercentage(
      stats.monthlySpend,
      this.monthlyBudget
    );

    const lines = [
      '📊 Cost Report',
      '═'.repeat(50),
      '',
      `Total Tasks: ${stats.taskCount}`,
      `Total Cost: ${formatMoney(stats.totalCost)}`,
      `Average Cost/Task: ${formatMoney(stats.averageCostPerTask)}`,
      '',
      `Monthly Budget: ${formatMoney(this.monthlyBudget, 2)}`,
      `Monthly Spend: ${formatMoney(stats.monthlySpend)}`,
      `Remaining Budget: ${formatMoney(stats.remainingBudget)}`,
      `Budget Usage: ${budgetUsagePercent.toFixed(1)}%`,
      '',
      'Cost by Model:',
      '─'.repeat(50),
    ];

    for (const [model, cost] of Object.entries(stats.costByModel)) {
      const percentage = calculateBudgetPercentage(cost, stats.totalCost);
      lines.push(`  ${model}: ${formatMoney(cost)} (${percentage.toFixed(1)}%)`);
    }

    lines.push('═'.repeat(50));

    return lines.join('\n');
  }

  /**
   * 清除歷史記錄 (保留最近 N 筆)
   */
  clearOldRecords(keepRecent: number = 1000): void {
    if (this.costs.length > keepRecent) {
      this.costs = this.costs.slice(-keepRecent);
      logger.info(`🧹 Cleared old cost records. Keeping ${keepRecent} recent records.`);
    }
  }

  /**
   * 導出成本數據 (JSON)
   */
  exportData(): string {
    return JSON.stringify(
      {
        costs: this.costs,
        stats: this.getStats(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * 檢查是否在預算內
   *
   * @param estimatedCost - Estimated cost in micro-dollars (μUSD)
   */
  isWithinBudget(estimatedCost: MicroDollars): boolean {
    const stats = this.getStats();
    const projectedSpend = (stats.monthlySpend + estimatedCost) as MicroDollars;

    return projectedSpend <= this.monthlyBudget;
  }

  /**
   * 獲取建議 (基於當前預算使用情況)
   */
  getRecommendation(): string {
    const stats = this.getStats();
    const budgetUsagePercent = calculateBudgetPercentage(
      stats.monthlySpend,
      this.monthlyBudget
    );

    if (budgetUsagePercent < 50) {
      return '✅ Budget usage is healthy. Continue normal operations.';
    } else if (budgetUsagePercent < 80) {
      return '⚠️  Budget usage is moderate. Monitor spending closely.';
    } else if (budgetUsagePercent < 100) {
      return '🚨 Budget usage is high. Consider using more cost-efficient models (Haiku).';
    } else {
      return '❌ Budget exceeded! Switch to Haiku-only mode or pause operations.';
    }
  }
}
