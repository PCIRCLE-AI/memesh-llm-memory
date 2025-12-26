# Privacy-First Telemetry Design for Smart-Agents

**Version**: 1.0
**Date**: 2025-12-27
**Status**: Planning

---

## 🎯 Goals

### What We Want to Learn:

1. **Product Improvement**
   - Which agents/skills are most used?
   - Which features are actually helpful?
   - Where do users get stuck?
   - What causes errors?

2. **Roadmap Planning**
   - What should we build next?
   - Which features should we deprecate?
   - Where should we invest resources?

3. **User Understanding**
   - How are people using smart-agents?
   - What workflows are common?
   - What are the pain points?

### What We Will NOT Collect:

❌ **User code or data**
❌ **API keys or credentials**
❌ **Personal identifiable information (PII)**
❌ **Actual conversation content**
❌ **File contents or paths (beyond filenames)**
❌ **Git commit messages or diffs**

---

## 🔒 Privacy Principles

### 1. **Opt-In by Default**

```typescript
// User must explicitly enable telemetry
{
  "telemetry": {
    "enabled": false,  // Default: OFF
    "anonymous_id": "uuid-v4-generated-locally"
  }
}
```

**First-run prompt:**
```
┌─────────────────────────────────────────────────────┐
│ Help Improve Smart-Agents                           │
├─────────────────────────────────────────────────────┤
│ Would you like to share anonymous usage data to     │
│ help us improve smart-agents?                       │
│                                                     │
│ We collect:                                         │
│  ✓ Which agents/skills you use                     │
│  ✓ Error types (not error messages)                │
│  ✓ Performance metrics (duration, success rate)    │
│                                                     │
│ We DO NOT collect:                                 │
│  ✗ Your code or data                               │
│  ✗ API keys or credentials                         │
│  ✗ Personal information                            │
│  ✗ Conversation content                            │
│                                                     │
│ View full privacy policy: https://...              │
│                                                     │
│ [Enable Telemetry]  [No Thanks]  [Learn More]      │
└─────────────────────────────────────────────────────┘
```

### 2. **Transparency**

```bash
# User can see EXACTLY what will be sent
npm run telemetry:preview

# Output:
{
  "event": "agent_execution",
  "anonymous_id": "abc-def-123",
  "agent_type": "code-reviewer",
  "success": true,
  "duration_ms": 3500,
  "timestamp": "2025-12-27T10:00:00Z",
  "version": "2.0.0"
}
# ✓ No code, no PII, no secrets
```

### 3. **Local-First**

```typescript
// All telemetry stored locally first
~/.smart-agents/telemetry/events.jsonl

// Batched and sent periodically (if enabled)
// User can review before sending
npm run telemetry:review
npm run telemetry:send  // Manual control
```

### 4. **Easy Opt-Out**

```bash
# Disable anytime
npm run telemetry:disable

# Clear all local data
npm run telemetry:clear

# View current status
npm run telemetry:status
```

---

## 📊 What to Collect (Detailed Design)

### Category 1: Agent Usage (Most Valuable)

**Collect:**
```typescript
interface AgentUsageEvent {
  event: 'agent_execution';

  // What was used
  agent_type: string;           // "code-reviewer", "rag-agent"
  agent_version?: string;       // "1.0.0"

  // Outcome (no details)
  success: boolean;
  error_type?: string;          // "TimeoutError", "APIError" (NOT error message)

  // Performance
  duration_ms: number;
  cost?: number;                // If applicable

  // Context (high-level only)
  task_type?: string;           // "code_review", "document_search"

  // Environment
  node_version: string;
  os_platform: string;          // "darwin", "linux", "win32"
  smart_agents_version: string;

  // Privacy
  anonymous_id: string;         // UUID, NO user identification
  timestamp: string;            // ISO 8601
}
```

**Example:**
```json
{
  "event": "agent_execution",
  "agent_type": "code-reviewer",
  "agent_version": "2.0.0",
  "success": true,
  "duration_ms": 3500,
  "cost": 0.002,
  "task_type": "code_review",
  "node_version": "20.10.0",
  "os_platform": "darwin",
  "smart_agents_version": "2.0.0",
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-27T10:00:00Z"
}
```

**Insights:**
- ✓ "Code-reviewer is used 10x more than RAG agent"
- ✓ "90% success rate on darwin, 70% on linux (investigate)"
- ✓ "Average duration: 3.5s (too slow, optimize)"

---

### Category 2: Skill Usage (NEW - For Your Question #1)

