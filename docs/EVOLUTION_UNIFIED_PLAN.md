# Self-Evolving Agent System - Unified Implementation Plan

**Version**: 3.0 (Evolution + Privacy-First Telemetry)
**Date**: 2025-12-27
**Status**: Planning

---

## 🎯 Vision: Self-Improving AI with User Privacy

This plan unifies two complementary goals:

1. **Evolution System**: Agents that learn from experience and improve over time
2. **Privacy-First Telemetry**: Learn what users actually do while protecting their privacy

**Key Principle**: The evolution system tracks agent behavior for improvement, while telemetry tracks usage patterns to guide product development—both with strong privacy guarantees.

---

## 📚 Design Philosophy (Inspired by Agent Lightning + Privacy-First Analytics)

### 1. **OpenTelemetry-Based Tracing** ⭐⭐⭐⭐⭐

```typescript
Task (user request)        # What the user wants to achieve
  └── Execution (attempt)  # How we try to achieve it (can retry)
       └── Spans           # Fine-grained tracking of operations
```

**Benefits**:
- ✅ Industry standard (compatible with Jaeger, Zipkin)
- ✅ Supports retry logic naturally
- ✅ Rich attribution and linking

### 2. **Privacy-First by Design** ⭐⭐⭐⭐⭐

```typescript
// Core Privacy Principles:
1. Opt-in by default (telemetry disabled unless user enables)
2. Local-first storage (all data stored locally before any sending)
3. Transparent sanitization (users can preview what will be sent)
4. Easy opt-out (one command to disable)
5. No PII collection (zero user identification)
```

**Benefits**:
- ✅ GDPR/CCPA compliant
- ✅ Builds user trust
- ✅ Auditable and transparent

### 3. **Zero-Code Instrumentation** ⭐⭐⭐⭐⭐

```typescript
// Proxy pattern - automatic tracking
const trackedAgent = withEvolutionTracking(new CodeReviewerAgent());
await trackedAgent.execute(task);
// ✓ Evolution data captured
// ✓ Telemetry recorded (if enabled)
// ✓ ZERO code changes in agent
```

**Benefits**:
- ✅ No manual instrumentation needed
- ✅ Consistent tracking across all agents
- ✅ Easy to adopt

### 4. **Link-Based Reward System** ⭐⭐⭐⭐⭐

```typescript
// Execute operation
const span = tracker.startSpan({ name: 'code_review' });
// ... work ...
span.end();

// Later: link reward to operation (delayed feedback)
await linkReward(span.span_id, {
  value: 0.9,
  feedback: 'Excellent analysis',
  dimensions: { accuracy: 0.95, speed: 0.90 }
});
```

**Benefits**:
- ✅ Supports delayed feedback
- ✅ Multi-dimensional rewards
- ✅ Clear causality

---

## 🏗️ Unified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Evolution System with Privacy-First Telemetry     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Instrumentation Layer (Zero-code)                  │  │
│  │  - withEvolutionTracking() (Proxy pattern)            │  │
│  │  - @TrackEvolution() (Decorator)                      │  │
│  │  - Automatic span creation                            │  │
│  │  - Telemetry event emission (if enabled)              │  │
│  └─────────────────┬─────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼─────────────────────────────────────┐  │
│  │ 2. Tracking Layer (OpenTelemetry-based)               │  │
│  │  - SpanTracker (trace_id, span_id, attributes)       │  │
│  │  - TaskManager (task → executions → spans)           │  │
│  │  - LinkManager (operation ←→ reward)                 │  │
│  └─────────────────┬─────────────────────────────────────┘  │
│                    │                                         │
│                    ├──────────────────┐                      │
│                    │                  │                      │
│  ┌─────────────────▼──────┐  ┌────────▼────────────────┐    │
│  │ 3a. Evolution Storage  │  │ 3b. Telemetry Collector │    │
│  │  - Tasks, Executions   │  │  - Local storage first  │    │
│  │  - Spans (detailed)    │  │  - Privacy sanitization │    │
│  │  - Patterns, Rewards   │  │  - Opt-in/opt-out       │    │
│  │  - Query by tags/time  │  │  - User preview/control │    │
│  └─────────────────┬──────┘  └────────┬────────────────┘    │
│                    │                  │                      │
│  ┌─────────────────▼──────────────────▼─────────────────┐   │
│  │ 4. Learning Layer (Pattern extraction)               │   │
│  │  - PatternLearner (from evolution data)              │   │
│  │  - ConfidenceScorer (statistical validation)         │   │
│  │  - InsightsEngine (from telemetry data)              │   │
│  └─────────────────┬──────────────────────────────────────┘   │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────────────┐  │
│  │ 5. Adaptation Layer (Apply learnings)                 │  │
│  │  - AdaptationEngine (config, prompt, strategy)        │  │
│  │  - FeedbackLoop (track adaptation outcomes)           │  │
│  │  - A/B Testing (compare adaptations)                  │  │
│  └─────────────────┬──────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────────────┐  │
│  │ 6. API Layer (HTTP REST)                               │  │
│  │  Evolution:      Telemetry:                            │  │
│  │  - POST /tasks   - GET  /telemetry/status             │  │
│  │  - POST /spans   - POST /telemetry/enable             │  │
│  │  - GET /patterns - GET  /telemetry/preview            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP API
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 Dual-Purpose Dashboard                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Evolution View (internal)    Insights View (product) │  │
│  │  - Task timeline              - Agent usage stats    │  │
│  │  - Span traces                - Skill popularity     │  │
│  │  - Patterns learned           - Error patterns       │  │
│  │  - Adaptations active         - Workflow trends      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Unified Roadmap

