import { logger } from '../utils/logger.js';
export class MultiObjectiveOptimizer {
    dominates(c1, c2) {
        const keys = this.getCommonObjectiveKeys(c1.objectives, c2.objectives);
        if (keys.length === 0) {
            logger.warn('[MultiObjectiveOptimizer] No common objectives for domination check', {
                c1Keys: Object.keys(c1.objectives),
                c2Keys: Object.keys(c2.objectives),
            });
            return false;
        }
        let atLeastOneBetter = false;
        for (const key of keys) {
            const val1 = c1.objectives[key] ?? 0;
            const val2 = c2.objectives[key] ?? 0;
            if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
                logger.warn('[MultiObjectiveOptimizer] Non-finite objective value detected', { key, val1, val2 });
                continue;
            }
            if (val1 < val2) {
                return false;
            }
            if (val1 > val2) {
                atLeastOneBetter = true;
            }
        }
        return atLeastOneBetter;
    }
    findParetoFront(candidates) {
        if (candidates.length === 0) {
            return [];
        }
        if (candidates.length === 1) {
            return candidates;
        }
        const paretoFront = [];
        for (const candidate of candidates) {
            let isDominated = false;
            for (const paretoMember of paretoFront) {
                if (this.dominates(paretoMember, candidate)) {
                    isDominated = true;
                    break;
                }
            }
            if (!isDominated) {
                const newParetoFront = paretoFront.filter((member) => !this.dominates(candidate, member));
                newParetoFront.push(candidate);
                paretoFront.length = 0;
                paretoFront.push(...newParetoFront);
            }
        }
        return paretoFront;
    }
    selectBest(candidates, weights) {
        if (candidates.length === 0) {
            return undefined;
        }
        const weightValues = Object.values(weights).filter(v => v !== undefined);
        if (weightValues.length === 0) {
            logger.warn('[MultiObjectiveOptimizer] No valid weights provided');
            return undefined;
        }
        if (weightValues.some(w => w < 0 || !Number.isFinite(w))) {
            logger.error('[MultiObjectiveOptimizer] Invalid weights detected', { weights });
            return undefined;
        }
        let bestCandidate;
        let bestScore = -Infinity;
        for (const candidate of candidates) {
            const score = this.computeWeightedScore(candidate.objectives, weights);
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }
        return bestCandidate;
    }
    computeWeightedScore(objectives, weights) {
        let score = 0;
        for (const key in weights) {
            const weight = weights[key] ?? 0;
            const value = objectives[key] ?? 0;
            score += weight * value;
        }
        return score;
    }
    getCommonObjectiveKeys(obj1, obj2) {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        return keys1.filter((key) => keys2.includes(key));
    }
}
//# sourceMappingURL=MultiObjectiveOptimizer.js.map