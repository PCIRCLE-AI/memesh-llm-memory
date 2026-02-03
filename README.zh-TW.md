<div align="center">

# 🧠 MeMesh

> **說明**：原名為「Claude Code Buddy (CCB)」，為避免商標侵權問題已更名為 MeMesh。

### **唯一會記住一切的 MCP Server**

**讓 Claude Code 記住所有事情。開發更快。Vibe 更爽。**

[![GitHub Stars](https://img.shields.io/github/stars/PCIRCLE-AI/claude-code-buddy?style=social)](https://github.com/PCIRCLE-AI/claude-code-buddy)
[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 快速開始](#-2-分鐘快速開始) • [📖 文檔](docs/) • [🌐 官網](https://memesh.pcircle.ai) • [💬 討論區](https://github.com/PCIRCLE-AI/memesh/discussions)

---

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

**Claude 記住了。永遠。**

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

### 🏆 官方 Marketplace（即將推出）
一旦獲得 Anthropic 批准，一行命令即可安裝：
```bash
/plugin install memesh@claude-plugins-official
```

### ⚡ GitHub Marketplace（現已可用）
```bash
# 添加 marketplace
/plugin marketplace add PCIRCLE-AI/claude-code-buddy

# 安裝 plugin
/plugin install memesh@pcircle-ai
```

### 📦 快速安裝腳本（本地開發推薦）
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
claude --plugin-dir /path/to/claude-code-buddy
```

### 🎯 Cursor 使用者
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL21lbWVzaCJdfQ==
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

Cursor 使用相同的 MCP 協議。你可以使用快速安裝連結：
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL21lbWVzaCJdfQ==
```

**重啟 Cursor** 就完成了。

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

### 場景 1：**開發新功能**

```bash
你: buddy-do "建立 WebSocket 即時聊天"

MeMesh 會：
✅ 記住你的技術棧（React, Node.js 等）
✅ 套用你過去的程式碼模式
✅ 生成符合你風格的程式碼
✅ 自動記錄這次設計決策供未來使用
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
<summary><strong>17 個 MCP 標準工具</strong></summary>

完整整合 Model Context Protocol。

查看完整列表：[ToolDefinitions.ts](src/mcp/ToolDefinitions.ts)

</details>

---

## 🧪 技術細節

<table>
<tr>
<td width="50%">

### 需求
- Node.js 20+
- Claude Code 或 Cursor IDE
- 5 分鐘時間

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

- ✅ **100% 本地處理** - 資料永不離開你的機器
- ✅ **零外部 API 呼叫** - 使用你的 Claude Code 訂閱
- ✅ **npm audit：0 個漏洞**
- ✅ **開源** - 自己審查程式碼

---

## 🤝 貢獻

我們很樂意你的幫助讓 MeMesh 變得更好！

- 🐛 **發現 bug？**[開啟 issue](https://github.com/PCIRCLE-AI/memesh/issues/new)
- 💡 **有想法？**[開始討論](https://github.com/PCIRCLE-AI/memesh/discussions)
- 🛠️ **想寫程式？**查看 [Good First Issues](https://github.com/PCIRCLE-AI/memesh/labels/good%20first%20issue)

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

**A：** 是的。所有資料都在本地處理。零外部 API 呼叫。零資料上傳。

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

**A：** 當然。提示詞模板在 `src/core/PromptEnhancer.ts`。

想更深度客製化？Fork 它、改它、變成你的。這就是開源精神。

</details>

<details>
<summary><strong>Q：支援 Cursor 嗎？</strong></summary>

**A：** 支援！Cursor 原生支援 MCP。快速安裝。

</details>

---

## 🙏 致謝

站在巨人的肩膀上：

- [Model Context Protocol (MCP)](https://github.com/anthropics/mcp) - 基礎
- [Claude Code](https://claude.com/claude-code) - 平台
- 所有我們出色的[貢獻者](https://github.com/PCIRCLE-AI/memesh/graphs/contributors)和早期測試者

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

[🚀 開始使用](#-2-分鐘快速開始) • [📖 閱讀文檔](docs/) • [💬 加入討論](https://github.com/PCIRCLE-AI/memesh/discussions)

---

### ⭐ **如果 MeMesh 今天幫你省時間，給它一個 star！**

這能幫助其他人發現這個工具。

---

**與 Anthropic PBC 無關** • 獨立開源專案

**語言：**[English](README.md) • [繁體中文](README.zh-TW.md)

</div>
