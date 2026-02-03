import type { ABTestExperiment, ABTestVariant, ABTestAssignment, ABTestResults } from './types.js';
export interface CreateExperimentOptions {
    durationDays?: number;
    minSampleSize?: number;
    significanceLevel?: number;
    secondaryMetrics?: string[];
}
export declare class ABTestManager {
    private experiments;
    private assignments;
    private metrics;
    private analyzer;
    createExperiment(id: string, name: string, variants: ABTestVariant[], trafficSplit: number[], successMetric: 'quality_score' | 'cost' | 'duration' | 'user_satisfaction', options?: CreateExperimentOptions): ABTestExperiment;
    startExperiment(experimentId: string): void;
    assignVariant(experimentId: string, agentId: string): ABTestAssignment;
    private hashToVariant;
    addMetric(experimentId: string, variantName: string, metrics: Record<string, number>): void;
    analyzeResults(experimentId: string): ABTestResults;
    getExperiment(experimentId: string): ABTestExperiment | undefined;
}
//# sourceMappingURL=ABTestManager.d.ts.map