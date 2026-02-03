import type { WorkflowRule } from './WorkflowEnforcementEngine.js';
import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
export declare class ClaudeMdRuleExtractor {
    private rules;
    private claudeMdPath;
    constructor(claudeMdPath?: string);
    private resolveClaudeMdPath;
    loadRulesFromClaudeMd(): Promise<void>;
    private extractRules;
    private getRulePatterns;
    getRules(): WorkflowRule[];
    getRulesForPhase(phase: WorkflowPhase): WorkflowRule[];
    clearRules(): void;
    reloadRules(): Promise<void>;
}
//# sourceMappingURL=ClaudeMdRuleExtractor.d.ts.map