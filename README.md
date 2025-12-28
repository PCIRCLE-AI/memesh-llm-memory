# 🤖 Smart Agents

**智能 AI Agent 生態系統** - MCP Server Pattern with Self-Evolving Agents

## 📋 專案概述

Smart Agents 是一個專業化的 AI Agent 系統，透過 **MCP (Model Context Protocol)** 整合到 Claude Code，提供 22 個自我優化的專業 agents。

### 🎯 V2.0 核心能力（當前實現 - MCP Server Pattern）

- ✅ **22 個專業化 Agents** - 基於任務能力智能路由（code-review → code-reviewer）
- ✅ **Prompt Enhancement Mode** - 生成針對特定 agent 優化的 prompts
- ✅ **Self-Evolving 系統** - 自動學習並優化 agent 行為（已完整實現並測試）
- ✅ **Evolution Dashboard** - 監控所有 22 agents 的學習進度（透過 MCP）
- ✅ **Claude Code 整合** - MCP server 實現（已實現，待部署）
- ✅ **完整測試覆蓋** - 457 passing tests（單元、整合、E2E、回歸、性能）

### 📋 V3.0 規劃中功能（配置已準備，邏輯未實現）

- 🔄 **Multi-Provider Routing** - 自動路由到 Ollama/Claude/ChatGPT/Grok/Gemini
- 🔄 **智能成本優化** - 40% 成本節省（理論估算，未實際驗證）
- 🔄 **配額感知路由** - 基於用量自動切換 provider
- 🔄 **本地 Ollama 整合** - 60% 簡單任務本地執行

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
   - Vitest integration with 157+ passing tests (58 core + 16 teams + 22 evolution Phase 1-2 + 45 evolution Phase 3 + 16 collaboration)
   - ≥80% code coverage for core modules
   - Comprehensive test documentation

4. **Monitoring Dashboard**
   - Real-time system resource monitoring
   - Cost tracking and budget visualization
   - Agent and team status display
   - Auto-refresh web UI on port 3001

5. **Terminal UI Dashboard** (NEW - Phase 3)
   - Real-time progress tracking with animated spinners
   - Attribution transparency (success/error)
   - Productivity metrics (time saved, tokens used)
   - GitHub issue auto-generation for errors
   - Beautiful terminal interface with log-update

### ✅ Month 2-3 完成功能（2025-12-28）

**Phase 4: Evolution Dashboard & Monitoring**
1. **EvolutionMonitor Component**
   - 統一監控所有 22 agents 的演化狀態
   - 儀表板摘要 (總代理數、總模式數、平均成功率)
   - 個別 agent 學習進度追蹤
   - 識別表現最佳和改進最快的 agents
   - 終端友好的美觀格式化輸出

2. **evolution_dashboard MCP Tool**
   - 透過 Claude Code 直接查看演化儀表板
   - 支援 'summary' 和 'detailed' 兩種格式
   - 實時聚合 22 個 agents 的統計數據
   - 整合到 MCP server (smart-agents)

**Phase 5: Testing & Validation Infrastructure**
3. **完整測試套件** (5 層測試覆蓋)
   - **端對端整合測試** (`evolution-e2e.test.ts`)
     - 測試從 routing 到 dashboard 的完整工作流程
     - 驗證 evolution system 各組件整合
   - **性能基準測試** (`evolution-performance.bench.ts`)
     - 確保性能開銷在可接受範圍 (< 100ms routing)
     - 防止性能退化，定義明確的目標指標
   - **回歸測試套件** (`evolution-regression.test.ts`)
     - 確保 API 向後兼容性 (100% coverage)
     - 驗證 22 個 agent 配置穩定性
     - 防止破壞性變更
   - **用戶驗收測試** (`user-acceptance-test.ts`)
     - 5 個真實場景模擬 (Basic Routing, Smart Selection, Dashboard, Learning Progress, Performance Improvement)
     - 80% pass rate 為驗收標準
     - 從用戶視角驗證 UX
   - **自我改進實驗** (`self-improvement-demo.ts`)
     - 3 輪執行展示學習能力 (Baseline → Learning → Improved)
     - 自動生成改進報告
     - 證明演化系統有效性

4. **文檔更新**
   - ✅ `docs/EVOLUTION.md` 更新 (Phase 4 & 5 內容)
   - ✅ `ARCHITECTURE.md` 創建 (完整系統架構文檔)
   - ✅ `README.md` 更新 (evolution dashboard 和測試基礎設施)

### 技術棧

**當前實現（V2.0 - MCP Server Pattern）**:

