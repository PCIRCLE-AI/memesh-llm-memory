# Agent Orchestrator

智能 AI Agent 編排系統，為 MacBook Pro M2 優化。

## 核心功能

### 1. 任務複雜度分析 (TaskAnalyzer)

自動分析任務並判斷複雜度：

- **Simple**: 格式化、簡單查詢、快速修復 → Claude Haiku
- **Medium**: 標準開發任務、代碼生成 → Claude Sonnet 4.5
- **Complex**: 架構設計、深度推理、創意寫作 → Claude Opus 4.5

### 2. 智能 Agent 路由 (AgentRouter)

根據多個因素選擇最佳 Agent：

- 任務複雜度
- 系統記憶體使用率
- 成本預算
- 執行模式 (平行/循序)

### 3. 成本追蹤 (CostTracker)

完整的成本管理系統：

- 即時成本追蹤
- 預算警告 (預設 80% 閾值)
- 按模型統計
- 月度報告生成

### 4. 記憶體感知調度

動態檢查系統資源：

- 可用記憶體監控
- CPU 使用率追蹤
- 自動降級機制 (記憶體不足時)

## 架構

```
orchestrator/
├── index.ts          # 主要入口點 (Orchestrator class)
├── router.ts         # 統一路由介面 (Router class)
├── TaskAnalyzer.ts   # 任務分析器
├── AgentRouter.ts    # Agent 路由器
├── CostTracker.ts    # 成本追蹤器
├── types.ts          # TypeScript 類型定義
└── README.md         # 本文件
```

## 快速開始

### 基本用法

```typescript
import { Orchestrator } from './orchestrator/index.js';

const orchestrator = new Orchestrator();

// 執行單一任務
const result = await orchestrator.executeTask({
  id: 'task-1',
  description: 'Write a TypeScript function to validate email addresses',
});

console.log(result.response);
console.log(`Cost: $${result.cost.toFixed(6)}`);
```

### 批次執行

```typescript
const tasks = [
  { id: 'task-1', description: 'Simple task' },
  { id: 'task-2', description: 'Complex architecture design' },
  { id: 'task-3', description: 'Medium difficulty refactoring' },
];

// 循序執行
const result = await orchestrator.executeBatch(tasks, 'sequential');

// 平行執行 (適合獨立任務)
const result = await orchestrator.executeBatch(tasks, 'parallel');

console.log(`Total cost: $${result.totalCost.toFixed(6)}`);
console.log(`Total time: ${result.totalTimeMs}ms`);
```

### 僅分析任務 (不執行)

```typescript
const { analysis, routing } = await orchestrator.analyzeTask({
  id: 'task-1',
  description: 'Analyze system architecture and suggest improvements',
});

console.log(`Complexity: ${analysis.complexity}`);
console.log(`Selected agent: ${routing.selectedAgent}`);
console.log(`Estimated cost: $${routing.estimatedCost.toFixed(6)}`);
console.log(`Reasoning: ${analysis.reasoning}`);
```

### 查看成本報告

```typescript
// 取得成本報告
const report = orchestrator.getCostReport();
console.log(report);

// 輸出範例：
// 📊 Cost Report
// ══════════════════════════════════════════════════
//
// Total Tasks: 15
// Total Cost: $0.123456
// Average Cost/Task: $0.008230
//
// Monthly Budget: $50.00
// Monthly Spend: $0.123456
// Remaining Budget: $49.876544
// Budget Usage: 0.2%
//
// Cost by Model:
// ──────────────────────────────────────────────────
//   claude-sonnet-4-5-20250929: $0.098765 (80.0%)
//   claude-haiku-4-20250514: $0.012345 (10.0%)
//   claude-opus-4-5-20251101: $0.012346 (10.0%)
// ══════════════════════════════════════════════════
```

### 檢查系統狀態

```typescript
const status = await orchestrator.getSystemStatus();

console.log(`Memory: ${status.resources.availableMemoryMB}MB available`);
console.log(`Usage: ${status.resources.memoryUsagePercent}%`);
console.log(`Monthly spend: $${status.costStats.monthlySpend.toFixed(6)}`);
console.log(`Recommendation: ${status.recommendation}`);
```

## 進階用法

### 使用 Router 進行細粒度控制

```typescript
const orchestrator = new Orchestrator();
const router = orchestrator.getRouter();

// 手動分析和路由
const task = { id: 'task-1', description: 'Complex task' };
const { analysis, routing, approved } = await router.routeTask(task);

if (!approved) {
  console.warn('Task blocked due to budget constraints');
}
```

### 直接使用組件

```typescript
import { TaskAnalyzer, AgentRouter, CostTracker } from './orchestrator/index.js';

// 獨立使用 TaskAnalyzer
const analyzer = new TaskAnalyzer();
const analysis = await analyzer.analyze(task);

// 獨立使用 AgentRouter
const agentRouter = new AgentRouter();
const routing = await agentRouter.route(analysis);

// 獨立使用 CostTracker
const costTracker = new CostTracker();
const cost = costTracker.recordCost('task-1', 'claude-sonnet-4-5', 1000, 2000);
```

