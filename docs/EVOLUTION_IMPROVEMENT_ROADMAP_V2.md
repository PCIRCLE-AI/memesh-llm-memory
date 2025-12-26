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

#### 1.6 Privacy-First Telemetry (2-3 days)

**Inspired by privacy-first analytics - Collect usage insights without compromising user privacy**

**Core Principles**:
1. **Opt-In by Default**: Telemetry disabled unless user explicitly enables
2. **Local-First**: All events stored locally before any sending
3. **Transparency**: Users can preview exactly what will be sent
4. **Sanitization**: Automatic removal of PII and sensitive data
5. **Easy Opt-Out**: One command to disable completely

**What We Collect** (6 categories):

```typescript
// 1. Agent Usage (most valuable)
interface AgentUsageEvent {
  event: 'agent_execution';
  agent_type: string;           // "code-reviewer", "debugger", etc.
  success: boolean;
  duration_ms: number;
  cost?: number;
  task_type?: string;           // "bug_fix", "feature_dev", etc.
  anonymous_id: string;         // UUID, NO user identification
  timestamp: string;
  // NO: code content, file paths, error messages
}

// 2. Skill Usage (NEW - for skill improvement)
interface SkillUsageEvent {
  event: 'skill_execution';
  skill_name: string;
  skill_version?: string;
  success: boolean;
  duration_ms: number;
  user_satisfaction?: number;  // 1-5 stars (if user provides feedback)
  used_with_agent?: string;    // Which agent used this skill
  anonymous_id: string;
  timestamp: string;
}

// 3. Feature Usage
interface FeatureUsageEvent {
  event: 'feature_used';
  feature: 'evolution_system' | 'multi_agent' | 'context_manager' | etc;
  action: string;              // "enabled", "disabled", "configured"
  anonymous_id: string;
  timestamp: string;
}

// 4. Error Events (sanitized)
interface ErrorEvent {
  event: 'error';
  error_type: string;          // "TypeError", "NetworkError", etc.
  component: string;           // "evolution/storage", "agents/code-reviewer"
  stack_trace_hash: string;    // Hash of stack trace (NO actual code)
  anonymous_id: string;
  timestamp: string;
  // NO: actual error message, file contents, secrets
}

// 5. Performance Events
interface PerformanceEvent {
  event: 'performance';
  operation: string;           // "pattern_learning", "span_query"
  duration_ms: number;
  data_size?: number;          // Optional: size of data processed
  anonymous_id: string;
  timestamp: string;
}

// 6. Workflow Events
interface WorkflowEvent {
  event: 'workflow';
  workflow_type: string;       // "code_review", "refactoring", "debugging"
  steps_completed: number;
  total_steps: number;
  success: boolean;
  anonymous_id: string;
  timestamp: string;
}
```

**What We DON'T Collect** (Privacy Guarantees):

```typescript
const BANNED_FIELDS = [
  // User identification
  'email', 'username', 'user_id', 'ip_address', 'mac_address',

  // Sensitive credentials
  'api_key', 'password', 'token', 'secret', 'auth_token',

  // Code and file contents
  'file_content', 'code_content', 'file_path', 'directory_path',

  // Specific project data
  'git_commit', 'git_branch', 'repository_url',

  // Detailed error info
  'error_message',  // Only error_type, not message
  'stack_trace',     // Only hash, not actual trace

  // Any custom user data
  'input_data', 'output_data', 'prompt_content', 'llm_response'
];
```

**Implementation**:

