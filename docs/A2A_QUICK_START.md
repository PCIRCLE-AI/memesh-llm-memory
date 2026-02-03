# A2A 通訊快速啟動卡片 🚀

## ✅ 當前狀態

```
✓ A2A Token: Configured (173 chars)
✓ Task Timeout: 30,000ms (30 秒)
✓ Poll Interval: 5,000ms (5 秒)
✓ Running Sessions: 3 個 Claude Code instances
✓ A2A Tools: Compiled and ready
```

---

## 🎯 5 分鐘快速測試

### Session 1 (發送端)

```typescript
// Step 1: 列出可用 agents
mcp__memesh__a2a-list-agents({ status: "active" })
// 記下你想發送任務的 target agent ID

// Step 2: 發送任務
mcp__memesh__a2a-send-task({
  targetAgentId: "ccb-mcp-xxxxx",  // 從 Step 1 獲取
  taskDescription: "Hello from Session 1! 請回覆收到",
  priority: "normal"
})
// 記下返回的 taskId
```

### Session 2 (接收端)

```typescript
// Step 3: 列出待處理任務
mcp__memesh__a2a-list-tasks({ state: "SUBMITTED" })
// 應該看到 Session 1 發來的任務

// Step 4: 報告完成（執行完任務後）
mcp__memesh__a2a-report-result({
  taskId: "task-abc123",  // 從 Step 3 獲取
  result: "Message received! 👋",
  success: true
})
```

### Session 1 (驗證)

```typescript
// Step 5: 查詢任務狀態
mcp__memesh__a2a-get-task({
  targetAgentId: "ccb-mcp-xxxxx",
  taskId: "task-abc123"
})
// 應該看到 status: "COMPLETED" 和 Session 2 的回覆
```

---

## 🔧 可用的 MCP 工具

| 工具名稱 | 用途 | 使用位置 |
|---------|------|---------|
| `a2a-list-agents` | 列出所有可用的 agents | 任何 session |
| `a2a-send-task` | 發送任務給其他 agent | 發送端 |
| `a2a-list-tasks` | 列出分配給我的任務 | 接收端 |
| `a2a-report-result` | 報告任務執行結果 | 接收端 |
| `a2a-get-task` | 查詢任務狀態 | 任何 session |

---

## 📊 任務狀態流程

```
SUBMITTED → WORKING → COMPLETED
     ↓
  FAILED / CANCELED / REJECTED
```

---

## 🚨 快速問題排除

### 找不到 agents？
```bash
# 確認 MeMesh servers 運行中
ps aux | grep server-bootstrap.js | grep -v grep

# 應該看到至少 2 個進程
# 如果沒有，重啟 Claude Code
```

### Token 認證失敗？
```bash
# 確認 token 已設置
cat .env | grep MEMESH_A2A_TOKEN

# 重啟 Claude Code 載入環境變數
```

### 任務超時？
```bash
# 增加 timeout（編輯 .env）
MEMESH_A2A_TASK_TIMEOUT=60000  # 60 秒

# 重啟 Claude Code
```

---

## 📖 完整文檔

- **詳細測試指南**: `docs/A2A_TESTING_GUIDE.md`
- **架構文檔**: `docs/features/a2a-agent-collaboration.md`
- **Setup 指南**: `docs/A2A_SETUP_GUIDE.md`
- **驗證腳本**: `bash scripts/test-a2a-setup.sh`

---

## 💡 實用技巧

### Tip 1: 識別 Agent IDs
```typescript
// Agent IDs 格式：ccb-mcp-{random}
// 例：ccb-mcp-a1b2c3d4
// 使用 a2a-list-agents 獲取準確 ID
```

### Tip 2: 任務優先級
```typescript
priority: "low"     // 低優先級
priority: "normal"  // 一般（默認）
priority: "high"    // 高優先級
priority: "urgent"  // 緊急
```

### Tip 3: 任務狀態篩選
```typescript
// 只列出特定狀態的任務
a2a-list-tasks({ state: "SUBMITTED" })   // 新任務
a2a-list-tasks({ state: "WORKING" })     // 進行中
a2a-list-tasks({ state: "COMPLETED" })   // 已完成
a2a-list-tasks({ state: "FAILED" })      // 失敗
```

### Tip 4: 批量處理
```typescript
// 使用 limit 和 offset 分頁處理大量任務
a2a-list-tasks({
  state: "SUBMITTED",
  limit: 10,
  offset: 0
})
```

---

## 🎓 進階場景

### Multi-Agent Workflow
```
Session 1 → Session 2 (Frontend task)
         ↓
         → Session 3 (Backend task)
         ↓
         → Session 4 (Testing task)
```

### Error Handling
```typescript
// 報告任務失敗
a2a-report-result({
  taskId: "task-xyz",
  result: "",
  success: false,
  error: "Specific error message here"
})
```

---

**準備好了嗎？** 開始測試吧！🎉

```bash
# 1. 確認環境
bash scripts/test-a2a-setup.sh

# 2. 閱讀完整指南
cat docs/A2A_TESTING_GUIDE.md

# 3. 開始測試！
```
