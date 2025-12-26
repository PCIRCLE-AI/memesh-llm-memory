# Agent Lightning Integration Analysis

**日期**: 2025-12-27
**目的**: 評估 Microsoft Agent Lightning 是否能加速 Self-Evolving Agent System 開發

---

## Executive Summary

**結論**: **Option B - Hybrid Approach (推薦)**

Agent Lightning 提供優秀的基礎設施（persistence, dashboard, tracing），但核心是 **Python-based**，而我們的專案是 **TypeScript-based**。完全遷移到 Python 成本太高，但我們可以採用混合方案，利用其基礎設施並建立輕量級整合層。

**預估時間節省**: 40-60% (Phase 1 從 2 週減少到 4-5 天)

**推薦行動**:
1. 使用 Agent Lightning 的 LightningStore HTTP API 作為持久化層
2. 使用 Agent Lightning Dashboard 作為監控 UI
3. 建立 TypeScript adapter 連接我們的 agents 到 LightningStore
4. 保持我們的 TypeScript agent 架構不變

---

## 1. Agent Lightning 架構分析

### 1.1 核心組件 (Python)

```python
# Package: agentlightning (Python >= 3.10)
# Published: PyPI, v0.3.1 (2025-12-24)

# 主要組件：
- LightningStore          # 持久化層 (in-memory + client-server)
- LightningStoreServer    # HTTP API server
- LightningStoreClient    # HTTP client
- LLMProxy                # LiteLLM-based proxy with auto-tracing
- OtelTracer             # OpenTelemetry span collection
- AgentOpsTracer         # AgentOps integration
- Trainer                # Training framework (RL, APO, SFT)
- CLI: agl               # Command-line interface
```

**依賴項**:
- OpenTelemetry (spans, attributes, resources)
- LiteLLM (proxy + 100+ LLM providers)
- FastAPI + Uvicorn (HTTP server)
- AgentOps (instrumentation)
- Rich (terminal UI)

### 1.2 Dashboard (TypeScript/React)

```json
{
  "name": "agent-lightning-dashboard",
  "version": "0.3.1",
  "stack": {
    "framework": "React 19",
    "build": "Vite 7",
    "ui": "Mantine UI 8",
    "state": "Redux Toolkit 2",
    "router": "React Router 7",
    "editor": "Monaco Editor",
    "test": "Vitest 4 + Playwright"
  }
}
```

**Dashboard 功能**:
- Rollout 和 Attempt 列表視圖
- Span trace 可視化
- Performance metrics (latency, cost, quality)
- Training progress 監控
- Real-time updates (WebSocket 或 polling)

### 1.3 Integration Patterns

#### Pattern 1: LLMProxy Auto-Tracing

```python
# 1. Start LightningStore server
store = agl.InMemoryLightningStore()
store_server = agl.LightningStoreServer(store, "127.0.0.1", 43887)
await store_server.start()

# 2. Start LLM proxy wrapping vLLM/OpenAI
llm_proxy = agl.LLMProxy(
    port=43886,
    model_list=[{"model_name": "gpt-4", "litellm_params": {...}}],
    store=store_server
)
await llm_proxy.start()

# 3. Client makes request (automatic tracing!)
url = f"http://localhost:43886/rollout/{rollout_id}/attempt/{attempt_id}/v1/chat/completions"
response = await client.post(url, json={
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
})
# Traces automatically saved to LightningStore!
```

**Key Feature**: URL-based rollout/attempt scoping = **zero code changes** in client

#### Pattern 2: Manual Span Emission

```python
# 1. Initialize tracer
tracer = agl.OtelTracer()
store = agl.LightningStoreClient("http://localhost:45993")
rollout = await store.start_rollout(input={"origin": "my_task"})

# 2. Create trace context
with tracer.lifespan(store):
    async with tracer.trace_context(
        "trace-1",
        store=store,
        rollout_id=rollout.rollout_id,
        attempt_id=rollout.attempt.attempt_id
    ):
        # Create spans
        with tracer.start_as_current_span("operation-1"):
            result = await do_work()

        # Emit reward
        agl.emit_reward(0.9)

# 3. Query spans
spans = await store.query_spans(rollout_id=rollout.rollout_id)
```

