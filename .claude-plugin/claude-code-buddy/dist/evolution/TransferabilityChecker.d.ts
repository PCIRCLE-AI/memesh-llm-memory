import type { ContextualPattern, PatternContext, PatternTransferability } from './types.js';
export declare class TransferabilityChecker {
    private readonly WEIGHTS;
    private readonly CONFIDENCE_PENALTY;
    calculateContextSimilarity(context1: PatternContext, context2: PatternContext): number;
    private calculateJaccardSimilarity;
    assessTransferability(pattern: ContextualPattern, sourceAgentId: string, targetAgentId: string, targetContext: PatternContext): PatternTransferability;
    private generateReasoning;
}
//# sourceMappingURL=TransferabilityChecker.d.ts.map