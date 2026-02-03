# 🚀 MeMesh Plugin 部署檢查清單

> **目的**：確保 plugin 能被成功安裝，適用於所有安裝方式

**版本**: v2.6.6
**最後更新**: 2026-02-04

---

## 📦 Part 1: Package 結構檢查

### 1.1 核心檔案結構
- [ ] `package.json` 存在且配置正確
  - [ ] `name`: `@pcircle/memesh`
  - [ ] `version`: 正確的版本號
  - [ ] `main`: `dist/index.js`
  - [ ] `bin.memesh`: `dist/mcp/server-bootstrap.js`
  - [ ] `files` 包含：`dist/`, `plugin.json`, `mcp.json`, `scripts/postinstall.js`
  - [ ] `engines`: Node >= 20.0.0, npm >= 9.0.0

- [ ] `plugin.json` 存在且格式正確
  - [ ] **不包含** `mcpServers` 欄位（已移到 `.mcp.json`）
  - [ ] 包含：`name`, `description`, `version`, `author`, `homepage`, `repository`, `license`

- [ ] `mcp.json` 存在且格式正確
  - [ ] 包含 MCP server 配置
  - [ ] 使用 `${CLAUDE_PLUGIN_ROOT}` 變數
  - [ ] 包含必要的 `env` 變數（`NODE_ENV`, `DISABLE_MCP_WATCHDOG`）

- [ ] `README.md` 包含完整安裝說明
  - [ ] Claude Code 安裝方式
  - [ ] Cursor 安裝方式
  - [ ] npm 安裝方式
  - [ ] 本地開發測試方式

---

## 🔨 Part 2: Build 系統檢查

### 2.1 Build Scripts
- [ ] `npm run build` 成功執行
  - [ ] TypeScript 編譯無錯誤
  - [ ] `dist/` 目錄正確生成
  - [ ] `dist/mcp/server-bootstrap.js` 存在

- [ ] `npm run build:plugin` 成功執行
  - [ ] `.claude-plugin/memesh/` 目錄正確生成
  - [ ] `.claude-plugin/memesh/.claude-plugin/plugin.json` 存在
  - [ ] `.claude-plugin/memesh/.mcp.json` 存在
  - [ ] `.claude-plugin/memesh/dist/` 存在
  - [ ] `.claude-plugin/memesh/node_modules/` 存在

### 2.2 Plugin 準備腳本（prepare-plugin.js）
- [ ] 正確複製所有必要檔案
  - [ ] `plugin.json` → `.claude-plugin/memesh/.claude-plugin/`
  - [ ] `mcp.json` → `.claude-plugin/memesh/.mcp.json`
  - [ ] `dist/` → `.claude-plugin/memesh/dist/`
  - [ ] `package.json` → `.claude-plugin/memesh/`
  - [ ] `scripts/` → `.claude-plugin/memesh/scripts/`

- [ ] A2A token 正確注入
  - [ ] 從 `.env` 讀取 `MEMESH_A2A_TOKEN`
  - [ ] 注入到 `.mcp.json` 的 `env.MEMESH_A2A_TOKEN`
  - [ ] 顯示 token 預覽（前 8 + 後 8 字元）

- [ ] 驗證步驟完整
  - [ ] 檢查所有必要檔案存在
  - [ ] 輸出清晰的成功/錯誤訊息

---

## 🧪 Part 3: 本地測試流程

### 3.1 Quick Install Script
- [ ] `./scripts/quick-install.sh` 可執行
  - [ ] Node.js 版本檢查（>= 20）
  - [ ] 依賴安裝成功
  - [ ] Build 成功
  - [ ] Plugin 準備成功
  - [ ] MCP server 註冊成功（如果 claude CLI 可用）

### 3.2 MCP Server 測試
- [ ] MCP server 可獨立啟動
  ```bash
  node ./.claude-plugin/memesh/dist/mcp/server-bootstrap.js --version
  ```
  應輸出版本號

- [ ] MCP server 在 stdio 模式正常運行
  ```bash
  NODE_ENV=production node ./.claude-plugin/memesh/dist/mcp/server-bootstrap.js
  ```
  應等待 stdin 輸入（無錯誤）

