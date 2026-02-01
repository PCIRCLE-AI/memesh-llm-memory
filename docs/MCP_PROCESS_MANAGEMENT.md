# CCB MCP Process Management Guide

## 問題說明

當使用 Claude Code CLI 時，每次啟動會話都會創建一個 CCB MCP server 進程。這是正常行為。

**可能出現的問題**：
- Claude Code CLI 在會話結束時可能不會自動終止 MCP server 進程
- 這些進程變成「孤兒進程」（父進程已終止，被 init 收養）
- 多個舊版本的進程可能同時運行，佔用系統資源

## 如何檢查

### 1. 列出所有 CCB MCP 進程

```bash
npm run processes:list
```

**正常情況**：
- 如果有 1-2 個 Claude Code CLI 會話在運行，應該看到 1-2 個 CCB MCP server 進程
- 每個進程應該有活著的父進程

**異常情況**：
- 看到多個進程，但只有 1 個 Claude Code CLI 會話
- 看到進程標記為「孤兒進程」
- 看到非常舊的進程（運行時間很長，但沒有使用）

### 2. 檢查孤兒進程

```bash
npm run processes:orphaned
```

這會列出所有父進程已死亡的 CCB MCP server 進程。

### 3. 檢查配置

```bash
npm run processes:config
```

驗證 CCB MCP server 在 `~/.claude/config.json` 中正確配置。

## 如何清理

### 清理所有舊進程

```bash
npm run processes:kill
```

這會：
1. 列出所有 CCB MCP server 進程
2. 要求確認
3. 終止所有進程
4. 驗證清理成功

**注意**：這會終止所有 CCB MCP server 進程，包括正在運行的 Claude Code CLI 會話使用的進程。不用擔心，下次啟動 Claude Code CLI 時會自動重新啟動。

### 重啟 MCP Server

```bash
npm run processes:restart
```

這會：
1. 終止所有現有 CCB MCP server 進程
2. 提示下次啟動 Claude Code CLI 時會自動重新啟動

## 升級版本時的建議流程

當升級 CCB 到新版本時，建議執行以下步驟：

```bash
# 1. 停止所有 Claude Code CLI 會話
# （關閉所有 claude 命令的終端）

# 2. 清理舊的 MCP server 進程
npm run processes:kill

# 3. 更新 CCB
npm install -g @pcircle/claude-code-buddy-mcp@latest

# 4. 重新配置（確保路徑正確）
npm run setup

# 5. 驗證配置
npm run processes:config

# 6. 啟動 Claude Code CLI
claude
```

## 常見問題

### Q: 為什麼會有多個進程？

**A**: 正常情況下，每個 Claude Code CLI 會話會啟動一個 MCP server 進程。如果你有多個終端運行 `claude` 命令，就會有多個進程。

### Q: 為什麼有孤兒進程？

**A**: 當 Claude Code CLI 會話異常結束（例如強制關閉終端、系統崩潰等），MCP server 進程可能不會被正確終止，變成孤兒進程。

### Q: 孤兒進程有什麼影響？

**A**:
- 佔用系統資源（記憶體）
- 可能導致舊版本和新版本同時運行
- 浪費系統資源

### Q: 應該多久清理一次？

**A**:
- 正常使用不需要定期清理
- 升級版本時建議清理
- 發現系統變慢時可以檢查並清理
- 看到異常多的進程時應該清理

### Q: 清理進程會影響正在運行的 Claude Code CLI 嗎？

**A**:
- 會終止 MCP server，但 Claude Code CLI 本身不會崩潰
- Claude Code CLI 會顯示 MCP server 連接錯誤
- 重新啟動 Claude Code CLI 即可恢復正常

### Q: 如何完全避免孤兒進程？

**A**:
- 總是正常退出 Claude Code CLI（使用 `/exit` 或 Ctrl+D）
- 不要強制關閉終端
- 升級前先正常退出所有 Claude Code CLI 會話

## 自動化清理（可選）

如果你經常遇到孤兒進程問題，可以在 shell 配置中添加自動清理：

### Bash (~/.bashrc)

```bash
# Clean CCB orphaned processes on shell startup (optional)
if command -v npm > /dev/null 2>&1; then
    (cd /path/to/claude-code-buddy && npm run processes:orphaned) 2>/dev/null
fi
```

### Zsh (~/.zshrc)

```bash
# Clean CCB orphaned processes on shell startup (optional)
if command -v npm > /dev/null 2>&1; then
    (cd /path/to/claude-code-buddy && npm run processes:orphaned) 2>/dev/null
fi
```

## 手動管理（進階）

如果你想手動管理進程：

### 查看所有 CCB 進程

```bash
ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep
```

### 終止特定進程

```bash
kill -15 <PID>  # 優雅終止
kill -9 <PID>   # 強制終止（如果 -15 無效）
```

### 終止所有 CCB 進程

```bash
pkill -f "claude-code-buddy.*server-bootstrap"
```

## 監控建議

### 定期檢查（建議每週）

```bash
npm run processes:list
```

如果看到：
- ✅ 進程數量 = Claude Code CLI 會話數量 → 正常
- ⚠️ 進程數量 > Claude Code CLI 會話數量 → 檢查孤兒進程
- 🔴 進程有孤兒標記 → 執行清理

### 升級前檢查（必須）

```bash
npm run processes:list
npm run processes:kill  # 清理所有
```

## 支援

如果遇到持續性的進程管理問題：

1. **收集資訊**：
   ```bash
   npm run processes:list > ccb-processes.log
   ps aux | grep claude >> ccb-processes.log
   cat ~/.claude/config.json >> ccb-processes.log
   ```

2. **提交 Issue**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
   - 附上 `ccb-processes.log`
   - 說明問題發生的情境
   - 說明 CCB 版本 (`npm list -g @pcircle/claude-code-buddy-mcp`)

3. **臨時解決方案**：
   ```bash
   # 完全重置
   npm run processes:kill
   rm ~/.claude/config.json
   npm run setup
   ```

---

**記住**：進程管理是正常的系統維護，不是 CCB 的 bug。正常使用時不需要頻繁清理。
