export type CheckType = 'pre-condition' | 'context-check' | 'post-condition';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ActionType = 'block' | 'require-confirmation' | 'warn' | 'log';
export type Confidence = 'high' | 'medium' | 'low';
export type RuleCategory = 'read-before-edit' | 'verification' | 'scope-creep' | 'custom';
export interface RuleTrigger {
    tools: string[];
    patterns: string[];
    contexts: string[];
}
export interface RuleCheck {
    type: CheckType;
    condition: string;
    severity: Severity;
}
export interface RuleAction {
    type: ActionType;
    messageKey: string;
    suggestionKey: string;
}
export interface PreventionRule {
    id: string;
    name: string;
    category: RuleCategory;
    trigger: RuleTrigger;
    check: RuleCheck;
    action: RuleAction;
    sourceMistakeIds: string[];
    confidence: Confidence;
    hitCount: number;
    createdAt: Date;
}
export interface ToolOperation {
    tool: string;
    targetFile: string;
    filesRead: string[];
    context: string;
    hasVerificationStep?: boolean;
    modifiedFiles?: string[];
    expectedScope?: number;
}
export interface RuleEvaluationResult {
    violated: boolean;
    applicable: boolean;
    severity?: Severity;
    messageKey?: string;
    suggestionKey?: string;
    ruleId: string;
}
export declare const BUILT_IN_RULES: PreventionRule[];
export declare function getBuiltInRule(id: string): PreventionRule | null;
export declare function getAllBuiltInRules(): PreventionRule[];
export declare function evaluateRule(rule: PreventionRule, operation: ToolOperation): RuleEvaluationResult;
//# sourceMappingURL=BuiltInRules.d.ts.map