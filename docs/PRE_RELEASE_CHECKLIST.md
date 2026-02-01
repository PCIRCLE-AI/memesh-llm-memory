# Pre-Release Checklist for CCB MCP

**每次發布新版本前必須完成所有檢查項目。**

## 📋 Release Information

- [ ] **Version Number**: 確認新版本號（遵循 semver）
- [ ] **Release Date**: 設定發布日期
- [ ] **Changelog Updated**: 更新 CHANGELOG.md，記錄所有變更

---

## 🧪 1. 功能測試 (Functional Testing)

### 1.1 核心功能測試
- [ ] **Memory Management**:
  ```bash
  # Test memory store/retrieve/search
  buddy-remember "test knowledge"
  buddy-recall "test"
  ```
- [ ] **Hook Integration**:
  ```bash
  # Test pre-commit hooks
  git add . && git commit -m "test"
  ```
- [ ] **Project Auto-Tracking**:
  ```bash
  # Verify auto-tracking works
  # Check .ccb/checkpoint.json created
  ```

### 1.2 MCP Server 測試
- [ ] **Server Starts Successfully**:
  ```bash
  # Kill existing processes first
  pkill -f "claude-code-buddy.*server-bootstrap"

  # Test server startup
  node dist/mcp/server-bootstrap.js
  # Should see: {"jsonrpc":"2.0","method":"initialized","params":{}}
  ```

- [ ] **MCP Tools Available**:
  - [ ] `buddy-remember` (store knowledge)
  - [ ] `buddy-recall` (retrieve knowledge)
  - [ ] `buddy-search` (search knowledge graph)
  - [ ] `create-entities` (create entities)
  - [ ] `create-relations` (create relations)

- [ ] **MCP Resources Available**:
  - [ ] `project-context` (read project context)
  - [ ] `knowledge-graph` (read knowledge graph)

---

## 🔧 2. 安裝測試 (Installation Testing)

### 2.1 全新安裝 (Fresh Install)
- [ ] **測試環境準備**:
  ```bash
  # Backup current config
  cp ~/.claude/config.json ~/.claude/config.json.backup

  # Remove CCB from config
  # Edit ~/.claude/config.json manually, remove "claude-code-buddy" entry

  # Kill existing CCB processes
  pkill -f "claude-code-buddy.*server-bootstrap"
  ```

- [ ] **執行安裝**:
  ```bash
  npm run setup
  ```

- [ ] **驗證安裝**:
  - [ ] ~/.claude/config.json 包含正確的 CCB MCP 配置
  - [ ] 配置包含 "type": "stdio" 欄位
  - [ ] 配置指向正確的 server-bootstrap.js 路徑
  - [ ] 其他 MCP servers 沒有被覆蓋或刪除

### 2.2 升級安裝 (Upgrade Install)
- [ ] **從舊版升級**:
  ```bash
  # 確保有舊版 CCB 在 config 中
  cat ~/.claude/config.json | grep claude-code-buddy

  # 執行安裝（應該更新路徑）
  npm run setup
  ```

- [ ] **驗證升級**:
  - [ ] 配置中的路徑已更新到新版本
  - [ ] 其他配置欄位保持不變
  - [ ] 舊的 CCB 進程已被新進程替代

### 2.3 配置檔案不存在的情況
- [ ] **測試配置檔案不存在**:
  ```bash
  # Temporarily move config
  mv ~/.claude/config.json ~/.claude/config.json.tmp

  # Run setup
  npm run setup

  # Verify config created in correct location
  test -f ~/.claude/config.json && echo "✓ Config created"

  # Restore original config
  mv ~/.claude/config.json.tmp ~/.claude/config.json
  ```

---

## 🧹 3. 進程管理測試 (Process Management)

### 3.1 檢查舊進程
- [ ] **清理舊進程**:
  ```bash
  # List all CCB processes
  ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep

  # Kill all CCB processes
  pkill -f "claude-code-buddy.*server-bootstrap"

  # Verify no CCB processes running
  ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep
  # Should return empty
  ```

### 3.2 測試單一進程運行
- [ ] **啟動 Claude Code CLI**:
  ```bash
  # Start new Claude session
  claude

  # Check CCB process count
  ps aux | grep -E "claude-code-buddy.*server-bootstrap" | grep -v grep | wc -l
  # Should show: 1 (only one process)
  ```

- [ ] **測試多會話**:
  ```bash
  # Open second Claude session in another terminal
  # Check process count again
  ps aux | grep -E "claude-code-buddy.*server-bootstrap" | grep -v grep | wc -l
  # Should show: 2 (one per session)
  ```

---

## 📊 4. 單元測試與整合測試 (Unit & Integration Tests)

### 4.1 執行所有測試
- [ ] **Run Unit Tests**:
  ```bash
  npm run test:unit
  # All tests should pass
  ```

- [ ] **Run Integration Tests**:
  ```bash
  npm run test:integration
  # All tests should pass
  ```

- [ ] **Test Coverage**:
  ```bash
  npm run test:coverage
  # Coverage should be ≥ 80%
  ```

