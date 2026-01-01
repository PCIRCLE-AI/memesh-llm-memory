# Claude Code Buddy (CCB)

**語言版本:** [English](README.en.md) | 繁體中文

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

### 3. 📈 **從回饋中學習**
每次回應後的按讚/按踩會訓練系統。它學習哪些方法適合你的專案並隨時間調整。

**結果：** 專家級回應無需專家級提示。持續的上下文。越用越聰明的 AI。

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

22 種專業 agent 應對不同任務：
- **code-reviewer** - 安全檢查、品質標準、反模式
- **debugger** - 系統化除錯、錯誤模式識別
- **frontend-specialist** - UI/UX、無障礙性、響應式設計
- **backend-specialist** - API 設計、資料庫優化、安全性
- **api-designer**、**db-optimizer**、**refactorer**、**test-writer**... 等等

**類型：** 6 個真實實作 + 16 個增強提示 + 1 個可選功能（RAG）

**你不需要選擇 agent - CCB 會自動為你的任務選擇正確的 agent。**

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

### 📊 Session 健康與防止當機

```bash
buddy stats week

總 Agent 呼叫：1,245
總 Token 使用：2.4M（在 Claude Code session 限制內）
成功率：94.2%
Session 健康：健康（65% token 使用率）

每個 agent 的細分：
code-reviewer：234 次呼叫，85% 成功
debugger：123 次呼叫，92% 成功
```

**永不再失去工作成果。** CCB 監控你的 Claude Code session 的 200K token 限制，並在 90% 時自動重載上下文以防止當機。追蹤 token 使用、獲得智能下一步建議，並優化品質。

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

安裝程式會：
- ✓ 安裝相依性
- ✓ 建構專案
- ✓ 設定 Claude Code MCP 整合
- ✓ 測試設定

**不需要 API 金鑰** - 使用你現有的 Claude Code 訂閱。

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
你提供回饋（👍/👎）
    ↓
CCB 學習並改進
```

**幕後：**
- **22 個 agent 總數**：6 個真實實作（RAG、知識圖譜、測試撰寫器、DevOps 工程師等）+ 16 個增強提示 + 1 個可選功能
- **演化系統**從你的回饋中學習並隨時間調整
- **智能路由**自動為你的任務選擇最佳 agent

**技術深入探討：** 參見 [ARCHITECTURE.md](docs/ARCHITECTURE.md)

**API 文檔：** 參見 [API Documentation](docs/api/) - 使用 `npm run docs` 生成

---

## CCB 擅長什麼 ✅

- **使 Claude Code 具備專案意識**針對你的特定專案
- **減少重複提示**透過智能任務路由
- **在不同 session 之間記憶**使用持久記憶系統（RAG + 知識圖譜 + 專案上下文）
- **提供專業知識**無需你撰寫專家級提示
- **從你的回饋中學習**隨時間改進
- **防止 session 當機**透過監控 token 使用並自動重載上下文
- **引導你的工作流程**透過智能下一步建議
- **協調複雜工作流程**跨越多個步驟

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
# 執行測試（722 個測試涵蓋核心功能）
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

## 路線圖

### v2.1（下一個版本 - 2026 Q1）
- 用於設定和監控的網頁介面
- Windows/Mac/Linux 的一鍵安裝程式
- 影片教學和互動式文件
- 更多常見工作流程的預建技能

### v2.5（2026 Q2）
- 雲端託管選項（無需本地設定）
- 團隊協作功能
- 進階成本優化演算法
- 整合市集（GitHub Actions、Jenkins 等）

### v3.0（願景 - 2026 Q3）
- 多模型支援（Claude + GPT + 本地模型）
- 視覺化工作流程建構器
- 社群技能市集
- 企業功能（SSO、稽核日誌、合規性）

---

## 常見問題

**問：我需要是開發者才能使用嗎？**
答：如果你能使用 Claude Code，你就能使用 CCB。它是為了讓 Claude 更容易使用，而不是更難。

**問：這會在 Claude Code 之外產生額外費用嗎？**
答：不會 - CCB 使用你現有的 Claude Code 訂閱。它幫助在你的 session 限制內優化 token 使用，而不是 API 成本。

**問：這與單純使用 Claude Code 有什麼不同？**
答：Claude Code 對所有任務一視同仁。CCB 增加了任務特定的專業知識、記憶和學習。

**問：我的程式碼是私有的嗎？**
答：是的。所有內容都透過你的 Claude Code 訂閱在本地執行。可選的 RAG 功能僅使用 OpenAI API 進行嵌入向量處理。

**問：如果我不喜歡怎麼辦？**
答：從你的 MCP 設定中移除它。沒有鎖定，沒有供應商依賴。

**問：這要多少錢？**
答：CCB 是免費且開源的（AGPL-3.0）。與你現有的 Claude Code 訂閱一起使用。可選的 RAG 功能需要 OpenAI API 金鑰。

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

🇹🇼 **Crafted in Taiwan** | 台灣製造
_Where innovation meets tradition_

[開始使用](#快速開始2-分鐘) • [文件](docs/) • [回報問題](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [加入討論](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

⭐ **如果 CCB 讓你的開發生活更輕鬆，請為這個儲存庫加星！**

</div>
