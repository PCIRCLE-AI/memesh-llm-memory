import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { ContextMatcher } from './ContextMatcher.js';
import { MultiObjectiveOptimizer } from './MultiObjectiveOptimizer.js';
import { PatternExplainer } from './PatternExplainer.js';
export class LearningManager {
    patterns = new Map();
    feedback = new Map();
    config;
    performanceTracker;
    contextMatcher;
    multiObjectiveOptimizer;
    patternExplainer;
    contextualPatterns = new Map();
    QUALITY_HIGH = 0.8;
    QUALITY_LOW = 0.5;
    COST_REDUCTION_TARGET = 0.8;
    CONFIDENCE_INCREMENT = 0.02;
    STATISTICAL_BASELINE_SAMPLES = 30;
    COMPLEXITY_LOW_THRESHOLD_MS = 5000;
    COMPLEXITY_MEDIUM_THRESHOLD_MS = 15000;
    COST_VARIATION_PERCENT = 0.1;
    COST_VARIATION_MIN_ABSOLUTE = 0.01;
    P95_MIN_SAMPLE_SIZE = 20;
    static savedPatterns = new Map();
    static savedFeedback = new Map();
    isInitialized = false;
    constructor(performanceTracker, config) {
        this.performanceTracker = performanceTracker;
        this.config = {
            minObservations: config?.minObservations || 10,
            minConfidence: config?.minConfidence || 0.7,
            successRateThreshold: config?.successRateThreshold || 0.8,
            failureRateThreshold: config?.failureRateThreshold || 0.3,
            maxPatternsPerAgent: config?.maxPatternsPerAgent || 100,
        };
        this.contextMatcher = new ContextMatcher();
        this.multiObjectiveOptimizer = new MultiObjectiveOptimizer();
        this.patternExplainer = new PatternExplainer();
        this.isInitialized = true;
        logger.info('Learning manager initialized', this.config);
    }
    analyzePatterns(agentId) {
        const metrics = this.performanceTracker.getMetrics(agentId);
        if (metrics.length < this.config.minObservations) {
            logger.debug('Insufficient data for pattern analysis', {
                agentId,
                count: metrics.length,
                required: this.config.minObservations,
            });
            return [];
        }
        const newPatterns = [];
        const metricsByTask = this.groupByTaskType(metrics);
        for (const [taskType, taskMetrics] of metricsByTask.entries()) {
            const successPatterns = this.extractSuccessPatterns(agentId, taskType, taskMetrics);
            newPatterns.push(...successPatterns);
            const failurePatterns = this.extractFailurePatterns(agentId, taskType, taskMetrics);
            newPatterns.push(...failurePatterns);
            const optimizationPatterns = this.extractOptimizationPatterns(agentId, taskType, taskMetrics);
            newPatterns.push(...optimizationPatterns);
        }
        this.storePatterns(agentId, newPatterns);
        logger.info('Pattern analysis complete', {
            agentId,
            newPatterns: newPatterns.length,
            totalPatterns: this.patterns.get(agentId)?.length || 0,
        });
        return newPatterns;
    }
    createPattern(agentId, taskType, patternType, description, observedMetrics, totalMetrics, action, successCount, successRate) {
        return {
            id: uuidv4(),
            type: patternType,
            agentId,
            taskType,
            description,
            conditions: {
                taskComplexity: this.inferComplexity(observedMetrics),
            },
            action,
            confidence: this.calculateConfidence(observedMetrics.length, totalMetrics.length),
            observationCount: observedMetrics.length,
            successCount,
            successRate,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    extractSuccessPatterns(agentId, taskType, metrics) {
        const patterns = [];
        const successfulMetrics = metrics.filter(m => m.success);
        const successRate = successfulMetrics.length / metrics.length;
        if (successRate < this.config.successRateThreshold) {
            return patterns;
        }
        const consistentHighQuality = successfulMetrics.filter(m => m.qualityScore >= this.QUALITY_HIGH);
        if (consistentHighQuality.length >= this.config.minObservations) {
            patterns.push(this.createPattern(agentId, taskType, 'success', `Consistent high quality (≥0.8) for ${taskType}`, consistentHighQuality, metrics, {
                type: 'adjust_prompt',
                parameters: {
                    strategy: 'quality-focused',
                    focusAreas: ['accuracy', 'consistency'],
                },
            }, consistentHighQuality.length, successRate));
        }
        const medianCost = this.getMedianCost(metrics);
        const costVariation = metrics.some(m => {
            const diff = Math.abs(m.cost - medianCost);
            return diff > Math.max(medianCost * this.COST_VARIATION_PERCENT, this.COST_VARIATION_MIN_ABSOLUTE);
        });
        if (costVariation) {
            const highQualityLowCost = successfulMetrics.filter(m => m.qualityScore >= this.QUALITY_HIGH && m.cost <= medianCost);
            if (highQualityLowCost.length >= this.config.minObservations) {
                patterns.push(this.createPattern(agentId, taskType, 'success', `High quality (≥0.8) with cost-efficient execution for ${taskType}`, highQualityLowCost, metrics, {
                    type: 'adjust_prompt',
                    parameters: {
                        strategy: 'efficient',
                        focusAreas: ['quality', 'cost-optimization'],
                    },
                }, highQualityLowCost.length, successRate));
            }
        }
        return patterns;
    }
    extractFailurePatterns(agentId, taskType, metrics) {
        const patterns = [];
        const failedMetrics = metrics.filter(m => !m.success);
        const failureRate = failedMetrics.length / metrics.length;
        if (failureRate < this.config.failureRateThreshold) {
            return patterns;
        }
        const timeoutFailures = failedMetrics.filter(m => m.durationMs > this.getP95Duration(metrics));
        if (timeoutFailures.length >= this.config.minObservations / 2) {
            patterns.push(this.createPattern(agentId, taskType, 'anti-pattern', `Timeout failures (P95 duration) for ${taskType}`, timeoutFailures, failedMetrics, {
                type: 'modify_timeout',
                parameters: {
                    timeoutMs: Math.round(this.getP95Duration(metrics) * 1.5),
                },
            }, 0, 0));
        }
        const lowQualityMetrics = metrics.filter(m => m.success && m.qualityScore < this.QUALITY_LOW);
        if (lowQualityMetrics.length >= this.config.minObservations / 2) {
            patterns.push(this.createPattern(agentId, taskType, 'anti-pattern', `Low quality output (<0.5) for ${taskType}`, lowQualityMetrics, metrics, {
                type: 'adjust_prompt',
                parameters: {
                    strategy: 'quality-focused',
                    additionalInstructions: 'Prioritize output quality over speed',
                },
            }, 0, 0));
        }
        return patterns;
    }
    extractOptimizationPatterns(agentId, taskType, metrics) {
        const patterns = [];
        const successfulMetrics = metrics.filter(m => m.success && m.qualityScore >= 0.7);
        if (successfulMetrics.length >= this.config.minObservations) {
            const avgCost = successfulMetrics.reduce((sum, m) => sum + m.cost, 0) / successfulMetrics.length;
            const lowCostHighQuality = successfulMetrics.filter(m => m.cost < avgCost * this.COST_REDUCTION_TARGET && m.qualityScore >= this.QUALITY_HIGH);
            if (lowCostHighQuality.length >= this.config.minObservations / 2) {
                patterns.push(this.createPattern(agentId, taskType, 'optimization', `Cost optimization opportunity: 20% cost reduction with quality ≥0.8 for ${taskType}`, lowCostHighQuality, successfulMetrics, {
                    type: 'change_model',
                    parameters: {
                        targetCostReduction: 0.2,
                        minQualityScore: 0.8,
                    },
                }, lowCostHighQuality.length, lowCostHighQuality.length / successfulMetrics.length));
            }
        }
        return patterns;
    }
    addFeedback(feedback) {
        const fullFeedback = {
            ...feedback,
            id: uuidv4(),
            timestamp: new Date(),
        };
        if (!this.feedback.has(feedback.agentId)) {
            this.feedback.set(feedback.agentId, []);
        }
        this.feedback.get(feedback.agentId).push(fullFeedback);
        logger.info('Feedback recorded', {
            agentId: feedback.agentId,
            type: feedback.type,
            rating: feedback.rating,
        });
        return fullFeedback;
    }
    getPatterns(agentId, filter) {
        let patterns = this.patterns.get(agentId) || [];
        if (filter) {
            if (filter.type) {
                patterns = patterns.filter(p => p.type === filter.type);
            }
            if (filter.taskType) {
                patterns = patterns.filter(p => p.taskType === filter.taskType);
            }
            if (filter.minConfidence !== undefined) {
                patterns = patterns.filter(p => p.confidence >= filter.minConfidence);
            }
        }
        return patterns;
    }
    getRecommendations(agentId, taskType, taskComplexity) {
        const patterns = this.getPatterns(agentId, {
            taskType,
            minConfidence: this.config.minConfidence,
        });
        const filtered = taskComplexity
            ? patterns.filter(p => p.conditions.taskComplexity === taskComplexity)
            : patterns;
        return filtered.sort((a, b) => {
            const scoreA = a.confidence * a.successRate;
            const scoreB = b.confidence * b.successRate;
            return scoreB - scoreA;
        });
    }
    updatePattern(patternId, success) {
        for (const [agentId, agentPatterns] of this.patterns.entries()) {
            const pattern = agentPatterns.find(p => p.id === patternId);
            if (pattern) {
                pattern.observationCount += 1;
                const successCount = Math.round(pattern.successRate * (pattern.observationCount - 1));
                pattern.successRate = success
                    ? (successCount + 1) / pattern.observationCount
                    : successCount / pattern.observationCount;
                pattern.confidence = Math.min(pattern.confidence + this.CONFIDENCE_INCREMENT, 1.0);
                pattern.updatedAt = new Date();
                logger.debug('Pattern updated', {
                    patternId,
                    observationCount: pattern.observationCount,
                    successRate: pattern.successRate,
                    confidence: pattern.confidence,
                });
                break;
            }
        }
    }
    storePatterns(agentId, newPatterns) {
        if (!this.patterns.has(agentId)) {
            this.patterns.set(agentId, []);
        }
        const existing = this.patterns.get(agentId);
        existing.push(...newPatterns);
        if (existing.length > this.config.maxPatternsPerAgent) {
            existing.sort((a, b) => b.confidence - a.confidence);
            this.patterns.set(agentId, existing.slice(0, this.config.maxPatternsPerAgent));
        }
    }
    groupByTaskType(metrics) {
        const groups = new Map();
        for (const metric of metrics) {
            if (!groups.has(metric.taskType)) {
                groups.set(metric.taskType, []);
            }
            groups.get(metric.taskType).push(metric);
        }
        return groups;
    }
    calculateMedian(values) {
        if (values.length === 0) {
            return 0;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }
    getMedianCost(metrics) {
        return this.calculateMedian(metrics.map(m => m.cost));
    }
    getMedianDuration(metrics) {
        return this.calculateMedian(metrics.map(m => m.durationMs));
    }
    getP95Duration(metrics) {
        if (metrics.length === 0) {
            return 0;
        }
        const sorted = metrics.map(m => m.durationMs).sort((a, b) => a - b);
        if (sorted.length < this.P95_MIN_SAMPLE_SIZE) {
            logger.debug('Using max duration for P95 (insufficient samples)', {
                sampleSize: sorted.length,
            });
            return sorted[sorted.length - 1];
        }
        const index = Math.floor(sorted.length * 0.95);
        return sorted[index];
    }
    inferComplexity(metrics) {
        const avgDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
        if (avgDuration < this.COMPLEXITY_LOW_THRESHOLD_MS)
            return 'low';
        if (avgDuration < this.COMPLEXITY_MEDIUM_THRESHOLD_MS)
            return 'medium';
        return 'high';
    }
    calculateConfidence(observationCount, totalSamples) {
        const proportion = observationCount / totalSamples;
        const n = totalSamples;
        const sampleSizeBonus = Math.min(n / this.STATISTICAL_BASELINE_SAMPLES, 1);
        const proportionScore = proportion;
        return Math.min(sampleSizeBonus * proportionScore, 1.0);
    }
    clearPatterns(agentId) {
        this.patterns.delete(agentId);
        logger.info('Patterns cleared', { agentId });
    }
    getAgentsWithPatterns() {
        return Array.from(this.patterns.keys());
    }
    async identifyContextualPatterns(agentId) {
        const metrics = this.performanceTracker.getMetrics(agentId);
        if (metrics.length < this.config.minObservations) {
            logger.debug('Insufficient data for contextual pattern analysis', {
                agentId,
                count: metrics.length,
                required: this.config.minObservations,
            });
            return [];
        }
        const contextualPatterns = [];
        const metricsByTask = this.groupByTaskType(metrics);
        for (const [taskType, taskMetrics] of metricsByTask.entries()) {
            const complexity = this.inferComplexity(taskMetrics);
            const successfulMetrics = taskMetrics.filter((m) => m.success);
            const successRate = successfulMetrics.length / taskMetrics.length;
            if (successfulMetrics.length >= this.config.minObservations &&
                successRate >= this.config.successRateThreshold) {
                const avgDuration = taskMetrics.reduce((sum, m) => sum + m.durationMs, 0) / taskMetrics.length;
                contextualPatterns.push({
                    id: uuidv4(),
                    type: 'success',
                    description: `Successful execution pattern for ${taskType}`,
                    confidence: this.calculateConfidence(successfulMetrics.length, taskMetrics.length),
                    observations: successfulMetrics.length,
                    success_rate: successRate,
                    avg_execution_time: avgDuration,
                    last_seen: new Date().toISOString(),
                    context: {
                        agent_type: agentId,
                        task_type: taskType,
                        complexity,
                    },
                });
            }
        }
        this.contextualPatterns.set(agentId, contextualPatterns);
        logger.info('Contextual pattern analysis complete', {
            agentId,
            patternsFound: contextualPatterns.length,
        });
        return contextualPatterns;
    }
    findOptimalConfiguration(agentId, weights) {
        const weightValues = Object.values(weights).filter(v => v !== undefined);
        if (weightValues.length === 0) {
            logger.warn('No weights provided for optimization', { agentId });
            return undefined;
        }
        if (weightValues.some(w => w < 0 || !Number.isFinite(w))) {
            logger.error('Invalid weights for optimization', { agentId, weights });
            return undefined;
        }
        const metrics = this.performanceTracker.getMetrics(agentId);
        if (metrics.length === 0) {
            return undefined;
        }
        const candidates = metrics.map((m) => ({
            id: m.executionId,
            objectives: {
                accuracy: m.qualityScore,
                speed: m.durationMs > 0 && Number.isFinite(m.durationMs)
                    ? 1 / (m.durationMs / 1000)
                    : 0,
                cost: m.cost > 0 && Number.isFinite(m.cost)
                    ? 1 / m.cost
                    : 0,
                satisfaction: m.userSatisfaction,
            },
            metadata: m.metadata,
        }));
        const paretoFront = this.multiObjectiveOptimizer.findParetoFront(candidates);
        const best = this.multiObjectiveOptimizer.selectBest(paretoFront, weights);
        if (best) {
            logger.info('Optimal configuration found', {
                agentId,
                candidateId: best.id,
                objectives: best.objectives,
            });
        }
        return best;
    }
    explainPattern(patternId) {
        for (const [agentId, patterns] of this.contextualPatterns.entries()) {
            const pattern = patterns.find((p) => p.id === patternId);
            if (pattern) {
                return this.patternExplainer.explain(pattern);
            }
        }
        logger.warn('Pattern not found for explanation', { patternId });
        return undefined;
    }
    async getLearnedPatterns(agentId) {
        const patterns = this.contextualPatterns.get(agentId);
        if (!patterns) {
            logger.debug('No patterns found for agent', { agentId });
            return [];
        }
        return patterns;
    }
    addBootstrapPattern(pattern) {
        const agentId = pattern.agentId;
        if (!this.patterns.has(agentId)) {
            this.patterns.set(agentId, []);
        }
        const existing = this.patterns.get(agentId);
        const existingPatternIndex = existing.findIndex((p) => p.id === pattern.id);
        if (existingPatternIndex !== -1) {
            const existingPattern = existing[existingPatternIndex];
            const hasContentChanges = existingPattern.description !== pattern.description ||
                existingPattern.confidence !== pattern.confidence ||
                existingPattern.observationCount !== pattern.observationCount ||
                existingPattern.successCount !== pattern.successCount ||
                existingPattern.successRate !== pattern.successRate;
            if (hasContentChanges) {
                existing[existingPatternIndex] = {
                    ...pattern,
                    createdAt: existingPattern.createdAt,
                    updatedAt: new Date(),
                };
                logger.info('Bootstrap pattern updated with new content', {
                    patternId: pattern.id,
                    agentId,
                    taskType: pattern.taskType,
                    oldConfidence: existingPattern.confidence,
                    newConfidence: pattern.confidence,
                    oldObservationCount: existingPattern.observationCount,
                    newObservationCount: pattern.observationCount,
                });
            }
            else {
                logger.debug('Bootstrap pattern already exists with same content, skipping', {
                    patternId: pattern.id,
                    agentId,
                });
            }
            return;
        }
        existing.push(pattern);
        logger.debug('Bootstrap pattern added', {
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
    async initialize() {
        if (LearningManager.savedPatterns.size > 0) {
            for (const [agentId, patterns] of LearningManager.savedPatterns.entries()) {
                this.patterns.set(agentId, [...patterns]);
            }
        }
        if (LearningManager.savedFeedback.size > 0) {
            for (const [agentId, feedback] of LearningManager.savedFeedback.entries()) {
                this.feedback.set(agentId, [...feedback]);
            }
        }
        this.isInitialized = true;
        return Promise.resolve();
    }
    async close() {
        LearningManager.savedPatterns.clear();
        LearningManager.savedFeedback.clear();
        for (const [agentId, patterns] of this.patterns.entries()) {
            LearningManager.savedPatterns.set(agentId, [...patterns]);
        }
        for (const [agentId, feedback] of this.feedback.entries()) {
            LearningManager.savedFeedback.set(agentId, [...feedback]);
        }
        this.patterns.clear();
        this.feedback.clear();
        this.isInitialized = false;
        return Promise.resolve();
    }
    async recordInteraction(interaction) {
        this.addFeedback({
            executionId: `exec-${Date.now()}`,
            agentId: interaction.agentId,
            type: interaction.success ? 'positive' : 'negative',
            rating: interaction.success ? 4 : 2,
            feedback: interaction.feedback,
        });
        return Promise.resolve();
    }
    async extractPatterns() {
        const allPatterns = [];
        for (const [agentId, feedbackList] of this.feedback.entries()) {
            const patternGroups = new Map();
            const totalFeedback = feedbackList.length;
            for (const fb of feedbackList) {
                const normalized = fb.feedback.toLowerCase();
                let groupKey = 'general';
                if (normalized.includes('error handling') || normalized.includes('try-catch')) {
                    groupKey = 'error_handling';
                }
                else if (normalized.includes('validation') || normalized.includes('input')) {
                    groupKey = 'validation';
                }
                else if (normalized.includes('documentation') || normalized.includes('comment')) {
                    groupKey = 'documentation';
                }
                else if (normalized.includes('type') || normalized.includes('annotation')) {
                    groupKey = 'type_annotations';
                }
                if (!patternGroups.has(groupKey)) {
                    patternGroups.set(groupKey, { feedbacks: [], count: 0 });
                }
                const group = patternGroups.get(groupKey);
                group.feedbacks.push(normalized);
                group.count++;
            }
            for (const [groupKey, group] of patternGroups.entries()) {
                const confidence = Math.min(group.count * 0.3, 1.0);
                let patternText = '';
                if (groupKey === 'error_handling') {
                    patternText = 'always add error handling to async functions';
                }
                else if (groupKey === 'validation') {
                    patternText = 'always include input validation';
                }
                else if (groupKey === 'documentation') {
                    patternText = 'always include comprehensive documentation';
                }
                else if (groupKey === 'type_annotations') {
                    patternText = 'always add type annotations';
                }
                else {
                    patternText = group.feedbacks[0];
                }
                allPatterns.push({
                    pattern: patternText,
                    confidence,
                });
            }
        }
        return allPatterns;
    }
    static clearSavedData() {
        LearningManager.savedPatterns.clear();
        LearningManager.savedFeedback.clear();
    }
    async isReady() {
        return Promise.resolve(this.isInitialized);
    }
}
//# sourceMappingURL=LearningManager.js.map