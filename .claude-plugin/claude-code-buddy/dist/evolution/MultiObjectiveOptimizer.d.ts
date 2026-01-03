import type { OptimizationCandidate, OptimizationObjectives } from './types.js';
export declare class MultiObjectiveOptimizer {
    dominates(c1: OptimizationCandidate, c2: OptimizationCandidate): boolean;
    findParetoFront(candidates: OptimizationCandidate[]): OptimizationCandidate[];
    selectBest(candidates: OptimizationCandidate[], weights: OptimizationObjectives): OptimizationCandidate | undefined;
    private computeWeightedScore;
    private getCommonObjectiveKeys;
}
//# sourceMappingURL=MultiObjectiveOptimizer.d.ts.map