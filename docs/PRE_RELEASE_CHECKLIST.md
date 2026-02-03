# MeMesh Plugin Pre-Release Checklist

**目的：確保每次發布前所有關鍵項目都已檢查驗證，避免用戶安裝時遇到問題。**

---

## ✅ Phase 1: Code Quality & Testing

### 1.1 Tests
- [ ] 所有單元測試通過 (`npm test`)
  ```bash
  npm test
  # 預期：2020+ tests passed, 0 failed
  ```
- [ ] 測試覆蓋率 ≥ 80%
  ```bash
  npm run test:coverage
  # 檢查 coverage/lcov-report/index.html
  ```
- [ ] E2E 測試通過（如有）
- [ ] 沒有 skipped 或 todo 測試（除非有充分理由）

### 1.2 Build
- [ ] Build 成功無錯誤 (`npm run build`)
  ```bash
  npm run build
  # 檢查 dist/ 目錄完整性
  ```
- [ ] TypeScript 編譯無錯誤
- [ ] 沒有 `@ts-ignore` 或 `@ts-expect-error`（除非有充分理由並註記）
- [ ] 所有必要的資源檔案已複製到 dist/

### 1.3 Code Review
- [ ] 沒有 console.log (除了刻意的 logging)
- [ ] 沒有 TODO 或 FIXME comments（除非記錄到 GitHub Issues）
- [ ] 沒有 hardcoded secrets 或 API keys
- [ ] 沒有 hardcoded 路徑（使用 `${CLAUDE_PLUGIN_ROOT}`）
- [ ] 錯誤處理完整
- [ ] 所有 public API 都有文檔

---

## ✅ Phase 2: Plugin Structure

### 2.1 Plugin Directory Structure
- [ ] `.claude-plugin/memesh/.claude-plugin/plugin.json` 存在
  ```bash
  ls -la .claude-plugin/memesh/.claude-plugin/plugin.json
  ```
- [ ] `plugin.json` 在**正確位置**（.claude-plugin/ 子目錄，不是根目錄）
- [ ] `dist/mcp/server-bootstrap.js` 存在且可執行
  ```bash
  ls -lh .claude-plugin/memesh/dist/mcp/server-bootstrap.js
  ```
- [ ] `node_modules/` 包含所有 production dependencies
- [ ] `package.json` 和 `package-lock.json` 都存在

### 2.2 Plugin Manifest (plugin.json)
- [ ] 包含必要欄位：`name`
- [ ] 包含建議欄位：`version`, `description`, `author`, `license`
- [ ] `version` 遵循 semantic versioning (MAJOR.MINOR.PATCH)
- [ ] `mcpServers` 配置正確
  - [ ] 使用 `${CLAUDE_PLUGIN_ROOT}` 而非 hardcoded path
  - [ ] 指向 `server-bootstrap.js`（不是 `server.js`）
- [ ] 如有 keywords，確保相關且實用
- [ ] 如有 homepage/repository，確保 URL 正確

**驗證命令**：
```bash
cat .claude-plugin/memesh/.claude-plugin/plugin.json | jq .
```

### 2.3 檔案命名規範
- [ ] 所有檔案使用 kebab-case
- [ ] 沒有空格或特殊字元
- [ ] 一致的命名風格

---

## ✅ Phase 3: Installation & Setup

### 3.1 Fresh Install Test（最重要！）
在**全新環境**測試完整安裝流程：

```bash
# 清空測試環境
cd /tmp
rm -rf plugin-install-test
mkdir plugin-install-test
cd plugin-install-test

# Clone 專案
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git .

# 執行安裝
bash scripts/quick-install.sh

# 驗證結果
ls -la .claude-plugin/memesh/.claude-plugin/plugin.json
ls -la .claude-plugin/memesh/dist/mcp/server-bootstrap.js
claude mcp list | grep memesh-dev
```

**檢查項目**：
- [ ] 安裝過程無錯誤
- [ ] Plugin 結構正確建立
- [ ] MCP server 成功註冊
- [ ] MCP server 狀態為 `✓ Connected`

### 3.2 Installation Scripts
- [ ] `scripts/quick-install.sh` 可執行
  ```bash
  test -x scripts/quick-install.sh
  ```
- [ ] `scripts/prepare-plugin.js` 無語法錯誤
  ```bash
  node scripts/prepare-plugin.js --help
  ```
