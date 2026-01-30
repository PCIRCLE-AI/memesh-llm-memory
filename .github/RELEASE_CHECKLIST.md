# 發布前強制檢查清單

## 🔴 必須全部通過才能發布

### 1. 基礎測試
- [ ] `npm run build` 成功
- [ ] `npm test` 全部通過
- [ ] `npm run typecheck` 無錯誤

### 2. MCP Server 啟動測試（CRITICAL - 之前缺失）
- [ ] 在乾淨環境測試：`rm -rf ~/.claude-code-buddy && node dist/mcp/server-bootstrap.js`
- [ ] MCP server 能正常啟動（無 ReferenceError、無 crash）
- [ ] 資料庫自動創建在 `~/.claude-code-buddy/knowledge-graph.db`
- [ ] 資料庫 schema 正確（entities, relations, observations, tags）

### 3. 功能驗證
- [ ] `buddy-remember` 能查詢記憶
- [ ] `create-entities` 能創建記憶
- [ ] `get-session-health` 返回正確狀態

### 4. Claude Code 整合測試
- [ ] 在 Claude Code 中重啟 session
- [ ] `claude mcp list` 顯示 `claude-code-buddy - ✓ Connected`
- [ ] 實際使用 CCB 工具驗證功能

### 5. 用戶影響評估
- [ ] 這次更新會不會破壞現有用戶？
- [ ] 是否需要遷移步驟？
- [ ] CHANGELOG 是否清楚說明變更？

## ⚠️ 如果任何一項失敗，禁止發布
