import { promises as fs } from 'fs';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';
export class ClaudeMdRuleExtractor {
    rules = [];
    claudeMdPath;
    constructor(claudeMdPath) {
        this.claudeMdPath = claudeMdPath || this.resolveClaudeMdPath();
    }
    resolveClaudeMdPath() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
        return resolve(homeDir, '.claude', 'CLAUDE.md');
    }
    async loadRulesFromClaudeMd() {
        try {
            const content = await fs.readFile(this.claudeMdPath, 'utf-8');
            this.extractRules(content);
            logger.info('[ClaudeMdRuleExtractor] Loaded rules from CLAUDE.md', {
                rulesCount: this.rules.length,
                path: this.claudeMdPath,
            });
        }
        catch (error) {
            logger.warn('[ClaudeMdRuleExtractor] Failed to load CLAUDE.md', {
                path: this.claudeMdPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            this.rules = [];
        }
    }
    extractRules(content) {
        const patterns = this.getRulePatterns();
        const extractedRules = [];
        for (const pattern of patterns) {
            const found = pattern.keywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()));
            if (found) {
                const conditions = pattern.conditionGenerator(content);
                if (conditions.length > 0) {
                    const rule = {
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
    getRulePatterns() {
        return [
            {
                keywords: ['test-driven development', 'tdd', '先寫測試', 'write tests first'],
                phase: 'code-written',
                ruleTemplate: {
                    name: 'Test-Driven Development',
                    phase: 'code-written',
                    severity: 'critical',
                },
                conditionGenerator: (content) => {
                    if (content.includes('先寫測試') || content.includes('test-driven development')) {
                        return [
                            {
                                description: 'Tests must exist before writing code (TDD)',
                                check: (ctx) => {
                                    return (ctx.filesChanged?.some((f) => ['.test.', '.spec.', '/tests/'].some((p) => f.includes(p))) ?? false);
                                },
                                failureMessage: 'TDD violated: Write tests before implementation code',
                                requiredAction: 'Write tests first, then implement',
                            },
                        ];
                    }
                    return [];
                },
            },
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
                    severity: 'medium',
                },
                conditionGenerator: (content) => {
                    if (content.includes('code review') || content.includes('代碼審查')) {
                        return [
                            {
                                description: 'Code review is mandatory before commit',
                                check: (ctx) => {
                                    return (ctx.recentTools?.some((tool) => tool.includes('code-reviewer')) ?? false);
                                },
                                failureMessage: 'Cannot commit without code review (CLAUDE.md requirement)',
                                requiredAction: 'Run code-reviewer agent',
                            },
                        ];
                    }
                    return [];
                },
            },
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
                    severity: 'medium',
                },
                conditionGenerator: (content) => {
                    if (content.includes('fix all issues') ||
                        content.includes('修復所有') ||
                        content.includes('Fix All Issues')) {
                        return [
                            {
                                description: 'All code review issues must be fixed',
                                check: async (ctx) => {
                                    return ctx.testsPassing === true;
                                },
                                failureMessage: 'Cannot proceed with unresolved issues (CLAUDE.md: Fix All Issues)',
                                requiredAction: 'Fix all Critical and Major issues from code review',
                            },
                        ];
                    }
                    return [];
                },
            },
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
                                    if (!ctx.stagedFiles || ctx.stagedFiles.length === 0) {
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
                                    for (const file of ctx.stagedFiles) {
                                        if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
                                            continue;
                                        }
                                        try {
                                            const content = await fs.readFile(file, 'utf-8');
                                            for (const pattern of workaroundPatterns) {
                                                if (pattern.test(content)) {
                                                    return false;
                                                }
                                            }
                                        }
                                        catch (error) {
                                            logger.warn(`Could not read file ${file} for workaround check`, {
                                                file,
                                                error: error instanceof Error ? error.message : String(error),
                                            });
                                        }
                                    }
                                    return true;
                                },
                                failureMessage: 'Cannot commit with workarounds (CLAUDE.md: No Workarounds)',
                                requiredAction: 'Remove all TODO, FIXME, HACK comments and implement properly',
                            },
                        ];
                    }
                    return [];
                },
            },
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
                                    return (ctx.recentTools?.some((tool) => tool.includes('code-reviewer')) ?? false);
                                },
                                failureMessage: 'Code should be reviewed thoroughly (multiple iterations)',
                                requiredAction: 'Run code-reviewer again if issues were found and fixed',
                            },
                        ];
                    }
                    return [];
                },
            },
        ];
    }
    getRules() {
        return [...this.rules];
    }
    getRulesForPhase(phase) {
        return this.rules.filter((r) => r.phase === phase);
    }
    clearRules() {
        this.rules = [];
    }
    async reloadRules() {
        this.clearRules();
        await this.loadRulesFromClaudeMd();
    }
}
//# sourceMappingURL=ClaudeMdRuleExtractor.js.map