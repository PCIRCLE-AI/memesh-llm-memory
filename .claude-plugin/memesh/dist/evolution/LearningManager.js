import { logger } from '../utils/logger.js';
export class LearningManager {
    patterns = new Map();
    config;
    constructor(config) {
        if (config?.maxPatternsPerAgent !== undefined) {
            if (!Number.isFinite(config.maxPatternsPerAgent)) {
                throw new Error('maxPatternsPerAgent must be finite');
            }
            if (!Number.isSafeInteger(config.maxPatternsPerAgent) || config.maxPatternsPerAgent <= 0) {
                throw new Error('maxPatternsPerAgent must be a positive integer');
            }
        }
        this.config = {
            maxPatternsPerAgent: config?.maxPatternsPerAgent || 100,
        };
        logger.info('Learning manager initialized (simplified)', this.config);
    }
    addPattern(pattern) {
        const agentId = pattern.agentId;
        if (!this.patterns.has(agentId)) {
            this.patterns.set(agentId, []);
        }
        const existing = this.patterns.get(agentId);
        const existingPatternIndex = existing.findIndex((p) => p.id === pattern.id);
        if (existingPatternIndex !== -1) {
            existing[existingPatternIndex] = {
                ...pattern,
                updatedAt: new Date(),
            };
            logger.debug('Pattern updated', {
                patternId: pattern.id,
                agentId,
                taskType: pattern.taskType,
            });
        }
        else {
            existing.push(pattern);
            logger.debug('Pattern added', {
                patternId: pattern.id,
                agentId,
                taskType: pattern.taskType,
                confidence: pattern.confidence,
            });
            if (existing.length > this.config.maxPatternsPerAgent) {
                existing.sort((a, b) => b.confidence - a.confidence);
                this.patterns.set(agentId, existing.slice(0, this.config.maxPatternsPerAgent));
                logger.debug('Trimmed patterns for agent', {
                    agentId,
                    kept: this.config.maxPatternsPerAgent,
                    removed: existing.length - this.config.maxPatternsPerAgent,
                });
            }
        }
    }
    getPatterns(agentId, filter) {
        if (filter?.minConfidence !== undefined) {
            if (!Number.isFinite(filter.minConfidence)) {
                throw new Error('minConfidence must be finite');
            }
            if (filter.minConfidence < 0 || filter.minConfidence > 1) {
                throw new Error('minConfidence must be between 0 and 1');
            }
        }
        let patterns = this.patterns.get(agentId) || [];
        if (filter) {
            if (filter.type) {
                patterns = patterns.filter((p) => p.type === filter.type);
            }
            if (filter.taskType) {
                patterns = patterns.filter((p) => p.taskType === filter.taskType);
            }
            if (filter.minConfidence !== undefined) {
                patterns = patterns.filter((p) => p.confidence >= filter.minConfidence);
            }
        }
        return patterns;
    }
    clearPatterns(agentId) {
        this.patterns.delete(agentId);
        logger.info('Patterns cleared', { agentId });
    }
    getAgentsWithPatterns() {
        return Array.from(this.patterns.keys());
    }
}
//# sourceMappingURL=LearningManager.js.map