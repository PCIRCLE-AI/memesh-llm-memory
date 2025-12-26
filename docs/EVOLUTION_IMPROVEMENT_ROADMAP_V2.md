# Self-Evolving Agent System - Improvement Roadmap V2

**Version**: 2.0 (Inspired by Agent Lightning)
**Date**: 2025-12-27
**Status**: Planning

---

## 📚 Lessons Learned from Agent Lightning

在研究 Microsoft Agent Lightning 後，我們學到了以下關鍵設計理念：

### 1. **Rollout/Attempt Hierarchical Model** ⭐⭐⭐⭐⭐

**Agent Lightning 的做法**:
```python
# 清晰的層次結構
Rollout                    # 一個任務/會話
  └── Attempt (可多次)      # 嘗試執行（可重試）
       └── Spans (多個)     # 具體執行步驟
```

**我們應該採用**:
```typescript
Task (類似 Rollout)        # 用戶請求的任務
  └── Execution (類似 Attempt)  # 執行嘗試
       └── Spans            # 細粒度追蹤
```

**優勢**:
- ✅ 支持重試邏輯（同一 task，多次 execution）
- ✅ 清晰的數據組織
- ✅ 易於查詢和分析

---

### 2. **OpenTelemetry-Based Tracing** ⭐⭐⭐⭐⭐

**Agent Lightning 的做法**:
- 使用 OpenTelemetry spans (標準化格式)
- Attributes 用於存儲 key-value 數據
- Resource attributes 用於全局上下文
- Links 用於關聯不同的 spans

**我們應該採用**:
```typescript
interface Span {
  // OpenTelemetry standard
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;

  // Timing
  start_time: number;
  end_time?: number;
  duration_ms?: number;

  // Status
  status: { code: 'OK' | 'ERROR', message?: string };

  // Data (key-value pairs)
  attributes: Record<string, any>;

  // Context
  resource: {
    'agent.id': string;
    'agent.version': string;
    'task.id': string;
    'execution.id': string;
  };

  // Links to other spans
  links?: Array<{
    trace_id: string;
    span_id: string;
    attributes?: Record<string, any>;
  }>;
}
```

**優勢**:
- ✅ 標準化格式（業界標準）
- ✅ 豐富的工具支持（Jaeger, Zipkin, etc.）
- ✅ 可擴展性強

---

### 3. **Link Attributes for Reward Tracking** ⭐⭐⭐⭐⭐

**Agent Lightning 的做法**:
```python
# 記錄 operation
with operation(conversation_id="chat-42", operation_id="op-123"):
    result = await do_work()

# 稍後發送 reward，通過 link attributes 關聯
link_attrs = make_link_attributes({
    "conversation_id": "chat-42",
    "operation_id": "op-123"
})
emit_reward(0.9, attributes=link_attrs)

# 查詢時可以找到對應的 operation
matches = query_linked_spans(operation_spans, link_models)
```

**我們應該採用**:
```typescript
// 執行時記錄
tracker.track({
  spanId: 'span-123',
  attributes: {
    'operation.id': 'analyze-code-001',
    'operation.type': 'code_review'
  }
});

// 稍後提供 reward/feedback
tracker.linkReward('span-123', {
  reward: 0.9,
  feedback: 'Excellent analysis',
  timestamp: Date.now()
});

// 自動建立 link
// span-123 ←→ reward-span-456
```

**優勢**:
- ✅ 解耦執行和評估（可以事後評估）
- ✅ 支持延遲 feedback
- ✅ 清晰的因果關係

---

### 4. **Tag Attributes for Classification** ⭐⭐⭐⭐

**Agent Lightning 的做法**:
```python
tag_attrs = make_tag_attributes(['demo.operation', 'reward.positive'])
emit_reward(0.9, attributes={**link_attrs, **tag_attrs})

# 查詢
extracted_tags = extract_tags_from_attributes(span.attributes)
# ['demo.operation', 'reward.positive']
```

