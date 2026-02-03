import { logger } from '../utils/logger.js';
export class ContextMatcher {
    defaultWeights = {
        agent_type: 0.4,
        task_type: 0.3,
        complexity: 0.2,
        config_keys: 0.1,
    };
    valuesMatch(val1, val2) {
        if (val1 !== undefined && val2 !== undefined) {
            return val1 === val2;
        }
        return val1 === undefined && val2 === undefined;
    }
    computeSimilarity(ctx1, ctx2, weights) {
        const w = weights || this.defaultWeights;
        if (weights) {
            const sum = Object.values(weights).reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 1.0) > 0.01) {
                logger.warn('[ContextMatcher] Weights do not sum to 1.0', {
                    weights,
                    sum,
                });
            }
        }
        let similarity = 0;
        if (this.valuesMatch(ctx1.agent_type, ctx2.agent_type)) {
            similarity += w.agent_type;
        }
        if (this.valuesMatch(ctx1.task_type, ctx2.task_type)) {
            similarity += w.task_type;
        }
        if (this.valuesMatch(ctx1.complexity, ctx2.complexity)) {
            similarity += w.complexity;
        }
        if (ctx1.config_keys !== undefined && ctx2.config_keys !== undefined) {
            const jaccardSimilarity = this.jaccardSimilarity(ctx1.config_keys, ctx2.config_keys);
            similarity += w.config_keys * jaccardSimilarity;
        }
        else if (ctx1.config_keys === undefined && ctx2.config_keys === undefined) {
            similarity += w.config_keys;
        }
        return similarity;
    }
    findBestMatches(currentContext, patterns, options = {}) {
        const hasDefinedField = Object.values(currentContext).some((v) => v !== undefined);
        if (!hasDefinedField) {
            logger.warn('[ContextMatcher] Current context has no defined fields', { currentContext });
            return [];
        }
        if (patterns.length === 0) {
            return [];
        }
        const matches = patterns.map((pattern) => {
            const similarity = this.computeSimilarity(currentContext, pattern.context, options.weights);
            const score = similarity * pattern.confidence;
            return {
                pattern,
                similarity,
                score,
            };
        });
        let filteredMatches = matches;
        if (options.min_similarity !== undefined) {
            const minSimilarity = options.min_similarity;
            filteredMatches = matches.filter((m) => m.similarity >= minSimilarity);
        }
        filteredMatches.sort((a, b) => b.score - a.score);
        if (options.top_k !== undefined) {
            filteredMatches = filteredMatches.slice(0, options.top_k);
        }
        return filteredMatches;
    }
    jaccardSimilarity(set1, set2) {
        if (set1.length === 0 && set2.length === 0) {
            return 1.0;
        }
        const s1 = new Set(set1);
        const s2 = new Set(set2);
        const intersection = new Set([...s1].filter((x) => s2.has(x)));
        const union = new Set([...s1, ...s2]);
        return intersection.size / union.size;
    }
}
//# sourceMappingURL=ContextMatcher.js.map