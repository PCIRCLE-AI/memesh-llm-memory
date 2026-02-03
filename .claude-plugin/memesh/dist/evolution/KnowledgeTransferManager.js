export class KnowledgeTransferManager {
    learningManager;
    transferabilityChecker;
    DEFAULT_OPTIONS = {
        minConfidence: 0.7,
        minObservations: 10,
        minApplicabilityScore: 0.7,
    };
    constructor(learningManager, transferabilityChecker) {
        this.learningManager = learningManager;
        this.transferabilityChecker = transferabilityChecker;
    }
    async findTransferablePatterns(sourceAgentId, targetAgentId, targetContext, options = {}) {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        const sourcePatterns = this.learningManager.getPatterns(sourceAgentId, {
            minConfidence: opts.minConfidence,
        });
        const qualifiedPatterns = sourcePatterns.filter((pattern) => pattern.observationCount >= opts.minObservations);
        const transferablePatterns = [];
        for (const pattern of qualifiedPatterns) {
            const contextualPattern = {
                id: pattern.id,
                type: pattern.type,
                description: pattern.description,
                confidence: pattern.confidence,
                observations: pattern.observationCount,
                success_rate: pattern.successRate,
                avg_execution_time: 0,
                last_seen: pattern.updatedAt.toISOString(),
                context: {
                    agent_type: pattern.agentId,
                    task_type: pattern.taskType,
                    complexity: pattern.conditions.taskComplexity,
                },
            };
            const assessment = this.transferabilityChecker.assessTransferability(contextualPattern, sourceAgentId, targetAgentId, targetContext);
            if (assessment.applicabilityScore >= opts.minApplicabilityScore) {
                transferablePatterns.push({
                    pattern: contextualPattern,
                    sourceAgentId,
                    transferredAt: new Date(),
                    originalConfidence: pattern.confidence,
                    adaptedForContext: targetContext,
                });
            }
        }
        return transferablePatterns;
    }
}
//# sourceMappingURL=KnowledgeTransferManager.js.map