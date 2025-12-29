/**
 * Agent Orchestrator 類型定義
 */

/**
 * 任務複雜度等級
 */
export type TaskComplexity = 'simple' | 'medium' | 'complex';

/**
 * 執行模式
 */
export type ExecutionMode = 'sequential' | 'parallel';

/**
 * Agent 類型 (專業化 Agents for MCP Server)
 */
export type AgentType =
  // Development Agents
  | 'code-reviewer'
  | 'test-writer'
  | 'debugger'
  | 'refactorer'
  | 'api-designer'
  | 'db-optimizer'
  | 'frontend-specialist'
  | 'backend-specialist'
  | 'development-butler'

  // Analysis Agents
  | 'rag-agent'
  | 'research-agent'
  | 'architecture-agent'
  | 'data-analyst'
  | 'performance-profiler'

  // Knowledge Agents
  | 'knowledge-agent'

  // Operations Agents
  | 'devops-engineer'
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
 * 任務能力需求 (用於 Agent 路由)
 */
export type TaskCapability =
  | 'code-review'
  | 'code-generation'
  | 'testing'
  | 'debugging'
  | 'refactoring'
  | 'api-design'
  | 'rag-search'
  | 'research'
  | 'architecture'
  | 'data-analysis'
  | 'knowledge-query'
  | 'documentation'
  | 'general';

/**
 * 任務定義
 */
export interface Task {
  id: string;
  description: string;
  priority?: number;
  requiredCapabilities?: TaskCapability[];
  metadata?: Record<string, unknown>;
}

/**
 * 任務分析結果
 */
export interface TaskAnalysis {
  taskId: string;
  taskType: string; // Short description of task type
  complexity: TaskComplexity;
  estimatedTokens: number;
  estimatedCost: number;
  requiredAgents: AgentType[];
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
 * Agent 路由決策 (支援 Prompt Enhancement Mode)
 */
export interface RoutingDecision {
  taskId: string;
  selectedAgent: AgentType;
  enhancedPrompt: EnhancedPrompt;
  reasoning: string;
  estimatedCost: number;
  fallbackAgent?: AgentType;

  // Legacy support (will be removed)
  modelName?: string;
}

/**
 * 系統資源狀態
 */
export interface SystemResources {
  availableMemoryMB: number;
  totalMemoryMB: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
}

/**
 * 成本追蹤
 */
export interface CostRecord {
  timestamp: Date;
  taskId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * 成本統計
 */
export interface CostStats {
  totalCost: number;
  taskCount: number;
  averageCostPerTask: number;
  costByModel: Record<string, number>;
  monthlySpend: number;
  remainingBudget: number;
}
