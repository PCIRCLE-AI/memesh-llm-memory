# Workflow Automation Integration

Smart Agents 整合了兩個強大的工作流程自動化平台：

- **Google Opal** - AI 驅動的自然語言工作流程創建
- **n8n** - 企業級工作流程自動化平台（300+ 整合）

## 🎯 核心功能

用戶只需用**自然語言描述**想做什麼，系統會：

1. 🧠 **智能分析** - 理解用戶意圖和需求
2. 🎯 **自動選擇平台** - 根據任務特性選擇 Opal 或 n8n
3. ⚡ **自動創建工作流** - 在選定平台上創建工作流
4. 📊 **記錄追蹤** - 保存到 Knowledge Graph 供後續查詢

## 📦 架構組件

### 1. WorkflowOrchestrator（智能協調器）

主要入口，負責分析和路由：

```typescript
import { WorkflowOrchestrator } from './agents/WorkflowOrchestrator';

const orchestrator = new WorkflowOrchestrator(mcp);

// 用戶只需描述需求
const result = await orchestrator.createWorkflow({
  description: "創建一個 AI 聊天機器人，可以總結郵件內容",
  platform: 'auto'  // 自動選擇最佳平台
});

console.log(result);
// {
//   success: true,
//   platform: 'opal',  // 系統選擇了 Opal
//   workflowUrl: 'https://opal.withgoogle.com/...',
//   screenshot: '/tmp/opal-workflow-...',
//   reasoning: 'Google Opal 適合快速創建 AI 驅動的工作流原型'
// }
```

### 2. OpalAutomationAgent（Opal 自動化）

使用 Playwright 自動化 Google Opal UI：

```typescript
import { OpalAutomationAgent } from './agents/OpalAutomationAgent';

const opalAgent = new OpalAutomationAgent(mcp);

// 創建工作流
const result = await opalAgent.createWorkflow({
  description: "每天早上 9 點發送天氣預報郵件",
  timeout: 60000
});

// 從 Gallery 複製範例
const remixed = await opalAgent.remixFromGallery("email automation");

// 導出工作流（截圖）
const exported = await opalAgent.exportWorkflow(result.workflowUrl);
```

### 3. N8nWorkflowAgent（n8n API 整合）

使用 n8n REST API 程式化創建工作流：

```typescript
import { N8nWorkflowAgent } from './agents/N8nWorkflowAgent';

const n8nAgent = new N8nWorkflowAgent(mcp, {
  baseUrl: 'https://your-n8n-instance.com/api/v1',
  apiKey: 'your-api-key'
});

// 創建簡單的 HTTP 工作流
const workflow = n8nAgent.createSimpleHttpWorkflow(
  "GitHub Webhook Handler",
  "https://api.github.com/repos/user/repo/issues"
);

const result = await n8nAgent.createWorkflow(workflow);

// 創建 AI Agent 工作流
const aiWorkflow = n8nAgent.createAIAgentWorkflow(
  "Customer Support Bot",
  "You are a helpful customer support assistant..."
);

const aiResult = await n8nAgent.createWorkflow(aiWorkflow);

// 列出所有工作流
const allWorkflows = await n8nAgent.listWorkflows();

// 執行工作流
const execution = await n8nAgent.executeWorkflow(result.workflowId, {
  input: "test data"
});
```

## 🚀 快速開始

### Step 1: 環境設置

#### n8n 設置（如果使用 n8n）

1. 部署 n8n 實例（或使用 n8n.cloud）
2. 獲取 API Key：
   - 登入 n8n
   - 前往 Settings → API
   - 創建新的 API Key

3. 配置環境變數：

```bash
# .env
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=your-api-key
```

#### Opal 設置

無需特殊設置，只需：
- Google 帳號
- 存取 https://opal.withgoogle.com/

### Step 2: 初始化 Orchestrator

```typescript
import { MCPToolInterface } from './core/MCPToolInterface';
import { WorkflowOrchestrator } from './agents/WorkflowOrchestrator';

// 初始化 MCP
const mcp = new MCPToolInterface();

// 創建 Orchestrator
const orchestrator = new WorkflowOrchestrator(mcp);
```

### Step 3: 創建工作流

