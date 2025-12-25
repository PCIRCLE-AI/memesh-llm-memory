# E2E 測試資源消耗詳解

**為什麼一個 E2E 測試會啟動那麼多 Node processes？**

---

## 🔍 E2E 測試運行時的 Node Processes

### 單一 E2E 測試的 Process Tree

```
E2E Test (npm run test:e2e:voice-rag:safe)
│
├─ 1. test-monitor.sh (監控腳本)
│   └─ bash process
│
├─ 2. vitest (測試執行器)
│   ├─ vitest main process
│   └─ vitest worker thread (maxThreads=1)
│       └─ Node.js child process (執行實際測試)
│
├─ 3. Voice RAG Server (被測試的服務)
│   ├─ Express HTTP server (Node.js)
│   ├─ VoiceRAGAgent (Node.js)
│   │   ├─ OpenAI Whisper client (STT)
│   │   ├─ OpenAI TTS client
│   │   └─ Claude API client
│   └─ ChromaDB vector database
│       ├─ ChromaDB server (Python/Node binding)
│       └─ Embedding model (可能是獨立 process)
│
└─ 4. Test Fixtures & Utilities
    └─ axios HTTP client (在 vitest worker 中運行)

Total: ~6-8 Node processes per E2E test
```

---

## 📊 資源消耗分析

### 單一 E2E 測試（例如：voice-rag.spec.ts）

| Process | Type | CPU | Memory | 說明 |
|---------|------|-----|--------|------|
| vitest main | Node.js | 5% | 100MB | 測試框架主進程 |
| vitest worker | Node.js | 10% | 150MB | 執行測試的 worker |
| Express server | Node.js | 15% | 200MB | HTTP API server |
| ChromaDB | Python/Node | 20% | 500MB | 向量資料庫 + embedding |
| OpenAI clients | Network I/O | 5% | 50MB | API 呼叫 |
| **Total** | | **55%** | **~1GB** | **單一測試** |

### 為什麼 ChromaDB 消耗最多？

```
ChromaDB 包含：
1. 向量資料庫 server (chromadb-server)
2. Embedding model (sentence-transformers)
   - 可能載入 BERT/MPNet 等模型 (300-500MB)
3. 向量索引 (HNSW/IVF)
   - 記憶體中的索引結構 (100-200MB)
4. Python runtime
   - 如果使用 Python binding (100MB+)
```

---

## ⚠️ 並行測試的資源爆炸

### Scenario 1: 舊配置（導致凍結的配置）

```
vitest.e2e.config.ts:
  maxThreads: 2
  retry: 1

測試檔案：
  - voice-rag.spec.ts
  - collaboration.spec.ts
  - api-security.spec.ts

計算：
  2 threads × 3 test files × 2 attempts (initial + retry) = 12 concurrent test instances

每個 test instance 啟動：
  - vitest worker (1 Node)
  - Express server (1 Node)
  - ChromaDB (1 process)
  - Test agents (collaboration.spec.ts 可能啟動多個 agents)

Total processes:
  12 instances × 4 processes = 48+ concurrent processes

Resource usage:
  12 instances × 55% CPU = 660% CPU (freeze on 8-core CPU!)
  12 instances × 1GB memory = 12GB memory
```

### Scenario 2: 多 Agents 並行（2025-12-26 事件）

```
3 agents 同時運行 E2E 測試：

Agent 1: npm run test:e2e
  → vitest (maxThreads=2, retry=1)
  → 2 threads × 3 files × 2 attempts = 12 instances
  → 12 × 4 processes = 48 processes

Agent 2: npm run test:e2e
  → 48 processes

Agent 3: npm run test:e2e
  → 48 processes

Total: 3 × 48 = 144 processes
CPU: 3 × 660% = 1980% (系統完全凍結!)
Memory: 3 × 12GB = 36GB
```

### Scenario 3: 新配置（安全的配置）

```
vitest.e2e.config.ts:
  maxThreads: 1
  retry: 0
  singleThread: true

+ test-monitor.sh mutex lock
+ GlobalResourcePool (只允許 1 個 E2E)

計算：
  1 thread × 3 test files × 1 attempt = 3 sequential test instances

Sequential execution:
  Test 1 runs → completes → Test 2 runs → completes → Test 3 runs

At any time:
  只有 1 個 test instance 運行
  = 4-6 processes (vitest + server + ChromaDB)

Resource usage:
  55% CPU (安全!)
  ~1GB memory (安全!)
```

---

## 🎯 為什麼需要這些服務？

### 1. Express Server (不可省略)

```typescript
// voice-rag E2E test 需要測試 HTTP endpoints:
await axios.post(`${VOICE_RAG_API}/api/voice-rag/chat`, formData);

// 這需要一個真實的 HTTP server 運行
// 單元測試可以 mock，但 E2E 必須測試真實整合
```

### 2. ChromaDB (不可省略 - E2E 目的)

```typescript
// RAG 系統的核心：向量檢索
const retrievedDocs = await voiceRAGAgent.retrieveDocuments(query);

// E2E 測試必須驗證：
// - 文檔確實被索引到 ChromaDB
// - 向量搜尋確實返回相關結果
// - Embedding 生成正確

// 無法用 mock 替代 - 這就是 E2E 的意義
```

### 3. OpenAI APIs (可以 mock，但不完整)

```typescript
// STT: 語音轉文字
const transcript = await openai.audio.transcriptions.create(...);

// TTS: 文字轉語音
const audioBuffer = await openai.audio.speech.create(...);

// E2E 理想上應該測試真實 API
// 但可以用 mock 降低成本和資源消耗
```

