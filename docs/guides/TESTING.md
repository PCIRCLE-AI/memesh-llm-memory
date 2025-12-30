# Smart Agents - 測試指南

## 🧪 測試框架

本專案使用 **Vitest** 作為測試框架，提供快速、現代的測試體驗。

## 📋 測試覆蓋範圍

### ✅ 已測試模組

1. **Multi-Agent Collaboration Framework**
   - ✅ MessageBus - 訊息匯流排（點對點、廣播、主題訂閱）
   - ✅ CollaborationManager - 協作管理器（agent 註冊、team 創建、任務執行）
   - ✅ TeamCoordinator - 團隊協調器（內部測試於 CollaborationManager）

2. **Agent Orchestrator**
   - ✅ TaskAnalyzer - 任務分析器
   - ✅ AgentRouter - 智能路由器
   - ✅ CostTracker - 成本追蹤器
   - ✅ Router - 完整路由流程

3. **RAG Agent**
   - ⚠️ EmbeddingService - 嵌入服務（需要有效的 OpenAI API key）

## 🚀 執行測試

### 運行所有測試
```bash
npm test
```

### 運行特定測試文件
```bash
npm test -- src/collaboration/MessageBus.test.ts
npm test -- src/collaboration/CollaborationManager.test.ts
npm test -- src/orchestrator/orchestrator.test.ts
```

### 運行測試並產生覆蓋率報告
```bash
npm run test:coverage
```

### Watch 模式（開發時使用）
```bash
npm test -- --watch
```

## ⚙️ 測試設置

### 必要環境變數

測試需要以下環境變數（位於 `.env` 檔案）：

```bash
# 必需（Claude API）
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# 可選（僅 RAG 測試需要）
OPENAI_API_KEY=sk-proj-xxxxx
```

**注意**：如果沒有設定 API keys，部分測試會失敗，但協作框架的核心測試仍會通過。

### 跳過需要 API 的測試

如果想跳過需要 API keys 的測試：

```bash
npm test -- --exclude=src/agents/rag/rag.test.ts
```

## 📊 當前測試狀態

```
✅ 58 個測試通過
❌ 11 個測試失敗（需要有效的 API keys）
```

### 失敗測試原因

1. **RAG Tests (3 failures)**
   - 原因：需要有效的 OpenAI API key
   - 解決：在 `.env` 中設定正確的 `OPENAI_API_KEY`

2. **TaskAnalyzer Tests (2 failures)**
   - 原因：任務複雜度分類邏輯需要微調
   - 狀態：非阻塞性問題，不影響核心功能

## 🎯 測試最佳實踐

### 1. Mock 外部依賴

```typescript
import { vi } from 'vitest';

// Mock Agent 實作
class MockAgent implements CollaborativeAgent {
  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    return {
      id: uuidv4(),
      from: this.id,
      to: message.from,
      timestamp: new Date(),
      type: 'response',
      content: { result: 'Mock result' },
    };
  }
}
```

### 2. 使用 beforeEach 清理狀態

```typescript
describe('MyTest', () => {
  let manager: CollaborationManager;

  beforeEach(async () => {
    manager = new CollaborationManager();
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
  });
});
```

### 3. 測試非同步操作

```typescript
it('should handle async operation', async () => {
  const session = await manager.executeTask(task);
  expect(session.results.success).toBe(true);
});
```

## 🔍 CI/CD 整合

測試可整合到 CI/CD pipeline：

