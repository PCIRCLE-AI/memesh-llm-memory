export const BUILT_IN_RULES = [
    {
        id: 'read-before-edit',
        name: 'Read Before Edit',
        category: 'read-before-edit',
        trigger: {
            tools: ['Edit', 'Write'],
            patterns: ['*'],
            contexts: [],
        },
        check: {
            type: 'pre-condition',
            condition: 'filesRead.includes(targetFile)',
            severity: 'critical',
        },
        action: {
            type: 'block',
            messageKey: 'ccb.rule.readBeforeEdit',
            suggestionKey: 'ccb.rule.readBeforeEdit.suggestion',
        },
        sourceMistakeIds: ['built-in'],
        confidence: 'high',
        hitCount: 0,
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'verify-before-claim',
        name: 'Run Before Claim',
        category: 'verification',
        trigger: {
            tools: [],
            patterns: [],
            contexts: ['complete', 'done', 'finished', 'fixed'],
        },
        check: {
            type: 'context-check',
            condition: 'hasVerificationStep()',
            severity: 'high',
        },
        action: {
            type: 'require-confirmation',
            messageKey: 'ccb.rule.verifyBeforeClaim',
            suggestionKey: 'ccb.rule.verifyBeforeClaim.suggestion',
        },
        sourceMistakeIds: ['built-in'],
        confidence: 'high',
        hitCount: 0,
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'no-scope-creep',
        name: 'No Scope Creep',
        category: 'scope-creep',
        trigger: {
            tools: ['Edit', 'Write'],
            patterns: [],
            contexts: [],
        },
        check: {
            type: 'context-check',
            condition: 'modifiedFiles.length > expectedScope',
            severity: 'medium',
        },
        action: {
            type: 'warn',
            messageKey: 'ccb.rule.scopeCreep',
            suggestionKey: 'ccb.rule.scopeCreep.suggestion',
        },
        sourceMistakeIds: ['built-in'],
        confidence: 'high',
        hitCount: 0,
        createdAt: new Date('2024-01-01'),
    },
];
export function getBuiltInRule(id) {
    return BUILT_IN_RULES.find((rule) => rule.id === id) ?? null;
}
export function getAllBuiltInRules() {
    return [...BUILT_IN_RULES];
}
const DEFAULT_SCOPE_LIMIT = 5;
export function evaluateRule(rule, operation) {
    const baseResult = {
        violated: false,
        applicable: false,
        ruleId: rule.id,
    };
    const isApplicable = isRuleApplicable(rule, operation);
    if (!isApplicable) {
        return baseResult;
    }
    baseResult.applicable = true;
    switch (rule.id) {
        case 'read-before-edit':
            return evaluateReadBeforeEdit(rule, operation, baseResult);
        case 'verify-before-claim':
            return evaluateVerifyBeforeClaim(rule, operation, baseResult);
        case 'no-scope-creep':
            return evaluateNoScopeCreep(rule, operation, baseResult);
        default:
            return baseResult;
    }
}
function isRuleApplicable(rule, operation) {
    if (rule.trigger.tools.length > 0) {
        if (!rule.trigger.tools.includes(operation.tool)) {
            return false;
        }
    }
    if (rule.trigger.contexts.length > 0) {
        const contextLower = operation.context.toLowerCase();
        const hasContextMatch = rule.trigger.contexts.some((ctx) => contextLower.includes(ctx.toLowerCase()));
        if (!hasContextMatch) {
            return false;
        }
    }
    if (rule.trigger.tools.length === 0 && rule.trigger.contexts.length === 0) {
        return false;
    }
    return true;
}
function evaluateReadBeforeEdit(rule, operation, result) {
    const targetFileRead = operation.filesRead.includes(operation.targetFile);
    if (!targetFileRead) {
        return {
            ...result,
            violated: true,
            severity: rule.check.severity,
            messageKey: rule.action.messageKey,
            suggestionKey: rule.action.suggestionKey,
        };
    }
    return result;
}
function evaluateVerifyBeforeClaim(rule, operation, result) {
    if (!operation.hasVerificationStep) {
        return {
            ...result,
            violated: true,
            severity: rule.check.severity,
            messageKey: rule.action.messageKey,
            suggestionKey: rule.action.suggestionKey,
        };
    }
    return result;
}
function evaluateNoScopeCreep(rule, operation, result) {
    const modifiedCount = operation.modifiedFiles?.length ?? 0;
    const expectedScope = operation.expectedScope ?? DEFAULT_SCOPE_LIMIT;
    if (modifiedCount > expectedScope) {
        return {
            ...result,
            violated: true,
            severity: rule.check.severity,
            messageKey: rule.action.messageKey,
            suggestionKey: rule.action.suggestionKey,
        };
    }
    return result;
}
//# sourceMappingURL=BuiltInRules.js.map