### 4.2 特定功能測試
- [ ] **TestOutputParser**:
  ```bash
  npm run test:unit -- src/core/__tests__/TestOutputParser.test.ts
  ```
- [ ] **HookIntegration**:
  ```bash
  npm run test:unit -- src/core/__tests__/HookIntegration.test.ts
  ```
- [ ] **ProjectAutoTracker**:
  ```bash
  npm run test:unit -- src/memory/__tests__/ProjectAutoTracker.test.ts
  ```

---

## 📦 5. Build 與打包測試 (Build & Package)

### 5.1 Build 測試
- [ ] **Clean Build**:
  ```bash
  npm run clean
  npm run build
  # No errors should occur
  ```

- [ ] **驗證輸出檔案**:
  - [ ] dist/mcp/server-bootstrap.js 存在
  - [ ] dist/index.js 存在
  - [ ] dist/core/*.js 存在
  - [ ] dist/memory/*.js 存在
  - [ ] MCP resources 已複製到 dist/mcp/resources/

### 5.2 Typecheck
- [ ] **TypeScript 檢查**:
  ```bash
  npm run typecheck
  # No type errors
  ```

### 5.3 Lint
- [ ] **ESLint 檢查**:
  ```bash
  npm run lint
  # No lint errors (warnings are acceptable)
  ```

---

## 📝 6. 文檔檢查 (Documentation)

### 6.1 必要文檔
- [ ] **README.md**:
  - [ ] 安裝說明正確
  - [ ] 使用範例更新
  - [ ] 版本號正確

- [ ] **CHANGELOG.md**:
  - [ ] 記錄所有新功能
  - [ ] 記錄所有 bug 修復
  - [ ] 記錄所有 breaking changes

- [ ] **package.json**:
  - [ ] 版本號已更新
  - [ ] 依賴版本正確

### 6.2 API 文檔
- [ ] **MCP Tools 文檔**: 所有 MCP tools 有說明
- [ ] **MCP Resources 文檔**: 所有 MCP resources 有說明
- [ ] **Hook 文檔**: 所有 hooks 有使用範例

---

## 🚀 7. 發布前最後檢查 (Final Pre-Release Check)

### 7.1 Git 檢查
- [ ] **Git Status Clean**:
  ```bash
  git status
  # Should show: nothing to commit, working tree clean
  ```

- [ ] **Git Tag**:
  ```bash
  git tag v2.x.x
  git push origin v2.x.x
  ```

### 7.2 NPM 發布檢查
- [ ] **Dry Run**:
  ```bash
  npm publish --dry-run
  # Check what files will be published
  ```

- [ ] **檢查 .npmignore**:
  - [ ] 測試檔案不會被發布
  - [ ] 開發用檔案不會被發布
  - [ ] 文檔會被發布

### 7.3 版本號確認
- [ ] **版本號一致性**:
  - [ ] package.json 版本號
  - [ ] CHANGELOG.md 最新版本號
  - [ ] Git tag 版本號
  - [ ] 三者必須完全一致

---

## ✅ 8. 發布後驗證 (Post-Release Verification)

### 8.1 NPM 發布驗證
- [ ] **檢查 NPM Registry**:
  ```bash
  npm view @pcircle/claude-code-buddy-mcp version
  # Should show new version
  ```

- [ ] **測試從 NPM 安裝**:
  ```bash
  # In a test directory
  npm install -g @pcircle/claude-code-buddy-mcp

  # Verify installation
  which claude-code-buddy
  ```

### 8.2 功能驗證
- [ ] **從 NPM 安裝後測試**:
  ```bash
  # Setup MCP
  claude-code-buddy setup

  # Test in Claude Code CLI
  claude
  # Try: buddy-remember "test after npm install"
  ```

### 8.3 GitHub Release
- [ ] **創建 GitHub Release**:
  - [ ] 標題: v2.x.x
  - [ ] 內容: 從 CHANGELOG.md 複製
  - [ ] 附加 release notes

---

## 🔒 9. 安全檢查 (Security Check)

### 9.1 敏感資訊檢查
- [ ] **No Hardcoded Secrets**:
  ```bash
  grep -r "password\|secret\|api_key\|token" src/ dist/
  # Should not find any hardcoded secrets
  ```

- [ ] **No Personal Info**:
  ```bash
  grep -r "kt.wildmind@gmail.com" src/ dist/
  # Should not find personal email (except in git config examples)
  ```

### 9.2 依賴安全檢查
- [ ] **Audit Dependencies**:
  ```bash
  npm audit
  # No critical or high vulnerabilities
  ```

---

## 📋 Final Sign-Off

**Release Manager**: _______________ (簽名)

**Release Date**: _______________ (日期)

**Version Released**: v_______________

**Notes**:
```
記錄任何特殊情況或需要注意的事項
```

---

## 🚨 如果任何檢查項目失敗

**必須**：
1. 停止發布流程
2. 記錄失敗原因
3. 修復問題
4. 重新執行完整 checklist
5. 不得跳過任何步驟

**記住**：寧可延遲發布，不可發布有問題的版本。
