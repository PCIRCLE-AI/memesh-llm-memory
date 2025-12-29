# 🚀 Smart Agents 設置指南 (V2.0 MCP Server Pattern)

## V2.0 MCP Server 設置（當前實現）

### 步驟 1: 安裝依賴

```bash
# Clone repository
git clone <your-repo-url> smart-agents
cd smart-agents

# 安裝 Node.js 依賴
npm install
```

### 步驟 2: 編譯 TypeScript

```bash
npm run build
```

### 步驟 3: 配置 Claude Code MCP Server

編輯 `~/.claude/mcp_settings.json`，添加 smart-agents MCP server：

```json
{
  "mcpServers": {
    "smart-agents": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/smart-agents",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**重要**: 將 `/path/to/smart-agents` 替換為實際的專案路徑。

### 步驟 4: （可選）配置 RAG Agent

如果要使用 RAG agent，需要配置 OpenAI API key 用於 embeddings：

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env，只需填入 RAG 相關配置
nano .env
```

在 `.env` 中添加：

```bash
# OpenAI API (僅用於 RAG embeddings)
OPENAI_API_KEY=sk-your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector DB 路徑（可選）
VECTRA_INDEX_PATH=~/.smart-agents/vectra
```

**如果不使用 RAG agent**，可以跳過此步驟，甚至不需要 .env 文件。

### 步驟 5: 重啟 Claude Code

重啟 Claude Code，MCP server 會自動啟動。

### 步驟 6: 驗證安裝

在 Claude Code 中測試：

```
請使用 smart-agents 的 code-reviewer 來審查這段代碼...
```

---

## 驗證清單 (V2.0)

- [ ] Node.js >= 18 已安裝
- [ ] 專案依賴已安裝（`npm install`）
- [ ] TypeScript 已編譯（`npm run build`）
- [ ] MCP server 已配置在 `~/.claude/mcp_settings.json`
- [ ] Claude Code 已重啟
- [ ] （可選）RAG Agent 的 OpenAI API key 已配置

## 常見問題 (V2.0)

### Q: MCP server 無法啟動

**解決方案**：
1. 檢查 `~/.claude/mcp_settings.json` 路徑是否正確
2. 確認 `npm run build` 已成功執行
3. 檢查 Claude Code 日誌：`~/.claude/logs/`
4. 嘗試手動運行：`npm run mcp`

### Q: 找不到 smart-agents tools

**解決方案**：
1. 確認 Claude Code 已重啟
2. 檢查 MCP server 狀態
3. 嘗試在 Claude Code 中執行：`/mcp list`

### Q: RAG Agent embedding 失敗

**解決方案**：
1. 確認 `.env` 中的 `OPENAI_API_KEY` 已配置
2. 檢查 API key 是否有效
3. 確認 OpenAI API 配額未用盡
4. 檢查 `VECTRA_INDEX_PATH` 目錄權限

### Q: 記憶體不足

**解決方案**：
1. 關閉其他應用程式
2. 增加 Node.js 記憶體限制：`NODE_OPTIONS="--max-old-space-size=4096" npm run mcp`

## 系統需求

### 最低需求
- **Node.js**: >= 18.0.0
- **Claude Code**: 已安裝
- **RAM**: 2 GB（V2.0 MCP server 很輕量）
- **硬碟**: 5 GB 可用空間

### 推薦配置
- **Node.js**: >= 20.0.0
- **Claude Code**: 最新版本
- **RAM**: 4+ GB
- **硬碟**: 20+ GB SSD（如使用 RAG agent）
- **網路**: 穩定連接（Claude Code → Claude API）

## 下一步

配置完成後，查看：
- [RAG 部署指南](./RAG_DEPLOYMENT.md) - RAG Agent 詳細部署
- [使用指南](./USAGE.md) - 如何使用各種 agents
- [架構文檔](../../ARCHITECTURE.md) - 系統架構說明
- [Evolution 系統](../EVOLUTION.md) - Self-learning 機制