**核心架構**:
- **AgentRouter** - 基於任務能力路由到 22 個專業 agents
- **PromptEnhancer** - 生成針對特定 agent 優化的 prompts
- **Evolution System** - PerformanceTracker + LearningManager + AdaptationEngine
- **MCP Server** - 透過 Claude Code 調用（使用用戶的 API subscription）

**22 個專業 Agents（6 大類別）**:
- **開發類 (9)**: code-reviewer, test-writer, debugger, refactorer, api-designer, db-optimizer, frontend-specialist, backend-specialist, development-butler
- **研究類 (5)**: rag-agent, research-agent, architecture-agent, data-analyst, performance-profiler
- **知識類 (1)**: knowledge-agent
- **營運類 (2)**: devops-engineer, security-auditor
- **創意類 (2)**: technical-writer, ui-designer
- **工具類 (2)**: migration-assistant, api-integrator
- **通用類 (1)**: general-agent（後備）

**基礎設施**:
- **MCP (Model Context Protocol)** - Agent 整合框架 ✅
- **Node.js / TypeScript** - 開發語言 ✅
- **Vitest** - 測試框架 ✅
- **Evolution Monitoring** - 自我優化系統 ✅

**執行模式**:
- ✅ **Prompt Enhancement Mode**: 返回 enhanced prompts 給 Claude Code
- ✅ **User's API Subscription**: 由 Claude Code 執行，使用用戶的 API keys
- 🔄 **Multi-Provider Routing**: 規劃中（配置已準備，邏輯未實現）

**規劃中的 Provider 整合（V3.0）**:
- 🔄 Ollama - 本地模型執行
- 🔄 Claude API - 複雜推理任務
- 🔄 ChatGPT - 代碼生成
- 🔄 Grok (xAI) - 中等推理
- 🔄 Gemini - 多模態任務

## 🎯 V2.0 智能路由（當前實現）

### MCP Server Pattern 架構

```
Claude Code (MCP Client)
    ↓ stdio transport
Smart-Agents MCP Server
    ├─→ TaskAnalyzer (分析任務類型和複雜度)
    ├─→ AgentRouter (路由到 22 個專業 agents)
    ├─→ PromptEnhancer (生成優化的 prompts)
    └─→ Evolution System (自我學習與優化)
    ↓
返回 Enhanced Prompt
    ↓
Claude Code 執行 (使用用戶的 API subscription)
```

**核心特點**:
- ✅ **基於能力路由**: 根據任務需要的能力（code-review, testing, debugging 等）選擇專業 agent
- ✅ **Prompt 優化**: 為每個 agent 生成針對性優化的 prompts
- ✅ **Self-Learning**: Evolution System 自動學習並優化 agent 行為
- ✅ **成本透明**: 估算理論成本，用戶使用自己的 API subscription

### Agent 路由規則（V2.0）

| 任務能力需求 | 路由到 Agent | Agent 類別 |
|-------------|-------------|----------|
| code-review | code-reviewer | Development |
| testing | test-writer | Development |
| debugging | debugger | Development |
| refactoring | refactorer | Development |
| api-design | api-designer | Development |
| rag-search | rag-agent | Research |
| research | research-agent | Research |
| architecture | architecture-agent | Research |
| data-analysis | data-analyst | Research |
| knowledge-query | knowledge-agent | Knowledge |
| devops | devops-engineer | Operations |
| security | security-auditor | Operations |
| documentation | technical-writer | Creative |
| ui-design | ui-designer | Creative |
| (後備) | general-agent | General |

---

## 🔄 V3.0 規劃：Multi-Provider Routing（未實現）

> **注意**: 以下為 V3.0 規劃功能，配置文件已準備，但路由邏輯尚未實現。

### 五層架構（V3.0 計劃）

<details>
<summary>展開查看 V3.0 架構設計</summary>