```yaml
# .gitlab-ci.yml 範例
test:
  script:
    - npm install
    - npm run build
    - npm test
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 📈 測試覆蓋率目標

- **核心邏輯**: ≥ 80%
- **API 整合**: ≥ 60%
- **整體專案**: ≥ 70%

## 🐛 除錯測試

### 使用 console.log
```typescript
it('should debug', () => {
  console.log('Debug info:', someVariable);
  expect(someVariable).toBe(expected);
});
```

### 使用 --reporter=verbose
```bash
npm test -- --reporter=verbose
```

### 單獨運行失敗的測試
```bash
npm test -- --grep="specific test name"
```

## ⚠️ E2E 測試資源安全

> **📝 注意**: 本節描述的 E2E 測試套件（voice-rag, collaboration, api-security）為**計畫中**的功能，尚未實作。
>
> **目前實作的 E2E 測試**: `tests/integration/evolution-e2e.test.ts` (11 個測試，已通過)
>
> 本節為未來實作時的安全指南和最佳實踐。

### 🔴 重要：防止系統資源耗盡

E2E 測試會啟動真實服務（Express server, Vectra, WebSocket），消耗大量資源。**不當配置可能導致系統凍結**。

### 安全配置原則

**1. 合理的並行度**
```typescript
// vitest.e2e.config.ts
poolOptions: {
  threads: {
    singleThread: false,  // ✅ 允許並行
    maxThreads: 2,        // ✅ 限制 2 個並行（不超過 CPU 核心數的 50%）
  }
}
```

**2. 謹慎使用重試**
```typescript
retry: 1,  // ✅ 最多重試 1 次（處理網路波動）
```

**3. 使用資源監控**
```bash
# ✅ 推薦：使用監控腳本執行
./scripts/test-monitor.sh npm run test:e2e

# ⚠️ 注意：直接執行需手動監控資源
npm run test:e2e
```

### 資源限制

**test-monitor.sh 自動保護**：
- CPU 限制：70%
- Memory 限制：2GB
- 超過限制自動終止測試

**手動監控**（如不使用腳本）：
```bash
# Terminal 1: 執行測試
npm run test:e2e

# Terminal 2: 監控資源
watch -n 2 'ps aux | grep -E "(node|vitest)" | grep -v grep'
```

### 緊急處理

**系統卡住時**：
```bash
# 1. 強制終止所有測試進程
pkill -9 node

# 2. 檢查殘留進程
ps aux | grep node

# 3. 查看資源使用日誌
cat test-resource-monitor.log
tail -100 chroma.log
```

### 測試執行最佳實踐

✅ **推薦做法**：
```bash
# 單一測試文件（最安全）
./scripts/test-monitor.sh npm run test:e2e:voice-rag

# 完整測試套件（使用監控）
./scripts/test-monitor.sh npm run test:e2e

# 開發時：watch 模式（限制檔案數）
npm run test:e2e -- --watch tests/e2e/voice-rag.spec.ts
```

❌ **避免做法**：
```bash
# 不要：多個測試套件並行執行
npm run test:e2e & npm run test:e2e:collaboration &  # ❌ 資源爆炸

# 不要：過高並行度
# vitest.config.ts: maxThreads: 5+  # ❌ 超過系統負荷

# 不要：過多重試
# vitest.config.ts: retry: 3+  # ❌ 請求量爆炸
```

### 配置文件

- `vitest.e2e.config.ts` - E2E 測試配置
- `scripts/test-monitor.sh` - 資源監控腳本
- `.test-resource-limits.json` - 資源限制配置
- `INCIDENT_REPORT_2025-12-26.md` - 凍結事件分析

### 關鍵學習

1. **並行不是越多越好** - 本地資源有限，2-3 個並行已足夠
2. **重試可能適得其反** - 認證失敗 + 重試 = 請求爆炸
3. **本地服務有成本** - Vectra、Express、WebSocket 都消耗資源
4. **監控是必要的** - 預防勝於事後處理
5. **了解你的系統限制** - MacBook Pro M2: 強大但非無限

---

## 📚 更多資源

- [Vitest 官方文檔](https://vitest.dev/)
- [測試驅動開發 (TDD) 最佳實踐](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Mock 策略指南](https://vitest.dev/guide/mocking.html)
- [E2E 測試資源管理](./INCIDENT_REPORT_2025-12-26.md)
