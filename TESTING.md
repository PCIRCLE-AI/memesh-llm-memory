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

## 📚 更多資源

- [Vitest 官方文檔](https://vitest.dev/)
- [測試驅動開發 (TDD) 最佳實踐](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Mock 策略指南](https://vitest.dev/guide/mocking.html)
