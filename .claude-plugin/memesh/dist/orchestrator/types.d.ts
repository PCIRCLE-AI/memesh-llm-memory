export type TaskComplexity = 'simple' | 'medium' | 'complex';
export type ExecutionMode = 'sequential' | 'parallel';
export type AgentType = 'code-reviewer' | 'test-writer' | 'test-automator' | 'e2e-healing-agent' | 'debugger' | 'refactorer' | 'api-designer' | 'db-optimizer' | 'frontend-specialist' | 'backend-specialist' | 'frontend-developer' | 'backend-developer' | 'database-administrator' | 'development-butler' | 'research-agent' | 'architecture-agent' | 'data-analyst' | 'performance-profiler' | 'performance-engineer' | 'knowledge-agent' | 'security-auditor' | 'technical-writer' | 'ui-designer' | 'migration-assistant' | 'api-integrator' | 'project-manager' | 'product-manager' | 'data-engineer' | 'ml-engineer' | 'marketing-strategist' | 'general-agent';
export type TaskCapability = 'code-review' | 'code-generation' | 'code-quality' | 'testing' | 'test-generation' | 'e2e-testing' | 'coverage' | 'auto-healing' | 'debugging' | 'root-cause-analysis' | 'refactoring' | 'design-patterns' | 'best-practices' | 'security' | 'security-audit' | 'vulnerability-assessment' | 'compliance' | 'api' | 'api-design' | 'api-docs' | 'api-integration' | 'rest' | 'graphql' | 'sdk' | 'third-party' | 'architecture' | 'performance' | 'profiling' | 'optimization' | 'scalability' | 'cache' | 'data-analysis' | 'database' | 'schema' | 'query' | 'query-tuning' | 'statistics' | 'business-intelligence' | 'research' | 'user-research' | 'knowledge-query' | 'knowledge-management' | 'information-retrieval' | 'feasibility-analysis' | 'evaluation' | 'frontend' | 'ui' | 'ui-design' | 'ux-design' | 'component' | 'browser-automation' | 'natural-language-ui' | 'backend' | 'server' | 'maintenance' | 'migration' | 'modernization' | 'upgrade' | 'technical-debt' | 'machine-learning' | 'ml-pipeline' | 'model-training' | 'documentation' | 'technical-writing' | 'workflow' | 'automation' | 'product-management' | 'prioritization' | 'marketing' | 'strategy' | 'growth' | 'general' | 'problem-solving';
export interface Task {
    id: string;
    description: string;
    priority?: number;
    requiredCapabilities?: TaskCapability[];
    metadata?: Record<string, unknown>;
}
export interface TaskAnalysis {
    taskId: string;
    taskType: string;
    complexity: TaskComplexity;
    estimatedTokens: number;
    estimatedCost: MicroDollars;
    requiredCapabilities: TaskCapability[];
    executionMode: ExecutionMode;
    reasoning: string;
}
export interface EnhancedPrompt {
    systemPrompt: string;
    userPrompt: string;
    suggestedModel?: string;
    metadata?: Record<string, any>;
}
export interface RoutingDecision {
    taskId: string;
    selectedAgent: AgentType;
    enhancedPrompt: EnhancedPrompt;
    reasoning: string;
    estimatedCost: MicroDollars;
    fallbackAgent?: AgentType;
    modelName?: string;
}
export interface SystemResources {
    availableMemoryMB: number;
    totalMemoryMB: number;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
}
import type { MicroDollars } from '../utils/money.js';
export interface CostRecord {
    timestamp: Date;
    taskId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    cost: MicroDollars;
}
export interface CostStats {
    totalCost: MicroDollars;
    taskCount: number;
    averageCostPerTask: MicroDollars;
    costByModel: Record<string, MicroDollars>;
    monthlySpend: MicroDollars;
    remainingBudget: MicroDollars;
}
//# sourceMappingURL=types.d.ts.map