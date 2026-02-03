# 🔒 MeMesh 安裝流程標準規範

> **🚨 CRITICAL: 此文檔定義唯一合法的安裝流程**
>
> **任何修改此文檔中定義的流程都必須：**
> 1. 經過完整的自動化測試驗證
> 2. 更新所有相關文檔
> 3. 不得破壞現有的任何安裝方式
> 4. 必須保持向後相容

---

## 📜 安裝流程不可變原則

### 鐵律 1: 檔案結構固定

**以下檔案結構為標準，禁止隨意修改：**

```
專案根目錄/
├── package.json          ← npm package 配置
├── plugin.json           ← Claude Code plugin 元資料（不含 mcpServers）
├── mcp.json              ← MCP server 配置（獨立檔案）
├── dist/
│   └── mcp/
│       └── server-bootstrap.js
└── .claude-plugin/
    └── memesh/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── .mcp.json
        ├── dist/
        ├── node_modules/
        ├── package.json
        └── scripts/
```

**❌ 禁止的變更：**
- 移動或重命名這些核心檔案
- 改變 `.mcp.json` 的位置（必須在 plugin root）
- 改變 `plugin.json` 的位置（必須在 `.claude-plugin/` 子目錄）
- 合併 `plugin.json` 和 `mcp.json`

### 鐵律 2: MCP 配置格式固定

**`mcp.json` 格式（唯一正確格式）：**

```json
{
  "memesh": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/mcp/server-bootstrap.js"],
    "env": {
      "NODE_ENV": "production",
      "DISABLE_MCP_WATCHDOG": "1"
    }
  }
}
```

**❌ 禁止：**
- 使用絕對路徑（必須使用 `${CLAUDE_PLUGIN_ROOT}`）
- 改變 command 為其他值（必須是 `node`）
- 移除必要的環境變數

### 鐵律 3: Plugin 元資料格式固定

**`plugin.json` 格式（唯一正確格式）：**

```json
{
  "name": "memesh",
  "description": "...",
  "author": { "name": "PCIRCLE AI" },
  "version": "x.x.x",
  "homepage": "...",
  "repository": "...",
  "license": "AGPL-3.0"
}
```

**❌ 禁止：**
- 添加 `mcpServers` 欄位（這是舊格式）
- 改變必要欄位名稱

---

## 🎯 標準安裝方式（唯一合法）

### 方式 1: npm 全域安裝

```bash
npm install -g @pcircle/memesh
```

**驗證：**
```bash
npx memesh --version  # 應顯示版本號
```

**配置（自動）：**
`postinstall.js` 會自動配置 `~/.claude/mcp_settings.json`：
```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "MEMESH_A2A_TOKEN": "...",
        "DISABLE_MCP_WATCHDOG": "1"
      }
    }
  }
}
```

**注意**：如果自動配置失敗，使用者需要手動添加上述配置。

---

### 方式 2: Quick Install Script

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

**腳本保證執行：**
1. 檢查 Node.js >= 20
2. `npm install`
3. `npm run build`
4. `npm run build:plugin`（包含自動配置 `~/.claude/mcp_settings.json`）
5. 驗證配置完成

**驗證：**
```bash
cat ~/.claude/mcp_settings.json | grep memesh  # 應顯示 memesh 配置
```

---

### 方式 3: Claude Code Plugin Directory

```bash
# 先執行 quick-install.sh，然後：
claude --plugin-dir /path/to/claude-code-buddy/.claude-plugin/memesh
```

**驗證：**
Plugin 應自動載入，MCP server 自動啟動

---

### 方式 4: GitHub Marketplace

```bash
/plugin marketplace add PCIRCLE-AI/claude-code-buddy
/plugin install memesh@pcircle-ai
```

**驗證：**
```bash
/plugin list  # 應顯示 memesh
```

---

## 🔧 Build 腳本標準

### `scripts/prepare-plugin.js` 必須執行：

1. **檔案複製（固定順序）**：
   - `dist/` → `.claude-plugin/memesh/dist/`
   - `package.json` → `.claude-plugin/memesh/`
   - `scripts/` → `.claude-plugin/memesh/scripts/`
   - `plugin.json` → `.claude-plugin/memesh/.claude-plugin/`
   - `mcp.json` → `.claude-plugin/memesh/.mcp.json`