**我們應該採用**:
```typescript
// 記錄時標記
tracker.track({
  spanId: 'span-123',
  tags: [
    'success',           // 成功案例
    'high_quality',      // 高品質
    'fast_execution',    // 執行快速
    'code_review'        // 任務類型
  ]
});

// 查詢高品質的快速執行案例
const patterns = await learner.queryPatterns({
  tags: ['success', 'high_quality', 'fast_execution']
});
```

**優勢**:
- ✅ 多維度分類
- ✅ 易於查詢和過濾
- ✅ 支持模糊匹配

---

### 5. **LLMProxy Pattern for Zero-Code Tracing** ⭐⭐⭐⭐

**Agent Lightning 的做法**:
```python
# LLMProxy 自動攔截 OpenAI calls
llm_proxy = agl.LLMProxy(
    port=43886,
    model_list=[...],
    store=store_server  # 自動記錄 traces
)

# Client 不需要任何改變
openai_client = OpenAI(base_url="http://localhost:43886/v1")
response = openai_client.chat.completions.create(...)
# Traces 自動記錄！
```

**我們應該採用**:
```typescript
// Middleware pattern for automatic tracing
export function withEvolutionTracking<T extends BaseAgent>(
  agent: T
): T {
  return new Proxy(agent, {
    async apply(target, thisArg, args) {
      const span = tracker.startSpan(agent.id);

      try {
        const result = await target.apply(thisArg, args);
        span.setStatus('OK');
        span.setAttribute('result.quality', result.quality);
        return result;
      } catch (error) {
        span.setStatus('ERROR', error.message);
        throw error;
      } finally {
        span.end();
      }
    }
  });
}

// 使用 - ZERO code changes in agent
const trackedAgent = withEvolutionTracking(new CodeReviewerAgent());
```

**優勢**:
- ✅ Zero code changes in agents
- ✅ Automatic tracing
- ✅ Consistent instrumentation

---

### 6. **HTTP API for Cross-Language Compatibility** ⭐⭐⭐⭐

**Agent Lightning 的做法**:
```python
# Server exposes HTTP API
LightningStoreServer(store, "127.0.0.1", 45993)

# Client can be any language
POST /rollouts
GET  /rollouts/{id}
POST /spans
GET  /spans?rollout_id={id}
```

**我們應該採用**:
```typescript
// Evolution System exposes REST API
// Future: Other services can integrate

POST   /api/v1/tasks              # Start task
POST   /api/v1/tasks/{id}/spans   # Record span
GET    /api/v1/tasks/{id}/metrics # Query metrics
GET    /api/v1/patterns            # Query patterns
POST   /api/v1/patterns/{id}/apply # Apply pattern
```

**優勢**:
- ✅ 未來可以支持 Python agents
- ✅ Dashboard 可以獨立部署
- ✅ 微服務友好

---

### 7. **Separate Dashboard from Core Logic** ⭐⭐⭐⭐⭐

**Agent Lightning 的做法**:
```
Core (Python)          Dashboard (TypeScript/React)
    ↓                          ↓
LightningStore  ←─ HTTP API ─→ Mantine UI
(Data layer)                   (View layer)
```

**我們應該採用**:
```
Core (TypeScript)      Dashboard (TypeScript/React)
    ↓                          ↓
EvolutionStore  ←─ HTTP API ─→ Modern UI (TBD)
(Data + Logic)                 (View layer)
```

**優勢**:
- ✅ 關注點分離
- ✅ Dashboard 可以獨立開發
- ✅ 可以有多個 UI (web, CLI, mobile)

---

## 🏗️ Updated Architecture (Inspired by Agent Lightning)

### Old Architecture (V1)
```
PerformanceTracker  →  LearningManager  →  AdaptationEngine
       ↓                      ↓                    ↓
   In-Memory            In-Memory            In-Memory
```