### Phase 1: Foundation with Privacy-First Telemetry (Week 1-2)

**Goal**: Build the core tracking infrastructure that serves both evolution and telemetry needs.

---

#### 1.1 OpenTelemetry-Based Storage (3 days)

**Storage for both evolution data and telemetry events**

```typescript
// src/evolution/storage/EvolutionStore.ts

interface EvolutionStore {
  // Task management (user requests)
  createTask(input: any): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;

  // Execution management (retry support)
  createExecution(taskId: string): Promise<Execution>;
  updateExecution(executionId: string, updates: Partial<Execution>): Promise<void>;

  // Span tracking (OpenTelemetry format)
  recordSpan(span: Span): Promise<void>;
  recordSpanBatch(spans: Span[]): Promise<void>;
  querySpans(query: SpanQuery): Promise<Span[]>;

  // Link management (operation ←→ reward)
  createLink(fromSpanId: string, toSpanId: string, attributes?: any): Promise<void>;
  queryLinkedSpans(spanId: string): Promise<Span[]>;

  // Tag-based queries (classification)
  queryByTags(tags: string[]): Promise<Span[]>;

  // Patterns (evolution)
  storePattern(pattern: Pattern): Promise<void>;
  queryPatterns(query: PatternQuery): Promise<Pattern[]>;

  // Rewards (evolution)
  recordReward(reward: Reward): Promise<void>;

  // Stats (both evolution and telemetry)
  getStats(query: StatsQuery): Promise<Stats>;
}
```

**Telemetry-specific storage**:

```typescript
// src/telemetry/TelemetryStore.ts

interface TelemetryStore {
  // Local storage (privacy-first)
  storeEventLocally(event: TelemetryEvent): Promise<void>;
  getLocalEvents(filters?: EventFilters): Promise<TelemetryEvent[]>;
  archiveSentEvents(): Promise<void>;
  clearLocalData(): Promise<void>;

  // Config
  getConfig(): Promise<TelemetryConfig>;
  updateConfig(updates: Partial<TelemetryConfig>): Promise<void>;
}

interface TelemetryConfig {
  enabled: boolean;           // Default: false (opt-in)
  anonymous_id: string;       // UUID, persisted locally
  send_automatically: boolean; // Default: false (manual send)
  send_interval_hours?: number;
}
```

**Database Schema** (SQLite for dev, PostgreSQL for prod):

```sql
-- Evolution tables
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  input JSON,
  status TEXT CHECK(status IN ('running', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  attempt_number INTEGER,
  status TEXT CHECK(status IN ('running', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  result JSON,
  error TEXT
);

CREATE TABLE spans (
  span_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  parent_span_id TEXT,
  task_id TEXT REFERENCES tasks(id),
  execution_id TEXT REFERENCES executions(id),
  name TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('internal', 'client', 'server', 'producer', 'consumer')),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_ms INTEGER,
  status_code TEXT CHECK(status_code IN ('OK', 'ERROR', 'UNSET')),
  status_message TEXT,
  attributes JSON,
  resource JSON,
  tags JSON,
  events JSON,
  links JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry tables (local only)
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSON NOT NULL,
  anonymous_id TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at DATETIME
);

CREATE TABLE telemetry_config (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL
);
```

