# 🧪 安裝測試文檔

> **狀態**: [![Installation Testing](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml/badge.svg)](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml)

## 📋 測試覆蓋範圍

MeMesh 的安裝流程經過以下完整測試：

### ✅ 測試的安裝方式

1. **npm 全域安裝**
   - 測試環境：Ubuntu, Node 20/22
   - 測試內容：`npm install -g @pcircle/memesh`
   - 驗證：tarball 內容、可執行性

2. **Plugin Build**
   - 測試環境：Ubuntu
   - 測試內容：`npm run build:plugin`
   - 驗證：檔案結構、JSON 格式、MCP server

3. **MCP Server Standalone**（新增）
   - 測試環境：本地/CI
   - 測試內容：獨立測試 MCP server 功能
   - 驗證：
     - MCP server 檔案存在
     - 版本命令可執行
     - MCP 協議基本回應
     - 環境變數處理
     - 依賴完整性
   - 限制：無法測試完整 MCP 握手和 Claude Code 整合

4. **Docker Clean Install**
   - 測試環境：Docker（完全乾淨環境）
   - 測試內容：從零開始安裝
   - 驗證：完整安裝流程

5. **安全性檢查**
   - npm audit
   - 敏感資訊掃描
   - .env 檔案檢查

---

## 🔧 本地測試方式

### 方式 1: 執行完整檢查腳本

```bash
./scripts/pre-deployment-check.sh
```

### 方式 2: MCP Server 獨立測試（快速）

```bash
./scripts/test-mcp-server-standalone.sh
```

獨立測試 MCP server 功能，不需要 Docker 或完整 Claude Code 環境。

### 方式 3: Docker 測試（推薦）

```bash
./scripts/test-installation-docker.sh
```

這會在完全乾淨的 Docker 容器中測試安裝流程，模擬真實用戶環境。

### 方式 4: 手動測試

```bash
# 1. 安裝依賴
npm ci

# 2. Build
npm run build

# 3. Plugin build
npm run build:plugin

# 4. 驗證檔案結構
test -f .claude-plugin/memesh/.mcp.json && echo "✅ .mcp.json exists"
test -f .claude-plugin/memesh/.claude-plugin/plugin.json && echo "✅ plugin.json exists"

# 5. 測試 MCP Server
./scripts/test-mcp-server-standalone.sh
```

---

## 🤖 CI/CD 自動化測試

### 觸發條件

**自動觸發**：
- Push to `main` or `develop` branch
- Pull Request to `main` or `develop`
- 修改以下檔案時：
  - `package.json`
  - `plugin.json`
  - `mcp.json`
  - `scripts/**`
  - `src/**`

**手動觸發**：
- GitHub Actions → "Installation Testing" → "Run workflow"

### 測試階段

```
Stage 1: Basic Checks
  ├─ JSON 格式驗證
  ├─ 檔案結構檢查
  └─ 基本語法檢查

Stage 2: npm Install Test
  ├─ Node 20 測試
  ├─ Node 22 測試
  ├─ npm pack 驗證
  └─ Tarball 內容檢查

Stage 3: Plugin Build Test
  ├─ Build 成功
  ├─ Plugin 結構驗證
  ├─ JSON 格式驗證
  ├─ MCP server 可執行性
  └─ MCP Server 獨立功能測試

Stage 4: Docker Clean Install
  └─ 完全乾淨環境測試

Stage 5: Security Checks
  ├─ npm audit
  ├─ 敏感資訊掃描
  └─ .env 檢查
```

---

## 📊 測試報告

### 如何查看測試結果

1. **GitHub Actions 頁面**
   - https://github.com/PCIRCLE-AI/claude-code-buddy/actions
   - 選擇 "Installation Testing" workflow
   - 查看最新的執行結果

2. **PR 中的狀態檢查**
   - 每個 PR 都會自動執行測試
   - 在 PR 頁面底部查看測試狀態
   - 必須所有測試通過才能合併

3. **README Badge**
   - README.md 頂部的 badge 顯示當前測試狀態
   - 綠色 = 通過，紅色 = 失敗

---

## 🛡️ 保障程度（誠實評估）

### ✅ 我們能保證的（~70-80%）

