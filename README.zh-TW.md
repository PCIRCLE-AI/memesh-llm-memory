# Claude Code Buddy (CCB)

🌐 **網站:** [ccb.pcircle.ai](https://ccb.pcircle.ai) | **語言版本:** [English](README.md) | 繁體中文

---

> **讓 Claude Code 記住你的專案、從你的回饋中學習，並提供專家級的回應,無需專家級的提示。**

Claude Code Buddy 是一個 MCP 伺服器，為 Claude Code 增加智能、記憶和任務路由功能 - 將它從強大的助手轉變為具備專案意識的 AI 團隊成員。

---

## 問題所在

你使用 Claude Code 來建構專案，但不斷遇到相同的挫折：

- **「我們不是討論過這個嗎？」** - Claude 在不同 session 之間會忘記上下文
- **「為什麼我要再解釋一次？」** - 每次對話都從零開始
- **「這個答案太泛化了」** - 無論你是在除錯、審查程式碼還是設計 UI，回應都一樣
- **「讓我再寫一次這 50 行提示...」** - 常見任務需要重複的指令

**結果你成了 Claude 的記憶和專案經理，而不是專注於建構。**

---

## 解決方案

Claude Code Buddy 位於你和 Claude Code 之間，增加三項超能力：

### 1. 🧠 **專案記憶**
CCB 記住你的架構決策、編碼模式和過去的解決方案。問「為什麼我們選擇 PostgreSQL？」，你會得到實際的決策理由 - 而不是泛泛的比較。

### 2. 🎯 **智能任務路由**
你的請求會被分析並路由到正確的「專家模式」 - 程式碼審查任務獲得程式碼審查專業知識，除錯獲得系統化除錯方法，前端獲得 UI/UX 最佳實踐。

### 3. 💰 **智能模型選擇**
根據複雜度路由任務到正確的模型層級：
- **Ollama**（簡單任務）- 快速免費的本地處理
- **Hybrid**（中等任務）- Ollama 草稿 + Claude 潤飾
- **Claude**（複雜任務）- 需要時使用完整 Claude 能力

節省約 40% 的 token 成本，同時不犧牲品質。

**結果：** 專家級回應無需專家級提示。持續的上下文。高成本效益的智能，永不遺忘。

---

## 實際運作

**沒有 CCB：**
```
你：「優化這個資料庫查詢」
Claude：[關於索引和查詢結構的泛化建議]
```

**有了 CCB：**
```
你：「優化這個資料庫查詢」

CCB 分析：資料庫優化任務
CCB 路由到：db-optimizer agent 類型
CCB 用以下內容增強提示：資料庫最佳實踐、索引策略、性能分析技術

Claude：[針對你的資料庫設定的具體優化建議，包含實際查詢範例
         和基於你的 schema 的性能基準測試]
```

**差異：** CCB 了解你的技術堆疊，記住你的 schema，並提供目標性的專業知識。

---

## 核心功能

### ✨ 自動專業知識路由

**36 個專業 Agents** 根據任務類型自動選擇：

**類型：** 9 個真實實作 + 26 個增強提示 + 1 個可選功能（RAG）

**你不需要選擇 agent - CCB 會自動為你的任務選擇正確的 agent。**

<details>
<summary><b>📋 查看全部 36 個 Agents</b></summary>

#### 🔧 真實實作 Agents（9 個）
這些 agents 具有實際程式碼實作並整合 MCP 工具：

- **development-butler** - 事件驅動工作流程自動化、程式碼維護、測試、依賴管理、git 工作流程、建置自動化
- **test-writer** - 測試自動化專家、TDD 專家、覆蓋率分析
- **e2e-healing-agent** - 端到端測試自動化並具自我修復能力、Playwright 驅動的瀏覽器測試、自動失敗分析和程式碼修復
- **devops-engineer** - DevOps、CI/CD、基礎設施自動化、部署專家
- **project-manager** - 專案規劃、任務管理、里程碑追蹤、團隊協調
- **data-engineer** - 資料管道開發、ETL 流程、資料品質管理
- **workflow-orchestrator** - 智能工作流程平台選擇器（Opal vs n8n）、工作流程自動化編排
- **opal-automation** - Google Opal 瀏覽器自動化、自然語言工作流程創建、AI 驅動的原型
- **n8n-workflow** - n8n 工作流程 API 整合、生產工作流程管理、多系統整合

#### 💬 增強提示 Agents（26 個）
這些 agents 使用專業提示，無需 MCP 工具整合：

**開發類（13 個 agents）**
- **frontend-developer** - 前端開發專家、React/Vue/Angular 專家
- **backend-developer** - 後端開發專家、API 和伺服器端專家
- **frontend-specialist** - 前端架構、性能優化、現代框架專家
- **backend-specialist** - 後端架構、可擴展性、微服務專家
- **database-administrator** - 資料庫專家、schema 設計、查詢優化專家
- **db-optimizer** - 資料庫優化、查詢調校、索引設計專家
- **performance-engineer** - 性能優化專家、瓶頸分析、快取專家
- **performance-profiler** - 性能分析、瓶頸識別、優化分析
- **code-reviewer** - 專業程式碼審查、安全分析、最佳實踐驗證
- **debugger** - 進階除錯、根本原因分析、系統化問題解決
- **refactorer** - 程式碼重構、技術債務削減、程式碼品質改進
- **api-designer** - API 設計、REST/GraphQL 架構、API 文檔專家
- **test-automator** - 測試自動化專家、自動化測試專家

**分析與研究（4 個 agents）**
- **architecture-agent** - 系統架構專家、設計模式、可擴展性分析
- **research-agent** - 技術研究、可行性分析、技術評估
- **data-analyst** - 資料分析、統計建模、商業智能專家
- **knowledge-agent** - 知識管理、資訊檢索、文檔組織

**營運與安全（1 個 agent）**
- **security-auditor** - 安全審計、漏洞評估、合規專家

**管理（1 個 agent）**
- **product-manager** - 產品策略、用戶研究、功能優先順序專家

**創意（2 個 agents）**
- **ui-designer** - UI/UX 設計、用戶體驗、介面設計專家
- **technical-writer** - 技術文檔、API 文檔、用戶指南專家

**商業（1 個 agent）**
- **marketing-strategist** - 行銷策略、品牌定位、增長駭客專家

**工程（1 個 agent）**
- **ml-engineer** - 機器學習工程、模型訓練、ML 管道專家

**工具類（3 個 agents）**
- **migration-assistant** - 遷移規劃、版本升級、傳統系統現代化
- **api-integrator** - API 整合、第三方服務、SDK 實作專家
- **general-agent** - 通用型 agent，用於雜項任務和備援情境

#### 🎯 可選功能 Agents（1 個）
需要外部依賴（ChromaDB + OpenAI）：

- **rag-agent** - 知識檢索、向量搜尋、基於嵌入的上下文搜尋

</details>

### 💾 三種記憶類型

**RAG（檢索增強生成）與 Drop Inbox**
```
你：「顯示這個專案中的身份驗證如何運作」
CCB：[搜尋你的程式碼庫，找到實際的身份驗證檔案，展示模式]
```

**Drop Inbox 魔法：**
- 將檔案放入 `~/Documents/claude-code-buddy-knowledge/`
- CCB 每 5 秒自動索引
- 支援：.md、.txt、.json、.pdf、.docx
- 不需要命令 - 只要放入即可！

**知識圖譜**
```
你：「為什麼我們選擇這個架構？」
CCB：[回憶決策、考慮過的替代方案和權衡]
```

**專案上下文**
```
CCB 記住：
- 你的編碼標準
- 命名慣例
- 專案特定模式
- 你已經建構的內容
```

### 💰 智能模型選擇與成本節省

CCB 分析任務複雜度並路由到最佳的模型層級，節省約 40% 的 token 成本：

- **Ollama**（簡單/免費）- 本地處理快速任務如程式碼格式化、簡單 bug 修復
- **Hybrid**（平衡）- Ollama 草稿 + Claude 潤飾，標準開發工作、程式碼審查
- **Claude**（複雜/高品質）- 完整 Claude 能力處理架構設計、複雜除錯

**運作方式**：TaskAnalyzer 檢查你的請求 → 評估複雜度（1-10）→ 路由到最具成本效益的模型層級 → 你在簡單任務上不會支付過高費用，同時獲得品質結果。

**實際範例**：「修正這個錯字」使用 Ollama（免費），「設計認證系統」使用 Claude（完整能力），「審查這個 PR」使用 Hybrid（成本效益高）。

### 🤝 使用者友善的命令

```bash
# 自然語言命令，就是這麼簡單
buddy do setup authentication
buddy do optimize this database query
buddy stats week
buddy remember how we implemented login
buddy help
```

**別名也可以用：** `help-with`、`execute`、`recall`、`dashboard` - 選擇你覺得自然的。

### 💾 初學者友善的 Git 助手

**不需要 Git 命令。** 只要用自然語言告訴 CCB 你想要什麼：

```bash
# 儲存你的工作
git-save-work "added login feature"

# 查看你的版本
git-list-versions

# 回到先前的版本
git-go-back 3

# 顯示變更內容
git-show-changes
```

**8 個說人話的 Git 工具：**
- `git-save-work` - 用友善的提交訊息儲存
- `git-list-versions` - 列出最近的版本
- `git-status` - 以可讀格式顯示目前狀態
- `git-show-changes` - 查看變更內容
- `git-go-back` - 時光倒流到先前版本
- `git-create-backup` - 創建本地備份
- `git-setup` - 為新專案設定 Git
- `git-help` - 顯示可用命令

**適合：** 覺得 Git 令人畏懼的初學者，或任何想要簡單版本控制的人。

### 🔄 智能工作流程引導

**CCB 知道下一步是什麼。** 你寫完程式碼後，它建議執行測試。測試通過後，它建議程式碼審查。不需要手動思考。

```
你寫程式碼 → CCB：「程式碼看起來不錯！下一步執行測試？」
測試通過 → CCB：「測試通過！準備好進行程式碼審查？」
審查完成 → CCB：「審查完成！提交並推送？」
```

**4 個工作流程工具：**
- `get-workflow-guidance` - 獲得下一步建議
- `get-session-health` - 檢查 session 健康狀態
- `reload-context` - 需要時重載 CLAUDE.md
- `record-token-usage` - 追蹤 token 消耗

**優勢：** 永不疑惑「我接下來該做什麼？」- CCB 引導你完成整個開發流程。

### 📋 智能實作規劃

**將複雜功能分解為小型任務。** CCB 生成 TDD 結構化計畫，具備 agent 感知的任務分解。

```
你：「規劃使用者身份驗證的實作」
CCB：[生成逐步計畫，包含：
  - 測試優先方法
  - 2-5 分鐘的任務
  - 每個任務的正確 agent
  - 明確的成功標準]
```

**規劃工具：**
- `generate-smart-plan` - 創建智能實作計畫

---

## 快速開始（2 分鐘）

### 前置需求
- Node.js 18+ ([下載](https://nodejs.org/))
- Claude Code 已安裝 ([在這裡取得](https://claude.com/claude-code))

### 安裝

```bash
# 1. 複製儲存庫
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. 執行互動式安裝程式（它會處理所有事情）
./scripts/install.sh
```

安裝程式會引導你完成 **11 個互動式步驟**：

**核心設定（步驟 1-8）**：
- ✓ 檢查前置需求（Node.js 18+、npm、git）
- ✓ 安裝相依性
- ✓ 建構專案
- ✓ 檢查系統資源
- ✓ 設定環境
- ✓ **選用 RAG 設定**：選擇 HuggingFace（免費）或 OpenAI（付費）以增強知識檢索
- ✓ 設定 Claude Code MCP 整合
- ✓ 測試安裝

**互動式展示（步驟 9-10）**：
- 📚 **步驟 9：基本使用展示** - 了解 CCB 的智能路由、範例提示、記憶類型和成本節省
- 📁 **步驟 10：RAG 功能展示**（如果啟用）- 探索 Drop Inbox 的魔力與範例文件

**核心功能不需要 API 金鑰** - 使用你現有的 Claude Code 訂閱。

**選用 RAG 功能**：
- **免費選項**：HuggingFace 嵌入（無需 API 金鑰成本）
- **付費選項**：OpenAI 嵌入（自備 API 金鑰）
- **Drop Inbox**：每 5 秒自動索引 `~/Documents/claude-code-buddy-knowledge/` 目錄中的檔案

### 開始使用

重新啟動 Claude Code，然後嘗試：

```
「分析我的程式碼庫架構」
「為 auth.ts 生成測試」
「審查這段程式碼是否有安全問題」
「優化這個資料庫查詢」
```

CCB 會自動將任務路由到正確的 agent，並用相關上下文增強提示。

---

## 運作原理

```
你的請求
    ↓
CCB 分析任務
    ↓
路由到最佳 agent 類型（例如 code-reviewer、debugger）
    ↓
用專業上下文增強提示
    ↓
Claude Code 用你的訂閱執行
    ↓
系統從你的選擇中學習（當你覆蓋建議時）
```

**幕後：**
- **36 個 agent 總數**：9 個真實實作（測試撰寫器、DevOps 工程師、工作流程編排器等）+ 26 個增強提示 + 1 個可選功能（RAG）
- **智能路由**分析任務複雜度並自動選擇最佳 agent 和 Claude 模型
- **演化系統**從你的選擇中學習並持續改進建議

**技術深入探討：** 參見 [ARCHITECTURE.md](docs/ARCHITECTURE.md)

**API 文檔：** 參見 [API Documentation](docs/api/) - 使用 `npm run docs` 生成

---

## CCB 擅長什麼 ✅

- **使 Claude Code 具備專案意識**針對你的特定專案
- **減少重複提示**透過智能任務路由
- **在不同 session 之間記憶**使用持久記憶系統（RAG + 知識圖譜 + 專案上下文）
- **提供專業知識**無需你撰寫專家級提示
- **節省 token 成本**透過路由到最佳模型層級（Ollama/Hybrid/Claude）
- **從你的選擇中學習**當你覆蓋 agent 建議時
- **引導你的工作流程**透過智能下一步建議
- **協調複雜工作流程**跨越多個步驟
- **跨平台支援**無縫支援 Windows、macOS 和 Linux
- **生產就緒**具備全面測試、安全性強化和資源保護

## 誠實的限制 ⚠️

- **不是魔法** - 仍然需要你提供明確的需求
- **不是學習的替代品** - 你應該了解你在建構什麼
- **增強 Claude Code，不是取代它** - 與你現有的設定一起運作
- **需要設定** - 2 分鐘安裝，不是一鍵完成（還沒有）
- **早期階段（v2.0）** - 預期會有粗糙的地方，但正在積極改進
- **受 Claude 能力限制** - 無法讓 Claude 做不可能的事

**理念：** 我們對什麼有效、什麼無效保持誠實。如果某些東西對你不起作用，請告訴我們 - 這個回饋會讓所有人都受益。

---

## 使用案例

### 程式碼審查
```
「審查這個 PR 是否有安全漏洞和程式碼品質問題」
→ 路由到 code-reviewer
→ 獲得安全檢查清單 + 品質標準
→ 返回詳細審查，包含具體建議
```

### 除錯
```
「這個函式在 undefined 時崩潰，幫助除錯」
→ 路由到 debugger
→ 獲得系統化除錯方法
→ 逐步進行根本原因分析
```

### 前端設計
```
「設計一個具有深色模式的響應式儀表板」
→ 路由到 frontend-specialist
→ 獲得 UI/UX 模式 + 無障礙性指南
→ 返回完整設計，包含響應式斷點
```

### 資料庫優化
```
「這個 Prisma 查詢需要 2 秒，優化它」
→ 路由到 db-optimizer
→ 獲得查詢優化模式 + 索引策略
→ 返回優化的查詢，包含性能基準測試
```

---

## 進階功能

- **自訂技能** - 用 TypeScript 撰寫你自己的 agent 行為
- **多步驟規劃** - 將複雜任務分解為可執行的計劃
- **工作流程協調** - 自動檢查點檢測和下一步建議
- **Git 整合** - 初學者友善的 Git 命令（`save-work`、`list-versions`、`go-back-to`）
- **N8n & Opal 整合** - 工作流程自動化（N8n REST API + Opal 瀏覽器自動化與自然語言）
- **儀表板** - 即時指標、session 健康監控、性能追蹤

**探索：** 參見 [docs/](docs/) 了解每個功能的詳細指南。

---

## 社群與支援

- **文件**：[docs/](docs/) 資料夾 + 這個 README
- **問題**：[GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- **討論**：[GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- **貢獻**：[CONTRIBUTING.md](docs/CONTRIBUTING.md)

**有問題？** 開啟一個 issue 或開始討論 - 我們在這裡提供協助。

---

## 開發

```bash
# 執行測試（292 個測試檔案涵蓋核心功能）
npm test

# 開發模式，自動重載
npm run dev

# 為生產環境建構
npm run build

# 查看性能儀表板
npm run dashboard
```

**貢獻：** 我們歡迎貢獻！參見 [CONTRIBUTING.md](docs/CONTRIBUTING.md) 了解指南。

**完整文檔：**
- 📐 [系統架構](docs/ARCHITECTURE.md) - 高階架構總覽、設計原則、技術堆疊
- 🔧 [組件指南](docs/COMPONENT_GUIDE.md) - 詳細組件參考與 API 文檔
- 🔄 [數據流程](docs/DATA_FLOW.md) - 請求生命週期、事務模式、錯誤傳播
- 🚀 [部署指南](docs/DEPLOYMENT.md) - 安裝、配置、監控、故障排除
- 🤝 [貢獻指南](docs/CONTRIBUTING.md) - 開發設置、代碼標準、PR 流程

---

## 常見問題

**問：我需要是開發者才能使用嗎？**
答：如果你能使用 Claude Code，你就能使用 CCB。它是為了讓 Claude 更容易使用，而不是更難。

**問：這會在 Claude Code 之外產生額外費用嗎？**
答：不會 - CCB 使用你現有的 Claude Code 訂閱。它幫助在你的 session 限制內優化 token 使用，而不是 API 成本。

**問：這與單純使用 Claude Code 有什麼不同？**
答：Claude Code 對所有任務一視同仁。CCB 增加了任務特定的專業知識、記憶和學習。

**問：我的程式碼是私有的嗎？**
答：是的。所有內容都透過你的 Claude Code 訂閱在本地執行。可選的 RAG 功能提供兩種嵌入選項：本地 Ollama（無需 API 金鑰，完全私密）或 OpenAI API（自備金鑰）。

**問：如果我不喜歡怎麼辦？**
答：從你的 MCP 設定中移除它。沒有鎖定，沒有供應商依賴。

**問：這要多少錢？**
答：CCB 是免費且開源的（AGPL-3.0）。與你現有的 Claude Code 訂閱一起使用。可選的 RAG 功能是免費的 - 使用本地 Ollama 嵌入（無需 API 金鑰）或自備 OpenAI API 金鑰。

**問：我可以自訂 agent 嗎？**
答：當然！提示範本在 `src/core/PromptEnhancer.ts`。演化設定在 `src/evolution/AgentEvolutionConfig.ts`。

---

## 授權條款

**AGPL-3.0 授權條款** - 詳見 [LICENSE](LICENSE) 檔案。

這是免費且開源的軟體。如果你修改並將其部署為網路服務，你必須向使用者提供原始碼。

---

## 致謝

- 使用 [Model Context Protocol (MCP)](https://github.com/anthropics/mcp) 建構
- 與 [Claude Code](https://claude.com/claude-code) 配合使用
- 可選的 [OpenAI Embeddings](https://openai.com) 用於 RAG 功能
- 受 Claude Code 社群啟發
- 感謝所有貢獻者和早期測試者

**免責聲明：** 本專案為獨立開發的開源專案，與 Anthropic PBC 或其產品（包括 Claude 和 Claude Code）無任何官方關聯或附屬關係。Claude Code Buddy 是設計用於與 Claude Code 整合的第三方工具。

---

<div align="center">

**由開發者為開發者用心打造 ❤️**

**讓 Claude Code 更聰明，而非更繁雜。**

[開始使用](#快速開始2-分鐘) • [文件](docs/) • [回報問題](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [加入討論](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

⭐ **如果 CCB 讓你的開發生活更輕鬆，請為這個儲存庫加星！**

</div>
