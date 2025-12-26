# 🤖 Smart Agents

**智能 AI Agent 生態系統** - 基於 Claude Sonnet 4.5 和雲端優先架構

## 📋 專案概述

Smart Agents 是一個高性能、模組化的 AI Agent 協調平台，專為 MacBook Pro M2 (16GB RAM) 優化。

### 核心能力

- 🎯 **智能 Orchestrator** - 自動路由任務到最適合的 agent
- 🧠 **Advanced RAG** - 向量資料庫驅動的知識檢索（Vectra 本地存儲）
- 🤝 **Multi-Agent 協作** - 專業化 agent teams 協同工作（✅ Month 1）
- 💾 **Knowledge Graph** - 持久化記憶系統（MCP Memory）
- 📊 **Real-time Dashboard** - 系統監控與成本追蹤（✅ Month 1）
- 🏗️ **Architecture Team** - 系統架構分析與建議（✅ Month 1）

### ✅ Month 1 完成功能（2025-12-24）

1. **Multi-Agent Collaboration Framework**
   - Event-driven messaging system (MessageBus)
   - Team-based task coordination (TeamCoordinator)
   - Capability matching and automatic team selection
   - Performance metrics tracking

2. **System Architecture Team**
   - Architecture analysis agent with 3 capabilities
   - Senior, Security, and Performance specialized agents
   - Complete working demo with collaborative analysis

3. **Testing Framework**
   - Vitest integration with 58+ passing tests
   - ≥80% code coverage for core modules
   - Comprehensive test documentation

4. **Monitoring Dashboard**
   - Real-time system resource monitoring
   - Cost tracking and budget visualization
   - Agent and team status display
   - Auto-refresh web UI on port 3001

### 技術棧

**核心 AI 模型** (智能路由 - 5 提供商協作):

**本地模型** (Ollama - $0 成本):
- qwen2.5-coder:14b - 代碼審查、重構建議 (complexity 1-7)
- qwen2.5:14b - 通用文字任務 (complexity 1-5)
- llama3.2:1b - 超快簡單任務 (complexity 1-2)

**雲端模型** (智能配額管理):
- Claude Sonnet 4.5 - 複雜代碼、創意寫作 (complexity 8-10)
- Claude Opus 4.5 - 最複雜推理任務 (complexity 9-10)
- ChatGPT (GPT-4) - 中等代碼生成、測試撰寫 (complexity 6-7)
- Grok (xAI) - 中等推理、創意任務 (complexity 6-8)
- Gemini 2.5 Flash - 多模態任務 (vision, audio, video) - FREE tier

**基礎設施**:
- Vectra - 本地向量資料庫
- MCP (Model Context Protocol) - Agent 整合框架
- Node.js / TypeScript - 開發語言

**已整合的 MCP Servers**:
- Memory MCP - 知識圖譜
- Perplexity MCP - 深度搜尋
- Playwright MCP - E2E 測試
- Semgrep MCP - 代碼安全掃描
- GitLab MCP - 專案管理

## 🎯 智能路由與配額管理

### 五層架構 (Five-Layer Architecture)

```
Layer 5: User Interface
    Claude Code (existing) + Smart Agents MCP Server
    │
    ↓
Layer 4: Skills Coordination Layer
    Multi-model agent orchestration
    │
    ↓
Layer 3: Smart Router (Quota-Aware)
    Complexity analysis (1-10 scale)
    Quota checking across 5 providers
    │
    ↓
Layer 2: Quota Manager
    Real-time usage tracking (daily/monthly limits)
    Provider availability monitoring
    │
    ↓
Layer 1: Provider Integration
    Ollama | Gemini | Claude | Grok | ChatGPT
```

### 智能路由規則

| 任務類型 | Complexity | 首選提供商 | 理由 |
|---------|-----------|----------|------|
| 簡單代碼 | 1-5 | Ollama (qwen2.5-coder) | 本地快速，$0 成本 |
| 中等代碼 | 6-7 | ChatGPT (GPT-4) | 擅長代碼生成 |
| 複雜代碼 | 8-10 | Claude Sonnet/Opus | 最佳推理能力 |
| 中等推理 | 1-8 | Grok | 專精推理任務 |
| 複雜推理 | 9-10 | Claude Opus | 最強推理 |
| 多模態 | any | Gemini FREE tier | 支援 vision/audio/video |

### 三層故障轉移 (Three-Tier Failover)

1. **Tier 1**: 根據任務類型和複雜度選擇最佳提供商
2. **Tier 2**: 如配額不足，使用 QuotaManager 建議的替代方案
3. **Tier 3**: 所有雲端提供商不可用時，fallback 到本地 Ollama ($0 成本)

### 配額管理

- **每日/每月限制**: 每個提供商獨立追蹤使用量
- **自動重置**: 每日午夜、每月月初自動重置計數器
- **持久化儲存**: 跨 session 保留配額數據 (localStorage/文件系統)
- **即時監控**: 每次 API 調用前檢查可用配額

## 🚀 快速開始

### 前置需求

- macOS (M2 Pro 或更高)
- Node.js 18+
- Python 3.9+

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

# ====================================
# Claude API (必需)
# ====================================
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# ====================================
# OpenAI API (Code)
# ====================================
OPENAI_API_KEY=sk-xxxxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_CODE_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ====================================
# Grok API (xAI)
# ====================================
GROK_API_KEY=xai-xxxxx
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1