#### Pattern 3: Agent Training

```python
class MyAgent(agl.LitAgent[Dict[str, Any]]):
    async def training_rollout_async(
        self, task: Dict[str, Any],
        resources: agl.NamedResources,
        rollout: agl.Rollout
    ) -> float | None:
        # Execute task
        result = await self.execute(task)

        # Compute reward
        reward = compute_reward(result, task["expected"])

        return float(reward)

# Train
trainer = agl.Trainer(initial_resources={
    "main_llm": agl.LLM(endpoint="...", model="gpt-4")
})
trainer.train(MyAgent(), train_dataset=data)
```

---

## 2. 與我們系統的比較

### 2.1 Architecture Mapping

| Our Roadmap (Phase 1) | Agent Lightning Equivalent | Integration Effort |
|----------------------|---------------------------|-------------------|
| **1.1 Persistent Storage** | `LightningStore` (SQLite/Postgres) | ⭐⭐⭐⭐⭐ PERFECT |
| **1.2 Automatic Integration** | `LLMProxy` OR manual tracers | ⭐⭐⭐ GOOD (需要 adapter) |
| **1.3 Evolution Dashboard** | React Dashboard (Mantine UI) | ⭐⭐⭐⭐ EXCELLENT |

### 2.2 Language Compatibility

| Component | Agent Lightning | Our System | Compatibility |
|-----------|----------------|------------|--------------|
| Core Agents | **Python** | **TypeScript** | ❌ INCOMPATIBLE |
| Storage Layer | Python (HTTP API) | TypeScript | ✅ HTTP API 可用 |
| Dashboard | TypeScript/React | TypeScript/Express | ✅ 獨立運行 |
| Tracers | Python OpenTelemetry | N/A | ⚠️ 需要 adapter |

### 2.3 Feature Comparison

#### What Agent Lightning Provides:

✅ **Persistent Storage**:
- In-memory store (development)
- Client-server architecture (production)
- HTTP API for cross-language access
- Rollout/Attempt/Span data model
- Query by rollout_id, attempt_id, time range

✅ **Dashboard**:
- Real-time monitoring
- Trace visualization
- Performance metrics
- Training progress
- Production-ready UI

✅ **Automatic Tracing**:
- LLMProxy intercepts all LLM calls
- Zero code changes for clients
- OpenTelemetry-based spans
- AgentOps integration

✅ **Training Framework**:
- Reinforcement Learning (GRPO, PPO)
- Automatic Prompt Optimization (APO)
- Supervised Fine-tuning
- Distributed training (VERL)

#### What We Still Need to Build:

⚠️ **TypeScript Integration Layer**:
- HTTP client for LightningStore API
- Span emission helpers
- Rollout/Attempt management
- TypeScript type definitions

⚠️ **Evolution Logic**:
- PerformanceTracker → LightningStore mapping
- LearningManager pattern extraction
- AdaptationEngine config updates
- Feedback loop implementation

⚠️ **Custom Metrics**:
- Our specific success/failure criteria
- Domain-specific quality scores
- Cost tracking (tokens, time, resources)

---

## 3. Integration Options

### Option A: Full Migration to Python ❌

**Approach**: Rewrite all agents in Python to use Agent Lightning natively

**Pros**:
- ✅ Native integration, zero compatibility issues
- ✅ Full access to all Agent Lightning features (training, APO, VERL)
- ✅ Extensive Python ecosystem for ML/AI

**Cons**:
- ❌ **Massive effort**: Rewrite 112+ tests, 4 teams, entire codebase
- ❌ **Time**: Estimated 4-6 weeks (negates any time savings)
- ❌ **Risk**: Full rewrite = high risk of bugs
- ❌ **Team**: Need Python expertise

**Verdict**: ❌ **不推薦** - 成本遠大於收益

---

### Option B: Hybrid Approach (LightningStore + TS Agents) ⭐⭐⭐⭐⭐

**Approach**: Use Agent Lightning as infrastructure, keep TypeScript agents

