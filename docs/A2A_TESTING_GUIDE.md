# A2A 通訊測試指南（實戰版）

## 📋 前置條件確認

✅ **已完成的配置**：
- MeMesh A2A Token: `23a74a1be2320dc507dd3b2a0695d76885a8f15f8066465eeca3cf2dd10ac8a5`
- Task Timeout: 30 秒
- Poll Interval: 5 秒
- MCP Server Mode: 啟用

## 🎯 測試場景：Session 1 委派任務給 Session 2

### 架構說明

```
┌─────────────────────────────────────────────────────────┐
│                  A2A Protocol Phase 1.0                  │
│            (MCP Client Delegation Pattern)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────┐                                 │
│  │  Session 1 (Alice) │                                 │
│  │  • 使用 a2a-send-task                               │
│  └────────┬───────────┘                                 │
│           │ MCP Tool Call                                │
│           ▼                                              │
│  ┌────────────────────────────────────┐                │
│  │  MCPTaskDelegator (In-Memory)      │                │
│  │  • Task Queue (PENDING → WORKING)  │                │
│  └────────┬───────────────────────────┘                │
│           │ Polling (every 5s)                          │
│           ▼                                              │
│  ┌────────────────────┐                                 │
│  │  Session 2 (Bob)   │                                 │
│  │  1. a2a-list-tasks  │                                 │
│  │  2. Execute task    │                                 │
│  │  3. a2a-report-result│                               │
│  └────────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

## 🧪 測試步驟

### Phase 1: 環境準備

#### 1.1 終止所有現有 Claude Code sessions

```bash
# 找出所有 MeMesh server 進程
ps aux | grep server-bootstrap.js | grep -v grep

# 終止所有 MeMesh instances
pkill -f "server-bootstrap.js"

# 確認清理完成
ps aux | grep server-bootstrap.js | grep -v grep  # 應該沒有輸出
```

#### 1.2 啟動兩個新的 Claude Code sessions

**重要提示**：必須重啟 Claude Code 才能載入最新的環境變數配置！

**Terminal 1 - Session Alice**:
```bash
# 啟動 Claude Code（這會自動啟動 MeMesh MCP server）
claude-code
```

**Terminal 2 - Session Bob**:
```bash
# 啟動另一個 Claude Code session
claude-code
```

---

### Phase 2: 在 Session 1 (Alice) 測試發送任務

#### 2.1 確認當前 agent ID

在 Session 1 執行：
```
請使用 mcp__memesh__a2a-list-agents 工具列出所有可用的 agents
```

**預期輸出**（假設兩個 sessions 都已啟動）：
```json
{
  "agents": [
    {
      "agentId": "ccb-mcp-xxxxx",
      "status": "active",
      "lastHeartbeat": "2026-02-04T01:30:00Z"
    },
    {
      "agentId": "ccb-mcp-yyyyy",
      "status": "active",
      "lastHeartbeat": "2026-02-04T01:30:05Z"
    }
  ]
}
```

**📌 記錄 Agent IDs**：
- Session 1 (Alice): `ccb-mcp-xxxxx`
- Session 2 (Bob): `ccb-mcp-yyyyy`

#### 2.2 從 Session 1 發送任務給 Session 2

在 Session 1 執行：
```
請使用 mcp__memesh__a2a-send-task 工具發送以下任務：

{
  "targetAgentId": "ccb-mcp-yyyyy",  // Session 2 的 agent ID
  "taskDescription": "請計算 123 + 456 並回報結果",
  "priority": "normal"
}
```

**預期輸出**：
```json
{
  "taskId": "task-abc123def456",
  "status": "PENDING",
  "message": "Task submitted successfully to agent ccb-mcp-yyyyy"
}
```

**📌 記錄 Task ID**: `task-abc123def456`

---

### Phase 3: 在 Session 2 (Bob) 接收並執行任務

#### 3.1 列出待處理任務

在 Session 2 執行：
```
請使用 mcp__memesh__a2a-list-tasks 工具列出我的待處理任務：

{
  "state": "SUBMITTED"
}
```

**預期輸出**：
```json
{
  "tasks": [
    {
      "taskId": "task-abc123def456",
      "taskDescription": "請計算 123 + 456 並回報結果",
      "priority": "normal",
      "status": "SUBMITTED",
      "createdAt": "2026-02-04T01:35:00Z",
      "fromAgentId": "ccb-mcp-xxxxx"
    }
  ]
}
```

#### 3.2 執行任務（手動模擬）

在 Session 2 中：
```
我收到任務："請計算 123 + 456 並回報結果"

