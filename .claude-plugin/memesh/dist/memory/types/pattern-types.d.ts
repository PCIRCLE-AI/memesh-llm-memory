import type { AIMistake } from '../../evolution/types.js';
export type PreventionRuleCategory = 'read-before-edit' | 'scope-creep' | 'assumption' | 'verification' | 'other';
export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type RuleActionType = 'warn' | 'block' | 'require-confirmation';
export type CheckType = 'pre-condition' | 'pattern-match' | 'context-check';
export interface PreventionRule {
    id: string;
    name: string;
    category: PreventionRuleCategory;
    trigger: {
        tools: string[];
        patterns: string[];
        contexts: string[];
    };
    check: {
        type: CheckType;
        condition: string;
        severity: RuleSeverity;
    };
    action: {
        type: RuleActionType;
        messageKey: string;
        suggestionKey: string;
    };
    sourceMistakeIds: string[];
    confidence: ConfidenceLevel;
    hitCount: number;
    createdAt: Date;
    mergedInto?: string;
}
export interface Operation {
    tool: string;
    args: Record<string, unknown>;
    context: {
        recentTools: string[];
        currentTask: string;
        filesRead: string[];
        filesModified: string[];
    };
}
export interface RuleCheckResult {
    violated: boolean;
    violations: Array<{
        rule: PreventionRule;
        message: string;
        suggestion: string;
    }>;
    blocked: boolean;
    requiresConfirmation: boolean;
}
export interface PatternExtractionResult {
    success: boolean;
    rule?: PreventionRule;
    reason?: string;
}
export interface ConsolidationResult {
    consolidated: number;
    newRuleIds: string[];
    mergedRuleIds: string[];
}
export type MistakeInput = Omit<AIMistake, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: Date;
};
//# sourceMappingURL=pattern-types.d.ts.map