# ====================================
# Gemini API (Google AI Studio)
# ====================================
GOOGLE_API_KEY=xxxxx

# ====================================
# API 配額限制 (Quota Limits)
# ====================================
# 每日/每月請求限制

# Grok 配額
GROK_DAILY_LIMIT=100
GROK_MONTHLY_LIMIT=3000

# ChatGPT 配額
CHATGPT_DAILY_LIMIT=200
CHATGPT_MONTHLY_LIMIT=6000

# Claude 配額
CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500

# Gemini 配額 (FREE tier: 每天數千次)
GEMINI_DAILY_LIMIT=10000
GEMINI_MONTHLY_LIMIT=300000

# Ollama 配額 (本地無限制)
OLLAMA_DAILY_LIMIT=999999
OLLAMA_MONTHLY_LIMIT=999999

# ====================================
# 智能路由偏好 (Smart Routing)
# ====================================
DEFAULT_TEXT_PROVIDER=ollama
DEFAULT_CODE_PROVIDER=ollama
DEFAULT_MULTIMODAL_PROVIDER=gemini
DEFAULT_REASONING_PROVIDER=claude
FALLBACK_PROVIDER=ollama  # 最後備用 (本地、免費、無限)
```

### 啟動

```bash
# 啟動 Smart Agents
npm run dev
```

### 使用範例

```bash
# 運行測試
npm test

# 啟動 Agent Orchestrator (CLI Demo)
npm run orchestrator

# 啟動監控 Dashboard
npm run dashboard
# 開啟瀏覽器訪問 http://localhost:3001

# 運行 Architecture Team Demo
npm run demo:architecture

# RAG Agent (Vectra Demo)
npm run rag

# 編譯專案
npm run build

# 啟動生產環境
npm start
```

## 📁 專案結構

```
smart-agents/
├── src/
│   ├── orchestrator/         # 核心 Agent Orchestrator
│   ├── agents/               # 各種專業 agents
│   │   ├── architecture/     # 🏗️ Architecture analysis agent (Month 1)
│   │   ├── rag/              # RAG agent
│   │   ├── code/             # Code review agent
│   │   └── research/         # Research agent
│   ├── collaboration/        # 🤝 Multi-agent collaboration framework (Month 1)
│   │   ├── MessageBus.ts     # Event-driven messaging
│   │   ├── TeamCoordinator.ts # Team management
│   │   └── CollaborationManager.ts # Main API
│   ├── dashboard/            # 📊 Monitoring dashboard (Month 1)
│   │   ├── server.ts         # Express API server
│   │   └── public/           # Web UI
│   ├── mcp/                  # MCP 整合
│   ├── utils/                # 工具函數
│   └── config/               # 配置文件
├── docs/                     # 文檔
│   ├── TESTING.md            # 測試指南 (Month 1)
│   └── MONTH_1_COMPLETION.md # Month 1 完成報告
├── .env.example              # 環境變數範本
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 開發路線圖

### Week 1 ✅
- [x] 專案初始化
- [x] Agent Orchestrator 核心
- [x] Vectra RAG 基礎

### Month 1 ✅ (2025-12-24)
- [x] Multi-Agent 協作框架
- [x] 第一個專業 team: System Architecture Team
- [x] 監控與成本追蹤
- [x] 完整測試覆蓋 (58+ passing tests, ≥80% coverage)

### Month 2-3 (進行中)
- [x] **4 個專業 agent teams** ✅ (2025-12-26)
  - [x] Code Development Team - 代碼開發
  - [x] Research & Analysis Team - 研究分析
  - [x] Quality Assurance Team - 品質保證
  - [x] Orchestration & Optimization Team - 編排優化
  - [x] 完整測試覆蓋 (74+ passing tests)
  - [x] 團隊選擇指南與協作框架
- [x] **Self-Evolving Agent 機制** ✅ (2025-12-26)
  - [x] PerformanceTracker - 性能監控與異常檢測
  - [x] LearningManager - 模式識別與知識萃取
  - [x] AdaptationEngine - 動態行為調整
  - [x] 完整測試覆蓋 (22/22 passing tests)
- [ ] 性能優化與基準測試
- [ ] 完整文檔

## 💰 成本估算

### 智能路由優化後成本 (40% 節省)

**預期月費** (保守使用，含智能路由優化):
- Claude API: $8-15 (↓ 47%, 複雜任務專用)
- OpenAI API: $5-12 (↓ 40%, 語音 + 中等代碼)
- Grok API: $3-8 (中等推理任務)
- Gemini API: $0 (FREE tier, 10,000 次/日)
- Ollama: $0 (本地運行，60% 簡單任務)
- Vectra: $0 (本地)
- **總計**: ~$20-35/月 (↓ 40% vs 單一提供商)

### 成本優化策略

- ✅ **60% 簡單任務** → 本地 Ollama ($0)
- ✅ **多模態任務** → Gemini FREE tier ($0)
- ✅ **配額感知路由** → 避免超額費用
- ✅ **三層故障轉移** → 確保服務連續性

## 🤝 貢獻

歡迎提交 PR 和 Issues！

## 📄 授權

MIT License

---

**建立日期**: 2025-12-24
**優化目標**: MacBook Pro M2 (16GB RAM) 流暢運行