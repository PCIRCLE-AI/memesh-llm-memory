export class TransferabilityChecker {
    WEIGHTS = {
        agent_type: 0.4,
        task_type: 0.3,
        complexity: 0.2,
        config_keys: 0.1,
    };
    CONFIDENCE_PENALTY = 0.1;
    calculateContextSimilarity(context1, context2) {
        let totalScore = 0;
        if (context1.agent_type && context2.agent_type && context1.agent_type === context2.agent_type) {
            totalScore += this.WEIGHTS.agent_type;
        }
        if (context1.task_type && context2.task_type && context1.task_type === context2.task_type) {
            totalScore += this.WEIGHTS.task_type;
        }
        if (context1.complexity && context2.complexity && context1.complexity === context2.complexity) {
            totalScore += this.WEIGHTS.complexity;
        }
        if (context1.config_keys && context2.config_keys) {
            const jaccardSimilarity = this.calculateJaccardSimilarity(context1.config_keys, context2.config_keys);
            totalScore += jaccardSimilarity * this.WEIGHTS.config_keys;
        }
        return totalScore;
    }
    calculateJaccardSimilarity(set1, set2) {
        if (set1.length === 0 && set2.length === 0) {
            return 1.0;
        }
        const intersection = set1.filter((item) => set2.includes(item));
        const union = [...new Set([...set1, ...set2])];
        return intersection.length / union.length;
    }
    assessTransferability(pattern, sourceAgentId, targetAgentId, targetContext) {
        const contextSimilarity = this.calculateContextSimilarity(pattern.context, targetContext);
        const applicabilityScore = contextSimilarity;
        const transferredConfidence = pattern.confidence * (1 - this.CONFIDENCE_PENALTY);
        const reasoning = this.generateReasoning(contextSimilarity, pattern, targetContext);
        return {
            sourceAgentId,
            targetAgentId,
            patternId: pattern.id,
            applicabilityScore,
            contextSimilarity,
            confidence: transferredConfidence,
            reasoning,
        };
    }
    generateReasoning(similarity, pattern, targetContext) {
        const reasoning = [];
        if (similarity >= 0.8) {
            reasoning.push('High context similarity - pattern likely applicable');
        }
        else if (similarity >= 0.5) {
            reasoning.push('Moderate context similarity - pattern may need adaptation');
        }
        else if (similarity >= 0.3) {
            reasoning.push('Low context similarity - transfer not recommended');
        }
        else {
            reasoning.push('Very low context similarity - contexts incompatible');
        }
        const { context: sourceCtx } = pattern;
        this.addContextComparison(reasoning, 'agent type', sourceCtx.agent_type, targetContext.agent_type);
        this.addContextComparison(reasoning, 'task type', sourceCtx.task_type, targetContext.task_type);
        this.addContextComparison(reasoning, 'complexity', sourceCtx.complexity, targetContext.complexity);
        return reasoning;
    }
    addContextComparison(reasoning, label, sourceValue, targetValue) {
        if (sourceValue === targetValue) {
            reasoning.push(`Same ${label}`);
        }
        else {
            reasoning.push(`Different ${label}: ${sourceValue} → ${targetValue}`);
        }
    }
}
//# sourceMappingURL=TransferabilityChecker.js.map