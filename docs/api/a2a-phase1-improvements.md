# A2A Phase 1 Improvements - API Documentation

## Overview

Phase 1 improvements fix critical A2A issues:
1. ✅ State synchronization - task state updates when result is reported
2. ✅ Result querying - query task execution results
3. ✅ Complete state machine - full task lifecycle states

---

## New API Endpoints

### `GET /a2a/tasks/:taskId/result`

Get task execution result.

**Request:**
```http
GET /a2a/tasks/task-123/result
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "taskId": "task-123",
  "state": "COMPLETED",
  "success": true,
  "result": {
    "answer": 4,
    "calculation": "2 + 2 = 4"
  },
  "executedAt": "2026-02-05T10:00:00.000Z",
  "executedBy": "agent-2",
  "durationMs": 150
}
```

**Response (Failure):**
```json
{
  "taskId": "task-123",
  "state": "FAILED",
  "success": false,
  "error": "Division by zero",
  "executedAt": "2026-02-05T10:00:00.000Z",
  "executedBy": "agent-2",
  "durationMs": 50
}
```

### `PATCH /a2a/tasks/:taskId/state`

Update task state.

**Request:**
```http
PATCH /a2a/tasks/task-123/state
Authorization: Bearer <token>
Content-Type: application/json

{
  "state": "COMPLETED",
  "result": {
    "answer": 4
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task state updated to COMPLETED"
}
```

---

## MCP Tools

### `a2a-get-result`

Get task execution result from target agent.

**Input:**
- `targetAgentId` (string, required) - ID of the agent that executed the task
- `taskId` (string, required) - ID of the task to get result for

**Example:**
```typescript
{
  name: 'a2a-get-result',
  arguments: {
    targetAgentId: 'agent-2',
    taskId: 'task-123'
  }
}
```

**Output:**
```
✅ Task Execution Result

Task ID: task-123
State: COMPLETED
Success: true
...
```

---

## Client API

### `A2AClient.getTaskResult()`

Get task execution result.

**Signature:**
```typescript
async getTaskResult(
  targetAgentId: string,
  taskId: string
): Promise<TaskResult>
```

**Returns:** `TaskResult`
```typescript
interface TaskResult {
  taskId: string;
  state: 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  success: boolean;
  result?: unknown;
  error?: string;
  executedAt: string;
  executedBy: string;
  durationMs?: number;
}
```

### `A2AClient.updateTaskState()`

Update task state.

**Signature:**
```typescript
async updateTaskState(
  taskId: string,
  state: TaskState,
  data?: { result?: unknown; error?: string }
): Promise<void>
```

**Example:**
```typescript
// Start working
await client.updateTaskState('task-123', 'WORKING');

// Complete with result
await client.updateTaskState('task-123', 'COMPLETED', {
  result: { answer: 4 }
});

// Fail with error
await client.updateTaskState('task-123', 'FAILED', {
  error: 'Division by zero'
});
```

---

## State Machine

### Valid State Transitions

```
SUBMITTED → WORKING
         → CANCELED

WORKING → COMPLETED
       → FAILED
       → TIMEOUT
       → CANCELED

COMPLETED → (terminal)
FAILED → (terminal)
TIMEOUT → (terminal)
CANCELED → (terminal)
```

### Helper Functions

**`isValidStateTransition(from, to)`**

Check if a state transition is valid.

```typescript
import { isValidStateTransition } from './a2a/types';

isValidStateTransition('SUBMITTED', 'WORKING'); // true
isValidStateTransition('SUBMITTED', 'COMPLETED'); // false (must go through WORKING)
```

**`isTerminalState(state)`**

Check if a state is terminal (no further transitions).

```typescript
import { isTerminalState } from './a2a/types';

isTerminalState('COMPLETED'); // true
isTerminalState('WORKING'); // false
```

---

## Migration Guide

### From Old API

**Old way (state doesn't update):**
```typescript
// Send task
const response = await client.sendMessage(targetId, request);

// ❌ Can't query result
// ❌ State stays SUBMITTED forever
```

**New way (Phase 1):**
```typescript
// Send task
const response = await client.sendMessage(targetId, request);
const taskId = response.taskId;

// Beta: Update to WORKING
await client.updateTaskState(taskId, 'WORKING');

// Beta: Report result (auto-updates to COMPLETED/FAILED)
await handlers.reportResult({
  taskId,
  success: true,
  result: { answer: 4 }
});

// Alpha: Query result
const result = await client.getTaskResult(targetId, taskId);
console.log(result.result); // { answer: 4 }
```

---

## Breaking Changes

None. All changes are backward compatible. Old code continues to work, but won't benefit from new features until updated.

---

## Testing

Run Phase 1 tests:

```bash
# Unit tests
npm test tests/unit/a2a/

# Integration tests
npm test tests/integration/a2a-phase1

# All A2A tests
npm test -- a2a
```