**Collect:**
```typescript
interface SkillUsageEvent {
  event: 'skill_execution';

  // What skill
  skill_name: string;
  skill_version?: string;

  // Outcome
  success: boolean;
  error_type?: string;

  // Performance
  duration_ms: number;

  // User feedback (if provided)
  user_satisfaction?: number;  // 1-5 stars

  // Context
  used_with_agent?: string;    // Which agent used this skill
  task_type?: string;

  // Privacy
  anonymous_id: string;
  timestamp: string;
}
```

**Insights:**
- ✓ "Skill 'systematic-debugging' used 500 times, 95% success"
- ✓ "Users rate 'code-reviewer' skill 4.5/5"
- ✓ "Skill 'memory-cleanup' rarely used (deprecate?)"

---

### Category 3: Feature Usage

**Collect:**
```typescript
interface FeatureUsageEvent {
  event: 'feature_usage';

  // What feature
  feature_name: string;         // "evolution_system", "specialized_teams"

  // How used
  action: string;               // "enabled", "disabled", "configured"

  // Context
  anonymous_id: string;
  timestamp: string;
}
```

**Insights:**
- ✓ "Evolution system enabled by 30% of users"
- ✓ "Specialized teams used by 80% (invest more)"

---

### Category 4: Error Patterns

**Collect:**
```typescript
interface ErrorEvent {
  event: 'error';

  // Error type (NOT message)
  error_type: string;           // "TimeoutError", "APIError"
  error_category: string;       // "network", "config", "runtime"

  // Where it happened
  component: string;            // "PerformanceTracker", "RAGAgent"

  // Context
  agent_type?: string;
  skill_name?: string;

  // Stack trace (sanitized - no user paths)
  stack_trace_hash?: string;   // Hash of stack trace (for grouping)

  // Privacy
  anonymous_id: string;
  timestamp: string;
}
```

**Example:**
```json
{
  "event": "error",
  "error_type": "TimeoutError",
  "error_category": "network",
  "component": "RAGAgent",
  "agent_type": "rag-agent",
  "stack_trace_hash": "a3f5e2c1",  // SHA-256 hash
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-27T10:05:00Z"
}
```

**Insights:**
- ✓ "TimeoutError happens 50% on RAGAgent (needs timeout config)"
- ✓ "Hash a3f5e2c1 occurs 100 times (common bug, prioritize)"

---

### Category 5: Performance Metrics

**Collect:**
```typescript
interface PerformanceEvent {
  event: 'performance';

  // Metrics (aggregated, not individual)
  metric_type: 'agent_duration' | 'skill_duration' | 'api_latency';

  // Aggregated values (privacy-preserving)
  avg: number;
  p50: number;
  p95: number;
  p99: number;

  // Scope
  scope: string;                // "code-reviewer", "all-agents"

  // Time window
  period_start: string;
  period_end: string;

  // Privacy
  anonymous_id: string;
  timestamp: string;
}
```

**Insights:**
- ✓ "P99 latency for code-reviewer: 10s (optimize)"
- ✓ "Average skill duration: 2s (acceptable)"

---

### Category 6: Workflow Patterns (NEW - For Your Question #4)

**Collect:**
```typescript
interface WorkflowEvent {
  event: 'workflow';

  // Sequence of actions (anonymized)
  actions: Array<{
    action_type: string;        // "agent_execute", "skill_run"
    component: string;          // "code-reviewer"
    timestamp_offset: number;   // Relative to start (ms)
  }>;

  // Workflow metadata
  total_duration_ms: number;
  total_steps: number;
  success: boolean;

  // Privacy
  anonymous_id: string;
  timestamp: string;
}
```

**Example:**
```json
{
  "event": "workflow",
  "actions": [
    {"action_type": "agent_execute", "component": "code-reviewer", "timestamp_offset": 0},
    {"action_type": "skill_run", "component": "systematic-debugging", "timestamp_offset": 5000},
    {"action_type": "agent_execute", "component": "test-automator", "timestamp_offset": 10000}
  ],
  "total_duration_ms": 15000,
  "total_steps": 3,
  "success": true,
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-27T10:10:00Z"
}
```

**Insights:**
- ✓ "Common workflow: code-reviewer → debugging → test"
- ✓ "Users rarely use X after Y (bad UX?)"
- ✓ "Successful workflows average 3 steps"

---

## 🏗️ Architecture

### Local Collection

