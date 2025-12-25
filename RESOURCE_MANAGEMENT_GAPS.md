# Smart-Agents 資源管理缺口分析

**日期**: 2025-12-26
**觸發事件**: 系統凍結事件（多 agents 並行運行 E2E 測試）

---

## 🚨 Critical Gaps（緊急需要修復）

### 1. 缺少全局資源監控

**問題**：
```typescript
// src/orchestrator/index.ts:110
if (mode === 'parallel') {
  results = await Promise.all(tasks.map(task => this.executeTask(task)));
}
```

- ❌ Parallel 模式沒有資源限制
- ❌ 不檢查系統 CPU/Memory 狀態
- ❌ 不限制並行任務數量

**風險**：
- 如果 tasks 數量很多（例如 10 個 E2E 測試）
- 全部並行執行 → 40+ services → 系統凍結

**建議修復**：
```typescript
async executeBatch(
  tasks: Task[],
  mode: 'sequential' | 'parallel' = 'sequential',
  maxConcurrent = 2  // 新增：最大並行數
): Promise<...> {
  if (mode === 'parallel') {
    // 使用 Promise pool 限制並行度
    const pool = new PromisePool(maxConcurrent);
    results = await pool.runAll(tasks.map(task => () => this.executeTask(task)));
  }
}
```

---

### 2. 缺少 E2E 測試互斥鎖

**問題**：
- ✅ 有 test-monitor.sh 監控腳本
- ✅ 有 vitest.e2e.config.ts（已修復為 maxThreads=1）
- ❌ 但沒有防止「多個測試進程同時運行」的機制

**風險場景**：
```
Terminal 1: npm run test:e2e:safe  (正在運行)
Terminal 2: npm run test:e2e:collaboration:safe  (同時啟動)
Orchestrator: executeBatch([e2e tests], 'parallel')  (同時啟動)

→ 3 個獨立的測試進程 × services = 資源爆炸
```

**建議修復**：
```bash
# 在 test-monitor.sh 加入互斥鎖
E2E_LOCK="/tmp/smart-agents-e2e.lock"

acquire_e2e_lock() {
  local wait_time=0
  local max_wait=300  # 5 分鐘

  while [ -f "$E2E_LOCK" ]; do
    if [ $wait_time -ge $max_wait ]; then
      error "Timeout waiting for E2E lock (5 minutes)"
      exit 1
    fi

    local other_pid=$(cat "$E2E_LOCK" 2>/dev/null || echo "unknown")
    warn "E2E test already running (PID: $other_pid)"
    warn "Waiting... ($wait_time/$max_wait seconds)"

    sleep 10
    wait_time=$((wait_time + 10))
  done

  echo $$ > "$E2E_LOCK"
  log "E2E lock acquired (PID: $$)"
}

release_e2e_lock() {
  rm -f "$E2E_LOCK"
  log "E2E lock released (PID: $$)"
}

# 使用
acquire_e2e_lock
trap release_e2e_lock EXIT

# ... run tests ...
```

---

### 3. 缺少多 Orchestrator 實例協調

**問題**：
```typescript
// 目前每個 Orchestrator 實例獨立運行
const orchestrator1 = new Orchestrator();
const orchestrator2 = new Orchestrator();

await Promise.all([
  orchestrator1.executeBatch(tasks1, 'parallel'),
  orchestrator2.executeBatch(tasks2, 'parallel'),
]);

→ 兩個 orchestrator × parallel tasks = 資源爆炸
```

**建議修復**：
```typescript
// src/orchestrator/ResourcePool.ts (新檔案)
class GlobalResourcePool {
  private static instance: GlobalResourcePool;
  private runningE2ETests = 0;
  private maxConcurrentE2E = 1;

  static getInstance() {
    if (!this.instance) {
      this.instance = new GlobalResourcePool();
    }
    return this.instance;
  }

  async acquireE2ESlot(): Promise<void> {
    while (this.runningE2ETests >= this.maxConcurrentE2E) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.runningE2ETests++;
  }

  releaseE2ESlot(): void {
    this.runningE2ETests--;
  }
}

// 在 Orchestrator 中使用
async executeTask(task: Task) {
  const resourcePool = GlobalResourcePool.getInstance();

  if (task.type === 'e2e') {
    await resourcePool.acquireE2ESlot();
    try {
      // ... execute e2e test ...
    } finally {
      resourcePool.releaseE2ESlot();
    }
  }
}
```

---

## ⚠️ Medium Priority Gaps

### 4. getSystemStatus 資料不完整