**Files to Create**:
- `src/evolution/storage/EvolutionStore.ts` (interface)
- `src/evolution/storage/SQLiteStore.ts` (implementation with enhancements)
- `src/evolution/storage/schema.ts` (database schema)
- `src/evolution/storage/migrations/` (migration system)
- `src/evolution/storage/validation.ts` (input validation)
- `src/telemetry/TelemetryStore.ts` (interface)
- `src/telemetry/SQLiteTelemetryStore.ts` (local storage)
- `tests/evolution/storage/` (comprehensive tests)
- `tests/telemetry/` (telemetry tests)

**Success Criteria**:
- ✅ 1000+ spans stored and queried < 100ms
- ✅ Migration system working (v1 → v2 → v3)
- ✅ Input validation preventing data corruption
- ✅ Telemetry config persisted locally
- ✅ 100% test coverage for storage layer

---

#### 1.2 Unified Instrumentation (3 days)

**Single instrumentation layer for both evolution tracking and telemetry**

```typescript
// src/evolution/instrumentation/withEvolutionTracking.ts

export interface TrackingOptions {
  tracker?: SpanTracker;
  autoTags?: string[];
  sampleRate?: number;           // 0-1, for sampling
  telemetryEnabled?: boolean;    // Emit telemetry events
}

/**
 * Wrap any agent with automatic tracking
 * - Records evolution data (spans, attributes, links)
 * - Emits telemetry events (if enabled)
 */
export function withEvolutionTracking<T extends BaseAgent>(
  agent: T,
  options?: TrackingOptions
): T {
  const tracker = options?.tracker || getGlobalTracker();
  const telemetry = getTelemetryCollector();

  return new Proxy(agent, {
    async apply(target, thisArg, args) {
      // Create task if not exists
      const task = await tracker.getCurrentTask() ||
                    await tracker.createTask({ origin: agent.constructor.name });

      // Create execution (attempt)
      const execution = await tracker.createExecution(task.id);

      // Start span (evolution tracking)
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

      const startTime = Date.now();

      try {
        // Execute agent
        const result = await target.apply(thisArg, args);

        const duration = Date.now() - startTime;

        // Record success in evolution system
        span.setStatus({ code: 'OK' });
        span.setAttributes({
          'execution.success': true,
          'execution.quality_score': result.qualityScore,
          'execution.cost': result.cost,
        });

        // Emit telemetry (if enabled)
        if (telemetry.isEnabled() && options?.telemetryEnabled !== false) {
          await telemetry.recordEvent({
            event: 'agent_execution',
            agent_type: agent.constructor.name,
            success: true,
            duration_ms: duration,
            cost: result.cost,
            task_type: extractTaskType(args[0]),
            // NO: code, data, prompts, responses
          });
        }

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;

        // Record failure in evolution system
        span.setStatus({
          code: 'ERROR',
          message: error.message
        });
        span.setAttributes({
          'execution.success': false,
          'error.type': error.constructor.name,
        });

        // Emit error telemetry (sanitized)
        if (telemetry.isEnabled()) {
          await telemetry.recordEvent({
            event: 'error',
            error_type: error.constructor.name,
            error_category: categorizeError(error),
            component: `agents/${agent.constructor.name}`,
            stack_trace_hash: hashStackTrace(error.stack),
            // NO: actual error message, stack trace, file paths
          });
        }

        throw error;

      } finally {
        // End span
        await span.end();

        // Auto-learn from this execution (evolution)
        if (options?.autoLearn !== false) {
          await learner.learnFromSpan(span);
        }
      }
    }
  });
}
```

**Telemetry Collector** (privacy-first):