```typescript
// src/telemetry/TelemetryCollector.ts

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private enabled: boolean;

  constructor(config: TelemetryConfig) {
    this.enabled = config.enabled;
  }

  // Collect event (local only)
  collect(event: TelemetryEvent): void {
    if (!this.enabled) return;

    // Sanitize (remove PII)
    const sanitized = this.sanitize(event);

    // Store locally
    this.events.push(sanitized);
    this.saveToFile(sanitized);
  }

  private sanitize(event: TelemetryEvent): TelemetryEvent {
    // Remove any potential PII
    const sanitized = { ...event };

    // Remove file paths
    if (sanitized.file_path) {
      sanitized.file_path = basename(sanitized.file_path);
    }

    // Hash stack traces
    if (sanitized.stack_trace) {
      sanitized.stack_trace_hash = hash(sanitized.stack_trace);
      delete sanitized.stack_trace;
    }

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[truncated]';
      }
    });

    return sanitized;
  }

  private saveToFile(event: TelemetryEvent): void {
    const telemetryDir = path.join(os.homedir(), '.smart-agents', 'telemetry');
    fs.mkdirSync(telemetryDir, { recursive: true });

    const filePath = path.join(telemetryDir, 'events.jsonl');
    fs.appendFileSync(filePath, JSON.stringify(event) + '\n');
  }
}
```

### Batched Sending (Optional)

```typescript
// src/telemetry/TelemetrySender.ts

export class TelemetrySender {
  private endpoint: string;

  async sendBatch(events: TelemetryEvent[]): Promise<void> {
    // Batch events
    const batch = {
      events,
      batch_id: uuid(),
      batch_timestamp: new Date().toISOString(),
    };

    // Send (with retry)
    await this.sendWithRetry(batch);
  }

  private async sendWithRetry(batch: any): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (error) {
      // Store failed batches for later retry
      this.storeFailedBatch(batch);
    }
  }
}
```

### User Controls

```bash
# CLI commands for user control

# Status
npm run telemetry:status
# Output:
# Telemetry: Enabled
# Anonymous ID: 550e8400-e29b-41d4-a716-446655440000
# Events collected: 142
# Last sent: 2025-12-26T10:00:00Z

# Preview what will be sent
npm run telemetry:preview
# Shows sanitized events

# Review and send manually
npm run telemetry:send

# Disable
npm run telemetry:disable

# Clear all data
npm run telemetry:clear
```

---

## 📊 Analytics Dashboard (Your Side)

### What You See:

```typescript
// Analytics queries (server-side)

// 1. Agent usage
SELECT
  agent_type,
  COUNT(*) as uses,
  AVG(duration_ms) as avg_duration,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM events
WHERE event = 'agent_execution'
GROUP BY agent_type
ORDER BY uses DESC;

// Output:
// agent_type      | uses | avg_duration | success_rate
// code-reviewer   | 5000 | 3500         | 92%
// rag-agent       | 500  | 8000         | 85%

// 2. Skill popularity
SELECT
  skill_name,
  COUNT(*) as uses,
  AVG(user_satisfaction) as avg_rating
FROM events
WHERE event = 'skill_execution'
GROUP BY skill_name;

// 3. Error patterns
SELECT
  error_type,
  component,
  COUNT(*) as occurrences
FROM events
WHERE event = 'error'
GROUP BY error_type, component
ORDER BY occurrences DESC;

// 4. Workflow patterns
SELECT
  workflow_pattern,
  COUNT(*) as frequency,
  AVG(total_duration_ms) as avg_duration
FROM (
  SELECT
    ARRAY_AGG(component ORDER BY timestamp_offset) as workflow_pattern,
    total_duration_ms
  FROM workflow_events
  GROUP BY anonymous_id, timestamp
)
GROUP BY workflow_pattern
ORDER BY frequency DESC;
```

---

## 🔒 Privacy Guarantees

### 1. **No PII Collection**

```typescript
// Automatically sanitized before storage
const BANNED_FIELDS = [
  'email',
  'username',
  'api_key',
  'password',
  'token',
  'secret',
  'file_content',
  'code_content',
  'git_commit',
  'error_message',  // Only type, not message
];

function sanitize(event: any): any {
  BANNED_FIELDS.forEach(field => {
    if (event[field]) {
      delete event[field];
    }
  });
  return event;
}
```

### 2. **Local Storage First**

```
All events stored locally:
~/.smart-agents/telemetry/events.jsonl

User can:
- Review before sending
- Delete anytime
- Export to own analytics
```

### 3. **Minimal Data Retention**

```
Server-side:
- Raw events: 90 days
- Aggregated stats: 2 years
- No permanent storage of individual events
```

