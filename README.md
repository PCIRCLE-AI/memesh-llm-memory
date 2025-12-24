# 🤖 Smart Agents

**智能 AI Agent 生態系統** - 基於 Claude Sonnet 4.5 和雲端優先架構

## 📋 專案概述

Smart Agents 是一個高性能、模組化的 AI Agent 協調平台，專為 MacBook Pro M2 (16GB RAM) 優化。

### 核心能力

- 🎯 **智能 Orchestrator** - 自動路由任務到最適合的 agent
- 🎙️ **Voice AI** - 語音轉文字和文字轉語音（OpenAI Whisper + TTS）
- 🧠 **Advanced RAG** - 向量資料庫驅動的知識檢索（ChromaDB）
- 🤝 **Multi-Agent 協作** - 專業化 agent teams
- 💾 **Knowledge Graph** - 持久化記憶系統（MCP Memory）

### 技術棧

**核心 AI 模型**:
- Claude Sonnet 4.5 (主力) - 日常開發和代碼生成
- Claude Opus 4.5 (特殊場景) - 複雜推理和創意寫作
- OpenAI GPT-4 (備選) - 多模態任務
- OpenAI Whisper (語音) - 語音轉文字
- OpenAI TTS (語音) - 文字轉語音

**基礎設施**:
- ChromaDB - 本地向量資料庫
- MCP (Model Context Protocol) - Agent 整合框架
- Node.js / TypeScript - 開發語言

**已整合的 MCP Servers**:
- Memory MCP - 知識圖譜
- Perplexity MCP - 深度搜尋
- Playwright MCP - E2E 測試
- Semgrep MCP - 代碼安全掃描
- GitLab MCP - 專案管理

## 🚀 快速開始

### 前置需求

- macOS (M2 Pro 或更高)
- Node.js 18+
- Python 3.9+
- Docker (可選，用於 ChromaDB)

### 安裝

```bash
# Clone repository
git clone <your-repo-url> smart-agents
cd smart-agents

# 安裝依賴
npm install

# 設置環境變數
cp .env.example .env
# 編輯 .env，填入你的 API keys
```

### 配置 API Keys

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-xxx  # Claude API
OPENAI_API_KEY=sk-xxx          # OpenAI API (Whisper, TTS, Embeddings)
```

### 啟動

```bash
# 啟動 ChromaDB (Docker)
docker run -d -p 8000:8000 --name chroma chromadb/chroma

# 或使用本地安裝
pip install chromadb
python -m chromadb.server

# 啟動 Smart Agents
npm run dev
```

## 📁 專案結構

```
smart-agents/
├── src/
│   ├── orchestrator/      # 核心 Agent Orchestrator
│   ├── agents/            # 各種專業 agents
│   │   ├── voice/         # Voice AI agent
│   │   ├── rag/           # RAG agent
│   │   ├── code/          # Code review agent
│   │   └── research/      # Research agent
│   ├── mcp/               # MCP 整合
│   ├── utils/             # 工具函數
│   └── config/            # 配置文件
├── skills/                # Claude Code skills
├── tests/                 # 測試
├── docs/                  # 文檔
├── .env.example           # 環境變數範本
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 開發路線圖

### Week 1 ✅
- [x] 專案初始化
- [ ] Agent Orchestrator 核心
- [ ] Voice AI 整合 (Whisper + TTS)
- [ ] ChromaDB RAG 基礎

### Month 1
- [ ] Multi-Agent 協作框架
- [ ] 第一個專業 team: System Architecture Team
- [ ] 監控與成本追蹤
- [ ] 完整測試覆蓋

### Month 2-3
- [ ] 3-5 個專業 agent teams
- [ ] Self-Evolving Agent 機制
- [ ] 性能優化與基準測試
- [ ] 完整文檔

## 💰 成本估算

**預期月費** (保守使用):
- Claude API: $15-25
- OpenAI API: $10-20
- ChromaDB: $0 (本地)
- **總計**: ~$30-50/月

## 🤝 貢獻

歡迎提交 PR 和 Issues！

## 📄 授權

MIT License

---

**建立日期**: 2025-12-24
**優化目標**: MacBook Pro M2 (16GB RAM) 流暢運行