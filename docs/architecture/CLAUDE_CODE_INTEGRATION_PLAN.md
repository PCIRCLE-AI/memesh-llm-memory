# Claude Code Integration Plan - Autonomous Smart-Agents

**Version**: 1.0
**Date**: 2025-12-29
**Status**: 📋 Pending Review

## Executive Summary

This plan integrates **Claude Code native features** with the **existing smart-agents architecture** to create truly autonomous agents that work proactively in the background without explicit user invocation.

### What We Have (Existing)

**5-Layer Multi-Model Routing Architecture**:
- **Layer 1**: Provider Integration (Ollama, Gemini, Grok, ChatGPT, Claude)
- **Layer 2**: Quota Manager (real-time quota tracking, failover logic)
- **Layer 3**: Smart Router (complexity analysis, provider selection)
- **Layer 4**: Skills Coordination (multi-model orchestration)
- **Layer 5**: User Interface (MCP Server integration)

**Evolution System** (4 Components):
- `PerformanceTracker`: Tracks execution metrics (duration, cost, quality, success rate)
- `LearningManager`: Identifies patterns (min 10 observations, min 0.6 confidence)
- `AdaptationEngine`: Applies learned patterns (prompt optimization, model selection, timeout adjustment, retry strategy)
- `EvolutionMonitor`: Dashboard for all 22 agents' learning progress

**22 Specialized Agents** configured with evolution capabilities

### What We Need (Claude Code Native Features)

**Hooks System**:
- `SessionStart`: Initialize Router with evolution system
- `PostToolUse`: Track performance after each tool execution
- `Stop`: Save evolution state before session ends

**Background Execution**:
- Background Bash: Long-running monitoring processes
- Non-blocking operation: Main dialogue continues while monitoring runs

**MCP Memory Integration**:
- Persistent storage for learned patterns
- Cross-session learning continuity

### Core Principle

**Use 100% existing smart-agents design + Claude Code native capabilities = Autonomous agents working proactively in background**

---

## Architecture Integration

### Current State (What Works)

```
User Request → Claude Code → MCP Server (smart-agents)
                              ↓
                         Router.routeTask()
                              ↓
                         [Manual Invocation]
```

**Problem**: Requires explicit invocation, agents don't work proactively

### Target State (What We Want)

```
Claude Code Session Start
    ↓
SessionStart Hook → Initialize Router + Evolution System
    ↓
Background Monitoring:
    - Quota checking (every 10 min)
    - Evolution dashboard (every 30 min)
    - Compliance checking (READ BEFORE EDIT, RUN BEFORE CLAIM)
    ↓
User Dialogue (main thread, non-blocking)
    ↓
PostToolUse Hook → Track performance metrics → Learn patterns
    ↓
MCP Memory → Persist learned patterns
    ↓
Stop Hook → Save evolution state
```

**Benefit**: Autonomous operation, proactive monitoring, continuous learning

---

## UX Design & User Interaction

### Core Principle: Permission-Based Agent Deployment

**即使 agents 在背景自動執行，仍需先徵求用戶許可**

This ensures human-in-the-loop control while maintaining autonomous operation.

### Notification Format

**Design Requirements**:
- ✅ Short and clear (easy to understand)
- ✅ SmartAgents branding (prefix all notifications)
- ✅ User choice (Yes / Provide feedback)
- ✅ Context (what, why, when)

**Standard Format**:
```
🤖 SmartAgents: Deploying [agent-name] to [action] triggered by [event]
   Permission to proceed?
   1) Yes
   2) Provide feedback
```

### Real-World Examples

**Example 1: Anomaly Detection**
```
🤖 SmartAgents: Deploying debugger + performance-profiler to investigate slow execution triggered by PostToolUse (Read > 2s)
   Permission to proceed?
   1) Yes
   2) Provide feedback
```

**Example 2: Code Review**
```
🤖 SmartAgents: Deploying code-reviewer to review recent changes triggered by git commit
   Permission to proceed?
   1) Yes
   2) Provide feedback
```

**Example 3: Session Start**
```
🤖 SmartAgents: Deploying evolution-monitor + quota-checker + compliance-monitor to start background monitoring triggered by SessionStart
   Permission to proceed?
   1) Yes
   2) Provide feedback
```

