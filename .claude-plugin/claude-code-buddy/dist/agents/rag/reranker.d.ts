import type { SearchResult, RerankOptions } from './types.js';
export declare class Reranker {
    private cache;
    rerank(results: SearchResult[], query: string, options?: Partial<RerankOptions>): SearchResult[];
    private reciprocalRankFusion;
    private scoreFusion;
    keywordBoost(results: SearchResult[], keywords: string[]): SearchResult[];
    metadataBoost(results: SearchResult[], preferredMetadata: Partial<Record<keyof SearchResult['metadata'], any>>): SearchResult[];
    deduplicate(results: SearchResult[]): SearchResult[];
    diversityRerank(results: SearchResult[], diversityWeight?: number): SearchResult[];
    private contentSimilarity;
    private simpleHash;
    private generateCacheKey;
    clearCache(): void;
}
export declare function getReranker(): Reranker;
//# sourceMappingURL=reranker.d.ts.map