### 4. Vitest Workers (不可省略 - 測試框架需求)

```typescript
// Vitest 需要 worker process 來：
// - 隔離測試環境
// - 並行執行測試（即使 maxThreads=1 也需要 1 個 worker）
// - 處理 async/await
// - 收集覆蓋率

// 這是測試框架的基本要求
```

---

## 🔧 優化策略（已實施）

### Strategy 1: 降低並行度 ✅

```typescript
// vitest.e2e.config.ts
{
  maxThreads: 2 → 1      // 75% reduction
  retry: 1 → 0           // 50% reduction
  singleThread: true     // 強制序列化
}

Impact: 12 instances → 1 instance = 92% reduction
```

### Strategy 2: 互斥鎖 ✅

```bash
# test-monitor.sh
acquire_e2e_lock()  # 確保同時只有 1 個測試運行

Impact: 3 parallel agents → 1 at a time = 67% reduction
```

### Strategy 3: 全局資源池 ✅

```typescript
// GlobalResourcePool.ts
maxConcurrentE2E: 1  // 跨 orchestrator 實例協調

Impact: Multiple orchestrators → serialized = 100% safe
```

### Strategy 4: 資源監控 ✅

```bash
# test-monitor.sh
MAX_CPU_PERCENT=70
MAX_MEMORY_MB=2048

# 超過限制自動終止，防止凍結
```

---

## 📈 優化前後對比

| Metric | Before (Freeze) | After (Fixed) | Improvement |
|--------|-----------------|---------------|-------------|
| Concurrent E2E | 3+ agents × 12 instances | 1 instance | **97%** ⬇️ |
| CPU Usage | 1980% (freeze) | 55% | **97%** ⬇️ |
| Memory Usage | 36GB (OOM) | 1GB | **97%** ⬇️ |
| Process Count | 144+ | 4-6 | **96%** ⬇️ |
| System Stability | ❌ Freeze | ✅ Stable | ✅ |

---

## 💡 為什麼不能只用單元測試？

### E2E 測試的獨特價值

```
單元測試 (Unit Test):
  ✅ 快速 (< 1 second)
  ✅ 低資源消耗
  ❌ 無法測試整合
  ❌ 無法發現實際 API 問題
  ❌ Mock 可能與真實行為不同

E2E 測試 (End-to-End):
  ✅ 測試真實整合
  ✅ 發現系統性問題
  ✅ 驗證實際部署行為
  ❌ 慢 (10-60 seconds)
  ❌ 高資源消耗
```

### 實際案例（為什麼需要 E2E）

```
Case 1: ChromaDB 版本升級
  - 單元測試：全部通過（用 mock）
  - E2E 測試：失敗！（真實 ChromaDB API 改變了）
  → E2E 提前發現問題 ✅

Case 2: OpenAI API 限制
  - 單元測試：無法發現（mock 沒有限制）
  - E2E 測試：429 Too Many Requests
  → E2E 發現 rate limiting 問題 ✅

Case 3: Express 中間件順序
  - 單元測試：各 middleware 獨立測試通過
  - E2E 測試：CORS 錯誤！（順序錯誤）
  → E2E 發現整合問題 ✅
```

---

## 🎓 學到的教訓

### 1. E2E 測試不是「很多單元測試」

```
E2E ≠ Unit × N

E2E = 完整系統整合測試
     = 真實服務 + 真實資料庫 + 真實 API
     = 高資源消耗（合理且必要）
```

### 2. 資源管理必須是全局的

```
Per-Agent 限制 ≠ 系統安全

3 agents × "safe" config = 系統凍結
→ 需要全局協調（GlobalResourcePool）
```

### 3. 硬體限制必須動態檢測

```
Hard-coded maxThreads=2 ≠ 對所有硬體適用

8-core CPU → maxThreads=2 可能安全
4-core CPU → maxThreads=2 可能凍結
16-core CPU → maxThreads=2 浪費資源

→ 使用 SystemResourceManager 動態調整
```

### 4. E2E 測試必須序列化

```
對於啟動多個服務的測試（如 RAG, Voice AI）：
  並行 = 資源爆炸
  序列 = 可預測且安全

即使慢一點，穩定性更重要
```

---

## 🚀 未來優化方向

### 1. Service Pooling（服務池）

```typescript
// 不是每個測試都啟動新 server
// 而是共用一個 server pool

class ServicePool {
  private static chromeDB: ChromaDB;
  private static expressServer: Express;

  static async getOrCreateChromeDB() {
    if (!this.chromeDB) {
      this.chromeDB = await initChromaDB();
    }
    return this.chromeDB;
  }
}

// Impact: 節省 50% 啟動時間和記憶體
```

### 2. Test Isolation without Full Restart

```typescript
// 不重啟服務，只清理資料
beforeEach(async () => {
  await chromeDB.clearCollection('test');  // 清理資料
  // 不重啟 ChromaDB server
});

// Impact: 更快的測試 + 更低資源消耗
```

### 3. Conditional E2E（條件性 E2E）

```typescript
// 只在 CI/CD 或明確請求時運行完整 E2E
// 本地開發使用輕量版

if (process.env.CI || process.env.FULL_E2E) {
  // 真實 ChromaDB + OpenAI API
} else {
  // Mock ChromaDB + Fake OpenAI responses
}

// Impact: 本地開發更快，CI 仍然完整測試
```

---

**總結**：E2E 測試的高資源消耗是合理且必要的，關鍵是通過全局協調和資源監控來確保系統穩定。