**Build & Package 層級**：
- ✅ JSON 格式正確（package.json, plugin.json, mcp.json）
- ✅ 檔案結構符合 Claude Code 標準
- ✅ TypeScript 編譯成功
- ✅ npm package 可以正常打包
- ✅ 依賴完整性（npm audit 通過）
- ✅ MCP server 檔案可執行
- ✅ MCP server 能回應基本協議請求
- ✅ 多 Node 版本兼容（20, 22）
- ✅ 乾淨環境安裝（Docker）
- ✅ 安全性掃描（secrets, vulnerabilities）

### ⚠️ 我們「無法」在 CI/CD 中測試的（~20-30%）

**實際整合層級**（需要真實 Claude Code 環境）：
- ❌ Claude Code 能否實際載入 plugin
- ❌ MCP server 在 Claude Code 中能否成功連線
- ❌ Plugin 功能在 Claude Code 中是否正常運作
- ❌ 用戶實際使用體驗

**平台覆蓋**（需要不同 OS runners）：
- ⚠️ Windows 環境實測
- ⚠️ macOS 環境實測（目前在 macOS 開發，有部分保障）

### 📊 為什麼無法達到 100%？

**技術限制**：
1. **Claude Code 需要登入**：無法在 CI/CD 中自動登入測試
2. **沒有 headless 模式**：Claude Code 不支援無介面自動化測試
3. **MCP 協議複雜性**：完整的 MCP 握手需要實際的 Claude Code 環境
4. **平台依賴**：GitHub Actions 提供的 runner 有限

**現實評估**：
- 我們的測試能確保「build 不會壞」
- 我們的測試能確保「結構正確」
- 我們的測試能確保「MCP server 基本可運行」
- **但無法確保「在用戶的 Claude Code 中一定能成功」**

### 💡 補償措施

為了彌補這 20-30% 的測試缺口：

1. **本地手動測試**：開發者在本機 Claude Code 驗證
2. **Pre-deployment checklist**：部署前人工檢查清單
3. **快速回滾機制**：npm 版本管理，發現問題立即回滾
4. **用戶回報機制**：GitHub Issues 追蹤實際問題
5. **文檔完整性**：詳細的安裝指南和故障排除文檔

### ✅ 結論

**我們提供的是「高度可信但非 100% 保證」的安裝流程**：
- Build 和 package 層級：~95% 保障
- 實際 Claude Code 整合：需要人工驗證
- 總體評估：~70-80% 自動化保障

---

## 🚨 測試失敗處理

### 如果 CI 測試失敗

1. **查看錯誤訊息**
   - 點擊失敗的 job
   - 展開失敗的 step
   - 查看詳細錯誤訊息

2. **本地重現**
   ```bash
   # 使用 Docker 測試重現問題
   ./scripts/test-installation-docker.sh
   ```

3. **修正問題**
   - 根據錯誤訊息修正代碼
   - 本地測試通過後再 push

4. **重新執行 CI**
   - Push 修正後的代碼
   - CI 會自動重新執行

### 如果本地測試失敗

1. **檢查檔案結構**
   ```bash
   ls -la .claude-plugin/memesh/
   ```

2. **檢查 JSON 格式**
   ```bash
   node -e "require('./plugin.json')"
   node -e "require('./mcp.json')"
   ```

3. **重新 build**
   ```bash
   npm run build
   npm run build:plugin
   ```

4. **執行完整檢查**
   ```bash
   ./scripts/pre-deployment-check.sh
   ```

---

## 📝 添加新的測試

如果需要添加新的安裝方式測試：

1. 更新 `Dockerfile.test`（如果需要 Docker 測試）
2. 更新 `.github/workflows/installation-test.yml`
3. 更新 `scripts/pre-deployment-check.sh`
4. 更新此文檔

---

## ✅ 成功標準

測試全部通過的標準：

```bash
✅ All JSON files are valid
✅ File structure is correct
✅ npm pack successful
✅ Plugin structure verified
✅ Docker clean install passed
✅ No secrets found
✅ No security vulnerabilities (high/critical)
```

**只有當所有檢查都通過，才能認為安裝流程是可靠的。**

---

**最後更新**: 2026-02-04
**維護者**: PCIRCLE AI Team