2. **A2A Token 注入**：
   - 從 `.env` 讀取 `MEMESH_A2A_TOKEN`
   - 注入到 `.claude-plugin/memesh/.mcp.json` 的 `env.MEMESH_A2A_TOKEN`

3. **依賴安裝**：
   - 在 `.claude-plugin/memesh/` 執行 `npm install --production`

4. **MCP Settings 配置（自動）**：
   - 建立或更新 `~/.claude/mcp_settings.json`
   - 添加 `memesh` MCP server 配置
   - 注入 A2A token（如果存在）
   - 移除舊的 `claude-code-buddy` 配置（如果存在）

5. **驗證步驟**：
   - 檢查所有必要檔案存在
   - 確認 `~/.claude/mcp_settings.json` 已配置
   - 輸出清晰的成功/錯誤訊息

**❌ 禁止：**
- 改變檔案複製順序
- 跳過任何步驟
- 修改 A2A token 注入位置
- 覆蓋 `~/.claude/mcp_settings.json` 中其他 MCP servers 的配置

---

## ✅ 變更控制流程

### 如果必須修改安裝流程：

1. **提案階段**：
   - 說明為什麼需要修改
   - 列出所有影響範圍
   - 提供回退方案

2. **測試階段**：
   - 在所有 4 種安裝方式上測試
   - 執行完整的 `pre-deployment-check.sh`
   - 確保向後相容

3. **文檔更新**：
   - 更新此文檔
   - 更新 README.md
   - 更新 PLUGIN_DEPLOYMENT_CHECKLIST.md
   - 更新所有相關文檔

4. **版本控制**：
   - 安裝流程變更必須 bump minor version
   - Breaking changes 必須 bump major version

---

## 🚨 違規行為

**以下行為絕對禁止：**

1. ❌ **隨意修改檔案結構**
   - 未經測試就移動檔案位置
   - 改變檔案命名規則

2. ❌ **破壞現有安裝方式**
   - 移除任何一種安裝方式的支援
   - 改變已有的配置格式

3. ❌ **跳過驗證步驟**
   - 不執行 pre-deployment-check
   - 不測試所有安裝方式

4. ❌ **文檔不同步**
   - 修改代碼但不更新文檔
   - README 與實際流程不符

---

## 📊 自動化保護機制

### CI/CD 強制檢查

每次 commit 都會自動執行：

```yaml
- 檔案結構驗證
- Build 成功測試
- npm pack 內容檢查
- 所有安裝方式測試
- 文檔一致性檢查
```

**未通過 CI 的 commit 不得合併。**

### Git Hooks

Pre-commit hook 會檢查：
- `package.json`, `plugin.json`, `mcp.json` 格式
- 相關腳本的語法正確性
- 必要欄位的存在性

---

## 📝 檢查清單（每次修改前必讀）

在修改任何安裝相關檔案前，問自己：

- [ ] 我是否真的需要修改安裝流程？
- [ ] 這個修改會破壞現有的任何安裝方式嗎？
- [ ] 我是否已經在所有 4 種方式上測試過？
- [ ] 我是否已更新所有相關文檔？
- [ ] 我是否已執行 `pre-deployment-check.sh`？
- [ ] 這個修改是否向後相容？

**如果任何一項答案是「否」，停止修改。**

---

## 🎯 成功標準

安裝流程成功的唯一標準：

```bash
# 測試 1: npm 安裝
npm install -g @pcircle/memesh
npx memesh --version  # ✅ 顯示版本號
cat ~/.claude/mcp_settings.json | grep memesh  # ✅ 配置存在

# 測試 2: Quick install
./scripts/quick-install.sh
cat ~/.claude/mcp_settings.json | grep memesh  # ✅ 配置存在
# 重啟 Claude Code 後，MeMesh 應可用

# 測試 3: Plugin dir
claude --plugin-dir ./.claude-plugin/memesh
# ✅ Plugin 載入，MCP 連接

# 測試 4: 所有檢查通過
./scripts/pre-deployment-check.sh  # ✅ 0 failures

# 測試 5: MCP 設定驗證
node scripts/install-helpers.js check  # ✅ MeMesh is configured
```

**只有當所有測試都通過，才算成功。**

---

**最後更新**: 2026-02-04
**強制執行**: 立即生效
**違規後果**: 回退所有變更，重新執行完整測試
