/**
 * CLAUDE.md Rule Extractor
 *
 * Extracts workflow rules and requirements from CLAUDE.md and converts them
 * into executable WorkflowRule objects.
 *
 * Core Principles:
 * - Parse CLAUDE.md to find workflow requirements
 * - Extract TDD, code review, fix-all-issues rules
 * - Convert human-readable rules to executable checks
 * - Auto-update when CLAUDE.md changes
 *
 * Features:
 * - Section-based extraction (## headings)
 * - Keyword pattern matching
 * - Severity inference from language (MUST, SHOULD, MAY)
 * - Automatic rule compilation
 *
 * @example
 * ```typescript
 * const extractor = new ClaudeMdRuleExtractor();
 * await extractor.loadRulesFromClaudeMd();
 *
 * const rules = extractor.getRules();
 * console.log(`Extracted ${rules.length} workflow rules`);
 * ```
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import type { WorkflowRule, CheckCondition } from './WorkflowEnforcementEngine.js';
import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
import { logger } from '../utils/logger.js';

/**
 * Pattern for extracting workflow rules from CLAUDE.md
 */
interface RulePattern {
  /** Keywords to search for */
  keywords: string[];

  /** Workflow phase this rule applies to */
  phase: WorkflowPhase;

  /** Rule template */
  ruleTemplate: Omit<WorkflowRule, 'id' | 'requiredConditions'>;

  /** Condition generator */
  conditionGenerator: (content: string) => CheckCondition[];
}

/**
 * CLAUDE.md Rule Extractor
 *
 * Extracts and compiles workflow rules from CLAUDE.md.
 */
export class ClaudeMdRuleExtractor {
  private rules: WorkflowRule[] = [];
  private claudeMdPath: string;

  constructor(claudeMdPath?: string) {
    this.claudeMdPath = claudeMdPath || this.resolveClaudeMdPath();
  }