```
Layer 5: User Interface
    Claude Code + Smart Agents API Service
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

### 智能路由規則（V3.0 計劃）

| 任務類型 | Complexity | 首選提供商 | 理由 |
|---------|-----------|----------|------|
| 簡單代碼 | 1-5 | Ollama (qwen2.5-coder) | 本地快速，$0 成本 |
| 中等代碼 | 6-7 | ChatGPT (GPT-4) | 擅長代碼生成 |
| 複雜代碼 | 8-10 | Claude Sonnet/Opus | 最佳推理能力 |
| 中等推理 | 1-8 | Grok | 專精推理任務 |
| 複雜推理 | 9-10 | Claude Opus | 最強推理 |
| 多模態 | any | Gemini FREE tier | 支援 vision/audio/video |

### 故障轉移策略（V3.0 計劃）

1. **Tier 1**: 根據任務類型和複雜度選擇最佳提供商
2. **Tier 2**: 如配額不足，使用 QuotaManager 建議的替代方案
3. **Tier 3**: 所有雲端提供商不可用時，fallback 到本地 Ollama

### 配額管理（V3.0 計劃）

- **每日/每月限制**: 每個提供商獨立追蹤使用量
- **自動重置**: 每日午夜、每月月初自動重置計數器
- **持久化儲存**: 跨 session 保留配額數據
- **即時監控**: 每次 API 調用前檢查可用配額

</details>

## 🚀 快速開始

### V2.0 安裝（MCP Server 模式）

**前置需求**:
- **Claude Code**: 已安裝 Claude CLI
- **Node.js**: 18+ (必需)
- **Git**: 用於克隆專案

**安裝步驟**:

```bash
# 1. Clone repository
git clone <your-repo-url> smart-agents
cd smart-agents

# 2. 安裝依賴
npm install

# 3. 編譯 TypeScript
npm run build

# 4. 配置 Claude Code MCP server
# 編輯 ~/.claude/mcp_settings.json，添加:
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

# 5. 重啟 Claude Code
# MCP server 會自動啟動
```

**無需配置 API Keys**:
- ✅ smart-agents 只生成 enhanced prompts
- ✅ Claude Code 使用您自己的 Claude API subscription
- ✅ 不需要 `.env` 文件

---

### V3.0 安裝（獨立服務模式 - 計劃中）

> **注意**: 以下為 V3.0 規劃內容，當前版本不需要。

<details>
<summary>展開查看 V3.0 配置說明</summary>

**前置需求** (V3.0):
- **作業系統**: macOS / Linux / Windows (建議 16GB+ RAM)
- **Node.js**: 18+ (必需)
- **Python**: 3.9+ (選用，用於某些 agents)
- **Ollama** (選用): 本地模型運行

**配置 API Keys** (V3.0):

```bash
# .env 文件（V3.0 才需要）

# ====================================
# Claude API (V3.0 需要)
# ====================================
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# ====================================
# OpenAI API (V3.0 需要)
# ====================================
OPENAI_API_KEY=sk-xxxxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_CODE_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ====================================
# Grok API (V3.0 需要)
# ====================================
GROK_API_KEY=xai-xxxxx
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1

# ====================================
# Gemini API (V3.0 需要)
# ====================================
GOOGLE_API_KEY=xxxxx

# ====================================
# API 配額限制 (V3.0 需要)
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

# 🆕 Terminal UI Dashboard Demo (Phase 3)
npm run demo:dashboard
# Shows live terminal dashboard with real-time progress tracking

# 啟動 Agent Orchestrator (CLI Demo)
npm run orchestrator

# 啟動監控 Dashboard
npm run dashboard
# 開啟瀏覽器訪問 http://localhost:3001

# 運行 Architecture Team Demo
npm run demo:architecture

# RAG Agent Demo
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
│   ├── teams/                # 🤝 Specialized Agent Teams (Month 2-3)
│   │   ├── CodeDevelopmentTeam.ts     # 代碼開發團隊
│   │   ├── ResearchAnalysisTeam.ts    # 研究分析團隊
│   │   ├── QualityAssuranceTeam.ts    # 品質保證團隊
│   │   ├── OrchestrationTeam.ts       # 編排優化團隊
│   │   ├── index.ts                    # Team exports & utilities
│   │   └── teams.test.ts               # Team tests (16/16 ✅)
│   ├── collaboration/        # 🤝 Multi-agent collaboration framework (Month 1)
│   │   ├── MessageBus.ts     # Event-driven messaging
│   │   ├── TeamCoordinator.ts # Team management
│   │   └── CollaborationManager.ts # Main API
│   ├── evolution/            # 🧠 Self-Evolving Agent System (Month 2-3)
│   │   ├── PerformanceTracker.ts  # 性能監控與異常檢測
│   │   ├── LearningManager.ts     # 模式識別與知識萃取
│   │   ├── AdaptationEngine.ts    # 動態行為調整
│   │   ├── types.ts                # Evolution system types
│   │   ├── index.ts                # Evolution exports
│   │   └── evolution.test.ts       # Evolution tests (22/22 ✅)
│   ├── dashboard/            # 📊 Monitoring dashboard (Month 1)
│   │   ├── server.ts         # Express API server
│   │   └── public/           # Web UI
│   ├── mcp/                  # MCP 整合
│   ├── utils/                # 工具函數
│   └── config/               # 配置文件
├── docs/                     # 文檔
│   ├── TESTING.md            # 測試指南 (Month 1)
│   ├── MONTH_1_COMPLETION.md # Month 1 完成報告
│   ├── TEAMS.md              # 專業團隊使用指南 (Month 2-3)
│   └── EVOLUTION.md          # Self-Evolving Agent 系統文檔 (Month 2-3)
├── .env.example              # 環境變數範本
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 開發路線圖