### Permission Requirements by Event Type

| Event Type | When | Example Agents | Permission Required |
|------------|------|----------------|---------------------|
| **SessionStart** | Claude Code session starts | evolution-monitor, quota-checker | ✅ Yes (once per session) |
| **PostToolUse** | Tool execution completes | code-reviewer, debugger, performance-profiler | ✅ Yes (per anomaly) |
| **Threshold Breach** | Quota/budget exceeded | quota-checker (80% budget), compliance-monitor | ✅ Yes (per alert) |
| **Periodic** | Scheduled check | evolution-monitor (30 min), quota-checker (10 min) | ❌ No (background) |
| **Stop** | Session ends | evolution-monitor (save state) | ❌ No (cleanup) |

### Permission Caching (Smart Defaults)

**Goal**: Reduce notification fatigue while maintaining control

**Strategy**:
- First deployment in session → Always ask
- Same deployment type within 30 min → Auto-approve (cached)
- Different deployment type → Ask again

**Implementation**:
```javascript
const permissionCache = {
  // Key: deployment signature (agents + trigger)
  // Value: { approved, timestamp, sessionId }
};

// If approved in this session within 30 min → auto-approve
if (cached && cached.approved &&
    cached.sessionId === currentSessionId &&
    Date.now() - cached.timestamp < 30 * 60 * 1000) {
  console.log(`[SmartAgents] Auto-approved (cached): ${agents}`);
  return { approved: true };
}
```

### User Feedback Integration

**Option 1: User says "Yes"**
- Agent deploys immediately
- Works in background (non-blocking)
- User can continue dialogue

**Option 2: User provides feedback**
- Collect feedback text
- Pass feedback to deployed agents as context
- Agents adjust behavior based on feedback
- Example: "Focus on security issues" → code-reviewer prioritizes security

---

## Implementation Design

### Phase 1: Hooks Configuration

#### 1.1 Settings.local.json Configuration

**Location**: `/Users/ktseng/.claude/settings.local.json`

**Add hooks section**:

```json
{
  "hooks": {
    "sessionStart": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/session-start.js",
        "{sessionId}"
      ],
      "description": "Initialize smart-agents Router with evolution system"
    },
    "postToolUse": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/post-tool-use.js",
        "{toolName}",
        "{result}",
        "{durationMs}"
      ],
      "description": "Track tool execution performance for evolution"
    },
    "stop": {
      "command": "node",
      "args": [
        "/Users/ktseng/.claude/hooks/stop.js",
        "{sessionId}"
      ],
      "description": "Save evolution state before session ends"
    }
  }
}
```

#### 1.2 Hook Scripts

**Directory**: `/Users/ktseng/.claude/hooks/`

**Files to create**:
- `session-start.js`: Initialize Router, request permission, start background monitoring
- `post-tool-use.js`: Track performance metrics, request permission for anomaly investigation, learn patterns
- `stop.js`: Save evolution state, generate session report
- `background-monitor.js`: Quota checking, compliance validation
- `utils/permission.js`: **NEW** - Centralized permission request handling with caching

### Phase 2: Router Integration

#### 2.1 Session Start Hook (`session-start.js`)

**Responsibilities**:
1. Initialize Router (automatically initializes all 22 agents + evolution system)
2. Load saved evolution state from MCP Memory
3. **Request permission** to start background monitoring
4. Start background monitoring processes (if approved)
5. Log initialization summary

**Key Implementation**:

```javascript
import { Router } from '/Users/ktseng/Developer/Projects/smart-agents/src/orchestrator/router.js';
import { EvolutionMonitor } from '/Users/ktseng/Developer/Projects/smart-agents/src/evolution/EvolutionMonitor.js';
import { askUserPermission } from './utils/permission.js';

async function handleSessionStart(sessionId) {
  // 1. Initialize Router (always, no permission needed)
  const router = new Router();
  const monitor = new EvolutionMonitor(
    router.getPerformanceTracker(),
    router.getLearningManager(),
    router.getAdaptationEngine()
  );

  // 2. Load saved patterns (always, no permission needed)
  await loadPatternsFromMemory(router.getLearningManager());

  // 3. REQUEST PERMISSION for background monitoring
  const permission = await askUserPermission({
    prefix: "🤖 SmartAgents",
    agents: "evolution-monitor + quota-checker + compliance-monitor",
    action: "start background monitoring (quota, compliance, learning)",
    trigger: "SessionStart",
  });

  if (permission.approved) {
    // 4. Start background monitoring (non-blocking)
    startBackgroundMonitoring(sessionId, router, monitor, {
      userFeedback: permission.feedback,
    });

    console.log("[SmartAgents] Background monitoring started ✓");
  } else {
    console.log("[SmartAgents] Background monitoring disabled by user");
  }
}
```