```
┌─────────────────────────────────────────────────────────┐
│                  Agent Lightning                        │
│  ┌────────────────┐        ┌─────────────────────┐    │
│  │ LightningStore │◄──HTTP─│ Dashboard (React)   │    │
│  │   (Python)     │        │  - Rollout viewer   │    │
│  │   :45993       │        │  - Span traces      │    │
│  └────────▲───────┘        │  - Metrics charts   │    │
│           │ HTTP API       └─────────────────────┘    │
└───────────┼─────────────────────────────────────────────┘
            │
            │ HTTP (REST/gRPC)
            │
┌───────────▼─────────────────────────────────────────────┐
│              Our TypeScript Agents                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ TS Adapter (thin layer)                          │  │
│  │  - AgentLightningClient                          │  │
│  │  - Span emission helpers                         │  │
│  │  - Rollout/Attempt management                    │  │
│  └──────────────▲───────────────────────────────────┘  │
│                 │                                       │
│  ┌──────────────┴───────────────────────────────────┐  │
│  │ Evolution System (TS - Unchanged)                │  │
│  │  - PerformanceTracker ─> emit spans to AGL      │  │
│  │  - LearningManager ─> store patterns in AGL     │  │
│  │  - AdaptationEngine ─> query patterns from AGL  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Specialized Teams (TS - Unchanged)               │  │
│  │  - CodeDevelopmentTeam                           │  │
│  │  - ResearchAnalysisTeam                          │  │
│  │  - QATeam                                        │  │
│  │  - OrchestrationTeam                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Implementation Steps**:

1. **Week 1: TypeScript Adapter** (2-3 days)
   ```typescript
   // src/evolution/integrations/agent-lightning.ts

   export class AgentLightningClient {
     private baseUrl: string;

     constructor(baseUrl: string = 'http://localhost:45993') {
       this.baseUrl = baseUrl;
     }

     async startRollout(input: Record<string, any>): Promise<Rollout> {
       const response = await fetch(`${this.baseUrl}/rollouts`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ input })
       });
       return response.json();
     }

     async emitSpan(span: Span): Promise<void> {
       await fetch(`${this.baseUrl}/spans`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(span)
       });
     }

     async querySpans(filters: SpanQuery): Promise<Span[]> {
       const params = new URLSearchParams(filters as any);
       const response = await fetch(`${this.baseUrl}/spans?${params}`);
       return response.json();
     }
   }
   ```

2. **Week 1: Evolution System Integration** (2-3 days)
   ```typescript
   // src/evolution/PerformanceTracker.ts

   export class PerformanceTracker {
     private aglClient: AgentLightningClient;
     private currentRollout?: Rollout;

     async track(execution: ExecutionMetrics): Promise<void> {
       // Emit span to Agent Lightning
       await this.aglClient.emitSpan({
         name: 'agent.execution',
         attributes: {
           'agent.id': execution.agentId,
           'task.type': execution.taskType,
           'execution.success': execution.success,
           'execution.duration_ms': execution.durationMs,
           'execution.cost': execution.cost,
           'execution.quality': execution.qualityScore,
         },
         start_time: execution.startTime,
         end_time: execution.endTime,
       });

       // Store in local tracker (for backward compatibility)
       this.metrics.set(execution.agentId, execution);
     }

     async getHistory(agentId: string): Promise<ExecutionMetrics[]> {
       // Query from Agent Lightning
       const spans = await this.aglClient.querySpans({
         attributes: { 'agent.id': agentId },
         limit: 100,
       });

       return spans.map(span => this.spanToMetrics(span));
     }
   }
   ```

3. **Week 2: Dashboard Setup** (1 day)
   ```bash
   # Clone Agent Lightning dashboard
   cd /tmp/agent-lightning/dashboard
   npm install

   # Configure to connect to our LightningStore
   echo "VITE_API_URL=http://localhost:45993" > .env.local

   # Build and serve
   npm run build
   npm run preview -- --port 8080

   # Or run in development mode
   npm run dev
   ```

4. **Week 2: Testing & Validation** (2-3 days)
   - Test rollout creation and span emission
   - Verify dashboard displays our data correctly
   - Test query performance with 1000+ spans
   - Validate backward compatibility with existing tests

**Pros**:
- ✅ **Fast**: 4-5 days implementation (vs. 2 weeks building from scratch)
- ✅ **Low Risk**: Minimal changes to existing codebase
- ✅ **Production Ready**: LightningStore + Dashboard are battle-tested
- ✅ **Backward Compatible**: Keeps all existing tests working
- ✅ **TypeScript Native**: Our agents stay in TypeScript
- ✅ **Best of Both Worlds**: Infrastructure from AGL, logic from us

**Cons**:
- ⚠️ **HTTP Overhead**: Span emission via HTTP (mitigated by batching)
- ⚠️ **Dependency**: External Python service required
- ⚠️ **Limited Training**: Can't use GRPO/APO/VERL (we don't need them yet)

**Verdict**: ⭐⭐⭐⭐⭐ **強烈推薦** - 最佳性價比

---

### Option C: Dashboard Only (Read-Only) ⭐⭐

**Approach**: Only use Agent Lightning Dashboard, build our own persistence

**Pros**:
- ✅ Beautiful, production-ready dashboard
- ✅ No dependency on Python service

**Cons**:
- ❌ Still need to build persistence layer (2 weeks)
- ❌ Need to implement LightningStore-compatible API
- ❌ Dashboard may need customization for our data model
- ❌ Missing 50% of the value (LightningStore)

**Verdict**: ⭐⭐ **不推薦** - 失去了 LightningStore 的價值

---

### Option D: Build Everything Ourselves ⭐⭐⭐

**Approach**: Follow original roadmap, no Agent Lightning

**Pros**:
- ✅ Full control
- ✅ TypeScript-native
- ✅ No external dependencies

**Cons**:
- ❌ **Slower**: 2 weeks for Phase 1 (vs. 4-5 days with Option B)
- ❌ **Reinventing Wheel**: LightningStore already solves persistence
- ❌ **Dashboard**: Need to build UI from scratch (+ 1 week)

**Verdict**: ⭐⭐⭐ **可行但不推薦** - 浪費時間重複造輪

---

## 4. Detailed Cost-Benefit Analysis

### 4.1 Time Comparison (Phase 1)

| Task | Build Ourselves (Option D) | Hybrid (Option B) | Savings |
|------|---------------------------|-------------------|---------|
| Persistent Storage (SQLite/Postgres) | 3 days | 0.5 days (HTTP client) | **2.5 days** |
| Rollout/Attempt/Span models | 2 days | 0.5 days (TypeScript types) | **1.5 days** |
| Query API | 2 days | 1 day (TS adapter) | **1 day** |
| Dashboard UI | 5 days | 1 day (setup + config) | **4 days** |
| Span emission helpers | 1 day | 1 day | 0 days |
| Testing & validation | 2 days | 1 day | **1 day** |
| **TOTAL** | **14 days (2.8 weeks)** | **5 days (1 week)** | **9 days (64%)** |

### 4.2 Code Volume Comparison

| Component | Build Ourselves | Hybrid (Option B) |
|-----------|----------------|-------------------|
| Persistence Layer | ~800 lines | ~150 lines (HTTP client) |
| Dashboard | ~2000 lines | 0 lines (use AGL dashboard) |
| Span Models | ~300 lines | ~100 lines (TS types) |
| Query Engine | ~400 lines | ~100 lines (HTTP wrapper) |
| **TOTAL** | **~3500 lines** | **~350 lines (90% reduction)** |

### 4.3 Maintenance Burden

| Aspect | Build Ourselves | Hybrid (Option B) |
|--------|----------------|-------------------|
| Bug fixes | Our responsibility | Agent Lightning team |
| Security patches | Our responsibility | Agent Lightning team |
| Feature additions | Manual implementation | Automatic via upgrades |
| Dashboard improvements | Manual development | Automatic via upgrades |
| Performance tuning | Manual optimization | Leverages MSFT research |

---

## 5. Risk Analysis

### 5.1 Option B (Hybrid) Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Agent Lightning Breaking Changes** | Medium | Medium | Pin version, test upgrades |
| **HTTP Latency** | Low | Low | Batch span emission, local cache |
| **Python Service Dependency** | Medium | Medium | Docker container, health checks |
| **API Incompatibilities** | Low | High | Wrap in adapter, version compatibility tests |
| **Dashboard Customization Needs** | Medium | Low | Fork dashboard if needed, contribute upstream |

### 5.2 Option D (Build Ourselves) Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Longer Development Time** | High | High | Allocate more resources |
| **Bugs in Implementation** | Medium | High | Extensive testing |
| **Performance Issues** | Medium | Medium | Profiling, optimization |
| **Maintenance Burden** | High | Medium | Code reviews, documentation |

---

## 6. Migration Path (Option B - Recommended)

### Phase 1: Foundation (Week 1)

#### Day 1-2: TypeScript Adapter
```bash
cd /Users/ktseng/Developer/Projects/smart-agents

