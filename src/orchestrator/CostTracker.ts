/**
 * CostTracker - 成本追蹤與預算管理
 *
 * 功能：
 * - 追蹤每個任務的成本
 * - 計算累積成本
 * - 預算警報
 * - 成本報告生成
 */

import { CostRecord, CostStats } from './types.js';
import { MODEL_COSTS } from '../config/models.js';
import { appConfig } from '../config/index.js';

export class CostTracker {
  private costs: CostRecord[] = [];
  private monthlyBudget: number;
  private alertThreshold: number;

  constructor() {
    this.monthlyBudget = appConfig.costs.monthlyBudget;
    this.alertThreshold = appConfig.costs.alertThreshold;
  }

  /**
   * 記錄任務成本
   */
  recordCost(
    taskId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
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
   * 計算特定模型的成本
   */
  private calculateCost(
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs = MODEL_COSTS[modelName as keyof typeof MODEL_COSTS];

    if (!costs || !('input' in costs && 'output' in costs)) {
      console.warn(`⚠️  Unknown model: ${modelName}, using default cost`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;

    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * 獲取成本統計
   */
  getStats(): CostStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 篩選本月成本
    const monthlyCosts = this.costs.filter(
      record => record.timestamp >= monthStart
    );

    const totalCost = monthlyCosts.reduce((sum, record) => sum + record.cost, 0);
    const taskCount = monthlyCosts.length;
    const averageCostPerTask = taskCount > 0 ? totalCost / taskCount : 0;

    // 按模型統計成本
    const costByModel = monthlyCosts.reduce((acc, record) => {
      acc[record.modelName] = (acc[record.modelName] || 0) + record.cost;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCost: Number(totalCost.toFixed(6)),
      taskCount,
      averageCostPerTask: Number(averageCostPerTask.toFixed(6)),
      costByModel,
      monthlySpend: Number(totalCost.toFixed(6)),
      remainingBudget: Number((this.monthlyBudget - totalCost).toFixed(6)),
    };
  }

  /**
   * 檢查預算警告
   */
  private checkBudgetAlert(): void {
    const stats = this.getStats();
    const budgetUsagePercent = stats.monthlySpend / this.monthlyBudget;

    if (budgetUsagePercent >= this.alertThreshold) {
      console.warn(
        `\n⚠️  BUDGET ALERT ⚠️\n` +
        `Monthly spend: $${stats.monthlySpend.toFixed(2)} / $${this.monthlyBudget.toFixed(2)}\n` +
        `Usage: ${(budgetUsagePercent * 100).toFixed(1)}%\n` +
        `Remaining: $${stats.remainingBudget.toFixed(2)}\n`
      );
    }
  }

  /**
   * 獲取特定時間範圍的成本
   */
  getCostByDateRange(startDate: Date, endDate: Date): number {
    const filtered = this.costs.filter(
      record => record.timestamp >= startDate && record.timestamp <= endDate
    );

    const total = filtered.reduce((sum, record) => sum + record.cost, 0);
    return Number(total.toFixed(6));
  }

  /**
   * 獲取特定任務的成本
   */
  getCostByTask(taskId: string): number {
    const taskCosts = this.costs.filter(record => record.taskId === taskId);
    const total = taskCosts.reduce((sum, record) => sum + record.cost, 0);
    return Number(total.toFixed(6));
  }

  /**
   * 生成成本報告
   */
  generateReport(): string {
    const stats = this.getStats();
    const budgetUsagePercent = (stats.monthlySpend / this.monthlyBudget) * 100;

    const lines = [
      '📊 Cost Report',
      '═'.repeat(50),
      '',
      `Total Tasks: ${stats.taskCount}`,
      `Total Cost: $${stats.totalCost.toFixed(6)}`,
      `Average Cost/Task: $${stats.averageCostPerTask.toFixed(6)}`,
      '',
      `Monthly Budget: $${this.monthlyBudget.toFixed(2)}`,
      `Monthly Spend: $${stats.monthlySpend.toFixed(6)}`,
      `Remaining Budget: $${stats.remainingBudget.toFixed(6)}`,
      `Budget Usage: ${budgetUsagePercent.toFixed(1)}%`,
      '',
      'Cost by Model:',
      '─'.repeat(50),
    ];

    for (const [model, cost] of Object.entries(stats.costByModel)) {
      const percentage = (cost / stats.totalCost) * 100;
      lines.push(`  ${model}: $${cost.toFixed(6)} (${percentage.toFixed(1)}%)`);
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
      console.log(`🧹 Cleared old cost records. Keeping ${keepRecent} recent records.`);
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
   */
  isWithinBudget(estimatedCost: number): boolean {
    const stats = this.getStats();
    const projectedSpend = stats.monthlySpend + estimatedCost;

    return projectedSpend <= this.monthlyBudget;
  }

  /**
   * 獲取建議 (基於當前預算使用情況)
   */
  getRecommendation(): string {
    const stats = this.getStats();
    const budgetUsagePercent = (stats.monthlySpend / this.monthlyBudget) * 100;

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
