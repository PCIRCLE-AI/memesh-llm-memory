# Claude Code Buddy (CCB) Architecture Documentation

**Version**: 2.2.0
**Last Updated**: 2025-12-31
**Status**: Production-ready with comprehensive agent system and project memory

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Deep Dive](#component-deep-dive)
4. [Agent System](#agent-system)
5. [Evolution & Learning](#evolution--learning)
6. [Data Flow & Patterns](#data-flow--patterns)
7. [Configuration & Deployment](#configuration--deployment)
8. [Performance & Scaling](#performance--scaling)
9. [Testing Strategy](#testing-strategy)
10. [Related Documentation](#related-documentation)

---

## Overview

### What is Claude Code Buddy (CCB)?

Claude Code Buddy (CCB) is an **MCP (Model Context Protocol) server** that enhances Claude Code with intelligent prompt optimization, task routing, and performance tracking. It transforms Claude Code from a general-purpose AI assistant into a specialized development team with domain expertise.

### Core Value Propositions

- 🎯 **Intelligent Routing** - Automatically routes tasks to the right specialized agent
- ✨ **Prompt Enhancement** - Optimizes prompts with domain expertise and best practices
- 📊 **Cost Tracking** - Monitors costs and performance automatically
- 🧠 **Self-Learning** - Learns from successful patterns over time
- 🔧 **Zero Configuration** - Works out-of-the-box with Claude Code

### Key Metrics

- **Agents**: 18 specialized agents (5 Real Implementation + 12 Enhanced Prompt + 1 Optional)
- **Evolution Configs**: 22 agent evolution configurations (includes 4 planned agents)
- **Test Coverage**: 462/462 tests passing (100%)
- **Response Time**: < 200ms for task routing
- **Memory Footprint**: ~50MB base + agent-specific usage

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code CLI                         │
│                    (Your Development Interface)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ MCP Protocol
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                Claude Code Buddy MCP Server (CCB)               │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ Task Analyzer│───▶│ Agent Router │───▶│Cost Tracker  │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                            │                                    │
│                            ▼                                    │
│              ┌─────────────────────────┐                       │
│              │  18 Specialized Agents  │                       │
│              └─────────────────────────┘                       │
│                            │                                    │
│                     Evolution System                            │
│              ┌─────────────────────────┐                       │
│              │ Performance · Learning  │                       │
│              │  Adaptation · Monitor   │                       │
│              └─────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────┐                   ┌──────────────────┐
│   Real Agents    │                   │ Enhanced Prompts │
│  (5 implements)  │                   │  (12 templates)  │
├──────────────────┤                   ├──────────────────┤
│ • RAG Agent      │                   │ • Code Reviewer  │
│ • Knowledge Graph│                   │ • Debugger       │
│ • Test Writer    │                   │ • Refactorer     │
│ • Dev Butler     │                   │ • API Designer   │
│ • DevOps Engineer│                   │ • Research Agent │
└──────────────────┘                   │ • Architecture   │
                                       │ • Data Analyst   │
                                       │ • Security       │
                                       │ • UI Designer    │
                                       │ • Marketing      │
                                       │ • Product Mgr    │
                                       │ • ML Engineer    │
                                       └──────────────────┘
```

### 4-Layer Design

| Layer | Purpose | Key Components | Complexity |
|-------|---------|----------------|------------|
| **L4: MCP Server** | User interaction | MCP Protocol, Tool Registration | Low |
| **L3: Router & Orchestration** | Task routing | TaskAnalyzer, AgentRouter, CostTracker | Medium |
| **L2: Evolution System** | Self-optimization | PerformanceTracker, LearningManager, AdaptationEngine | High |
| **L1: Agent Execution** | Domain expertise | AgentRegistry, 18 specialized agents | Medium |

---

## Component Deep Dive

### 1. MCP Server Layer (`src/mcp/server.ts`)

**Purpose**: Exposes Claude Code Buddy functionality to Claude Code via Model Context Protocol.

**Key Responsibilities**:
- Register MCP tools for Claude Code integration
- Handle incoming task requests
- Delegate to Router for processing
- Format responses for terminal display

**Exposed MCP Tools**:
1. `smart_route_task` - Route single task to best agent
2. `smart_route_batch` - Batch task routing (optimization)
3. `evolution_dashboard` - View learning progress and metrics
4. `rag_search` - Search knowledge base (RAG agent)
5. `rag_index` - Index documents (RAG agent)

**File**: `src/mcp/server.ts` (500+ lines)

---

### 2. Router & Orchestration Layer

#### 2.1 TaskAnalyzer (`src/orchestrator/TaskAnalyzer.ts`)

**Purpose**: Analyzes task complexity and requirements.

**Analysis Output**:
```typescript
interface TaskAnalysis {
  taskType: string;           // e.g., "code-review", "debugging"
  complexity: number;         // 1-10 scale
  estimatedTokens: number;    // Token usage estimate
  requiredCapabilities: string[];
  keywords: string[];
}
```

**Complexity Scale**:
- 1-3: Simple, straightforward tasks
- 4-6: Medium complexity, requires analysis
- 7-8: Complex, multi-step workflows
- 9-10: Expert-level, architectural decisions

#### 2.2 AgentRouter (`src/orchestrator/AgentRouter.ts`)

**Purpose**: Routes tasks to the most appropriate agent based on analysis.

**Selection Logic**:
1. Match task type to agent specialization
2. Consider complexity level
3. Check agent performance history (learning)
4. Apply learned patterns if available
5. Estimate cost and check budget

**Output**:
```typescript
interface RoutingDecision {
  selectedAgent: string;
  reason: string;
  confidence: number;
  estimatedCost: number;
}
```

#### 2.3 CostTracker (`src/orchestrator/CostTracker.ts`)

**Purpose**: Monitor costs and enforce budget limits.

**Capabilities**:
- Real-time cost tracking per task
- Monthly budget enforcement
- Alert thresholds (80% default)
- Cost reports and analytics

---

### 3. Evolution System Layer

The Evolution System is **not an agent** - it's the infrastructure that makes the agent system learn and improve over time.

#### 3.1 PerformanceTracker (`src/evolution/PerformanceTracker.ts`)

**Purpose**: Tracks metrics for every agent interaction.

**Tracked Metrics**:
```typescript
interface PerformanceMetric {
  agentId: string;
  taskType: string;
  success: boolean;
  durationMs: number;
  cost: number;              // in micro-dollars
  qualityScore: number;      // 0-1 scale
  metadata: Record<string, any>;
}
```

**Storage**: SQLite database with WAL mode (`~/.claude/evolution.db`)

#### 3.2 LearningManager (`src/evolution/LearningManager.ts`)

**Purpose**: Analyzes patterns from historical data.

**Pattern Types**:
- **Successful Patterns**: High success rate approaches
- **Failed Patterns**: Approaches to avoid
- **Optimization Patterns**: Better alternatives discovered

**Thresholds**:
- Minimum observations: 10
- Minimum confidence: 0.6
- Success rate threshold: 0.7

#### 3.3 AdaptationEngine (`src/evolution/AdaptationEngine.ts`)

**Purpose**: Applies learned patterns to improve future routing.

**Adaptations Applied**:
- Prompt optimization (adjust phrasing)
- Model selection (Sonnet vs Opus)
- Timeout adjustment (based on avg duration)
- Retry strategy (based on failure patterns)

#### 3.4 EvolutionMonitor (`src/evolution/EvolutionMonitor.ts`)

**Purpose**: Provides dashboard and reporting.

**Dashboard Metrics**:
- Total executions across all agents
- Average success rate trends
- Top performing agents
- Learned patterns summary
- Cost optimization results

---

### 4. Project Memory System Layer

**Purpose**: Automatic context capture and recall across Claude Code sessions using hybrid event-driven + token-based tracking.

**Architecture**: Hybrid approach combining immediate event capture with periodic token-based snapshots.

**Key Components**:

#### 4.1 ProjectAutoTracker (`src/memory/ProjectAutoTracker.ts`)

**Purpose**: Core tracking engine that records development events.

**Tracking Strategies**:

1. **Event-Driven Tracking** (Immediate):
   - Code changes: Captures file modifications with session context
   - Test results: Records pass/fail counts after test execution
   - Low overhead, high signal-to-noise ratio

2. **Token-Based Snapshots** (Periodic):
   - Triggers every 10,000 tokens
   - Captures session context (files, tasks, token count)
   - Backup mechanism preventing data loss between events

**Event Recording**:
```typescript
// Record code change
await tracker.recordCodeChange({
  files: ['src/api/users.ts', 'src/models/User.ts'],
  sessionId: 'session-2025-12-31-001'
});

// Record test result
await tracker.recordTestResult({
  passed: 45,
  failed: 0,
  sessionId: 'session-2025-12-31-001'
});

// Check for token snapshot
await tracker.checkTokenSnapshot(15000, {
  files: ['src/api/users.ts'],
  tasks: ['Implement user authentication']
});
```

**Deduplication**: Prevents duplicate entries within 1-minute windows based on file lists and test counts.

#### 4.2 ProjectMemoryManager (`src/memory/ProjectMemoryManager.ts`)

**Purpose**: High-level API for querying project memories.

**Query Interface**:
```typescript
interface RecallOptions {
  limit?: number;           // Default: 10
  types?: string[];         // Default: ['code_change', 'test_result', 'session_snapshot']
}

// Recall recent work
const memories = await manager.recallRecentWork({ limit: 10 });

// Filter by type
const codeChanges = await manager.recallRecentWork({
  types: ['code_change']
});
```

**Performance**: ~20-50ms for 10 entities, scales linearly O(n).

#### 4.3 ProjectMemoryCleanup (`src/memory/ProjectMemoryCleanup.ts`)

**Purpose**: Automatic 30-day retention management.

**Cleanup Policy**:
- Memories older than 30 days: Automatically deleted
- Applies to: code_change, test_result, session_snapshot
- Timestamp extraction: From entity observations
- Cascade deletion: Removes observations, tags, and relations

**Execution**:
```typescript
const deletedCount = await cleanup.cleanupOldMemories();
// Returns count of deleted entities
```

**Recommended frequency**: Daily or weekly execution.

#### 4.4 MCP Tool: recall-memory (`src/mcp/tools/recall-memory.ts`)

**Purpose**: Exposes memory recall to Claude Code via MCP protocol.

**Tool Parameters**:
```typescript
{
  limit?: number;      // Max memories to return (default: 10)
  query?: string;      // Search query (placeholder for future)
}
```

**Response Format**:
```typescript
{
  memories: [{
    type: 'code_change' | 'test_result' | 'session_snapshot',
    observations: string[],
    timestamp: string    // ISO 8601
  }]
}
```

**Usage from Claude Code**:
```
User: "What did we work on yesterday?"
→ Claude calls recall-memory tool
→ Receives chronological list of activities
```

**Data Model**:

| Entity Type | Purpose | Observations Format |
|-------------|---------|-------------------|
| `code_change` | Code modifications | Modified files, Timestamp, Session ID |
| `test_result` | Test execution | Pass/fail counts, Timestamp, Session ID |
| `session_snapshot` | Periodic context | Token count, Files, Tasks, Timestamp |

**Storage**: Knowledge Graph (SQLite) - Same database as Knowledge Graph agent (`~/.claude/knowledge-graph.db`).

**Test Coverage**: 33 tests across 6 test files (100% critical path coverage).

**Performance Characteristics**:
- Event recording: ~5-10ms per call
- Token snapshots: ~10-20ms when triggered
- Memory recall: ~20-50ms for 10 entities
- Storage growth: ~30-60 entities/day (active development)
- 30-day retention: ~900-1800 entities max, ~2-5 MB database

**Integration Points**:
- MCP Server: Registers `recall-memory` tool
- Knowledge Graph: Shares storage infrastructure
- Claude Code Hooks: Can be triggered via session hooks (optional)

**Documentation**: See `docs/PROJECT_MEMORY_SYSTEM.md` for complete implementation details.

---

## Agent System

### Agent Classification

Claude Code Buddy has **18 available agents** organized into three types:

#### 1. Real Implementation Agents (5)

These agents have actual code implementations with specialized capabilities:

| Agent | Implementation | Key Features |
|-------|---------------|--------------|
| **RAG Agent** | `src/agents/rag/` | Vector search, document indexing, semantic retrieval |
| **Knowledge Graph** | `src/agents/knowledge-graph/` | Entity relationships, graph queries, knowledge synthesis |
| **Test Writer** | `src/agents/test-writer/` | Automated test generation, TDD workflows, coverage analysis |
| **Development Butler** | `src/agents/dev-butler/` | Event-driven automation, checkpoint detection, workflow integration |
| **DevOps Engineer** | `src/agents/devops/` | CI/CD automation, deployment workflows, monitoring |

#### 2. Enhanced Prompt Agents (12)

These agents are metadata + routing logic that enhance prompts with domain expertise:

| Agent | Domain | Optimization Focus |
|-------|--------|-------------------|
| **Code Reviewer** | Code quality | Security, performance, best practices |
| **Debugger** | Issue resolution | Root cause analysis, systematic debugging |
| **Refactorer** | Code improvement | Design patterns, maintainability, simplification |
| **API Designer** | API development | REST/GraphQL design, documentation |
| **Architecture Agent** | System design | Scalability, patterns, trade-offs |
| **Research Agent** | Technical investigation | Deep research, competitive analysis |
| **Data Analyst** | Data insights | Statistical analysis, visualization |
| **Security Auditor** | Security & compliance | Vulnerability assessment, security auditing |
| **UI Designer** | UI/UX design | User experience, interface design |
| **Marketing Strategist** | Marketing strategy | Brand positioning, growth hacking |
| **Product Manager** | Product strategy | User research, feature prioritization |
| **ML Engineer** | Machine learning | Model training, ML pipeline engineering |

#### 3. Optional Features (1)

| Feature | Purpose | Requirement |
|---------|---------|-------------|
| **Knowledge Synthesis** | Cross-agent learning | Enable with feature flag |

### Agent Registry (`src/core/AgentRegistry.ts`)

**Purpose**: Central metadata registry for all agents.

**Metadata Structure**:
```typescript
interface AgentMetadata {
  name: string;
  description: string;
  classification: AgentClassification;  // REAL_IMPLEMENTATION | ENHANCED_PROMPT | OPTIONAL_FEATURE
  capabilities: string[];
  complexity: number;
}
```

**Agent Categories** (for organization):
- Development (2 agents)
- Operations (2 agents)
- Management (2 agents)
- Engineering (2 agents)
- Analysis (2 agents)
- Creative (1 agent)

### Evolution Configuration

The Evolution System tracks **22 agent evolution configurations**, including:
- 18 currently available agents
- 4 planned future agents (`api-integrator`, `db-optimizer`, `frontend-specialist`, `backend-specialist`)

This allows the evolution system to start collecting data for agents that will be added in future versions.

---

## Evolution & Learning

### Learning Workflow

```
User Request
    ↓
Agent Executes Task
    ↓
PerformanceTracker Records Metrics
    ↓
(After 10+ observations)
LearningManager Detects Patterns
    ↓
AdaptationEngine Applies Optimizations
    ↓
Future Routing Improved
```

### Pattern Detection Example

**Scenario**: Code review tasks

**Initial Performance**:
- Agent: code-reviewer
- Avg duration: 5000ms
- Success rate: 70%
- Cost: $0.05 per task

**After 50 Executions**:
- Pattern detected: "Security-focused reviews take longer but have higher quality"
- Adaptation: Increase timeout for security reviews
- New performance: 90% success rate, better quality scores

### Cross-Session Learning

**Storage**: All learning persists in SQLite database
**Benefit**: Knowledge carries over across Claude Code sessions
**Reset**: Can be cleared with `evolution_dashboard` tool

---

## Data Flow & Patterns

### Pattern 1: Standard Task Routing

```
1. User: "Review this code for security issues"
   ↓
2. MCP Server receives request
   ↓
3. TaskAnalyzer: { taskType: "code-review", complexity: 6, keywords: ["security"] }
   ↓
4. AgentRouter: selects "code-reviewer" agent
   ↓
5. Router enhances prompt with code review best practices
   ↓
6. Send to Claude API with enhanced prompt
   ↓
7. PerformanceTracker records: { success: true, duration: 4500ms, cost: $0.04 }
   ↓
8. Return result to user
```

### Pattern 2: Batch Routing

```
1. User submits 10 tasks at once
   ↓
2. TaskAnalyzer processes all 10 in parallel
   ↓
3. AgentRouter selects best agent for each
   ↓
4. Group by agent type for optimization
   ↓
5. Execute in optimal order
   ↓
6. Track performance for all
   ↓
7. Return all results
```

### Pattern 3: RAG Search

```
1. User: "Search for authentication patterns"
   ↓
2. RAG Agent receives request
   ↓
3. Generate query embedding (OpenAI)
   ↓
4. Vector search in knowledge base
   ↓
5. Retrieve top-5 relevant chunks
   ↓
6. Format with source citations
   ↓
7. Return to user
```

---

## Configuration & Deployment

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Optional - RAG Features
OPENAI_API_KEY=sk-xxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Cost Control
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8

# Quota Limits
CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500

# Logging
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Installation

**Via Claude Code** (Recommended):
```
"Install Claude Code Buddy MCP from https://github.com/PCIRCLE-AI/claude-code-buddy"
```

Claude Code handles:
- Repository cloning
- Dependency installation
- MCP server configuration
- Optional feature setup
- Verification

**Manual Installation**:
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy
cd claude-code-buddy
npm install
npm run mcp
```

### Deployment Considerations

**Production Checklist**:
- ✅ Set ANTHROPIC_API_KEY
- ✅ Configure budget limits
- ✅ Enable logging
- ✅ Set up evolution database path
- ✅ (Optional) Configure RAG with OPENAI_API_KEY

---

## Performance & Scaling

### Response Time Targets

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| Task routing | < 100ms | 50ms | Analysis + selection |
| Prompt enhancement | < 200ms | 150ms | Template application |
| Batch routing (10 tasks) | < 1000ms | 600ms | Parallel processing |
| Evolution stats | < 50ms | 30ms | In-memory aggregation |
| Pattern learning | < 100ms | 80ms | Every 10 executions |

### Memory Usage

| Component | Memory | Limit | Notes |
|-----------|--------|-------|-------|
| Base system | ~50MB | N/A | Node.js + dependencies |
| Performance metrics | ~10MB | 10,000 metrics | LRU eviction |
| Learned patterns | ~1MB | 50 per agent | JSON storage |
| Agent metadata | < 1MB | 18 agents | Static data |
| **Total (typical)** | **~70MB** | N/A | Lightweight |

### Scaling Considerations

**Current Limitations**:
- Single-node deployment (MCP server)
- SQLite database (not distributed)
- In-memory metrics cache

**Future Scaling Options**:
- PostgreSQL for metrics storage
- Redis for distributed caching
- Horizontal scaling via load balancer
- Cloud deployment (AWS/GCP/Azure)

---

## Testing Strategy

### Test Coverage

```
✅ 462/462 tests passing (100%)
✅ Unit tests for core logic
✅ Integration tests for MCP interface
✅ E2E tests for agent workflows
✅ Regression tests for evolution system
✅ Benchmark tests for performance
```

### Test Organization

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── TaskAnalyzer.test.ts
│   ├── AgentRouter.test.ts
│   └── CostTracker.test.ts
├── integration/            # Integration tests for system flows
│   ├── evolution-e2e.test.ts
│   └── mcp-tools.test.ts
├── regression/             # Regression tests for stability
│   └── evolution-regression.test.ts
├── benchmarks/             # Performance benchmarks
│   └── evolution-performance.bench.ts
└── mcp/                    # MCP-specific tests
    └── evolution-dashboard-tool.test.ts
```

### Test Execution

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# E2E tests (with resource monitoring)
npm run test:e2e:safe

# Benchmarks
npm run bench
```

### Quality Gates

**All PRs must pass**:
- ✅ 100% test pass rate
- ✅ No TypeScript errors
- ✅ ESLint checks pass
- ✅ > 80% code coverage (core logic)

---

## Related Documentation

### Getting Started
- **[README](../README.md)** - User-facing documentation and quick start
- **[Installation Guide](guides/CLAUDE_CODE_INSTALLATION.md)** - Detailed setup instructions
- **[Setup Guide](guides/SETUP.md)** - Configuration and deployment

### Deep Dive
- **[Architecture Overview](architecture/OVERVIEW.md)** - Detailed system design (700+ lines)
- **[Evolution System](EVOLUTION.md)** - Learning and adaptation deep dive
- **[Agent Reference](AGENT_REFERENCE.md)** - All agents explained

### Development
- **[API Documentation](API.md)** - MCP tool interface
- **[Models Guide](MODELS.md)** - AI model selection and usage
- **[RAG Deployment](RAG_DEPLOYMENT.md)** - Setting up RAG features

### Process
- **[Contributing](../CONTRIBUTING.md)** - Development guidelines
- **[Changelog](../CHANGELOG.md)** - Version history

---

## Architecture Principles

### Design Philosophy

1. **Simplicity First**: Prefer simple, maintainable solutions over clever complexity
2. **Incremental Enhancement**: Build on existing capabilities, don't reinvent
3. **Human-in-the-Loop**: AI assists, but humans decide
4. **Cost-Conscious**: Always consider token usage and API costs
5. **Test-Driven**: Every feature has tests before shipping

### Architectural Decisions

**Why MCP?**
- Standard protocol supported by Claude Code
- Enables seamless integration without custom APIs
- Future-proof as more tools adopt MCP

**Why SQLite?**
- Simple, embedded database
- No separate server to manage
- Perfect for single-user deployment
- WAL mode for better concurrency

**Why 18 Agents?**
- Comprehensive coverage of development tasks
- Balance between specialization and simplicity
- Each agent has clear, distinct purpose
- Avoids overwhelming users with too many choices

**Why Evolution System?**
- Learn from experience automatically
- Improve routing without manual tuning
- Cost optimization over time
- Personalized to user's workflow

---

## Version History

- **v2.1.0** (2025-12-30): Agent system refactoring, architectural honesty
- **v2.0.0** (2025-12-29): Evolution system with learning
- **v1.0.0** (2025-12-25): Initial release with basic routing

---

**Architecture Status**: ✅ Production-ready, actively maintained

**Questions?** Open an issue on [GitHub](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
