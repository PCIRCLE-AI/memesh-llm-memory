import { ClaudeMdRuleExtractor } from './ClaudeMdRuleExtractor.js';
import { logger } from '../utils/logger.js';
import { OperationError } from '../errors/index.js';
import { promises as fs } from 'fs';
import path from 'path';
export class WorkflowEnforcementEngine {
    _preventionHook;
    workflowRules = new Map();
    ruleExtractor;
    constructor(preventionHook) {
        this._preventionHook = preventionHook;
        this.ruleExtractor = new ClaudeMdRuleExtractor();
        this.initializeDefaultRules();
        this.loadClaudeMdRules();
    }
    initializeDefaultRules() {
        this.workflowRules.set('code-written', [
            {
                id: 'run-tests-after-code',
                name: 'Run Tests After Code Written',
                phase: 'code-written',
                severity: 'high',
                requiredConditions: [
                    {
                        description: 'Tests should be run to verify code changes',
                        check: (ctx) => {
                            return ctx.testsPassing !== undefined;
                        },
                        failureMessage: 'Tests have not been run yet',
                        requiredAction: 'Run tests to verify code changes',
                    },
                ],
            },
        ]);
        this.workflowRules.set('test-complete', [
            {
                id: 'tests-must-pass',
                name: 'Tests Must Pass Before Review',
                phase: 'test-complete',
                severity: 'high',
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
                severity: 'high',
                requiredConditions: [
                    {
                        description: 'Code should be reviewed before commit',
                        check: (ctx) => {
                            return ctx.recentTools?.some((tool) => tool.includes('code-reviewer')) ?? false;
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
                severity: 'high',
                requiredConditions: [
                    {
                        description: 'All code review issues should be fixed',
                        check: async (_ctx) => {
                            return true;
                        },
                        failureMessage: 'Code review issues need to be fixed',
                        requiredAction: 'Fix all Critical and Major issues from code review',
                    },
                ],
            },
        ]);
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
                            const filesToCheck = ctx.stagedFiles || ctx.filesChanged || [];
                            if (filesToCheck.length === 0) {
                                return true;
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
                                if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
                                    continue;
                                }
                                try {
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
                                }
                                catch (error) {
                                    logger.warn(`Could not read file ${file} for workaround check:`, error);
                                }
                            }
                            return true;
                        },
                        failureMessage: 'Cannot commit with temporary workarounds',
                        requiredAction: 'Remove all TODO, FIXME, HACK comments',
                    },
                ],
            },
        ]);
    }
    async loadClaudeMdRules() {
        try {
            await this.ruleExtractor.loadRulesFromClaudeMd();
            const extractedRules = this.ruleExtractor.getRules();
            for (const rule of extractedRules) {
                this.addRule(rule);
            }
            logger.info('[WorkflowEnforcement] Loaded CLAUDE.md rules', {
                count: extractedRules.length,
            });
        }
        catch (error) {
            logger.error('[WorkflowEnforcement] Failed to load CLAUDE.md rules', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async reloadClaudeMdRules() {
        await this.ruleExtractor.reloadRules();
        const extractedRules = this.ruleExtractor.getRules();
        for (const phase of this.workflowRules.keys()) {
            const rules = this.workflowRules.get(phase) || [];
            const filteredRules = rules.filter((r) => !r.id.startsWith('claude-md-'));
            this.workflowRules.set(phase, filteredRules);
        }
        for (const rule of extractedRules) {
            this.addRule(rule);
        }
        logger.info('[WorkflowEnforcement] Reloaded CLAUDE.md rules', {
            count: extractedRules.length,
        });
    }
    async canProceedFromCheckpoint(phase, context) {
        try {
            const result = {
                proceed: true,
                requiredActions: [],
                violations: [],
                warnings: [],
            };
            const rules = this.workflowRules.get(phase) || [];
            for (const rule of rules) {
                for (const condition of rule.requiredConditions) {
                    try {
                        const passed = await condition.check(context);
                        if (!passed) {
                            if (rule.severity === 'critical') {
                                result.proceed = false;
                                result.violations.push(condition.failureMessage);
                                result.requiredActions.push(condition.requiredAction);
                            }
                            else if (rule.severity === 'high') {
                                result.warnings.push(condition.failureMessage);
                                result.requiredActions.push(condition.requiredAction);
                            }
                            else {
                                result.warnings.push(condition.failureMessage);
                            }
                        }
                    }
                    catch (error) {
                        logger.error(`[WorkflowEnforcement] Condition check failed for rule ${rule.id}: ${error}`);
                        result.warnings.push(`Failed to check: ${condition.description}`);
                    }
                }
            }
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
        }
        catch (error) {
            logger.error('[WorkflowEnforcement] Checkpoint validation failed catastrophically', {
                error: error instanceof Error ? error.message : 'Unknown error',
                phase,
            });
            throw new OperationError(`Checkpoint validation failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'WorkflowEnforcementEngine',
                method: 'canProceedFromCheckpoint',
                phase,
                cause: error,
            });
        }
    }
    addRule(rule) {
        const existingRules = this.workflowRules.get(rule.phase) || [];
        existingRules.push(rule);
        this.workflowRules.set(rule.phase, existingRules);
        logger.info('[WorkflowEnforcement] Added custom rule', {
            ruleId: rule.id,
            phase: rule.phase,
            severity: rule.severity,
        });
    }
    getRulesForPhase(phase) {
        return this.workflowRules.get(phase) || [];
    }
    formatEnforcementMessage(result) {
        const lines = [];
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
        }
        else if (result.warnings.length > 0) {
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
        }
        else {
            lines.push('✅ Workflow validation passed');
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=WorkflowEnforcementEngine.js.map