- [ ] MCP server 註冊後連接成功
  ```bash
  claude mcp list | grep memesh
  ```
  應顯示 `✓ Connected`

### 3.3 Plugin 載入測試
- [ ] 使用 `--plugin-dir` 載入成功
  ```bash
  claude --plugin-dir ~/.../claude-code-buddy/.claude-plugin/memesh
  ```

- [ ] Plugin 在 Claude Code 中可見
  - [ ] MCP tools 可用（18+ tools）
  - [ ] Commands 可執行（`buddy-help`, `buddy-do`, `buddy-remember`）

---

## 📤 Part 4: npm 發布檢查

### 4.1 發布前驗證
- [ ] `npm pack` 成功生成 tarball
  - [ ] 檢查 tarball 內容：`tar -tzf pcircle-memesh-*.tgz`
  - [ ] 確認包含所有 `files` 欄位列出的檔案

- [ ] 本地測試 npm 安裝
  ```bash
  npm install -g ./pcircle-memesh-*.tgz
  npx memesh --version
  ```

- [ ] Postinstall script 正常執行
  - [ ] 顯示安裝成功訊息
  - [ ] 生成 A2A token（如果不存在）
  - [ ] 輸出配置範例

### 4.2 版本管理
- [ ] 版本號一致
  - [ ] `package.json` version
  - [ ] `plugin.json` version
  - [ ] Git tag（如果已 tag）

- [ ] CHANGELOG.md 已更新
  - [ ] 記錄此版本的變更
  - [ ] 包含重大變更說明

### 4.3 發布執行
- [ ] npm 登入狀態確認
  ```bash
  npm whoami
  ```

- [ ] 發布到 npm
  ```bash
  npm publish --access public
  ```

- [ ] 驗證發布成功
  ```bash
  npm view @pcircle/memesh
  ```

---

## 🌐 Part 5: GitHub Marketplace 準備

### 5.1 Repository 檢查
- [ ] `.claude-plugin/marketplace.json` 正確配置
  - [ ] Marketplace name: `pcircle-ai`
  - [ ] Plugin 資訊完整
  - [ ] Source 指向正確的 GitHub repo

- [ ] README 包含 GitHub 安裝說明
  ```bash
  /plugin marketplace add PCIRCLE-AI/claude-code-buddy
  /plugin install memesh@pcircle-ai
  ```

### 5.2 Git 標籤與發布
- [ ] 建立版本 tag
  ```bash
  git tag v2.6.6
  git push origin v2.6.6
  ```

- [ ] GitHub Release 建立
  - [ ] Release notes 完整
  - [ ] 附加 tarball（可選）

---

## 🔄 Part 6: 安裝方式完整測試

### 6.1 方式 1: NPM 全域安裝
```bash
npm install -g @pcircle/memesh
```
**測試**：
- [ ] 安裝成功無錯誤
- [ ] `npx memesh --version` 顯示正確版本
- [ ] Postinstall 訊息正確顯示
- [ ] 使用者知道如何配置 MCP

### 6.2 方式 2: Claude Code Plugin 本地載入
```bash
claude --plugin-dir /path/to/.claude-plugin/memesh
```
**測試**：
- [ ] Claude Code 啟動成功
- [ ] Plugin 被識別
- [ ] MCP server 自動啟動
- [ ] Tools 可用

### 6.3 方式 3: GitHub Marketplace
```bash
/plugin marketplace add PCIRCLE-AI/claude-code-buddy
/plugin install memesh@pcircle-ai
```
**測試**：
- [ ] Marketplace 添加成功
- [ ] Plugin 可搜尋到
- [ ] 安裝成功
- [ ] MCP server 自動配置

### 6.4 方式 4: Quick Install Script
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```
**測試**：
- [ ] 腳本執行無錯誤
- [ ] 所有步驟成功
- [ ] MCP server 註冊成功
- [ ] 輸出訊息清晰

### 6.5 方式 5: Cursor 快速安裝連結
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=...
```
**測試**：
- [ ] 連結可點擊
- [ ] Cursor 識別安裝請求
- [ ] MCP 配置正確
- [ ] 重啟後可用

