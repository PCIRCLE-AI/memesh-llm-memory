# Smart-Agents System Architecture

**Version**: V2.0 (MCP Server Pattern)
**Last Updated**: 2025-12-29
**Author**: Smart Agents Team

---

## 📋 目錄

1. [系統概覽](#系統概覽)
2. [MCP Server 架構](#mcp-server-架構)
3. [核心組件](#核心組件)
4. [Evolution System](#evolution-system)
5. [MCP Integration](#mcp-integration)
6. [數據流](#數據流)
7. [擴展點](#擴展點)

---

## 系統概覽

Smart-Agents 是一個智能 AI Agent 協調平台，透過 **MCP (Model Context Protocol)** 整合到 Claude Code，提供 13 個自我優化的專業 agents。

### 核心設計原則

1. **模組化** - 每個組件單一職責，低耦合高內聚
2. **可擴展** - 易於新增 agents、capabilities
3. **可測試** - 完整的測試覆蓋 (447 passing tests: unit, integration, E2E, regression)
4. **可觀測** - 實時監控、evolution dashboard、性能追蹤
5. **Prompt Enhancement** - 生成針對 agent 優化的 prompts
6. **自我改進** - 從執行經驗中學習，持續優化性能（Evolution System）

---

## MCP Server 架構

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                            │
│              (使用用戶的 API subscription)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ MCP Protocol (stdio)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Smart-Agents MCP Server                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MCP Tools                                             │  │
│  │ ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │ │ smart_     │  │ evolution_ │  │ 22 individual  │  │  │
│  │ │ router     │  │ dashboard  │  │ agent tools    │  │  │
│  │ └────────────┘  └────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Router (Orchestrator)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │ │ Task         │ │ Agent        │ │ Prompt       │  │  │
│  │ │ Analyzer     │ │ Router       │ │ Enhancer     │  │  │
│  │ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │                                                      │  │
│  │ Evolution System (Self-Learning):                   │  │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │  │
│  │ │ Performance  │ │ Learning     │ │ Adaptation   │ │  │
│  │ │ Tracker      │ │ Manager      │ │ Engine       │ │  │
│  │ └──────────────┘ └──────────────┘ └──────────────┘ │  │
│  │ ┌──────────────┐                                   │  │
│  │ │ Evolution    │ (Dashboard & Monitoring)          │  │
│  │ │ Monitor      │                                   │  │
│  │ └──────────────┘                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   22 Specialized Agents                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Development (9): code-reviewer, test-writer,         │  │
│  │   debugger, refactorer, api-designer, db-optimizer,  │  │
│  │   frontend/backend-specialist, development-butler    │  │
│  │                                                       │  │
│  │ Research (5): rag-agent, research-agent,             │  │
│  │   architecture-agent, data-analyst, perf-profiler    │  │
│  │                                                       │  │
│  │ Knowledge (1): knowledge-agent                       │  │
│  │ Operations (2): devops-engineer, security-auditor    │  │
│  │ Creative (2): technical-writer, ui-designer          │  │
│  │ Utility (2): migration-assistant, api-integrator     │  │
│  │ General (1): general-agent (fallback)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    ↓ Returns Enhanced Prompts ↓
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code                              │
│            (執行 prompts，使用用戶 API keys)                 │
└─────────────────────────────────────────────────────────────┘
```

### 核心工作流程

1. **User Request** → Claude Code
2. **MCP Tool Call** → Smart-Agents MCP Server
3. **Task Analysis** → TaskAnalyzer 分析任務複雜度、類型、所需能力
4. **Agent Routing** → AgentRouter 基於能力路由到最合適的 agent
5. **Prompt Enhancement** → PromptEnhancer 生成針對 agent 優化的 prompt
6. **Evolution Adaptation** → AdaptationEngine 應用學習到的優化（prompt/timeout/model selection）
7. **Return Enhanced Prompt** → MCP Server 返回優化後的 prompt
8. **Execution** → Claude Code 執行 prompt（使用用戶的 API subscription）
9. **Performance Tracking** → PerformanceTracker 記錄執行指標
10. **Pattern Learning** → LearningManager 分析並學習優化模式

---

## 核心組件

### 1. Router (Layer 3)

**職責**: 統一路由入口，協調所有子系統

**組成**:
```typescript
class Router {
  private taskAnalyzer: TaskAnalyzer;
  private agentRouter: AgentRouter;
  private costTracker: CostTracker;

  // Evolution system (Phase 1-4)
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;
  private adaptationEngine: AdaptationEngine;

  async routeTask(task: Task): Promise<RoutingResult> {
    // 1. Analyze task
    const analysis = await this.taskAnalyzer.analyzeTask(task);

    // 2. Route to agent
    const routing = await this.agentRouter.route(analysis);

    // 3. Apply evolution adaptations
    const adapted = await this.adaptationEngine.adaptExecution(
      routing.selectedAgent,
      analysis.taskType,
      routing.baseConfig
    );

    // 4. Track performance
    // (after execution in real implementation)

    return { analysis, routing, adaptedExecution: adapted };
  }
}
```

**關鍵 API**:
- `routeTask(task)` - 路由單個任務
- `routeBatch(tasks)` - 批量路由
- `getSystemStatus()` - 系統狀態查詢

---

### 2. TaskAnalyzer (Layer 3)

**職責**: 分析任務複雜度、類型、所需能力

**分析維度**:
```typescript
interface TaskAnalysis {
  taskId: string;
  taskType: string;                    // 'code-review', 'research', etc.
  complexity: TaskComplexity;          // 'simple' | 'medium' | 'complex'
  estimatedTokens: number;             // Token 估算
  estimatedCost: number;               // 成本估算
  requiredAgents: AgentType[];         // 所需 agents 清單
  executionMode: ExecutionMode;        // 'sync' | 'async' | 'parallel'
  reasoning: string;                   // 分析理由
}
```

**複雜度評估規則**:
- **simple**: 單一明確任務，標準流程
- **medium**: 需要多步驟分析或組合能力
- **complex**: 涉及架構決策、多領域協作、創新解決方案

---

### 3. AgentRouter (Layer 3)

**職責**: 根據任務分析選擇最合適的 agent

**13 個 Agents**:

| Category | Agents | Count |
|----------|--------|-------|
| Development | development-butler, test-writer, code-reviewer | 3 |
| Operations | devops-engineer, security-auditor | 2 |
| Management | project-manager, product-manager | 2 |
| Engineering | data-engineer, ml-engineer | 2 |
| Analysis | architecture-agent, rag-agent | 2 |
| Creative | ui-designer | 1 |
| Business | marketing-strategist | 1 |

**註**: 13 agents (5 個完整實作, 7 個增強 prompts, 1 個可選功能)

**路由決策**:
```typescript
interface RoutingDecision {
  selectedAgent: string;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  enhancedPrompt: string;
}
```

**Agent 實作架構**:

所有 13 個 agents 都通過 **Prompt Enhancement Mode** 工作：
- **AgentRegistry** (`src/core/AgentRegistry.ts`) 註冊所有 agents 的 metadata
- **PromptEnhancer** (`src/core/PromptEnhancer.ts`) 為每個 agent 定義專業 persona
- 部分 agents 有完整的類別實作，其他通過 PromptEnhancer 的 persona 工作

**完整實作的 Agents** (5 個):
| Agent | 路徑 | 實作內容 |
|-------|------|---------|
| code-reviewer | `src/agents/code/` | 代碼審查邏輯、安全檢查 |
| architecture-agent | `src/agents/architecture/` | 架構分析、設計建議 |
| rag-agent | `src/agents/rag/` | 向量搜尋、embeddings、reranking |
| research-agent | `src/agents/research/` | 研究流程、資訊收集 |
| knowledge-agent | `src/agents/knowledge/` | 知識組織、檢索 |

**通過 Prompt Enhancement 工作的 Agents** (17 個):
- 無需獨立類別實作
- PromptEnhancer 為每個 agent 定義詳細的 persona（專長、工作流程、最佳實踐）
- 生成優化的 prompt 後返回給 Claude Code 執行
- 同樣具備專業能力，通過精心設計的 prompts 實現

---

### 4. CostTracker

**職責**: 估算 prompt 生成的理論成本

> **V2.0 說明**: 在 MCP Server Pattern 中，smart-agents 只生成 enhanced prompts，不直接調用 API。實際的 API 調用由 Claude Code 使用用戶的 API subscription 執行。因此 CostTracker 提供的是**理論成本估算**，幫助用戶了解預期的 token 消耗。

**功能**:
- Token 使用量估算
- 理論成本計算（基於當前市場價格）
- 預算預警建議
- 成本優化建議（如建議使用較小模型）

**成本計算公式**:
```typescript
estimatedCost = (promptTokens * INPUT_PRICE + completionTokens * OUTPUT_PRICE) / 1M
```

**參考價格表** (per 1M tokens, 2025-12-29):

| Model | Input | Output | 備註 |
|-------|-------|--------|------|
| Claude Sonnet 4.5 | $3.00 | $15.00 | 推薦用於複雜任務 |
| Claude Opus 4.5 | $15.00 | $75.00 | 最高品質 |

> **注意**: 價格僅供參考，實際成本由用戶的 Claude API subscription 決定。

---

## Evolution System

**完整文檔**: 參見 `docs/EVOLUTION.md`

### 架構

```
┌─────────────────────────────────────────────────────────┐
│                 EvolutionMonitor                        │
│           (Dashboard & Metrics Aggregation)             │
│                    ↑  ↑  ↑                              │
│                    │  │  │                              │
│        ┌───────────┘  │  └───────────┐                 │
│        │              │              │                 │
│        ▼              ▼              ▼                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Performance│  │ Learning │  │Adaptation│            │
│  │ Tracker  │──│ Manager  │──│  Engine  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│        │              │              │                 │
│        ▼              ▼              ▼                 │
│  ┌──────────────────────────────────────┐             │
│  │      Agent Execution Layer           │             │
│  │  (22 Agents with Evolution Config)   │             │
│  └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Phase 1-3: 核心學習系統

**PerformanceTracker** - 記錄執行指標:
- Success rate, duration, cost, quality
- 趨勢分析 (historical vs recent)
- 異常檢測 (slow, expensive, failures)

**LearningManager** - 提取模式:
- Success patterns (high quality, cost-efficient)
- Anti-patterns (timeout, low quality)
- Optimization opportunities (cost reduction)

**AdaptationEngine** - 應用適應:
- Prompt optimization (efficient vs quality-focused)
- Model selection (Opus ↔ Sonnet ↔ Haiku)
- Timeout adjustment (P95 duration)
- Retry strategy (transient failures)

### Phase 4: Evolution Dashboard & Monitoring

**EvolutionMonitor** - 統一監控:

**Dashboard Summary**:
```typescript
{
  totalAgents: 22,
  agentsWithPatterns: 15,
  totalPatterns: 87,
  totalExecutions: 342,
  averageSuccessRate: 0.89,
  topImprovingAgents: [
    { agentId: 'code-reviewer', improvement: 0.15 },
    { agentId: 'test-writer', improvement: 0.12 },
    // ...
  ]
}
```

**Agent Learning Progress**:
```typescript
{
  agentId: 'code-reviewer',
  totalExecutions: 45,
  learnedPatterns: 12,
  appliedAdaptations: 28,
  successRateImprovement: 0.15,
  lastLearningDate: '2025-12-28T10:30:00Z'
}
```

**MCP Integration**:
- `evolution_dashboard` tool (summary/detailed format)
- Real-time metrics aggregation
- Terminal-friendly formatting

### Phase 5: Testing Infrastructure

**Test Suite**:
1. **Unit Tests** - 所有 evolution 組件 (≥85% coverage)
2. **E2E Integration** - 完整工作流程測試
3. **Performance Benchmarks** - 性能回歸防護
4. **Regression Tests** - API 向後兼容性
5. **User Acceptance** - 5 個真實場景模擬

**Self-Improvement Experiment**:
- 3 rounds of execution (baseline → learning → improved)
- Evidence of learning (patterns applied, success rate increase)
- Automated reporting

---

## MCP Integration

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────┐
│            MCP Server (stdio transport)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Tool Registry                                   │  │
│  │  ┌────────────┐  ┌────────────┐                 │  │
│  │  │ smart_     │  │ evolution_ │                 │  │
│  │  │ router     │  │ dashboard  │                 │  │
│  │  └────────────┘  └────────────┘                 │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │ 22 Individual Agent Tools                  │ │  │
│  │  │ (code-reviewer, test-writer, debugger...)  │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Execution Layer                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │ Router   │  │Evolution │  │  Agent   │      │  │
│  │  │          │  │ Monitor  │  │ Registry │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↑ stdio ↑
┌─────────────────────────────────────────────────────────┐
│                  Claude Code                            │
└─────────────────────────────────────────────────────────┘
```

### Available Tools

**1. smart_router**:
```typescript
{
  name: 'smart_router',
  description: 'Intelligent task routing to best agent with cost optimization',
  inputSchema: {
    task: {
      description: string,
      priority?: number,
      context?: object
    }
  }
}
```

**2. evolution_dashboard**:
```typescript
{
  name: 'evolution_dashboard',
  description: 'View evolution system dashboard',
  inputSchema: {
    format: 'summary' | 'detailed'  // optional, default 'summary'
  }
}
```

**3. Individual Agent Tools** (22 agents):
```typescript
{
  name: 'code-reviewer',
  description: 'Expert code review with security and performance analysis',
  inputSchema: { task: { /* ... */ } }
}
// ... (21 more agents)
```

### Integration with External MCP Servers

Smart-Agents integrates with:
- **Memory MCP** - Knowledge graph for persistent memory
- **Perplexity MCP** - Deep search capabilities
- **Playwright MCP** - E2E testing automation
- **Semgrep MCP** - Code security scanning
- **GitLab MCP** - Project management

---

## 數據流

### Complete Task Execution Flow

```
1. User Request
   ↓
2. Claude Code → MCP Server
   ↓
3. smart_router tool invocation
   ↓
4. Router.routeTask(task)
   │
   ├─→ TaskAnalyzer.analyzeTask(task)
   │   └─→ TaskAnalysis { taskType, complexity, ... }
   │
   ├─→ AgentRouter.route(analysis)
   │   └─→ RoutingDecision { selectedAgent, cost, prompt }
   │
   ├─→ AdaptationEngine.adaptExecution(agent, taskType, config)
   │   ├─→ LearningManager.getRecommendations(agent, taskType)
   │   │   └─→ Patterns { type, action, confidence }
   │   └─→ AdaptedExecution { adaptedConfig, appliedPatterns }
   │
   ├─→ CostTracker.estimateCost(agent, tokens)
   │   └─→ EstimatedCost { amount, withinBudget }
   │
   └─→ Return RoutingResult
       │
       ├─→ analysis: TaskAnalysis
       ├─→ routing: RoutingDecision
       ├─→ adaptedExecution: AdaptedExecution
       ├─→ approved: boolean
       └─→ message: string

5. MCP Server formats response
   ↓
6. Claude Code receives enhanced prompt
   ↓
7. (Optional) Execute agent with enhanced prompt
   ↓
8. PerformanceTracker.track(metrics)
   ├─→ Record execution metrics
   └─→ Trigger pattern analysis (if threshold met)
       ├─→ LearningManager.analyzePatterns(agent)
       └─→ Store learned patterns
```

### Evolution Dashboard Flow

```
1. User: "Show evolution dashboard"
   ↓
2. Claude Code → MCP Server
   ↓
3. evolution_dashboard tool invocation
   ↓
4. EvolutionMonitor.getDashboardSummary()
   │
   ├─→ Aggregate stats from 22 agents
   │   ├─→ PerformanceTracker.getEvolutionStats(agent)
   │   ├─→ LearningManager.getPatterns(agent)
   │   └─→ AdaptationEngine.getAdaptationStats(agent)
   │
   └─→ DashboardSummary
       ├─→ totalAgents: 22
       ├─→ agentsWithPatterns: 15
       ├─→ totalPatterns: 87
       ├─→ totalExecutions: 342
       ├─→ averageSuccessRate: 0.89
       └─→ topImprovingAgents: [...]

5. EvolutionMonitor.formatDashboard()
   └─→ Beautiful terminal output

6. MCP Server returns formatted dashboard
   ↓
7. Claude Code displays to user
```

---

## 擴展點

### 1. 新增 Agent

**步驟**:
1. 在 `src/evolution/AgentEvolutionConfig.ts` 定義配置
2. 在 `src/agents/` 創建 agent 實現
3. 在 `src/mcp/server.ts` 註冊 MCP tool
4. 撰寫單元測試
5. 更新文檔

**範例**:
```typescript
// 1. AgentEvolutionConfig.ts
export const AGENT_CONFIGS: Map<AgentType, AgentEvolutionConfig> = new Map([
  // ... existing agents
  ['new-agent', {
    agentId: 'new-agent',
    category: 'development',
    evolutionEnabled: true,
    confidenceThreshold: 0.75,
    minObservationsForAdaptation: 15,
    enabledAdaptations: ['promptOptimization', 'modelSelection', 'timeoutAdjustment'],
    learningRate: 1/3,
    learningWeights: {
      successRate: 0.4,
      userFeedback: 0.35,
      performanceMetrics: 0.25,
    },
  }],
]);

// 2. src/agents/NewAgent.ts
export class NewAgent {
  async execute(task: Task): Promise<AgentResponse> {
    // implementation
  }
}

// 3. MCP tool registration (automatic via AgentRegistry)
```

### 2. 新增 Adaptation Type

**步驟**:
1. 在 `AdaptationEngine` 添加新的 adaptation 類型
2. 實現 adaptation 邏輯
3. 更新 `AgentEvolutionConfig` enabledAdaptations
4. 撰寫測試

**範例**:
```typescript
// New adaptation: contextOptimization
private applyContextOptimization(
  baseConfig: BaseExecutionConfig,
  pattern: Pattern
): BaseExecutionConfig {
  const params = pattern.action.parameters;
  return {
    ...baseConfig,
    contextWindow: params.optimalContextSize,
    contextCompressionRatio: params.compressionRatio,
  };
}
```

### 3. 新增 Dashboard Metrics

**步驟**:
1. 在 `PerformanceTracker` 添加新指標
2. 在 `EvolutionMonitor` 聚合新指標
3. 更新 `formatDashboard()` 顯示邏輯
4. 更新 MCP tool schema (if needed)

---

## 部署架構

### V2.0 MCP Server 部署（當前實作）

**開發環境**:
```
Local Machine
├── Node.js 18+
├── Claude Code (作為 MCP client)
├── smart-agents MCP Server
│   ├── Router (task analysis + agent selection)
│   ├── 22 Agents (prompt generation)
│   ├── Evolution System (self-learning)
│   └── Vector DB (Vectra - local RAG storage)
└── Other MCP Servers (optional)
    ├── memory (knowledge graph)
    ├── perplexity (search)
    └── playwright (E2E testing)
```

**特點**:
- 輕量級 MCP server (stdio transport)
- 不需要 API 部署（直接被 Claude Code 調用）
- 用戶使用自己的 Claude API subscription
- 本地 vector database（Vectra）

---

## 性能指標

### Target Latencies

| Operation | Target | Actual |
|-----------|--------|--------|
| Task routing | < 100ms | ~80ms |
| Performance tracking | < 1ms | ~0.5ms |
| Pattern analysis | < 50ms | ~30ms |
| Dashboard summary | < 10ms | ~5ms |
| Batch routing (10) | < 500ms | ~400ms |

### Resource Usage

| Metric | Limit | Current |
|--------|-------|---------|
| Memory | < 500MB | ~300MB |
| CPU | < 50% | ~20% |
| Disk (evolution data) | < 100MB | ~50MB |

---

## 安全考量

### API Key 管理

- ✅ 用戶在 Claude Code 中管理自己的 API keys
- ✅ smart-agents MCP server 不需要 API keys
- ✅ 不需要 `.env` file（除非使用 external MCP servers）
- ✅ 本地執行，無 API key 洩漏風險

### 輸入驗證

- ✅ Task description sanitization
- ✅ Tool input schema validation
- ✅ Cost budget enforcement

### Evolution Storage Layer Security (v2.1.0)

**SQL Injection Protection**:
- ✅ All FTS (Full-Text Search) queries hardened against SQL injection
- ✅ Parameterized queries with proper escaping
- ✅ Input sanitization for user-provided search terms

**Type Safety**:
- ✅ Branded `MicroDollars` type prevents money calculation errors
- ✅ Safe JSON parsing with fallback values (no crashes on malformed data)
- ✅ Zero 'as any' type casts - full TypeScript type coverage

**Data Integrity**:
- ✅ Standardized null handling (database NULL ↔ TypeScript undefined)
- ✅ Input validation before database operations
- ✅ Comprehensive error messages with context

**Code Quality**:
- ✅ JSDoc documentation for all public APIs
- ✅ Named constants replace magic numbers
- ✅ Consistent coding patterns across storage layer

See [Storage Enhancements](./src/evolution/storage/ENHANCEMENTS.md) for details.

### 日誌與監控

- ✅ 結構化日誌 (JSON format)
- ✅ 敏感資訊過濾 (API keys, user data)
- ⚠️ TODO: Audit trail for high-cost operations

---

## 參考文檔

- [Evolution System 詳細說明](./docs/EVOLUTION.md)
- [API 參考](./docs/API.md) (TODO)
- [MCP Server 整合指南](./docs/MCP_INTEGRATION.md) (TODO)
- [測試指南](./docs/TESTING.md) (TODO)

---

**文檔版本**: V2.0 (MCP Server Pattern)
**最後更新**: 2025-12-29
**維護者**: Smart Agents Team

**版本說明**:
- **V2.0 (當前)**: MCP Server Pattern - 生成 enhanced prompts，由 Claude Code 執行
