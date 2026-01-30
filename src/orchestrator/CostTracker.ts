/**
 * CostTracker - Cost Tracking and Budget Management
 *
 * Features:
 * - Track cost of each task
 * - Calculate cumulative cost
 * - Budget alerts
 * - Cost report generation
 * - SQLite persistence (data no longer lost on restart!)
 *
 * Use integer arithmetic (micro-dollars) to avoid floating-point precision errors
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
import { CostRecordsRepository } from '../evolution/storage/repositories/CostRecordsRepository.js';

export class CostTracker {
  private costs: CostRecord[] = [];
  /** Monthly budget in micro-dollars (μUSD) */
  private monthlyBudget: MicroDollars;
  private alertThreshold: number;
  // SQLite persistence repository (optional - graceful degradation if not provided)
  private repository?: CostRecordsRepository;

  constructor(config?: { repository?: CostRecordsRepository }) {
    // Convert USD budget to micro-dollars for precise tracking
    this.monthlyBudget = toMicroDollars(appConfig.costs.monthlyBudget);
    this.alertThreshold = appConfig.costs.alertThreshold;
    this.repository = config?.repository;

    // If repository provided, ensure schema and load existing records
    if (this.repository) {
      try {
        this.repository.ensureSchema();
        this.loadFromRepository();
        logger.info('CostTracker initialized with SQLite persistence', {
          monthlyBudget: formatMoney(this.monthlyBudget),
          loadedRecords: this.costs.length,
        });
      } catch (error) {
        logger.warn('Failed to initialize SQLite persistence, falling back to in-memory only', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.repository = undefined;
      }
    } else {
      logger.info('CostTracker initialized (in-memory only)', {
        monthlyBudget: formatMoney(this.monthlyBudget),
      });
    }
  }

  /**
   * Load cost records from SQLite repository on startup
   */
  private loadFromRepository(): void {
    if (!this.repository) return;

    // Load current month's records (for stats calculations)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const records = this.repository.getByTimeRange(monthStart, now);

    // Convert repository records to CostRecord format
    for (const record of records) {
      this.costs.push({
        timestamp: record.timestamp,
        taskId: record.taskId,
        modelName: record.modelName,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cost: record.cost,
      });
    }

    logger.debug('Loaded cost records from SQLite', {
      recordCount: records.length,
      monthStart: monthStart.toISOString(),
    });
  }

  /**
   * Record task cost
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

    // Persist to SQLite if repository available
    if (this.repository) {
      try {
        this.repository.save(record);
      } catch (error) {
        logger.warn('Failed to persist cost record to SQLite', {
          taskId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check if budget warning threshold exceeded
    this.checkBudgetAlert();

    return cost;
  }

  /**
   * Calculate cost for specific model (using integer arithmetic)
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
   * Get cost statistics (using integer arithmetic)
   */
  getStats(): CostStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter this month costs
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

    // Count costs by model (integer arithmetic)
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
   * Check budget warning
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
   * Get costs for specific time range
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
   * Get cost for specific task
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
   * Generate cost report
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
   * Clear history (keep recent N records)
   */
  clearOldRecords(keepRecent: number = 1000): void {
    if (this.costs.length > keepRecent) {
      this.costs = this.costs.slice(-keepRecent);
      logger.info(`🧹 Cleared old cost records. Keeping ${keepRecent} recent records.`);
    }
  }

  /**
   * Export cost data (JSON)
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
   * Check if within budget
   *
   * @param estimatedCost - Estimated cost in micro-dollars (μUSD)
   */
  isWithinBudget(estimatedCost: MicroDollars): boolean {
    const stats = this.getStats();
    const projectedSpend = (stats.monthlySpend + estimatedCost) as MicroDollars;

    return projectedSpend <= this.monthlyBudget;
  }

  /**
   * Get recommendations (based on current budget usage)
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
