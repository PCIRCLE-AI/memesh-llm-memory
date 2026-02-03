import type { LearnedPattern } from './types.js';
export interface LearningConfig {
    maxPatternsPerAgent: number;
}
export declare class LearningManager {
    private patterns;
    private config;
    constructor(config?: Partial<LearningConfig>);
    addPattern(pattern: LearnedPattern): void;
    getPatterns(agentId: string, filter?: {
        type?: LearnedPattern['type'];
        taskType?: string;
        minConfidence?: number;
    }): LearnedPattern[];
    clearPatterns(agentId: string): void;
    getAgentsWithPatterns(): string[];
}
//# sourceMappingURL=LearningManager.d.ts.map