**Background Monitoring Tasks**:

| Task | Interval | Purpose |
|------|----------|---------|
| Quota Check | 10 minutes | Warn if approaching 80% of budget |
| Evolution Dashboard | 30 minutes | Log learning progress |
| Compliance Check | On each tool use | Validate READ BEFORE EDIT, RUN BEFORE CLAIM |

#### 2.2 Post-Tool-Use Hook (`post-tool-use.js`)

**Responsibilities**:
1. Track performance metrics for each tool execution
2. Detect anomalies (slow execution, high cost, low quality)
3. **Request permission** to deploy investigation agents (if anomaly detected)
4. Update learning patterns (background, no permission needed)
5. Persist to MCP Memory

**Key Implementation**:

```javascript
import { askUserPermissionWithCache } from './utils/permission.js';

async function handlePostToolUse(toolName, result, durationMs) {
  // 1. Track performance (always, no permission needed)
  const metrics = performanceTracker.track({
    agentId: inferAgentFromTool(toolName),
    taskType: toolName,
    success: !result.error,
    durationMs,
    cost: estimateCost(toolName, result),
    qualityScore: assessQuality(result),
    metadata: { toolName, resultSize: JSON.stringify(result).length }
  });

  // 2. Detect anomalies
  const anomaly = performanceTracker.detectAnomalies(agentId, metrics);

  // 3. If anomaly detected → REQUEST PERMISSION to deploy agents
  if (anomaly.isAnomaly) {
    const agentsToDeploy = selectAgentsForAnomaly(anomaly);

    // Permission request with SmartAgents branding
    const permission = await askUserPermissionWithCache({
      prefix: "🤖 SmartAgents",
      agents: agentsToDeploy.map(a => a.name).join(" + "),
      action: anomaly.type === "slow" ? "investigate slow execution" :
              anomaly.type === "expensive" ? "analyze high cost" :
              "review low quality output",
      trigger: `PostToolUse (${toolName} ${anomaly.type})`,
    });

    if (permission.approved) {
      // Deploy agents in background (non-blocking)
      await deployAgentsInBackground(agentsToDeploy, {
        context: { toolName, result, metrics, anomaly },
        userFeedback: permission.feedback,
      });

      console.log(`[SmartAgents] Deployed ${agentsToDeploy.map(a => a.name).join(", ")} ✓`);
    } else {
      console.log(`[SmartAgents] User declined: ${agentsToDeploy.map(a => a.name).join(", ")}`);
    }
  }

  // 4. Periodic learning (every 10 executions, no permission needed)
  if (performanceTracker.getTotalTaskCount() % 10 === 0) {
    const patterns = learningManager.analyzePatterns(agentId);
    await persistPatternsToMemory(patterns);
  }
}
```

**Helper: Select Agents for Anomaly**:

```javascript
function selectAgentsForAnomaly(anomaly) {
  switch (anomaly.type) {
    case "slow":
      return [
        { name: "debugger", priority: "high" },
        { name: "performance-profiler", priority: "high" }
      ];
    case "expensive":
      return [
        { name: "performance-profiler", priority: "high" },
        { name: "code-reviewer", priority: "medium" }
      ];
    case "low_quality":
      return [
        { name: "code-reviewer", priority: "high" },
        { name: "test-writer", priority: "medium" }
      ];
    default:
      return [{ name: "general-agent", priority: "low" }];
  }
}
```

#### 2.3 Stop Hook (`stop.js`)

**Responsibilities**:
1. Save evolution state to MCP Memory
2. Generate session summary report
3. Clean up background monitoring processes

**Key Implementation**:

