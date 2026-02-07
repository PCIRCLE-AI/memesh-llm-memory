<div align="center">

# 🧠 MeMesh

> **說明**：原名為「Claude Code Buddy (CCB)」，為避免商標侵權問題已更名為 MeMesh。

### **唯一會記住一切的 MCP Server**

**讓 Claude Code 記住所有事情。開發更快。Vibe 更爽。**

[![GitHub Stars](https://img.shields.io/github/stars/PCIRCLE-AI/claude-code-buddy?style=social)](https://github.com/PCIRCLE-AI/claude-code-buddy)
[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 快速開始](#-2-分鐘快速開始) • [📖 文檔](docs/) • [🌐 GitHub](https://github.com/PCIRCLE-AI/claude-code-buddy) • [💬 討論區](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

### 🎥 **實際效果展示**

<table>
<tr>
<td width="50%" valign="top">

#### 🔴 **沒有 MeMesh**

```bash
# Session 1（週一）
你: "我們用 JWT 做身份驗證，因為..."
Claude: "了解！✅"

# Session 2（週二）
你: "還記得我們的身份驗證方式嗎？"
Claude: "抱歉，我沒有這個 context..."
你: *再解釋一次所有東西* 😤

# Session 3（週三）
你: "我們的 JWT 實作..."
Claude: "什麼 JWT 實作？"
你: *暴怒離開* 💢
```

</td>
<td width="50%" valign="top">

#### ✅ **有 MeMesh**

```bash
# Session 1（週一）
你: buddy-do "設定 JWT 身份驗證"
MeMesh: ✅ 已實作 + 儲存到記憶

# Session 2（週二）
你: buddy-remember "auth"
MeMesh: 📚 "JWT 身份驗證實作於 2024-01-15
     ↳ Access tokens: 15 分鐘
     ↳ Refresh tokens: 7 天
     ↳ 金鑰輪替: 每月"

# Session 3（任何時候，跨 session）
你: buddy-do "新增 OAuth"
MeMesh: 🧠 "我看到你有 JWT。讓我們
     把 OAuth 整合進去..."
```

</td>
</tr>
</table>

---

<div align="center">

https://github.com/user-attachments/assets/a389bcd2-1563-4d91-b363-44cdba5f4e44

</div>

---

<div align="center">

**💡 自己試試看：**

```bash
# 在 Claude Code 中
buddy-help                          # 查看所有指令
buddy-do "解釋 MeMesh 如何運作"     # 看它智能回應
buddy-remember "專案決策"           # 查詢專案記憶
```

**📖 [閱讀使用指南](docs/USER_GUIDE.md)** • **🔧 [API 參考](docs/api/API_REFERENCE.md)**

</div>

</div>

---

## 🤔 問題所在

你一定經歷過這種痛苦：

```
Session 1: "讓我解釋一下我們的架構..."
Session 2: "就像我之前說的，我們的架構..."
Session 3: "我剛剛提到過，我們的架構..."
Session 4: 😤
```

**每。一。次。都。要。重複。**

---

## ✨ 解決方案

<table>
<tr>
<td width="50%" valign="top">

### ❌ **使用 MeMesh 之前**

- 每次 session 都要重新解釋架構
- 重複回答相同問題
- 隔天就忘記設計決策
- 一直寫類似的提示詞
- Claude 有失憶症 🤕

</td>
<td width="50%" valign="top">

### ✅ **使用 MeMesh 之後**

- **記住**專案架構
- **瞬間回想**過去決策
- **自動整理**知識
- **智能路由**任務
- Claude 成為你的 AI 隊友 🤝

</td>
</tr>
</table>

---

## 🎯 核心功能

### 1. 🧠 **真正有用的專案記憶**

```bash
# Session 1（上週）
你: "我們選擇 PostgreSQL 是因為 JSONB 支援"

# Session 42（今天）
你: buddy-remember "為什麼選 PostgreSQL？"
MeMesh: "根據你在 2024-01-15 的決策：選擇 PostgreSQL 是因為
      JSONB 支援和進階查詢能力..."
```

**Claude 跨 session 記住了。** *（Session 記憶：30 天，專案記憶：90 天）*

### 2. 🎯 **智能任務路由（自動駕駛模式）**

```bash
你: "Review 這段程式碼"
MeMesh: *偵測任務類型*
     *啟動程式碼審查模式*
     *套用最佳實踐*
     *提供結構化審查*
```

**不用再問「我該怎麼做？」直接開始做。**

### 3. 💬 **超簡單命令**

```bash
buddy-do "設定身份驗證"          # 執行任何開發任務
buddy-remember "API 設計"        # 查詢專案記憶
buddy-help                       # 需要幫助時
```

**三個命令。無限可能。**

---

## 🚀 安裝選項

選擇你偏好的安裝方式：

### ⚡ npm 全域安裝（最簡單）⭐ 推薦
```bash
npm install -g @pcircle/memesh
# 自動設定完成！只需重啟 Claude Code。
```

### 📦 快速安裝腳本（本地開發用）
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

### 🎯 Cursor 使用者

**快速安裝**（基本功能）：
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL21lbWVzaCJdfQ==
```

**完整設定**：請參閱下方 [Cursor 完整設定](#cursor-完整設定)。

### 🏆 Claude Code Plugin
```bash
claude --plugin-dir /path/to/claude-code-buddy/.claude-plugin/memesh
```

---

## 🚀 2 分鐘快速開始

### 步驟 1：快速安裝

<details>
<summary><strong>⚡ Claude Code 使用者</strong>（點擊展開）⭐ 推薦方式</summary>

**三個簡單命令：**

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

安裝腳本會：
- ✅ 檢查前置需求（Node.js 20+）
- ✅ 安裝相依套件
- ✅ 建置 MeMesh
- ✅ 顯示如何啟動 plugin

**然後用以下方式啟動 Claude Code：**

```bash
claude --plugin-dir /path/to/claude-code-buddy
```

**完成！**MeMesh 現在可以作為 plugin 使用了。

<Note>
  `--plugin-dir` 標記用於載入本地 plugin。如需團隊分發，請參閱 [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) 建立共享的 marketplace。
</Note>

</details>

<details>
<summary><strong>🎯 Cursor 使用者</strong>（點擊展開）</summary>

<h4 id="cursor-完整設定">Cursor 完整設定</h4>

Deep link 提供基本功能。如需**完整手動設定**：

1. **編輯 Cursor MCP 設定**（`~/.cursor/mcp.json` 或透過 Cursor 設定）：
   ```json
   {
     "mcpServers": {
       "memesh": {
         "command": "npx",
         "args": ["-y", "@pcircle/memesh"]
       }
     }
   }
   ```

2. **重啟 Cursor** 就完成了。

</details>

### 步驟 2：測試

```bash
# 在 Claude Code/Cursor 中輸入：
buddy-help

# 你應該會看到 MeMesh 的命令列表
# 現在試試：
buddy-do "解釋 MeMesh 功能"

# 見證魔法 ✨
```

**🎉 就這樣！開始 vibe 吧。**

📖 **需要幫助？**[詳細安裝指南](docs/QUICK_INSTALL.md) | [疑難排解](docs/TROUBLESHOOTING.md)

---

## 💡 實際使用場景

### 場景 1：**智能任務執行**

```bash
你: buddy-do "review 身份驗證模組"

MeMesh 路由你的任務...
🔍 偵測到任務類型：程式碼審查
🧠 回想：你過去 session 的身份驗證決策
📋 提供：帶上下文的結構化分析

✅ 結果：
   • 根據已儲存的最佳實踐分析了 auth 模組
   • 引用了上個月的 JWT 決策
   • 基於專案模式提出改善建議

💾 儲存到記憶："Auth review 發現 - 2024-01-20"
```

### 場景 2：**「等等，我們為什麼這樣做？」**

```bash
你: buddy-remember "身份驗證方式"

MeMesh 立即回想：
📚 3 週前的 JWT vs Session 討論
💻 你寫的實作程式碼
🔧 你決定的錯誤處理模式
```

### 場景 3：**持續開發流程**

```
第 1 天：「實作使用者登入」
        ↓ MeMesh 記住所有事情
第 5 天：「新增密碼重設」
        ↓ MeMesh 回想第 1 天的架構
第 10 天：「新增 OAuth 支援」
        ↓ MeMesh 知道前兩次的設計
```

**再也不用重複解釋 context。**

---

## 📊 MeMesh vs 其他工具

| 功能 | 純 Claude Code | 其他 MCP 工具 | MeMesh |
|------|---------------|--------------|-----|
| **持久化記憶** | ❌ | ⚠️ 基本功能 | ✅ **完整知識圖譜** |
| **智能路由** | ❌ | ❌ | ✅ **自動偵測任務類型** |
| **Vibe Coding 優化** | ⚠️ | ❌ | ✅ **專為此打造** |
| **零設定** | ✅ | ⚠️ 複雜 | ✅ **2 分鐘** |
| **免費開源** | ✅ | ⚠️ 不一定 | ✅ **AGPL-3.0** |

---

## 🛠️ 進階功能

<details>
<summary><strong>自動記憶系統</strong></summary>

當你使用 `buddy-do` 時，MeMesh 會自動記錄：
- ✅ 任務目標和結果
- ✅ 技術決策和理由
- ✅ 遇到的錯誤和解決方案
- ✅ 開發里程碑

**你不用想記憶的事。MeMesh 會處理。**

</details>

<details>
<summary><strong>多專案支援</strong></summary>

每個專案都有獨立的記憶空間。

```bash
cd ~/project-A
buddy-remember "auth"  # 回傳 project-A 的 auth 決策

cd ~/project-B
buddy-remember "auth"  # 回傳 project-B 的 auth 決策
```

**絕不會混淆。**

</details>

<details>
<summary><strong>智能記憶查詢</strong></summary>

具備上下文感知的智能記憶檢索：
- 🎯 知識庫語意搜尋
- 🏷️ 自動標籤分類
- 📊 基於上下文的相關性排序

</details>

<details>
<summary><strong>持久記憶</strong></summary>

本地優先架構，搭配持久知識圖譜：
- 💾 基於 SQLite 的儲存，支援語意搜尋
- 🔍 向量嵌入實現智慧回憶
- 📡 知識在所有 session 間持久化

</details>

<details>
<summary><strong>8 個 MCP 標準工具</strong></summary>

完整整合 Model Context Protocol，提供無縫的 Claude Code 體驗。See [QUICK_INSTALL.md](docs/QUICK_INSTALL.md#-what-you-get) for the complete tool list.

使用 `buddy-help` 查看所有可用指令。

</details>

---

## 🧪 技術細節

<table>
<tr>
<td width="50%">

### 需求
- Node.js 20+
- Claude Code 或 Cursor IDE
- 2 分鐘時間

</td>
<td width="50%">

### 平台支援
- ✅ **Claude 4.5**（Haiku/Sonnet/Opus）
- ✅ **MCP SDK 1.25.3**
- ✅ Windows、macOS、Linux

</td>
</tr>
</table>

### 🔒 安全優先

- ✅ **本地優先處理** - 所有資料預設儲存在本地
- ✅ **可選雲端同步** - `memesh-cloud-sync` 可用於跨裝置記憶（僅在主動啟用時）
- ✅ **npm audit：0 個漏洞**
- ✅ **開源** - 自己審查程式碼

---

## 🐛 回報問題 & 獲取協助

遇到問題了嗎？我們來幫忙！

### 📝 如何回報 Bug

1. **檢查現有 Issues**：先看看是否有人已經回報
   - [搜尋現有 Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

2. **建立新 Issue**：
   - [開啟新 Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new)
   - 請包含：
     - ✅ MeMesh 版本（執行 `npm list @pcircle/memesh` 查看）
     - ✅ Node.js 版本（執行 `node --version`）
     - ✅ 作業系統（Windows/macOS/Linux）
     - ✅ 錯誤訊息（完整的錯誤 log）
     - ✅ 重現步驟

3. **緊急問題**：如果是安全相關問題，請私下回報至：security@pcircle.ai

### 💬 社群支援

- **一般問題**：[GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- **功能建議**：[Feature Requests](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions/categories/ideas)
- **疑難排解**：[閱讀疑難排解指南](docs/TROUBLESHOOTING.md)

---

## 🤝 貢獻

我們很樂意你的幫助讓 MeMesh 變得更好！

- 🐛 **發現 bug？**[開啟 issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new)
- 💡 **有想法？**[開始討論](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- 🛠️ **想寫程式？**查看 [Good First Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/labels/good%20first%20issue)

**貢獻指南**：[CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## 📚 文檔

- 📖 [完整文檔](docs/)
- 🚀 [快速安裝指南](docs/QUICK_INSTALL.md)
- 📘 [使用者指南](docs/USER_GUIDE.md)
- 🛠️ [API 參考](docs/api/API_REFERENCE.md)
- ❓ [疑難排解](docs/TROUBLESHOOTING.md)

---

## ❓ 常見問題

<details>
<summary><strong>Q：需要付費嗎？</strong></summary>

**A：** 不用。100% 免費開源（AGPL-3.0）。使用你現有的 Claude Code 訂閱。

</details>

<details>
<summary><strong>Q：我的資料安全嗎？</strong></summary>

**A：** 是的。所有資料預設在本地處理和儲存。雲端同步（`memesh-cloud-sync`）可用但需主動啟用 — 未經你明確操作不會上傳任何資料。

</details>

<details>
<summary><strong>Q：和純 Claude Code 有什麼不同？</strong></summary>

**A：** MeMesh 加入兩大超能力：
1. **持久化記憶** - Claude 能跨 session 記住你的專案
2. **智能路由** - 自動偵測和處理不同任務類型

可以想成：Claude Code + 超強記憶 + 自動駕駛模式。

</details>

<details>
<summary><strong>Q：可以客製化嗎？</strong></summary>

**A：** 當然！MeMesh 外掛程式完全開源。

想更深度客製化？查看我們的[貢獻指南](docs/CONTRIBUTING.md)或 fork 此專案。

</details>

<details>
<summary><strong>Q：支援 Cursor 嗎？</strong></summary>

**A：** 支援！Cursor 原生支援 MCP。在 Cursor 設定中配置 MCP server 路徑即可。

</details>

---

## 🙏 致謝

站在巨人的肩膀上：

- [Model Context Protocol (MCP)](https://github.com/anthropics/mcp) - 基礎
- [Claude Code](https://claude.com/claude-code) - 平台
- 所有我們出色的[貢獻者](https://github.com/PCIRCLE-AI/claude-code-buddy/graphs/contributors)和早期測試者

---

## 📄 授權

**AGPL-3.0** - 查看 [LICENSE](LICENSE)

*這代表：使用它、修改它、分享它。但保持開源。*

---

## 🌟 Star 歷史

[![Star History Chart](https://api.star-history.com/svg?repos=PCIRCLE-AI/claude-code-buddy&type=Date)](https://star-history.com/#PCIRCLE-AI/claude-code-buddy&Date)

---

<div align="center">

### **開發者打造，為開發者服務**

**別再重複自己。開始 vibe 吧。**

[🚀 開始使用](#-2-分鐘快速開始) • [📖 閱讀文檔](docs/) • [💬 加入討論](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

### ⭐ **如果 MeMesh 今天幫你省時間，給它一個 star！**

這能幫助其他人發現這個工具。

---

**與 Anthropic PBC 無關** • 獨立開源專案

**語言：**[English](README.md) • [繁體中文](README.zh-TW.md)

</div>