```typescript
// src/telemetry/TelemetryCollector.ts

export class TelemetryCollector {
  private store: TelemetryStore;
  private anonymousId: string;

  async recordEvent(event: TelemetryEvent): Promise<void> {
    if (!await this.isEnabled()) return;

    // Sanitize (remove PII, secrets, code)
    const sanitized = this.sanitize(event);

    // Add common fields
    const fullEvent = {
      ...sanitized,
      anonymous_id: this.anonymousId,
      timestamp: new Date().toISOString(),
      sdk_version: getVersion(),
      node_version: process.version,
      os_platform: process.platform,
    };

    // Store locally (NEVER send automatically)
    await this.store.storeEventLocally(fullEvent);
  }

  private sanitize(event: any): any {
    const sanitized = { ...event };

    // Remove banned fields
    const BANNED = [
      'email', 'username', 'user_id', 'ip_address',
      'api_key', 'password', 'token', 'secret',
      'file_content', 'code_content', 'file_path',
      'error_message', 'stack_trace',
      'prompt_content', 'llm_response',
    ];

    for (const field of BANNED) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Hash any remaining sensitive strings
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && this.looksLikeSensitive(value)) {
        sanitized[key] = sha256(value).substring(0, 16);
      }
    }

    return sanitized;
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.store.getConfig();
    return config.enabled;
  }

  async enable(): Promise<void> {
    await this.store.updateConfig({ enabled: true });
    console.log('✅ Telemetry enabled');
    console.log('🔒 All data stored locally first at:', this.getLocalPath());
    console.log('👁️  Preview before sending: npm run telemetry:preview');
  }

  async disable(): Promise<void> {
    await this.store.updateConfig({ enabled: false });
    console.log('❌ Telemetry disabled');
  }

  async preview(): Promise<void> {
    const events = await this.store.getLocalEvents({ sent: false });

    console.log(`\n📊 Telemetry Preview (${events.length} events):\n`);

    // Group by event type
    const grouped = groupBy(events, e => e.event_type);

    for (const [type, typeEvents] of Object.entries(grouped)) {
      console.log(`\n${type} (${typeEvents.length} events):`);
      console.log(JSON.stringify(typeEvents.slice(0, 3), null, 2));
      if (typeEvents.length > 3) {
        console.log(`... and ${typeEvents.length - 3} more`);
      }
    }

    console.log('\n✓ All events sanitized - no PII, no code, no secrets\n');
  }

  async send(): Promise<void> {
    if (!await this.isEnabled()) {
      throw new Error('Telemetry is disabled');
    }

    const events = await this.store.getLocalEvents({ sent: false });

    console.log(`\n📊 Ready to send ${events.length} events\n`);
    await this.preview();

    // Ask for confirmation
    const confirmed = await confirm('Send this data to improve smart-agents? (y/N)');
    if (!confirmed) {
      console.log('❌ Send cancelled by user');
      return;
    }

    // Send to server
    try {
      await this.sendToServer(events);
      await this.store.archiveSentEvents();
      console.log('✅ Telemetry sent successfully');
    } catch (error) {
      console.error('❌ Failed to send telemetry:', error.message);
    }
  }
}
```

**Files to Create**:
- `src/evolution/instrumentation/withEvolutionTracking.ts`
- `src/evolution/instrumentation/decorators.ts`
- `src/evolution/instrumentation/SpanTracker.ts`
- `src/evolution/instrumentation/TaskManager.ts`
- `src/telemetry/TelemetryCollector.ts`
- `src/telemetry/sanitization.ts`
- `src/telemetry/types.ts`
- `tests/evolution/instrumentation/` (tests)
- `tests/telemetry/sanitization.test.ts`

**Success Criteria**:
- ✅ All agents tracked with ZERO code changes
- ✅ Telemetry events sanitized (no PII)
- ✅ Preview shows sanitized events
- ✅ User can enable/disable telemetry

---

#### 1.3 Link & Tag Management (2 days)

**Support for delayed feedback and classification**