- [ ] `scripts/postinstall.js` 執行正常
  ```bash
  node scripts/postinstall.js
  ```

### 3.3 Dependencies
- [ ] `package.json` dependencies 版本正確
- [ ] 沒有不必要的 dependencies
- [ ] 沒有 security vulnerabilities
  ```bash
  npm audit
  # 預期：0 vulnerabilities
  ```
- [ ] Production dependencies 數量合理（< 500 packages）

---

## ✅ Phase 4: MCP Server

### 4.1 MCP Server Registration
- [ ] `npm run build:plugin` 自動註冊 MCP server
- [ ] MCP server 名稱正確（`memesh-dev` for dev, `memesh` for production）
- [ ] 環境變數正確設置
  ```bash
  grep -A10 "memesh" ~/.claude.json
  # 檢查 NODE_ENV, MEMESH_DATA_DIR, LOG_LEVEL
  ```

### 4.2 MCP Server Functionality
- [ ] Server 可以啟動（手動測試）
  ```bash
  node .claude-plugin/memesh/dist/mcp/server-bootstrap.js
  # 應該顯示手動啟動警告（預期行為）
  ```
- [ ] Server 連接狀態正常
  ```bash
  claude mcp list | grep memesh
  # 預期：✓ Connected
  ```
- [ ] Tools 數量正確（18 tools for Phase 1.0）
- [ ] A2A tools 可用：
  - `a2a-send-task`
  - `a2a-get-task`
  - `a2a-list-tasks`
  - `a2a-list-agents`
  - `a2a-report-result`

---

## ✅ Phase 5: Documentation

### 5.1 User-Facing Documentation
- [ ] `README.md` 安裝說明正確
- [ ] `README.md` 包含最新功能
- [ ] `docs/DEV_SETUP_GUIDE.md` 存在且完整
- [ ] `docs/A2A_SETUP_GUIDE.md` 描述 A2A Protocol 功能
- [ ] 所有文檔中的範例程式碼可執行
- [ ] 所有文檔中的連結有效

### 5.2 Internal Documentation
- [ ] `CHANGELOG.md` 已更新
- [ ] `package.json` version 已更新
- [ ] Git tags 正確（如要發布）
- [ ] Commit messages 清晰

### 5.3 Error Messages & Troubleshooting
- [ ] 錯誤訊息清晰易懂
- [ ] 提供 troubleshooting 指引
- [ ] 常見問題有文檔說明

---

## ✅ Phase 6: Security & Privacy

### 6.1 Secrets Management
- [ ] 沒有 hardcoded secrets
- [ ] `.env.example` 包含所有必要變數
- [ ] `.gitignore` 包含 `.env`
- [ ] 敏感資料使用環境變數或 secrets management

### 6.2 Data Privacy
- [ ] 不收集用戶個人資訊（除非明確告知）
- [ ] 本地資料儲存位置明確（`~/.memesh`）
- [ ] 隱私政策明確（如適用）

### 6.3 Permissions
- [ ] 檔案權限正確（不要求 sudo）
- [ ] 執行檔有 execute permission
  ```bash
  ls -l scripts/*.sh | grep -E "^-rwx"
  ```

---

## ✅ Phase 7: Compatibility

### 7.1 Node.js Version
- [ ] 支援 Node.js 20+
- [ ] `package.json` engines 欄位正確
  ```json
  "engines": {
    "node": ">=20.0.0"
  }
  ```

### 7.2 Platform Support
- [ ] macOS 測試通過
- [ ] Linux 測試通過（如支援）
- [ ] Windows 測試通過（如支援）

### 7.3 Claude Code Compatibility
- [ ] 與最新版 Claude Code 相容
- [ ] MCP protocol 版本正確（1.25.3+）

---

## ✅ Phase 8: Performance

### 8.1 Build Performance
- [ ] Build time < 60 秒
- [ ] 產出大小合理（dist/ < 10MB）

### 8.2 Runtime Performance
- [ ] MCP server 啟動時間 < 3 秒
- [ ] Tool 回應時間 < 1 秒（一般情況）
- [ ] 記憶體使用合理（< 200MB）

### 8.3 Database Performance
- [ ] SQLite 查詢優化（有 indexes）
- [ ] 無 N+1 queries
- [ ] 連接池配置正確

