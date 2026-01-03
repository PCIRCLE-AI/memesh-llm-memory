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
        const sourcePatterns = await this.learningManager.getLearnedPatterns(sourceAgentId);
        const qualifiedPatterns = sourcePatterns.filter((pattern) => pattern.confidence >= opts.minConfidence &&
            pattern.observations >= opts.minObservations);
        const transferablePatterns = [];
        for (const pattern of qualifiedPatterns) {
            const assessment = this.transferabilityChecker.assessTransferability(pattern, sourceAgentId, targetAgentId, targetContext);
            if (assessment.applicabilityScore >= opts.minApplicabilityScore) {
                transferablePatterns.push({
                    pattern,
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