```typescript
// src/evolution/links/LinkManager.ts

/**
 * Link a reward to a previous operation
 * Used for both evolution (improve agent) and telemetry (skill satisfaction)
 */
export async function linkReward(
  operationSpanId: string,
  reward: {
    value: number; // 0-1
    feedback?: string;
    dimensions?: Record<string, number>;
  }
): Promise<void> {
  // Record reward span
  const rewardSpan = tracker.startSpan({
    name: 'evolution.reward',
    attributes: {
      'reward.value': reward.value,
      'reward.feedback': reward.feedback,
      ...(reward.dimensions || {})
    },
    links: [{
      span_id: operationSpanId,
      attributes: { 'link.type': 'reward_for_operation' }
    }]
  });

  rewardSpan.end();

  // Store reward for evolution system
  await store.recordReward({
    id: uuid(),
    operation_span_id: operationSpanId,
    value: reward.value,
    dimensions: reward.dimensions,
    timestamp: Date.now()
  });

  // Emit telemetry (if enabled and user provided feedback)
  if (telemetry.isEnabled() && reward.feedback) {
    await telemetry.recordEvent({
      event: 'skill_execution',
      skill_name: await getSkillName(operationSpanId),
      user_satisfaction: Math.round(reward.value * 5), // Convert to 1-5 stars
      // NO: actual feedback text
    });
  }
}

/**
 * Tag helper for classification
 */
export function withTags(spanId: string, tags: string[]): void {
  tracker.updateSpan(spanId, {
    tags: [...existingTags, ...tags]
  });
}
```

**Files to Create**:
- `src/evolution/links/LinkManager.ts`
- `src/evolution/links/TagManager.ts`
- `tests/evolution/links/` (tests)

**Success Criteria**:
- ✅ Rewards correctly linked to operations
- ✅ Query by tags returns correct results
- ✅ Telemetry records user satisfaction (sanitized)

---

#### 1.4 Unified HTTP API (2 days)

**Single API for both evolution and telemetry**

```typescript
// src/api/server.ts

export function createAPI(evolutionStore: EvolutionStore, telemetryStore: TelemetryStore) {
  const app = express();
  app.use(express.json());

  // ============ Evolution API ============

  // Tasks
  app.post('/api/v1/evolution/tasks', async (req, res) => {
    const task = await evolutionStore.createTask(req.body.input);
    res.json(task);
  });

  app.get('/api/v1/evolution/tasks/:id', async (req, res) => {
    const task = await evolutionStore.getTask(req.params.id);
    res.json(task);
  });

  // Spans
  app.post('/api/v1/evolution/spans', async (req, res) => {
    await evolutionStore.recordSpan(req.body);
    res.status(201).send();
  });

  app.get('/api/v1/evolution/spans', async (req, res) => {
    const spans = await evolutionStore.querySpans({
      task_id: req.query.task_id as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    });
    res.json(spans);
  });

  // Patterns
  app.get('/api/v1/evolution/patterns', async (req, res) => {
    const patterns = await evolutionStore.queryPatterns({
      type: req.query.type as any,
      min_confidence: parseFloat(req.query.min_confidence as string) || 0.7,
    });
    res.json(patterns);
  });

  // Stats
  app.get('/api/v1/evolution/stats', async (req, res) => {
    const stats = await evolutionStore.getStats({
      agent_id: req.query.agent_id as string,
      start: new Date(req.query.start as string),
      end: new Date(req.query.end as string)
    });
    res.json(stats);
  });

  // ============ Telemetry API ============

  // Status
  app.get('/api/v1/telemetry/status', async (req, res) => {
    const config = await telemetryStore.getConfig();
    const events = await telemetryStore.getLocalEvents({ sent: false });

    res.json({
      enabled: config.enabled,
      anonymous_id: config.anonymous_id,
      local_events_count: events.length,
      last_sent: await telemetryStore.getLastSentTime()
    });
  });

  // Enable/Disable
  app.post('/api/v1/telemetry/enable', async (req, res) => {
    await telemetryStore.updateConfig({ enabled: true });
    res.json({ success: true });
  });

  app.post('/api/v1/telemetry/disable', async (req, res) => {
    await telemetryStore.updateConfig({ enabled: false });
    res.json({ success: true });
  });

  // Preview
  app.get('/api/v1/telemetry/preview', async (req, res) => {
    const events = await telemetryStore.getLocalEvents({ sent: false });
    res.json({
      total_events: events.length,
      sample_events: events.slice(0, 10),
      event_types: groupBy(events, e => e.event_type)
    });
  });

  // Send (manual)
  app.post('/api/v1/telemetry/send', async (req, res) => {
    // Implementation will batch and send to telemetry server
    res.json({ success: true, events_sent: 0 });
  });

  return app;
}
```

