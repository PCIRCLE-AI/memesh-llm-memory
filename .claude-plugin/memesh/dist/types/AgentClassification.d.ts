export type AgentType = 'code-reviewer' | 'test-writer' | 'test-automator' | 'e2e-healing-agent' | 'debugger' | 'refactorer' | 'api-designer' | 'db-optimizer' | 'frontend-specialist' | 'backend-specialist' | 'frontend-developer' | 'backend-developer' | 'database-administrator' | 'development-butler' | 'research-agent' | 'architecture-agent' | 'data-analyst' | 'performance-profiler' | 'performance-engineer' | 'knowledge-agent' | 'security-auditor' | 'technical-writer' | 'ui-designer' | 'migration-assistant' | 'api-integrator' | 'project-manager' | 'product-manager' | 'data-engineer' | 'ml-engineer' | 'marketing-strategist' | 'general-agent';
export declare enum AIErrorType {
    PROCEDURE_VIOLATION = "procedure-violation",
    WORKFLOW_SKIP = "workflow-skip",
    ASSUMPTION_ERROR = "assumption-error",
    VALIDATION_SKIP = "validation-skip",
    RESPONSIBILITY_LACK = "responsibility-lack",
    FIREFIGHTING = "firefighting",
    DEPENDENCY_MISS = "dependency-miss",
    INTEGRATION_ERROR = "integration-error",
    DEPLOYMENT_ERROR = "deployment-error"
}
export interface AIMistake {
    id: string;
    timestamp: Date;
    action: string;
    errorType: AIErrorType;
    userCorrection: string;
    correctMethod: string;
    impact: string;
    preventionMethod: string;
    relatedRule?: string;
    context?: Record<string, unknown>;
}
export declare enum AgentClassification {
    REAL_IMPLEMENTATION = "real-implementation",
    ENHANCED_PROMPT = "enhanced-prompt",
    OPTIONAL_FEATURE = "optional-feature"
}
//# sourceMappingURL=AgentClassification.d.ts.map