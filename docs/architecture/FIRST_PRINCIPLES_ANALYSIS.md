# First Principles Analysis - Claude Code Integration Plan

**Date**: 2025-12-29
**Analysis Type**: Critical Review using First Principles Thinking
**Reviewer**: Claude Sonnet 4.5
**Status**: 🔬 Critical Issues Identified

---

## Methodology

**First Principles Thinking**: Break down the problem to fundamental truths and reason up from there, rather than reasoning by analogy or assumptions.

### Fundamental Questions

1. **What is the actual problem we're solving?**
2. **What are the immutable constraints?**
3. **What are the fundamental capabilities we have?**
4. **What assumptions did I make that might be wrong?**

---

## Fundamental Problem Definition

### Original Problem Statement
"User wants smart-agents to work autonomously in the background using Claude Code native features"

### First Principles Breakdown

**What does "autonomous" actually mean?**
- ❌ **NOT**: System executes tasks user didn't request (dangerous, violates user control)
- ✅ **YES**: System learns and adapts without user intervention
- ✅ **YES**: System monitors proactively and warns before problems occur
- ✅ **YES**: System enforces rules automatically to prevent mistakes

**What does "background" actually mean?**
- ❌ **NOT**: Hidden processes doing mysterious things
- ✅ **YES**: Non-blocking monitoring that doesn't interrupt main dialogue
- ✅ **YES**: Persistent processes that continue across tool executions
- ✅ **YES**: Automatic data collection and analysis

**What does "using Claude Code native features" mean?**
- ✅ Hooks (SessionStart, PreToolUse, PostToolUse, Stop)
- ✅ Background Bash execution
- ✅ MCP Memory persistence
- ✅ Task tool for subagent delegation
- ❌ NOT creating custom daemons or external services

---

## Critical Issues Identified

### 🚨 CRITICAL ISSUE #1: TypeScript/JavaScript Impedance Mismatch

**Problem**: Original plan imports TypeScript files from JavaScript hooks

```javascript
// ❌ This won't work - Router is TypeScript (.ts), hooks are JavaScript (.js)
import { Router } from '/Users/ktseng/Developer/Projects/smart-agents/src/orchestrator/router.ts';
```

**Why This is Fundamental**:
- Node.js cannot directly import TypeScript files
- Hooks run in pure Node.js environment
- Smart-agents is a TypeScript project with .ts source files

**Root Cause**: Assumption that we can directly import from source files

**Solutions Analyzed**:

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| A) Build smart-agents → import from dist/ | Clean separation | Extra build step, version sync issues | ⚠️ Workable |
| B) Use ts-node in hooks | Direct .ts import | Adds dependency, slower execution | ⚠️ Workable |
| C) Rewrite hooks in TypeScript | Type safety | Needs compilation step | ⚠️ Workable |
| D) Use MCP Server API instead | Proper abstraction | Requires MCP server running | ✅ **BEST** |

**Recommended Solution**: Option D - Use MCP Server API

**Why**:
- MCP Server is the designed interface for external communication
- Already handles TypeScript compilation internally
- Provides proper API abstraction
- Aligns with smart-agents architecture (Layer 5: MCP Server integration)

**New Architecture**:
```
Hook Script (JavaScript)
    ↓
MCP Server API Call (stdio/HTTP)
    ↓
MCP Server (TypeScript compiled)
    ↓
Router + Evolution System
```

---

### 🚨 CRITICAL ISSUE #2: Background Process Lifecycle Management

**Problem**: Original plan uses `setInterval()` in hook scripts

```javascript
// ❌ This won't work - hook process exits after return
const timer = setInterval(async () => {
  await checkQuota();
}, 10 * 60 * 1000);
```

**Why This is Fundamental**:
- Node.js processes exit when main function returns
- If hook returns immediately → intervals are cleared
- If hook never returns → blocks Claude Code session start

**Root Cause**: Misunderstanding of hook process lifecycle

**Solutions Analyzed**:

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| A) Hook never returns | Intervals work | Blocks session start | ❌ Broken |
| B) Spawn child process | Detached execution | Complex process management | ⚠️ Workable |
| C) Use Background Bash | Claude Code native | Separate process, harder to communicate | ⚠️ Workable |
| D) Use MCP Server's own runtime | Server already runs persistently | Requires MCP server changes | ✅ **BEST** |