### Week 1 ✅
- [x] 專案初始化
- [x] Agent Orchestrator 核心
- [x] RAG 向量資料庫基礎

### Month 1 ✅ (2025-12-24)
- [x] Multi-Agent 協作框架
- [x] 第一個專業 team: System Architecture Team
- [x] 監控與成本追蹤
- [x] 完整測試覆蓋 (58 passing tests, ≥80% coverage)

### Month 2-3 ✅ (2025-12-26)
- [x] **4 個專業 agent teams** ✅ (2025-12-26)
  - [x] Code Development Team - 代碼開發
  - [x] Research & Analysis Team - 研究分析
  - [x] Quality Assurance Team - 品質保證
  - [x] Orchestration & Optimization Team - 編排優化
  - [x] 完整測試覆蓋 (16/16 passing tests)
  - [x] 團隊選擇指南與協作框架 (TEAMS.md)
- [x] **Self-Evolving Agent 機制 - Phase 1 & 2** ✅ (2025-12-26)
  - [x] PerformanceTracker - 性能監控與異常檢測
  - [x] LearningManager - 模式識別與知識萃取
  - [x] AdaptationEngine - 動態行為調整
  - [x] 完整測試覆蓋 (22/22 passing tests)
- [x] **Self-Evolving Agent 機制 - Phase 3** ✅ (2025-12-27)
  - [x] Cross-Agent Knowledge Transfer - Agent 間知識轉移
    - [x] TransferabilityChecker - 加權上下文相似度評估
    - [x] KnowledgeTransferManager - 模式發現與轉移管理
  - [x] A/B Testing Framework - 科學驗證配置效果
    - [x] StatisticalAnalyzer - Welch's t-test, effect size, confidence intervals
    - [x] ABTestManager - 實驗管理與統計分析
  - [x] 完整測試覆蓋 (45/45 passing tests)
- [x] 完整文檔 (README.md, TEAMS.md, EVOLUTION.md)

## 💰 成本估算

### V2.0 成本結構（MCP Server Pattern）

**實際月費** (V2.0 當前實現):
- **Smart-Agents MCP Server**: $0 (本地運行，開源免費)
- **Claude API**: 由您自己的 Claude Code subscription 支付
  - 具體費用取決於：
    - 您的 API 使用量（tokens consumed）
    - Claude API 定價（參考 ARCHITECTURE.md 中的價格表）
    - Smart-Agents 提供的 prompt enhancement 幫助優化 token 使用
- **Vector DB (Vectra)**: $0 (本地運行)
- **其他 MCP Servers** (optional): 依各工具而定

**優勢**：
- ✅ **無中介成本** - 直接使用您自己的 Claude API subscription
- ✅ **透明計價** - 看得見每次 API 調用的實際成本
- ✅ **Prompt 優化** - Enhanced prompts 減少不必要的 token 消耗
- ✅ **本地運行** - MCP server 和 vector DB 完全免費

---

### V3.0 規劃：Multi-Provider 成本優化（未實現）

> **注意**: 以下為 V3.0 規劃功能，描述未來 Multi-Provider Routing 的成本節省潛力。

<details>
<summary>展開查看 V3.0 成本優化策略</summary>

#### 智能路由優化後成本 (40% 節省)

**預期月費** (保守使用，含智能路由優化):
- Claude API: $8-15 (↓ 47%, 複雜任務專用)
- OpenAI API: $5-12 (↓ 40%, 語音 + 中等代碼)
- Grok API: $3-8 (中等推理任務)
- Gemini API: $0 (FREE tier, 10,000 次/日)
- Ollama: $0 (本地運行，60% 簡單任務)
- Vector DB: $0 (Vectra 本地)
- **總計**: ~$20-35/月 (↓ 40% vs 單一提供商)

#### 成本優化策略

- ✅ **60% 簡單任務** → 本地 Ollama ($0)
- ✅ **多模態任務** → Gemini FREE tier ($0)
- ✅ **配額感知路由** → 避免超額費用
- ✅ **三層故障轉移** → 確保服務連續性

</details>

## 🤝 貢獻

歡迎提交 PR 和 Issues！

## 📄 授權

MIT License