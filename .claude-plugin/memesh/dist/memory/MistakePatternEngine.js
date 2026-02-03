import { logger } from '../utils/logger.js';
const PREVENTION_RULE_TAG = 'prevention-rule';
export class MistakePatternEngine {
    memoryStore;
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    async saveRule(rule) {
        try {
            const memoryId = await this.memoryStore.store({
                type: 'prevention-rule',
                content: JSON.stringify({
                    name: rule.name,
                    category: rule.category,
                    trigger: rule.trigger,
                    check: rule.check,
                    action: rule.action,
                    sourceMistakeIds: rule.sourceMistakeIds,
                    confidence: rule.confidence,
                }),
                context: `Prevention Rule: ${rule.name}`,
                tags: [PREVENTION_RULE_TAG, `category:${rule.category}`],
                importance: rule.hitCount,
                timestamp: rule.createdAt,
                metadata: {
                    ruleId: rule.id,
                    hitCount: rule.hitCount,
                    confidence: rule.confidence,
                },
            }, {
                projectPath: process.cwd(),
            });
            logger.debug(`Saved prevention rule: ${rule.name} (ID: ${memoryId})`);
        }
        catch (error) {
            logger.error('Failed to save prevention rule:', error);
            throw error;
        }
    }
    async getAllRules() {
        try {
            const memories = await this.memoryStore.searchByTags([PREVENTION_RULE_TAG]);
            return memories.map((memory) => this.memoryToRule(memory)).filter((rule) => rule !== null);
        }
        catch (error) {
            logger.error('Failed to get all rules:', error);
            return [];
        }
    }
    async getRuleById(ruleId) {
        try {
            const allRules = await this.getAllRules();
            return allRules.find((rule) => rule.id === ruleId) ?? null;
        }
        catch (error) {
            logger.error(`Failed to get rule by ID ${ruleId}:`, error);
            return null;
        }
    }
    async getStatistics() {
        try {
            const rules = await this.getAllRules();
            const byCategory = {};
            for (const rule of rules) {
                byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
            }
            return {
                totalRules: rules.length,
                byCategory,
            };
        }
        catch (error) {
            logger.error('Failed to get statistics:', error);
            return { totalRules: 0, byCategory: {} };
        }
    }
    memoryToRule(memory) {
        try {
            const data = JSON.parse(memory.content);
            return {
                id: memory.metadata?.ruleId,
                name: data.name,
                category: data.category,
                trigger: data.trigger,
                check: data.check,
                action: data.action,
                sourceMistakeIds: data.sourceMistakeIds ?? [],
                confidence: data.confidence ?? 'medium',
                hitCount: memory.metadata?.hitCount ?? 0,
                createdAt: memory.timestamp ?? new Date(),
            };
        }
        catch (error) {
            logger.error('Failed to convert memory to rule:', error);
            return null;
        }
    }
}
//# sourceMappingURL=MistakePatternEngine.js.map