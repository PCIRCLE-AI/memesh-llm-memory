/**
 * BuiltInRules - Pre-defined Prevention Rules
 *
 * Phase 0.7.0 Memory System Upgrade:
 * Provides built-in prevention rules for common mistakes.
 *
 * These rules are always active and help prevent:
 * 1. Editing files without reading them first
 * 2. Claiming completion without verification
 * 3. Scope creep (modifying more files than expected)
 */

/**
 * Check types for prevention rules
 */
export type CheckType = 'pre-condition' | 'context-check' | 'post-condition';

/**
 * Severity levels for rule violations
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Action types for rule violations
 */
export type ActionType = 'block' | 'require-confirmation' | 'warn' | 'log';

/**
 * Confidence level for rules
 */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Rule category types
 */
export type RuleCategory = 'read-before-edit' | 'verification' | 'scope-creep' | 'custom';

/**
 * Trigger configuration for a prevention rule
 */
export interface RuleTrigger {
  /** Tools that trigger this rule (e.g., 'Edit', 'Write') */
  tools: string[];
  /** File patterns to match (e.g., '*.ts', '*') */
  patterns: string[];
  /** Context keywords that trigger this rule */
  contexts: string[];
}

/**
 * Check configuration for a prevention rule
 */
export interface RuleCheck {
  /** Type of check to perform */
  type: CheckType;
  /** Condition to evaluate (human-readable description) */
  condition: string;
  /** Severity if check fails */
  severity: Severity;
}

/**
 * Action configuration for when a rule is violated
 */
export interface RuleAction {
  /** Type of action to take */
  type: ActionType;
  /** i18n key for the violation message */
  messageKey: string;
  /** i18n key for the suggestion message */
  suggestionKey: string;
}

/**
 * Prevention rule definition
 */
export interface PreventionRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category of the rule */
  category: RuleCategory;
  /** What triggers this rule */
  trigger: RuleTrigger;
  /** How to check for violations */
  check: RuleCheck;
  /** What to do when violated */
  action: RuleAction;
  /** IDs of mistakes that led to this rule */
  sourceMistakeIds: string[];
  /** Confidence level */
  confidence: Confidence;
  /** Number of times this rule has been triggered */
  hitCount: number;
  /** When this rule was created */
  createdAt: Date;
}

/**
 * Tool operation context for rule evaluation
 */
export interface ToolOperation {
  /** Name of the tool being used */
  tool: string;
  /** Target file path (if applicable) */
  targetFile: string;
  /** Files that have been read in this session */
  filesRead: string[];
  /** Current context/conversation text */
  context: string;
  /** Whether a verification step has been performed */
  hasVerificationStep?: boolean;
  /** Files that have been modified in this session */
  modifiedFiles?: string[];
  /** Expected number of files to modify (scope) */
  expectedScope?: number;
}

/**
 * Result of evaluating a rule
 */
export interface RuleEvaluationResult {
  /** Whether the rule was violated */
  violated: boolean;
  /** Whether the rule was applicable to this operation */
  applicable: boolean;
  /** Severity of the violation (if violated) */
  severity?: Severity;
  /** i18n message key for the violation */
  messageKey?: string;
  /** i18n suggestion key for the violation */
  suggestionKey?: string;
  /** Rule ID */
  ruleId: string;
}

/**
 * Built-in prevention rules
 */
export const BUILT_IN_RULES: PreventionRule[] = [
  // Rule 1: Read Before Edit
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

  // Rule 2: Verify Before Claim
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

  // Rule 3: No Scope Creep
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

/**
 * Get a specific built-in rule by ID
 * @param id - The rule ID to look up
 * @returns The rule if found, null otherwise
 */
export function getBuiltInRule(id: string): PreventionRule | null {
  return BUILT_IN_RULES.find((rule) => rule.id === id) ?? null;
}

/**
 * Get all built-in rules
 * @returns A copy of all built-in rules
 */
export function getAllBuiltInRules(): PreventionRule[] {
  return [...BUILT_IN_RULES];
}

/**
 * Default scope limit for scope creep detection
 */
const DEFAULT_SCOPE_LIMIT = 5;

/**
 * Evaluate a rule against a tool operation
 * @param rule - The rule to evaluate
 * @param operation - The tool operation context
 * @returns Evaluation result indicating if rule was violated
 */
export function evaluateRule(rule: PreventionRule, operation: ToolOperation): RuleEvaluationResult {
  const baseResult: RuleEvaluationResult = {
    violated: false,
    applicable: false,
    ruleId: rule.id,
  };

  // Check if rule applies to this operation
  const isApplicable = isRuleApplicable(rule, operation);
  if (!isApplicable) {
    return baseResult;
  }

  baseResult.applicable = true;

  // Evaluate based on rule type
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

/**
 * Check if a rule is applicable to the given operation
 */
function isRuleApplicable(rule: PreventionRule, operation: ToolOperation): boolean {
  // Check tool trigger
  if (rule.trigger.tools.length > 0) {
    if (!rule.trigger.tools.includes(operation.tool)) {
      return false;
    }
  }

  // Check context trigger
  if (rule.trigger.contexts.length > 0) {
    const contextLower = operation.context.toLowerCase();
    const hasContextMatch = rule.trigger.contexts.some((ctx) => contextLower.includes(ctx.toLowerCase()));
    if (!hasContextMatch) {
      return false;
    }
  }

  // If no triggers specified, rule doesn't apply
  if (rule.trigger.tools.length === 0 && rule.trigger.contexts.length === 0) {
    return false;
  }

  return true;
}

/**
 * Evaluate the read-before-edit rule
 */
function evaluateReadBeforeEdit(
  rule: PreventionRule,
  operation: ToolOperation,
  result: RuleEvaluationResult
): RuleEvaluationResult {
  // Check if target file was read
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

/**
 * Evaluate the verify-before-claim rule
 */
function evaluateVerifyBeforeClaim(
  rule: PreventionRule,
  operation: ToolOperation,
  result: RuleEvaluationResult
): RuleEvaluationResult {
  // Check if verification step was performed
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

/**
 * Evaluate the no-scope-creep rule
 */
function evaluateNoScopeCreep(
  rule: PreventionRule,
  operation: ToolOperation,
  result: RuleEvaluationResult
): RuleEvaluationResult {
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
