# 🛡️ 安裝流程保護機制總結

> **建立日期**: 2026-02-04
> **目的**: 防止隨意修改安裝流程，確保所有安裝方式始終成功

---

## 🎯 問題回顧

**過去的問題**：
- ❌ 隨意修改安裝腳本和配置
- ❌ 沒有統一的安裝流程標準
- ❌ 修改後未經完整測試
- ❌ 文檔與實際流程不同步
- ❌ 導致安裝經常失敗

**影響**：
- 浪費用戶時間在解決安裝問題
- 無法專心於功能開發
- 降低專案可信度

---

## ✅ 已建立的保護機制

### 1. 📖 標準規範文檔

**檔案**: `INSTALLATION_STANDARD.md`

**內容**：
- ✅ 定義唯一合法的安裝流程（4 種方式）
- ✅ 檔案結構固定規範（禁止隨意修改）
- ✅ MCP 配置格式固定規範
- ✅ Plugin 元資料格式固定規範
- ✅ Build 腳本標準流程
- ✅ 變更控制流程（提案→測試→文檔→版本）
- ✅ 違規行為明確列舉

**鐵律**：
1. 檔案結構固定（`plugin.json` 在 `.claude-plugin/`，`.mcp.json` 在 plugin root）
2. MCP 配置必須使用 `${CLAUDE_PLUGIN_ROOT}`
3. plugin.json 禁止包含 `mcpServers`

---

### 2. 📋 部署檢查清單

**檔案**: `PLUGIN_DEPLOYMENT_CHECKLIST.md`

**包含 9 大部分**：
1. Package 結構檢查
2. Build 系統檢查
3. 本地測試流程
4. npm 發布檢查
5. GitHub Marketplace 準備
6. 所有安裝方式完整測試
7. 安全性與品質檢查
8. 文檔完整性檢查
9. 發布前最終檢查

**使用時機**：每次發布前必須完整執行

---

### 3. 🔧 自動化檢查腳本

**檔案**: `scripts/pre-deployment-check.sh`

**檢查項目**（13 項）：
- ✅ 核心檔案存在性
- ✅ package.json 配置正確性
- ✅ plugin.json 格式（無 mcpServers）
- ✅ mcp.json 格式（使用 CLAUDE_PLUGIN_ROOT）
- ✅ TypeScript 編譯
- ✅ dist 目錄正確生成
- ✅ Plugin build 成功
- ✅ Plugin 結構完整
- ✅ npm pack 測試
- ✅ 無敏感資訊洩露
- ✅ MCP server 可啟動
- ✅ MCP server 連接狀態
- ✅ 測試通過

**執行**：
```bash
./scripts/pre-deployment-check.sh
```

**結果**：
- 全部通過 → 可以部署
- 任何失敗 → 不可部署，必須修正

---

### 4. 🔒 Git Pre-commit Hook

**檔案**: `.husky/pre-commit`

**觸發時機**：提交包含以下檔案的變更時
- `package.json`
- `plugin.json`
- `mcp.json`
- `scripts/prepare-plugin.js`
- `scripts/quick-install.sh`

**自動檢查**：
1. JSON 檔案格式驗證
2. plugin.json 不包含 mcpServers
3. mcp.json 使用 CLAUDE_PLUGIN_ROOT
4. 執行測試
5. 提醒更新文檔

**效果**：防止提交有問題的安裝配置

---

### 5. 🤖 GitHub Actions CI/CD

**檔案**: `.github/workflows/plugin-deployment-check.yml`

**觸發時機**：
- 手動觸發（workflow_dispatch）
- Tag 推送（v*）

**自動執行**：
1. TypeScript 型別檢查
2. Linting
3. 所有測試
4. Build
5. Plugin build
6. 驗證 plugin 結構
7. 驗證 package.json
8. 測試 npm pack
9. 檢查無敏感資訊洩露

**效果**：CI 失敗 → 不可合併/發布

---

### 6. 📝 PR Template 強化

**檔案**: `.github/PULL_REQUEST_TEMPLATE.md`

**新增「安裝流程變更」檢查區**：
- [ ] 已讀 `INSTALLATION_STANDARD.md`
- [ ] 已執行 `pre-deployment-check.sh` 全部通過
- [ ] 已測試所有 4 種安裝方式
- [ ] 已更新所有相關文檔
- [ ] CI/CD 全部通過

**效果**：強制 PR 作者完成所有檢查

---

## 🔄 標準安裝流程（固定不變）