### 4. **Open Source Telemetry Code**

```typescript
// All telemetry code is open source
// Users can audit exactly what's collected
// src/telemetry/ (fully transparent)
```

---

## 🎯 Recommended Implementation

### Phase 1: Local Only (Week 1)

```typescript
// Start collecting locally (no sending)
// User can review and export for their own analysis

1. TelemetryCollector (local storage)
2. CLI commands (status, preview, clear)
3. Privacy sanitization
```

### Phase 2: Opt-In Sending (Week 2)

```typescript
// Add batched sending (opt-in)

1. TelemetrySender (batched HTTP)
2. User consent UI
3. Manual send command
```

### Phase 3: Analytics Dashboard (Week 3-4)

```typescript
// Build your analytics dashboard

1. Server-side API (receive events)
2. Analytics queries
3. Visualization (charts, trends)
```

---

## 📋 Checklist for Privacy Compliance

### Before Launch:

- [ ] Privacy policy written and published
- [ ] Opt-in by default (not opt-out)
- [ ] User consent UI implemented
- [ ] All events sanitized and reviewed
- [ ] No PII in any events
- [ ] Clear documentation of what's collected
- [ ] Easy opt-out mechanism
- [ ] Local data review tool
- [ ] Data retention policy defined
- [ ] GDPR compliance verified (if applicable)
- [ ] Security audit of telemetry endpoint

---

## 🎬 Example: Full Flow

### User Perspective:

```bash
# 1. First run
npm start

┌─────────────────────────────────────────────────────┐
│ Help Improve Smart-Agents                           │
│ [Enable Telemetry]  [No Thanks]                     │
└─────────────────────────────────────────────────────┘

# User clicks "Enable Telemetry"

# 2. Usage (automatic, transparent)
# Events collected locally at ~/.smart-agents/telemetry/

# 3. Review before sending (optional)
npm run telemetry:preview
# Shows:
# - 142 events ready to send
# - Preview of first 10 events (sanitized)

# 4. Send (manual or automatic)
npm run telemetry:send
# ✓ Sent 142 events

# 5. Check status anytime
npm run telemetry:status

# 6. Opt-out anytime
npm run telemetry:disable
# ✓ Telemetry disabled
# ✓ Local data preserved (you can export)
```

### Your Perspective (Analytics):

```javascript
// Query: What are users doing?
const topAgents = await analytics.getTopAgents();
// → code-reviewer: 5000 uses (92% success)
// → rag-agent: 500 uses (85% success)

const topSkills = await analytics.getTopSkills();
// → systematic-debugging: 95% success, 4.5/5 rating
// → memory-cleanup: 10 uses (consider deprecating)

const errorPatterns = await analytics.getErrors();
// → TimeoutError in RAGAgent: 50% of errors
// → Action: Increase default timeout

const workflows = await analytics.getCommonWorkflows();
// → code-reviewer → debugging → test (40% of sessions)
// → Action: Create workflow template
```

---

## 🚀 Benefits

### For You (Product Owner):

✅ **Data-driven decisions** - Know what to build next
✅ **Error prioritization** - Fix most common issues first
✅ **Feature validation** - See what users actually use
✅ **Roadmap planning** - Invest in popular features
✅ **User understanding** - Learn how they work

### For Users:

✅ **Better product** - Your data improves everyone's experience
✅ **Privacy protected** - No PII, transparent, opt-in
✅ **Fast bug fixes** - Errors reported automatically
✅ **Relevant features** - Built based on real usage

---

## ⚠️ Anti-Patterns to Avoid

### ❌ Don't Collect:

```typescript
// BAD - User code
{
  "event": "code_review",
  "code_content": "function foo() { ... }"  // NO!
}

// GOOD - Metadata only
{
  "event": "code_review",
  "file_type": "typescript",
  "lines_of_code": 150
}
```

```typescript
// BAD - Error messages (might contain paths)
{
  "error": "File not found: /Users/john/secret-project/api-key.txt"
}

// GOOD - Error type only
{
  "error_type": "FileNotFoundError",
  "error_category": "filesystem"
}
```

```typescript
// BAD - API keys
{
  "api_key": "sk-proj-abc123..."  // NEVER!
}

// GOOD - Provider only
{
  "llm_provider": "openai",
  "model": "gpt-4"
}
```

---

**This design ensures:**
- ✅ Privacy-first
- ✅ GDPR/CCPA compliant
- ✅ Actionable insights
- ✅ User trust
- ✅ Transparent and auditable

**Want me to implement this alongside the Evolution System?**