### New Architecture (V2)
```
┌─────────────────────────────────────────────────────────────┐
│                    Evolution System Core                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Instrumentation Layer (Zero-code integration)        │  │
│  │  - withEvolutionTracking() decorator                 │  │
│  │  - Automatic span creation                           │  │
│  │  - Link/Tag helpers                                  │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │ Tracking Layer (OpenTelemetry-based)                 │  │
│  │  - SpanTracker (trace_id, span_id, attributes)      │  │
│  │  - TaskManager (task → executions → spans)          │  │
│  │  - LinkManager (operation ←→ reward)                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │ Storage Layer (Persistent)                           │  │
│  │  - EvolutionStore (interface)                        │  │
│  │    ├─ SQLiteStore (dev)                              │  │
│  │    └─ PostgresStore (prod)                           │  │
│  │  - Query API (by task, agent, tags, time range)     │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │ Learning Layer (Pattern extraction)                  │  │
│  │  - PatternLearner (success, anti-pattern, opt)      │  │
│  │  - ConfidenceScorer (statistical validation)        │  │
│  │  - PatternStore (persistent patterns)               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │ Adaptation Layer (Apply learnings)                  │  │
│  │  - AdaptationEngine (config, prompt, strategy)      │  │
│  │  - FeedbackLoop (track adaptation outcomes)         │  │
│  │  - A/B Testing (compare adaptations)                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │ API Layer (HTTP REST)                                │  │
│  │  - POST /api/v1/tasks                                │  │
│  │  - POST /api/v1/spans                                │  │
│  │  - GET  /api/v1/metrics                              │  │
│  │  - GET  /api/v1/patterns                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP API
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Evolution Dashboard                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ UI Components                                        │  │
│  │  - Task Timeline (Gantt-style)                       │  │
│  │  - Span Trace Viewer (Flamegraph)                    │  │
│  │  - Metrics Charts (success rate, latency, cost)     │  │
│  │  - Pattern Explorer (confidence, impact)            │  │
│  │  - Adaptation Monitor (active, deactivated)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Updated Roadmap (V2)

### Phase 1: Foundation (Week 1-2) - **Enhanced with Agent Lightning Concepts**

#### 1.1 OpenTelemetry-Based Storage (3 days)

**NOT just "Persistent Storage", but "OpenTelemetry-Compatible Storage"**

```typescript
// src/evolution/storage/

interface EvolutionStore {
  // Task management (類似 Rollout)
  createTask(input: any): Promise<Task>;
  getTask(taskId: string): Promise<Task | null>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;

  // Execution management (類似 Attempt)
  createExecution(taskId: string): Promise<Execution>;
  getExecution(executionId: string): Promise<Execution | null>;

  // Span tracking (OpenTelemetry format)
  recordSpan(span: Span): Promise<void>;
  recordSpanBatch(spans: Span[]): Promise<void>;
  querySpans(query: SpanQuery): Promise<Span[]>;

  // Link management (operation ←→ reward)
  createLink(fromSpanId: string, toSpanId: string, attributes?: any): Promise<void>;
  queryLinkedSpans(spanId: string): Promise<Span[]>;

  // Tag-based queries
  queryByTags(tags: string[]): Promise<Span[]>;

  // Patterns
  storePattern(pattern: Pattern): Promise<void>;
  queryPatterns(query: PatternQuery): Promise<Pattern[]>;

  // Stats
  getStats(agentId: string, timeRange: TimeRange): Promise<EvolutionStats>;
}
```

**Database Schema**:
```typescript
// Tasks (類似 Rollouts)
interface Task {
  id: string;
  input: any;
  status: 'running' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

// Executions (類似 Attempts)
interface Execution {
  id: string;
  task_id: string;
  attempt_number: number;
  status: 'running' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

// Spans (OpenTelemetry format)
interface Span {
  // IDs
  trace_id: string;
  span_id: string;
  parent_span_id?: string;

  // Context
  task_id: string;
  execution_id: string;

  // Metadata
  name: string;
  kind: 'internal' | 'client' | 'server';

  // Timing
  start_time: number; // Unix timestamp (ms)
  end_time?: number;

  // Status
  status: {
    code: 'OK' | 'ERROR';
    message?: string;
  };

  // Attributes (flat key-value)
  attributes: Record<string, any>;

  // Resource (global context)
  resource: {
    'agent.id': string;
    'agent.version': string;
    'task.id': string;
    'execution.id': string;
    [key: string]: any;
  };

