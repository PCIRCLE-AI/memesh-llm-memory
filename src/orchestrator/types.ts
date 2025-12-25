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
 * Agent 類型
 */
export type AgentType = 'claude-sonnet' | 'claude-opus' | 'claude-haiku' | 'openai-gpt4';

/**
 * 任務定義
 */
export interface Task {
  id: string;
  description: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 任務分析結果
 */
export interface TaskAnalysis {
  taskId: string;
  complexity: TaskComplexity;
  estimatedTokens: number;
  estimatedCost: number;
  requiredAgents: AgentType[];
  executionMode: ExecutionMode;
  reasoning: string;
}

/**
 * Agent 路由決策
 */
export interface RoutingDecision {
  taskId: string;
  selectedAgent: AgentType;
  modelName: string;
  reasoning: string;
  estimatedCost: number;
  fallbackAgent?: AgentType;
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