**Recommended Solution**: Option D - MCP Server Internal Monitoring

**Why**:
- MCP Server already runs as a persistent process
- Can handle background timers internally
- Natural place for system-wide monitoring
- Avoids process management complexity

**New Architecture**:
```
MCP Server Process (persistent)
    ↓
Internal Background Timers
    ├── Quota Monitor (every 10 min)
    ├── Evolution Dashboard (every 30 min)
    └── Compliance Checker (on each request)
    ↓
Expose monitoring data via MCP tools
    ↓
Hooks query monitoring state (not run monitoring)
```

---

### 🚨 CRITICAL ISSUE #3: Semantic Gap Between Tools and Tasks

**Problem**: Original plan tracks performance in PostToolUse hook per tool

```javascript
// ❌ Wrong granularity - a single task uses multiple tools
PostToolUse Hook: Read file.ts
PostToolUse Hook: Edit file.ts
PostToolUse Hook: Bash "npm test"
// These are ONE task, not three
```

**Why This is Fundamental**:
- Router.routeTask() expects high-level tasks ("implement authentication")
- Tools are low-level operations (Read, Edit, Bash)
- Multiple tools often comprise a single task
- No way to group tools into tasks from PostToolUse hook

**Root Cause**: Conflating two different levels of abstraction

**Current Reality**:
```
Level 1: User Request → Router.routeTask() → Agent Selection
Level 2: Agent Execution → Multiple Tool Calls (Read, Edit, Bash)
Level 3: Tool Execution → PostToolUse Hook
```

**Solutions Analyzed**:

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| A) Track each tool as separate task | Simple | Semantically wrong, pollutes data | ❌ Wrong |
| B) Infer task boundaries from context | Accurate | Complex NLP, unreliable | ❌ Too hard |
| C) Track tools at tool-level, tasks at task-level | Proper separation | Requires different tracking | ✅ **CORRECT** |
| D) Only track when Router explicitly invoked | Matches semantics | Misses implicit routing | ⚠️ Incomplete |

**Recommended Solution**: Option C - Dual-Level Tracking

**Why**:
- Respects semantic boundaries
- Tool metrics: response time, error rate, resource usage
- Task metrics: success rate, quality score, learning patterns
- Don't mix them

**New Architecture**:
```
Task Level (Router):
    User Request → routeTask() → PerformanceTracker.track({
      taskType: "implement-auth",
      agentId: "backend-developer",
      success: true,
      ...
    })

Tool Level (separate tracking):
    Tool Execution → ToolMetrics.track({
      toolName: "Read",
      latencyMs: 45,
      success: true,
      ...
    })
```

---

### 🚨 CRITICAL ISSUE #4: Compliance Enforcement vs Detection

**Problem**: Original plan checks violations AFTER they happen

```javascript
// ❌ Reactive - violation already happened
PostToolUse: Edit → check if Read was called first → warn
```

**Why This is Fundamental**:
- User explicitly wants rules ENFORCED, not just detected
- "Working Solutions Only" principle requires prevention
- Detecting after the fact doesn't stop the damage

**Root Cause**: Confusing monitoring with enforcement

**Solutions Analyzed**:

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| A) PostToolUse detection only | Easy to implement | Doesn't prevent violations | ❌ Insufficient |
| B) PreToolUse blocking | Actually enforces rules | Hooks can't block tool execution | ❌ Not possible |
| C) Prompt-based hooks with LLM decision | Can suggest compliance | Not 100% reliable enforcement | ⚠️ Partial |
| D) MCP Server intercepts tool calls | True enforcement | Requires server modification | ✅ **BEST** |

**Recommended Solution**: Option D - Server-Side Interception

**Why**:
- MCP Server receives all tool calls before execution
- Can check compliance rules before executing
- Can block or warn before damage occurs
- True enforcement, not just detection

**New Architecture**:
```
Claude → Tool Call (Edit file.ts)
    ↓
MCP Server Intercepts
    ↓
Compliance Check:
    ✓ Was file.ts recently read? → Check session state
    ✗ No read found → Reject with error:
      "Rule Violation: READ BEFORE EDIT. Read file first."
    ✓ Read found → Execute tool
    ↓
Tool Execution
    ↓
PostToolUse: Log successful compliance
```

