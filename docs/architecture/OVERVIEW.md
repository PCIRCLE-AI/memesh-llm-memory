# Smart Agents - System Architecture

**Version**: 3.0.0 (Simplified Claude-Only + Event-Driven)
**Last Updated**: 2025-12-29
**Status**: Cleanup Complete, Event-Driven Implementation Pending

---

## Table of Contents

1. [Architecture Philosophy](#architecture-philosophy)
2. [Core Architecture](#core-architecture)
3. [MCP Server Layer](#mcp-server-layer)
4. [Router & Orchestration](#router--orchestration)
5. [Evolution System](#evolution-system)
6. [Agent Registry](#agent-registry)
7. [Event-Driven Capabilities](#event-driven-capabilities)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Testing Strategy](#testing-strategy)

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
- **Agent Count**: 22 specialized agents
- **Learning System**: Real-time performance tracking and pattern recognition

---

## Core Architecture

### Simplified 4-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: MCP Server (User Interface)                        │
│ - Claude Code integration via MCP Protocol                  │
│ - 22 specialized agent tools                                │
│ - RAG agent with file watching                              │
│ - Evolution dashboard                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Router & Orchestration                             │
│ - Task complexity analysis                                  │
│ - Agent selection (22 specialized agents)                   │
│ - Prompt enhancement                                        │
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

Expose Smart Agents functionality to Claude Code via Model Context Protocol.

### Implementation (`src/mcp/server.ts`)

**Key Components**:
- **Router**: Task routing and agent selection
- **ResponseFormatter**: Terminal-friendly output formatting
- **AgentRegistry**: 22 specialized agent metadata
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

### File Watching (RAG)

Automatically indexes files dropped into `~/Documents/smart-agents-knowledge/`:
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

## Agent Registry

### Purpose

Metadata-based registry of 22 specialized agents.

### Implementation (`src/core/AgentRegistry.ts`)

**Agent Categories**:

1. **Development** (9 agents): code-reviewer, test-writer, debugger, refactorer, api-designer, db-optimizer, frontend-specialist, backend-specialist, development-butler

2. **Research** (5 agents): rag-agent, research-agent, architecture-agent, data-analyst, performance-profiler

3. **Knowledge** (1 agent): knowledge-agent

4. **Operations** (2 agents): devops-engineer, security-auditor

5. **Creative** (2 agents): technical-writer, ui-designer

6. **Tools** (2 agents): migration-assistant, api-integrator

7. **General** (1 agent): general-agent

**Agent Metadata**:
```typescript
interface AgentMetadata {
  name: string;           // e.g., "code-reviewer"
  description: string;    // What agent does
  category: AgentCategory;
  capabilities: string[]; // List of capabilities
  complexity: number;     // Preferred complexity range
}
```

**Important**: Agents are **metadata-only**, not separate implementations. The Router uses metadata to enhance prompts sent to Claude API.

---

## Event-Driven Capabilities

### Purpose

Enable autonomous agent activation based on events rather than explicit invocation.

### Implementation Status

⏳ **Planned** - See [CLAUDE_CODE_INTEGRATION_PLAN.md](./CLAUDE_CODE_INTEGRATION_PLAN.md) for details.

### Architecture Overview

**Three Hook Types**:

#### 1. SessionStart Hook
- Initialize Router + Evolution System
- Load saved patterns from MCP Memory
- Start background monitoring (quota, compliance)
- Non-blocking: main dialogue continues

#### 2. PostToolUse Hook
- Track performance after each tool execution
- Detect anomalies (slow, expensive, low quality)
- Learn patterns (every 10 executions)
- Persist to MCP Memory

#### 3. Stop Hook
- Save evolution state
- Generate session summary
- Clean up background processes

### Background Monitoring Tasks

| Task | Interval | Purpose |
|------|----------|---------|
| Quota Check | 10 min | Warn at 80% budget |
| Evolution Dashboard | 30 min | Log learning progress |
| Compliance Check | On tool use | Validate rules (READ_BEFORE_EDIT, etc.) |

### Benefits

- ✨ **Autonomous**: Agents work proactively without manual calls
- ⏱️ **Non-blocking**: Main dialogue continues while agents work in background
- 🤝 **Human-in-the-Loop**: User maintains control and can intervene
- 📊 **Continuous Learning**: Every interaction improves future performance

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

### Pattern 2: Event-Driven (Planned)

```
Claude Code Session Start
    ↓
SessionStart Hook → Initialize Router + Evolution
    ↓
Background: Quota monitoring, Compliance checking
    ↓
User works normally (main dialogue)
    ↓
PostToolUse Hook → Track each tool execution
    ↓
Learn patterns → Persist to MCP Memory
    ↓
Session End → Stop Hook → Save state
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
| Agent metadata | < 1MB | 22 agents |
| Total (typical) | ~20MB | Lightweight |

---

## Future Enhancements

### Planned Features

1. **Event-Driven Hooks** (Next)
   - SessionStart, PostToolUse, Stop hooks
   - Background monitoring
   - Autonomous activation

2. **Pattern Detection & Skill Suggestion**
   - Auto-detect repetitive workflows
   - Suggest skill creation
   - Personalized automation

3. **Advanced Learning**
   - Cross-agent learning (share patterns)
   - User feedback integration
   - A/B testing for optimizations

4. **Enhanced RAG**
   - Multi-source indexing
   - Semantic chunking strategies
   - Query expansion

---

## Related Documentation

- **[Claude Code Integration Plan](./CLAUDE_CODE_INTEGRATION_PLAN.md)** - Event-driven implementation details
- **[Evolution System](../EVOLUTION.md)** - Deep dive into learning system
- **[Setup Guide](../guides/SETUP.md)** - Installation and configuration
- **[README](../../README.md)** - User-facing documentation

---

**Architecture Status**: ✅ Core Stable, ⏳ Event-Driven Pending
