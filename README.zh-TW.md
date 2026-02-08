<div align="center">

# 🧠 MeMesh

### **為 Claude Code 添加持久記憶**

**讓 Claude 記住決策、脈絡、代碼。長期記憶，開發更快。**

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 快速安裝](#-快速安裝) • [💬 指令](#-三個指令統治一切) • [📖 文件](docs/) • [English](README.md)

</div>

---

## 🤔 問題

每次開新的 Claude Code session：

```
你：「還記得我們的 auth 設定嗎？」
Claude：「我沒有那個 context...」
你：*第 47 次解釋* 😤
```

**Claude 有失憶症。你的生產力崩潰。**

---

## ✨ 解決方案

```bash
# Session 1 (週一)
你：buddy-do "設定 JWT 認證"
MeMesh: ✅ 完成 + 已存入記憶

# Session 50 (週五)
你：buddy-remember "auth"
MeMesh: 📚 1月15日的 JWT 認證
     → Access tokens: 15分鐘
     → Refresh tokens: 7天
```

**MeMesh = 有記憶的 Claude。**

---

## 🚀 快速安裝

```bash
npm install -g @pcircle/memesh
```

重啟 Claude Code。**搞定。**

<details>
<summary>📦 替代方案：從原始碼安裝</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
npm link  # 或使用 ./scripts/quick-install.sh
```

</details>

---

## 💬 三個指令統治一切

```bash
buddy-do "任何開發任務"          # 執行 + 記憶
buddy-remember "主題"           # 即時回想
buddy-help                      # 卡住時用
```

**範例：**

```bash
buddy-do "解釋這個 codebase"
buddy-do "加上使用者認證"
buddy-do "修正 build error"

buddy-remember "API 設計決策"
buddy-remember "為什麼選 PostgreSQL"

buddy-help  # 顯示所有可用指令
```

---

## 🎯 核心功能

### 🧠 **持久記憶**
- 記住專案決策（90天）
- 回想 session context（30天）
- 語意搜尋所有記憶

### 🔍 **知識圖譜**
- 自動整理你的知識
- 連結相關概念
- FTS5 + 向量搜尋

### ⚡ **零配置**
- 自動追蹤專案變更
- 自動標記記憶
- 安裝即用

---

## 📚 了解更多

> **注意**：詳細文檔目前僅提供英文版本

**核心文檔**：
- **[使用指南](docs/USER_GUIDE.md)** - 完整使用教學
- **[指令參考](docs/COMMANDS.md)** - 所有可用指令與工具
- **[快速開始](docs/GETTING_STARTED.md)** - 新手安裝指南
- **[疑難排解](docs/TROUBLESHOOTING.md)** - 常見問題

**進階文檔**：
- **[架構說明](docs/ARCHITECTURE.md)** - 系統架構與設計
- **[最佳實踐](docs/BEST_PRACTICES.md)** - 使用建議與技巧
- **[API 參考](docs/api/API_REFERENCE.md)** - 完整 API 文檔

---

## 🤝 貢獻

歡迎貢獻！請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 授權

AGPL-3.0 - 詳見 [LICENSE](LICENSE)

---

<div align="center">

**由 vibe coders 打造，為 vibe coders 服務** 🚀

[回報 Bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [功能請求](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