---

### 🚨 CRITICAL ISSUE #5: MCP Memory Unbounded Growth

**Problem**: Original plan stores all patterns to MCP Memory indefinitely

```javascript
// ❌ No pruning - will eventually hit quota limits
for (const pattern of allPatterns) {
  await mcp.createEntities({ pattern });
}
```

**Why This is Fundamental**:
- MCP Memory has storage limits
- Patterns accumulate over time (100s, 1000s)
- No pruning strategy = eventual failure

**Root Cause**: Not accounting for long-term growth

**Solutions Analyzed**:

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| A) Store all patterns | Complete data | Unbounded growth | ❌ Unsustainable |
| B) Top-N pruning | Bounded size | Loses historical data | ⚠️ Acceptable |
| C) Sliding window (last 90 days) | Recent focus | Loses long-term patterns | ⚠️ Acceptable |
| D) Hierarchical storage (MCP + local files) | Best of both | More complex | ✅ **BEST** |

**Recommended Solution**: Option D - Hierarchical Storage

**Why**:
- MCP Memory: High-confidence patterns only (confidence > 0.8)
- Local JSON files: Full pattern history
- Syncs best patterns to MCP for cross-session access
- Graceful degradation if MCP quota reached

**New Architecture**:
```
Pattern Storage:
    ├── Local: data/patterns/{agentId}/{patternId}.json
    │   - Full pattern details
    │   - Unlimited storage (disk-based)
    │   - Fast local access
    │
    └── MCP Memory: Top 10 patterns per agent
        - Pattern metadata only (ID, confidence, type)
        - Cross-session access
        - Quota-aware (max 220 patterns total)

Sync Strategy:
    - Every hour: sync top patterns to MCP
    - On session end: sync session learnings
    - On session start: load from MCP + local
```

---

### 🚨 CRITICAL ISSUE #6: Undefined "Proactive" Behavior

**Problem**: Original plan says "proactive" but doesn't define concrete behaviors

**Why This is Fundamental**:
- "Proactive" is vague, unmeasurable
- Could mean different things:
  - Suggesting actions before user asks?
  - Running tasks without permission?
  - Silent background work?
- Vagueness leads to incorrect implementation

**Root Cause**: Not defining requirements concretely

**Recommended Definition**:

```
Autonomous = System operates without manual intervention
    ✅ Learns from every execution automatically
    ✅ Adapts configuration based on learned patterns
    ✅ Monitors resources continuously
    ❌ Does NOT execute user tasks without request

Proactive = System anticipates problems before they occur
    ✅ Warns at 80% quota (before hitting limit)
    ✅ Enforces rules before violations (PreToolUse)
    ✅ Suggests optimizations based on patterns
    ❌ Does NOT make changes without approval

Background = Non-blocking continuous operation
    ✅ Monitoring runs during session without interrupting
    ✅ Learning happens automatically during tool use
    ✅ State persists across sessions
    ❌ Does NOT run when Claude Code is closed
```

---

### 🔍 CRITICAL ISSUE #7: Missing Error Recovery and Graceful Degradation

**Problem**: Original plan assumes all components work perfectly

**Why This is Fundamental**:
- MCP Memory might be unavailable
- Background processes might crash
- Import errors might occur
- Network timeouts possible

**Root Cause**: Not planning for failure modes

**Recommended Failure Handling**:

```
MCP Memory Unavailable:
    ✅ Fallback: Use local JSON storage only
    ✅ Continue learning (save locally)
    ✅ Sync when MCP returns

Background Monitoring Crash:
    ✅ Restart with exponential backoff
    ✅ Log crash reason to MCP Memory
    ✅ Continue session (monitoring optional)

Router Initialization Failure:
    ✅ Log error to session state
    ✅ Continue without evolution (basic routing only)
    ✅ Notify user in next response

Compliance Check Failure:
    ✅ Default to allowing tool execution (fail-open)
    ✅ Log violation detection failure
    ✅ Don't block user work due to check failure
```

---

## Revised Architecture (Based on First Principles)

### Core Insight

**Don't make hooks do everything - use the right component for each responsibility**

