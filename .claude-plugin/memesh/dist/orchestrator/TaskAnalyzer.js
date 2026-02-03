import { MODEL_COSTS, CLAUDE_MODELS } from '../config/models.js';
import { calculateTokenCost, addCosts } from '../utils/money.js';
import { ValidationError } from '../errors/index.js';
const COMPLEXITY_RULES = [
    {
        level: 'complex',
        indicators: [
            'analyze system',
            'architecture',
            'design database',
            'database schema',
            'refactor codebase',
            'implement algorithm',
            'optimize performance',
            'security audit',
            'multi-step',
            'comprehensive',
            'security considerations',
        ],
        priority: 1,
    },
    {
        level: 'medium',
        indicators: [
            'validation',
            'create function',
            'email',
            'user',
            'api',
            'endpoint',
            'component',
            'service',
            'authentication',
            'authorization',
        ],
        priority: 2,
    },
    {
        level: 'simple',
        indicators: [
            'format',
            'rename',
            'simple',
            'basic',
            'quick fix',
            'typo',
            'comment',
        ],
        wordCountLimit: 15,
        priority: 3,
    },
];
export class TaskAnalyzer {
    constructor() {
    }
    async analyze(task) {
        const complexity = this.determineComplexity(task);
        const estimatedTokens = this.estimateTokens(task, complexity);
        const requiredCapabilities = this.detectRequiredCapabilities(task, complexity);
        const executionMode = this.determineExecutionMode(task);
        const estimatedCost = this.calculateEstimatedCost(estimatedTokens, complexity);
        const reasoning = this.generateReasoning(task, complexity, estimatedTokens);
        return {
            taskId: task.id,
            taskType: task.description.substring(0, 50),
            complexity,
            estimatedTokens,
            estimatedCost,
            requiredCapabilities,
            executionMode,
            reasoning,
        };
    }
    determineComplexity(task) {
        const MAX_DESCRIPTION_LENGTH = 10000;
        if (!task.description || typeof task.description !== 'string') {
            throw new ValidationError('Task description must be a non-empty string', {
                component: 'TaskAnalyzer',
                method: 'determineComplexity',
                providedType: typeof task.description,
            });
        }
        if (task.description.length > MAX_DESCRIPTION_LENGTH) {
            throw new ValidationError(`Task description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`, {
                component: 'TaskAnalyzer',
                method: 'determineComplexity',
                providedLength: task.description.length,
                maxLength: MAX_DESCRIPTION_LENGTH,
            });
        }
        const description = task.description.toLowerCase();
        const wordCount = task.description.split(/\s+/).length;
        for (const rule of COMPLEXITY_RULES) {
            if (this.matchesRule(description, wordCount, rule)) {
                return rule.level;
            }
        }
        if (wordCount > 20) {
            return 'complex';
        }
        if (wordCount < 5) {
            return 'simple';
        }
        return 'medium';
    }
    matchesRule(description, wordCount, rule) {
        const hasIndicator = rule.indicators.some(indicator => description.includes(indicator));
        if (!hasIndicator) {
            return false;
        }
        if (rule.wordCountLimit !== undefined && wordCount >= rule.wordCountLimit) {
            return false;
        }
        return true;
    }
    estimateTokens(task, complexity) {
        const baseTokens = task.description.length * 0.3;
        const complexityMultiplier = {
            simple: 1.5,
            medium: 3.0,
            complex: 5.0,
        };
        return Math.ceil(baseTokens * complexityMultiplier[complexity]);
    }
    detectRequiredCapabilities(task, complexity) {
        const description = task.description.toLowerCase();
        const detectedCapabilities = [];
        const keywordToAgent = {
            'code-review': {
                keywords: ['review', 'code review', 'check code', 'audit', 'quality', 'best practices'],
            },
            'testing': {
                keywords: ['test', 'testing', 'unit test', 'integration test', 'e2e', 'tdd', 'coverage'],
            },
            'debugging': {
                keywords: ['debug', 'bug', 'fix', 'error', 'issue', 'troubleshoot', 'investigate'],
            },
            'refactoring': {
                keywords: ['refactor', 'improve', 'optimize', 'clean up', 'restructure', 'simplify'],
            },
            'api-design': {
                keywords: ['api', 'endpoint', 'rest', 'graphql', 'interface design'],
            },
            'research': {
                keywords: ['research', 'investigate', 'study', 'compare', 'survey'],
            },
            'architecture': {
                keywords: ['architecture', 'design system', 'structure', 'architecture pattern', 'system design'],
            },
            'data-analysis': {
                keywords: ['data analysis', 'statistics', 'metrics', 'analytics', 'visualization'],
            },
            'documentation': {
                keywords: ['document', 'documentation', 'readme', 'api docs', 'guide', 'tutorial'],
            },
        };
        for (const [capability, config] of Object.entries(keywordToAgent)) {
            if (!config)
                continue;
            const { keywords } = config;
            if (keywords.some(keyword => description.includes(keyword))) {
                detectedCapabilities.push(capability);
            }
        }
        if (detectedCapabilities.length === 0) {
            if (complexity === 'complex') {
                return ['architecture', 'general'];
            }
            return ['general'];
        }
        return detectedCapabilities;
    }
    determineExecutionMode(task) {
        const description = task.description.toLowerCase();
        const parallelIndicators = [
            'independent',
            'batch process',
            'multiple files',
            'parallel',
            'concurrent',
        ];
        const hasParallelIndicator = parallelIndicators.some(indicator => description.includes(indicator));
        return hasParallelIndicator ? 'parallel' : 'sequential';
    }
    calculateEstimatedCost(tokens, complexity) {
        const modelCosts = {
            simple: MODEL_COSTS[CLAUDE_MODELS.HAIKU],
            medium: MODEL_COSTS[CLAUDE_MODELS.SONNET],
            complex: MODEL_COSTS[CLAUDE_MODELS.OPUS],
        };
        const costs = modelCosts[complexity];
        const inputCost = calculateTokenCost(tokens, costs.input);
        const outputCost = calculateTokenCost(tokens, costs.output);
        return addCosts(inputCost, outputCost);
    }
    generateReasoning(task, complexity, estimatedTokens) {
        const reasons = [];
        reasons.push(`Task complexity: ${complexity}`);
        reasons.push(`Estimated tokens: ${estimatedTokens}`);
        if (complexity === 'complex') {
            reasons.push('Requires advanced reasoning capabilities (Claude Opus recommended)');
        }
        else if (complexity === 'simple') {
            reasons.push('Simple task suitable for Claude Haiku (cost-efficient)');
        }
        else {
            reasons.push('Standard task suitable for Claude Sonnet (balanced performance)');
        }
        const wordCount = task.description.split(/\s+/).length;
        if (wordCount > 100) {
            reasons.push(`Long description (${wordCount} words) indicates complex requirements`);
        }
        return reasons.join('. ');
    }
    async analyzeBatch(tasks) {
        const CONCURRENCY_LIMIT = 10;
        const results = [];
        for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
            const batch = tasks.slice(i, i + CONCURRENCY_LIMIT);
            const batchResults = await Promise.all(batch.map(task => this.analyze(task)));
            results.push(...batchResults);
        }
        return results;
    }
    suggestPriority(analysis) {
        const complexityPriority = {
            simple: 1,
            medium: 2,
            complex: 3,
        };
        return complexityPriority[analysis.complexity];
    }
}
//# sourceMappingURL=TaskAnalyzer.js.map