import { CostStats } from './types.js';
import { type MicroDollars } from '../utils/money.js';
export declare class CostTracker {
    private costs;
    private monthlyBudget;
    private alertThreshold;
    constructor();
    recordCost(taskId: string, modelName: string, inputTokens: number, outputTokens: number): MicroDollars;
    private calculateCost;
    getStats(): CostStats;
    private checkBudgetAlert;
    getCostByDateRange(startDate: Date, endDate: Date): MicroDollars;
    getCostByTask(taskId: string): MicroDollars;
    generateReport(): string;
    clearOldRecords(keepRecent?: number): void;
    exportData(): string;
    isWithinBudget(estimatedCost: MicroDollars): boolean;
    getRecommendation(): string;
}
//# sourceMappingURL=CostTracker.d.ts.map