```javascript
// Get final evolution summary
const summary = monitor.getDashboardSummary();

// Save to MCP Memory
await mcp.createEntities({
  entities: [{
    name: `Session ${sessionId} Evolution Summary`,
    entityType: 'session_evolution',
    observations: [
      `Total Executions: ${summary.totalExecutions}`,
      `Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`,
      `Agents with Learning Progress: ${summary.agentsWithLearningProgress}`,
      `Top Performing Agent: ${summary.topAgent}`
    ]
  }]
});

// Generate session report
const report = monitor.formatDashboard();
console.log(report);
```

#### 2.4 Permission Utility (`utils/permission.js`)

**Purpose**: Centralized permission request handling with SmartAgents branding and caching

**Key Implementation**:

```javascript
/**
 * Request user permission to deploy agents (with caching)
 *
 * @param {Object} options
 * @param {string} options.prefix - Brand prefix (e.g., "🤖 SmartAgents")
 * @param {string} options.agents - Agent names (e.g., "debugger + performance-profiler")
 * @param {string} options.action - Action to perform (e.g., "investigate slow execution")
 * @param {string} options.trigger - Trigger event (e.g., "PostToolUse (Read slow)")
 * @returns {Promise<{approved: boolean, feedback?: string}>}
 */
async function askUserPermissionWithCache({ prefix, agents, action, trigger }) {
  const signature = `${agents}::${trigger}`;
  const cached = permissionCache[signature];

  // If approved in this session within last 30 min → auto-approve
  if (cached && cached.approved &&
      cached.sessionId === currentSessionId &&
      Date.now() - cached.timestamp < 30 * 60 * 1000) {
    console.log(`[SmartAgents] Auto-approved (cached): ${agents}`);
    return { approved: true };
  }

  // Otherwise, ask user
  const result = await askUserPermission({ prefix, agents, action, trigger });

  // Cache the decision
  permissionCache[signature] = {
    approved: result.approved,
    timestamp: Date.now(),
    sessionId: currentSessionId,
  };

  return result;
}

/**
 * Request user permission to deploy agents (no caching)
 *
 * @param {Object} options - Same as askUserPermissionWithCache
 * @returns {Promise<{approved: boolean, feedback?: string}>}
 */
async function askUserPermission({ prefix, agents, action, trigger }) {
  // Format: Short, clear, branded
  const message = `${prefix}: Deploying ${agents} to ${action} triggered by ${trigger}
   Permission to proceed?
   1) Yes
   2) Provide feedback`;

  console.log(message);

  // Use Claude Code's built-in prompt mechanism or MCP tool
  const response = await promptUser(message, {
    options: [
      { value: "yes", label: "1) Yes" },
      { value: "feedback", label: "2) Provide feedback" }
    ]
  });

  if (response.choice === "yes") {
    return { approved: true };
  } else {
    // User chose option 2: collect feedback
    const feedback = await promptUser("Your feedback:", { type: "text" });
    return { approved: true, feedback };
  }
}

// Permission cache (in-memory, session-scoped)
const permissionCache = {};
let currentSessionId = null;

/**
 * Initialize permission system for new session
 */
function initPermissionSystem(sessionId) {
  currentSessionId = sessionId;
  // Clear cache from previous session
  Object.keys(permissionCache).forEach(key => delete permissionCache[key]);
}

export { askUserPermission, askUserPermissionWithCache, initPermissionSystem };
```

**Integration with Hooks**:

```javascript
// In session-start.js
import { initPermissionSystem, askUserPermission } from './utils/permission.js';

async function handleSessionStart(sessionId) {
  // Initialize permission system
  initPermissionSystem(sessionId);

  // ... rest of session start logic
}
```

### Phase 3: MCP Memory Integration

#### 3.1 Learned Patterns Persistence

**Strategy**: Use MCP Memory Knowledge Graph for structured storage

```javascript
// Save learned pattern
await mcp.createEntities({
  entities: [{
    name: `Pattern: ${pattern.id}`,
    entityType: 'learned_pattern',
    observations: [
      `Type: ${pattern.type}`,
      `Agent: ${pattern.agentId}`,
      `Task Type: ${pattern.taskType}`,
      `Confidence: ${pattern.confidence}`,
      `Success Rate: ${pattern.successRate}`,
      `Observation Count: ${pattern.observationCount}`,
      `Action: ${JSON.stringify(pattern.action)}`
    ]
  }]
});

// Create relation to agent
await mcp.createRelations({
  relations: [{
    from: `Pattern: ${pattern.id}`,
    to: `Agent: ${pattern.agentId}`,
    relationType: 'learned_by'
  }]
});
```