  // Links (to other spans)
  links?: Array<{
    trace_id: string;
    span_id: string;
    attributes?: Record<string, any>;
  }>;

  // Tags (for classification)
  tags?: string[];
}
```

**Files to Create**:
- `src/evolution/storage/EvolutionStore.ts` (interface)
- `src/evolution/storage/SQLiteStore.ts` (implementation)
- `src/evolution/storage/schema.ts` (database schema)
- `src/evolution/storage/migrations/` (migration scripts)
- `tests/evolution/storage/` (comprehensive tests)

---

#### 1.2 Automatic Instrumentation (2-3 days)

**Inspired by LLMProxy - Zero Code Changes**

```typescript
// src/evolution/instrumentation/

/**
 * Wrap any agent with automatic evolution tracking
 *
 * Usage:
 *   const trackedAgent = withEvolutionTracking(new CodeReviewerAgent());
 */
export function withEvolutionTracking<T extends BaseAgent>(
  agent: T,
  options?: {
    tracker?: SpanTracker;
    autoTags?: string[];
    sampleRate?: number; // 0-1, for sampling
  }
): T {
  const tracker = options?.tracker || getGlobalTracker();

  return new Proxy(agent, {
    async apply(target, thisArg, args) {
      // Create task if not exists
      const task = await tracker.getCurrentTask() || await tracker.createTask({
        origin: `${agent.constructor.name}.execute`
      });

      // Create execution (attempt)
      const execution = await tracker.createExecution(task.id);

      // Start span
      const span = tracker.startSpan({
        name: `${agent.constructor.name}.execute`,
        attributes: {
          'agent.id': agent.id,
          'agent.type': agent.constructor.name,
          'agent.config': JSON.stringify(agent.config),
          ...extractInputAttributes(args[0])
        },
        tags: [
          agent.constructor.name.toLowerCase(),
          ...(options?.autoTags || [])
        ]
      });

      try {
        // Execute
        const result = await target.apply(thisArg, args);

        // Record success
        span.setStatus({ code: 'OK' });
        span.setAttributes({
          'execution.success': true,
          'execution.quality_score': result.qualityScore,
          'execution.cost': result.cost,
        });

        return result;

      } catch (error) {
        // Record failure
        span.setStatus({
          code: 'ERROR',
          message: error.message
        });
        span.setAttributes({
          'execution.success': false,
          'error.type': error.constructor.name,
          'error.message': error.message,
        });

        throw error;

      } finally {
        // End span
        span.end();

        // Auto-learn from this execution
        if (options?.autoLearn !== false) {
          await learner.learnFromSpan(span);
        }
      }
    }
  });
}

/**
 * Decorator version (for class methods)
 */
export function TrackEvolution(options?: TrackingOptions) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const span = tracker.startSpan({
        name: `${target.constructor.name}.${propertyKey}`,
        attributes: {
          'method': propertyKey,
          ...extractMethodAttributes(args)
        }
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: 'OK' });
        return result;
      } catch (error) {
        span.setStatus({ code: 'ERROR', message: error.message });
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}
```

**Usage Examples**:
```typescript
// Example 1: Proxy pattern (zero code changes)
const agent = new CodeReviewerAgent();
const trackedAgent = withEvolutionTracking(agent, {
  autoTags: ['code_review', 'automated'],
  sampleRate: 1.0 // 100% sampling
});

const result = await trackedAgent.execute(task);
// Automatically tracked!

// Example 2: Decorator pattern
class MyAgent extends BaseAgent {
  @TrackEvolution({ tags: ['custom_method'] })
  async processData(data: any) {
    // Method automatically tracked
    return processedData;
  }
}

// Example 3: Manual tracking (for fine-grained control)
const span = tracker.startSpan({ name: 'complex_operation' });
span.setTag('experiment_id', 'exp-123');

try {
  // ... do work ...
  span.setAttributes({ result: 'success' });
} finally {
  span.end();
}
```

**Files to Create**:
- `src/evolution/instrumentation/withEvolutionTracking.ts`
- `src/evolution/instrumentation/decorators.ts`
- `src/evolution/instrumentation/SpanTracker.ts`
- `src/evolution/instrumentation/TaskManager.ts`
- `tests/evolution/instrumentation/` (tests)

---

#### 1.3 Link & Tag Management (1-2 days)

**Inspired by Agent Lightning's link_attributes and tag_attributes**

```typescript
// src/evolution/links/

/**
 * Link a reward/feedback to a previous operation
 */
export async function linkReward(
  operationSpanId: string,
  reward: {
    value: number; // 0-1
    feedback?: string;
    dimensions?: Record<string, number>; // Multi-objective
  }
): Promise<void> {
  const rewardSpan = tracker.startSpan({
    name: 'evolution.reward',
    attributes: {
      'reward.value': reward.value,
      'reward.feedback': reward.feedback,
      ...(reward.dimensions || {})
    },
    links: [{
      span_id: operationSpanId,
      attributes: {
        'link.type': 'reward_for_operation'
      }
    }]
  });

  rewardSpan.end();
}

/**
 * Tag helper for classification
 */
export function withTags(
  spanId: string,
  tags: string[]
): void {
  tracker.updateSpan(spanId, {
    tags: [...existingTags, ...tags]
  });
}

/**
 * Query spans by linked operation
 */
export async function queryRewardsForOperation(
  operationSpanId: string
): Promise<Span[]> {
  return store.queryLinkedSpans(operationSpanId);
}
```

**Usage**:
```typescript
// 1. Execute operation
const span = tracker.startSpan({ name: 'code_review' });
const spanId = span.span_id;
// ... execute ...
span.end();

// 2. Later: User provides feedback
await linkReward(spanId, {
  value: 0.9,
  feedback: 'Great analysis!',
  dimensions: {
    accuracy: 0.95,
    completeness: 0.85,
    speed: 0.90
  }
});

// 3. Tag for classification
withTags(spanId, ['high_quality', 'user_approved']);

// 4. Query
const rewards = await queryRewardsForOperation(spanId);
const highQuality = await store.queryByTags(['high_quality']);
```

---

#### 1.4 HTTP API Layer (2 days)

**Future-proof for cross-language & dashboard**

```typescript
// src/evolution/api/server.ts

import express from 'express';
import { EvolutionStore } from '../storage/EvolutionStore';

export function createEvolutionAPI(store: EvolutionStore) {
  const app = express();
  app.use(express.json());

  // Tasks
  app.post('/api/v1/tasks', async (req, res) => {
    const task = await store.createTask(req.body.input);
    res.json(task);
  });

  app.get('/api/v1/tasks/:id', async (req, res) => {
    const task = await store.getTask(req.params.id);
    res.json(task);
  });

  // Spans
  app.post('/api/v1/spans', async (req, res) => {
    await store.recordSpan(req.body);
    res.status(201).send();
  });

  app.post('/api/v1/spans/batch', async (req, res) => {
    await store.recordSpanBatch(req.body.spans);
    res.status(201).send();
  });

  app.get('/api/v1/spans', async (req, res) => {
    const spans = await store.querySpans({
      task_id: req.query.task_id as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      start_time: req.query.start_time ? parseInt(req.query.start_time as string) : undefined,
      end_time: req.query.end_time ? parseInt(req.query.end_time as string) : undefined,
    });
    res.json(spans);
  });

  // Patterns
  app.get('/api/v1/patterns', async (req, res) => {
    const patterns = await store.queryPatterns({
      type: req.query.type as any,
      min_confidence: req.query.min_confidence ? parseFloat(req.query.min_confidence as string) : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    });
    res.json(patterns);
  });

  // Stats
  app.get('/api/v1/stats/:agent_id', async (req, res) => {
    const stats = await store.getStats(
      req.params.agent_id,
      {
        start: new Date(req.query.start as string),
        end: new Date(req.query.end as string)
      }
    );
    res.json(stats);
  });

  return app;
}
```

**Files to Create**:
- `src/evolution/api/server.ts`
- `src/evolution/api/routes/` (split by resource)
- `src/evolution/api/middleware/` (auth, validation)
- `tests/evolution/api/` (API tests)

---

#### 1.5 Basic Dashboard (3-4 days)

**Simple but functional - can enhance later**

```typescript
// src/evolution/dashboard/

// Tech stack:
// - Vite + React
// - Lightweight UI (Tailwind + shadcn/ui OR Mantine)
// - Chart library (Recharts OR Apache ECharts)
// - Real-time updates (polling OR WebSocket)

// Components:
1. TaskList.tsx           // List all tasks
2. TaskDetail.tsx         // Task timeline + executions
3. SpanTraceViewer.tsx    // Flamegraph-style trace view
4. MetricsCharts.tsx      // Success rate, latency, cost
5. PatternExplorer.tsx    // Discovered patterns
6. AdaptationMonitor.tsx  // Active adaptations
```

**Quick Win: Static HTML Report**
```typescript
// Generate HTML report (no server needed)
export async function generateReport(
  taskId: string,
  outputPath: string
): Promise<void> {
  const task = await store.getTask(taskId);
  const spans = await store.querySpans({ task_id: taskId });
  const patterns = await learner.extractPatterns(spans);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Evolution Report - ${task.id}</title>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    </head>
    <body>
      <h1>Task ${task.id}</h1>
      <div id="timeline"></div>
      <div id="metrics"></div>
      <script>
        // Render charts with Plotly
        ${generateTimelineChart(spans)}
        ${generateMetricsCharts(spans)}
      </script>
    </body>
    </html>
  `;

  await fs.writeFile(outputPath, html);
}
```

---

### Phase 2: Advanced Learning (Week 3-4)

#### 2.1 Context-Aware Pattern Learning

**Learn patterns based on context (task type, agent type, config)**

```typescript
interface ContextualPattern {
  pattern: Pattern;
  context: {
    agent_type?: string;
    task_type?: string;
    config_range?: Record<string, [min: number, max: number]>;
    tags?: string[];
  };
  applicability_score: number; // How well this pattern applies to current context
}
```

#### 2.2 Multi-Objective Optimization

**Inspired by Agent Lightning's multi-dimensional rewards**

```typescript
interface MultiObjectiveReward {
  dimensions: {
    accuracy: number;    // 0-1
    speed: number;       // 0-1
    cost: number;        // 0-1
    user_satisfaction: number; // 0-1
  };
  weights?: Record<string, number>; // User-defined priorities
  aggregated_score: number; // Weighted sum
}
```

#### 2.3 Explainability

**Explain why a pattern was learned and why an adaptation was applied**

```typescript
interface PatternExplanation {
  pattern_id: string;
  reason: string; // "High success rate (95%) across 20 executions with config X"
  evidence: {
    source_span_ids: string[];
    statistical_test: 't-test' | 'chi-square';
    p_value: number;
    confidence_interval: [number, number];
  };
}
```

---

### Phase 3: Collaboration (Week 5-6)

#### 3.1 Cross-Agent Knowledge Transfer

**Agents learn from each other's experiences**

```typescript
// Agent A learns a pattern
const pattern = await learnerA.learnPattern(spansA);

// Transfer to Agent B (if applicable)
if (isApplicable(pattern, agentB)) {
  await learnerB.importPattern(pattern);
}
```

#### 3.2 A/B Testing Framework

**Test different adaptations and pick the winner**

```typescript
const experiment = await abTesting.create({
  name: 'prompt_optimization',
  variants: [
    { name: 'control', config: baseConfig },
    { name: 'variant_a', config: optimizedConfigA },
    { name: 'variant_b', config: optimizedConfigB }
  ],
  traffic_split: [0.5, 0.25, 0.25], // 50% control, 25% each variant
  success_metric: 'quality_score',
  duration_days: 7
});

// Automatic assignment and tracking
const config = await abTesting.assignVariant(experiment.id, agentId);

// After 7 days
const results = await abTesting.analyze(experiment.id);
// Pick winner and roll out to 100%
```

#### 3.3 Federated Learning

**Learn from distributed agents without centralizing raw data**

---

### Phase 4: Meta-Learning (Month 3+)

#### 4.1 Online Learning

**Continuous learning from production traffic**

#### 4.2 Meta-Learning (Learning to Learn)

**Learn how to learn better (hyperparameter optimization for learning itself)**

---

## 🎯 Quick Wins (Can be done in 1-2 days each)

### Quick Win 1: Basic SQLite Storage (1 day)

```bash
# Implement EvolutionStore interface with SQLite
src/evolution/storage/SQLiteStore.ts

# Run tests
npm run test:evolution:storage
```

### Quick Win 2: Proxy-Based Auto-Tracking (1 day)

```bash
# Implement withEvolutionTracking()
src/evolution/instrumentation/withEvolutionTracking.ts

# Test with existing agents
const trackedAgent = withEvolutionTracking(new RAGAgent());
```

### Quick Win 3: Static HTML Report (4 hours)

```bash
# Generate beautiful HTML report
npm run evolution:report -- --task-id task-123 --output report.html

# Open in browser
open report.html
```

---

## 📊 Success Metrics (Updated)

### Phase 1 Success Criteria:

- [ ] **Storage**: 1000+ spans stored and queried < 100ms
- [ ] **Auto-tracking**: All 4 teams tracked with ZERO code changes
- [ ] **Links**: Rewards correctly linked to operations
- [ ] **Tags**: Query by tags returns correct results
- [ ] **API**: HTTP API returns correct data
- [ ] **Dashboard**: Can view task timeline and span traces
- [ ] **Tests**: 100% test coverage for storage layer

### Phase 2 Success Criteria:

- [ ] **Contextual Learning**: Patterns specific to agent/task types
- [ ] **Multi-Objective**: Track and optimize multiple metrics
- [ ] **Explainability**: Generate clear explanations for all patterns

### Phase 3 Success Criteria:

- [ ] **Knowledge Transfer**: Pattern shared across 2+ agents
- [ ] **A/B Testing**: Run experiment and pick winning variant
- [ ] **Federated Learning**: Learn from distributed data

---

## 🔍 Key Differences from V1

| Aspect | V1 (Original) | V2 (Agent Lightning-Inspired) |
|--------|--------------|-------------------------------|
| **Data Model** | Simple metrics | OpenTelemetry spans |
| **Hierarchy** | Flat | Task → Execution → Spans |
| **Tracking** | Manual | Automatic (Proxy/Decorator) |
| **Links** | None | Operation ←→ Reward |
| **Tags** | None | Multi-dimensional classification |
| **API** | None | HTTP REST API |
| **Dashboard** | Complex | Simple + Scalable |
| **Standards** | Custom | Industry standard (OpenTelemetry) |

---

## 📚 Implementation Priority

### Must-Have (Phase 1):
1. ✅ OpenTelemetry-based storage
2. ✅ Auto-tracking (Proxy pattern)
3. ✅ Link & Tag management
4. ✅ HTTP API
5. ✅ Basic dashboard (or static HTML reports)

### Should-Have (Phase 2):
6. Context-aware learning
7. Multi-objective optimization
8. Explainability

### Nice-to-Have (Phase 3+):
9. Cross-agent knowledge transfer
10. A/B testing
11. Federated learning
12. Meta-learning

---

## 🚀 Next Steps

**Immediate Action** (Day 1):

1. **Create Storage Interface** (2 hours)
   ```bash
   src/evolution/storage/EvolutionStore.ts
   src/evolution/storage/types.ts
   ```

2. **Implement SQLite Store** (4 hours)
   ```bash
   src/evolution/storage/SQLiteStore.ts
   src/evolution/storage/schema.ts
   ```

3. **Write Tests** (2 hours)
   ```bash
   tests/evolution/storage/SQLiteStore.test.ts
   ```

**Ready to start?**

I can begin with:
- **A**: Storage layer (OpenTelemetry-based)
- **B**: Auto-tracking (Proxy pattern)
- **C**: Review this roadmap first (discuss any changes)

---

**Document Version**: V2.0 (Agent Lightning-Inspired)
**Created**: 2025-12-27
**Status**: Ready for implementation
**Estimated Time**: Phase 1 = 10-12 days (vs 14 days in V1)
