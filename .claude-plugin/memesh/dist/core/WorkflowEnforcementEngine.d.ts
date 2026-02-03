import type { PreventionHook } from '../memory/PreventionHook.js';
import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
export interface CheckpointContext {
    phase: WorkflowPhase;
    filesChanged?: string[];
    stagedFiles?: string[];
    testsPassing?: boolean;
    reviewed?: boolean;
    committed?: boolean;
    recentTools?: string[];
    filesRead?: string[];
}
export interface ValidationResult {
    proceed: boolean;
    reason?: string;
    requiredActions: string[];
    violations: string[];
    warnings: string[];
}
export interface WorkflowRule {
    id: string;
    name: string;
    phase: WorkflowPhase;
    requiredConditions: CheckCondition[];
    severity: 'critical' | 'high' | 'medium';
}
export interface CheckCondition {
    description: string;
    check: (context: CheckpointContext) => boolean | Promise<boolean>;
    failureMessage: string;
    requiredAction: string;
}
export declare class WorkflowEnforcementEngine {
    private _preventionHook?;
    private workflowRules;
    private ruleExtractor;
    constructor(preventionHook?: PreventionHook);
    private initializeDefaultRules;
    private loadClaudeMdRules;
    reloadClaudeMdRules(): Promise<void>;
    canProceedFromCheckpoint(phase: WorkflowPhase, context: CheckpointContext): Promise<ValidationResult>;
    addRule(rule: WorkflowRule): void;
    getRulesForPhase(phase: WorkflowPhase): WorkflowRule[];
    formatEnforcementMessage(result: ValidationResult): string;
}
//# sourceMappingURL=WorkflowEnforcementEngine.d.ts.map