# 1. Create integration module
mkdir -p src/evolution/integrations
touch src/evolution/integrations/agent-lightning.ts

# 2. Add types
touch src/evolution/integrations/types.ts

# 3. Add tests
mkdir -p tests/evolution/integrations
touch tests/evolution/integrations/agent-lightning.test.ts
```

**Files to Create**:
- `src/evolution/integrations/agent-lightning.ts` (~200 lines)
- `src/evolution/integrations/types.ts` (~100 lines)
- `tests/evolution/integrations/agent-lightning.test.ts` (~150 lines)

#### Day 3-4: Evolution System Integration
```typescript
// Update PerformanceTracker to emit to AGL
// Update LearningManager to store patterns in AGL
// Update AdaptationEngine to query from AGL
```

**Files to Modify**:
- `src/evolution/PerformanceTracker.ts` (+ ~50 lines)
- `src/evolution/LearningManager.ts` (+ ~50 lines)
- `src/evolution/AdaptationEngine.ts` (+ ~50 lines)

#### Day 5: Testing
```bash
# Run all tests with AGL integration
npm run test:evolution

# Verify backward compatibility
npm run test
```

### Phase 2: Dashboard (Week 2)

#### Day 1: Setup LightningStore Server
```bash
# Install Agent Lightning
cd /tmp
git clone https://github.com/microsoft/agent-lightning.git
cd agent-lightning

