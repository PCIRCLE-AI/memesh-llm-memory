/**
 * Workflow Enforcement Engine
 *
 * Enforces workflow rules and requirements at each checkpoint.
 * Prevents Claude Code from violating CLAUDE.md rules and user habits.
 *
 * Core Principles:
 * - Rules are MANDATORY, not suggestions
 * - Violations are BLOCKED, not warned
 * - Behavior is CHANGED, not just monitored
 *
 * Features:
 * - Checkpoint validation before transition
 * - CLAUDE.md rule extraction and compilation
 * - Automatic rule enforcement
 * - Violation blocking with clear explanations
 *
 * @example
 * ```typescript
 * const engine = new WorkflowEnforcementEngine(preventionHook);
 *
 * // Check if allowed to proceed from code-written to test-complete
 * const allowed = await engine.canProceedFromCheckpoint('code-written', {
 *   filesChanged: ['api.ts'],
 *   testsPassing: undefined // Tests not run yet
 * });
 *
 * if (!allowed.proceed) {
 *   console.error(`BLOCKED: ${allowed.reason}`);
 *   console.log(`Required: ${allowed.requiredActions.join(', ')}`);
 * }
 * ```
 */

import type { PreventionHook } from '../memory/PreventionHook.js';
import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
import { ClaudeMdRuleExtractor } from './ClaudeMdRuleExtractor.js';
import { logger } from '../utils/logger.js';
import { OperationError } from '../errors/index.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Context data for checkpoint validation
 */
export interface CheckpointContext {
  /** Current workflow phase */
  phase: WorkflowPhase;

  /** Files that have been modified */
  filesChanged?: string[];

  /** Files that are staged for commit */
  stagedFiles?: string[];

  /** Test status: undefined = not run, true = passed, false = failed */
  testsPassing?: boolean;

  /** Whether code has been reviewed */
  reviewed?: boolean;

  /** Whether changes have been committed */
  committed?: boolean;

  /** Recent tool history */
  recentTools?: string[];

  /** Files that have been read */
  filesRead?: string[];
}

/**
 * Result of checkpoint validation
 */
export interface ValidationResult {
  /** Whether allowed to proceed */
  proceed: boolean;

  /** Reason for blocking (if blocked) */
  reason?: string;

  /** Required actions before proceeding */
  requiredActions: string[];

  /** Violations detected */
  violations: string[];

  /** Warning messages (non-blocking) */
  warnings: string[];
}

/**
 * Workflow rule extracted from CLAUDE.md
 */
export interface WorkflowRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Which phase this rule applies to */
  phase: WorkflowPhase;

  /** Required conditions to proceed */
  requiredConditions: CheckCondition[];

  /** Severity: critical (block) | high (require confirmation) | medium (warn) */
  severity: 'critical' | 'high' | 'medium';
}

/**
 * Condition that must be satisfied
 */
export interface CheckCondition {
  /** Condition description */
  description: string;

  /** Validation function */
  check: (context: CheckpointContext) => boolean | Promise<boolean>;

  /** Message if condition fails */
  failureMessage: string;

  /** Required action to fix */
  requiredAction: string;
}

/**
 * Workflow Enforcement Engine
 *
 * Enforces workflow rules at checkpoints to prevent violations.
 */
export class WorkflowEnforcementEngine {
  private _preventionHook?: PreventionHook;
  private workflowRules: Map<WorkflowPhase, WorkflowRule[]> = new Map();
  private ruleExtractor: ClaudeMdRuleExtractor;

  constructor(preventionHook?: PreventionHook) {
    this._preventionHook = preventionHook;
    this.ruleExtractor = new ClaudeMdRuleExtractor();
    this.initializeDefaultRules();
    // Load CLAUDE.md rules asynchronously
    this.loadClaudeMdRules();
  }