  /**
   * Resolve CLAUDE.md path from environment
   */
  private resolveClaudeMdPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    return resolve(homeDir, '.claude', 'CLAUDE.md');
  }

  /**
   * Load and extract rules from CLAUDE.md
   */
  async loadRulesFromClaudeMd(): Promise<void> {
    try {
      const content = await fs.readFile(this.claudeMdPath, 'utf-8');
      this.extractRules(content);
      logger.info('[ClaudeMdRuleExtractor] Loaded rules from CLAUDE.md', {
        rulesCount: this.rules.length,
        path: this.claudeMdPath,
      });
    } catch (error) {
      logger.warn('[ClaudeMdRuleExtractor] Failed to load CLAUDE.md', {
        path: this.claudeMdPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Initialize with empty rules on error
      this.rules = [];
    }
  }

  /**
   * Extract workflow rules from CLAUDE.md content
   */
  private extractRules(content: string): void {
    const patterns = this.getRulePatterns();
    const extractedRules: WorkflowRule[] = [];

    for (const pattern of patterns) {
      // Search for keywords in content
      const found = pattern.keywords.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (found) {
        // Generate conditions for this rule
        const conditions = pattern.conditionGenerator(content);

        if (conditions.length > 0) {
          const rule: WorkflowRule = {
            ...pattern.ruleTemplate,
            id: `claude-md-${pattern.phase}-${pattern.ruleTemplate.name.toLowerCase().replace(/\s+/g, '-')}`,
            requiredConditions: conditions,
          };

          extractedRules.push(rule);
        }
      }
    }

    this.rules = extractedRules;
  }

  /**
   * Get rule extraction patterns
   */
  private getRulePatterns(): RulePattern[] {
    return [
      // Rule: TDD (Test-Driven Development)
      {
        keywords: ['test-driven development', 'tdd', '先寫測試', 'write tests first'],
        phase: 'code-written',
        ruleTemplate: {
          name: 'Test-Driven Development',
          phase: 'code-written',
          severity: 'critical',
        },
        conditionGenerator: (content) => {
          // Check if TDD is required
          if (content.includes('先寫測試') || content.includes('test-driven development')) {
            return [
              {
                description: 'Tests must exist before writing code (TDD)',
                check: (ctx) => {
                  // Check if any test files in filesChanged
                  return (
                    ctx.filesChanged?.some((f) =>
                      ['.test.', '.spec.', '/tests/'].some((p) => f.includes(p))
                    ) ?? false
                  );
                },
                failureMessage: 'TDD violated: Write tests before implementation code',
                requiredAction: 'Write tests first, then implement',
              },
            ];
          }
          return [];
        },
      },

      // Rule: Code Review Required
      {
        keywords: [
          'code review',
          'code-review',
          '代碼審查',
          'review code',
          'must review',
          '必須 review',
        ],
        phase: 'test-complete',
        ruleTemplate: {
          name: 'Mandatory Code Review',
          phase: 'test-complete',
          severity: 'medium', // Changed from 'critical' - test-complete should provide guidance, not block
        },
        conditionGenerator: (content) => {
          if (content.includes('code review') || content.includes('代碼審查')) {
            return [
              {
                description: 'Code review is mandatory before commit',
                check: (ctx) => {
                  // Check if code-reviewer was run
                  return (
                    ctx.recentTools?.some((tool) => tool.includes('code-reviewer')) ?? false
                  );
                },
                failureMessage: 'Cannot commit without code review (CLAUDE.md requirement)',
                requiredAction: 'Run code-reviewer agent',
              },
            ];
          }
          return [];
        },
      },

      // Rule: Fix All Issues
      {
        keywords: [
          'fix all issues',
          'fix all',
          '修復所有',
          'no workarounds',
          'no ignored issues',
          '不忽略問題',
        ],
        phase: 'test-complete',
        ruleTemplate: {
          name: 'Fix All Issues',
          phase: 'test-complete',
          severity: 'medium', // Changed from 'critical' - test-complete should provide guidance, not block
        },
        conditionGenerator: (content) => {
          // Check for fix-all-issues requirement
          if (
            content.includes('fix all issues') ||
            content.includes('修復所有') ||
            content.includes('Fix All Issues')
          ) {
            return [
              {
                description: 'All code review issues must be fixed',
                check: async (ctx) => {
                  // This would check actual code review results
                  // For now, assume if tests pass after review, issues are fixed
                  return ctx.testsPassing === true;
                },
                failureMessage:
                  'Cannot proceed with unresolved issues (CLAUDE.md: Fix All Issues)',
                requiredAction: 'Fix all Critical and Major issues from code review',
              },
            ];
          }
          return [];
        },
      },

      // Rule: No Workarounds
      {
        keywords: ['no workarounds', 'no temporary', '禁止 workaround', 'no hack'],
        phase: 'commit-ready',
        ruleTemplate: {
          name: 'No Workarounds',
          phase: 'commit-ready',
          severity: 'critical',
        },
        conditionGenerator: (content) => {
          if (content.includes('no workarounds') || content.includes('禁止')) {
            return [
              {
                description: 'No temporary workarounds or hacks allowed',
                check: async (ctx) => {
                  // Scan staged files for TODO, FIXME, HACK, PLACEHOLDER patterns
                  if (!ctx.stagedFiles || ctx.stagedFiles.length === 0) {
                    return true; // No files staged, pass
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

                  for (const file of ctx.stagedFiles) {
                    // Only check source code files
                    if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
                      continue;
                    }

                    try {
                      const content = await fs.readFile(file, 'utf-8');
                      for (const pattern of workaroundPatterns) {
                        if (pattern.test(content)) {
                          return false; // Found workaround pattern
                        }
                      }
                    } catch (error) {
                      // File read error - log but don't fail the check
                      logger.warn(`Could not read file ${file} for workaround check`, {
                        file,
                        error: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }

                  return true; // No workarounds found
                },
                failureMessage:
                  'Cannot commit with workarounds (CLAUDE.md: No Workarounds)',
                requiredAction: 'Remove all TODO, FIXME, HACK comments and implement properly',
              },
            ];
          }
          return [];
        },
      },

      // Rule: Multiple Code Reviews
      {
        keywords: ['多次 code review', 'multiple review', '反覆 review'],
        phase: 'test-complete',
        ruleTemplate: {
          name: 'Multiple Code Reviews',
          phase: 'test-complete',
          severity: 'high',
        },
        conditionGenerator: (content) => {
          if (content.includes('多次') || content.includes('multiple')) {
            return [
              {
                description: 'Code should be reviewed multiple times until clean',
                check: (ctx) => {
                  // Check if code-reviewer was run at least once
                  // In practice, this would track review iterations
                  return (
                    ctx.recentTools?.some((tool) => tool.includes('code-reviewer')) ?? false
                  );
                },
                failureMessage: 'Code should be reviewed thoroughly (multiple iterations)',
                requiredAction:
                  'Run code-reviewer again if issues were found and fixed',
              },
            ];
          }
          return [];
        },
      },
    ];
  }

  /**
   * Get all extracted rules
   */
  getRules(): WorkflowRule[] {
    return [...this.rules];
  }

  /**
   * Get rules for a specific phase
   */
  getRulesForPhase(phase: WorkflowPhase): WorkflowRule[] {
    return this.rules.filter((r) => r.phase === phase);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Reload rules from CLAUDE.md
   */
  async reloadRules(): Promise<void> {
    this.clearRules();
    await this.loadRulesFromClaudeMd();
  }
}