# Install with uv (recommended) or pip
uv sync --frozen
source .venv/bin/activate

# Start LightningStore server
agl store --port 45993 --log-level INFO

# Or with docker (if available)
docker run -p 45993:45993 agentlightning/store:latest
```

#### Day 2: Setup Dashboard
```bash
cd /tmp/agent-lightning/dashboard

# Install dependencies
npm install

# Configure API endpoint
echo "VITE_API_URL=http://localhost:45993" > .env.local

# Run in development mode
npm run dev

# Dashboard available at http://localhost:5173
```

#### Day 3-4: Integration Testing
```bash
# 1. Start all services
# Terminal 1: LightningStore
agl store --port 45993

# Terminal 2: Dashboard
cd /tmp/agent-lightning/dashboard && npm run dev

# Terminal 3: Run our agents
cd /Users/ktseng/Developer/Projects/smart-agents
npm run test:evolution

# 2. Verify in dashboard
# Open http://localhost:5173
# Check rollouts, spans, metrics appear correctly
```

#### Day 5: Production Setup
```bash
# Build dashboard for production
cd /tmp/agent-lightning/dashboard
npm run build

# Serve built dashboard
npm run preview -- --port 8080

# Or copy to our project
cp -r dist /Users/ktseng/Developer/Projects/smart-agents/dashboard-dist

# Update our Express server to serve dashboard
```

### Phase 3: Documentation & Deployment

```bash
# Create integration guide
touch docs/AGENT_LIGHTNING_SETUP.md

# Update main README
# Add section on evolution dashboard

