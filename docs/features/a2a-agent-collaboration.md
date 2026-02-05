# A2A (Agent-to-Agent) Protocol - Phase 2.2

**Status**: Phase 2.2 - Unified Task Board
**Version**: 2.2.0
**Last Updated**: 2026-02-06

---

## Table of Contents

- [Overview](#overview)
- [Unified Task Board (Phase 2.2)](#unified-task-board-phase-22)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [MCP Tools Reference](#mcp-tools-reference)
- [Example Workflows](#example-workflows)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **A2A (Agent-to-Agent) Protocol** enables multiple MeMesh instances to collaborate by delegating tasks to each other. This opens up powerful multi-agent workflows where specialized agents can work together on complex projects.

### What is A2A?

A2A is an HTTP-based protocol that allows AI agents to:

- **Discover** other agents on the local network
- **Send tasks** to other agents for execution
- **Track progress** of delegated tasks
- **Exchange results** through structured artifacts

### Why Use A2A?

**Multi-Agent Collaboration**:
- Distribute workload across multiple Claude instances
- Specialize agents for different domains (frontend, backend, testing, etc.)
- Parallel execution of independent tasks

**Task Delegation**:
- Offload time-consuming tasks to other agents
- Focus on high-priority work while other agents handle routine tasks
- Better resource utilization across multiple machines

**Scalability**:
- Scale horizontally by adding more agents
- Process multiple tasks concurrently
- Avoid single-agent bottlenecks

---

## Unified Task Board (Phase 2.2)

**NEW in Phase 2.2**: The A2A Protocol now includes a **Unified Task Board** for cross-platform task visibility and collaboration.

### What Changed

| Before (Per-Agent) | After (Unified) |
|-------------------|-----------------|
| Separate `a2a-tasks-{agentId}.db` files | Single `task-board.db` |
| Tasks only visible to owning agent | Tasks visible to ALL agents |
| No cross-platform collaboration | Full cross-platform support |
| Random agent IDs per session | Deterministic platform-aware IDs |

### Platform-Aware Agent IDs

Agent IDs are now generated in format: **`hostname-username-platform`**

| Platform | Example Agent ID |
|----------|-----------------|
| Claude Code | `macbook-pro-john-claude-code` |
| ChatGPT | `macbook-pro-john-chatgpt` |
| Gemini | `macbook-pro-john-gemini` |
| Cursor | `macbook-pro-john-cursor` |
| VS Code | `macbook-pro-john-vscode` |

This ensures stable agent identification across sessions - same machine + user + platform always generates the same ID.

### New MCP Tools

| Tool | Description |
|------|-------------|
| `a2a-board` | View unified task board (Kanban-style) with filtering |
| `a2a-claim-task` | Claim a pending task for the current agent |
| `a2a-release-task` | Release a claimed task back to pending |
| `a2a-find-tasks` | Find tasks matching agent skills |
| `a2a-set-skills` | Register skills for skill-based task matching |

### Quick Example

```typescript
// 1. Register your skills
a2a-set-skills({ skills: ["typescript", "testing"] })

// 2. View available tasks
a2a-board({ status: "pending" })

// 3. Find tasks matching your skills
a2a-find-tasks({ skills: ["typescript"], status: "pending" })

// 4. Claim a task
a2a-claim-task({ taskId: "abc12345-..." })

// 5. Complete work, then release if needed
a2a-release-task({ taskId: "abc12345-..." })
```

### Migration from Per-Agent Databases

Existing tasks can be migrated to the unified task board:

```typescript
import { migrateToUnifiedTaskBoard } from './src/a2a/migration/migrateToUnifiedTaskBoard.js';

// Dry-run to preview
const preview = migrateToUnifiedTaskBoard({ dryRun: true });

// Actual migration with backup
const result = migrateToUnifiedTaskBoard({ backup: true });
```

**State Mapping**:
- `SUBMITTED` -> `pending`
- `WORKING` -> `in_progress`
- `COMPLETED`, `FAILED`, `TIMEOUT` -> `completed`
- `CANCELED`, `REJECTED` -> `deleted`

**See**: [Unified Task Board Guide](../a2a/UNIFIED_TASK_BOARD.md) for complete documentation.

---

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    A2A Protocol Ecosystem                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐         HTTP/JSON         ┌──────────────┐
│  │  Agent Alice  │ ─────────────────────────> │  Agent Bob   │
│  │               │ <───────────────────────── │              │
│  │ Port: 3000    │                            │ Port: 3001   │
│  └───────┬───────┘                            └──────┬───────┘
│          │                                           │        │
│          │          ┌─────────────────┐              │        │
│          └─────────>│ Agent Registry  │<─────────────┘        │
│                     │   (SQLite)      │                       │
│                     └─────────────────┘                       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MCP Tools: a2a-send-task, a2a-get-task, a2a-list-*    │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MeMesh installed
- Multiple terminal windows/tabs
- Claude Desktop (or compatible MCP client)

### Step 1: Start Multiple Agents

Each MeMesh instance needs a unique agent ID and will automatically get a port.

**Terminal 1 - Start Alice:**
```bash
export CCB_AGENT_ID="alice"
cd ~/Developer/Projects/claude-code-buddy
npm start
```

Expected output:
```
[A2A Server] Started on port 3000
[Agent Registry] Registered agent: alice at http://localhost:3000
```

**Terminal 2 - Start Bob:**
```bash
export CCB_AGENT_ID="bob"
cd ~/Developer/Projects/claude-code-buddy
npm start
```

Expected output:
```
[A2A Server] Started on port 3001
[Agent Registry] Registered agent: bob at http://localhost:3001
```

### Step 2: Discover Available Agents

In Claude Desktop connected to Alice:

```
Use the a2a-list-agents tool to see available agents
```

Response:
```
🤖 Available A2A Agents (2 total)

1. alice
   URL: http://localhost:3000
   Port: 3000
   Status: active
   Last Heartbeat: 2026-01-31T10:30:00Z

2. bob
   URL: http://localhost:3001
   Port: 3001
   Status: active
   Last Heartbeat: 2026-01-31T10:30:05Z
```

### Step 3: Send a Task to Another Agent

In Claude Desktop (Alice):

```
Use the a2a-send-task tool to send this task to agent "bob":
"Analyze the performance metrics for our API endpoints"
```

Response:
```
✅ Task sent to agent: bob

Task ID: 550e8400-e29b-41d4-a716-446655440000
State: SUBMITTED
Created: 2026-01-31T10:31:00Z

Use 'a2a-get-task' to check task status.
```

### Step 4: Check Task Status

In Claude Desktop (Alice):

```
Use the a2a-get-task tool to check task status for agent "bob" and task ID "550e8400-e29b-41d4-a716-446655440000"
```

Response:
```
📋 Task Details

Task ID: 550e8400-e29b-41d4-a716-446655440000
State: COMPLETED
Created: 2026-01-31T10:31:00Z
Updated: 2026-01-31T10:31:15Z

Messages: 2
Artifacts: 1

Latest Message (assistant):
  Echo: Analyze the performance metrics for our API endpoints

  [Phase 0.5 - Simplified executor response. Phase 1 will delegate to MCP client.]
```

**That's it!** You've successfully delegated a task between two agents.

---

## Task Result Query (Phase 1 Improvement)

Query the execution result of a completed task:

```typescript
// After task is completed, query the result
const result = await client.getTaskResult('agent-2', taskId);

if (result.success) {
  console.log('Result:', result.result);
  console.log('Duration:', result.durationMs, 'ms');
} else {
  console.error('Task failed:', result.error);
}
```

**MCP Tool Usage:**

```
a2a-get-result agent-2 task-123
```

**Response:**
```
✅ Task Execution Result

Task ID: task-123
State: COMPLETED
Success: true
Executed At: 2026-02-05T10:00:00.000Z
Executed By: agent-2
Duration: 150 ms

📦 Result:
{
  "answer": 4,
  "calculation": "2 + 2 = 4",
  "message": "Task completed successfully"
}
```

## Task State Machine (Phase 1 Improvement)

Tasks now follow a complete state machine:

```
SUBMITTED → WORKING → COMPLETED
                   → FAILED
                   → TIMEOUT
           → CANCELED
```

**State Transitions:**
- `SUBMITTED`: Initial state when task is created
- `WORKING`: Agent has started processing the task
- `COMPLETED`: Task completed successfully
- `FAILED`: Task failed with error
- `TIMEOUT`: Task exceeded time limit
- `CANCELED`: Task was canceled

**Updating Task State:**

```typescript
// When starting work on a task
await client.updateTaskState(taskId, 'WORKING');

// When completing successfully
await client.updateTaskState(taskId, 'COMPLETED', {
  result: { answer: 4 }
});

// When failing
await client.updateTaskState(taskId, 'FAILED', {
  error: 'Division by zero'
});
```

---

## Architecture

### Components

The A2A Protocol implementation consists of several key components:

#### 1. Agent Registry

**Purpose**: Centralized registry of all active agents.

**Storage**: SQLite database (`~/.claude-code-buddy/a2a-registry.db`)

**Schema**:
```sql
CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  port INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  last_heartbeat TEXT,
  capabilities TEXT  -- JSON
);
```

**Key Methods**:
- `register(agentId, baseUrl, port)` - Register new agent
- `listActive()` - Get all active agents
- `getAgent(agentId)` - Get specific agent details
- `updateHeartbeat(agentId)` - Update last heartbeat timestamp

#### 2. Task Queue

**Purpose**: Store tasks for each agent.

**Storage**: Per-agent SQLite database (`~/.claude-code-buddy/a2a-tasks-{agentId}.db`)

**Schema**:
```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  name TEXT,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  session_id TEXT,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Messages table (task conversation history)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Artifacts table (task outputs)
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content BLOB NOT NULL,
  encoding TEXT DEFAULT 'utf-8',
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**Task States**:
- `SUBMITTED` - Task received, waiting to start
- `WORKING` - Task is being processed
- `INPUT_REQUIRED` - Task needs additional input (not yet implemented)
- `COMPLETED` - Task finished successfully
- `FAILED` - Task execution failed
- `CANCELED` - Task was canceled
- `REJECTED` - Task was rejected (not yet implemented)

#### 3. A2A HTTP Server

**Purpose**: Expose A2A protocol endpoints via HTTP.

**Technology**: Express.js

**Base Path**: `/a2a`

**Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/a2a/agent-card` | Get agent capabilities |
| POST | `/a2a/send-message` | Send message to create/update task |
| GET | `/a2a/tasks/:taskId` | Get task details |
| GET | `/a2a/tasks` | List tasks (with filters) |
| POST | `/a2a/tasks/:taskId/cancel` | Cancel task |

**Example Agent Card Response**:
```json
{
  "name": "alice",
  "version": "1.0.0",
  "capabilities": {
    "acceptsMessages": true
  }
}
```

#### 4. A2A HTTP Client

**Purpose**: Send requests to other agents' A2A servers.

**Key Methods**:
- `sendMessage(targetAgentId, request)` - Send task message
- `getTask(targetAgentId, taskId)` - Get task status
- `listTasks(targetAgentId, filters)` - List agent's tasks
- `cancelTask(targetAgentId, taskId)` - Cancel task

**Agent Discovery**:
The client queries the Agent Registry to resolve agent IDs to base URLs:
```typescript
const agent = registry.getAgent(targetAgentId);
const response = await fetch(`${agent.baseUrl}/a2a/tasks/${taskId}`);
```

#### 5. Task Executor

**Purpose**: Process tasks in the background.

**Phase 0.5 Behavior**:
- Accepts tasks from task queue
- Generates echo responses (simplified)
- Creates response artifacts
- Updates task state to COMPLETED

**Phase 1 Upgrade**:
- Will delegate tasks to connected MCP client (Claude Code/Claude Desktop)
- Will support streaming responses via MCP Protocol
- Will handle tool calls and multi-turn conversations through MCP

#### 6. MCP Tool Handlers

**Purpose**: Expose A2A functionality through MCP tools.

**Integration Points**:
- `ToolDefinitions.ts` - Define tool schemas
- `ToolRouter.ts` - Route tool calls to handlers
- `A2AToolHandlers.ts` - Implement tool logic

---

## MCP Tools Reference

### a2a-send-task

**Description**: Send a task to another A2A agent for execution.

**Input Schema**:
```typescript
{
  targetAgentId: string;      // Required - ID of target agent
  taskDescription: string;    // Required - Task description
  priority?: string;          // Optional - 'low' | 'normal' | 'high' | 'urgent'
  sessionId?: string;         // Optional - Session tracking ID
  metadata?: object;          // Optional - Additional metadata
}
```

**Example Usage**:
```
Use a2a-send-task with:
- targetAgentId: "bob"
- taskDescription: "Generate API documentation for UserService"
- priority: "high"
```

**Response**:
```
✅ Task sent to agent: bob

Task ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
State: SUBMITTED
Priority: high
Created: 2026-01-31T10:45:00Z
```

**Annotations**:
- `readOnlyHint: false` - Creates new tasks
- `destructiveHint: false` - Non-destructive operation
- `idempotentHint: false` - Each call creates a new task
- `openWorldHint: true` - Can handle various task types

---

### a2a-get-task

**Description**: Get task status and details from another A2A agent.

**Input Schema**:
```typescript
{
  targetAgentId: string;  // Required - Agent that owns the task
  taskId: string;         // Required - Task ID to retrieve
}
```

**Example Usage**:
```
Use a2a-get-task with:
- targetAgentId: "bob"
- taskId: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
```

**Response**:
```
📋 Task Details

Task ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
State: COMPLETED
Description: Generate API documentation for UserService
Priority: high
Created: 2026-01-31T10:45:00Z
Updated: 2026-01-31T10:46:30Z

Messages: 2
Artifacts: 1

Latest Message (assistant):
  [Task completion message]
```

**Annotations**:
- `readOnlyHint: true` - Read-only operation
- `destructiveHint: false`
- `idempotentHint: true` - Same query returns same result
- `openWorldHint: false` - Requires specific task ID

---

### a2a-list-tasks

**Description**: List own tasks (tasks assigned to this agent).

**Input Schema**:
```typescript
{
  state?: string;    // Optional - Filter by state
  limit?: number;    // Optional - Max results (1-100)
  offset?: number;   // Optional - Skip N tasks
}
```

**Valid States**:
- `SUBMITTED`
- `WORKING`
- `INPUT_REQUIRED`
- `COMPLETED`
- `FAILED`
- `CANCELED`
- `REJECTED`

**Example Usage**:
```
Use a2a-list-tasks with:
- state: "COMPLETED"
- limit: 10
```

**Response**:
```
📋 Own Tasks (3 total)

1. [COMPLETED] 7c9e6679-7425-40de-944b-e07fc1f90ae7
   Name: N/A
   Priority: high
   Messages: 2 | Artifacts: 1
   Created: 2026-01-31T10:45:00Z

2. [COMPLETED] 550e8400-e29b-41d4-a716-446655440000
   Name: N/A
   Priority: normal
   Messages: 2 | Artifacts: 1
   Created: 2026-01-31T10:31:00Z

3. [WORKING] 9f6e8400-e29b-41d4-a716-446655440999
   Name: N/A
   Priority: urgent
   Messages: 1 | Artifacts: 0
   Created: 2026-01-31T10:50:00Z
```

**Annotations**:
- `readOnlyHint: true` - Read-only operation
- `destructiveHint: false`
- `idempotentHint: true` - Same query returns same result
- `openWorldHint: false` - Limited to own tasks

---

### a2a-list-agents

**Description**: List available A2A agents in the registry.

**Input Schema**:
```typescript
{
  status?: string;  // Optional - Filter by status ('active' | 'inactive' | 'all')
}
```

**Example Usage**:
```
Use a2a-list-agents with:
- status: "active"
```

**Response**:
```
🤖 Available A2A Agents (3 total)

1. alice
   URL: http://localhost:3000
   Port: 3000
   Status: active
   Last Heartbeat: 2026-01-31T11:00:00Z

2. bob
   URL: http://localhost:3001
   Port: 3001
   Status: active
   Last Heartbeat: 2026-01-31T11:00:05Z

3. charlie
   URL: http://localhost:3002
   Port: 3002
   Status: active
   Last Heartbeat: 2026-01-31T11:00:10Z
```

**Annotations**:
- `readOnlyHint: true` - Read-only operation
- `destructiveHint: false`
- `idempotentHint: true` - Same query returns same result
- `openWorldHint: false` - Returns registered agents only

---

### a2a-report-result

**Description**: Report task execution result back to MeMesh Server. Automatically updates task state to COMPLETED or FAILED.

**Input Schema**:
```typescript
{
  taskId: string;      // Required - Task ID to report result for
  result: string;      // Required - Execution output or result
  success: boolean;    // Required - Whether execution succeeded
  error?: string;      // Optional - Error message if success=false
}
```

**Example Usage (Success)**:
```
Use a2a-report-result with:
- taskId: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
- result: "579"
- success: true
```

**Response**:
```
✅ Task Result Reported

Task ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Status: COMPLETED
Result: 579

Task state has been updated to COMPLETED
```

**Example Usage (Failure)**:
```
Use a2a-report-result with:
- taskId: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
- result: ""
- success: false
- error: "Division by zero error"
```

**Response**:
```
❌ Task Failed

Task ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Status: FAILED
Error: Division by zero error

Task state has been updated to FAILED
```

**Annotations**:
- `readOnlyHint: false` - Updates task state
- `destructiveHint: false` - Non-destructive operation
- `idempotentHint: true` - Same report produces same result
- `openWorldHint: false` - Requires specific task ID

**Behavior**:
- Automatically updates task state to `COMPLETED` (success=true) or `FAILED` (success=false)
- Stores result/error in task data
- Triggers state transition validation
- Updates task `updated_at` timestamp

---

## Example Workflows

### Workflow 1: Simple Task Delegation

**Scenario**: Alice needs to generate test cases but wants Bob to handle it.

**Steps**:

1. **Alice discovers agents**:
   ```
   Use a2a-list-agents
   ```

2. **Alice sends task to Bob**:
   ```
   Use a2a-send-task:
   - targetAgentId: "bob"
   - taskDescription: "Generate unit tests for calculateDiscount() function"
   ```

3. **Bob processes task automatically** (no action needed)

4. **Alice checks completion**:
   ```
   Use a2a-get-task:
   - targetAgentId: "bob"
   - taskId: "[task-id-from-step-2]"
   ```

5. **Alice reviews results** from task artifacts

---

### Workflow 2: Parallel Task Execution

**Scenario**: Alice needs to analyze 3 different datasets concurrently.

**Steps**:

1. **Send tasks in parallel**:
   ```
   Use a2a-send-task to send to "bob": "Analyze dataset A"
   Use a2a-send-task to send to "charlie": "Analyze dataset B"
   Use a2a-send-task to send to "diana": "Analyze dataset C"
   ```

2. **Track all tasks**:
   ```
   Use a2a-get-task for each task ID
   ```

3. **Aggregate results** once all tasks complete

**Benefits**:
- 3x faster than sequential execution
- Each agent works independently
- Results are isolated and traceable

---

### Workflow 3: Specialized Agent Collaboration

**Scenario**: Complex feature implementation requiring frontend + backend + testing.

**Setup**:
- **frontend-agent**: Specialized in React/UI
- **backend-agent**: Specialized in Node.js/API
- **test-agent**: Specialized in testing strategies

**Steps**:

1. **Coordinator (Alice) plans the work**:
   ```
   Use a2a-send-task to "backend-agent": "Implement POST /api/users endpoint"
   Use a2a-send-task to "frontend-agent": "Create UserRegistrationForm component"
   Use a2a-send-task to "test-agent": "Generate E2E tests for user registration flow"
   ```

2. **Each agent executes independently**

3. **Coordinator monitors progress**:
   ```
   Use a2a-get-task for each task
   ```

4. **Integration**: Once all complete, coordinator integrates the components

---

### Workflow 4: Task Status Monitoring

**Scenario**: Long-running tasks that need periodic status checks.

**Steps**:

1. **Send long-running task**:
   ```
   Use a2a-send-task to "bob": "Process 10,000 records from CSV file"
   ```

2. **Poll for status every 30 seconds**:
   ```
   Use a2a-get-task periodically
   ```

3. **React to state changes**:
   - `SUBMITTED` → Task queued
   - `WORKING` → Task in progress
   - `COMPLETED` → Review results
   - `FAILED` → Check error details

---

## Current Limitations

### ~~Unified Task Board~~ (RESOLVED in Phase 2.2)

Previously, each agent had its own database (`a2a-tasks-{agentId}.db`) and tasks were not visible across agents. This is now **resolved** with the unified `task-board.db`.

### Simplified Task Execution

**Current Behavior**:
- Tasks return **echo responses** only
- No actual MCP client delegation
- Response format: `"Echo: [original task description]"`

**Why Echo Only**:
- MeMesh is an MCP Server, not a standalone AI agent
- Tasks should be delegated to connected MCP client (Claude Code/Claude Desktop)
- Current implementation validates A2A Protocol infrastructure without MCP delegation complexity

**Example**:
```
Task: "Analyze API performance"
Response: "Echo: Analyze API performance

[Simplified executor response. Future phase will delegate to MCP client.]"
```

**Coming in Future Phase**:
- MCP client task delegation
- Real task execution through connected Claude client
- Multi-turn conversations via MCP Protocol
- Tool calling support through MCP

---

### Local-Only Communication

**Current Behavior**:
- All agents must be on the **same machine**
- Uses `localhost` networking only
- Ports: 3000-3999 range

**Coming in Phase 2**:
- Cross-machine networking
- Agent discovery across LAN
- Remote agent communication
- NAT traversal support

---

### No Authentication

**Current Behavior**:
- All agents **trust each other** implicitly
- No authentication required
- No authorization checks

**Security Implications**:
- Only suitable for local development
- Do not expose A2A servers to public internet

**Coming in Phase 2**:
- API key authentication
- Agent-to-agent TLS
- Permission-based task delegation
- Audit logging

---

### No Push Notifications

**Current Behavior**:
- Must **poll** for task status updates using `a2a-get-task`
- No real-time notifications
- Inefficient for long-running tasks

**Workaround (Phase 1)**:
- Use `a2a-report-result` to update task state when work completes
- Poll with reasonable intervals (5-10 seconds for active tasks)

**Coming in Phase 2**:
- Server-Sent Events (SSE) for real-time state changes
- WebSocket support for bidirectional communication
- Task completion callbacks
- Auto-polling mechanism with exponential backoff

---

### No Task Cancellation UI

**Current Behavior**:
- Cancel endpoint exists (`POST /a2a/tasks/:taskId/cancel`)
- **Not exposed** via MCP tools yet
- Must use HTTP directly

**Coming in Phase 1**:
- `a2a-cancel-task` MCP tool
- Task lifecycle management UI
- Bulk cancellation support

---

### No Task Priority Enforcement

**Current Behavior**:
- Priority field exists but **not enforced**
- Tasks processed in FIFO order
- No priority queue

**Coming in Phase 1**:
- Priority-based task scheduling
- Urgent tasks jump the queue
- Fair scheduling algorithm

---

## Roadmap

### ✅ Phase 1: Result Query & State Machine (COMPLETED)

**Status**: ✅ Complete (2026-02-05)

**Features Implemented**:
- ✅ Task Result Query API (`getTaskResult()`)
- ✅ Complete State Machine (SUBMITTED → WORKING → COMPLETED/FAILED/TIMEOUT)
- ✅ State Update API (`updateTaskState()`)
- ✅ `a2a-report-result` MCP tool with automatic state updates
- ✅ Security Validations:
  - Response size limit (10MB DoS prevention)
  - Input validation (path traversal protection)
  - Schema validation (type confusion prevention)
- ✅ Integration Tests (280+ assertions)
- ✅ Complete API Documentation

**See**: `docs/api/a2a-phase1-improvements.md` for detailed API reference

---

### ✅ Phase 2.2: Unified Task Board (COMPLETED)

**Status**: ✅ Complete (2026-02-06)

**Features Implemented**:
- ✅ Unified `task-board.db` replacing per-agent databases
- ✅ Platform-aware Agent ID generation (`hostname-username-platform`)
- ✅ Cross-platform task visibility (Claude Code, ChatGPT, Gemini, Cursor, VS Code)
- ✅ New MCP Tools:
  - `a2a-board` - Kanban-style task board view
  - `a2a-claim-task` - Atomic task claiming
  - `a2a-release-task` - Release claimed tasks
  - `a2a-find-tasks` - Skill-based task discovery
  - `a2a-set-skills` - Agent skill registration
- ✅ Migration script from old databases
- ✅ Task history audit trail
- ✅ Agent registry with skills

**See**: `docs/a2a/UNIFIED_TASK_BOARD.md` for detailed guide

---

### Phase 2.3: Event Notifications & Auto-Polling (Next)

**Goal**: Real-time task status updates without manual polling.

**Planned Features**:
- Server-Sent Events (SSE) for task state changes
- WebSocket support for real-time bidirectional communication
- Auto-polling mechanism with exponential backoff
- Task completion callbacks
- Timeout/retry handling with configurable policies
- `a2a-cancel-task` MCP tool

**Timeline**: Q1 2026

---

### Phase 3: Cross-Machine Networking

**Goal**: Enable agents to collaborate across different machines.

**Features**:
- mDNS/Bonjour for agent discovery
- Remote agent communication (HTTP/HTTPS)
- TLS encryption for inter-agent traffic
- API key authentication
- Agent permission system
- Audit logging

**Timeline**: Q2 2026

---

### Phase 4: Advanced Workflows

**Goal**: Support complex multi-agent orchestration.

**Features**:
- Workflow definition language
- Conditional task routing
- Task dependencies and DAGs
- Parallel execution optimization
- Result aggregation strategies
- Workflow monitoring dashboard

**Timeline**: Q3 2026

---

### Phase 5: Enterprise Features

**Goal**: Production-ready multi-agent system.

**Features**:
- Agent clustering and load balancing
- Persistent task storage (PostgreSQL)
- Distributed tracing
- Metrics and observability
- Multi-tenancy support
- High availability (HA) setup

**Timeline**: Q4 2026

---

## Troubleshooting

### Agent Not Appearing in Registry

**Symptoms**:
- `a2a-list-agents` doesn't show an agent
- Agent started but not discoverable

**Solutions**:

1. **Check agent ID is set**:
   ```bash
   echo $CCB_AGENT_ID
   # Should output agent name
   ```

2. **Verify agent is registered**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT * FROM agents WHERE agent_id='alice';"
   ```

3. **Check server logs**:
   - Look for `[A2A Server] Started on port XXXX`
   - Look for `[Agent Registry] Registered agent: alice`

4. **Restart agent**:
   ```bash
   # Stop agent (Ctrl+C)
   # Clear registry entry
   sqlite3 ~/.claude-code-buddy/a2a-registry.db "DELETE FROM agents WHERE agent_id='alice';"
   # Start agent again
   ```

---

### Task Stuck in SUBMITTED State

**Symptoms**:
- Task doesn't transition to WORKING or COMPLETED
- Task remains SUBMITTED for > 5 seconds

**Solutions**:

1. **Check task executor is running**:
   - Look for `[Task Executor]` logs in agent terminal
   - Verify no errors in logs

2. **Query task state**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT id, state, updated_at FROM tasks WHERE id='[task-id]';"
   ```

3. **Restart receiving agent**:
   - Stop and restart the agent that should process the task

---

### Port Already in Use

**Symptoms**:
- Agent fails to start with `EADDRINUSE` error

**Solutions**:

1. **Find process using port**:
   ```bash
   lsof -i :3000
   ```

2. **Kill the process**:
   ```bash
   lsof -ti :3000 | xargs kill -9
   ```

3. **Let auto-assignment work**:
   - A2A server tries ports 3000-3999 automatically
   - Will pick the first available port

---

### Database Locked Error

**Symptoms**:
- `database is locked` error
- SQLite operations fail

**Solutions**:

1. **Stop all agents**:
   ```bash
   # Ctrl+C in each terminal running an agent
   ```

2. **Remove lock files**:
   ```bash
   rm ~/.claude-code-buddy/a2a-*.db-shm
   rm ~/.claude-code-buddy/a2a-*.db-wal
   ```

3. **Restart agents**

---

### Cannot Connect to Agent

**Symptoms**:
- `a2a-send-task` fails with connection error
- "Failed to send task to agent" error

**Solutions**:

1. **Verify target agent is running**:
   ```bash
   curl http://localhost:3001/a2a/agent-card
   # Should return JSON agent card
   ```

2. **Check agent is in registry**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT * FROM agents WHERE agent_id='bob';"
   ```

3. **Verify network connectivity**:
   ```bash
   nc -zv localhost 3001
   # Should show: Connection to localhost port 3001 [tcp/*] succeeded!
   ```

---

## FAQ

**Q: Can I run more than 2 agents?**
A: Yes! The system supports unlimited agents (limited by available ports 3000-3999).

**Q: Do agents need to be the same version?**
A: In Phase 0.5, yes. Protocol compatibility across versions will be added in Phase 2.

**Q: Can I use A2A with multiple Claude Code instances simultaneously?**
A: Yes! Each client can connect to a different agent.

**Q: Where are task artifacts stored?**
A: In SQLite database at `~/.claude-code-buddy/a2a-tasks-{agentId}.db` in the `artifacts` table.

**Q: How do I clear all A2A data?**
A:
```bash
rm -f ~/.claude-code-buddy/a2a-*.db
# Then restart agents
```

**Q: Can agents send tasks to themselves?**
A: Technically yes (use agentId `"self"`), but not recommended. Use regular task execution instead.

---

## Manual Testing Guide

For comprehensive step-by-step testing instructions, see:

📖 **[Phase 0.5 A2A Manual Testing Guide](../testing/phase-0.5-a2a-manual-tests.md)**

Includes:
- Setup instructions
- 5 test scenarios
- Verification commands
- Troubleshooting steps
- Success criteria checklist

---

## Additional Resources

- **A2A Protocol Specification**: [https://a2a-protocol.org/latest/](https://a2a-protocol.org/latest/)
- **Implementation Plan**: `docs/plans/phase-0.5-a2a-protocol.md`
- **Source Code**: `src/a2a/`
- **MCP Tool Handlers**: `src/mcp/handlers/A2AToolHandlers.ts`

---

**Document Version**: 2.2
**Author**: MeMesh Team
**License**: AGPL-3.0
**Phase**: 2.2 (Unified Task Board)

---

## What's New in Phase 2.2

**Unified Task Board** - Cross-platform task visibility and collaboration:

- **Single Database**: Unified `task-board.db` replaces per-agent databases
- **Platform-Aware Agent IDs**: Deterministic IDs (`hostname-username-platform`) for stable identification
- **Cross-Platform Support**: Claude Code, ChatGPT, Gemini, Cursor, VS Code agents all share the same task board
- **New MCP Tools**:
  - `a2a-board` - View all tasks in Kanban-style format
  - `a2a-claim-task` - Claim pending tasks atomically
  - `a2a-release-task` - Release claimed tasks for other agents
  - `a2a-find-tasks` - Find tasks matching agent skills
  - `a2a-set-skills` - Register skills for task matching
- **Migration Script**: Convert old per-agent databases to unified format
- **Task History**: Audit trail for task state changes
- **Agent Registry**: Track agents with platform and skill information

**See**: [Unified Task Board Guide](../a2a/UNIFIED_TASK_BOARD.md) for complete documentation.

---

## What's New in Phase 1.0

- **Task Result Query**: Query execution results of completed tasks with `getTaskResult()` API and `a2a-get-result` MCP tool
- **Complete State Machine**: Full lifecycle management with SUBMITTED - WORKING - COMPLETED/FAILED/TIMEOUT transitions
- **State Update API**: Programmatic state updates with `updateTaskState()` API
- **Enhanced Result Reporting**: `a2a-report-result` automatically updates task state
- **Security Hardening**: Response size limits, input validation, schema validation
- **Comprehensive Testing**: 280+ integration test assertions

---

**Phase 2.2 Complete!** The A2A Protocol now supports unified cross-platform task management. Phase 2.3 will add real-time notifications and auto-polling.