計算結果：123 + 456 = 579
```

#### 3.3 報告任務結果

在 Session 2 執行：
```
請使用 mcp__memesh__a2a-report-result 工具報告任務完成：

{
  "taskId": "task-abc123def456",
  "result": "計算完成：123 + 456 = 579",
  "success": true
}
```

**預期輸出**：
```json
{
  "success": true,
  "taskId": "task-abc123def456",
  "status": "COMPLETED",
  "message": "Task result reported successfully"
}
```

---

### Phase 4: 在 Session 1 驗證任務完成

#### 4.1 查詢任務狀態

在 Session 1 執行：
```
請使用 mcp__memesh__a2a-get-task 工具查詢任務狀態：

{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskId": "task-abc123def456"
}
```

**預期輸出**：
```json
{
  "taskId": "task-abc123def456",
  "status": "COMPLETED",
  "result": "計算完成：123 + 456 = 579",
  "success": true,
  "completedAt": "2026-02-04T01:36:00Z"
}
```

---

## 🚨 常見問題排除

### Issue 1: "Unauthorized" 錯誤

**症狀**：
```
Error: Unauthorized - Invalid or missing authentication token
```

**解決方案**：
1. 確認 `.env` 文件中有 `MEMESH_A2A_TOKEN`
2. 重啟 Claude Code 以載入環境變數
3. 檢查兩個 sessions 使用的是同一個 token

### Issue 2: 找不到目標 agent

**症狀**：
```
Error: Target agent 'ccb-mcp-yyyyy' not found in registry
```

**解決方案**：
1. 使用 `a2a-list-agents` 確認 agent 存在
2. 確認使用正確的 agent ID（注意區分大小寫）
3. 確認目標 session 的 MeMesh server 正在運行

### Issue 3: 任務超時

**症狀**：
```
Error: Task execution timeout (exceeded 30000ms)
```

**解決方案**：
1. 增加 `.env` 中的 `MEMESH_A2A_TASK_TIMEOUT`
2. 確認 Session 2 正在輪詢任務（使用 `a2a-list-tasks`）
3. 檢查 Session 2 是否正常運行

### Issue 4: 任務列表為空

**症狀**：
```json
{
  "tasks": []
}
```

**解決方案**：
1. 確認任務已成功發送（檢查 `a2a-send-task` 的回應）
2. 確認使用正確的 agent ID
3. 檢查任務狀態篩選器（可能任務已經是 COMPLETED 狀態）

---

## 📊 測試驗證清單

測試完成後，確認以下項目都成功：

- [ ] Session 1 能列出可用的 agents
- [ ] Session 1 成功發送任務，收到 `taskId`
- [ ] Session 2 能列出待處理任務
- [ ] Session 2 成功報告任務結果
- [ ] Session 1 能查詢到任務完成狀態和結果
- [ ] 任務狀態正確變化：SUBMITTED → WORKING → COMPLETED

---

## 🎯 進階測試場景

### 場景 1: 任務失敗處理

在 Session 2 報告失敗：
```json
{
  "taskId": "task-xyz789",
  "result": "",
  "success": false,
  "error": "Division by zero error"
}
```

### 場景 2: 優先級任務

發送高優先級任務：
```json
{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskDescription": "緊急：修復登入 bug",
  "priority": "urgent"
}
```

### 場景 3: 多任務並發

從 Session 1 發送多個任務給不同的 agents，測試並發處理能力。

---

## 📖 參考文檔

- **A2A Setup Guide**: `docs/A2A_SETUP_GUIDE.md`
- **A2A Architecture**: `docs/features/a2a-agent-collaboration.md`
- **Commands Reference**: `docs/COMMANDS.md`

---

## 🔄 清理與重置

測試完成後清理：

```bash
# 1. 終止所有 Claude Code sessions
pkill -f "server-bootstrap.js"

# 2. 清理任務隊列（如需要）
# 目前 Phase 1.0 使用 in-memory queue，重啟即清空

# 3. 檢查確認
ps aux | grep server-bootstrap.js | grep -v grep  # 應該無輸出
```

---

**測試時間**：約 15-20 分鐘（包含環境準備）
**成功標準**：完整執行 Phase 2-4，所有步驟輸出符合預期

Good luck! 🚀