```typescript
// 範例 1: 自動選擇平台
const result1 = await orchestrator.createWorkflow({
  description: "創建一個 AI 助手，每天總結 Slack 訊息"
});
// → 系統會選擇 Opal（AI 相關任務）

// 範例 2: 指定平台
const result2 = await orchestrator.createWorkflow({
  description: "連接 Stripe webhook 到 PostgreSQL 資料庫",
  platform: 'n8n'  // 強制使用 n8n
});
// → 使用 n8n（需要複雜整合）

// 範例 3: 設定優先級
const result3 = await orchestrator.createWorkflow({
  description: "創建客服聊天機器人",
  priority: 'speed'  // 優先速度 → Opal
});

const result4 = await orchestrator.createWorkflow({
  description: "創建客服聊天機器人",
  priority: 'production'  // 優先生產級 → n8n
});
```

## 🎨 使用範例

### 範例 1: AI 內容生成工作流

```typescript
const contentWorkflow = await orchestrator.createWorkflow({
  description: `
    創建一個內容生成工作流：
    1. 從 RSS feed 讀取新文章
    2. 使用 AI 生成摘要
    3. 翻譯成多種語言
    4. 發布到社群媒體
  `
});

// 系統分析：包含 AI、生成、翻譯 → 選擇 Opal
console.log(contentWorkflow.platform);  // 'opal'
console.log(contentWorkflow.reasoning);
// 'Google Opal 適合快速創建 AI 驅動的工作流原型，使用自然語言編輯器'
```

### 範例 2: 企業資料整合工作流

```typescript
const integrationWorkflow = await orchestrator.createWorkflow({
  description: `
    連接多個系統：
    - Salesforce CRM
    - PostgreSQL 資料庫
    - Slack 通知
    - Email 報表
    需要可靠的生產環境部署
  `,
  priority: 'production'
});

// 系統分析：多系統整合、生產級 → 選擇 n8n
console.log(integrationWorkflow.platform);  // 'n8n'
console.log(integrationWorkflow.workflowId);  // n8n workflow ID
```

### 範例 3: 快速原型測試

```typescript
const prototypeWorkflow = await orchestrator.createWorkflow({
  description: "測試一個簡單的郵件自動回覆 demo",
  priority: 'speed'
});

// 系統分析：簡單、測試、demo → 選擇 Opal
console.log(prototypeWorkflow.platform);  // 'opal'
console.log(prototypeWorkflow.screenshot);  // 截圖路徑
```

### 範例 4: 查詢所有工作流

```typescript
const allWorkflows = await orchestrator.listAllWorkflows();

console.log(allWorkflows);
// {
//   opal: [
//     { url: 'https://opal.withgoogle.com/...', description: '...' },
//     ...
//   ],
//   n8n: [
//     { id: 'wf_123', name: 'Integration Workflow', nodes: [...] },
//     ...
//   ]
// }
```

## 🧠 智能平台選擇邏輯

WorkflowOrchestrator 根據以下規則自動選擇平台：

### 選擇 Opal 的情況

✅ 關鍵字：AI, GPT, 生成, 翻譯, 摘要, 分析, 聊天, 對話
✅ 優先級：`priority: 'speed'`
✅ 描述詞：簡單, 快速, 原型, 測試, demo
✅ 純 AI 任務且無需複雜整合

**範例**：
- "創建 AI 聊天機器人"
- "自動生成部落格文章摘要"
- "快速測試 GPT-4 翻譯功能"

### 選擇 n8n 的情況

✅ 關鍵字：API, webhook, database, 資料庫, 整合, 串接
✅ 優先級：`priority: 'production'`
✅ 描述詞：生產, 部署, 正式, 可靠, 企業
✅ 需要多系統整合

**範例**：
- "連接 Stripe 到 PostgreSQL"
- "企業級 CRM 資料同步"
- "生產環境 webhook 處理器"

### 預設邏輯

如果未明確指定，系統預設：
- AI 相關任務 → Opal
- 其他任務 → n8n

## ⚡ 性能比較

| 指標 | Opal (Playwright) | n8n (API) |
|------|-------------------|-----------|
| **創建速度** | 10-18 秒 | 0.5-2 秒 |
| **準確率** | 85-95% | 99.9% |
| **適用場景** | AI 原型、快速測試 | 生產級整合 |
| **維護成本** | 高（UI 變更影響） | 低（API 穩定） |
| **自然語言編輯** | ✅ 原生支援 | ❌ 需手動配置 |
| **複雜整合** | ⚠️ 受限 | ✅ 300+ 服務 |

## 🔧 進階配置

### 自定義 n8n 工作流結構

