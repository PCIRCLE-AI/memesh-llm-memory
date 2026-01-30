# Pre-Publish Checklist

**在執行 `npm publish` 前，必須完成所有檢查項目。**

## ✅ 代碼品質檢查

- [ ] `npm run build` - 編譯成功
- [ ] `npm run test` - 所有測試通過
- [ ] `npm run lint` - 無 lint 錯誤
- [ ] `npm run typecheck` - 無 TypeScript 錯誤

## ✅ MCP Server 功能驗證

### 本地測試
- [ ] **清除 npm cache**:
  ```bash
  npm cache clean --force
  ```

- [ ] **測試本地 build**:
  ```bash
  MCP_SERVER_MODE=true node dist/mcp/server.js
  ```
  - 確認：無任何 console 輸出（等待 stdin）
  - 確認：無 dotenv 訊息
  - 確認：無 logger 訊息

- [ ] **測試 stdio 通訊**:
  ```bash
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | MCP_SERVER_MODE=true node dist/mcp/server.js
  ```
  - 確認：只有 JSON-RPC 回應，無其他輸出

### NPX 安裝測試（發布後）
- [ ] **測試 npx 執行**:
  ```bash
  npx -y @pcircle/claude-code-buddy-mcp@VERSION
  ```
  - 確認：server 正常啟動
  - 確認：無 JSON parse 錯誤

- [ ] **測試 Cursor 一鍵安裝**:
  ```
  cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=...
  ```
  - 確認：安裝成功
  - 確認：MCP server 正常連接
  - 確認：tools 可用

## ✅ Stdout/Stderr 污染檢查

**關鍵：MCP stdio 模式不能有任何非 JSON-RPC 輸出**

- [ ] **搜尋所有 stdout 輸出源**:
  ```bash
  # 搜尋 console.log/error/warn
  grep -r "console\." src/ --include="*.ts" | grep -v "// "

  # 搜尋 process.stdout
  grep -r "process.stdout" src/ --include="*.ts"

  # 搜尋 dotenv
  grep -r "from 'dotenv'" src/ --include="*.ts"
  grep -r "dotenv" package.json
  ```

- [ ] **確認 logger 配置正確**:
  - `src/utils/logger.ts` 在 MCP_SERVER_MODE 下禁用 console transport
  - 只使用 file transports

## ✅ 文檔與版本

- [ ] **更新版本號**:
  - `package.json` version 欄位
  - README.md 中的版本引用（如有）

- [ ] **更新 CHANGELOG.md**:
  - 記錄此版本的變更
  - 註明 breaking changes（如有）

- [ ] **驗證安裝文檔**:
  - README.md 安裝指令正確
  - docs/QUICK_INSTALL.md 內容正確
  - 網頁上的 cursor:// link 正確

## ✅ 發布流程

1. **Build & Test**:
   ```bash
   npm run build
   npm run test
   ```

2. **發布到 npm**:
   ```bash
   npm publish --access public
   ```

3. **驗證發布**:
   ```bash
   npm view @pcircle/claude-code-buddy-mcp version
   npm cache clean --force
   npx -y @pcircle/claude-code-buddy-mcp@VERSION
   ```

4. **建立 Git Tag 與 GitHub Release**:
   ```bash
   git tag vVERSION
   git push origin vVERSION
   gh release create vVERSION --title "vVERSION - TITLE" --notes "NOTES"
   ```

5. **Cursor 安裝測試**:
   - 點擊網頁上的一鍵安裝按鈕
   - 驗證 MCP server 正常工作

## ❌ 常見陷阱

### Dotenv 污染
- ❌ **錯誤**: `import { config } from 'dotenv'; config();`
- ✅ **正確**: 移除所有 dotenv，使用 process.env 直接讀取

### Logger 污染
- ❌ **錯誤**: Console transport 在 MCP mode 啟用
- ✅ **正確**: `MCP_SERVER_MODE=true` 時只用 file transports

### 測試不完整
- ❌ **錯誤**: 只測 `npm run build`
- ✅ **正確**: 測試 npx、Cursor 安裝、stdio 通訊

## 📝 發布後驗證

- [ ] **npm 上的版本正確**
- [ ] **npx 安裝成功**
- [ ] **Cursor 一鍵安裝成功**
- [ ] **GitHub Release 建立**
- [ ] **文檔更新**

---

**重要：如果任何一項失敗，停止發布流程，修復問題後重新開始。**
