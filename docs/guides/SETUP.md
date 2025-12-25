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
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ChromaDB (默認配置即可)
CHROMA_HOST=localhost
CHROMA_PORT=8000

# 成本控制
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8
```

## 步驟 2: 啟動 ChromaDB

### 選項 A: 使用 Docker（推薦）

```bash
# 啟動 ChromaDB 容器
docker run -d -p 8000:8000 --name chroma chromadb/chroma

# 驗證運行
curl http://localhost:8000/api/v1/heartbeat
```

### 選項 B: 本地安裝

```bash
# 安裝 ChromaDB
pip install chromadb

# 啟動伺服器
python -m chromadb.server --host localhost --port 8000
```

## 步驟 3: 測試配置

```bash
# 運行測試腳本
npm run test:config
```

## 步驟 4: 啟動 Smart Agents

```bash
# 開發模式
npm run dev

# 生產模式
npm run build
npm start
```

## 驗證清單

- [ ] Claude API key 已配置且有效
- [ ] OpenAI API key 已配置且有效
- [ ] ChromaDB 正在運行（`http://localhost:8000`）
- [ ] 環境變數已正確設置
- [ ] 所有依賴已安裝（`npm install`）

## 常見問題

### Q: API key 無效

**解決方案**：
1. 檢查 key 是否正確複製（無多餘空格）
2. 確認 key 未過期
3. 檢查 API 配額是否用完

### Q: ChromaDB 連接失敗

**解決方案**：
1. 確認 Docker 容器正在運行：`docker ps | grep chroma`
2. 檢查端口是否被佔用：`lsof -i :8000`
3. 重啟容器：`docker restart chroma`

### Q: 記憶體不足

**解決方案**：
1. 關閉其他應用程式
2. 調整 `.env` 中的 `MAX_MEMORY_MB`
3. 使用更輕量的模型（Haiku 替代 Sonnet）

## 下一步

配置完成後，查看：
- [使用指南](./USAGE.md) - 如何使用各種 agents
- [架構文檔](./ARCHITECTURE.md) - 系統架構說明
- [API 文檔](./API.md) - API 參考
