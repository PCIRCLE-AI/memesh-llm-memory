import { MODEL_COSTS } from '../config/models.js';
import { appConfig } from '../config/index.js';
import { logger } from './logger.js';
class CostTracker {
    records = [];
    monthlyBudget;
    alertThreshold;
    constructor() {
        this.monthlyBudget = appConfig.costs.monthlyBudget;
        this.alertThreshold = appConfig.costs.alertThreshold;
    }
    trackClaude(model, inputTokens, outputTokens) {
        const costs = MODEL_COSTS[model];
        const cost = (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
        this.addRecord({
            timestamp: new Date(),
            service: 'claude',
            model,
            inputTokens,
            outputTokens,
            cost,
        });
        return cost;
    }
    trackWhisper(minutes) {
        const cost = minutes * MODEL_COSTS['whisper-1'].perMinute;
        this.addRecord({
            timestamp: new Date(),
            service: 'whisper',
            model: 'whisper-1',
            minutes,
            cost,
        });
        return cost;
    }
    trackTTS(characters) {
        const cost = (characters / 1000) * MODEL_COSTS['tts-1'].per1KChars;
        this.addRecord({
            timestamp: new Date(),
            service: 'tts',
            model: 'tts-1',
            characters,
            cost,
        });
        return cost;
    }
    trackEmbeddings(tokens) {
        const cost = (tokens / 1_000_000) * MODEL_COSTS['text-embedding-3-small'].input;
        this.addRecord({
            timestamp: new Date(),
            service: 'embeddings',
            model: 'text-embedding-3-small',
            inputTokens: tokens,
            cost,
        });
        return cost;
    }
    addRecord(record) {
        this.records.push(record);
        const monthlyTotal = this.getMonthlyTotal();
        if (monthlyTotal > this.monthlyBudget * this.alertThreshold) {
            logger.warn(`⚠️ Cost alert: $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)} (${((monthlyTotal / this.monthlyBudget) * 100).toFixed(1)}%)`);
        }
        if (monthlyTotal > this.monthlyBudget) {
            logger.error(`🚨 Budget exceeded! $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)}`);
        }
    }
    getMonthlyTotal() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.records
            .filter((r) => r.timestamp >= monthStart)
            .reduce((total, r) => total + r.cost, 0);
    }
    getReport() {
        const monthlyTotal = this.getMonthlyTotal();
        const breakdown = this.records.reduce((acc, r) => {
            acc[r.service] = (acc[r.service] || 0) + r.cost;
            return acc;
        }, {});
        return {
            monthlyTotal,
            budget: this.monthlyBudget,
            remaining: this.monthlyBudget - monthlyTotal,
            percentUsed: (monthlyTotal / this.monthlyBudget) * 100,
            breakdown,
            records: this.records,
        };
    }
}
export const costTracker = new CostTracker();
//# sourceMappingURL=cost-tracker.js.map