# Create deployment scripts
mkdir -p scripts/evolution
touch scripts/evolution/start-agl-store.sh
touch scripts/evolution/start-dashboard.sh
```

---

## 7. Technical Deep Dive: Key Integration Points

### 7.1 Span Emission Pattern

**Current (In-Memory)**:
```typescript
// PerformanceTracker.ts
track(metrics: ExecutionMetrics): void {
  this.metrics.set(agentId, metrics);
  this.emit('metrics', metrics);
}
```

**After Integration**:
```typescript
// PerformanceTracker.ts
async track(metrics: ExecutionMetrics): Promise<void> {
  // Emit to Agent Lightning
  await this.aglClient.emitSpan({
    name: 'agent.execution',
    trace_id: this.currentTraceId,
    span_id: generateSpanId(),
    start_time: metrics.startTime,
    end_time: metrics.endTime,
    attributes: {
      'agent.id': metrics.agentId,
      'task.type': metrics.taskType,
      'execution.success': metrics.success,
      'execution.duration_ms': metrics.durationMs,
      'execution.cost': metrics.cost,
      'execution.quality_score': metrics.qualityScore,
    },
    resource: {
      'agentlightning.rollout_id': this.currentRollout.rollout_id,
      'agentlightning.attempt_id': this.currentAttempt.attempt_id,
    }
  });

  // Keep local copy for immediate access
  this.metrics.set(agentId, metrics);
}
```

### 7.2 Pattern Storage

**Current (In-Memory)**:
```typescript
// LearningManager.ts
storePattern(pattern: Pattern): void {
  this.patterns.push(pattern);
}
```

**After Integration**:
```typescript
// LearningManager.ts
async storePattern(pattern: Pattern): Promise<void> {
  // Store as span with special attributes
  await this.aglClient.emitSpan({
    name: 'evolution.pattern',
    attributes: {
      'pattern.type': pattern.type,
      'pattern.confidence': pattern.confidence,
      'pattern.data': JSON.stringify(pattern.data),
      'pattern.source_spans': pattern.sourceSpanIds.join(','),
    }
  });

  // Keep local copy
  this.patterns.push(pattern);
}

async queryPatterns(filters: PatternQuery): Promise<Pattern[]> {
  // Query from Agent Lightning
  const spans = await this.aglClient.querySpans({
    name: 'evolution.pattern',
    attributes: filters
  });

  return spans.map(span => this.spanToPattern(span));
}
```

### 7.3 Rollout Management

```typescript
// src/evolution/integrations/rollout-manager.ts

export class RolloutManager {
  private aglClient: AgentLightningClient;
  private currentRollout?: Rollout;

  async startTask(taskType: string, input: any): Promise<Rollout> {
    // Create rollout in Agent Lightning
    this.currentRollout = await this.aglClient.startRollout({
      origin: `smart-agents-${taskType}`,
      input: input
    });

    return this.currentRollout;
  }

  async endTask(success: boolean): Promise<void> {
    if (!this.currentRollout) return;

    // Mark rollout complete
    await this.aglClient.updateRollout(this.currentRollout.rollout_id, {
      status: success ? 'completed' : 'failed',
      end_time: new Date().toISOString()
    });
  }

  getCurrentRollout(): Rollout | undefined {
    return this.currentRollout;
  }
}
```

---

## 8. Example: Complete Integration Flow

### Scenario: User asks agent to analyze code quality

```
User Request → Smart Agents → Evolution System → Agent Lightning
```

**Step-by-Step**:

```typescript
// 1. User request arrives
const task = {
  type: 'code_analysis',
  input: { repoUrl: 'https://github.com/user/repo' }
};

// 2. Start rollout in Agent Lightning
const rollout = await rolloutManager.startTask('code_analysis', task.input);

// 3. Execute with code-reviewer agent (emits spans automatically)
const codeReviewer = new CodeReviewerAgent();
const result = await codeReviewer.execute(task);

// During execution, PerformanceTracker emits:
await aglClient.emitSpan({
  name: 'agent.execution',
  attributes: {
    'agent.id': 'code-reviewer-001',
    'task.type': 'code_analysis',
    'execution.duration_ms': 3500,
    'execution.quality_score': 0.92,
  },
  resource: {
    'agentlightning.rollout_id': rollout.rollout_id,
    'agentlightning.attempt_id': rollout.attempt.attempt_id,
  }
});

// 4. LearningManager extracts pattern
if (result.success && result.qualityScore > 0.9) {
  await learningManager.storePattern({
    type: 'success_pattern',
    confidence: 0.95,
    data: {
      agent: 'code-reviewer',
      task: 'code_analysis',
      config: codeReviewer.config,
      outcome: result
    }
  });
  // This emits span: name='evolution.pattern'
}

