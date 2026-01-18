/**
 * Agent Orchestrator Type Definitions
 */

/**
 * Task Complexity Levels
 */
export type TaskComplexity = 'simple' | 'medium' | 'complex';

/**
 * Execution Modes
 */
export type ExecutionMode = 'sequential' | 'parallel';

/**
 * Agent Types (Specialized Agents for MCP Server)
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
 * Task Capability Requirements (for Agent Routing)
 */
export type TaskCapability =
  // Core development capabilities
  | 'code-review'
  | 'code-generation'
  | 'code-quality'
  | 'testing'
  | 'test-generation'
  | 'e2e-testing'
  | 'coverage'
  | 'auto-healing'
  | 'debugging'
  | 'root-cause-analysis'
  | 'refactoring'
  | 'design-patterns'
  | 'best-practices'
  // Security & compliance
  | 'security'
  | 'security-audit'
  | 'vulnerability-assessment'
  | 'compliance'
  // API & integration
  | 'api'
  | 'api-design'
  | 'api-docs'
  | 'api-integration'
  | 'rest'
  | 'graphql'
  | 'sdk'
  | 'third-party'
  // Architecture & performance
  | 'architecture'
  | 'performance'
  | 'profiling'
  | 'optimization'
  | 'scalability'
  | 'cache'
  // Data & analysis
  | 'data-analysis'
  | 'database'
  | 'schema'
  | 'query'
  | 'query-tuning'
  | 'statistics'
  | 'business-intelligence'
  // Research & knowledge
  | 'research'
  | 'user-research'
  | 'knowledge-query'
  | 'knowledge-management'
  | 'information-retrieval'
  | 'feasibility-analysis'
  | 'evaluation'
  // Frontend & UI/UX
  | 'frontend'
  | 'ui'
  | 'ui-design'
  | 'ux-design'
  | 'component'
  | 'browser-automation'
  | 'natural-language-ui'
  // Backend & infrastructure
  | 'backend'
  | 'server'
  | 'maintenance'
  | 'migration'
  | 'modernization'
  | 'upgrade'
  | 'technical-debt'
  // ML & AI
  | 'machine-learning'
  | 'ml-pipeline'
  | 'model-training'
  // Documentation & communication
  | 'documentation'
  | 'technical-writing'
  // Workflow & automation
  | 'workflow'
  | 'automation'
  // Product & business
  | 'product-management'
  | 'prioritization'
  | 'marketing'
  | 'strategy'
  | 'growth'
  // General
  | 'general'
  | 'problem-solving';

/**
 * Task Definition
 */
export interface Task {
  id: string;
  description: string;
  priority?: number;
  requiredCapabilities?: TaskCapability[];
  metadata?: Record<string, unknown>;
}

/**
 * Task Analysis Result
 */
export interface TaskAnalysis {
  taskId: string;
  taskType: string; // Short description of task type
  complexity: TaskComplexity;
  estimatedTokens: number;
  /** Estimated cost in micro-dollars (μUSD) - integer for precision */
  estimatedCost: MicroDollars;
  requiredCapabilities: TaskCapability[];
  executionMode: ExecutionMode;
  reasoning: string;
}

/**
 * Enhanced Prompt (Prompt Enhancement Mode)
 */
export interface EnhancedPrompt {
  systemPrompt: string;
  userPrompt: string;
  suggestedModel?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent Routing Decision (supports Prompt Enhancement Mode)
 */
export interface RoutingDecision {
  taskId: string;
  selectedAgent: AgentType;
  enhancedPrompt: EnhancedPrompt;
  reasoning: string;
  /** Estimated cost in micro-dollars (μUSD) - integer for precision */
  estimatedCost: MicroDollars;
  fallbackAgent?: AgentType;

  // Legacy support (will be removed)
  modelName?: string;
}

/**
 * System Resource Status
 */
export interface SystemResources {
  availableMemoryMB: number;
  totalMemoryMB: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
}

import type { MicroDollars } from '../utils/money.js';

/**
 * Cost Tracking
 */
export interface CostRecord {
  timestamp: Date;
  taskId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  /** Cost in micro-dollars (μUSD) - integer for precision */
  cost: MicroDollars;
}

/**
 * Cost Statistics
 */
export interface CostStats {
  /** Total cost in micro-dollars (μUSD) - integer for precision */
  totalCost: MicroDollars;
  taskCount: number;
  /** Average cost per task in micro-dollars (μUSD) - integer for precision */
  averageCostPerTask: MicroDollars;
  /** Cost by model in micro-dollars (μUSD) - integer for precision */
  costByModel: Record<string, MicroDollars>;
  /** Monthly spend in micro-dollars (μUSD) - integer for precision */
  monthlySpend: MicroDollars;
  /** Remaining budget in micro-dollars (μUSD) - integer for precision */
  remainingBudget: MicroDollars;
}
