<div align="center">

# 🧠 MeMesh

### Claude Code 的持久記憶

Claude 每次開新 session 都會忘記一切。MeMesh 解決這個問題。

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[安裝](#安裝) • [使用方式](#使用方式) • [疑難排解](#疑難排解) • [English](README.md)

</div>

---

## 問題

每次開新的 Claude Code session 都從零開始：

```
你：「還記得我們昨天的 auth 設定嗎？」
Claude：「我沒有之前 session 的 context...」
```

你不斷重複解釋同樣的決策、架構和限制。

## MeMesh 如何幫助

MeMesh 讓 Claude 擁有跨 session 的持久記憶：

```bash
# 週一：你做了一個決策
buddy-remember "auth"
# → JWT 認證：access token 15分鐘，refresh token 7天
# → 1月15日決定，永久儲存
```

專案決策、架構脈絡、除錯紀錄 — 全部自動記住。

---

## 安裝

**前置需求**：[Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 和 Node.js >= 20

```bash
npm install -g @pcircle/memesh
```

重啟 Claude Code，完成。

**驗證安裝** — 在新的 Claude Code session 中輸入：

```
buddy-help
```

看到指令列表就代表 MeMesh 正在運作。

<details>
<summary>從原始碼安裝（給貢獻者）</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
```

</details>

---

## 相容性

### 支援的平台

| 平台 | 狀態 | 備註 |
|------|------|------|
| **macOS** | ✅ 完整測試 | 主要開發平台 |
| **Linux** | ✅ 完整測試 | 支援所有發行版 |
| **Windows** | ✅ 相容 | 建議使用 WSL2 以獲得最佳體驗 |

### 系統需求

- **Claude Code**: 建議使用最新版本 ([安裝指南](https://docs.anthropic.com/en/docs/claude-code))
- **Node.js**: >= 20.0.0 ([下載](https://nodejs.org/))
- **npm**: >= 9.0.0 (隨 Node.js 安裝)

### Claude Code 整合

MeMesh 可無縫整合：
- ✅ **Claude Code CLI**（終端機）- **完整功能**
- ✅ **Claude Code VS Code 擴充套件** - **完整功能**
- ✅ **Cursor**（透過 MCP）- **完整功能**
- ⚠️  **Claude Desktop (Cowork)** - **部分支援**（見下方說明）
- ✅ **其他相容 MCP 的編輯器**

#### Claude Desktop Cowork 相容性

**目前狀態**：僅雲端模式，功能受限

| 功能 | 狀態 | 備註 |
|------|------|------|
| MCP 伺服器 | ✅ 正常 | 成功以僅雲端模式啟動 |
| 基本指令 | ✅ 正常 | buddy-help, list-skills 等 |
| 記憶工具 | ❌ 停用 | recall-memory, create-entities, buddy-do, buddy-remember |
| 雲端同步 | ✅ 正常 | 需設定 MEMESH_API_KEY |
| 本地知識圖譜 | ❌ 無法使用 | better-sqlite3 無法在 Cowork 沙盒編譯 |

**限制原因**：Cowork 沙盒具有唯讀檔案系統，並阻止原生模組編譯（better-sqlite3、onnxruntime-node、sqlite-vec）。

**未來計畫**：透過雲端優先記憶架構實現完整支援。詳見 [docs/COWORK_SUPPORT.md](docs/COWORK_SUPPORT.md)。

**建議**：在雲端優先記憶實作完成前，使用 **CLI 版本**以獲得完整功能。

### 已知限制

- Windows 原生終端機可能有顯示問題（建議使用 WSL2）
- 大型知識圖譜建議至少 4GB RAM
- 向量搜尋需要約 100MB 磁碟空間存放嵌入模型

---

## 使用方式

MeMesh 在 Claude Code 中提供 3 個核心指令：

| 指令 | 功能 |
|------|------|
| `buddy-do "任務"` | 執行任務並記住學到的內容 |
| `buddy-remember "主題"` | 回想過去的決策和脈絡 |
| `buddy-help` | 顯示所有可用指令 |

**範例：**

```bash
buddy-do "解釋這個 codebase"
buddy-do "加上使用者認證"
buddy-remember "API 設計決策"
buddy-remember "為什麼選 PostgreSQL"
```

記憶儲存在你的本機，跨 session 持續保存（決策 90 天，session 脈絡 30 天）。

---

## 疑難排解

**MeMesh 沒有載入？**

```bash
# 檢查安裝
npm list -g @pcircle/memesh

# 檢查 Node.js 版本（需要 >= 20）
node --version

# 修復安裝
memesh setup
```

然後完全重啟 Claude Code。

完整指南請參閱 [疑難排解文件](docs/TROUBLESHOOTING.md)。

---

## 文件

> 詳細文件目前僅提供英文版

- **[快速開始](docs/GETTING_STARTED.md)** — 首次安裝指引
- **[使用指南](docs/USER_GUIDE.md)** — 完整使用教學
- **[指令參考](docs/COMMANDS.md)** — 所有指令與工具
- **[架構說明](docs/ARCHITECTURE.md)** — MeMesh 內部運作方式

---

## 貢獻

歡迎貢獻！請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權

AGPL-3.0 — 詳見 [LICENSE](LICENSE)

---

<div align="center">

遇到問題？[回報 Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new) — 我們會快速回應。

[回報 Bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new?labels=bug&template=bug_report.md) • [功能請求](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