**Files to Create**:
- `src/api/server.ts`
- `src/api/routes/evolution.ts`
- `src/api/routes/telemetry.ts`
- `src/api/middleware/auth.ts`
- `tests/api/` (API tests)

**Success Criteria**:
- ✅ All evolution endpoints working
- ✅ All telemetry endpoints working
- ✅ API returns correct data
- ✅ Proper error handling

---

#### 1.5 Dual-Purpose Dashboard (3 days)

**Two views from one data source**

```typescript
// src/dashboard/

// Tech stack:
// - Vite + React + TypeScript
// - Tailwind CSS + shadcn/ui
// - Recharts (charts)
// - React Query (data fetching)

// Components:

// ========== Evolution View (internal development) ==========
1. TaskTimeline.tsx        // Gantt-style timeline of tasks
2. SpanTraceViewer.tsx     // Flamegraph of span traces
3. PatternsTable.tsx       // Discovered patterns with confidence
4. AdaptationsMonitor.tsx  // Active/deactivated adaptations
5. MetricsCharts.tsx       // Success rate, latency, cost over time

// ========== Insights View (product analytics) ==========
6. AgentUsageChart.tsx     // Most used agents (bar chart)
7. SkillPopularity.tsx     // Skill usage and satisfaction
8. ErrorPatternsTable.tsx  // Common errors (grouped by type)
9. WorkflowTrends.tsx      // Common workflow patterns
10. FeatureAdoption.tsx    // Feature usage stats
```

**Quick Win: Static HTML Report** (can generate without running dashboard):

```typescript
// src/reports/generateReport.ts

export async function generateEvolutionReport(
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
      <style>/* Tailwind CSS */</style>
    </head>
    <body>
      <h1>Evolution Report</h1>
      <h2>Task ${task.id}</h2>

      <h3>Timeline</h3>
      <div id="timeline"></div>

      <h3>Patterns Learned</h3>
      <table>
        ${patterns.map(p => `
          <tr>
            <td>${p.type}</td>
            <td>${p.confidence.toFixed(2)}</td>
            <td>${p.description}</td>
          </tr>
        `).join('')}
      </table>

      <script>
        ${generateTimelineChart(spans)}
      </script>
    </body>
    </html>
  `;

  await fs.writeFile(outputPath, html);
  console.log(`✅ Report generated: ${outputPath}`);
}

