# Claude Code Buddy - System Architecture

**Version**: 3.2.0 (Project Memory System Integration)
**Last Updated**: 2025-12-31
**Status**: Production-ready with project memory and accurate agent documentation

---

## Table of Contents

1. [Architecture Philosophy](#architecture-philosophy)
2. [Core Architecture](#core-architecture)
3. [MCP Server Layer](#mcp-server-layer)
4. [Router & Orchestration](#router--orchestration)
5. [Evolution System](#evolution-system)
6. [Workflow Guidance System](#workflow-guidance-system)
7. [Smart-Planning System](#smart-planning-system)
8. [Project Memory System](#project-memory-system)
9. [Agent Registry](#agent-registry)
10. [Event-Driven Capabilities](#event-driven-capabilities)
11. [Data Flow Patterns](#data-flow-patterns)
12. [Testing Strategy](#testing-strategy)

---

## Architecture Philosophy

### Core Design Principles

1. **Simplicity First**: Claude-only architecture eliminates multi-provider complexity
2. **Event-Driven Activation**: Agents activate automatically based on events (via Claude Code hooks)
3. **Self-Learning**: Evolution system continuously optimizes agent performance
4. **Human-in-the-Loop**: Maintain interactive control while agents work in background
5. **Zero Extra Cost**: Use existing Claude API subscription

### Key Metrics

- **Test Coverage**: 377 passing tests across 46 test files
- **Code Quality**: TypeScript with strict type checking
- **Agent Count**: 13 agents (5 real implementations + 7 enhanced prompts + 1 optional)
- **Learning System**: Real-time performance tracking and pattern recognition

---

## Core Architecture

### Simplified 4-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: MCP Server (User Interface)                        │
│ - Claude Code integration via MCP Protocol                  │
│ - 13 agent tools (5 real + 7 enhanced + 1 optional)         │
│ - RAG agent with file watching                              │
│ - Evolution dashboard                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Router & Orchestration                             │
│ - Task complexity analysis                                  │
│ - Agent selection (13 agents: routing + prompts)            │
│ - Prompt enhancement with domain expertise                  │
│ - Cost estimation & budget control                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Evolution System                                   │
│ - PerformanceTracker: Execution metrics                     │
│ - LearningManager: Pattern detection                        │
│ - AdaptationEngine: Apply learned optimizations             │
│ - EvolutionMonitor: Dashboard & reporting                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Claude API Integration                             │
│ - Claude Sonnet 4.5 (primary)                               │
│ - Claude Opus 4.5 (complex tasks)                           │
│ - OpenAI Embeddings (RAG only)                              │
│ - Quota management & cost tracking                          │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Purpose | Key Components | Complexity |
|-------|---------|----------------|------------|
| L4 | User interaction | MCP Server, Agent Tools | Low |
| L3 | Task orchestration | Router, AgentRegistry | Medium |
| L2 | Self-optimization | Evolution System (4 components) | High |
| L1 | API execution | Claude API, Cost Tracker | Low |

---

## MCP Server Layer

### Purpose

Expose Claude Code Buddy functionality to Claude Code via Model Context Protocol.

### Implementation (`src/mcp/server.ts`)

**Key Components**:
- **Router**: Task routing and agent selection
- **ResponseFormatter**: Terminal-friendly output formatting
- **AgentRegistry**: 13 specialized agent metadata
- **SkillManager**: Manage reusable skills
- **UninstallManager**: Cleanup utilities
- **Evolution System**: Performance tracking and learning
- **RAG Agent**: Knowledge retrieval with file watching

**MCP Tools Exposed**:
1. `smart_route_task` - Route task to best agent
2. `smart_route_batch` - Batch task routing
3. `rag_search` - Search knowledge base
4. `rag_index` - Index documents
5. `evolution_dashboard` - View learning progress
6. `skill_list` - List available skills
7. `skill_bundle` - Bundle skills into workflows
8. `get-workflow-guidance` - Get workflow recommendations
9. `get-session-health` - Check session health
10. `reload-context` - Refresh CLAUDE.md context
11. `record-token-usage` - Track token consumption

### File Watching (RAG)

Automatically indexes files dropped into `~/Documents/claude-code-buddy-knowledge/`:
- Supported formats: .md, .txt, .json, .pdf, .docx
- Polling interval: 5 seconds
- Auto-start when RAG is configured

---

## Router & Orchestration

### Purpose

Analyze tasks and route to the most appropriate agent.

### Implementation (`src/orchestrator/router.ts`)

**Core Workflow**:
```typescript
1. analyzeTask(description) → { taskType, complexity, keywords }
2. selectAgent(analysis) → { selectedAgent, reason }
3. enhancePrompt(agent, task) → optimized prompt
4. estimateCost(complexity) → budget check
5. track & learn → evolution system
```

**Agent Selection Logic**:
- Match task type to agent specialization
- Consider complexity level (1-10 scale)
- Check recent agent performance (learning)
- Apply learned patterns if available

### Task Complexity Scale

| Complexity | Description | Example |
|-----------|-------------|---------|
| 1-3 | Simple, straightforward | "List all functions in file X" |
| 4-6 | Medium, requires analysis | "Review code quality of module Y" |
| 7-8 | Complex, multi-step | "Design authentication system" |
| 9-10 | Expert, architectural | "Refactor entire codebase architecture" |

---

## Evolution System

### Purpose

Enable agents to learn from execution and continuously optimize.

### 4-Component Architecture

#### 1. PerformanceTracker (`src/evolution/PerformanceTracker.ts`)

**Tracks**:
- Execution duration
- Success/failure rate
- Quality scores (0-1)
- Cost per execution
- Metadata (task type, agent ID)

**Memory Management**:
- Per-agent limit: 1000 metrics
- Global limit: 10,000 metrics
- LRU eviction when limits reached

#### 2. LearningManager (`src/evolution/LearningManager.ts`)

**Pattern Detection**:
- Minimum observations: 10
- Minimum confidence: 0.6
- Success rate threshold: 0.7
- Failure rate threshold: 0.3

**Pattern Types**:
- **Successful Patterns**: High success rate tasks
- **Failed Patterns**: Consistent failures to avoid
- **Optimization Patterns**: Better approaches discovered

#### 3. AdaptationEngine (`src/evolution/AdaptationEngine.ts`)

**Applies Learned Patterns**:
- Prompt optimization (adjust phrasing)
- Model selection (Sonnet vs Opus)
- Timeout adjustment (based on avg duration)
- Retry strategy (based on failure patterns)

**Learning Rate**: 0.1 (conservative, stable learning)

#### 4. EvolutionMonitor (`src/evolution/EvolutionMonitor.ts`)

**Dashboard Provides**:
- Total executions across all agents
- Average success rate trends
- Agents with learning progress
- Top performing agents
- Learned patterns summary

---

## Workflow Guidance System

### Purpose

Provide intelligent, context-aware recommendations during development workflows, helping maintain code quality and preventing session degradation.

### Components

**SessionTokenTracker** (`src/core/SessionTokenTracker.ts`)
- Tracks token usage with warning (80%) and critical (90%) thresholds
- Real-time monitoring of input/output token consumption
- Automatic alerts when approaching budget limits
- Integration with budget management system

**WorkflowGuidanceEngine** (`src/core/WorkflowGuidanceEngine.ts`)
- Generates intelligent recommendations based on workflow phase
- Context-aware suggestions for development checkpoints
- Priority-based action recommendations (high/medium/low)
- Confidence scoring for each recommendation
- Estimated time for completion

**SessionContextMonitor** (`src/core/SessionContextMonitor.ts`)
- Multi-signal health monitoring combining token usage and quality metrics
- Session status tracking (healthy/warning/critical)
- Warning aggregation and prioritization
- Recommendation synthesis from multiple signals

**ClaudeMdReloader** (`src/mcp/ClaudeMdReloader.ts`)
- Handles CLAUDE.md context refresh via MCP resources/updated
- Cooldown protection (5 minutes between reloads)
- Automatic reload at 90% token threshold
- State management for reload operations

### Integration

**DevelopmentButler Orchestration**:
- Detects workflow checkpoints automatically
- Coordinates between WorkflowGuidanceEngine and SessionContextMonitor
- Triggers CLAUDE.md reload when critical
- Provides unified interface for workflow automation

**MCP Tools Exposed**:
1. `get-workflow-guidance` - Get recommendations for current workflow phase
2. `get-session-health` - Check token usage and session quality
3. `reload-context` - Refresh CLAUDE.md context
4. `record-token-usage` - Track token consumption

### Workflow Phases

1. **idle** - No active work
2. **code-written** - Code changes made
   - Recommendations: Run tests, review changes, check for breaking changes
3. **test-complete** - Tests run and passed
   - Recommendations: Review coverage, commit changes
4. **commit-ready** - Ready to commit
   - Recommendations: Review commit message, run final checks
5. **committed** - Changes committed
   - Recommendations: Push changes, update documentation

### Session Health Monitoring

**Thresholds**:

| Status | Token % | Action |
|--------|---------|--------|
| healthy | < 80% | Continue normally |
| warning | 80-90% | Consider reload soon |
| critical | ≥ 90% | Reload recommended |

**Automatic Actions**:
- 80% threshold: Warning notification
- 90% threshold: Automatic CLAUDE.md reload (if enabled)
- Cooldown protection: 5 minutes between reloads

### Benefits

- ✨ **Context-Aware**: Recommendations adapt to current workflow phase
- 🎯 **Proactive**: Prevents session degradation before it happens
- 📊 **Transparent**: Clear visibility into token usage and session health
- 🔄 **Automated**: CLAUDE.md reload happens automatically when needed
- 🧠 **Learning**: WorkflowGuidanceEngine improves recommendations over time

---

## Smart-Planning System

### Purpose

Generate intelligent implementation plans that combine agent-aware task breakdown, learned patterns from past successes, and TDD-first development workflow.

### Components

**PlanningEngine** (`src/planning/PlanningEngine.ts`)
- Generates implementation plans from feature descriptions
- Integrates with AgentRegistry for agent-aware task breakdown
- Applies learned patterns from LearningManager
- Creates plans with TDD structure (test → fail → implement → pass → commit)

**TaskDecomposer** (`src/planning/TaskDecomposer.ts`)
- Breaks features into bite-sized tasks (2-5 minutes each)
- Identifies dependencies between tasks
- Assigns phases (backend, frontend, testing, documentation)
- Ensures each task is independently testable with TDD workflow

**AgentRegistry Integration**
- Maps task types to appropriate agents based on capabilities
- Security tasks → Security Auditor
- Testing tasks → Test Automator
- Review tasks → Code Reviewer
- API tasks → API Designer
- Frontend tasks → Frontend Developer / UI Designer

**LearningManager Integration**
- Retrieves learned patterns from past successful plans
- Filters patterns by success rate (≥75%), observations (≥5), domain relevance
- Enhances task descriptions with best practices
- Adjusts priorities based on critical patterns
- Adds proven actions to TDD steps

### Integration

**MCP Tool Exposure**:
- `generate-smart-plan` - Generate implementation plan
- Input: featureDescription, requirements, constraints
- Output: Complete plan with tasks, agents, TDD steps, dependencies

**Workflow**:
```
Feature Description → PlanningEngine → TaskDecomposer → Agent Assignment →
Pattern Enhancement → TDD Structure → Complete Plan
```

### Example Plan Output

```markdown
# Feature: Add User Authentication Implementation Plan

**Goal:** Implement secure JWT-based user authentication

**Architecture:** Token-based authentication with bcrypt password hashing

**Tech Stack:** Node.js, JWT, bcrypt, Express

**Tasks:**

1. **Implement JWT token generation** (2-5 minutes, Priority: high)
   - Suggested Agent: backend-developer
   - TDD Steps:
     1. Write test for token generation
     2. Run test (expect fail)
     3. Implement token generation
     4. Run test (expect pass)
     5. Commit token logic
   - Files: Create `src/auth/jwt.ts`, Test `tests/unit/jwt.test.ts`
   - Dependencies: None

2. **Implement token validation** (2-5 minutes, Priority: high)
   - Suggested Agent: backend-developer
   - TDD Steps: [5-step TDD workflow]
   - Files: Modify `src/auth/jwt.ts`, Test `tests/unit/jwt.test.ts`
   - Dependencies: task-1

[Additional tasks...]
```

### Benefits

- 🎯 **Agent-Aware**: Automatically assigns tasks to appropriate agents
- 🧠 **Learning**: Applies successful patterns from past implementations
- ⚡ **Bite-Sized**: Breaks features into 2-5 minute tasks
- ✅ **TDD-First**: Every task follows 5-step TDD workflow
- 🔗 **Dependencies**: Automatic dependency identification and ordering

---

## Project Memory System

### Purpose

Automatic context capture and recall across Claude Code sessions, enabling Claude to remember project-specific work history, code changes, and development decisions.

### Architecture

**Hybrid Tracking Approach**:
1. **Event-Driven Tracking** - Immediate capture of code changes and test results
2. **Token-Based Snapshots** - Periodic context snapshots every 10,000 tokens

### Components

#### ProjectAutoTracker (`src/memory/ProjectAutoTracker.ts`)

**Core Tracking Engine**:
- Records code changes with file lists and session IDs
- Captures test execution results (pass/fail counts)
- Creates periodic token snapshots as backup mechanism
- Deduplication logic prevents duplicate entries within 1-minute windows

**Event Types**:
```typescript
// Code Change
await tracker.recordCodeChange({
  files: ['src/api/users.ts', 'src/models/User.ts'],
  sessionId: 'session-2025-12-31-001'
});

// Test Result
await tracker.recordTestResult({
  passed: 45,
  failed: 0,
  sessionId: 'session-2025-12-31-001'
});

// Token Snapshot (automatic every 10k tokens)
await tracker.checkTokenSnapshot(15000, {
  files: ['src/api/users.ts'],
  tasks: ['Implement user authentication']
});
```

#### ProjectMemoryManager (`src/memory/ProjectMemoryManager.ts`)

**Query Interface**:
- `recallRecentWork(options)` - Retrieve recent development activities
- Type filtering: code_change, test_result, session_snapshot
- Limit control: Default 10 entities, configurable
- Performance: ~20-50ms for 10 entities

**Usage**:
```typescript
// Recall last 10 work items
const memories = await manager.recallRecentWork({ limit: 10 });

// Filter by type
const codeChanges = await manager.recallRecentWork({
  types: ['code_change']
});
```

#### ProjectMemoryCleanup (`src/memory/ProjectMemoryCleanup.ts`)

**Automatic Retention Management**:
- 30-day retention policy (older memories automatically deleted)
- Applies to: code_change, test_result, session_snapshot
- Cascade deletion: Removes observations, tags, and relations
- Recommended execution: Daily or weekly

#### MCP Tool: recall-memory (`src/mcp/tools/recall-memory.ts`)

**Claude Code Integration**:
- Exposed via MCP protocol as `recall-memory` tool
- Parameters: limit (default: 10), query (future: semantic search)
- Returns chronological list of development activities
- Used by Claude to recall "What did we work on yesterday?"

### Data Model

**Entity Types**:

| Type | Purpose | Observations |
|------|---------|-------------|
| `code_change` | Code modifications | Modified files, Timestamp, Session ID |
| `test_result` | Test execution | Pass/fail counts, Timestamp, Session ID |
| `session_snapshot` | Periodic context | Token count, Files, Tasks, Timestamp |

### Storage

**Knowledge Graph Integration**:
- Shares SQLite database with Knowledge Graph agent
- Location: `~/.claude/knowledge-graph.db`
- Entity-observation model for structured storage
- Efficient querying with ORDER BY timestamp DESC

### Performance

**Characteristics**:
- Event recording: ~5-10ms per call
- Token snapshots: ~10-20ms when triggered (< 1ms when no-op)
- Memory recall: ~20-50ms for 10 entities
- Storage growth: ~30-60 entities/day (active development)
- 30-day retention: ~900-1800 entities max, ~2-5 MB database

### Integration Points

**MCP Server**:
- Registers `recall-memory` tool for Claude Code
- Tool handler in `src/mcp/tools/recall-memory.ts`
- Server registration in `src/mcp/server.ts`

**Knowledge Graph**:
- Uses `createEntities` for storing memories
- Uses `searchNodes` for querying
- Shares storage infrastructure

**Claude Code Hooks** (Optional):
- Can be triggered via session hooks for automatic tracking
- Hook-based integration not required (MCP tool is primary interface)

### Testing

**Coverage**:
- 33 tests across 6 test files
- 100% critical path coverage
- Test types: Unit, integration, end-to-end

**Test Files**:
- `ProjectAutoTracker.test.ts` - 16 tests (event/token/dedup logic)
- `ProjectMemoryManager.test.ts` - 4 tests (recall/filtering/limits)
- `ProjectMemoryCleanup.test.ts` - 5 unit tests (deletion/retention)
- `ProjectMemoryCleanup.integration.test.ts` - 3 integration tests
- `integration.test.ts` - 3 tests (end-to-end capture and recall)
- `recall-memory.test.ts` - 2 tests (MCP tool handler)

### Benefits

- 🧠 **Session Continuity** - Claude remembers project work across sessions
- ⚡ **Hybrid Tracking** - Combines event precision with token-based backup
- 🗄️ **Automatic Cleanup** - 30-day retention prevents unbounded growth
- 🔍 **Structured Recall** - Query by type, limit, and timestamp
- 📊 **Low Overhead** - Minimal performance impact (< 10ms per event)
- 🎯 **Development-Focused** - Captures code changes, tests, decisions only

### Documentation

See `docs/PROJECT_MEMORY_SYSTEM.md` for complete implementation details, usage examples, and troubleshooting.

---

## Agent Registry

### Purpose

Metadata-based registry of 13 specialized agents.

### Implementation (`src/core/AgentRegistry.ts`)

**Agent Categories**:

1. **Development** (2 agents): development-butler, code-reviewer

2. **Operations** (2 agents): devops-engineer, security-auditor

3. **Management** (2 agents): project-manager, product-manager

4. **Engineering** (2 agents): data-engineer, ml-engineer

5. **Analysis** (2 agents): architecture-agent, rag-agent

6. **Creative** (1 agent): ui-designer

**Total**: 13 agents

**Agent Types**:
- **5 Real Implementations**: RAG Agent, Evolution System, Knowledge Graph, Development Butler, Test Writer
- **7 Enhanced Prompts**: Code Reviewer, Debugger, Refactorer, API Designer, Research Agent, Architecture Agent, Data Analyst
- **1 Optional Feature**: Knowledge Agent

**Agent Metadata**:
```typescript
interface AgentMetadata {
  name: string;           // e.g., "code-reviewer"
  description: string;    // What agent does
  category: AgentCategory;
  capabilities: string[]; // List of capabilities
  complexity: number;     // Preferred complexity range
  implementationType: 'real' | 'prompt-enhanced'; // NEW: clarity
}
```

**Important**:
- **Prompt-enhanced agents** are metadata + routing logic, not separate autonomous implementations
- The Router uses metadata to generate optimized prompts sent to Claude API
- Real implementations have actual code execution capabilities (RAG search, test generation, etc.)

---

## Event-Driven Capabilities

### Purpose

Enable event-driven prompt recommendations based on detected patterns (NOT autonomous agent activation).

### Implementation Status

> ⚠️ **DEPRECATION NOTICE**
>
> The Hooks system was **never implemented** and was confirmed deprecated on 2025-12-30.
> The following content is kept as **historical reference**, documenting the original design concept.

❌ **NOT IMPLEMENTED** - The Hooks system was never implemented and is now deprecated. Related documents:
- HOOKS_IMPLEMENTATION_GUIDE.md (marked as DEPRECATED)
- CLAUDE_CODE_INTEGRATION_PLAN.md (plan not executed)
- README.md (Hooks section marked as deprecated)

### Architecture Overview [Historical Reference]

**Three Hook Types** (originally planned Claude Code Hooks - not implemented):

#### 1. SessionStart Hook (`~/.claude/hooks/session-start.js`)

**Purpose**: Display recommendations and initialize session state

**Responsibilities**:
- Read `~/.claude/state/recommendations.json` (from previous session)
- Display recommended skills based on detected patterns
- Display warnings (quota usage, slow tools, anomalies)
- Initialize `~/.claude/state/current-session.json` with empty state
- Non-blocking: main dialogue continues immediately

**Example Output**:
```
📚 Based on last work patterns, recommended skills to load:
  - devops-git-workflows (Last execution: 8 Git operations)
  - testing-guide (Last wrote 5 test files)

⚠️ Attention:
  - 2 tools took more than 5 seconds to execute
  - Quota usage: 45% (recommended to monitor)

✅ Session initialized, let's start working!
```

#### 2. PostToolUse Hook (`~/.claude/hooks/post-tool-use.js`)

**Purpose**: Silent observer that detects patterns and anomalies

**Pattern Detection**:
- **READ_BEFORE_EDIT**: Tracks if Read was called before Edit on same file
- **Git Workflows**: Detects Git commit/push/branch operations
- **Frontend Work**: Detects UI/component file modifications
- **Search Patterns**: Detects multiple Grep/Glob calls

**Anomaly Detection**:
- Slow execution (> 5 seconds)
- High token usage (> 10,000 tokens)
- Failures (success: false)
- Quota warnings (> 80% daily limit)

**State Updates**:
- Updates `~/.claude/state/recommendations.json` incrementally
- Appends to `~/.claude/state/current-session.json` tool calls array
- Silent operation (no console output - non-intrusive)

**Stdin Data Format**:
```json
{
  "toolName": "Read",
  "duration": 145,
  "tokensUsed": 3200,
  "success": true,
  "arguments": { "file_path": "/path/to/file" },
  "result": "File content..."
}
```

#### 3. Stop Hook (`~/.claude/hooks/stop.js`)

**Purpose**: Session analysis, recommendation generation, state persistence

**Responsibilities**:
- Analyze tool patterns from `current-session.json`
- Generate skill recommendations based on patterns
- Save recommendations to `~/.claude/state/recommendations.json`
- Update `~/.claude/state/session-context.json` (quota, patterns)
- Display session summary with detected patterns
- Clean up background processes

**Example Output**:
```
📊 Session Summary:
  - Duration: 25 minutes
  - Tool executions: 42 (success: 40, failed: 2)
  - Detected patterns: 3
    ✅ READ_BEFORE_EDIT compliance: 95%
    ✅ Git workflow: feature branch → develop
    ⚠️ 2 slow operations detected

💡 Recommended for next session:
  - @devops-git-workflows (when preparing commits)
  - @system-thinking-examples (for impact analysis)

✅ Session state saved
```

### State File Formats

#### `~/.claude/state/recommendations.json`
```json
{
  "recommendedSkills": [
    {
      "name": "devops-git-workflows",
      "reason": "Last session: 8 Git operations",
      "priority": "high"
    }
  ],
  "detectedPatterns": [
    {
      "description": "Multiple Read before Edit - correct behavior",
      "suggestion": "Continue maintaining READ_BEFORE_EDIT best practice",
      "timestamp": "2025-12-30T10:00:00.000Z"
    }
  ],
  "warnings": [
    "2 tools took more than 5 seconds to execute"
  ],
  "lastUpdated": "2025-12-30T10:00:00.000Z"
}
```

#### `~/.claude/state/current-session.json`
```json
{
  "startTime": "2025-12-30T10:00:00.000Z",
  "toolCalls": [
    {
      "timestamp": "2025-12-30T10:05:00.000Z",
      "toolName": "Read",
      "duration": 145,
      "success": true,
      "tokenUsage": 3200,
      "arguments": {
        "file_path": "/path/to/file"
      }
    }
  ],
  "patterns": []
}
```

#### `~/.claude/state/session-context.json`
```json
{
  "tokenQuota": {
    "used": 45230,
    "limit": 200000
  },
  "learnedPatterns": [
    {
      "type": "READ_BEFORE_EDIT",
      "description": "Multiple Read before Edit is correct behavior",
      "severity": "info"
    }
  ],
  "lastSessionDate": "2025-12-30T10:00:00.000Z"
}
```

### Integration with Skills

**smart-router Skill** (Manual Invocation):
- User invokes: `@smart-router "implement user authentication"`
- Analyzes task dependencies
- Calls `@smart-orchestrator` for dependency graph
- Recommends skills based on task type
- Provides resource estimates

**smart-orchestrator Skill** (Called by smart-router):
- Returns dependency graph
- Suggests execution mode (Sequential/Parallel/Hybrid)
- Identifies resource constraints

**Workflow Example**:
```
1. SessionStart Hook → Display: "Load devops-git-workflows"
2. User: @smart-router "Prepare v2.0 release"
3. smart-router → Calls @smart-orchestrator → Returns execution plan
4. PostToolUse Hook → Silently records each step
5. Stop Hook → Saves learning for next session
```

### Background Monitoring Tasks

| Task | Interval | Purpose |
|------|----------|---------|
| Pattern Detection | Per tool use | Detect READ_BEFORE_EDIT, Git workflows |
| Anomaly Detection | Per tool use | Track slow/expensive/failed operations |
| State Persistence | Per tool use | Update recommendations.json |
| Session Summary | Session end | Generate recommendations for next session |

### Benefits

- ✨ **Observation Mode**: Hooks observe patterns without interrupting workflow
- 🎯 **Personalized Recommendations**: Suggests skills based on actual usage
- 📊 **Continuous Learning**: Every session improves recommendations
- 🔄 **Cross-Session Memory**: Knowledge persists across sessions via MCP Memory
- 🚫 **Non-Intrusive**: PostToolUse runs silently, no console spam
- 🤝 **Human-in-the-Loop**: User manually decides which skills to load

---

## Data Flow Patterns

### Pattern 1: Smart Routing (Current)

```
User Request
    ↓
MCP Server receives task
    ↓
Router analyzes task
    ↓
Router selects best agent (metadata lookup)
    ↓
Router enhances prompt with agent's expertise
    ↓
Send enhanced prompt to Claude API
    ↓
Track performance in Evolution System
    ↓
Return result to user
```

### Pattern 2: Event-Driven (Implemented)

```
Claude Code Session Start
    ↓
SessionStart Hook → Display recommendations from last session
                  → Initialize current-session.json
    ↓
User works normally (main dialogue)
    ↓
Each tool execution → PostToolUse Hook (silent observer)
                    → Detect patterns (READ_BEFORE_EDIT, Git workflows)
                    → Detect anomalies (slow, high tokens, failures)
                    → Update recommendations.json incrementally
    ↓
Session End → Stop Hook → Analyze session patterns
                        → Generate skill recommendations
                        → Save to recommendations.json + session-context.json
                        → Display session summary
    ↓
Next Session Start → SessionStart Hook → Load recommendations → Display to user
```

### Pattern 3: RAG Search

```
User query
    ↓
RAG agent receives request
    ↓
Query embedding (OpenAI)
    ↓
Vector search in ChromaDB
    ↓
Retrieve top-k relevant chunks
    ↓
Return to user with sources
```

---

## Testing Strategy

### Current Coverage

- **46 test files** covering all major components
- **377 passing tests** (2 skipped for optional features)
- **Test types**: Unit, Integration, E2E, Regression

### Key Test Suites

1. **Evolution System** (`src/evolution/evolution.test.ts`)
   - PerformanceTracker metrics collection
   - LearningManager pattern detection
   - AdaptationEngine optimization application
   - EvolutionMonitor dashboard generation

2. **Integration** (`tests/integration/evolution-e2e.test.ts`)
   - Full workflow: Router → Evolution → Learning
   - Agent configuration integration
   - Performance tracking across tasks

3. **Regression** (`tests/regression/evolution-regression.test.ts`)
   - API backward compatibility
   - Data integrity preservation
   - Error handling stability
   - Performance thresholds

### Test Configuration

**Vitest** with:
- Coverage: v8 provider
- Environment: Node.js
- Timeout: 10s per test
- Parallel execution: Enabled (with E2E safety)

---

## Configuration

### Environment Variables

```bash
# Claude API (Required)
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# OpenAI API (RAG only, Optional)
OPENAI_API_KEY=sk-xxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Quota Limits
CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500

# Cost Control
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8

# Logging
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090

# Development
NODE_ENV=production
PORT=3000
```

### Cost Management

**Quota Limits**:
- Daily: 150 requests (configurable)
- Monthly: 4500 requests (configurable)
- Budget: $50/month (configurable)
- Alert: 80% threshold

**Cost Tracking**:
- Every request tracked
- Real-time budget monitoring
- Automatic warnings at threshold
- Monthly usage reports

---

## Performance Characteristics

### Response Times

| Operation | Avg Duration | Notes |
|-----------|--------------|-------|
| Task routing | < 200ms | Complexity analysis + agent selection |
| Batch routing (10 tasks) | < 1000ms | Parallel processing |
| Evolution stats calculation | < 50ms | In-memory aggregation |
| Pattern learning | < 100ms | Every 10 executions |

### Memory Usage

| Component | Memory | Limit |
|-----------|--------|-------|
| Performance metrics | ~10MB | 10,000 metrics global |
| Learned patterns | ~1MB | 50 patterns per agent |
| Agent metadata | < 1MB | 13 agents |
| Total (typical) | ~20MB | Lightweight |

---

## Future Enhancements

### Completed Features

1. ❌ **Event-Driven Hooks** (Planned for 2025-12-29, but not implemented, deprecated on 2025-12-30)
   - SessionStart, PostToolUse, Stop hooks (not implemented)
   - Pattern and anomaly detection (not implemented)
   - Skill recommendation system (not implemented)
   - Cross-session learning (not implemented)

### Planned Features

1. **Pattern Detection Enhancement** (Next)
   - Auto-detect repetitive workflows
   - Suggest skill creation from patterns
   - Automated skill bundling

2. **Advanced Learning**
   - Cross-agent learning (share patterns between agents)
   - User feedback integration
   - A/B testing for optimizations
   - Predictive skill loading

3. **Enhanced RAG**
   - Multi-source indexing (Git, Notion, Confluence)
   - Semantic chunking strategies
   - Query expansion and reranking

---

## Related Documentation

- **[MCP Integration Guide](../MCP_INTEGRATION.md)** - Claude Code integration via MCP (replaces deprecated hooks plan)
- **[Evolution System](../EVOLUTION.md)** - Deep dive into learning system
- **[Setup Guide](../guides/SETUP.md)** - Installation and configuration
- **[README](../../README.md)** - User-facing documentation

---

**Architecture Status**: ✅ Core Stable, ⏳ Event-Driven Pending