```
Component Responsibilities (Separation of Concerns):

1. MCP Server (persistent process)
   ✅ Router/Evolution system
   ✅ Background monitoring timers
   ✅ Compliance rule enforcement
   ✅ Session state management
   ❌ NOT: One-off hook scripts

2. Hooks (event handlers)
   ✅ Trigger MCP Server actions
   ✅ Query monitoring state
   ✅ Log lifecycle events
   ❌ NOT: Run background processes
   ❌ NOT: Import TypeScript code

3. MCP Memory (persistence)
   ✅ High-value patterns only
   ✅ Cross-session continuity
   ✅ Violation history
   ❌ NOT: All data (quota limits)

4. Local Storage (file system)
   ✅ Full pattern history
   ✅ Session logs
   ✅ Monitoring data
   ❌ NOT: Cross-session sharing
```

### New Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Session Lifecycle                                           │
└─────────────────────────────────────────────────────────────┘

1. SessionStart Hook
   ↓
   [Hook Script] → MCP Server API: /session/start
   ↓
   [MCP Server] → Initialize Router + Evolution
                → Start background monitoring (internal timers)
                → Load patterns from MCP Memory + local files
   ↓
   [Hook Returns] Session ready ✓


2. Tool Execution (Read, Edit, Bash)
   ↓
   [Claude] → Tool Call → [MCP Server]
   ↓
   [MCP Server] → Compliance Check (PreToolUse logic)
       ✓ READ BEFORE EDIT? Check session state
       ✓ Within quota? Check budget
       ✗ Violation? → Reject + Log to MCP Memory
       ✓ Compliant? → Execute tool
   ↓
   [Tool Executes] → Result
   ↓
   [MCP Server] → Track tool metrics (separate from task metrics)
   ↓
   [PostToolUse Hook] → Query monitoring state
                      → Log to local file


3. Background Monitoring (MCP Server internal)
   ↓
   [Every 10 min] → Quota Check
       → If > 80%: Flag warning in monitoring state
   ↓
   [Every 30 min] → Evolution Dashboard
       → Update pattern statistics
       → Sync top patterns to MCP Memory
   ↓
   [Continuous] → Compliance Monitoring
       → Track READ/EDIT pairs
       → Detect RUN BEFORE CLAIM violations


4. Session End
   ↓
   [Stop Hook] → MCP Server API: /session/end
   ↓
   [MCP Server] → Save evolution state
                → Sync learned patterns to MCP Memory
                → Generate session report
                → Stop background monitoring
   ↓
   [Hook Returns] Session ended ✓
```

---

## Revised Implementation Plan

### Phase 1: MCP Server Enhancements (Foundation)

**Why First**: MCP Server is the persistent process that should handle background work

**Changes Needed**:

```typescript
// src/mcp-server/SessionManager.ts (NEW)
export class SessionManager {
  private sessions = new Map<string, Session>();
  private backgroundMonitors = new Map<string, BackgroundMonitor>();

  async startSession(sessionId: string): Promise<SessionInfo> {
    // Initialize Router + Evolution
    const router = new Router();
    const monitor = new EvolutionMonitor(...);

    // Load patterns from MCP Memory + local
    await this.loadPatterns(router);

    // Start background monitoring (internal timers)
    const bgMonitor = new BackgroundMonitor(router, monitor);
    bgMonitor.start();

    this.backgroundMonitors.set(sessionId, bgMonitor);

    return { sessionId, startTime: new Date(), ready: true };
  }

  async endSession(sessionId: string): Promise<SessionReport> {
    const monitor = this.backgroundMonitors.get(sessionId);
    await monitor.stop();
    await this.savePatterns(sessionId);
    return this.generateReport(sessionId);
  }
}

// src/mcp-server/ComplianceInterceptor.ts (NEW)
export class ComplianceInterceptor {
  private sessionState = new Map<string, ToolHistory>();

  async checkCompliance(
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<ComplianceResult> {
    // READ BEFORE EDIT rule
    if (toolName === 'Edit') {
      const filePath = args.file_path;
      const wasRead = this.wasRecentlyRead(sessionId, filePath);
      if (!wasRead) {
        return {
          allowed: false,
          violation: 'READ_BEFORE_EDIT',
          message: `Must read ${filePath} before editing`
        };
      }
    }

    // RUN BEFORE CLAIM rule
    // ... similar checks

    return { allowed: true };
  }
}

// src/mcp-server/BackgroundMonitor.ts (NEW)
export class BackgroundMonitor {
  private quotaTimer: NodeJS.Timeout;
  private evolutionTimer: NodeJS.Timeout;