// 5. View in dashboard
// Navigate to http://localhost:5173
// - See rollout listed
// - Click to view span trace
// - See execution metrics chart
// - See extracted patterns
```

---

## 9. Performance Considerations

### 9.1 HTTP Overhead

**Concern**:每次 span emission 都要 HTTP 請求，會不會太慢？

**Solution**: Batching + Async

```typescript
export class BatchedAGLClient {
  private queue: Span[] = [];
  private flushInterval = 1000; // 1 second

  constructor(private baseClient: AgentLightningClient) {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async emitSpan(span: Span): Promise<void> {
    this.queue.push(span);

    // Flush if queue is large
    if (this.queue.length >= 100) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, 100);
    await this.baseClient.emitSpanBatch(batch);
  }
}
```

**Benchmark** (estimated):
- Single span emission: ~10ms (HTTP roundtrip)
- Batched (100 spans): ~15ms (1.5ms per span)
- **Improvement**: 6.7x faster

### 9.2 Query Performance

**Agent Lightning LightningStore** uses:
- In-memory indexing for fast queries
- SQLite/Postgres for persistence
- Indexed on: rollout_id, attempt_id, span_id, timestamp

**Expected Performance**:
- Query by rollout_id: ~10ms (10K spans)
- Query with filters: ~50ms (100K spans)
- Full-text search: ~200ms (1M spans)

---

## 10. Deployment Architecture

### Development Environment

```
┌──────────────────────────────────────────────────────┐
│  Developer Machine                                   │
│                                                      │
│  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ Smart Agents   │  │ Agent Lightning          │  │
│  │ (TS)           │  │                          │  │
│  │ :3000          │  │  ┌───────────────────┐  │  │
│  │                │  │  │ LightningStore    │  │  │
│  │ ┌────────────┐ │  │  │ (Python)          │  │  │
│  │ │ Evolution  ├─┼──┼─►│ :45993            │  │  │
│  │ │ System     │ │  │  └───────────────────┘  │  │
│  │ └────────────┘ │  │                          │  │
│  │                │  │  ┌───────────────────┐  │  │
│  │                │  │  │ Dashboard (React) │  │  │
│  │                │  │  │ :5173             │  │  │
│  │                │  │  └───────────────────┘  │  │
│  └────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Production Environment

```
┌────────────────────────────────────────────────────────┐
│  Docker Compose                                        │
│                                                        │
│  ┌──────────────┐   ┌─────────────────────────────┐  │
│  │ Smart Agents │   │ Agent Lightning             │  │
│  │ Container    │   │                             │  │
│  │              │   │  ┌──────────────────────┐  │  │
│  │  ┌────────┐ │   │  │ LightningStore       │  │  │
│  │  │Evolution├─┼───┼─►│ + Postgres           │  │  │
│  │  │System  │ │   │  │ :45993               │  │  │
│  │  └────────┘ │   │  └──────────────────────┘  │  │
│  │              │   │                             │  │
│  │              │   │  ┌──────────────────────┐  │  │
│  │              │   │  │ Dashboard (Nginx)    │  │  │
│  │              │   │  │ :80                  │  │  │
│  │              │   │  └──────────────────────┘  │  │
│  └──────────────┘   └─────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Postgres Volume (persistent)                    │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: agentlightning
      POSTGRES_USER: agl
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - agent-network

  lightning-store:
    image: agentlightning/store:0.3.1
    command: agl store --port 45993 --postgres postgresql://agl:${POSTGRES_PASSWORD}@postgres:5432/agentlightning
    ports:
      - "45993:45993"
    depends_on:
      - postgres
    networks:
      - agent-network

  lightning-dashboard:
    image: agentlightning/dashboard:0.3.1
    environment:
      VITE_API_URL: http://lightning-store:45993
    ports:
      - "8080:80"
    depends_on:
      - lightning-store
    networks:
      - agent-network

  smart-agents:
    build: .
    environment:
      AGL_STORE_URL: http://lightning-store:45993
    ports:
      - "3000:3000"
    depends_on:
      - lightning-store
    networks:
      - agent-network

volumes:
  pgdata:

networks:
  agent-network:
```

---

## 11. Alternative: LLMProxy Pattern (Zero Code Changes)

**如果我們想要 ZERO code changes**，可以使用 Agent Lightning 的 LLMProxy：

