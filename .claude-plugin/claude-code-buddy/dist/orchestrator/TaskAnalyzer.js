import { MODEL_COSTS, CLAUDE_MODELS } from '../config/models.js';
import { calculateTokenCost, addCosts } from '../utils/money.js';
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
        const requiredAgents = this.detectRequiredCapabilities(task, complexity);
        const executionMode = this.determineExecutionMode(task);
        const estimatedCost = this.calculateEstimatedCost(estimatedTokens, complexity);
        const reasoning = this.generateReasoning(task, complexity, estimatedTokens);
        return {
            taskId: task.id,
            taskType: task.description.substring(0, 50),
            complexity,
            estimatedTokens,
            estimatedCost,
            requiredAgents,
            executionMode,
            reasoning,
        };
    }
    determineComplexity(task) {
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
        const detectedAgents = [];
        const keywordToAgent = {
            'code-review': {
                keywords: ['review', 'code review', 'check code', 'audit', 'quality', 'best practices'],
                agent: 'code-reviewer',
            },
            'testing': {
                keywords: ['test', 'testing', 'unit test', 'integration test', 'e2e', 'tdd', 'coverage'],
                agent: 'test-writer',
            },
            'debugging': {
                keywords: ['debug', 'bug', 'fix', 'error', 'issue', 'troubleshoot', 'investigate'],
                agent: 'debugger',
            },
            'refactoring': {
                keywords: ['refactor', 'improve', 'optimize', 'clean up', 'restructure', 'simplify'],
                agent: 'refactorer',
            },
            'api-design': {
                keywords: ['api', 'endpoint', 'rest', 'graphql', 'interface design'],
                agent: 'api-designer',
            },
            'rag-search': {
                keywords: ['search', 'retrieve', 'knowledge', 'vector', 'embedding', 'query'],
                agent: 'rag-agent',
            },
            'research': {
                keywords: ['research', 'investigate', 'study', 'analyze', 'compare', 'survey'],
                agent: 'research-agent',
            },
            'architecture': {
                keywords: ['architecture', 'design system', 'structure', 'architecture pattern', 'system design'],
                agent: 'architecture-agent',
            },
            'data-analysis': {
                keywords: ['data analysis', 'statistics', 'metrics', 'analytics', 'visualization'],
                agent: 'data-analyst',
            },
            'documentation': {
                keywords: ['document', 'documentation', 'readme', 'api docs', 'guide', 'tutorial'],
                agent: 'technical-writer',
            },
        };
        for (const [capability, { keywords, agent }] of Object.entries(keywordToAgent)) {
            if (keywords.some(keyword => description.includes(keyword))) {
                detectedAgents.push(agent);
            }
        }
        if (detectedAgents.length === 0) {
            if (complexity === 'complex') {
                return ['general-agent', 'architecture-agent'];
            }
            return ['general-agent'];
        }
        return detectedAgents;
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
        return Promise.all(tasks.map(task => this.analyze(task)));
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