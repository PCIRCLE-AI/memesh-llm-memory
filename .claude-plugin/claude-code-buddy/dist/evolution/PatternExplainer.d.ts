import type { ContextualPattern, PatternExplanation } from './types.js';
export declare class PatternExplainer {
    private readonly CONFIDENCE_VERY_HIGH;
    private readonly CONFIDENCE_HIGH;
    private readonly CONFIDENCE_MODERATE;
    explain(pattern: ContextualPattern): PatternExplanation;
    private formatContextString;
    private generateSummary;
    private generateReasoning;
    private generateRecommendation;
    private explainConfidence;
    private describeContext;
}
//# sourceMappingURL=PatternExplainer.d.ts.map