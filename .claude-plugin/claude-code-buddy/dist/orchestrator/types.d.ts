export type TaskComplexity = 'simple' | 'medium' | 'complex';
export type ExecutionMode = 'sequential' | 'parallel';
export type AgentType = 'code-reviewer' | 'test-writer' | 'test-automator' | 'e2e-healing-agent' | 'debugger' | 'refactorer' | 'api-designer' | 'db-optimizer' | 'frontend-specialist' | 'backend-specialist' | 'frontend-developer' | 'backend-developer' | 'database-administrator' | 'development-butler' | 'rag-agent' | 'research-agent' | 'architecture-agent' | 'data-analyst' | 'performance-profiler' | 'performance-engineer' | 'knowledge-agent' | 'devops-engineer' | 'security-auditor' | 'technical-writer' | 'ui-designer' | 'migration-assistant' | 'api-integrator' | 'project-manager' | 'product-manager' | 'data-engineer' | 'ml-engineer' | 'marketing-strategist' | 'workflow-orchestrator' | 'opal-automation' | 'n8n-workflow' | 'general-agent';
export type TaskCapability = 'code-review' | 'code-generation' | 'testing' | 'e2e-testing' | 'auto-healing' | 'debugging' | 'refactoring' | 'api-design' | 'rag-search' | 'research' | 'architecture' | 'data-analysis' | 'knowledge-query' | 'documentation' | 'workflow-automation' | 'general';
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
    requiredAgents: AgentType[];
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