```typescript
// src/telemetry/TelemetryCollector.ts

export class TelemetryCollector {
  private localStorePath: string;
  private enabled: boolean;
  private anonymousId: string;

  constructor(options?: {
    localStorePath?: string;
    enabled?: boolean;
  }) {
    this.localStorePath = options?.localStorePath ||
      path.join(os.homedir(), '.smart-agents', 'telemetry');

    // Default: DISABLED
    this.enabled = options?.enabled || false;

    // Generate anonymous ID (persisted locally)
    this.anonymousId = this.loadOrCreateAnonymousId();
  }

  /**
   * Record an event (always stored locally first)
   */
  async recordEvent(event: TelemetryEvent): Promise<void> {
    if (!this.enabled) return;

    // Sanitize event
    const sanitized = this.sanitize(event);

    // Add common fields
    const fullEvent = {
      ...sanitized,
      anonymous_id: this.anonymousId,
      timestamp: new Date().toISOString(),
      sdk_version: getVersion(),
    };

    // Store locally
    await this.storeLocally(fullEvent);
  }

  /**
   * Sanitize event (remove PII, secrets, code)
   */
  private sanitize(event: any): any {
    const sanitized = { ...event };

    // Remove banned fields
    for (const field of BANNED_FIELDS) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Hash any remaining sensitive-looking strings
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && this.looksLikeSensitive(value)) {
        sanitized[key] = this.hashValue(value);
      }
    }

    return sanitized;
  }

  /**
   * Store event locally
   */
  private async storeLocally(event: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filePath = path.join(this.localStorePath, `${date}.jsonl`);

    await fs.ensureDir(this.localStorePath);
    await fs.appendFile(filePath, JSON.stringify(event) + '\n');
  }

  /**
   * Send local events to server (only if user enables)
   */
  async sendEvents(): Promise<void> {
    if (!this.enabled) {
      throw new Error('Telemetry is disabled');
    }

    // Read all local events
    const events = await this.readLocalEvents();

    // Preview before sending
    console.log(`\n📊 Preview of data to be sent (${events.length} events):`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
    console.log(`\n... and ${events.length - 5} more events\n`);

    // Ask for confirmation
    const confirmed = await this.confirmSend();
    if (!confirmed) {
      console.log('❌ Telemetry send cancelled by user');
      return;
    }

    // Send to server
    try {
      await this.sendToServer(events);
      console.log('✅ Telemetry sent successfully');

      // Archive sent events
      await this.archiveSentEvents();
    } catch (error) {
      console.error('❌ Failed to send telemetry:', error.message);
    }
  }

  /**
   * Get telemetry status
   */
  getStatus(): {
    enabled: boolean;
    anonymous_id: string;
    local_events_count: number;
    last_sent?: Date;
  } {
    // Implementation
  }

  /**
   * Enable telemetry (user opt-in)
   */
  async enable(): Promise<void> {
    this.enabled = true;
    await this.saveConfig({ enabled: true });
    console.log('✅ Telemetry enabled');
    console.log('📊 Usage data will be collected to improve smart-agents');
    console.log('🔒 All data is stored locally first at:', this.localStorePath);
    console.log('👁️  Preview before sending with: npm run telemetry:preview');
  }

  /**
   * Disable telemetry (user opt-out)
   */
  async disable(): Promise<void> {
    this.enabled = false;
    await this.saveConfig({ enabled: false });
    console.log('❌ Telemetry disabled');
  }

  /**
   * Clear all local telemetry data
   */
  async clearLocalData(): Promise<void> {
    await fs.remove(this.localStorePath);
    console.log('🗑️  All local telemetry data cleared');
  }
}
```

**CLI Commands**:

```typescript
// package.json scripts
{
  "scripts": {
    "telemetry:status": "tsx src/cli/telemetry-status.ts",
    "telemetry:enable": "tsx src/cli/telemetry-enable.ts",
    "telemetry:disable": "tsx src/cli/telemetry-disable.ts",
    "telemetry:preview": "tsx src/cli/telemetry-preview.ts",
    "telemetry:send": "tsx src/cli/telemetry-send.ts",
    "telemetry:clear": "tsx src/cli/telemetry-clear.ts"
  }
}
```

**Usage Examples**:

```bash
# Check status
$ npm run telemetry:status
📊 Telemetry Status:
   Enabled: false
   Anonymous ID: 550e8400-e29b-41d4-a716-446655440000
   Local Events: 142
   Last Sent: Never

# Enable (opt-in)
$ npm run telemetry:enable
✅ Telemetry enabled
📊 Usage data will be collected to improve smart-agents
🔒 All data is stored locally first
👁️  Preview before sending: npm run telemetry:preview

# Preview what will be sent
$ npm run telemetry:preview
📊 Preview of telemetry data (142 events):

AgentUsageEvent (85 events):
  - code-reviewer: 32 executions (91% success)
  - debugger: 28 executions (85% success)
  - refactoring-specialist: 25 executions (96% success)

SkillUsageEvent (42 events):
  - systematic-debugging: 18 uses (94% success, 4.2★ avg)
  - frontend-design: 14 uses (100% success, 4.8★ avg)
  - test-driven-development: 10 uses (90% success, 4.5★ avg)

PerformanceEvent (15 events):
  - pattern_learning: avg 234ms
  - span_query: avg 12ms

# Send to server (with confirmation)
$ npm run telemetry:send
📊 Preview of data to be sent (142 events):
[... preview shown ...]

❓ Send this data to improve smart-agents? (y/N): y
✅ Telemetry sent successfully

# Disable (opt-out)
$ npm run telemetry:disable
❌ Telemetry disabled

# Clear all local data
$ npm run telemetry:clear
🗑️  All local telemetry data cleared
```

