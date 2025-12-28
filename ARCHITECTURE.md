# Smart-Agents System Architecture

**Version**: V2.1
**Last Updated**: 2025-12-28
**Author**: Smart Agents Team

---

## 📋 目錄

1. [系統概覽](#系統概覽)
2. [五層架構](#五層架構)
3. [核心組件](#核心組件)
4. [Evolution System](#evolution-system)
5. [MCP Integration](#mcp-integration)
6. [數據流](#數據流)
7. [擴展點](#擴展點)

---

## 系統概覽

Smart-Agents 是一個智能 AI Agent 協調平台，採用分層架構設計，支持多提供商 AI 模型整合、智能路由、自我演化學習和持久化記憶系統。

### 核心設計原則

1. **模組化** - 每個組件單一職責，低耦合高內聚
2. **可擴展** - 易於新增 agents、providers、capabilities
3. **可測試** - 完整的測試覆蓋 (unit, integration, E2E, regression)
4. **可觀測** - 實時監控、dashboard、性能追蹤
5. **成本優化** - 智能路由、配額管理、本地優先策略
6. **自我改進** - 從執行經驗中學習，持續優化性能

---

## 五層架構

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: User Interface                                     │
│ ┌────────────────┐    ┌───────────────────────────────┐    │
│ │ Claude Code    │    │ Smart Agents MCP Server       │    │
│ │ (CLI)          │◄───┤ - smart_router tool           │    │
│ │                │    │ - evolution_dashboard tool    │    │
│ └────────────────┘    └───────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Skills Coordination Layer                          │
│ ┌────────────────┐    ┌────────────────┐                   │
│ │ Agent Teams    │    │ Task Analyzer  │                   │
│ │ - Code Team    │    │ - Complexity   │                   │
│ │ - Research     │    │ - Category     │                   │
│ │ - Quality      │    │ - Requirements │                   │
│ └────────────────┘    └────────────────┘                   │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Smart Router (Quota-Aware)                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Router                                                │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │   │
│ │ │ Task         │ │ Agent        │ │ Cost         │ │   │
│ │ │ Analyzer     │ │ Router       │ │ Tracker      │ │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ │   │
│ │                                                      │   │
│ │ Evolution System:                                   │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │   │
│ │ │ Performance  │ │ Learning     │ │ Adaptation   │ │   │
│ │ │ Tracker      │ │ Manager      │ │ Engine       │ │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ │   │
│ │ ┌──────────────┐                                   │   │
│ │ │ Evolution    │ (Phase 4: Dashboard)              │   │
│ │ │ Monitor      │                                   │   │
│ │ └──────────────┘                                   │   │
│ └──────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Quota Manager                                      │
│ ┌────────────────┐    ┌────────────────┐                   │
│ │ Usage Tracking │    │ Provider       │                   │
│ │ - Daily limits │    │ Availability   │                   │
│ │ - Monthly caps │    │ - Health check │                   │
│ └────────────────┘    └────────────────┘                   │
└───────────────────────────────┬─────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Provider Integration                               │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐          │
│ │Ollama│ │Gemini│ │Claude│ │ Grok │ │ ChatGPT  │          │
│ │$0    │ │FREE  │ │Paid  │ │Paid  │ │  Paid    │          │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 層級職責

**Layer 5 (User Interface)**:
- Claude Code CLI 作為主要用戶介面
- MCP Server 提供工具整合 (smart_router, evolution_dashboard)
- 統一的錯誤處理和結果格式化

**Layer 4 (Skills Coordination)**:
- Agent Teams 協同工作
- Task complexity 分析和分類
- Multi-agent messaging 和協作

**Layer 3 (Smart Router)**:
- 智能任務路由到最合適的 agent
- Evolution system (自我學習和適應)
- 成本追蹤和預算管理

**Layer 2 (Quota Manager)**:
- 實時配額監控
- 提供商可用性檢查
- Fallback 策略管理

**Layer 1 (Provider Integration)**:
- 5 個 AI 提供商整合
- 統一的 API 抽象層
- 故障轉移處理

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
  taskType: string;                    // 'code-review', 'research', etc.
  complexity: number;                  // 1-10 scale
  estimatedTokens: number;             // Token 估算
  requiredCapabilities: string[];      // 所需能力清單
  suggestedModel?: string;             // 建議的 model
}
```

**複雜度評分規則**:
- 1-2: 超簡單 (llama3.2:1b)
- 3-5: 簡單 (qwen2.5:14b)
- 6-7: 中等 (GPT-4, Grok)
- 8-9: 複雜 (Claude Sonnet)
- 10: 極複雜 (Claude Opus)

---

### 3. AgentRouter (Layer 3)

**職責**: 根據任務分析選擇最合適的 agent

**22 個 Agents**:

| Category | Agents | Count |
|----------|--------|-------|
| Development | code-reviewer, test-writer, debugger, refactorer, api-designer, db-optimizer, frontend-specialist, backend-specialist, development-butler | 9 |
| Research | rag-agent, research-agent, architecture-agent, data-analyst, performance-profiler | 5 |
| Knowledge | knowledge-agent | 1 |
| Operations | devops-engineer, security-auditor | 2 |
| Creative | technical-writer, ui-designer | 2 |
| Utility | migration-assistant, api-integrator | 2 |
| General | general-agent | 1 |

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

---

### 4. CostTracker (Layer 3)

**職責**: 追蹤和管理 API 成本

**功能**:
- 實時成本累計
- 預算警告 (80%, 90%, 100%)
- 成本報表生成
- 成本優化建議

**成本計算**:
```typescript
cost = (promptTokens * INPUT_PRICE + completionTokens * OUTPUT_PRICE) / 1M
```

**價格表** (per 1M tokens):

| Model | Input | Output |
|-------|-------|--------|
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| GPT-4 Turbo | $10.00 | $30.00 |
| Grok Beta | $5.00 | $15.00 |
| Gemini 2.5 Flash | FREE | FREE |
| Ollama (local) | $0 | $0 |

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

### 2. 新增 Provider

**步驟**:
1. 在 `src/providers/` 創建 provider 類
2. 實現標準 `ProviderInterface`
3. 在 `QuotaManager` 註冊
4. 更新路由規則
5. 添加環境變數配置

**Interface**:
```typescript
interface Provider {
  name: string;
  isAvailable(): Promise<boolean>;
  estimateCost(tokens: number): number;
  execute(prompt: string, config: ProviderConfig): Promise<Response>;
}
```

### 3. 新增 Adaptation Type

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

### 4. 新增 Dashboard Metrics

**步驟**:
1. 在 `PerformanceTracker` 添加新指標
2. 在 `EvolutionMonitor` 聚合新指標
3. 更新 `formatDashboard()` 顯示邏輯
4. 更新 MCP tool schema (if needed)

---

## 部署架構

### 開發環境

```
Local Machine
├── Node.js 18+
├── Ollama (local models)
├── Vector DB (Vectra - local files)
└── MCP Servers
    ├── smart-agents (this project)
    ├── memory
    ├── perplexity
    └── playwright
```

### 生產環境 (建議)

```
Cloud Infrastructure
├── API Gateway (rate limiting, auth)
├── Smart-Agents Service
│   ├── Router instances (load balanced)
│   ├── Evolution DB (PostgreSQL)
│   └── Vector DB (Pinecone/Weaviate)
├── MCP Servers (containerized)
└── Monitoring
    ├── Prometheus (metrics)
    ├── Grafana (dashboards)
    └── Alertmanager (alerts)
```

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

- ✅ 環境變數存儲 (`.env` file)
- ✅ Never commit to Git (`.gitignore` 設置)
- ✅ Keychain integration (macOS)
- ⚠️ TODO: Secret rotation policy

### 輸入驗證

- ✅ Task description sanitization
- ✅ Tool input schema validation
- ✅ Cost budget enforcement

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

**文檔版本**: V2.1
**最後更新**: 2025-12-28
**維護者**: Smart Agents Team