  start(): void {
    // Quota monitoring
    this.quotaTimer = setInterval(async () => {
      const status = await this.router.getSystemStatus();
      if (status.costStats.totalCost > status.costStats.budget * 0.8) {
        this.flagWarning('QUOTA_WARNING', status);
      }
    }, 10 * 60 * 1000);

    // Evolution dashboard
    this.evolutionTimer = setInterval(async () => {
      const summary = this.monitor.getDashboardSummary();
      await this.syncPatternsToMemory(summary);
    }, 30 * 60 * 1000);
  }

  stop(): void {
    clearInterval(this.quotaTimer);
    clearInterval(this.evolutionTimer);
  }
}
```

**New MCP Tools**:

```typescript
// Expose monitoring state to hooks
server.tool('get_monitoring_state', async (args) => {
  const state = sessionManager.getMonitoringState(args.sessionId);
  return state; // { quotaWarning, evolutionSummary, violations }
});

server.tool('start_session', async (args) => {
  const info = await sessionManager.startSession(args.sessionId);
  return info;
});

server.tool('end_session', async (args) => {
  const report = await sessionManager.endSession(args.sessionId);
  return report;
});
```

### Phase 2: Hooks Integration (Thin Layer)

**Why Second**: Hooks just trigger MCP Server, don't do heavy lifting

**Hooks Configuration**:

```json
{
  "hooks": {
    "sessionStart": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/session-start.js",
        "{sessionId}"
      ]
    },
    "postToolUse": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/post-tool-use.js",
        "{sessionId}",
        "{toolName}"
      ]
    },
    "stop": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/stop.js",
        "{sessionId}"
      ]
    }
  }
}
```

**Hook Scripts** (JavaScript, thin wrappers):

```javascript
// session-start.js - Thin wrapper to MCP Server
import { callMCP } from './utils/mcp-client.js';

const sessionId = process.argv[2];

async function main() {
  try {
    // Call MCP Server to start session
    const result = await callMCP('start_session', { sessionId });

    console.log(`[Session Start] Router initialized:`);
    console.log(`  - Session ID: ${result.sessionId}`);
    console.log(`  - Agents: ${result.totalAgents}`);
    console.log(`  - Background monitoring: Started`);

  } catch (error) {
    console.error(`[Session Start] Error:`, error);
    process.exit(1);
  }
}

main();
```

```javascript
// post-tool-use.js - Query monitoring state only
import { callMCP } from './utils/mcp-client.js';
import fs from 'fs/promises';

const sessionId = process.argv[2];
const toolName = process.argv[3];

async function main() {
  try {
    // Query monitoring state from MCP Server
    const state = await callMCP('get_monitoring_state', { sessionId });

    // Log to local file (don't block)
    await fs.appendFile(
      `/Users/ktseng/.claude/hooks/state/tools-${sessionId}.jsonl`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        toolName,
        quotaWarning: state.quotaWarning,
        violations: state.recentViolations
      }) + '\n'
    );

    // Warn user if quota approaching limit
    if (state.quotaWarning) {
      console.warn(`[Quota Warning] ${state.quotaWarning.message}`);
    }

  } catch (error) {
    console.error(`[PostToolUse] Error:`, error);
    // Don't fail - monitoring is optional
  }
}

main();
```

```javascript
// stop.js - Trigger session end
import { callMCP } from './utils/mcp-client.js';

const sessionId = process.argv[2];

async function main() {
  try {
    const report = await callMCP('end_session', { sessionId });

    console.log(`\n[Session End Report]`);
    console.log(`  - Total Executions: ${report.totalExecutions}`);
    console.log(`  - Patterns Learned: ${report.newPatterns}`);
    console.log(`  - Violations: ${report.totalViolations}`);
    console.log(`\nEvolution state saved ✓`);

  } catch (error) {
    console.error(`[Session End] Error:`, error);
    process.exit(1);
  }
}