**Integration with Evolution System**:

```typescript
// src/evolution/instrumentation/withEvolutionTracking.ts

export function withEvolutionTracking<T extends BaseAgent>(
  agent: T,
  options?: TrackingOptions
): T {
  const tracker = options?.tracker || getGlobalTracker();
  const telemetry = getTelemetryCollector(); // Get global collector

  return new Proxy(agent, {
    async apply(target, thisArg, args) {
      const span = tracker.startSpan({ ... });

      try {
        const result = await target.apply(thisArg, args);

        // Record telemetry (if enabled)
        await telemetry.recordEvent({
          event: 'agent_execution',
          agent_type: agent.constructor.name,
          success: true,
          duration_ms: span.duration_ms,
          cost: result.cost,
          task_type: extractTaskType(args[0]),
        });

        return result;

      } catch (error) {
        // Record error telemetry (sanitized)
        await telemetry.recordEvent({
          event: 'error',
          error_type: error.constructor.name,
          component: `agents/${agent.constructor.name}`,
          stack_trace_hash: hashStackTrace(error.stack),
        });

        throw error;
      }
    }
  });
}
```

**Privacy Compliance**:

- ✅ **GDPR Compliant**: No personal data collection
- ✅ **CCPA Compliant**: Explicit opt-in, easy opt-out
- ✅ **Open Source**: Telemetry code is open source and auditable
- ✅ **Data Retention**: 90 days for raw events, aggregated stats indefinitely
- ✅ **User Control**: Users control what is sent and when

**Analytics Dashboard** (Internal - for smart-agents developers):

```typescript
// What we learn from telemetry:

1. **Most Used Agents**:
   - code-reviewer: 42% of executions
   - debugger: 28%
   - refactoring-specialist: 18%
   → Focus development on these

2. **Success Rates**:
   - Overall: 89%
   - By agent: code-reviewer (91%), debugger (85%), ...
   → Improve debugger reliability

3. **Skills Analytics**:
   - Most used: systematic-debugging (18% of tasks)
   - Highest satisfaction: frontend-design (4.8★)
   - Needs improvement: test-driven-development (3.2★)
   → Improve TDD skill

4. **Performance Bottlenecks**:
   - pattern_learning: avg 234ms (acceptable)
   - span_query with tags: avg 89ms (optimize indexes)

5. **Feature Adoption**:
   - evolution_system enabled: 45% of users
   - multi_agent_coordination: 32%
   - skills: 67%
   → Promote evolution_system more

6. **Common Errors**:
   - NetworkError in evolution/api: 5% of requests
   - TypeError in agents/code-reviewer: 2%
   → Fix these bugs

7. **Workflow Patterns**:
   - Most common: code_review → refactoring → testing
   - Average workflow length: 4.2 steps
   → Optimize multi-step workflows
```

**Files to Create**:
- `src/telemetry/TelemetryCollector.ts`
- `src/telemetry/sanitization.ts`
- `src/telemetry/types.ts`
- `src/cli/telemetry-*.ts` (CLI commands)
- `docs/TELEMETRY.md` (user-facing documentation)
- `tests/telemetry/` (comprehensive tests)

**Timeline**:
- Day 1: Core TelemetryCollector implementation
- Day 2: Sanitization and privacy guarantees
- Day 3: CLI commands and integration tests

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
- [ ] **Telemetry**: Privacy-first telemetry collection with opt-in mechanism
- [ ] **Telemetry Sanitization**: All PII and sensitive data properly removed
- [ ] **Telemetry CLI**: All CLI commands (status, enable, disable, preview, send, clear) working
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
6. ✅ Privacy-first telemetry

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
