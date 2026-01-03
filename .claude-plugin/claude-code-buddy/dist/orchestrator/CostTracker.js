import { MODEL_COSTS } from '../config/models.js';
import { appConfig } from '../config/index.js';
import { toMicroDollars, formatMoney, calculateTokenCost, addCosts, calculateBudgetPercentage, } from '../utils/money.js';
import { logger } from '../utils/logger.js';
export class CostTracker {
    costs = [];
    monthlyBudget;
    alertThreshold;
    constructor() {
        this.monthlyBudget = toMicroDollars(appConfig.costs.monthlyBudget);
        this.alertThreshold = appConfig.costs.alertThreshold;
    }
    recordCost(taskId, modelName, inputTokens, outputTokens) {
        const cost = this.calculateCost(modelName, inputTokens, outputTokens);
        const record = {
            timestamp: new Date(),
            taskId,
            modelName,
            inputTokens,
            outputTokens,
            cost,
        };
        this.costs.push(record);
        this.checkBudgetAlert();
        return cost;
    }
    calculateCost(modelName, inputTokens, outputTokens) {
        const costs = MODEL_COSTS[modelName];
        if (!costs || !('input' in costs && 'output' in costs)) {
            logger.warn(`⚠️  Unknown model or unsupported cost structure: ${modelName}\n` +
                `   Using fallback pricing (Claude Sonnet: $3/$15 per 1M tokens) for cost estimation.\n` +
                `   Please add this model to MODEL_COSTS configuration.`);
            const inputCost = calculateTokenCost(inputTokens, 3.0);
            const outputCost = calculateTokenCost(outputTokens, 15.0);
            return addCosts(inputCost, outputCost);
        }
        const inputCost = calculateTokenCost(inputTokens, costs.input);
        const outputCost = calculateTokenCost(outputTokens, costs.output);
        return addCosts(inputCost, outputCost);
    }
    getStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyCosts = this.costs.filter(record => record.timestamp >= monthStart);
        const totalCost = monthlyCosts.reduce((sum, record) => (sum + record.cost), 0);
        const taskCount = monthlyCosts.length;
        const averageCostPerTask = taskCount > 0
            ? Math.round(totalCost / taskCount)
            : 0;
        const costByModel = monthlyCosts.reduce((acc, record) => {
            const currentCost = (acc[record.modelName] || 0);
            acc[record.modelName] = (currentCost + record.cost);
            return acc;
        }, {});
        const remainingBudget = (this.monthlyBudget - totalCost);
        return {
            totalCost,
            taskCount,
            averageCostPerTask,
            costByModel,
            monthlySpend: totalCost,
            remainingBudget,
        };
    }
    checkBudgetAlert() {
        const stats = this.getStats();
        const budgetUsagePercent = calculateBudgetPercentage(stats.monthlySpend, this.monthlyBudget) / 100;
        if (budgetUsagePercent >= this.alertThreshold) {
            logger.warn(`\n⚠️  BUDGET ALERT ⚠️\n` +
                `Monthly spend: ${formatMoney(stats.monthlySpend, 2)} / ${formatMoney(this.monthlyBudget, 2)}\n` +
                `Usage: ${(budgetUsagePercent * 100).toFixed(1)}%\n` +
                `Remaining: ${formatMoney(stats.remainingBudget, 2)}\n`);
        }
    }
    getCostByDateRange(startDate, endDate) {
        const filtered = this.costs.filter(record => record.timestamp >= startDate && record.timestamp <= endDate);
        return filtered.reduce((sum, record) => (sum + record.cost), 0);
    }
    getCostByTask(taskId) {
        const taskCosts = this.costs.filter(record => record.taskId === taskId);
        return taskCosts.reduce((sum, record) => (sum + record.cost), 0);
    }
    generateReport() {
        const stats = this.getStats();
        const budgetUsagePercent = calculateBudgetPercentage(stats.monthlySpend, this.monthlyBudget);
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
    clearOldRecords(keepRecent = 1000) {
        if (this.costs.length > keepRecent) {
            this.costs = this.costs.slice(-keepRecent);
            logger.info(`🧹 Cleared old cost records. Keeping ${keepRecent} recent records.`);
        }
    }
    exportData() {
        return JSON.stringify({
            costs: this.costs,
            stats: this.getStats(),
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
    isWithinBudget(estimatedCost) {
        const stats = this.getStats();
        const projectedSpend = (stats.monthlySpend + estimatedCost);
        return projectedSpend <= this.monthlyBudget;
    }
    getRecommendation() {
        const stats = this.getStats();
        const budgetUsagePercent = calculateBudgetPercentage(stats.monthlySpend, this.monthlyBudget);
        if (budgetUsagePercent < 50) {
            return '✅ Budget usage is healthy. Continue normal operations.';
        }
        else if (budgetUsagePercent < 80) {
            return '⚠️  Budget usage is moderate. Monitor spending closely.';
        }
        else if (budgetUsagePercent < 100) {
            return '🚨 Budget usage is high. Consider using more cost-efficient models (Haiku).';
        }
        else {
            return '❌ Budget exceeded! Switch to Haiku-only mode or pause operations.';
        }
    }
}
//# sourceMappingURL=CostTracker.js.map