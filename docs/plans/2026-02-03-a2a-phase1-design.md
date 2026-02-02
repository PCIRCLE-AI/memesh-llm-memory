# A2A Protocol Phase 1.0 Design Document

**Date**: 2026-02-03
**Status**: Approved
**Version**: Phase 1.0 (from Phase 0.5)
**Target Coverage**: 80-85% (Balanced TDD)

---

## Executive Summary

This document describes the complete implementation plan for upgrading the A2A (Agent-to-Agent) Protocol from Phase 0.5 (echo-only) to Phase 1.0 (real task execution via MCP Client Delegation).

**Key Decisions**:
- ✅ Task Execution: MCP Client Delegation (not direct Anthropic API)
- ✅ Notification: Polling (5s interval) with Phase 2 WebSocket upgrade path
- ✅ Security: Localhost-only + Token authentication
- ✅ Testing: Balanced TDD (80-85% coverage)
- ✅ Architecture: Minimal Extension (fastest implementation)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Details](#component-details)
3. [Data Flow](#data-flow)
4. [Error Handling](#error-handling)
5. [Testing Strategy](#testing-strategy)
6. [Implementation Plan](#implementation-plan)
7. [Phase Boundaries](#phase-boundaries)

---

## 1. Architecture Overview

### Current State (Phase 0.5)

```
Agent A → a2a-send-task → MeMesh Server → TaskQueue (SQLite)
                                        → TaskExecutor.executeTask()
                                            → generateEchoResponse()
                                            → Returns: "Echo: {message}"
```

**Limitations**:
- ❌ Echo-only responses (no real execution)
- ❌ No MCP Client integration
- ❌ No real task delegation

### Target State (Phase 1.0)

```
┌─────────────────────────────────────────────────────────────┐
│ Agent A (Sender) - MCP Client                               │
│   └─ calls: a2a-send-task                                   │
│       ├─ parameters: agentId, task, priority               │
│       └─ returns: taskId                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP POST
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ MeMesh Server (Executor)                                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ A2AServer (Express.js)                                  ││
│ │   └─ Authentication Middleware (Bearer Token)          ││
│ │   └─ POST /a2a/send-message                            ││
│ └─────────────────────────────────────────────────────────┘│
│                   │                                         │
│                   ↓                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ TaskQueue (SQLite)                                      ││
│ │   └─ createTask() → status: PENDING                    ││
│ └─────────────────────────────────────────────────────────┘│
│                   │                                         │
│                   ↓                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ MCPTaskDelegator (NEW)                                  ││
│ │   ├─ Pending Queue (In-Memory)                         ││
│ │   ├─ addTask(taskId)                                   ││
│ │   ├─ getPendingTasks() → for MCP client polling       ││
│ │   └─ removeTask(taskId) → on completion/failure       ││
│ └─────────────────────────────────────────────────────────┘│
│                   ↑ polling                                 │
└───────────────────┼─────────────────────────────────────────┘
                    │ every 5s
┌───────────────────┼─────────────────────────────────────────┐
│ Agent B (Executor) - MCP Client                            │
│                    │                                        │
│   ┌────────────────↓───────────────────────────────────┐  │
│   │ 1. Poll: a2a-list-tasks                            │  │
│   │    └─ returns: [{ taskId, task, priority }]       │  │
│   └────────────────────────────────────────────────────┘  │
│                    ↓                                        │
│   ┌────────────────────────────────────────────────────┐  │
│   │ 2. Execute: buddy-do <task>                        │  │
│   │    └─ TaskExecutor delegates to MCPTaskDelegator   │  │
│   │    └─ Status: PENDING → IN_PROGRESS                │  │
│   └────────────────────────────────────────────────────┘  │
│                    ↓                                        │
│   ┌────────────────────────────────────────────────────┐  │
│   │ 3. Report: a2a-report-result                       │  │
│   │    ├─ parameters: taskId, result, success         │  │
│   │    └─ Status: IN_PROGRESS → COMPLETED/FAILED      │  │
│   └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Task Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED (success)
       ↘              ↘ FAILED (error)
                      ↘ TIMEOUT (5 min)
```

### Configuration

```bash
# Environment Variables
MEMESH_A2A_TOKEN=<secure-random-token>  # Required
MEMESH_A2A_POLL_INTERVAL=5000           # Optional (ms, default: 5000)
MEMESH_A2A_TASK_TIMEOUT=300000          # Optional (5 min, default: 300000)
```

### Phase 1.0 Constraints

- ✅ Localhost only (127.0.0.1)
- ✅ Single task execution (sequential)
- ✅ Simple token auth
- ✅ Polling-based (5s interval)
- ❌ No concurrent tasks
- ❌ No retry mechanism
- ❌ No WebSocket
- ❌ No remote network

---

## 2. Component Details

### 2.1 MCPTaskDelegator (NEW Component)

**Location**: `src/a2a/delegator/MCPTaskDelegator.ts`

**Purpose**: Manages pending task queue as a bridge between MCP Client and TaskQueue.

**Interface**:
```typescript
interface TaskInfo {
  taskId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  agentId: string;
  createdAt: number;
  status: 'PENDING' | 'IN_PROGRESS';
}

class MCPTaskDelegator {
  private pendingTasks: Map<string, TaskInfo>;
  private taskQueue: TaskQueue;
  private logger: Logger;

  constructor(taskQueue: TaskQueue, logger: Logger);

  // Add task to pending queue
  async addTask(
    taskId: string,
    task: string,
    priority: string,
    agentId: string
  ): Promise<void>;

  // Get pending tasks for MCP Client polling
  async getPendingTasks(agentId: string): Promise<TaskInfo[]>;

  // Mark task as in-progress when execution starts
  async markTaskInProgress(taskId: string): Promise<void>;

  // Remove task from queue on completion/failure
  async removeTask(taskId: string): Promise<void>;

  // Check for timed-out tasks (> 5 minutes)
  async checkTimeouts(): Promise<void>;

  // Get agent health status (last poll time)
  async getAgentHealth(agentId: string): Promise<boolean>;
}
```

**Key Features**:
- In-memory queue (fast access, rebuilt from SQLite on restart)
- Single task execution (Phase 1.0 limitation)
- FIFO order (priority sorting in Phase 2.0)
- Timeout detection (5 minutes default)
- Agent health tracking (last poll timestamp)

**Concurrency Control** (Phase 1.0):
```typescript
async addTask(taskId, task, priority, agentId) {
  // Phase 1.0: Only one task per agent
  if (this.pendingTasks.size >= 1) {
    throw new Error('Agent already processing a task (Phase 1.0 limitation)');
  }

  this.pendingTasks.set(taskId, {
    taskId, task, priority, agentId,
    createdAt: Date.now(),
    status: 'PENDING'
  });

  this.logger.info(`Task added to delegation queue: ${taskId}`);
}
```

**Timeout Handling**:
```typescript
async checkTimeouts() {
  const now = Date.now();
  const timeout = parseInt(process.env.MEMESH_A2A_TASK_TIMEOUT || '300000');

  for (const [taskId, taskInfo] of this.pendingTasks) {
    if (now - taskInfo.createdAt > timeout) {
      this.logger.warn(`Task timeout: ${taskId}`);

      await this.taskQueue.updateTask(taskId, {
        status: TaskStatus.TIMEOUT,
        error: `Task execution timeout (${timeout / 1000}s)`,
        completedAt: now
      });

      this.pendingTasks.delete(taskId);
    }
  }
}
```

---

### 2.2 Modified TaskExecutor

**Location**: `src/a2a/executor/TaskExecutor.ts`

**Changes**: Replace echo-only logic with MCP delegation

**Before (Phase 0.5)**:
```typescript
async executeTask(taskId: string, userMessage: string): Promise<string> {
  const response = this.generateEchoResponse(userMessage);

  await this.taskQueue.updateTask(taskId, {
    status: TaskStatus.COMPLETED,
    result: response
  });

  return response;
}

private generateEchoResponse(userMessage: string): string {
  return `Echo: ${userMessage}\n\n[Phase 0.5 - Simplified executor response. Phase 1 will delegate to MCP client.]`;
}
```

**After (Phase 1.0)**:
```typescript
async executeTask(taskId: string, task: string, agentId: string): Promise<void> {
  // Delegate to MCPTaskDelegator (MCP Client will poll and execute)
  await this.delegator.addTask(taskId, task, 'medium', agentId);

  this.logger.info(`Task delegated to MCP Client: ${taskId}`);

  // Status remains PENDING until MCP Client picks up and executes
}
```

**Key Changes**:
- ❌ Remove `generateEchoResponse()`
- ✅ Add dependency injection for `MCPTaskDelegator`
- ✅ Delegate task execution to MCP Client
- ✅ No direct execution, only queue management

---

### 2.3 New MCP Tool: a2a-report-result

**Location**: `src/mcp/tools/a2a-report-result.ts`

**Purpose**: MCP Client reports task execution result back to MeMesh Server

**Input Schema**:
```typescript
{
  type: 'object',
  properties: {
    taskId: {
      type: 'string',
      description: 'Task ID to report result for'
    },
    result: {
      type: 'string',
      description: 'Execution output or result'
    },
    success: {
      type: 'boolean',
      description: 'Whether execution succeeded (true) or failed (false)'
    },
    error: {
      type: 'string',
      description: 'Error message if success=false (optional)'
    }
  },
  required: ['taskId', 'result', 'success']
}
```

**Implementation**:
```typescript
async function a2aReportResult(input: {
  taskId: string;
  result: string;
  success: boolean;
  error?: string;
}): Promise<ToolResult> {
  const { taskId, result, success, error } = input;

  // Update task status in TaskQueue
  const status = success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
  await taskQueue.updateTask(taskId, {
    status,
    result: success ? result : null,
    error: success ? null : (error || 'Task execution failed'),
    completedAt: Date.now()
  });

  // Remove from MCPTaskDelegator pending queue
  await mcpTaskDelegator.removeTask(taskId);

  logger.info(`Task result reported: ${taskId} (${status})`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ success: true, taskId, status })
    }]
  };
}
```

**Usage in MCP Client**:
```typescript
// Agent B (MCP Client) after executing buddy-do
try {
  const result = await executeBuddyDo(task);
  await tools.a2aReportResult({
    taskId: taskId,
    result: result,
    success: true
  });
} catch (error) {
  await tools.a2aReportResult({
    taskId: taskId,
    result: '',
    success: false,
    error: error.message
  });
}
```

---

### 2.4 Authentication Middleware

**Location**: `src/a2a/server/middleware/auth.ts`

**Purpose**: Validate Bearer token for all A2A endpoints

**Implementation**:
```typescript
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  const validToken = process.env.MEMESH_A2A_TOKEN;

  if (!validToken) {
    logger.error('MEMESH_A2A_TOKEN not configured');
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'TOKEN_NOT_CONFIGURED'
    });
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
  }

  if (token !== validToken) {
    return res.status(401).json({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
  }

  next();
}
```

**Applied to Endpoints**:
- POST `/a2a/send-message` ✅
- GET `/a2a/tasks/:taskId` ✅
- GET `/a2a/tasks` ✅
- POST `/a2a/tasks/:taskId/report-result` ✅ (new)
- POST `/a2a/tasks/:taskId/cancel` ✅

**Token Generation** (setup script):
```typescript
import crypto from 'crypto';

const token = crypto.randomBytes(32).toString('hex');
console.log(`MEMESH_A2A_TOKEN=${token}`);
// Add to .env file
```

---

### 2.5 Modified A2AClient

**Location**: `src/a2a/client/A2AClient.ts`

**Changes**: Add token header to all requests

**Before**:
```typescript
async sendMessage(agentId, userMessage, priority) {
  const response = await fetch(`${this.baseUrl}/a2a/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, userMessage, priority })
  });
  return response.json();
}
```

**After**:
```typescript
async sendMessage(agentId, task, priority) {
  const token = process.env.MEMESH_A2A_TOKEN;

  if (!token) {
    throw new Error('MEMESH_A2A_TOKEN not configured');
  }

  const response = await fetch(`${this.baseUrl}/a2a/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ agentId, task, priority })
  });

  if (response.status === 401) {
    throw new Error('Authentication failed - invalid A2A token');
  }

  return response.json();
}
```

**Apply to all methods**: `getTask()`, `listTasks()`, `cancelTask()`.

---

## 3. Data Flow

### 3.1 Happy Path (成功執行流程)

```
Agent A (MCP Client)
    │
    │ a2a-send-task(agentId: "agent-b", task: "analyze logs")
    ↓
MeMesh Server
    │
    ├─→ A2AServer: POST /a2a/send-message
    │   └─→ authenticateToken() ✓
    │
    ├─→ TaskQueue.createTask()
    │   └─→ SQLite: INSERT (status: PENDING, taskId: "task-123")
    │
    ├─→ MCPTaskDelegator.addTask(task-123)
    │   └─→ In-memory queue: ["task-123"]
    │
    └─→ Response: { taskId: "task-123", status: "PENDING" }

─────────── 5 seconds later ───────────

Agent B (MCP Client)
    │
    │ a2a-list-tasks(agentId: "agent-b")  [Polling every 5s]
    ↓
MeMesh Server
    │
    ├─→ MCPTaskDelegator.getPendingTasks("agent-b")
    │   └─→ Returns: [{ taskId: "task-123", task: "analyze logs" }]
    │
    └─→ Response: [{ taskId: "task-123", ... }]

Agent B (MCP Client)
    │
    ├─→ Execute locally: buddy-do "analyze logs"
    │   └─→ Result: "Found 3 errors in logs..."
    │
    │ a2a-report-result(taskId: "task-123", result: "...", success: true)
    ↓
MeMesh Server
    │
    ├─→ TaskQueue.updateTask(task-123)
    │   └─→ SQLite: UPDATE (status: COMPLETED, result: "...")
    │
    ├─→ MCPTaskDelegator.removeTask(task-123)
    │   └─→ Remove from in-memory queue
    │
    └─→ Response: { success: true }

Agent A (MCP Client)
    │
    │ a2a-get-task(taskId: "task-123")
    ↓
MeMesh Server
    │
    └─→ TaskQueue.getTask(task-123)
        └─→ Returns: { status: "COMPLETED", result: "Found 3 errors..." }
```

### 3.2 Task Timeout Flow

```
Agent B (MCP Client) - 未回應 5 分鐘

MeMesh Server (Background Job - runs every minute)
    │
    ├─→ MCPTaskDelegator.checkTimeouts()
    │   └─→ Find tasks: createdAt < now - 5min
    │
    ├─→ TaskQueue.updateTask(task-123)
    │   └─→ SQLite: UPDATE (status: TIMEOUT, error: "Task timeout")
    │
    └─→ MCPTaskDelegator.removeTask(task-123)
```

### 3.3 Task Failure Flow

```
Agent B (MCP Client)
    │
    ├─→ Execute: buddy-do "invalid command"
    │   └─→ Error: "Command not found"
    │
    │ a2a-report-result(taskId: "task-123", success: false, error: "Command not found")
    ↓
MeMesh Server
    │
    ├─→ TaskQueue.updateTask(task-123)
    │   └─→ SQLite: UPDATE (status: FAILED, error: "...")
    │
    └─→ MCPTaskDelegator.removeTask(task-123)
```

---

## 4. Error Handling

### 4.1 Error Categories

| Error Type | HTTP Code | Error Code | Handling Strategy |
|------------|-----------|------------|-------------------|
| Authentication Failed | 401 | `AUTH_FAILED` | Return error, no retry |
| Network Error | N/A | `NETWORK_ERROR` | Silent retry on next poll |
| Task Timeout | N/A | `TASK_TIMEOUT` | Mark TIMEOUT, remove from queue |
| Task Execution Failed | N/A | `TASK_FAILED` | Mark FAILED, store error |
| Agent Busy | 429 | `AGENT_BUSY` | Return error, suggest retry |
| Agent Offline | N/A | `AGENT_OFFLINE` | Mark in agent registry |

### 4.2 Standardized Error Response

```typescript
{
  success: false,
  error: string,           // Human-readable message
  code: string,            // Machine-readable code
  details?: object,        // Optional debug info
  timestamp: number
}
```

### 4.3 Error Handling Implementations

**Authentication Errors**:
```typescript
// Agent A: Send task with invalid token
try {
  await a2aClient.sendMessage('agent-b', 'task', 'high');
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    logger.error('Invalid A2A token - check MEMESH_A2A_TOKEN');
    throw new Error('A2A authentication failed. Please verify token configuration.');
  }
}
```

**Network Errors**:
```typescript
// Agent B: Polling loop with retry
async function pollingLoop() {
  while (true) {
    try {
      const tasks = await a2aClient.listTasks(agentId);
      // Process tasks...
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.warn('MeMesh Server unreachable, retry in 5s');
        // Continue polling (silent retry)
      } else {
        throw error;
      }
    }

    await sleep(pollInterval);
  }
}
```

**Task Execution Errors**:
```typescript
// Agent B: Execute with error handling
for (const task of pendingTasks) {
  try {
    const result = await executeBuddyDo(task.task);
    await a2aReportResult(task.taskId, result, true);
  } catch (error) {
    logger.error(`Task execution failed: ${task.taskId}`, error);
    await a2aReportResult(task.taskId, '', false, error.message);
  }
}
```

**Timeout Detection**:
```typescript
// Background job (every 1 minute)
setInterval(async () => {
  await mcpTaskDelegator.checkTimeouts();
}, 60000);
```

### 4.4 Phase 1.0 Error Philosophy

**Fail Fast, Fail Visible**:
- ✅ Immediate error reporting
- ✅ Clear error messages with codes
- ✅ Comprehensive logging
- ✅ No silent failures
- ❌ No automatic retry (Phase 2.0)
- ❌ No circuit breaker (Phase 2.0)
- ❌ No exponential backoff (Phase 2.0)

---

## 5. Testing Strategy

### 5.1 Test Pyramid (80-85% Coverage Target)

```
        ┌─────────────┐
        │   E2E (5%)  │  ← Real MCP Client + Server
        │   2-3 tests │
        ├─────────────┤
        │ Integration │  ← Component interaction
        │   (25%)     │     SQLite + HTTP + In-memory
        │  15-20 tests│
        ├─────────────┤
        │   Unit      │  ← Individual functions
        │   (70%)     │     Mocked dependencies
        │  50-60 tests│
        └─────────────┘
```

### 5.2 Test Organization

```
tests/
├── unit/
│   ├── MCPTaskDelegator.test.ts
│   ├── TaskExecutor.test.ts
│   ├── A2AClient.test.ts
│   └── AuthMiddleware.test.ts
├── integration/
│   ├── a2a-send-task.test.ts
│   ├── a2a-polling.test.ts
│   ├── a2a-report-result.test.ts
│   └── timeout-handling.test.ts
└── e2e/
    ├── happy-path.test.ts
    └── failure-scenarios.test.ts
```

### 5.3 TDD Workflow (Red → Green → Refactor)

**Step 1: Write Failing Test (RED)**
```typescript
describe('MCPTaskDelegator', () => {
  it('should add task to pending queue', async () => {
    const delegator = new MCPTaskDelegator(mockQueue, mockLogger);

    await delegator.addTask('task-1', 'test task', 'high', 'agent-1');

    const pending = await delegator.getPendingTasks('agent-1');
    expect(pending).toHaveLength(1);
    expect(pending[0].taskId).toBe('task-1');
  });
});
```

**Step 2: Minimal Implementation (GREEN)**
```typescript
class MCPTaskDelegator {
  async addTask(taskId, task, priority, agentId) {
    this.pendingTasks.set(taskId, { taskId, task, priority, agentId });
  }

  async getPendingTasks(agentId) {
    return Array.from(this.pendingTasks.values());
  }
}
```

**Step 3: Refactor (REFACTOR)**
```typescript
// Add validation, error handling, logging
class MCPTaskDelegator {
  async addTask(taskId, task, priority, agentId) {
    if (this.pendingTasks.size >= 1) {
      throw new Error('Agent busy (Phase 1.0)');
    }
    this.pendingTasks.set(taskId, {
      taskId, task, priority, agentId,
      createdAt: Date.now()
    });
    this.logger.info(`Task added: ${taskId}`);
  }
}
```

### 5.4 Key Test Scenarios

**Unit Tests** (50-60 tests):
- MCPTaskDelegator: add, get, remove, timeout check
- TaskExecutor: delegation logic
- A2AClient: HTTP requests with token
- AuthMiddleware: token validation

**Integration Tests** (15-20 tests):
- Full send-task flow (HTTP + SQLite + Delegator)
- Polling mechanism (MCP Client → Server)
- Report-result flow (update SQLite + remove from queue)
- Timeout detection (mock time advance)

**E2E Tests** (2-3 tests):
- Complete happy path (send → poll → execute → report → retrieve)
- Failure scenarios (timeout, execution error, auth error)

### 5.5 Coverage Enforcement

**vitest.config.ts**:
```typescript
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/types.ts'
      ]
    }
  }
};
```

**CI Enforcement**:
```bash
npm run test:coverage
# Fails if coverage < 80%
```

---

## 6. Implementation Plan

### Phase 1: Foundation (TDD Setup + Core Components)

**Tasks**:
1. Create MCPTaskDelegator with tests (TDD)
2. Modify TaskExecutor with tests (TDD)
3. Add authentication middleware with tests (TDD)
4. Update A2AClient to include token with tests (TDD)

**Estimated**: 4-6 hours

### Phase 2: MCP Tool Integration

**Tasks**:
1. Create a2a-report-result MCP tool with tests (TDD)
2. Update a2a-list-tasks to use MCPTaskDelegator with tests
3. Integration tests for full polling flow

**Estimated**: 3-4 hours

### Phase 3: Error Handling & Timeouts

**Tasks**:
1. Implement timeout detection with tests (TDD)
2. Add background job for timeout checking
3. Comprehensive error handling tests
4. Network error scenarios

**Estimated**: 3-4 hours

### Phase 4: E2E Testing & Documentation

**Tasks**:
1. E2E happy path test
2. E2E failure scenarios test
3. Update documentation (USER_GUIDE.md, COMMANDS.md)
4. Setup instructions (token generation)

**Estimated**: 2-3 hours

**Total Estimated Time**: 12-17 hours

---

## 7. Phase Boundaries

### Phase 1.0 (This Implementation)

**Included**:
- ✅ Real task execution via MCP Client Delegation
- ✅ Polling-based notification (5s interval)
- ✅ Localhost-only security
- ✅ Bearer token authentication
- ✅ Single task execution (sequential)
- ✅ 5-minute timeout detection
- ✅ Comprehensive error handling
- ✅ 80-85% test coverage

**Explicitly Excluded** (Phase 2.0):
- ❌ WebSocket real-time notification
- ❌ Remote network support (beyond localhost)
- ❌ Advanced authentication (OAuth, API keys)
- ❌ Concurrent task execution
- ❌ Task retry mechanism
- ❌ Task priority sorting
- ❌ Agent auto-discovery
- ❌ Task result caching
- ❌ Metrics and monitoring dashboard

### Upgrade Path (Phase 2.0)

**Proposed Enhancements**:
1. Replace polling with WebSocket for real-time notification
2. Add remote network support with TLS encryption
3. Implement concurrent task execution with queue management
4. Add automatic retry with exponential backoff
5. Priority-based task scheduling
6. Dynamic agent discovery and health monitoring
7. Metrics collection and monitoring dashboard

---

## 8. Success Criteria

**Definition of Done**:
- ✅ All tests pass with ≥ 80% coverage
- ✅ Agent A can send tasks to Agent B successfully
- ✅ Agent B polls and executes tasks via buddy-do
- ✅ Results are reported back and retrievable
- ✅ Timeouts are detected and handled correctly
- ✅ Authentication works with token validation
- ✅ All error scenarios are handled gracefully
- ✅ Documentation is complete and accurate
- ✅ Code review passed

**Performance Targets**:
- Task submission: < 100ms
- Polling response: < 50ms
- Result reporting: < 100ms
- Timeout detection: < 60s (background job interval)

---

## Appendix A: Environment Variables

```bash
# Required
MEMESH_A2A_TOKEN=<64-char-hex-token>  # Generated with crypto.randomBytes(32)

# Optional (with defaults)
MEMESH_A2A_POLL_INTERVAL=5000         # Polling interval in ms
MEMESH_A2A_TASK_TIMEOUT=300000        # Task timeout in ms (5 minutes)
MEMESH_A2A_HOST=127.0.0.1             # Localhost only (Phase 1.0)
MEMESH_A2A_PORT=3000                  # Server port
```

---

## Appendix B: API Reference

### POST /a2a/send-message

**Request**:
```json
{
  "agentId": "agent-b",
  "task": "analyze logs",
  "priority": "high"
}
```

**Response**:
```json
{
  "taskId": "task-123",
  "status": "PENDING",
  "createdAt": 1706918400000
}
```

### GET /a2a/tasks?agentId=agent-b

**Response**:
```json
[
  {
    "taskId": "task-123",
    "task": "analyze logs",
    "priority": "high",
    "status": "PENDING",
    "createdAt": 1706918400000
  }
]
```

### POST /a2a/tasks/:taskId/report-result

**Request**:
```json
{
  "result": "Found 3 errors in logs...",
  "success": true
}
```

**Response**:
```json
{
  "success": true,
  "taskId": "task-123",
  "status": "COMPLETED"
}
```

### GET /a2a/tasks/:taskId

**Response**:
```json
{
  "taskId": "task-123",
  "task": "analyze logs",
  "status": "COMPLETED",
  "result": "Found 3 errors in logs...",
  "createdAt": 1706918400000,
  "completedAt": 1706918460000
}
```

---

**Document Status**: ✅ Approved for Implementation
**Next Steps**: Create detailed implementation plan with @writing-plans skill