```
┌─────────────────────────────────────────────────────┐
│  Smart Agents (NO changes)                          │
│                                                     │
│  const response = await openai.chat.completions     │
│    .create({                                        │
│      model: 'gpt-4',                                │
│      messages: [...]                                │
│    });                                              │
│                                                     │
│  baseUrl: 'http://localhost:43886/v1' ◄─────┐     │
└─────────────────────────────────────────────┼──────┘
                                              │
                                              │
┌─────────────────────────────────────────────▼──────┐
│  Agent Lightning LLMProxy                          │
│                                                    │
│  - Intercepts all OpenAI calls                    │
│  - Automatically creates spans                    │
│  - Stores to LightningStore                       │
│  - Forwards to real OpenAI API                    │
│                                                    │
│  URL Pattern:                                      │
│  /rollout/{rollout_id}/attempt/{attempt_id}/v1    │
└────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ ZERO code changes
- ✅ Automatic tracing
- ✅ Works with any OpenAI-compatible client

**Cons**:
- ⚠️ Less control over span attributes
- ⚠️ Need to manage rollout_id in URL (can use middleware)
- ⚠️ Limited to LLM calls only (not general execution metrics)

---

## 12. Final Recommendations

### ✅ Recommended: Option B (Hybrid Approach)

**Why**:
1. **Best ROI**: 64% time savings (9 days) for Phase 1
2. **Low Risk**: Minimal changes to existing codebase
3. **Production Ready**: Leverage Microsoft's infrastructure
4. **TypeScript Native**: Keep our agents in TypeScript
5. **Upgradeable**: Can adopt more AGL features later (training, APO)

### 📋 Immediate Next Steps (Week 1)

1. **Day 1**:
   - [ ] Install Agent Lightning: `cd /tmp && git clone https://github.com/microsoft/agent-lightning.git`
   - [ ] Start LightningStore: `agl store --port 45993`
   - [ ] Verify dashboard works: Navigate to `http://localhost:5173`

2. **Day 2-3**:
   - [ ] Create TypeScript adapter (`src/evolution/integrations/agent-lightning.ts`)
   - [ ] Write types (`src/evolution/integrations/types.ts`)
   - [ ] Write tests (`tests/evolution/integrations/agent-lightning.test.ts`)

3. **Day 4-5**:
   - [ ] Integrate with PerformanceTracker
   - [ ] Integrate with LearningManager
   - [ ] Integrate with AdaptationEngine
   - [ ] Run full test suite

### 📊 Success Metrics (Week 2)

- [ ] All 112+ tests passing with AGL integration
- [ ] Dashboard shows rollouts and spans correctly
- [ ] Span emission latency < 20ms (batched)
- [ ] Query performance < 100ms (10K spans)
- [ ] Zero downtime during integration

### 🚀 Future Enhancements (Month 3+)

Once basic integration is stable, we can explore:

1. **Training Integration** (if needed):
   - Use Agent Lightning's GRPO for prompt optimization
   - Use APO for automatic prompt engineering

2. **LLMProxy Integration**:
   - Wrap all OpenAI calls through LLMProxy
   - Zero-code automatic tracing

3. **Dashboard Customization**:
   - Fork dashboard for custom metrics
   - Add domain-specific visualizations

4. **Advanced Features**:
   - Multi-objective optimization
   - A/B testing framework
   - Federated learning across agents

---

## 13. Conclusion

Agent Lightning 是一個強大的基礎設施框架，雖然核心是 Python-based，但透過其 **LightningStore HTTP API** 和 **TypeScript Dashboard**，我們可以建立一個輕量級的整合層，在**不改變現有 TypeScript agents** 的前提下，獲得：

✅ **Persistent Storage** (免費)
✅ **Production Dashboard** (免費)
✅ **OpenTelemetry Tracing** (免費)
✅ **Query Engine** (免費)
✅ **Microsoft Support** (免費)

**投資**: 4-5 天開發時間
**回報**: 節省 9 天開發時間 + 長期維護成本
**ROI**: **180%**

**決策建議**: ✅ **立即採用 Option B (Hybrid Approach)**

---

**文件版本**: v1.0
**最後更新**: 2025-12-27
**作者**: Claude (Smart Agents Team)
**審查者**: 待用戶確認