---

## 🛡️ Part 7: 安全性與品質檢查

### 7.1 依賴檢查
- [ ] `npm audit` 無 critical/high vulnerabilities
- [ ] 所有依賴版本固定或使用 `^` 範圍
- [ ] `package-lock.json` 已提交

### 7.2 環境變數安全
- [ ] `.env` 不在 git 中（已加入 `.gitignore`）
- [ ] `.env.example` 提供範本
- [ ] README 說明如何設置環境變數
- [ ] A2A token 生成腳本可用

### 7.3 測試覆蓋率
- [ ] 單元測試通過
  ```bash
  npm test
  ```

- [ ] E2E 測試通過（如果有）
  ```bash
  npm run test:e2e:safe
  ```

### 7.4 代碼品質
- [ ] Linting 通過
  ```bash
  npm run lint
  ```

- [ ] TypeScript 型別檢查通過
  ```bash
  npm run typecheck
  ```

---

## 📚 Part 8: 文檔完整性

### 8.1 核心文檔
- [ ] `README.md` 完整且最新
  - [ ] 功能描述清晰
  - [ ] 所有安裝方式都有說明
  - [ ] Quick start 可執行
  - [ ] Troubleshooting 有幫助

- [ ] `docs/USER_GUIDE.md` 存在
  - [ ] 所有功能有使用範例
  - [ ] Commands 說明完整

- [ ] `docs/API_REFERENCE.md` 存在
  - [ ] API 端點文檔化
  - [ ] 請求/回應範例

### 8.2 開發者文檔
- [ ] `CONTRIBUTING.md` 存在
  - [ ] 開發設置說明
  - [ ] 測試指南
  - [ ] Pull request 流程

- [ ] `CHANGELOG.md` 保持更新
  - [ ] 每個版本的變更記錄
  - [ ] Breaking changes 標記

---

## ✅ Part 9: 發布前最終檢查

### 9.1 版本資訊
- [ ] 版本號在所有檔案中一致
- [ ] Git 工作目錄乾淨（無未提交變更）
- [ ] 所有測試通過

### 9.2 發布清單
- [ ] README badges 正確（npm version, license, etc.）
- [ ] GitHub repository topics 設置（mcp, claude-code, ai, etc.）
- [ ] npm keywords 完整

### 9.3 Communication
- [ ] GitHub Discussions 發布公告
- [ ] Twitter/社群媒體分享（如適用）
- [ ] 更新相關文檔連結

---

## 🔧 Troubleshooting Checklist

如果安裝失敗，檢查：

### 使用者環境
- [ ] Node.js >= 20.0.0
- [ ] npm >= 9.0.0
- [ ] Claude Code 版本最新

### 常見問題
- [ ] MCP server 無法連接
  - 檢查 `.mcp.json` 路徑是否使用 `${CLAUDE_PLUGIN_ROOT}`
  - 檢查環境變數是否正確設置
  - 檢查 `server-bootstrap.js` 是否存在

- [ ] Plugin 無法載入
  - 檢查 `plugin.json` 格式
  - 檢查檔案權限
  - 檢查是否在正確目錄

- [ ] Tools 不可用
  - 檢查 MCP server 連接狀態
  - 重啟 Claude Code
  - 檢查日誌檔案

---

## 📊 Success Metrics

安裝成功的標準：

- [ ] MCP server status: `✓ Connected`
- [ ] `buddy-help` 命令有回應
- [ ] 至少 18 個 MCP tools 可用
- [ ] A2A Protocol 正常運作
- [ ] 無安裝錯誤或警告

---

## 📝 Notes

**重要提醒**：
1. 每次發布前都要完整執行此 checklist
2. 在多個環境測試（macOS, Linux, Windows 如適用）
3. 保持此 checklist 與專案同步更新
4. 記錄發現的問題和解決方案

**最後更新**: 2026-02-04 by Claude Code
**下次檢查**: 發布 v2.6.7 之前