### 方式 1: npm 全域安裝
```bash
npm install -g @pcircle/memesh
```

### 方式 2: Quick Install Script
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

### 方式 3: Claude Code Plugin Directory
```bash
claude --plugin-dir /path/to/.claude-plugin/memesh
```

### 方式 4: GitHub Marketplace
```bash
/plugin marketplace add PCIRCLE-AI/claude-code-buddy
/plugin install memesh@pcircle-ai
```

**這 4 種方式為唯一合法方式，禁止隨意新增或修改。**

---

## 🚨 違規行為與後果

### 禁止的行為：
1. ❌ 未經測試修改安裝腳本
2. ❌ 改變檔案結構（plugin.json, mcp.json 位置）
3. ❌ 跳過 pre-deployment-check
4. ❌ 修改代碼但不更新文檔
5. ❌ 破壞任何一種安裝方式

### 後果：
- 🔴 Pre-commit hook 阻止提交
- 🔴 CI/CD 檢查失敗
- 🔴 PR 不會被合併
- 🔴 必須回退所有變更
- 🔴 重新執行完整測試

---

## ✅ 使用指南

### 開發者日常工作流程：

**1. 開發功能**（不涉及安裝流程）
```bash
# 正常開發
git add .
git commit -m "feat: add new feature"  # ✅ 不觸發特殊檢查
git push
```

**2. 修改安裝相關檔案**
```bash
# 修改 package.json, plugin.json 等
git add package.json

# 🚨 Pre-commit hook 自動執行
# - 驗證 JSON 格式
# - 執行測試
# - 提醒更新文檔

git commit -m "fix: update installation script"

# 推送前執行完整檢查
./scripts/pre-deployment-check.sh

# ✅ 全部通過後才 push
git push
```

**3. 準備發布**
```bash
# 執行完整檢查清單
./scripts/pre-deployment-check.sh

# 檢查 PLUGIN_DEPLOYMENT_CHECKLIST.md
# 逐項確認所有項目

# 更新版本
npm version patch  # 或 minor/major

# 建立 tag
git tag v2.6.7
git push origin v2.6.7

# 🤖 CI/CD 自動執行所有檢查

# ✅ CI 通過後才發布
npm publish
```

---

## 📊 成功指標

### 安裝成功的標準：

```bash
# ✅ 所有檢查通過
$ ./scripts/pre-deployment-check.sh
總檢查項目: 13
通過: 13
失敗: 0
✅ 所有檢查通過！準備好部署了！

# ✅ MCP 連接成功
$ claude mcp list | grep memesh
memesh: ... - ✓ Connected

# ✅ 所有安裝方式都成功
- npm install -g @pcircle/memesh ✓
- ./scripts/quick-install.sh ✓
- claude --plugin-dir ✓
- /plugin install memesh@pcircle-ai ✓
```

---

## 🎯 預期效果

### 對開發者：
- ✅ 明確的安裝流程標準
- ✅ 自動化檢查防止錯誤
- ✅ 清晰的變更流程指引
- ✅ 安心修改，不怕破壞

### 對用戶：
- ✅ 安裝總是成功
- ✅ 所有方式都可靠
- ✅ 可以專心功能開發
- ✅ 不用擔心安裝問題

---

## 📝 維護與更新

### 這些保護機制本身也需要維護：

**定期檢查**（每個版本發布前）：
- [ ] `INSTALLATION_STANDARD.md` 是否與實際流程同步
- [ ] `pre-deployment-check.sh` 檢查項目是否完整
- [ ] CI/CD workflow 是否正常運作
- [ ] Pre-commit hook 是否有效

**更新時機**：
- 新增安裝方式（需要完整的提案與測試）
- 修改 plugin 規範（需要向後相容性評估）
- Claude Code 更新導致規範變更

---

## 🔐 承諾

**我承諾**：
1. ✅ 嚴格遵守 `INSTALLATION_STANDARD.md` 的所有規範
2. ✅ 修改安裝相關檔案前先執行檢查
3. ✅ 不跳過任何驗證步驟
4. ✅ 保持所有文檔與代碼同步
5. ✅ 任何安裝流程變更都經過完整測試
6. ✅ 確保所有 4 種安裝方式始終可用

**結果**：
- 🎯 安裝流程穩定可靠
- 🎯 用戶可以專心開發功能
- 🎯 不再浪費時間解決安裝問題

---

**最後更新**: 2026-02-04
**狀態**: ✅ 所有機制已建立並生效
**下次檢查**: v2.6.7 發布前