```typescript
import { N8nWorkflow, N8nNode } from './agents/N8nWorkflowAgent';

const customWorkflow: N8nWorkflow = {
  name: "Custom Integration",
  nodes: [
    {
      id: 'trigger',
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: '/webhook',
        httpMethod: 'POST'
      }
    },
    {
      id: 'process',
      name: 'Process Data',
      type: 'n8n-nodes-base.function',
      position: [450, 300],
      parameters: {
        functionCode: `
          const input = items[0].json;
          return [{ json: { processed: input } }];
        `
      }
    },
    {
      id: 'save',
      name: 'Save to Database',
      type: 'n8n-nodes-base.postgres',
      position: [650, 300],
      parameters: {
        operation: 'insert',
        table: 'events',
        columns: 'data'
      }
    }
  ],
  connections: {
    'Webhook Trigger': {
      main: [[{ node: 'Process Data', type: 'main', index: 0 }]]
    },
    'Process Data': {
      main: [[{ node: 'Save to Database', type: 'main', index: 0 }]]
    }
  },
  active: true
};

const result = await n8nAgent.createWorkflow(customWorkflow);
```

### Opal Gallery 複製範例

```typescript
// 從 Opal Gallery 搜尋並複製現有範例
const searchTerms = [
  "email automation",
  "slack bot",
  "data analysis",
  "content generation"
];

for (const term of searchTerms) {
  const result = await opalAgent.remixFromGallery(term);
  console.log(`Remixed: ${result.workflowUrl}`);
}
```

## 📊 Knowledge Graph 整合

所有創建的工作流都會自動記錄到 Knowledge Graph：

```typescript
// 查詢 Opal 工作流
const opalWorkflows = await mcp.memory.searchNodes('opal_workflow');

// 查詢 n8n 工作流
const n8nWorkflows = await mcp.memory.searchNodes('n8n_workflow');

// 範例輸出
console.log(opalWorkflows[0]);
// {
//   name: 'Opal Workflow 2025-12-31T10:30:00.000Z',
//   entityType: 'opal_workflow',
//   observations: [
//     'Description: 創建 AI 聊天機器人',
//     'URL: https://opal.withgoogle.com/...',
//     'Screenshot: /tmp/opal-workflow-1735642200000.png',
//     'Created: 2025-12-31T10:30:00.000Z'
//   ]
// }
```

## ⚠️ 注意事項

### Opal 限制

1. **無 API** - 只能通過 Playwright 自動化
2. **速度較慢** - 10-18 秒 vs n8n 的 0.5-2 秒
3. **UI 依賴** - Opal UI 變更會破壞自動化
4. **需要人工驗證** - 建議檢查截圖確認結果

### n8n 要求

1. **需要 API Key** - 必須配置 `N8N_API_KEY`
2. **需要實例** - 自建或使用 n8n.cloud
3. **節點熟悉度** - 複雜工作流需要了解 n8n 節點類型

### 最佳實踐

✅ **原型階段** - 使用 Opal 快速驗證想法
✅ **生產部署** - 切換到 n8n 獲得可靠性
✅ **定期備份** - 從兩個平台導出工作流配置
✅ **版本控制** - 將 n8n workflow JSON 提交到 Git
✅ **監控記錄** - 定期檢查 Knowledge Graph 中的工作流記錄

## 🐛 故障排除

### Opal 自動化失敗

```typescript
// 問題：選擇器找不到元素
// 解決：檢查 Opal UI 是否更新，更新選擇器

// 問題：timeout 超時
// 解決：增加 timeout 參數
const result = await opalAgent.createWorkflow({
  description: "...",
  timeout: 120000  // 增加到 2 分鐘
});
```

### n8n API 錯誤

```typescript
// 問題：401 Unauthorized
// 檢查：API Key 是否正確配置

// 問題：404 Not Found
// 檢查：BASE_URL 是否包含 /api/v1

// 正確配置
const n8nAgent = new N8nWorkflowAgent(mcp, {
  baseUrl: 'https://your-instance.com/api/v1',  // 必須包含 /api/v1
  apiKey: 'n8n_api_...'
});
```

## 📚 更多資源

- [Google Opal 文檔](https://developers.google.com/opal)
- [n8n API 文檔](https://docs.n8n.io/api/)
- [Playwright MCP 文檔](https://github.com/microsoft/playwright)
- [Smart Agents 架構](./ARCHITECTURE.md)

## 🔮 未來改進

計劃中的功能：

- [ ] 整合 superpowers:brainstorming skill 進行更智能的工作流生成
- [ ] 支援從 Opal 導出為 n8n 格式
- [ ] 自動化測試工作流執行結果
- [ ] 工作流版本管理和回退
- [ ] 多平台工作流同步