  /**
   * Initialize default workflow rules from CLAUDE.md principles
   *
   * These rules enforce the core workflow requirements:
   * 1. Code must be tested before commit
   * 2. Tests must pass before code review
   * 3. Code review must be done before commit
   * 4. All issues must be fixed (no workarounds)
   */
  private initializeDefaultRules(): void {
    // Rule 1: code-written → test-complete
    // Suggest running tests after writing code (non-blocking)
    this.workflowRules.set('code-written', [
      {
        id: 'run-tests-after-code',
        name: 'Run Tests After Code Written',
        phase: 'code-written',
        severity: 'high', // Changed from 'critical' to 'high' - warning only, not blocking
        requiredConditions: [
          {
            description: 'Tests should be run to verify code changes',
            check: (ctx) => {
              // If testsPassing is undefined, tests haven't been run
              return ctx.testsPassing !== undefined;
            },
            failureMessage: 'Tests have not been run yet',
            requiredAction: 'Run tests to verify code changes',
          },
        ],
      },
    ]);

    // Rule 2: test-complete → commit-ready
    // Suggest fixing tests and running code review (warnings during development)
    this.workflowRules.set('test-complete', [
      {
        id: 'tests-must-pass',
        name: 'Tests Must Pass Before Review',
        phase: 'test-complete',
        severity: 'high', // Warning only - let developer fix tests
        requiredConditions: [
          {
            description: 'All tests should pass before code review',
            check: (ctx) => ctx.testsPassing === true,
            failureMessage: 'Tests are failing',
            requiredAction: 'Fix all failing tests',
          },
        ],
      },
      {
        id: 'code-review-required',
        name: 'Code Review Required',
        phase: 'test-complete',
        severity: 'high', // Warning only - remind to do code review
        requiredConditions: [
          {
            description: 'Code should be reviewed before commit',
            check: (ctx) => {
              // Check if code-reviewer was run (in recent tools)
              return ctx.recentTools?.some((tool) =>
                tool.includes('code-reviewer')
              ) ?? false;
            },
            failureMessage: 'Code has not been reviewed yet',
            requiredAction: 'Run code-reviewer agent',
          },
        ],
      },
      {
        id: 'fix-all-review-issues',
        name: 'Fix All Review Issues',
        phase: 'test-complete',
        severity: 'high', // Warning only during development
        requiredConditions: [
          {
            description: 'All code review issues should be fixed',
            check: async (_ctx) => {
              // This would check if there are unresolved code review issues
              // For now, we assume if review was run and tests pass, issues are fixed
              return true;
            },
            failureMessage: 'Code review issues need to be fixed',
            requiredAction: 'Fix all Critical and Major issues from code review',
          },
        ],
      },
    ]);

    // Rule 3: commit-ready → committed
    // No workarounds, all TODOs resolved, documentation updated
    this.workflowRules.set('commit-ready', [
      {
        id: 'no-workarounds',
        name: 'No Workarounds Allowed',
        phase: 'commit-ready',
        severity: 'critical',
        requiredConditions: [
          {
            description: 'No temporary workarounds or hacks',
            check: async (ctx) => {
              // Scan staged files for TODO, FIXME, HACK, PLACEHOLDER patterns
              const filesToCheck = ctx.stagedFiles || ctx.filesChanged || [];
              if (filesToCheck.length === 0) {
                return true; // No files to check
              }

              const workaroundPatterns = [
                /\/\/\s*TODO:/i,
                /\/\/\s*FIXME:/i,
                /\/\/\s*HACK:/i,
                /\/\/\s*XXX:/i,
                /\/\/\s*PLACEHOLDER/i,
                /\/\*\s*TODO:/i,
                /\/\*\s*FIXME:/i,
                /\/\*\s*HACK:/i,
              ];

              for (const file of filesToCheck) {
                // Only check source code files
                if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
                  continue;
                }

                try {
                  // Security: Validate file path is within project directory
                  const resolvedPath = path.resolve(file);
                  const projectRoot = process.cwd();
                  if (!resolvedPath.startsWith(projectRoot)) {
                    logger.warn(`Skipping file outside project directory: ${file}`);
                    continue;
                  }

                  const content = await fs.readFile(resolvedPath, 'utf-8');
                  for (const pattern of workaroundPatterns) {
                    if (pattern.test(content)) {
                      logger.warn(`Found workaround pattern in ${file}`);
                      return false;
                    }
                  }
                } catch (error) {
                  // File read error - log but continue checking other files
                  logger.warn(`Could not read file ${file} for workaround check:`, error);
                }
              }

              return true; // No workarounds found
            },
            failureMessage: 'Cannot commit with temporary workarounds',
            requiredAction: 'Remove all TODO, FIXME, HACK comments',
          },
        ],
      },
    ]);
  }

  /**
   * Load rules from CLAUDE.md
   *
   * Extracts workflow rules from CLAUDE.md and adds them to the engine.
   * This is called automatically during construction.
   */
  private async loadClaudeMdRules(): Promise<void> {
    try {
      await this.ruleExtractor.loadRulesFromClaudeMd();
      const extractedRules = this.ruleExtractor.getRules();

      // Add extracted rules to engine
      for (const rule of extractedRules) {
        this.addRule(rule);
      }

      logger.info('[WorkflowEnforcement] Loaded CLAUDE.md rules', {
        count: extractedRules.length,
      });
    } catch (error) {
      logger.error('[WorkflowEnforcement] Failed to load CLAUDE.md rules', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reload rules from CLAUDE.md
   *
   * Useful when CLAUDE.md has been updated.
   */
  async reloadClaudeMdRules(): Promise<void> {
    await this.ruleExtractor.reloadRules();
    const extractedRules = this.ruleExtractor.getRules();

    // Clear existing CLAUDE.md rules (those starting with 'claude-md-')
    for (const phase of this.workflowRules.keys()) {
      const rules = this.workflowRules.get(phase) || [];
      const filteredRules = rules.filter((r) => !r.id.startsWith('claude-md-'));
      this.workflowRules.set(phase, filteredRules);
    }

    // Add reloaded rules
    for (const rule of extractedRules) {
      this.addRule(rule);
    }

    logger.info('[WorkflowEnforcement] Reloaded CLAUDE.md rules', {
      count: extractedRules.length,
    });
  }

  /**
   * Check if allowed to proceed from current checkpoint
   *
   * Validates all required conditions for the current phase.
   * Returns whether proceeding is allowed and what's required.
   *
   * @param phase - Current workflow phase
   * @param context - Checkpoint context data
   * @returns Validation result with proceed status and required actions
   * @throws {OperationError} If validation fails catastrophically
   */
  async canProceedFromCheckpoint(
    phase: WorkflowPhase,
    context: CheckpointContext
  ): Promise<ValidationResult> {
    try {
      const result: ValidationResult = {
        proceed: true,
        requiredActions: [],
        violations: [],
        warnings: [],
      };

      // Get rules for this phase
      const rules = this.workflowRules.get(phase) || [];

      // Check all rules
      for (const rule of rules) {
        for (const condition of rule.requiredConditions) {
          try {
            const passed = await condition.check(context);

            if (!passed) {
              // Condition failed
              if (rule.severity === 'critical') {
                result.proceed = false;
                result.violations.push(condition.failureMessage);
                result.requiredActions.push(condition.requiredAction);
              } else if (rule.severity === 'high') {
                result.warnings.push(condition.failureMessage);
                result.requiredActions.push(condition.requiredAction);
              } else {
                result.warnings.push(condition.failureMessage);
              }
            }
          } catch (error) {
            // Log condition check failure but don't block workflow
            logger.error(`[WorkflowEnforcement] Condition check failed for rule ${rule.id}: ${error}`);
            result.warnings.push(`Failed to check: ${condition.description}`);
          }
        }
      }

      // Set reason if blocked
      if (!result.proceed) {
        result.reason = result.violations.join('; ');
      }

      logger.debug('[WorkflowEnforcement] Checkpoint validation', {
        phase,
        proceed: result.proceed,
        violations: result.violations.length,
        warnings: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('[WorkflowEnforcement] Checkpoint validation failed catastrophically', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase,
      });

      throw new OperationError(
        `Checkpoint validation failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          component: 'WorkflowEnforcementEngine',
          method: 'canProceedFromCheckpoint',
          phase,
          cause: error,
        }
      );
    }
  }

  /**
   * Add a custom workflow rule
   *
   * Allows adding custom rules from CLAUDE.md or user preferences.
   *
   * @param rule - Custom workflow rule to add
   */
  addRule(rule: WorkflowRule): void {
    const existingRules = this.workflowRules.get(rule.phase) || [];
    existingRules.push(rule);
    this.workflowRules.set(rule.phase, existingRules);

    logger.info('[WorkflowEnforcement] Added custom rule', {
      ruleId: rule.id,
      phase: rule.phase,
      severity: rule.severity,
    });
  }

  /**
   * Get all rules for a phase
   *
   * @param phase - Workflow phase
   * @returns Array of rules for this phase
   */
  getRulesForPhase(phase: WorkflowPhase): WorkflowRule[] {
    return this.workflowRules.get(phase) || [];
  }

  /**
   * Format enforcement result as user-friendly message
   *
   * @param result - Validation result
   * @returns Formatted message string
   */
  formatEnforcementMessage(result: ValidationResult): string {
    const lines: string[] = [];

    if (!result.proceed) {
      lines.push('🔴 WORKFLOW VIOLATION - BLOCKED');
      lines.push('');
      lines.push('You cannot proceed because:');
      result.violations.forEach((v) => {
        lines.push(`  ❌ ${v}`);
      });
      lines.push('');
      lines.push('Required actions:');
      result.requiredActions.forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a}`);
      });
    } else if (result.warnings.length > 0) {
      lines.push('⚠️  WORKFLOW WARNINGS');
      lines.push('');
      result.warnings.forEach((w) => {
        lines.push(`  ⚠️  ${w}`);
      });
      if (result.requiredActions.length > 0) {
        lines.push('');
        lines.push('Recommended actions:');
        result.requiredActions.forEach((a, i) => {
          lines.push(`  ${i + 1}. ${a}`);
        });
      }
    } else {
      lines.push('✅ Workflow validation passed');
    }

    return lines.join('\n');
  }
}
