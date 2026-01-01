# Component Reference Guide

**Claude Code Buddy (CCB) - Detailed Component Documentation**

**Version**: 2.0.0
**Last Updated**: 2026-01-01

---

## Table of Contents

1. [Core Components](#core-components)
2. [MCP Layer](#mcp-layer)
3. [Orchestration Layer](#orchestration-layer)
4. [Evolution System](#evolution-system)
5. [Agent Layer](#agent-layer)
6. [Storage Layer](#storage-layer)
7. [Utility Components](#utility-components)

---

## Core Components

### Orchestrator

**File**: `src/orchestrator/index.ts`

**Responsibility**: Main task execution coordinator that orchestrates all system components

**Public API**:

```typescript
class Orchestrator {
  /**
   * Execute a single task with full orchestration pipeline
   * @param task - Task to execute
   * @returns Task result with analysis, routing, cost, and execution time
   */
  async executeTask(task: Task): Promise<{
    task: Task;
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    response: string;
    cost: number;
    executionTimeMs: number;
  }>

  /**
   * Execute multiple tasks in batch mode
   * @param tasks - Array of tasks to execute
   * @param mode - Execution mode: 'sequential' or 'parallel'
   * @param options - Additional options (maxConcurrent, forceSequential)
   * @returns Batch results with total cost and time
   */
  async executeBatch(
    tasks: Task[],
    mode: 'sequential' | 'parallel',
    options?: {
      maxConcurrent?: number;
      forceSequential?: boolean;
    }
  ): Promise<{
    results: TaskResult[];
    totalCost: number;
    totalTimeMs: number;
  }>

  /**
   * Analyze task without executing
   * @param task - Task to analyze
   * @returns Analysis and routing decision
   */
  async analyzeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
  }>

  /**
   * Get current system status
   * @returns System resources, cost stats, and recommendations
   */
  async getSystemStatus(): Promise<{
    resources: ResourceStatus;
    costStats: CostStatistics;
    recommendation: string;
  }>

  /**
   * Execute task with execution mode choice
   * @param task - Task to execute
   * @param config - Execution configuration (foreground/background/auto)
   * @returns Task ID for background mode, result for foreground mode
   */
  async executeTaskWithMode(
    task: Task,
    config: ExecutionConfig
  ): Promise<{ taskId?: string; result?: TaskResult }>

  /**
   * Get background task progress
   * @param taskId - Task ID
   * @returns Current progress (0.0 to 1.0)
   */
  async getBackgroundTaskProgress(taskId: string): Promise<Progress>

  /**
   * Get knowledge graph statistics
   * @returns Stats about entities, observations, relations
   */
  async getKnowledgeStats(): Promise<KnowledgeStats>

  /**
   * Get decision history from knowledge graph
   * @returns All recorded architectural/design decisions
   */
  async getDecisionHistory(): Promise<Decision[]>

  /**
   * Get lessons learned from past executions
   * @returns All recorded lessons learned
   */
  async getLessonsLearned(): Promise<LessonLearned[]>

  /**
   * Cleanup resources
   */
  close(): void
}
```

**Usage Example**:

```typescript
import { Orchestrator } from './orchestrator/index.js';

// Initialize orchestrator
const orchestrator = new Orchestrator();

// Execute single task
const result = await orchestrator.executeTask({
  id: 'task-1',
  description: 'Review this code for security vulnerabilities',
});

console.log(result.routing.selectedAgent); // 'code-reviewer'
console.log(result.cost); // $0.075
console.log(result.executionTimeMs); // 1250

// Execute batch tasks in parallel
const batchResult = await orchestrator.executeBatch(
  [task1, task2, task3],
  'parallel',
  { maxConcurrent: 2 }
);

// Get system status
const status = await orchestrator.getSystemStatus();
console.log(status.recommendation); // "System healthy. 40% of monthly budget remaining."

// Cleanup
orchestrator.close();
```

**Dependencies**:
- Router (orchestration logic)
- KnowledgeAgent (project memory)
- BackgroundExecutor (async task execution)
- ResourceMonitor (system resource tracking)

**Resource Management**:
- E2E tests automatically serialized (prevents system freeze)
- Parallel execution limited by system resources
- Background task support for long-running operations

---

### Router

**File**: `src/orchestrator/router.ts`

**Responsibility**: Unified routing coordinator that integrates task analysis, agent selection, cost tracking, and evolution

**Public API**:

```typescript
class Router {
  /**
   * Route task through complete pipeline
   * @param task - Task to route
   * @returns Routing result with analysis, decision, and approval status
   */
  async routeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    approved: boolean;
    message: string;
  }>

  /**
   * Get human-readable cost report
   * @returns Formatted cost breakdown by agent and model
   */
  getCostReport(): string

  /**
   * Get detailed system status
   * @returns Resources, cost stats, and health recommendation
   */
  async getSystemStatus(): Promise<{
    resources: ResourceStatus;
    costStats: CostStatistics;
    recommendation: string;
  }>

  /**
   * Record actual task cost after execution
   * @param taskId - Task ID
   * @param model - Model used
   * @param inputTokens - Input tokens consumed
   * @param outputTokens - Output tokens generated
   * @returns Actual cost in dollars
   */
  recordTaskCost(
    taskId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number

  /**
   * Get evolution system components (advanced usage)
   */
  getPerformanceTracker(): PerformanceTracker
  getLearningManager(): LearningManager
  getAdaptationEngine(): AdaptationEngine
  getCostTracker(): CostTracker
}
```

**Internal Components**:
- **TaskAnalyzer**: Analyzes task complexity and requirements
- **AgentRouter**: Selects best agent for task
- **CostTracker**: Estimates and tracks costs
- **PerformanceTracker**: Records execution metrics
- **LearningManager**: Analyzes patterns and learns
- **AdaptationEngine**: Applies learned optimizations

**Workflow**:

```
Task Input
  ↓
TaskAnalyzer.analyzeTask()
  → complexity, taskType, estimatedTokens, requiredAgents
  ↓
AgentRouter.route(analysis)
  → selectedAgent, confidence, enhancedPrompt, estimatedCost
  ↓
AdaptationEngine.adaptExecution()
  → Apply learned optimizations (prompt, model, timeout)
  ↓
CostTracker.estimateCost()
  → Verify within budget
  ↓
Return RoutingResult
```

**Usage Example**:

```typescript
import { Router } from './orchestrator/router.js';

const router = new Router();

// Route task
const result = await router.routeTask({
  id: 'task-1',
  description: 'Optimize this database query',
});

if (result.approved) {
  console.log(`Routing to: ${result.routing.selectedAgent}`);
  console.log(`Enhanced prompt: ${result.routing.enhancedPrompt}`);
  console.log(`Estimated cost: $${result.routing.estimatedCost}`);
} else {
  console.error(`Task blocked: ${result.message}`);
}

// Get cost report
console.log(router.getCostReport());
// Output:
// Cost Report:
// - code-reviewer: $1.25 (34 tasks)
// - debugger: $0.89 (12 tasks)
// Total: $2.14
```

---

### Agent Registry

**File**: `src/core/AgentRegistry.ts`

**Responsibility**: Centralized metadata registry for all 22 agents

**Public API**:

```typescript
class AgentRegistry {
  /**
   * Get agent metadata by name
   * @param name - Agent type identifier
   * @returns Agent metadata or undefined
   * @throws ValidationError if name is invalid
   */
  getAgent(name: AgentType): AgentMetadata | undefined

  /**
   * Get all agents in a category
   * @param category - Category name (development, analysis, operations, etc.)
   * @returns Array of agents in category
   * @throws ValidationError if category is invalid
   */
  getAgentsByCategory(category: string): AgentMetadata[]

  /**
   * Check if agent exists
   * @param name - Agent type identifier
   * @returns True if agent is registered
   */
  hasAgent(name: AgentType): boolean

  /**
   * Get all registered agents
   * @returns Array of all agent metadata
   */
  getAllAgents(): AgentMetadata[]

  /**
   * Get all agent names
   * @returns Array of agent type identifiers
   */
  getAllAgentTypes(): AgentType[]

  /**
   * Get total agent count
   * @returns Number of registered agents
   */
  getAgentCount(): number

  /**
   * Get agents with real implementations
   * @returns Agents with actual MCP tool integration
   */
  getRealImplementations(): AgentMetadata[]

  /**
   * Get agents using enhanced prompts
   * @returns Agents that use specialized prompts
   */
  getEnhancedPrompts(): AgentMetadata[]

  /**
   * Get optional agents
   * @returns Agents requiring external dependencies
   */
  getOptionalAgents(): AgentMetadata[]
}
```

**Agent Metadata Structure**:

```typescript
interface AgentMetadata {
  name: AgentType;                      // Unique identifier
  description: string;                   // Human-readable description
  category: string;                      // development, analysis, operations, etc.
  classification: AgentClassification;   // real-implementation, enhanced-prompt, optional-feature
  capabilities?: string[];               // Skill tags for routing
  mcpTools?: string[];                   // Required MCP tools (for real implementations)
  requiredDependencies?: string[];       // External deps (for optional agents)
}
```

**Agent Categories**:
- **development**: Frontend, backend, testing, code review, debugging (9 agents)
- **analysis**: Architecture, research, data analysis (3 agents)
- **operations**: DevOps, security, infrastructure (2 agents)
- **management**: Project management, product management (2 agents)
- **creative**: UI/UX design (1 agent)
- **business**: Marketing strategy (1 agent)
- **engineering**: ML engineering, data engineering (2 agents)
- **knowledge**: RAG, Knowledge Graph (2 agents)

**Usage Example**:

```typescript
import { AgentRegistry } from './core/AgentRegistry.js';

const registry = new AgentRegistry();

// Get specific agent
const codeReviewer = registry.getAgent('code-reviewer');
console.log(codeReviewer?.description);
// "Expert code review, security analysis, and best practices validation"

console.log(codeReviewer?.capabilities);
// ['code-review', 'best-practices']

// Get all development agents
const devAgents = registry.getAgentsByCategory('development');
console.log(`Found ${devAgents.length} development agents`);

// Get agents by classification
const realAgents = registry.getRealImplementations();
const promptAgents = registry.getEnhancedPrompts();
console.log(`Real: ${realAgents.length}, Enhanced: ${promptAgents.length}`);

// Check agent availability
if (registry.hasAgent('rag-agent')) {
  const ragAgent = registry.getAgent('rag-agent');
  console.log(`RAG dependencies: ${ragAgent?.requiredDependencies}`);
  // ['chromadb', 'openai']
}
```

---

### Task Analyzer

**File**: `src/orchestrator/TaskAnalyzer.ts`

**Responsibility**: Analyze task complexity, type, and requirements

**Public API**:

```typescript
class TaskAnalyzer {
  /**
   * Analyze task to determine complexity and requirements
   * @param task - Task to analyze
   * @returns Detailed task analysis
   */
  async analyzeTask(task: Task): Promise<TaskAnalysis>
}

interface TaskAnalysis {
  taskId: string;
  taskType: string;                    // 'code-review', 'research', 'debugging', etc.
  complexity: TaskComplexity;          // 'simple' | 'medium' | 'complex'
  estimatedTokens: number;             // Estimated token usage
  estimatedCost: number;               // Estimated cost in dollars
  requiredAgents: AgentType[];         // List of suitable agents
  executionMode: ExecutionMode;        // 'sync' | 'async' | 'parallel'
  reasoning: string;                   // Explanation of analysis
}
```

**Complexity Determination**:

**Simple** (complexity ≤ 3):
- Single, well-defined task
- Standard workflow
- Minimal dependencies
- Examples: "Format this JSON", "Fix this typo"

**Medium** (complexity 4-6):
- Multi-step analysis required
- Some domain expertise needed
- Multiple capabilities involved
- Examples: "Review this PR", "Debug this error"

**Complex** (complexity ≥ 7):
- Architecture decisions required
- Multi-domain collaboration
- Creative problem solving
- Examples: "Design microservices architecture", "Optimize entire system"

**Task Type Detection**:

Detected from task description keywords:

| Keywords | Task Type | Suggested Agents |
|----------|-----------|------------------|
| review, audit, analyze code | code-review | code-reviewer, security-auditor |
| debug, error, bug, crash | debugging | debugger, backend-developer |
| design, architecture, system | architecture | architecture-agent, api-designer |
| test, coverage, TDD | testing | test-writer, test-automator |
| optimize, performance, slow | optimization | performance-engineer, db-optimizer |
| frontend, UI, React, Vue | frontend | frontend-developer, ui-designer |
| backend, API, server | backend | backend-developer, api-designer |
| research, investigate, feasibility | research | research-agent, architecture-agent |

**Usage Example**:

```typescript
import { TaskAnalyzer } from './orchestrator/TaskAnalyzer.js';

const analyzer = new TaskAnalyzer();

// Analyze simple task
const analysis1 = await analyzer.analyzeTask({
  id: 'task-1',
  description: 'Format this JSON string',
});
console.log(analysis1.complexity); // 'simple'
console.log(analysis1.estimatedTokens); // ~500

// Analyze complex task
const analysis2 = await analyzer.analyzeTask({
  id: 'task-2',
  description: 'Design a scalable microservices architecture for e-commerce platform with real-time inventory, payment processing, and recommendation engine',
});
console.log(analysis2.complexity); // 'complex'
console.log(analysis2.taskType); // 'architecture'
console.log(analysis2.requiredAgents); // ['architecture-agent', 'backend-developer', 'api-designer']
console.log(analysis2.estimatedTokens); // ~15000
console.log(analysis2.reasoning);
// "Complex architectural design involving multiple domains (backend, API, data), requires high-level planning and trade-off analysis"
```

---

### Cost Tracker

**File**: `src/orchestrator/CostTracker.ts`

**Responsibility**: Estimate, track, and manage API costs

**Public API**:

```typescript
class CostTracker {
  /**
   * Estimate cost for agent and token count
   * @param agent - Agent type
   * @param estimatedTokens - Token count
   * @returns Estimated cost in dollars
   */
  estimateCost(agent: AgentType, estimatedTokens: number): number

  /**
   * Record actual task cost
   * @param taskId - Task ID
   * @param model - Model used
   * @param inputTokens - Input tokens
   * @param outputTokens - Output tokens
   * @returns Actual cost in dollars
   */
  recordCost(
    taskId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number

  /**
   * Get cost statistics
   * @returns Cost stats including total spend and budget remaining
   */
  getStats(): {
    totalSpend: number;
    monthlySpend: number;
    remainingBudget: number;
    taskCount: number;
    averageCostPerTask: number;
  }

  /**
   * Check if task is within budget
   * @param estimatedCost - Estimated cost
   * @returns True if within budget
   */
  isWithinBudget(estimatedCost: number): boolean

  /**
   * Get formatted cost report
   * @returns Human-readable cost breakdown
   */
  getReport(): string

  /**
   * Export cost data as CSV
   * @returns CSV string with all cost records
   */
  exportData(): string
}
```

**Pricing Model** (as of 2026-01-01):

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Opus 4.5 | $15.00 | $75.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Haiku 4.0 | $0.80 | $4.00 |

**Usage Example**:

```typescript
import { CostTracker } from './orchestrator/CostTracker.js';

const tracker = new CostTracker();

// Estimate cost before execution
const estimatedCost = tracker.estimateCost('code-reviewer', 5000);
console.log(`Estimated: $${estimatedCost.toFixed(6)}`); // $0.075

// Check budget
if (!tracker.isWithinBudget(estimatedCost)) {
  console.error('Budget exceeded!');
}

// Record actual cost after execution
const actualCost = tracker.recordCost(
  'task-1',
  'claude-sonnet-4-5-20250929',
  4500,  // input tokens
  1500   // output tokens
);
console.log(`Actual: $${actualCost.toFixed(6)}`); // $0.0360

// Get statistics
const stats = tracker.getStats();
console.log(`Total spend: $${stats.totalSpend.toFixed(2)}`);
console.log(`Remaining budget: $${stats.remainingBudget.toFixed(2)}`);
console.log(`Average per task: $${stats.averageCostPerTask.toFixed(4)}`);

// Get detailed report
console.log(tracker.getReport());
// Output:
// Cost Report:
// ============
// Total Tasks: 42
// Total Spend: $3.45
// Monthly Budget: $50.00
// Remaining: $46.55 (93%)
//
// By Agent:
// - code-reviewer: $1.20 (15 tasks)
// - debugger: $0.85 (8 tasks)
// ...
```

---

## MCP Layer

### Tool Router

**File**: `src/mcp/ToolRouter.ts`

**Responsibility**: Route MCP tool calls to appropriate handlers

**Public API**:

```typescript
class ToolRouter {
  /**
   * Route MCP tool call to handler
   * @param params - MCP tool call parameters
   * @returns Tool execution result
   * @throws ValidationError if params invalid
   * @throws OperationError if rate limit exceeded
   */
  async routeToolCall(params: unknown): Promise<CallToolResult>
}
```

**Supported Tools**:

**Smart Agents**:
- `sa_task`: Route task to best agent
- `sa_dashboard`: Evolution dashboard
- `sa_agents`: List available agents
- `sa_skills`: List skills
- `sa_uninstall`: Uninstall CCB

**Buddy Commands**:
- `buddy_do`: Natural language task execution
- `buddy_stats`: Show statistics
- `buddy_remember`: Project memory recall
- `buddy_help`: Help information

**Workflow Guidance**:
- `get-workflow-guidance`: Get next step suggestions
- `get-session-health`: Session health check
- `reload-context`: Reload CLAUDE.md context
- `record-token-usage`: Track token usage

**Planning**:
- `generate-smart-plan`: Generate implementation plans

**Git Assistant**:
- `git-save-work`: Save changes with friendly commit
- `git-list-versions`: List recent commits
- `git-status`: Repository status
- `git-show-changes`: Show uncommitted changes
- `git-go-back`: Revert to previous version
- `git-create-backup`: Create local backup
- `git-setup`: Initialize repository
- `git-help`: Git command help

**Memory**:
- `recall-memory`: Recall project memories

**Database Backup**:
- `create_database_backup`: Create backup
- `list_database_backups`: List backups
- `restore_database_backup`: Restore from backup
- `clean_database_backups`: Clean old backups
- `get_backup_stats`: Backup statistics

**Individual Agents** (22 tools):
- One tool per agent (e.g., `code-reviewer`, `rag-agent`, `test-writer`)

**Features**:
- Input validation with Zod schemas
- Rate limiting (30 requests/minute)
- Error handling and formatting
- Logging with context

**Usage Example**:

```typescript
import { ToolRouter } from './mcp/ToolRouter.ts';

const router = new ToolRouter(config);

// Route tool call
const result = await router.routeToolCall({
  name: 'sa_task',
  arguments: {
    taskDescription: 'Review this code for security issues',
  },
});

console.log(result.content[0].text);
// Enhanced prompt with code review expertise
```

---

### Server Initializer

**File**: `src/mcp/ServerInitializer.ts`

**Responsibility**: Bootstrap all server components in correct order

**Public API**:

```typescript
class ServerInitializer {
  /**
   * Initialize all server components
   * @returns Initialized components ready for use
   */
  static initialize(): ServerComponents
}

interface ServerComponents {
  // Core components
  router: Router;
  formatter: ResponseFormatter;
  agentRegistry: AgentRegistry;
  ui: HumanInLoopUI;

  // Evolution system
  feedbackCollector: FeedbackCollector;
  performanceTracker: PerformanceTracker;
  learningManager: LearningManager;
  evolutionMonitor: EvolutionMonitor;

  // Management
  skillManager: SkillManager;
  uninstallManager: UninstallManager;

  // DevelopmentButler
  developmentButler: DevelopmentButler;
  checkpointDetector: CheckpointDetector;
  toolInterface: MCPToolInterface;

  // Planning & Git
  planningEngine: PlanningEngine;
  gitAssistant: GitAssistantIntegration;

  // Memory & Knowledge
  knowledgeGraph: KnowledgeGraph;
  projectMemoryManager: ProjectMemoryManager;

  // Rate limiting
  rateLimiter: RateLimiter;

  // Handler modules
  gitHandlers: GitHandlers;
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
}
```

**Initialization Order**:
1. Core components (Router, AgentRegistry, ResponseFormatter)
2. Evolution system (PerformanceTracker, LearningManager, EvolutionMonitor)
3. Management (SkillManager, UninstallManager)
4. Development Butler (CheckpointDetector, ToolInterface, DevelopmentButler)
5. Planning & Git (PlanningEngine, GitAssistant)
6. Memory & Knowledge (KnowledgeGraph, ProjectMemoryManager)
7. Rate Limiter
8. Handlers (GitHandlers, ToolHandlers, BuddyHandlers)

**Usage Example**:

```typescript
import { ServerInitializer } from './mcp/ServerInitializer.js';

// Initialize all components
const components = ServerInitializer.initialize();

// Components are ready to use
console.log(`Agent Registry: ${components.agentRegistry.getAgentCount()} agents`);
console.log(`Rate Limit: ${components.rateLimiter.getStatus()}`);

// Access specific components
const router = components.router;
const evolutionMonitor = components.evolutionMonitor;
```

---

## Evolution System

### Performance Tracker

**File**: `src/evolution/PerformanceTracker.ts`

**Responsibility**: Record and analyze execution metrics

**Public API**:

```typescript
class PerformanceTracker {
  /**
   * Track execution metrics
   * @param metrics - Execution metrics
   */
  track(metrics: ExecutionMetrics): void

  /**
   * Get evolution statistics for agent
   * @param agentId - Agent identifier
   * @returns Evolution stats including success rate, trends, patterns
   */
  getEvolutionStats(agentId: string): EvolutionStats | null

  /**
   * Get all agents with evolution data
   * @returns Array of agent IDs
   */
  getAgentsWithData(): string[]

  /**
   * Clear all performance data
   */
  clear(): void
}

interface ExecutionMetrics {
  agentId: string;
  taskType: string;
  success: boolean;
  duration: number;          // milliseconds
  cost: number;              // dollars
  quality: number;           // 0.0 to 1.0
  timestamp?: number;        // Unix timestamp
  metadata?: Record<string, unknown>;
}

interface EvolutionStats {
  agentId: string;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  averageCost: number;
  averageQuality: number;
  trend: {
    successRate: 'improving' | 'declining' | 'stable';
    duration: 'improving' | 'declining' | 'stable';
    cost: 'improving' | 'declining' | 'stable';
  };
  patterns: Pattern[];
}
```

**Usage Example**:

```typescript
import { PerformanceTracker } from './evolution/PerformanceTracker.js';

const tracker = new PerformanceTracker();

// Track execution
tracker.track({
  agentId: 'code-reviewer',
  taskType: 'security-audit',
  success: true,
  duration: 1250,
  cost: 0.075,
  quality: 0.92,
});

// Get evolution stats
const stats = tracker.getEvolutionStats('code-reviewer');
console.log(`Success rate: ${stats.successRate}`); // 0.89
console.log(`Average duration: ${stats.averageDuration}ms`); // 1180
console.log(`Trend: ${stats.trend.successRate}`); // 'improving'
console.log(`Patterns: ${stats.patterns.length}`); // 12

// Get all agents with data
const agents = tracker.getAgentsWithData();
console.log(`Tracking ${agents.length} agents`);
```

---

### Learning Manager

**File**: `src/evolution/LearningManager.ts`

**Responsibility**: Extract patterns from execution data and generate recommendations

**Public API**:

```typescript
class LearningManager {
  /**
   * Analyze patterns for agent and task type
   * @param agentId - Agent identifier
   * @param taskType - Optional task type filter
   * @returns Learned patterns
   */
  async analyzePatterns(
    agentId: string,
    taskType?: string
  ): Promise<Pattern[]>

  /**
   * Get optimization recommendations
   * @param agentId - Agent identifier
   * @param taskType - Task type
   * @returns Recommended adaptations
   */
  async getRecommendations(
    agentId: string,
    taskType: string
  ): Promise<Pattern[]>

  /**
   * Get all learned patterns for agent
   * @param agentId - Agent identifier
   * @returns All patterns
   */
  getPatterns(agentId: string): Pattern[]

  /**
   * Check if agent has sufficient data for learning
   * @param agentId - Agent identifier
   * @param taskType - Task type
   * @returns True if ready to learn
   */
  hasEnoughData(agentId: string, taskType: string): boolean
}

interface Pattern {
  type: 'success' | 'anti-pattern' | 'optimization';
  confidence: number;        // 0.0 to 1.0
  description: string;
  action: {
    type: string;           // 'promptOptimization', 'modelSelection', etc.
    parameters: Record<string, unknown>;
  };
  impact: {
    successRate?: number;
    costReduction?: number;
    speedup?: number;
  };
}
```

**Pattern Types**:

**Success Patterns**:
- High quality with cost efficiency
- Consistent performance
- User feedback positive

**Anti-Patterns**:
- Frequent timeouts
- Low quality results
- Cost overruns

**Optimization Opportunities**:
- Model downgrade possible (maintaining quality)
- Prompt simplification (reducing tokens)
- Timeout adjustment (based on P95 duration)

**Usage Example**:

```typescript
import { LearningManager } from './evolution/LearningManager.js';

const learner = new LearningManager(performanceTracker);

// Analyze patterns
const patterns = await learner.analyzePatterns(
  'code-reviewer',
  'security-audit'
);

patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.type}`);
  console.log(`Confidence: ${pattern.confidence}`);
  console.log(`Action: ${pattern.action.type}`);
  console.log(`Impact: ${JSON.stringify(pattern.impact)}`);
});

// Get recommendations
const recommendations = await learner.getRecommendations(
  'code-reviewer',
  'security-audit'
);

recommendations.forEach(rec => {
  console.log(`Recommendation: ${rec.description}`);
  console.log(`Expected impact: ${rec.impact.successRate}% success rate improvement`);
});
```

---

### Adaptation Engine

**File**: `src/evolution/AdaptationEngine.ts`

**Responsibility**: Apply learned optimizations to task execution

**Public API**:

```typescript
class AdaptationEngine {
  /**
   * Adapt execution configuration based on learned patterns
   * @param agentId - Agent identifier
   * @param taskType - Task type
   * @param baseConfig - Base execution configuration
   * @returns Adapted configuration with applied patterns
   */
  async adaptExecution(
    agentId: string,
    taskType: string,
    baseConfig: BaseExecutionConfig
  ): Promise<AdaptedExecution>

  /**
   * Get adaptation statistics for agent
   * @param agentId - Agent identifier
   * @returns Stats about applied adaptations
   */
  getAdaptationStats(agentId: string): AdaptationStats
}

interface AdaptedExecution {
  adaptedConfig: BaseExecutionConfig;
  appliedPatterns: Pattern[];
  reasoning: string;
}

interface BaseExecutionConfig {
  model: string;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  promptTemplate: string;
}

interface AdaptationStats {
  totalAdaptations: number;
  adaptationsByType: Record<string, number>;
  averageImpact: {
    successRate: number;
    costReduction: number;
    speedup: number;
  };
}
```

**Adaptation Types**:

**1. Prompt Optimization**:
- `efficient`: Simplified prompt, reduced tokens
- `quality-focused`: Detailed prompt, higher quality

**2. Model Selection**:
- Upgrade: Haiku → Sonnet → Opus (if quality issues)
- Downgrade: Opus → Sonnet → Haiku (if cost issues)

**3. Timeout Adjustment**:
- Based on P95 duration (95th percentile)
- Prevents premature timeouts
- Reduces unnecessary waiting

**4. Retry Strategy**:
- Increase retries for transient failures
- Decrease for persistent failures
- Exponential backoff

**Usage Example**:

```typescript
import { AdaptationEngine } from './evolution/AdaptationEngine.js';

const engine = new AdaptationEngine(learningManager);

// Base configuration
const baseConfig = {
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  timeout: 30000,
  retryAttempts: 2,
  promptTemplate: '<base prompt>',
};

// Adapt based on learned patterns
const adapted = await engine.adaptExecution(
  'code-reviewer',
  'security-audit',
  baseConfig
);

console.log('Adapted configuration:');
console.log(`Model: ${adapted.adaptedConfig.model}`);
console.log(`Timeout: ${adapted.adaptedConfig.timeout}ms`);
console.log(`Prompt: ${adapted.adaptedConfig.promptTemplate.length} chars`);

console.log('\nApplied patterns:');
adapted.appliedPatterns.forEach(pattern => {
  console.log(`- ${pattern.type}: ${pattern.description}`);
});

console.log(`\nReasoning: ${adapted.reasoning}`);

// Get stats
const stats = engine.getAdaptationStats('code-reviewer');
console.log(`\nTotal adaptations: ${stats.totalAdaptations}`);
console.log(`Average impact: +${stats.averageImpact.successRate}% success rate`);
```

---

### Evolution Monitor

**File**: `src/evolution/EvolutionMonitor.ts`

**Responsibility**: Aggregate metrics and provide evolution dashboard

**Public API**:

```typescript
class EvolutionMonitor {
  /**
   * Get dashboard summary
   * @returns Aggregated metrics from all agents
   */
  async getDashboardSummary(): Promise<DashboardSummary>

  /**
   * Get agent learning progress
   * @param agentId - Agent identifier
   * @returns Detailed learning progress
   */
  async getAgentLearningProgress(agentId: string): Promise<AgentLearningProgress>

  /**
   * Format dashboard for terminal display
   * @param summary - Dashboard summary
   * @returns Formatted terminal output
   */
  formatDashboard(summary: DashboardSummary): string
}

interface DashboardSummary {
  totalAgents: number;
  agentsWithPatterns: number;
  totalPatterns: number;
  totalExecutions: number;
  averageSuccessRate: number;
  topImprovingAgents: Array<{
    agentId: string;
    improvement: number;
  }>;
}

interface AgentLearningProgress {
  agentId: string;
  totalExecutions: number;
  learnedPatterns: number;
  appliedAdaptations: number;
  successRateImprovement: number;
  lastLearningDate: string;
}
```

**Usage Example**:

```typescript
import { EvolutionMonitor } from './evolution/EvolutionMonitor.js';

const monitor = new EvolutionMonitor(
  performanceTracker,
  learningManager,
  adaptationEngine
);

// Get dashboard summary
const summary = await monitor.getDashboardSummary();

console.log(`Total Agents: ${summary.totalAgents}`);
console.log(`Agents with Patterns: ${summary.agentsWithPatterns}`);
console.log(`Total Patterns: ${summary.totalPatterns}`);
console.log(`Total Executions: ${summary.totalExecutions}`);
console.log(`Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`);

console.log('\nTop Improving Agents:');
summary.topImprovingAgents.forEach((agent, i) => {
  console.log(`${i + 1}. ${agent.agentId}: +${(agent.improvement * 100).toFixed(1)}%`);
});

// Get detailed agent progress
const progress = await monitor.getAgentLearningProgress('code-reviewer');
console.log(`\nCode Reviewer Progress:`);
console.log(`Executions: ${progress.totalExecutions}`);
console.log(`Learned Patterns: ${progress.learnedPatterns}`);
console.log(`Applied Adaptations: ${progress.appliedAdaptations}`);
console.log(`Success Rate Improvement: +${(progress.successRateImprovement * 100).toFixed(1)}%`);

// Format dashboard
const formatted = monitor.formatDashboard(summary);
console.log(formatted);
// Beautiful terminal output with colors and formatting
```

---

## Agent Layer

### Development Butler

**File**: `src/agents/DevelopmentButler.ts`

**Responsibility**: Event-driven workflow automation and development task management

**Public API**:

```typescript
class DevelopmentButler {
  /**
   * Handle development checkpoint
   * @param checkpoint - Checkpoint type
   * @param context - Checkpoint context
   * @returns Actions performed
   */
  async handleCheckpoint(
    checkpoint: Checkpoint,
    context: CheckpointContext
  ): Promise<string[]>

  /**
   * Get available checkpoints
   * @returns All supported checkpoints
   */
  getAvailableCheckpoints(): Checkpoint[]
}

enum Checkpoint {
  CODE_WRITTEN = 'code_written',
  TESTS_PASSED = 'tests_passed',
  TESTS_FAILED = 'tests_failed',
  COMMIT_READY = 'commit_ready',
  PR_CREATED = 'pr_created',
  DEPLOYMENT_READY = 'deployment_ready',
}
```

**Supported Workflows**:
- Code written → Run tests
- Tests passed → Code review
- Tests failed → Debug assistance
- Commit ready → Git commit
- PR created → Notify team
- Deployment ready → Pre-deploy checks

**Usage Example**:

```typescript
import { DevelopmentButler, Checkpoint } from './agents/DevelopmentButler.js';

const butler = new DevelopmentButler(checkpointDetector, toolInterface, learningManager);

// Handle checkpoint
const actions = await butler.handleCheckpoint(
  Checkpoint.CODE_WRITTEN,
  {
    filesChanged: ['src/index.ts', 'src/utils.ts'],
    linesAdded: 150,
  }
);

console.log('Actions performed:');
actions.forEach(action => console.log(`- ${action}`));
// Output:
// - Ran tests
// - Tests passed
// - Suggested: Run code review
```

---

### Test Writer Agent

**File**: `src/agents/TestWriterAgent.ts`

**Responsibility**: Automated test generation with TDD best practices

**Public API**:

```typescript
class TestWriterAgent {
  /**
   * Generate tests for code
   * @param sourceCode - Code to test
   * @param testType - Type of tests (unit, integration, e2e)
   * @returns Generated test code
   */
  async generateTests(
    sourceCode: string,
    testType: 'unit' | 'integration' | 'e2e'
  ): Promise<string>

  /**
   * Analyze test coverage
   * @param coverageReport - Coverage report
   * @returns Coverage analysis with suggestions
   */
  async analyzeCoverage(
    coverageReport: CoverageReport
  ): Promise<CoverageAnalysis>
}
```

**Features**:
- TDD-first approach
- Framework-agnostic generation
- Edge case detection
- Coverage gap analysis
- Test refactoring suggestions

**Usage Example**:

```typescript
import { TestWriterAgent } from './agents/TestWriterAgent.js';

const testWriter = new TestWriterAgent();

// Generate unit tests
const tests = await testWriter.generateTests(
  sourceCode,
  'unit'
);

console.log(tests);
// Output: Complete test suite with describe blocks, test cases, assertions
```

---

### Knowledge Graph Agent

**File**: `src/agents/knowledge/index.ts`

**Responsibility**: Structured knowledge storage and retrieval

**Public API**:

```typescript
class KnowledgeAgent {
  /**
   * Record a feature implementation
   * @param feature - Feature details
   */
  async recordFeature(feature: Feature): Promise<void>

  /**
   * Record an architectural decision
   * @param decision - Decision details
   */
  async recordDecision(decision: Decision): Promise<void>

  /**
   * Record a bug fix
   * @param bugFix - Bug fix details
   */
  async recordBugFix(bugFix: BugFix): Promise<void>

  /**
   * Record a best practice
   * @param practice - Best practice details
   */
  async recordBestPractice(practice: BestPractice): Promise<void>

  /**
   * Record a lesson learned
   * @param lesson - Lesson details
   */
  async recordLessonLearned(lesson: LessonLearned): Promise<void>

  /**
   * Find similar entities
   * @param query - Search query
   * @param entityType - Entity type filter
   * @returns Similar entities ranked by relevance
   */
  async findSimilar(
    query: string,
    entityType: string
  ): Promise<SimilarEntity[]>

  /**
   * Get knowledge graph statistics
   * @returns Stats about entities, relations, observations
   */
  async getStats(): Promise<KnowledgeStats>

  /**
   * Get all decisions
   * @returns All architectural decisions
   */
  async getDecisions(): Promise<Decision[]>

  /**
   * Get all lessons learned
   * @returns All recorded lessons
   */
  async getLessonsLearned(): Promise<LessonLearned[]>

  /**
   * Close database connection
   */
  close(): void
}
```

**Entity Types**:
- **Feature**: Implemented functionality
- **Decision**: Architecture/design decisions
- **BugFix**: Problem-solution pairs
- **BestPractice**: Proven patterns
- **LessonLearned**: Insights from experience

**Usage Example**:

```typescript
import { KnowledgeAgent } from './agents/knowledge/index.js';

const knowledge = new KnowledgeAgent('./data/knowledge-graph.db');
await knowledge.initialize();

// Record a decision
await knowledge.recordDecision({
  name: 'Use PostgreSQL for main database',
  reason: 'Need ACID compliance and JSON support',
  alternatives: ['MongoDB', 'MySQL'],
  tradeoffs: ['More complex setup', 'Better data integrity'],
  outcome: 'Chosen PostgreSQL',
  tags: ['database', 'architecture'],
});

// Find similar decisions
const similar = await knowledge.findSimilar(
  'database choice',
  'decision'
);

similar.forEach(item => {
  console.log(`${item.name} (similarity: ${item.similarity})`);
});

// Get stats
const stats = await knowledge.getStats();
console.log(`Entities: ${stats.totalEntities}`);
console.log(`Decisions: ${stats.decisions}`);
console.log(`Lessons: ${stats.lessonsLearned}`);

// Cleanup
knowledge.close();
```

---

### RAG Agent (Optional)

**File**: `src/agents/rag/index.ts`

**Responsibility**: Vector search and semantic retrieval from project documents

**Public API**:

```typescript
class RAGAgent {
  /**
   * Search for relevant documents
   * @param query - Search query
   * @param options - Search options
   * @returns Ranked search results
   */
  async search(
    query: string,
    options?: {
      limit?: number;
      threshold?: number;
      rerank?: boolean;
    }
  ): Promise<SearchResult[]>

  /**
   * Index a document
   * @param document - Document to index
   */
  async indexDocument(document: Document): Promise<void>

  /**
   * Watch directory for changes
   * @param directory - Directory path
   */
  watchDirectory(directory: string): void

  /**
   * Get statistics
   * @returns Stats about indexed documents
   */
  async getStats(): Promise<RAGStats>
}
```

**Features**:
- Multiple embedding providers (OpenAI, Ollama, HuggingFace)
- Local vector storage (Vectra)
- Semantic reranking
- Drop Inbox (auto-index watched directory)
- Document chunking
- Supports: .md, .txt, .json, .pdf, .docx

**Usage Example**:

```typescript
import { RAGAgent } from './agents/rag/index.js';

const rag = new RAGAgent({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

await rag.initialize();

// Index documents
await rag.indexDocument({
  content: 'Authentication implementation details...',
  metadata: { source: 'docs/auth.md', type: 'documentation' },
});

// Search
const results = await rag.search(
  'How does authentication work?',
  { limit: 5, rerank: true }
);

results.forEach(result => {
  console.log(`[${result.score.toFixed(2)}] ${result.metadata.source}`);
  console.log(result.content);
});

// Watch directory for auto-indexing
rag.watchDirectory('~/Documents/claude-code-buddy-knowledge/');
```

---

## Storage Layer

### Connection Pool

**File**: `src/db/ConnectionPool.ts`

**Responsibility**: SQLite connection pooling for better concurrency

**Public API**:

```typescript
class ConnectionPool {
  /**
   * Acquire connection from pool
   * @returns Database connection
   * @throws Error if timeout waiting for connection
   */
  async acquire(): Promise<Database>

  /**
   * Release connection back to pool
   * @param connection - Connection to release
   */
  release(connection: Database): void

  /**
   * Shutdown pool and close all connections
   */
  async shutdown(): Promise<void>

  /**
   * Get pool statistics
   * @returns Pool stats
   */
  getStats(): {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }
}
```

**Configuration**:
```typescript
interface ConnectionPoolOptions {
  maxConnections: number;        // Pool size (default: 5)
  connectionTimeout: number;     // Acquire timeout (default: 5000ms)
  idleTimeout: number;           // Idle connection timeout (default: 30000ms)
  healthCheckInterval: number;   // Health check sweep (default: 10000ms)
}
```

**Features**:
- Pre-created connection pool
- FIFO queue for fair allocation
- Idle connection recycling
- Health checks for stale connections
- Graceful shutdown support
- Connection timeout handling

**Usage Example**:

```typescript
import { ConnectionPool } from './db/ConnectionPool.js';

const pool = new ConnectionPool('./data/knowledge-graph.db', {
  maxConnections: 5,
  connectionTimeout: 5000,
  idleTimeout: 30000,
});

// Acquire connection
const db = await pool.acquire();
try {
  // Use connection
  const result = db.prepare('SELECT * FROM entities WHERE type = ?').all('feature');
  console.log(result);
} finally {
  // Always release back to pool
  pool.release(db);
}

// Check pool health
const stats = pool.getStats();
console.log(`Active: ${stats.active}, Idle: ${stats.idle}, Waiting: ${stats.waiting}`);

// Cleanup on shutdown
await pool.shutdown();
```

---

### Backup Manager

**File**: `src/db/BackupManager.ts`

**Responsibility**: Automated database backup and restore

**Public API**:

```typescript
class BackupManager {
  /**
   * Create backup
   * @param label - Backup label (optional)
   * @returns Backup file path
   */
  async createBackup(label?: string): Promise<string>

  /**
   * List backups
   * @param filter - Filter options
   * @returns List of backups sorted by date
   */
  async listBackups(filter?: {
    limit?: number;
    before?: Date;
    after?: Date;
  }): Promise<BackupInfo[]>

  /**
   * Restore from backup
   * @param backupPath - Path to backup file
   * @param verify - Verify backup integrity before restore
   */
  async restoreBackup(backupPath: string, verify?: boolean): Promise<void>

  /**
   * Clean old backups
   * @param retentionDays - Keep backups newer than this
   * @returns Number of backups cleaned
   */
  async cleanOldBackups(retentionDays: number): Promise<number>

  /**
   * Get backup statistics
   * @returns Backup stats
   */
  async getStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  }>
}
```

**Features**:
- Automated scheduled backups
- Retention policy management
- Backup verification
- Incremental backups (future)
- Compression support

**Usage Example**:

```typescript
import { BackupManager } from './db/BackupManager.js';

const backupManager = new BackupManager('./data/knowledge-graph.db', './backups');

// Create backup
const backupPath = await backupManager.createBackup('before-migration');
console.log(`Backup created: ${backupPath}`);

// List backups
const backups = await backupManager.listBackups({ limit: 10 });
backups.forEach(backup => {
  console.log(`${backup.timestamp} - ${backup.label} (${backup.size} bytes)`);
});

// Restore from backup
await backupManager.restoreBackup(backupPath, true); // verify=true
console.log('Backup restored successfully');

// Clean old backups
const cleaned = await backupManager.cleanOldBackups(30); // Keep 30 days
console.log(`Cleaned ${cleaned} old backups`);

// Get stats
const stats = await backupManager.getStats();
console.log(`Total backups: ${stats.totalBackups}`);
console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
```

---

### Knowledge Graph Store

**File**: `src/agents/knowledge/storage/KnowledgeGraphStore.ts`

**Responsibility**: Low-level storage interface for Knowledge Graph

**Public API**:

```typescript
class KnowledgeGraphStore {
  /**
   * Initialize database
   */
  async initialize(): Promise<void>

  /**
   * Create entity
   * @param entity - Entity details
   */
  async createEntity(entity: Entity): Promise<void>

  /**
   * Add observation to entity
   * @param entityName - Entity name
   * @param observation - Observation text
   */
  async addObservation(
    entityName: string,
    observation: string
  ): Promise<void>

  /**
   * Create relation between entities
   * @param relation - Relation details
   */
  async createRelation(relation: Relation): Promise<void>

  /**
   * Search entities by text
   * @param query - Search query
   * @param entityType - Entity type filter
   * @param limit - Max results
   * @returns Matching entities with similarity scores
   */
  async searchEntities(
    query: string,
    entityType?: string,
    limit?: number
  ): Promise<SearchResult[]>

  /**
   * Get entity by name
   * @param name - Entity name
   * @returns Entity details or null
   */
  async getEntity(name: string): Promise<Entity | null>

  /**
   * Get all entities of type
   * @param entityType - Entity type
   * @returns Array of entities
   */
  async getEntitiesByType(entityType: string): Promise<Entity[]>

  /**
   * Get statistics
   * @returns Database statistics
   */
  async getStats(): Promise<{
    totalEntities: number;
    totalObservations: number;
    totalRelations: number;
    entitiesByType: Record<string, number>;
  }>

  /**
   * Close database
   */
  close(): void
}
```

**Database Schema**:

```sql
-- Entities
CREATE TABLE entities (
  name TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Observations
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (entity_name) REFERENCES entities(name) ON DELETE CASCADE
);

-- Relations
CREATE TABLE relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (from_entity) REFERENCES entities(name) ON DELETE CASCADE,
  FOREIGN KEY (to_entity) REFERENCES entities(name) ON DELETE CASCADE
);

-- Full-text search
CREATE VIRTUAL TABLE observations_fts USING fts5(content, entity_name);
```

**Features**:
- SQLite with WAL mode (better concurrency)
- Foreign key constraints
- Full-text search (FTS5)
- Automatic timestamps
- Transaction support

**Usage Example**:

```typescript
import { KnowledgeGraphStore } from './agents/knowledge/storage/KnowledgeGraphStore.js';

const store = new KnowledgeGraphStore('./data/knowledge-graph.db');
await store.initialize();

// Create entity
await store.createEntity({
  name: 'Authentication System',
  entityType: 'feature',
  observations: [
    'Uses JWT tokens for session management',
    'Supports OAuth2 providers (Google, GitHub)',
    'Implements rate limiting for login attempts',
  ],
});

// Add observation
await store.addObservation(
  'Authentication System',
  'Added 2FA support with TOTP'
);

// Create relation
await store.createRelation({
  from: 'Authentication System',
  to: 'User Database',
  relationType: 'depends_on',
});

// Search
const results = await store.searchEntities('authentication', 'feature', 10);
results.forEach(result => {
  console.log(`[${result.similarity.toFixed(2)}] ${result.entity.name}`);
  result.entity.observations.forEach(obs => {
    console.log(`  - ${obs}`);
  });
});

// Get stats
const stats = await store.getStats();
console.log(`Entities: ${stats.totalEntities}`);
console.log(`Observations: ${stats.totalObservations}`);
console.log(`Relations: ${stats.totalRelations}`);

// Cleanup
store.close();
```

---

## Utility Components

### Rate Limiter

**File**: `src/utils/RateLimiter.ts`

**Responsibility**: Rate limiting for MCP tool calls

**Public API**:

```typescript
class RateLimiter {
  /**
   * Consume tokens from rate limiter
   * @param tokens - Number of tokens to consume
   * @returns True if allowed, false if rate limit exceeded
   */
  consume(tokens: number): boolean

  /**
   * Get current rate limiter status
   * @returns Status with remaining tokens and reset time
   */
  getStatus(): {
    remaining: number;
    limit: number;
    resetIn: number; // milliseconds
  }

  /**
   * Reset rate limiter
   */
  reset(): void
}
```

**Configuration**:
```typescript
interface RateLimiterOptions {
  requestsPerMinute: number;  // Max requests per minute (default: 30)
}
```

**Usage Example**:

```typescript
import { RateLimiter } from './utils/RateLimiter.js';

const limiter = new RateLimiter({ requestsPerMinute: 30 });

// Check if request allowed
if (limiter.consume(1)) {
  // Process request
  console.log('Request allowed');
} else {
  // Rate limit exceeded
  const status = limiter.getStatus();
  console.error(`Rate limit exceeded. Try again in ${status.resetIn}ms`);
}

// Get status
const status = limiter.getStatus();
console.log(`Remaining: ${status.remaining}/${status.limit}`);
```

---

### Logger

**File**: `src/utils/logger.ts`

**Responsibility**: Structured logging with Winston

**Public API**:

```typescript
import { logger } from './utils/logger.js';

logger.info('Message', { context: 'data' });
logger.warn('Warning', { context: 'data' });
logger.error('Error', { context: 'data' });
logger.debug('Debug', { context: 'data' });
```

**Features**:
- JSON structured logging
- Log levels (debug, info, warn, error)
- Sensitive data filtering
- File rotation
- Console and file transports

---

### Error Handler

**File**: `src/utils/errorHandler.ts`

**Responsibility**: Centralized error logging and handling

**Public API**:

```typescript
import { logError } from './utils/errorHandler.js';

// Log error with context
logError(error, {
  component: 'ComponentName',
  method: 'methodName',
  operation: 'what was being done',
  data: { additionalContext: 'value' },
});
```

**Features**:
- Stack trace capture
- Context enrichment
- Error type detection
- Sanitization of sensitive data

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: High-level architecture overview
- **[DATA_FLOW.md](./DATA_FLOW.md)**: Data flow diagrams and request lifecycle
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment and operations guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Development and contribution guidelines

---

**Version**: 2.0.0
**Last Updated**: 2026-01-01
**Maintainer**: Claude Code Buddy Team