**問題**：
```typescript
// src/orchestrator/router.ts
async getSystemStatus() {
  return {
    resources: await this.getSystemResources(),
    costStats: this.costTracker.getStats(),
    recommendation: this.generateRecommendation()
  };
}
```

- ✅ 有記憶體監控
- ❌ 沒有 CPU 監控
- ❌ 沒有「正在運行的任務」監控
- ❌ 沒有「E2E 測試是否正在運行」檢查

**建議新增**：
```typescript
async getSystemStatus() {
  const resources = await this.getSystemResources();

  // 新增：檢查正在運行的測試進程
  const runningE2E = await this.checkRunningE2ETests();

  return {
    resources: {
      ...resources,
      cpuUsage: await this.getCPUUsage(),  // 新增
    },
    runningTasks: {
      e2e: runningE2E.count,
      pids: runningE2E.pids,
    },
    costStats: this.costTracker.getStats(),
    recommendation: this.generateRecommendation(),
    warnings: this.generateWarnings(resources, runningE2E),  // 新增
  };
}

private async checkRunningE2ETests() {
  // 使用 ps aux | grep vitest 檢查
  // 或讀取 E2E_LOCK 檔案
}
```

---

## 📋 建議實施優先順序

### Phase 1 (立即實施 - 防止再次凍結)

1. ✅ **修復 vitest.e2e.config.ts**（已完成）
   - maxThreads: 2 → 1
   - retry: 1 → 0

2. **在 test-monitor.sh 添加互斥鎖**
   - 防止多個測試同時運行
   - 估計時間：30 分鐘

3. **修改 package.json 移除不安全命令**（已完成）
   - test:e2e → 警告訊息 + exit 1

### Phase 2 (短期 - 1 週內)

4. **為 Orchestrator 添加並行限制**
   - executeBatch 加入 maxConcurrent 參數
   - 使用 Promise pool 控制並行度
   - 估計時間：2 小時

5. **創建 GlobalResourcePool**
   - 跨 Orchestrator 實例的資源協調
   - E2E 測試互斥
   - 估計時間：4 小時

6. **增強 getSystemStatus**
   - 添加 CPU 監控
   - 檢查正在運行的任務
   - 生成警告訊息
   - 估計時間：2 小時

### Phase 3 (中期 - 2 週內)

7. **實作 Pre-flight Checks**
   - executeTask 前檢查系統資源
   - 如果資源不足，拒絕執行或等待
   - 估計時間：3 小時

8. **添加資源使用追蹤**
   - 記錄每個任務的資源消耗
   - 建立資源使用 baseline
   - 生成資源使用報告
   - 估計時間：4 小時

---

## 🧪 測試計劃

### 測試 1：多 Terminal 並行測試

```bash
# Terminal 1
npm run test:e2e:voice-rag:safe

# Terminal 2（同時）
npm run test:e2e:collaboration:safe

# 預期結果：
# - Terminal 2 顯示 "⏳ Waiting for other E2E tests to complete..."
# - Terminal 2 等待 Terminal 1 完成後才開始
# - 系統不會凍結
```

### 測試 2：Orchestrator Parallel 模式

```typescript
const orchestrator = new Orchestrator();

const tasks = [
  { id: '1', description: 'E2E test 1', type: 'e2e' },
  { id: '2', description: 'E2E test 2', type: 'e2e' },
  { id: '3', description: 'E2E test 3', type: 'e2e' },
];

await orchestrator.executeBatch(tasks, 'parallel', maxConcurrent: 1);

// 預期結果：
// - 任務序列化執行（即使 mode='parallel'）
// - maxConcurrent=1 強制單線程
// - 系統不會凍結
```

### 測試 3：多 Orchestrator 實例

```typescript
const orch1 = new Orchestrator();
const orch2 = new Orchestrator();

await Promise.all([
  orch1.executeTask({ id: 'e2e-1', type: 'e2e', ... }),
  orch2.executeTask({ id: 'e2e-2', type: 'e2e', ... }),
]);

// 預期結果：
// - GlobalResourcePool 協調兩個 orchestrator
// - 第二個 E2E 測試等待第一個完成
// - 系統不會凍結
```

---

## 📚 參考資料

- **Multi-Agent Resource Management Guide**: `~/.claude/guides/multi-agent-resource-management.md`
- **CLAUDE.md E2E Safety Rules**: `~/.claude/CLAUDE.md:1030`
- **System Freeze Incident Report**: MCP Memory (`memory_search: "system freeze 2025-12-26"`)

---

**最後更新**: 2025-12-26
**負責人**: Claude Code
**審核狀態**: Pending User Review