### 導出成本數據

```typescript
// 導出為 JSON
const costData = orchestrator.exportCostData();
console.log(costData);

// 儲存到檔案
import fs from 'fs';
fs.writeFileSync('cost-data.json', costData);
```

## 配置

在 `.env` 文件中配置：

```env
# Claude API
ANTHROPIC_API_KEY=your-api-key
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# Orchestrator
DEFAULT_MODE=cloud
MAX_MEMORY_MB=8000
SIMPLE_TASK_THRESHOLD=100

# Cost Control
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8

# Logging
LOG_LEVEL=info
ENABLE_METRICS=true
```

## 複雜度判斷邏輯

### Simple (Haiku)

- 字數 < 100
- 包含關鍵字: `format`, `rename`, `simple query`, `quick fix`, `typo`, `comment`
- 估計 tokens < 150

### Medium (Sonnet)

- 字數 100-200
- 標準開發任務
- 估計 tokens 150-500

### Complex (Opus)

- 字數 > 100
- 包含關鍵字: `analyze system`, `design database`, `refactor`, `implement algorithm`, `optimize`, `security audit`, `multi-step`
- 估計 tokens > 500

## 成本估算

基於官方定價 (USD per 1M tokens)：

| Model                    | Input  | Output |
| ------------------------ | ------ | ------ |
| Claude Sonnet 4.5        | $3.00  | $15.00 |
| Claude Opus 4.5          | $15.00 | $75.00 |
| Claude Haiku (next-gen)  | $0.80  | $4.00  |

## CLI 模式

直接執行 orchestrator 查看示範：

```bash
npm run orchestrator
```

輸出示例：

```
🎯 Agent Orchestrator Demo

📋 Task: task-1
   Description: Write a simple hello world function in TypeScript
   Complexity: simple
   Agent: claude-haiku
   Estimated cost: $0.000012
   Reasoning: Task complexity: simple. Estimated tokens: 150. Simple task suitable for Claude Haiku (cost-efficient)

📋 Task: task-2
   Description: Analyze the system architecture...
   Complexity: complex
   Agent: claude-opus
   Estimated cost: $0.000750
   Reasoning: Task complexity: complex. Estimated tokens: 500. Requires advanced reasoning capabilities (Claude Opus recommended)

════════════════════════════════════════════════════════════

💻 System Resources:
   Memory: 12345MB available
   Usage: 45%

💰 Cost Stats:
   Monthly spend: $0.000000
   Remaining budget: $50.00
   Recommendation: ✅ Budget usage is healthy. Continue normal operations.

════════════════════════════════════════════════════════════
```

## 故障排除

### 記憶體不足

當系統記憶體不足時，Orchestrator 會自動降級到 Haiku：

```
⚠️  Insufficient memory: Available 500MB, Required 1000MB
Fallback to claude-haiku due to: Insufficient memory
```

### 超出預算

當任務會超出月度預算時，執行會被阻止：

```
❌ Task execution blocked: Estimated cost $5.00 exceeds budget
```

### 預算警告

當達到預算閾值 (預設 80%) 時：

```
⚠️  BUDGET ALERT ⚠️
Monthly spend: $40.00 / $50.00
Usage: 80.0%
Remaining: $10.00
```

## 最佳實踐

1. **批次處理獨立任務時使用平行模式**

   ```typescript
   await orchestrator.executeBatch(tasks, 'parallel');
   ```

2. **定期檢查成本報告**

   ```typescript
   console.log(orchestrator.getCostReport());
   ```

3. **為複雜任務提供清晰描述**

   ```typescript
   // ❌ 不好
   { description: 'Fix the bug' }

   // ✅ 好
   { description: 'Analyze the authentication system and fix the JWT token validation bug' }
   ```

4. **在生產環境中設置合理的預算**

   ```env
   MONTHLY_BUDGET_USD=100
   COST_ALERT_THRESHOLD=0.8
   ```

5. **使用 analyzeTask 進行成本預估**

   ```typescript
   const { analysis, routing } = await orchestrator.analyzeTask(task);
   console.log(`This task will cost approximately $${routing.estimatedCost}`);
   ```

## TypeScript 類型

完整的 TypeScript 類型支援：

```typescript
import {
  Task,
  TaskAnalysis,
  TaskComplexity,
  RoutingDecision,
  AgentType,
  SystemResources,
  CostRecord,
  CostStats,
  ExecutionMode,
} from './orchestrator/index.js';
```

## 測試

```bash
# 執行測試
npm test

# 執行 type check
npm run typecheck

# 執行示範
npm run orchestrator
```

## 授權

MIT License
