import type { PatternContext, ContextualPattern } from './types.js';
export interface MatchOptions {
    weights?: {
        agent_type: number;
        task_type: number;
        complexity: number;
        config_keys: number;
    };
    min_similarity?: number;
    top_k?: number;
}
export interface PatternMatch {
    pattern: ContextualPattern;
    similarity: number;
    score: number;
}
export declare class ContextMatcher {
    private defaultWeights;
    private valuesMatch;
    computeSimilarity(ctx1: PatternContext, ctx2: PatternContext, weights?: MatchOptions['weights']): number;
    findBestMatches(currentContext: PatternContext, patterns: ContextualPattern[], options?: MatchOptions): PatternMatch[];
    private jaccardSimilarity;
}
//# sourceMappingURL=ContextMatcher.d.ts.map