#### 3.2 Cross-Session Learning

**Session Start**: Load all learned patterns from MCP Memory

```javascript
// Query all learned patterns
const nodes = await mcp.searchNodes({ query: 'learned_pattern' });

// Import patterns into LearningManager
for (const node of nodes) {
  const pattern = parsePatternFromNode(node);
  learningManager.addBootstrapPattern(pattern);
}
```

### Phase 4: Compliance Monitoring

#### 4.1 CLAUDE.md Rules Enforcement

**Rules to Monitor** (from `/Users/ktseng/.claude/CLAUDE.md`):

1. **READ BEFORE EDIT**: Must read file before editing
2. **RUN BEFORE CLAIM**: Must execute command before claiming result
3. **FIX ALL ISSUES**: All discovered issues must be fixed
4. **ROOT CAUSE ANALYSIS**: Must use systematic-debugging for problems

**Implementation in PostToolUse Hook**:

```javascript
// Check READ BEFORE EDIT
if (toolName === 'Edit' && !recentlyReadFile(args.file_path)) {
  await reportViolation({
    rule: 'READ BEFORE EDIT',
    toolName,
    message: 'Attempted to edit file without reading it first'
  });
}

// Check RUN BEFORE CLAIM
if (isClaimingResult() && !recentlyExecutedCommand()) {
  await reportViolation({
    rule: 'RUN BEFORE CLAIM',
    toolName,
    message: 'Claiming result without execution'
  });
}
```

**Violation Reporting**:

```javascript
async function reportViolation(violation) {
  // Log to MCP Memory
  await mcp.createEntities({
    entities: [{
      name: `Violation: ${violation.rule} ${Date.now()}`,
      entityType: 'rule_violation',
      observations: [
        `Rule: ${violation.rule}`,
        `Tool: ${violation.toolName}`,
        `Message: ${violation.message}`,
        `Timestamp: ${new Date().toISOString()}`
      ]
    }]
  });

  // Warn user (non-blocking)
  console.warn(`[Compliance Violation] ${violation.rule}: ${violation.message}`);
}
```

---

## File Structure

```
/Users/ktseng/.claude/
├── settings.local.json               # Updated with hooks configuration
├── hooks/
│   ├── session-start.js              # Initialize Router + Evolution
│   ├── post-tool-use.js              # Track performance + Learn patterns
│   ├── stop.js                       # Save evolution state
│   ├── background-monitor.js         # Quota + Compliance monitoring
│   └── state/                        # Runtime state storage
│       ├── current-session.json      # Current session state
│       ├── quota-{sessionId}.jsonl   # Quota logs
│       └── evolution-{sessionId}.jsonl # Evolution snapshots
└── CLAUDE.md                         # Existing rules (no changes)

/Users/ktseng/Developer/Projects/smart-agents/
├── src/
│   ├── orchestrator/
│   │   └── router.ts                 # Existing Router (no changes)
│   └── evolution/
│       ├── PerformanceTracker.ts     # Existing (no changes)
│       ├── LearningManager.ts        # Existing (no changes)
│       ├── AdaptationEngine.ts       # Existing (no changes)
│       └── EvolutionMonitor.ts       # Existing (no changes)
└── docs/
    └── architecture/
        └── CLAUDE_CODE_INTEGRATION_PLAN.md  # This document
```

---

## Implementation Steps

### Step 1: Create Hooks Directory Structure ✅

```bash
mkdir -p /Users/ktseng/.claude/hooks/state
```

### Step 2: Create Hook Scripts

**Order**:
1. `session-start.js` (Router initialization)
2. `post-tool-use.js` (Performance tracking)
3. `stop.js` (State persistence)
4. `background-monitor.js` (Quota + Compliance)

### Step 3: Update settings.local.json

Add hooks configuration to existing permissions

### Step 4: Test Individual Hooks

```bash
# Test session-start hook
node /Users/ktseng/.claude/hooks/session-start.js test-session-123

# Test post-tool-use hook
node /Users/ktseng/.claude/hooks/post-tool-use.js Read '{"success":true}' 1234

# Test stop hook
node /Users/ktseng/.claude/hooks/stop.js test-session-123
```

