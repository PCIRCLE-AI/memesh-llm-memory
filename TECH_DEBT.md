# 技術債務追蹤

> 本文檔追蹤 smart-agents 專案中的技術債務和未來改進項目

## 🔴 高優先級

### 1. CollaborationManager 持久化
**位置**: `src/collaboration/CollaborationManager.ts:39`
**描述**: 載入已保存的 teams 和 agents
**影響**: 每次重啟會丟失 team 配置
**建議方案**:
```typescript
// 使用 SQLite 持久化
async loadPersistedState(): Promise<void> {
  const teams = await db.query('SELECT * FROM teams');
  const agents = await db.query('SELECT * FROM agents');
  // Restore state
}
```
**預估工作量**: 4 hours
**優先級**: P1
**追蹤**: 將在 P1 SQLite 實作時一併完成

---

### 2. CollaborationManager 記憶體清理機制
**位置**: `src/collaboration/CollaborationManager.ts:40`
**描述**: 設置定期清理機制（訊息歷史、過期 sessions）
**影響**: 長時間運行可能導致記憶體洩漏
**建議方案**:
```typescript
// 每小時清理一次過期數據
setInterval(() => {
  this.messagesBus.clearOldMessages(24 * 60 * 60 * 1000); // 24 hours
  this.teamCoordinator.cleanupInactiveSessions(7 * 24 * 60 * 60 * 1000); // 7 days
}, 60 * 60 * 1000);
```
**預估工作量**: 2 hours
**優先級**: P1
**追蹤**: TBD

---

## 🟡 中優先級

### 3. API Server 實作
**位置**: `src/index.ts:33`
**描述**: Start API server (future enhancement)
**影響**: 目前只能透過程式碼調用，無法透過 HTTP API
**建議方案**:
```typescript
// Express API Server
import express from 'express';
const app = express();

app.post('/api/tasks', async (req, res) => {
  const result = await orchestrator.executeTask(req.body);
  res.json(result);
});

app.listen(3000);
```
**預估工作量**: 8 hours
**優先級**: P2
**追蹤**: 已有 dashboard server (port 3001)，可參考實作

---

### 4. 監控儀表板整合
**位置**: `src/index.ts:34`
**描述**: Initialize monitoring dashboard (future enhancement)
**影響**: Dashboard 需要手動啟動，無法與主程式整合
**建議方案**:
```typescript
// 在 main() 中啟動 dashboard
import { startDashboardServer } from './dashboard/server.js';

async function main() {
  // ... existing code

  if (appConfig.dashboard.enabled) {
    await startDashboardServer();
    logger.info(`📊 Dashboard: http://localhost:${appConfig.dashboard.port}`);
  }
}
```
**預估工作量**: 3 hours
**優先級**: P2
**追蹤**: TBD

---

## 🟢 低優先級（Demo/Test 文件）

### 5. Demo 文件錯誤處理改進
**文件**:
- `src/agents/voice-rag/demo.ts`
- `src/agents/rag/demo.ts`
- `src/agents/voice/examples.ts`
- `src/agents/voice/test.ts`

**描述**: Demo 文件中的 console.error 保留為用戶友好輸出
**建議**: 保持現狀，這些是故意給用戶看的錯誤訊息
**優先級**: P3 (不需修改)

---

## 📊 統計

- **總數**: 5 項技術債務
- **P1**: 2 項
- **P2**: 2 項
- **P3**: 1 項

**最後更新**: 2025-12-25