export async function generateTelemetryReport(
  outputPath: string
): Promise<void> {
  const events = await telemetryStore.getLocalEvents();

  // Generate insights
  const agentUsage = groupAndCount(events, 'agent_type');
  const skillUsage = groupAndAvg(events, 'skill_name', 'user_satisfaction');
  const errorPatterns = groupAndCount(events.filter(e => e.event === 'error'), 'error_type');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Telemetry Insights Report</title>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    </head>
    <body>
      <h1>Telemetry Insights Report</h1>

      <h2>Agent Usage</h2>
      <div id="agent-usage"></div>

      <h2>Skill Popularity</h2>
      <div id="skill-popularity"></div>

      <h2>Error Patterns</h2>
      <div id="error-patterns"></div>

      <script>
        ${generateCharts(agentUsage, skillUsage, errorPatterns)}
      </script>
    </body>
    </html>
  `;

  await fs.writeFile(outputPath, html);
  console.log(`✅ Insights report generated: ${outputPath}`);
}
```

**CLI Commands**:

```bash
# Evolution reports
npm run evolution:report -- --task-id task-123 --output evolution-report.html

# Telemetry insights
npm run telemetry:report -- --output insights-report.html

# Combined report
npm run report:all -- --task-id task-123 --output full-report.html
```

**Files to Create**:
- `src/dashboard/` (React components)
- `src/reports/generateReport.ts`
- `tests/reports/` (report generation tests)

**Success Criteria**:
- ✅ Can view task timeline and span traces
- ✅ Can view telemetry insights (agent usage, skills, errors)
- ✅ Static HTML reports generated correctly
- ✅ Dashboard shows real-time data

---

#### 1.6 CLI Integration (1 day)

**Unified CLI for both evolution and telemetry**

```bash
# Evolution commands
npm run evolution:status              # Show evolution system status
npm run evolution:report <task-id>    # Generate evolution report

# Telemetry commands
npm run telemetry:status              # Show telemetry status
npm run telemetry:enable              # Enable telemetry (opt-in)
npm run telemetry:disable             # Disable telemetry (opt-out)
npm run telemetry:preview             # Preview what will be sent
npm run telemetry:send                # Send telemetry (with confirmation)
npm run telemetry:clear               # Clear all local data
npm run telemetry:report              # Generate insights report

# Combined commands
npm run report:all                    # Generate both reports
```

**Files to Create**:
- `src/cli/evolution-*.ts`
- `src/cli/telemetry-*.ts`
- `package.json` (scripts)

---

### Phase 1 Summary

**Timeline**: 10-12 days

**Deliverables**:
1. ✅ OpenTelemetry-based storage (evolution + telemetry)
2. ✅ Unified instrumentation (zero-code tracking)
3. ✅ Link & tag management
4. ✅ HTTP API (evolution + telemetry endpoints)
5. ✅ Dual-purpose dashboard (evolution view + insights view)
6. ✅ CLI tools (evolution + telemetry commands)

**Success Criteria**:
- ✅ All agents tracked automatically
- ✅ Evolution data (spans, patterns, rewards) stored correctly
- ✅ Telemetry opt-in/opt-out working
- ✅ Privacy sanitization working (no PII)
- ✅ User can preview before sending
- ✅ Reports generated correctly
- ✅ 100% test coverage for core functionality

---

## Phase 2: Advanced Learning (Week 3-4)

### 2.1 Context-Aware Pattern Learning

Learn patterns specific to agent type, task type, and config.

### 2.2 Multi-Objective Optimization

Track and optimize multiple metrics (accuracy, speed, cost, satisfaction).

### 2.3 Explainability

Generate clear explanations for why patterns were learned.

---

## Phase 3: Collaboration (Week 5-6)

### 3.1 Cross-Agent Knowledge Transfer

Agents learn from each other's experiences.

### 3.2 A/B Testing Framework

Test different adaptations and pick winners.

---

## 📊 What We Learn (Dual Benefits)

### From Evolution System (Internal):
- ✅ Which patterns work best for each agent
- ✅ Which configurations lead to higher success rates
- ✅ Which prompts generate better results
- ✅ How agents improve over time

### From Telemetry (Product):
- ✅ Which agents/skills are most used
- ✅ Which features should we build next
- ✅ Where users get stuck
- ✅ What causes errors
- ✅ Common workflow patterns

---

## 🔒 Privacy Guarantees

### What We Collect:
- ✅ Agent types, skill names (e.g., "code-reviewer", "systematic-debugging")
- ✅ Success/failure status (boolean)
- ✅ Duration and performance metrics (numbers)
- ✅ Error types (e.g., "TypeError", "NetworkError")
- ✅ User satisfaction scores (if provided, 1-5 stars)

### What We DON'T Collect:
- ❌ User code or data
- ❌ API keys or credentials
- ❌ Personal identifiable information (PII)
- ❌ Actual conversation content
- ❌ File contents or paths
- ❌ Error messages (only error types)
- ❌ Git commits or diffs

### User Controls:
- ✅ Opt-in by default (telemetry disabled unless user enables)
- ✅ Local-first storage (all data stored locally before any sending)
- ✅ Preview before sending (user can see exactly what will be sent)
- ✅ Manual send control (no automatic sending)
- ✅ Easy opt-out (one command to disable)
- ✅ Clear all data (one command to delete everything)

---

## 🚀 Quick Wins

### Quick Win 1: Basic SQLite Storage (1 day)
```bash
npm run evolution:storage:init
npm test:evolution:storage
```

### Quick Win 2: Auto-Tracking (1 day)
```bash
const trackedAgent = withEvolutionTracking(new CodeReviewerAgent());
await trackedAgent.execute(task);
# ✓ Tracked automatically!
```

### Quick Win 3: Static Reports (4 hours)
```bash
npm run report:all -- --task-id task-123 --output report.html
open report.html
```

### Quick Win 4: Telemetry Preview (2 hours)
```bash
npm run telemetry:enable
# ... use system ...
npm run telemetry:preview
# See sanitized events
```

---

## 📋 Implementation Checklist

### Phase 1 (Week 1-2):

**Storage** (3 days):
- [ ] Create EvolutionStore interface
- [ ] Implement SQLiteStore with migrations
- [ ] Implement TelemetryStore
- [ ] Add input validation
- [ ] Write comprehensive tests

**Instrumentation** (3 days):
- [ ] Create withEvolutionTracking()
- [ ] Create SpanTracker and TaskManager
- [ ] Create TelemetryCollector with sanitization
- [ ] Test zero-code tracking
- [ ] Test privacy sanitization

**Links & Tags** (2 days):
- [ ] Implement LinkManager
- [ ] Implement TagManager
- [ ] Test reward linking
- [ ] Test tag-based queries

**API** (2 days):
- [ ] Create evolution endpoints
- [ ] Create telemetry endpoints
- [ ] Add authentication/validation
- [ ] Write API tests

**Dashboard & Reports** (3 days):
- [ ] Create basic dashboard components
- [ ] Implement static report generation
- [ ] Test evolution view
- [ ] Test insights view

**CLI** (1 day):
- [ ] Implement evolution CLI commands
- [ ] Implement telemetry CLI commands
- [ ] Add help text and documentation

---

## 📚 Documentation

### User-Facing:
- `docs/EVOLUTION_SYSTEM.md` - How the evolution system works
- `docs/TELEMETRY.md` - What telemetry collects and why
- `docs/PRIVACY.md` - Privacy guarantees and controls
- `docs/CLI.md` - CLI commands reference

### Developer-Facing:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API.md` - API reference
- `docs/DEVELOPMENT.md` - Development guide

---

## 🎯 Success Metrics

### Phase 1:
- ✅ 1000+ spans stored and queried < 100ms
- ✅ All 4 agent teams tracked with ZERO code changes
- ✅ Rewards correctly linked to operations
- ✅ Tags and queries working correctly
- ✅ HTTP API functional
- ✅ Dashboard shows real-time data
- ✅ Telemetry opt-in/opt-out working
- ✅ Privacy sanitization working (no PII leaks)
- ✅ User can preview before sending
- ✅ Static reports generated correctly
- ✅ 100% test coverage for storage layer

### Phase 2:
- ✅ Context-aware patterns learned
- ✅ Multi-objective optimization working
- ✅ Explanations generated for all patterns

### Phase 3:
- ✅ Knowledge transfer between agents
- ✅ A/B testing framework functional

---

## 🔍 Key Differences from Previous Plans

| Aspect | V1 | V2 | V3 (This Plan) |
|--------|----|----|----------------|
| **Telemetry** | None | Separate phase | Integrated throughout |
| **Privacy** | N/A | Basic | Privacy-first by design |
| **Data Model** | Simple | OpenTelemetry | OpenTelemetry + Telemetry Events |
| **User Control** | N/A | Limited | Complete (opt-in, preview, manual send) |
| **Dashboard** | Complex | Simple | Dual-purpose (evolution + insights) |
| **Benefits** | Agent improvement | Agent improvement | Agent improvement + Product insights |

---

## 📝 Next Steps

**Day 1** (immediate):

1. **Create storage interfaces** (2 hours)
   ```bash
   src/evolution/storage/EvolutionStore.ts
   src/evolution/storage/types.ts
   src/telemetry/TelemetryStore.ts
   src/telemetry/types.ts
   ```

2. **Implement SQLite stores** (4 hours)
   ```bash
   src/evolution/storage/SQLiteStore.ts (with enhancements)
   src/telemetry/SQLiteTelemetryStore.ts
   ```

3. **Write tests** (2 hours)
   ```bash
   tests/evolution/storage/
   tests/telemetry/
   ```

---

**Ready to start?**

This unified plan gives us:
- ✅ Self-improving agents (evolution system)
- ✅ Product insights (telemetry)
- ✅ User privacy protected (opt-in, local-first, sanitization)
- ✅ Single codebase (no duplication)
- ✅ Clear benefits for both users and developers

---

**Document Version**: 3.0 (Unified Evolution + Privacy-First Telemetry)
**Created**: 2025-12-27
**Status**: Ready for implementation
**Estimated Time**: Phase 1 = 10-12 days
