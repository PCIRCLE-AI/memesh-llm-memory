import { logger } from '../utils/logger.js';
export class AdaptationEngine {
    learningManager;
    performanceTracker;
    adaptationConfigs = new Map();
    appliedAdaptations = new Map();
    performanceHistory = new Map();
    isInitialized = false;
    constructor(learningManager, performanceTracker) {
        this.learningManager = learningManager;
        this.performanceTracker = performanceTracker;
        this.isInitialized = true;
        logger.info('Adaptation engine initialized');
    }
    configureAgent(agentId, config) {
        this.adaptationConfigs.set(agentId, config);
        logger.info('Agent adaptation configured', {
            agentId,
            enabledAdaptations: Object.keys(config.enabledAdaptations).filter(k => config.enabledAdaptations[k]),
            learningRate: config.learningRate,
            minConfidence: config.minConfidence,
        });
    }
    getConfig(agentId) {
        return this.adaptationConfigs.get(agentId);
    }
    async adaptExecution(agentId, taskType, baseConfig) {
        const config = this.adaptationConfigs.get(agentId);
        if (!config) {
            logger.debug('No adaptation config for agent', { agentId });
            return {
                originalConfig: baseConfig,
                adaptedConfig: baseConfig,
                appliedPatterns: [],
            };
        }
        const taskComplexity = this.inferComplexity(baseConfig);
        const patterns = this.learningManager.getRecommendations(agentId, taskType, taskComplexity);
        const applicablePatterns = this.filterApplicablePatterns(patterns, config);
        if (applicablePatterns.length === 0) {
            logger.debug('No applicable patterns found', { agentId, taskType });
            return {
                originalConfig: baseConfig,
                adaptedConfig: baseConfig,
                appliedPatterns: [],
            };
        }
        let adaptedConfig = { ...baseConfig };
        const appliedPatternIds = [];
        for (const pattern of applicablePatterns) {
            const result = this.applyPattern(pattern, adaptedConfig, config);
            if (result.applied) {
                adaptedConfig = result.adaptedConfig;
                appliedPatternIds.push(pattern.id);
                this.recordAdaptation(pattern.id);
                logger.info('Pattern applied', {
                    agentId,
                    taskType,
                    patternId: pattern.id,
                    adaptationType: pattern.action.type,
                });
            }
        }
        return {
            originalConfig: baseConfig,
            adaptedConfig,
            appliedPatterns: appliedPatternIds,
        };
    }
    applyPattern(pattern, config, adaptationConfig) {
        const { action } = pattern;
        let adaptedConfig = { ...config };
        let applied = false;
        switch (action.type) {
            case 'adjust_prompt':
                if (adaptationConfig.enabledAdaptations.promptOptimization) {
                    adaptedConfig = this.adjustPrompt(adaptedConfig, action.parameters);
                    applied = true;
                }
                break;
            case 'change_model':
                if (adaptationConfig.enabledAdaptations.modelSelection) {
                    adaptedConfig = this.changeModel(adaptedConfig, action.parameters);
                    applied = true;
                }
                break;
            case 'modify_timeout':
                if (adaptationConfig.enabledAdaptations.timeoutAdjustment) {
                    adaptedConfig = this.modifyTimeout(adaptedConfig, action.parameters);
                    applied = true;
                }
                break;
            case 'add_step':
            case 'remove_step':
                logger.debug('Workflow modification not yet implemented', {
                    type: action.type,
                });
                break;
            default:
                logger.warn('Unknown adaptation type', { type: action.type });
        }
        return { applied, adaptedConfig: applied ? adaptedConfig : undefined };
    }
    adjustPrompt(config, parameters) {
        const adapted = { ...config };
        if (parameters.strategy === 'efficient') {
            adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nOptimization Focus: Maintain high quality while minimizing token usage.`;
        }
        else if (parameters.strategy === 'quality-focused') {
            adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nQuality Focus: Prioritize output quality and accuracy over speed.`;
        }
        if (parameters.additionalInstructions) {
            adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\n${parameters.additionalInstructions}`;
        }
        if (parameters.focusAreas) {
            adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nFocus Areas: ${parameters.focusAreas.join(', ')}`;
        }
        return adapted;
    }
    changeModel(config, parameters) {
        const adapted = { ...config };
        if (parameters.targetCostReduction) {
            if (config.model === 'claude-opus-4-5') {
                adapted.model = 'claude-sonnet-4-5';
            }
            else if (config.model === 'claude-sonnet-4-5') {
                adapted.model = 'claude-haiku-4';
            }
        }
        if (parameters.minQualityScore && parameters.minQualityScore >= 0.9) {
            if (config.model === 'claude-haiku-4') {
                adapted.model = 'claude-sonnet-4-5';
            }
            else if (config.model === 'claude-sonnet-4-5') {
                adapted.model = 'claude-opus-4-5';
            }
        }
        return adapted;
    }
    modifyTimeout(config, parameters) {
        const adapted = { ...config };
        if (parameters.timeoutMs) {
            adapted.timeout = parameters.timeoutMs;
        }
        return adapted;
    }
    filterApplicablePatterns(patterns, config) {
        return patterns.filter(pattern => {
            if (pattern.confidence < config.minConfidence) {
                return false;
            }
            if (pattern.observationCount < config.minObservations) {
                return false;
            }
            switch (pattern.action.type) {
                case 'adjust_prompt':
                    return config.enabledAdaptations.promptOptimization === true;
                case 'change_model':
                    return config.enabledAdaptations.modelSelection === true;
                case 'modify_timeout':
                    return config.enabledAdaptations.timeoutAdjustment === true;
                case 'add_step':
                case 'remove_step':
                    return (config.enabledAdaptations.promptOptimization &&
                        config.enabledAdaptations.modelSelection &&
                        config.enabledAdaptations.timeoutAdjustment);
                default:
                    return false;
            }
        });
    }
    inferComplexity(config) {
        if (config.maxTokens && config.maxTokens > 4000)
            return 'high';
        if (config.maxTokens && config.maxTokens > 2000)
            return 'medium';
        return 'low';
    }
    recordAdaptation(patternId) {
        const count = this.appliedAdaptations.get(patternId) || 0;
        this.appliedAdaptations.set(patternId, count + 1);
    }
    getAdaptationStats(agentId) {
        const patterns = this.learningManager.getPatterns(agentId);
        const stats = {
            totalAdaptations: 0,
            byType: {},
            topPatterns: [],
        };
        for (const [patternId, count] of this.appliedAdaptations.entries()) {
            const pattern = patterns.find(p => p.id === patternId);
            if (!pattern)
                continue;
            stats.totalAdaptations += count;
            const type = pattern.action.type;
            stats.byType[type] = (stats.byType[type] || 0) + count;
        }
        const sortedPatterns = Array.from(this.appliedAdaptations.entries())
            .map(([patternId, count]) => ({ patternId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        stats.topPatterns = sortedPatterns;
        return stats;
    }
    async provideFeedback(patternId, metrics) {
        this.learningManager.updatePattern(patternId, metrics.success);
        this.performanceTracker.track(metrics);
        logger.info('Adaptation feedback recorded', {
            patternId,
            success: metrics.success,
            qualityScore: metrics.qualityScore,
            cost: metrics.cost,
        });
    }
    updateAdaptationConfig(agentId, updates) {
        const existing = this.adaptationConfigs.get(agentId);
        if (!existing) {
            logger.warn('No existing config for agent', { agentId });
            return;
        }
        const updated = {
            ...existing,
            ...updates,
            enabledAdaptations: {
                ...existing.enabledAdaptations,
                ...updates.enabledAdaptations,
            },
        };
        this.adaptationConfigs.set(agentId, updated);
        logger.info('Adaptation config updated', { agentId, updates });
    }
    resetAdaptations(agentId) {
        this.learningManager.clearPatterns(agentId);
        const patterns = this.learningManager.getPatterns(agentId);
        for (const pattern of patterns) {
            this.appliedAdaptations.delete(pattern.id);
        }
        logger.info('Adaptations reset', { agentId });
    }
    getAdaptedAgents() {
        return Array.from(this.adaptationConfigs.keys());
    }
    async initialize() {
        this.isInitialized = true;
        logger.info('Adaptation engine initialized');
        return Promise.resolve();
    }
    async close() {
        this.adaptationConfigs.clear();
        this.appliedAdaptations.clear();
        this.performanceHistory.clear();
        this.isInitialized = false;
        return Promise.resolve();
    }
    async recordPerformance(metrics) {
        const agentId = 'test-agent';
        if (!this.performanceHistory.has(agentId)) {
            this.performanceHistory.set(agentId, []);
        }
        this.performanceHistory.get(agentId).push({
            version: metrics.promptVersion,
            successRate: metrics.successRate,
            feedback: metrics.feedback,
            timestamp: Date.now(),
        });
        return Promise.resolve();
    }
    async optimizePrompt(currentPrompt) {
        const agentId = 'test-agent';
        const history = this.performanceHistory.get(agentId) || [];
        if (history.length === 0) {
            return currentPrompt;
        }
        const latest = history[history.length - 1];
        if (latest.successRate < 0.85) {
            let optimized = currentPrompt;
            if (latest.feedback.includes('verbose')) {
                optimized += '\n\nBe concise, focus on key points';
            }
            if (latest.feedback.includes('examples')) {
                optimized += '\n\nInclude concrete examples';
            }
            if (latest.feedback.includes('conciseness') && latest.successRate > 0.65) {
                optimized += '\n\nInclude concrete examples';
            }
            return optimized;
        }
        return currentPrompt;
    }
    async adaptPromptFromPattern(prompt, pattern) {
        if (pattern.confidence > 0.7) {
            let instruction = '';
            if (pattern.pattern.includes('validation')) {
                instruction = 'Always include input validation';
            }
            else if (pattern.pattern.includes('documentation')) {
                instruction = 'Always include comprehensive documentation';
            }
            else if (pattern.pattern.includes('error handling')) {
                instruction = 'Always include proper error handling';
            }
            else {
                instruction = `Follow this pattern: ${pattern.pattern}`;
            }
            return `${prompt}\n\n${instruction}`;
        }
        return prompt;
    }
    async isReady() {
        return Promise.resolve(this.isInitialized);
    }
}
//# sourceMappingURL=AdaptationEngine.js.map