/**
 * Agent Type Definitions
 *
 * String literal union of all available agent types in the system.
 * Used for agent registration, routing, and prompt template mapping.
 */
export type AgentType =
  // Development Agents
  | 'code-reviewer'
  | 'test-writer'
  | 'test-automator'
  | 'e2e-healing-agent'
  | 'debugger'
  | 'refactorer'
  | 'api-designer'
  | 'db-optimizer'
  | 'frontend-specialist'
  | 'backend-specialist'
  | 'frontend-developer'
  | 'backend-developer'
  | 'database-administrator'
  | 'development-butler'
  // Analysis Agents
  | 'research-agent'
  | 'architecture-agent'
  | 'data-analyst'
  | 'performance-profiler'
  | 'performance-engineer'
  // Knowledge Agents
  | 'knowledge-agent'
  // Operations Agents
  | 'security-auditor'
  // Creative Agents
  | 'technical-writer'
  | 'ui-designer'
  // Utility Agents
  | 'migration-assistant'
  | 'api-integrator'
  // Business & Product Agents
  | 'project-manager'
  | 'product-manager'
  // Data & Analytics Agents
  | 'data-engineer'
  | 'ml-engineer'
  // Marketing Agents
  | 'marketing-strategist'
  // General Agent (fallback)
  | 'general-agent';

/**
 * AI Error Type Classification
 *
 * Categorizes AI mistakes for pattern learning and prevention.
 */
export enum AIErrorType {
  /** Violated established workflow or procedure */
  PROCEDURE_VIOLATION = 'procedure-violation',
  /** Skipped required workflow step */
  WORKFLOW_SKIP = 'workflow-skip',
  /** Made assumption without verification */
  ASSUMPTION_ERROR = 'assumption-error',
  /** Skipped validation/checking step */
  VALIDATION_SKIP = 'validation-skip',
  /** Lacked responsibility/ownership */
  RESPONSIBILITY_LACK = 'responsibility-lack',
  /** Reactive firefighting instead of proactive prevention */
  FIREFIGHTING = 'firefighting',
  /** Missing or incorrect dependency */
  DEPENDENCY_MISS = 'dependency-miss',
  /** Integration or coordination failure */
  INTEGRATION_ERROR = 'integration-error',
  /** Deployment or release error */
  DEPLOYMENT_ERROR = 'deployment-error',
}

/**
 * AI Mistake Record
 *
 * Represents a recorded AI mistake for pattern learning.
 */
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

/**
 * Agent Classification Enum
 *
 * Categorizes agents by their implementation type to support
 * the Prompt Enhancement System architecture.
 */
export enum AgentClassification {
  /**
   * Agents with full implementation (code, workflows, integrations)
   * Example: development-butler, test-writer, project-manager
   */
  REAL_IMPLEMENTATION = 'real-implementation',

  /**
   * Agents that enhance prompts with specialized knowledge and context
   * Example: architecture-agent, code-reviewer, security-auditor
   */
  ENHANCED_PROMPT = 'enhanced-prompt',

  /**
   * Agents that require external dependencies or services
   * Example: knowledge-agent (requires local database)
   */
  OPTIONAL_FEATURE = 'optional-feature',
}
