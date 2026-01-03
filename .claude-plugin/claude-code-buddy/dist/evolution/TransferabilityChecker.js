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
        if (context1.agent_type && context2.agent_type) {
            if (context1.agent_type === context2.agent_type) {
                totalScore += this.WEIGHTS.agent_type;
            }
        }
        if (context1.task_type && context2.task_type) {
            if (context1.task_type === context2.task_type) {
                totalScore += this.WEIGHTS.task_type;
            }
        }
        if (context1.complexity && context2.complexity) {
            if (context1.complexity === context2.complexity) {
                totalScore += this.WEIGHTS.complexity;
            }
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
        if (pattern.context.agent_type === targetContext.agent_type) {
            reasoning.push('Same agent type');
        }
        else {
            reasoning.push(`Different agent types: ${pattern.context.agent_type} → ${targetContext.agent_type}`);
        }
        if (pattern.context.task_type === targetContext.task_type) {
            reasoning.push('Same task type');
        }
        else {
            reasoning.push(`Different task types: ${pattern.context.task_type} → ${targetContext.task_type}`);
        }
        if (pattern.context.complexity === targetContext.complexity) {
            reasoning.push('Same complexity level');
        }
        else {
            reasoning.push(`Different complexity: ${pattern.context.complexity} → ${targetContext.complexity}`);
        }
        return reasoning;
    }
}
//# sourceMappingURL=TransferabilityChecker.js.map