---

## ✅ Phase 9: Git & Version Control

### 9.1 Clean Working Tree
- [ ] `git status` 無 uncommitted changes
- [ ] 沒有 untracked files（應該在 .gitignore）
- [ ] 所有變更都已 commit

### 9.2 Git Tags
- [ ] Version tag 正確（如要發布）
  ```bash
  git tag v2.6.6
  git push origin v2.6.6
  ```

### 9.3 Branch Strategy
- [ ] 在正確的 branch（`main` for release）
- [ ] Branch 與 remote 同步
  ```bash
  git fetch origin
  git status
  # 預期：up to date
  ```

---

## ✅ Phase 10: Final Verification

### 10.1 完整安裝測試（Critical！）
在全新環境執行完整測試：

```bash
# 1. Fresh install
cd /tmp && rm -rf final-test && mkdir final-test && cd final-test
git clone <repo-url> .
bash scripts/quick-install.sh

# 2. Verify structure
ls -la .claude-plugin/memesh/.claude-plugin/plugin.json
ls -la .claude-plugin/memesh/dist/mcp/server-bootstrap.js

# 3. Verify MCP
claude mcp list | grep memesh-dev

# 4. Verify connection
# 預期：✓ Connected

# 5. Start new Claude session and test A2A tools
# (在新的 Claude Code session 中測試)
```

### 10.2 User Experience Test
- [ ] 安裝流程順暢（無需手動干預）
- [ ] 錯誤訊息清晰（如有）
- [ ] 成功訊息明確
- [ ] Next steps 指引清楚

### 10.3 Rollback Plan
- [ ] 知道如何 rollback（如出問題）
  ```bash
  claude mcp remove memesh-dev
  rm -rf .claude-plugin/memesh
  git checkout <previous-tag>
  ```

---

## ✅ Phase 11: Release Notes

### 11.1 CHANGELOG.md
- [ ] 包含此版本所有變更
- [ ] 分類清晰（Added, Changed, Fixed, Removed）
- [ ] 日期正確
- [ ] 破壞性變更標記清楚（BREAKING CHANGE）

### 11.2 GitHub Release
- [ ] Release notes 撰寫完成
- [ ] 包含重要變更摘要
- [ ] 包含升級指引（如有破壞性變更）
- [ ] 附上相關 Issues/PRs 連結

---

## ✅ Phase 12: Post-Release Monitoring

### 12.1 Immediate Checks (發布後 1 小時內)
- [ ] GitHub Actions 全部通過
- [ ] npm publish 成功（如適用）
- [ ] 下載/安裝正常
- [ ] 無 critical issues 回報

### 12.2 Short-term Monitoring (發布後 24 小時內)
- [ ] 監控 GitHub Issues
- [ ] 檢查用戶回報
- [ ] 準備 hotfix（如需要）

---

## 🎯 Checklist Summary

**完成此 checklist 前，絕不發布！**

**統計**：
- Total items: ~120+
- Critical items (必須): ~80
- Recommended items (建議): ~40

**時間估計**：
- 首次完整檢查：2-3 小時
- 熟練後：30-60 分鐘

**記住**：
> "快速發布爛東西 vs. 慢慢發布好東西"
> 永遠選擇後者。用戶的信任一旦失去，很難挽回。

---

## 📝 Checklist 執行紀錄

**Version**: _______________
**Date**: _______________
**Checked by**: _______________

**Phase 1 - Code Quality**: ☐ PASS ☐ FAIL
**Phase 2 - Plugin Structure**: ☐ PASS ☐ FAIL
**Phase 3 - Installation**: ☐ PASS ☐ FAIL
**Phase 4 - MCP Server**: ☐ PASS ☐ FAIL
**Phase 5 - Documentation**: ☐ PASS ☐ FAIL
**Phase 6 - Security**: ☐ PASS ☐ FAIL
**Phase 7 - Compatibility**: ☐ PASS ☐ FAIL
**Phase 8 - Performance**: ☐ PASS ☐ FAIL
**Phase 9 - Git**: ☐ PASS ☐ FAIL
**Phase 10 - Final Verification**: ☐ PASS ☐ FAIL
**Phase 11 - Release Notes**: ☐ PASS ☐ FAIL

**Overall Status**: ☐ READY FOR RELEASE ☐ NOT READY

**Notes**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
