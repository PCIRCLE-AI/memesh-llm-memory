# 🚀 Smart Agents 設置指南

## 步驟 1: API Keys 配置

### Claude API (Anthropic)

1. 訪問 https://console.anthropic.com/settings/keys
2. 創建新的 API key
3. 複製 key（格式：`sk-ant-api03-xxxxx`）

### OpenAI API

1. 訪問 https://platform.openai.com/api-keys
2. 創建新的 API key
3. 複製 key（格式：`sk-xxxxx`）

### 設置環境變數

```bash
# 複製範本文件
cp .env.example .env

# 編輯 .env 文件，填入你的 API keys
nano .env
```

在 `.env` 文件中填入：

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# OpenAI API
OPENAI_API_KEY=sk-your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# 成本控制
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8
```

**就這樣！** 向量資料庫（Vectra）是純 Node.js 實現，會自動創建在 `data/vectorstore/`，無需額外配置。

## 步驟 2: 安裝依賴

```bash
# 安裝 Node.js 依賴
npm install
```

## 步驟 3: 測試配置

```bash
# 運行測試腳本
npm test
```

## 步驟 4: 啟動 Smart Agents

```bash
# 開發模式
npm run dev

# 運行特定 agent
npm run rag          # RAG Agent
npm run orchestrator # Orchestrator
npm run dashboard    # Monitoring Dashboard

# 生產模式
npm run build
npm start
```

## 驗證清單

- [ ] Claude API key 已配置且有效
- [ ] OpenAI API key 已配置且有效
- [ ] 環境變數已正確設置
- [ ] 所有依賴已安裝（`npm install`）
- [ ] 測試通過（`npm test`）

## 常見問題

### Q: API key 無效

**解決方案**：
1. 檢查 key 是否正確複製（無多餘空格）
2. 確認 key 未過期
3. 檢查 API 配額是否用完

### Q: 向量資料庫初始化失敗

**解決方案**：
1. 確認 `data/` 目錄有寫入權限
2. 檢查磁碟空間：`df -h`
3. 如果資料損毀，刪除並重建：`rm -rf data/vectorstore/`

### Q: 記憶體不足

**解決方案**：
1. 關閉其他應用程式
2. 調整 `.env` 中的 `MAX_MEMORY_MB`
3. 增加 Node.js 記憶體限制：`NODE_OPTIONS="--max-old-space-size=4096" npm run dev`

### Q: Embedding API 速率限制

**解決方案**：
1. 減少批次大小（在代碼中調整 `batchSize` 和 `maxConcurrent`）
2. 等待速率限制重置（通常 1 分鐘）
3. 升級 OpenAI API plan

## 系統需求

### 最低需求
- **Node.js**: >= 18.0.0
- **RAM**: 4 GB
- **硬碟**: 10 GB 可用空間

### 推薦配置
- **Node.js**: >= 20.0.0
- **RAM**: 8+ GB
- **硬碟**: 50+ GB SSD
- **網路**: 穩定連接（OpenAI/Anthropic API）

## 下一步

配置完成後，查看：
- [RAG 部署指南](./RAG_DEPLOYMENT.md) - RAG Agent 詳細部署
- [使用指南](./USAGE.md) - 如何使用各種 agents
- [架構文檔](./ARCHITECTURE.md) - 系統架構說明
- [API 文檔](./API.md) - API 參考
