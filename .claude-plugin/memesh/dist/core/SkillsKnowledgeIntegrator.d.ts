import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
export interface BestPractice {
    id: string;
    name: string;
    phase?: WorkflowPhase;
    tool: string;
    description: string;
    whenToUse: string;
    example?: string;
    source: string;
}
export declare class SkillsKnowledgeIntegrator {
    private skillsPath;
    private bestPractices;
    private skillsLoaded;
    constructor(skillsPath?: string);
    private resolveSkillsPath;
    scanSkills(): Promise<void>;
    private extractPracticesFromSkill;
    getBestPractices(tool: string): BestPractice[];
    getAllPractices(): BestPractice[];
    getPracticesForPhase(phase: WorkflowPhase): BestPractice[];
    private getTotalPracticesCount;
    isLoaded(): boolean;
    reload(): Promise<void>;
    getRecommendationEnhancements(phase: WorkflowPhase): string[];
}
//# sourceMappingURL=SkillsKnowledgeIntegrator.d.ts.map