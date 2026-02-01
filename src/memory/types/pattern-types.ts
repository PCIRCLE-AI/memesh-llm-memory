/**
 * Pattern Types for MistakePatternEngine
 *
 * Defines the interfaces for prevention rules and operations.
 * The key insight: Recording mistakes is just the means; PREVENTION is the goal.
 * Every mistake must be converted into an executable prevention rule.
 */

import type { AIMistake } from '../../evolution/types.js';

/**
 * Categories of prevention rules
 */
export type PreventionRuleCategory =
  | 'read-before-edit'
  | 'scope-creep'
  | 'assumption'
  | 'verification'
  | 'other';

/**
 * Severity levels for rule violations
 */
export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Confidence levels for pattern extraction
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Action types when a rule is triggered
 */
export type RuleActionType = 'warn' | 'block' | 'require-confirmation';

/**
 * Check types for rule conditions
 */
export type CheckType = 'pre-condition' | 'pattern-match' | 'context-check';

/**
 * Prevention Rule Interface
 *
 * Represents an executable rule derived from recorded mistakes.
 * Each rule can trigger warnings, blocks, or confirmation requests
 * when similar situations are detected.
 */
export interface PreventionRule {
  /** Unique rule identifier */
  id: string;

  /** Human-readable rule name */
  name: string;

  /** Category of the prevention rule */
  category: PreventionRuleCategory;

  /** Trigger conditions for this rule */
  trigger: {
    /** Tools that trigger this rule (e.g., ['Edit', 'Write']) */
    tools: string[];
    /** File patterns that trigger this rule (e.g., ['*.ts', 'src/**']) */
    patterns: string[];
    /** Context keywords that trigger this rule (e.g., ['database', 'migration']) */
    contexts: string[];
  };

  /** Check configuration */
  check: {
    /** Type of check to perform */
    type: CheckType;
    /** Executable check condition (e.g., 'files_read_includes_target') */
    condition: string;
    /** Severity level of violation */
    severity: RuleSeverity;
  };

  /** Action to take when rule is triggered */
  action: {
    /** Type of action */
    type: RuleActionType;
    /** i18n key for the warning/block message */
    messageKey: string;
    /** i18n key for the suggestion */
    suggestionKey: string;
  };

  /** IDs of the source mistakes that generated this rule */
  sourceMistakeIds: string[];

  /** Confidence in this rule's effectiveness */
  confidence: ConfidenceLevel;

  /** Number of times this rule has been triggered */
  hitCount: number;

  /** When this rule was created */
  createdAt: Date;

  /** If merged, the ID of the rule this was merged into */
  mergedInto?: string;
}

/**
 * Operation Interface
 *
 * Represents an operation that should be checked against prevention rules.
 */
export interface Operation {
  /** Tool being used (e.g., 'Edit', 'Write', 'Bash') */
  tool: string;

  /** Tool arguments */
  args: Record<string, unknown>;

  /** Current context information */
  context: {
    /** Recently used tools */
    recentTools: string[];
    /** Current task description */
    currentTask: string;
    /** Files that have been read in this session */
    filesRead: string[];
    /** Files that have been modified in this session */
    filesModified: string[];
  };
}

/**
 * Rule Check Result
 *
 * Result of checking an operation against prevention rules.
 */
export interface RuleCheckResult {
  /** Whether any rules were violated */
  violated: boolean;

  /** List of violated rules */
  violations: Array<{
    rule: PreventionRule;
    message: string;
    suggestion: string;
  }>;

  /** Whether the operation should be blocked */
  blocked: boolean;

  /** Whether confirmation is required */
  requiresConfirmation: boolean;
}

/**
 * Pattern Extraction Result
 *
 * Result of extracting a prevention pattern from a mistake.
 */
export interface PatternExtractionResult {
  /** Whether extraction was successful */
  success: boolean;

  /** Extracted rule (if successful) */
  rule?: PreventionRule;

  /** Reason for failure (if unsuccessful) */
  reason?: string;
}

/**
 * Consolidation Result
 *
 * Result of consolidating similar rules.
 */
export interface ConsolidationResult {
  /** Number of rules consolidated */
  consolidated: number;

  /** IDs of the new general rules created */
  newRuleIds: string[];

  /** IDs of rules that were merged */
  mergedRuleIds: string[];
}

/**
 * Mistake input for pattern extraction
 * Extends AIMistake with optional id for new mistakes
 */
export type MistakeInput = Omit<AIMistake, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: Date;
};