main();
```

### Phase 3: Storage Strategy (Hierarchical)

**Local Storage** (unlimited):
```
/Users/ktseng/.claude/hooks/state/
├── sessions/
│   ├── session-{id}.json          # Session metadata
│   └── tools-{id}.jsonl           # Tool execution log
├── patterns/
│   ├── code-reviewer/
│   │   ├── pattern-001.json       # Full pattern details
│   │   └── pattern-002.json
│   └── backend-developer/
│       └── pattern-001.json
└── monitoring/
    ├── quota-{id}.jsonl           # Quota usage over time
    └── evolution-{id}.jsonl       # Evolution snapshots
```

**MCP Memory** (quota-aware):
```javascript
// Only store top patterns
async function syncPatternsToMemory(allPatterns) {
  // Get top 10 patterns per agent (max 220 total)
  const topPatterns = selectTopPatterns(allPatterns, {
    perAgent: 10,
    minConfidence: 0.8,
    minSuccessRate: 0.7
  });

  // Store pattern metadata only (not full details)
  for (const pattern of topPatterns) {
    await mcp.createEntities({
      entities: [{
        name: `Pattern: ${pattern.id}`,
        entityType: 'learned_pattern',
        observations: [
          `Agent: ${pattern.agentId}`,
          `Type: ${pattern.type}`,
          `Confidence: ${pattern.confidence}`,
          `Success Rate: ${pattern.successRate}`,
          `Full details: file://patterns/${pattern.agentId}/${pattern.id}.json`
        ]
      }]
    });
  }

  // If quota error → stop syncing, use local only
}
```

### Phase 4: Compliance Enforcement (Server-Side)

```typescript
// In MCP Server tool handler
server.tool('edit', async (args) => {
  const sessionId = getCurrentSession();

  // Pre-execution compliance check
  const compliance = await complianceInterceptor.checkCompliance(
    sessionId,
    'Edit',
    args
  );

  if (!compliance.allowed) {
    // Log violation to MCP Memory
    await logViolation(sessionId, compliance.violation);

    // Reject with helpful message
    throw new Error(
      `Rule Violation: ${compliance.violation}\n` +
      `${compliance.message}\n` +
      `Correct action: Read the file first using Read tool`
    );
  }

  // Execute tool if compliant
  const result = await executeEdit(args);

  // Track for next compliance check
  complianceInterceptor.recordToolUse(sessionId, 'Edit', args);

  return result;
});
```

---

## Key Improvements Summary

| Issue | Original Plan | Improved Plan |
|-------|--------------|---------------|
| **TypeScript Import** | Hooks import .ts files directly | MCP Server API calls |
| **Background Processes** | Hook runs setInterval() | MCP Server internal timers |
| **Task/Tool Granularity** | Track tools as tasks | Separate tool/task metrics |
| **Compliance** | Detect violations (PostToolUse) | Enforce rules (PreToolExecution) |
| **Storage Growth** | Unbounded MCP Memory | Hierarchical (MCP + local) |
| **"Proactive" Definition** | Vague | Concrete measurable behaviors |
| **Error Handling** | Assumed success | Graceful degradation |

---

## Implementation Priority

```
Priority 1 (Foundation):
  ✅ MCP Server SessionManager
  ✅ MCP Server ComplianceInterceptor
  ✅ MCP Server BackgroundMonitor
  ✅ New MCP tools (start_session, end_session, get_monitoring_state)

Priority 2 (Integration):
  ✅ Hook scripts (thin wrappers)
  ✅ settings.local.json hooks configuration
  ✅ MCP client utility (utils/mcp-client.js)

Priority 3 (Storage):
  ✅ Local file structure
  ✅ MCP Memory sync logic
  ✅ Pattern pruning strategy

Priority 4 (Testing):
  ✅ Session lifecycle tests
  ✅ Compliance enforcement tests
  ✅ Background monitoring tests
  ✅ Graceful degradation tests
```

---

## Conclusion

**Critical Realization**: The original plan tried to make hooks do too much. Hooks are event handlers, not application logic.

**First Principles Solution**:
- **MCP Server** = Persistent process → Handles background work, monitoring, enforcement
- **Hooks** = Event triggers → Thin wrappers that call MCP Server
- **Storage** = Hierarchical → Local (unlimited) + MCP Memory (top patterns only)
- **Compliance** = Pre-execution → Enforce, not just detect

This revised architecture respects the fundamental constraints of each component and creates a truly autonomous system that works proactively without violating separation of concerns.
