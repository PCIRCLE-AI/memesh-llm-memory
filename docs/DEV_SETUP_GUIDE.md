# MeMesh 開發版本設置指南

## ✅ 已完成的設置

### 1. 項目 Build
```bash
✅ npm run build - 完成
✅ dist/ 目錄已生成
```

### 2. A2A Protocol 配置
```bash
✅ A2A Token 已生成: 23a74a1be2320dc507dd3b2a0695d76885a8f15f8066465eeca3cf2dd10ac8a5
✅ .env 文件已更新
✅ Timeout: 30 seconds
✅ Poll Interval: 5 seconds
```

### 3. Claude Code MCP 配置
```bash
✅ Config 位置: ~/Library/Application Support/Claude/claude_desktop_config.json
✅ MCP Server: memesh-mcp (開發版本)
✅ 指向: /Users/ktseng/Developer/Projects/claude-code-buddy/dist/mcp/server-bootstrap.js
```

---

## 🚀 如何啟動

### 方法 1：從 Claude Code 啟動（推薦）

1. **重啟 Claude Code/Desktop**
   ```bash
   # 完全關閉並重新開啟 Claude Code
   # MCP server 會自動啟動
   ```

2. **驗證 MCP 連接**
   - 打開 Claude Code
   - 檢查是否顯示 "memesh-mcp" MCP server 連接成功
   - 可以使用 MCP 工具（例如 `buddy-help`）

### 方法 2：手動啟動（用於測試）

```bash
# 在項目目錄中
cd /Users/ktseng/Developer/Projects/claude-code-buddy

# 啟動 MCP server（獨立模式）
npm run mcp

# 應該看到：
# [INFO] MeMesh MCP Server starting...
# [INFO] A2A Server listening on http://localhost:3000
# [INFO] Token authentication enabled
# [INFO] MCP Server ready
```

---

## 🧪 測試新的 A2A Protocol 功能

### 功能 1：A2A 任務委派（MCP Client Delegation）

**可用的 MCP 工具**：
```
- a2a-send-task      - 發送任務給其他 agent
- a2a-get-task       - 獲取任務狀態
- a2a-list-tasks     - 列出所有任務
- a2a-list-agents    - 列出可用的 agents
- a2a-report-result  - 報告任務結果
```

**測試場景 1：發送簡單任務**

在 Claude Code 中嘗試：
```
使用 a2a-send-task 工具發送一個測試任務：
{
  "message": {
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Calculate 2+2"
      }
    ]
  }
}
```

**測試場景 2：查詢任務狀態**

```
使用 a2a-list-tasks 工具查看所有 pending 任務
```

**測試場景 3：報告任務結果**

```
使用 a2a-report-result 報告任務完成：
{
  "taskId": "<從 a2a-send-task 獲得的 taskId>",
  "result": "The answer is 4",
  "success": true
}
```

---

## 🔍 驗證功能運作

### 1. 檢查 A2A Server 是否運行

```bash
# 測試 A2A HTTP endpoint
curl -X GET http://localhost:3000/health

# 應該返回：
# {"status":"healthy","timestamp":"..."}
```

### 2. 測試認證

```bash
# 使用正確的 token
curl -X POST http://localhost:3000/a2a/send-message \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 23a74a1be2320dc507dd3b2a0695d76885a8f15f8066465eeca3cf2dd10ac8a5' \
  -d '{
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Test task"}]
    }
  }'

# 應該返回：
# {"success":true,"data":{"taskId":"...","status":"SUBMITTED"}}
```

### 3. 測試錯誤處理

```bash
# 使用錯誤的 token（應該返回 401）
curl -X POST http://localhost:3000/a2a/send-message \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wrong-token' \
  -d '{
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Test task"}]
    }
  }'

# 應該返回：
# {"code":"AUTH_INVALID","error":"Invalid authentication token"}
```

---

## 📊 查看日誌

### MCP Server 日誌
```bash
# 在啟動 MCP server 的終端中查看日誌
# 或者檢查 Claude Code 的 MCP 日誌

# macOS 日誌位置：
~/Library/Logs/Claude/mcp*.log
```

### A2A Server 日誌
```bash
# 查看 A2A 相關日誌
grep "A2A" ~/Library/Logs/Claude/mcp*.log
```

---

## 🎯 新功能亮點（Phase 1.0）

### ✅ 已實現的功能

1. **MCP Client Delegation**
   - 通過 MCP tools 委派任務給其他 agents
   - 完整的任務生命週期管理（SUBMITTED → PENDING → IN_PROGRESS → COMPLETED/FAILED）

2. **安全機制**
   - Bearer token 認證
   - 常數時間比較（防止 timing attack）
   - Request timeout（30 秒，防止 DoS）
   - Rate limiting（per-agent token bucket）

3. **可靠性**
   - Exponential backoff with jitter（智能重試）
   - Transaction safety（資料一致性）
   - Circuit breaker（錯誤恢復）
   - Timeout detection（自動清理）

4. **性能優化**
   - O(1) 任務查詢（Map 索引）
   - Prepared statement caching（SQLite）
   - 47x 性能提升（getPendingTasks）
   - 分散式追蹤（AsyncLocalStorage）

5. **完整測試**
   - 2020 個測試全部通過
   - E2E 測試（happy path + failure scenarios）
   - Race condition 測試
   - Performance benchmarks

---

## 🐛 故障排除

### 問題 1：MCP Server 無法啟動

**症狀**：Claude Code 顯示 MCP server 連接失敗

**解決方案**：
```bash
# 1. 檢查 dist/ 目錄是否存在
ls -la /Users/ktseng/Developer/Projects/claude-code-buddy/dist/

# 2. 重新 build
cd /Users/ktseng/Developer/Projects/claude-code-buddy
npm run build

# 3. 測試直接啟動
npm run mcp

# 4. 檢查錯誤日誌
cat ~/Library/Logs/Claude/mcp-memesh-mcp*.log
```

### 問題 2：A2A 工具不可用

**症狀**：Claude Code 中看不到 a2a-* 工具

**解決方案**：
```bash
# 1. 確認 MCP server 正在運行
ps aux | grep "server-bootstrap.js"

# 2. 重啟 Claude Code

# 3. 檢查 MCP 工具列表
# 在 Claude Code 中應該看到 18 個工具，包括 5 個 A2A 工具
```

### 問題 3：認證失敗

**症狀**：401 Unauthorized 錯誤

**解決方案**：
```bash
# 1. 檢查 .env 中的 token
grep MEMESH_A2A_TOKEN /Users/ktseng/Developer/Projects/claude-code-buddy/.env

# 2. 重新生成 token
cd /Users/ktseng/Developer/Projects/claude-code-buddy
bash scripts/generate-a2a-token.sh

# 3. 重啟 MCP server
```

---

## 📚 相關文檔

- **[A2A Setup Guide](./A2A_SETUP_GUIDE.md)** - 完整的 A2A Protocol 設置指南
- **[A2A Performance](./A2A_PERFORMANCE.md)** - 性能分析與 benchmarks
- **[COMMANDS.md](./COMMANDS.md)** - 所有 A2A 工具的詳細說明
- **[API Reference](./api/API_REFERENCE.md)** - API 文檔

---

## 🎉 開始試用！

現在您已經完成了所有設置，可以：

1. **重啟 Claude Code**
2. **檢查 memesh-mcp MCP server 連接狀態**
3. **試用新的 a2a-* 工具**
4. **體驗 Agent-to-Agent 協作功能**

有任何問題隨時告訴我！ 🚀