### Step 5: Integration Testing

1. Start new Claude Code session
2. Verify Router initialization in logs
3. Execute some tools (Read, Edit, Bash)
4. Verify performance tracking in state files
5. End session
6. Verify evolution state saved to MCP Memory

### Step 6: Monitor and Iterate

1. Review quota logs
2. Check evolution dashboard snapshots
3. Analyze learned patterns
4. Tune background monitoring intervals

---

## Success Criteria

✅ **Autonomous Operation**:
- Router initializes automatically on session start
- Background monitoring runs without blocking main dialogue
- No explicit user invocation required

✅ **Continuous Learning**:
- Performance metrics tracked for every tool execution
- Patterns learned after sufficient observations
- Patterns persisted across sessions via MCP Memory

✅ **Proactive Monitoring**:
- Quota warnings before 80% consumption
- Evolution dashboard updates every 30 minutes
- Compliance violations detected and reported

✅ **Full Architecture Integration**:
- All 22 agents configured with evolution
- 5-layer routing system accessible via hooks
- No simplification or reduction of existing design

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Hook execution overhead | Medium | Low | Use async operations, non-blocking monitoring |
| MCP Memory quota limits | Low | Medium | Implement pattern pruning, keep top N patterns |
| Background process crashes | Low | High | Error handling, restart logic, state persistence |
| Import path issues (ESM) | Medium | Medium | Use absolute paths, verify imports in testing |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Too many notifications | Medium | Low | Configure log levels, batch notifications |
| Performance degradation | Low | High | Profile hook execution time, optimize critical path |
| Unexpected behavior | Medium | Medium | Comprehensive testing, gradual rollout |

---

## Alternatives Considered

### Alternative 1: Pure MCP Server (REJECTED)

**Why Rejected**: User explicitly stated "making smart-agents a pure mcp is making it useless"

**Problem**: MCP servers are request-response only, cannot work proactively

### Alternative 2: Simplified Agent Definitions (REJECTED)

**Why Rejected**: User explicitly stated "smart-agents features are not just these, i want full use of the design"

**Problem**: Lost sophisticated multi-model routing, evolution system, and 22 specialized agents

### Alternative 3: Claude Code Hooks + Full Architecture (SELECTED)

**Why Selected**:
- Leverages Claude Code native capabilities (hooks, background execution)
- Preserves full sophisticated smart-agents design (5 layers, evolution, 22 agents)
- Enables autonomous proactive operation
- No reduction or simplification

---

## Open Questions

1. **MCP Memory Quota**: How many learned patterns can we store before hitting limits?
   - **Proposed**: Implement top-N pruning (keep 100 best patterns per agent)

2. **Background Process Lifecycle**: Should background monitoring stop with session or persist?
   - **Proposed**: Stop with session, restart on next session start

3. **Tool-to-Agent Mapping**: How to infer which agent executed each tool?
   - **Proposed**: Heuristic mapping (Read → research-agent, Edit → code-reviewer, etc.)

4. **Evolution Dashboard Access**: How should user access evolution dashboard?
   - **Proposed**: Slash command `/evolution-dashboard` or auto-show on session end

---

## Next Steps (Pending Your Review)

1. ✅ Review this plan
2. ⏸️ Approve or request modifications
3. ⏸️ Implement hooks scripts (Phase 2)
4. ⏸️ Update settings.local.json (Phase 1.1)
5. ⏸️ Test individual hooks (Step 4)
6. ⏸️ Integration testing (Step 5)
7. ⏸️ Monitor and iterate (Step 6)

---

## Conclusion

This plan achieves the user's goal:

> "i want you to research claude code documents and find a way to reduce building with **full use of claude code's native features functions apis** to get smart-agents to work"

By integrating:
- ✅ Claude Code native features (hooks, background execution, MCP Memory)
- ✅ Full smart-agents architecture (5 layers, evolution system, 22 agents)
- ✅ Autonomous proactive operation (no explicit invocation needed)
- ✅ Continuous learning across sessions
- ✅ Compliance monitoring (CLAUDE.md rules)

**No reduction. No simplification. Full use of existing sophisticated design.**
