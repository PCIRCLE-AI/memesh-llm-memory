import { logger } from '../../utils/logger.js';
export class Reranker {
    cache = new Map();
    rerank(results, query, options = {}) {
        const algorithm = options.algorithm || 'reciprocal-rank';
        const cacheKey = options.cacheKey || this.generateCacheKey(query, algorithm);
        if (options.useCache && this.cache.has(cacheKey)) {
            logger.debug('Using cached reranked results');
            return this.cache.get(cacheKey);
        }
        let rerankedResults;
        switch (algorithm) {
            case 'reciprocal-rank':
                rerankedResults = this.reciprocalRankFusion(results);
                break;
            case 'score-fusion':
                rerankedResults = this.scoreFusion(results);
                break;
            case 'llm-rerank':
                logger.warn('LLM reranking not implemented, falling back to score fusion');
                rerankedResults = this.scoreFusion(results);
                break;
            default:
                rerankedResults = results;
        }
        if (options.useCache) {
            this.cache.set(cacheKey, rerankedResults);
        }
        return rerankedResults;
    }
    reciprocalRankFusion(results) {
        const k = 60;
        const scoredResults = results.map((result, index) => {
            const rank = index + 1;
            const rrfScore = 1 / (k + rank);
            return {
                ...result,
                score: rrfScore,
            };
        });
        return scoredResults.sort((a, b) => b.score - a.score);
    }
    scoreFusion(results) {
        const maxScore = Math.max(...results.map((r) => r.score));
        const minScore = Math.min(...results.map((r) => r.score));
        const range = maxScore - minScore;
        if (range === 0) {
            return results;
        }
        const normalizedResults = results.map((result) => {
            const normalizedScore = (result.score - minScore) / range;
            return {
                ...result,
                score: normalizedScore,
            };
        });
        return normalizedResults.sort((a, b) => b.score - a.score);
    }
    keywordBoost(results, keywords) {
        if (keywords.length === 0) {
            return results;
        }
        const boostedResults = results.map((result) => {
            let boost = 0;
            const contentLower = result.content.toLowerCase();
            keywords.forEach((keyword) => {
                const keywordLower = keyword.toLowerCase();
                const matches = contentLower.split(keywordLower).length - 1;
                boost += matches * 0.1;
            });
            return {
                ...result,
                score: result.score * (1 + boost),
            };
        });
        return boostedResults.sort((a, b) => b.score - a.score);
    }
    metadataBoost(results, preferredMetadata) {
        const boostedResults = results.map((result) => {
            let boost = 0;
            Object.entries(preferredMetadata).forEach(([key, value]) => {
                if (result.metadata[key] === value) {
                    boost += 0.2;
                }
            });
            return {
                ...result,
                score: result.score * (1 + boost),
            };
        });
        return boostedResults.sort((a, b) => b.score - a.score);
    }
    deduplicate(results) {
        const uniqueResults = [];
        const seen = new Set();
        for (const result of results) {
            const contentHash = this.simpleHash(result.content);
            if (!seen.has(contentHash)) {
                seen.add(contentHash);
                uniqueResults.push(result);
            }
        }
        return uniqueResults;
    }
    diversityRerank(results, diversityWeight = 0.3) {
        if (results.length <= 1) {
            return results;
        }
        const diverseResults = [results[0]];
        const remaining = results.slice(1);
        while (remaining.length > 0 && diverseResults.length < results.length) {
            let maxDiversityScore = -Infinity;
            let selectedIndex = 0;
            for (let i = 0; i < remaining.length; i++) {
                const candidate = remaining[i];
                const avgDissimilarity = diverseResults.reduce((sum, selected) => {
                    return sum + (1 - this.contentSimilarity(candidate.content, selected.content));
                }, 0) / diverseResults.length;
                const diversityScore = candidate.score * (1 - diversityWeight) + avgDissimilarity * diversityWeight;
                if (diversityScore > maxDiversityScore) {
                    maxDiversityScore = diversityScore;
                    selectedIndex = i;
                }
            }
            diverseResults.push(remaining[selectedIndex]);
            remaining.splice(selectedIndex, 1);
        }
        return diverseResults;
    }
    contentSimilarity(content1, content2) {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter((x) => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    generateCacheKey(query, algorithm) {
        return `${algorithm}:${this.simpleHash(query)}`;
    }
    clearCache() {
        this.cache.clear();
    }
}
let rerankerInstance = null;
export function getReranker() {
    if (!rerankerInstance) {
        rerankerInstance = new Reranker();
    }
    return rerankerInstance;
}
//# sourceMappingURL=reranker.js.map