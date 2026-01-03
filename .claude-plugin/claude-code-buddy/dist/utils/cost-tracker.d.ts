import { type ClaudeModel } from '../config/models.js';
interface UsageRecord {
    timestamp: Date;
    service: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    minutes?: number;
    characters?: number;
    cost: number;
}
declare class CostTracker {
    private records;
    private monthlyBudget;
    private alertThreshold;
    constructor();
    trackClaude(model: ClaudeModel, inputTokens: number, outputTokens: number): number;
    trackWhisper(minutes: number): number;
    trackTTS(characters: number): number;
    trackEmbeddings(tokens: number): number;
    private addRecord;
    getMonthlyTotal(): number;
    getReport(): {
        monthlyTotal: number;
        budget: number;
        remaining: number;
        percentUsed: number;
        breakdown: Record<string, number>;
        records: UsageRecord[];
    };
}
export declare const costTracker: CostTracker;
export {};
//# sourceMappingURL=cost-tracker.d.ts.map