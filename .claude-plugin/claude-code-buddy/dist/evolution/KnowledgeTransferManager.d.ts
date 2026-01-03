import type { LearningManager } from './LearningManager.js';
import type { TransferabilityChecker } from './TransferabilityChecker.js';
import type { PatternContext, TransferablePattern } from './types.js';
export interface FindTransferableOptions {
    minConfidence?: number;
    minObservations?: number;
    minApplicabilityScore?: number;
}
export declare class KnowledgeTransferManager {
    private readonly learningManager;
    private readonly transferabilityChecker;
    private readonly DEFAULT_OPTIONS;
    constructor(learningManager: LearningManager, transferabilityChecker: TransferabilityChecker);
    findTransferablePatterns(sourceAgentId: string, targetAgentId: string, targetContext: PatternContext, options?: FindTransferableOptions): Promise<TransferablePattern[]>;
}
//# sourceMappingURL=KnowledgeTransferManager.d.ts.map