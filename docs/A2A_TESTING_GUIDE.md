# A2A Communication Testing Guide (Practical Version)

## 📋 Prerequisites Checklist

✅ **Completed Configuration**:
- MeMesh A2A Token: `23a74a1be2320dc507dd3b2a0695d76885a8f15f8066465eeca3cf2dd10ac8a5`
- Task Timeout: 30 seconds
- Poll Interval: 5 seconds
- MCP Server Mode: Enabled

## 🎯 Test Scenario: Session 1 Delegates Task to Session 2

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  A2A Protocol Phase 1.0                  │
│            (MCP Client Delegation Pattern)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────┐                                 │
│  │  Session 1 (Alice) │                                 │
│  │  • Uses a2a-send-task                               │
│  └────────┬───────────┘                                 │
│           │ MCP Tool Call                                │
│           ▼                                              │
│  ┌────────────────────────────────────┐                │
│  │  MCPTaskDelegator (In-Memory)      │                │
│  │  • Task Queue (PENDING → WORKING)  │                │
│  └────────┬───────────────────────────┘                │
│           │ Polling (every 5s)                          │
│           ▼                                              │
│  ┌────────────────────┐                                 │
│  │  Session 2 (Bob)   │                                 │
│  │  1. a2a-list-tasks  │                                 │
│  │  2. Execute task    │                                 │
│  │  3. a2a-report-result│                               │
│  └────────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Testing Steps

### Phase 1: Environment Preparation

#### 1.1 Terminate All Existing Claude Code Sessions

```bash
# Find all MeMesh server processes
ps aux | grep server-bootstrap.js | grep -v grep

# Terminate all MeMesh instances
pkill -f "server-bootstrap.js"

# Verify cleanup is complete
ps aux | grep server-bootstrap.js | grep -v grep  # Should have no output
```

#### 1.2 Start Two New Claude Code Sessions

**Important Note**: You must restart Claude Code to load the latest environment variable configuration!

**Terminal 1 - Session Alice**:
```bash
# Start Claude Code (this will automatically start the MeMesh MCP server)
claude-code
```

**Terminal 2 - Session Bob**:
```bash
# Start another Claude Code session
claude-code
```

---

### Phase 2: Testing Task Sending in Session 1 (Alice)

#### 2.1 Confirm Current Agent ID

Execute in Session 1:
```
Please use the mcp__memesh__a2a-list-agents tool to list all available agents
```

**Expected Output** (assuming both sessions are started):
```json
{
  "agents": [
    {
      "agentId": "ccb-mcp-xxxxx",
      "status": "active",
      "lastHeartbeat": "2026-02-04T01:30:00Z"
    },
    {
      "agentId": "ccb-mcp-yyyyy",
      "status": "active",
      "lastHeartbeat": "2026-02-04T01:30:05Z"
    }
  ]
}
```

**📌 Record Agent IDs**:
- Session 1 (Alice): `ccb-mcp-xxxxx`
- Session 2 (Bob): `ccb-mcp-yyyyy`

#### 2.2 Send Task from Session 1 to Session 2

Execute in Session 1:
```
Please use the mcp__memesh__a2a-send-task tool to send the following task:

{
  "targetAgentId": "ccb-mcp-yyyyy",  // Session 2's agent ID
  "taskDescription": "Please calculate 123 + 456 and report the result",
  "priority": "normal"
}
```

**Expected Output**:
```json
{
  "taskId": "task-abc123def456",
  "status": "PENDING",
  "message": "Task submitted successfully to agent ccb-mcp-yyyyy"
}
```

**📌 Record Task ID**: `task-abc123def456`

---

### Phase 3: Receiving and Executing Task in Session 2 (Bob)

#### 3.1 List Pending Tasks

Execute in Session 2:
```
Please use the mcp__memesh__a2a-list-tasks tool to list my pending tasks:

{
  "state": "SUBMITTED"
}
```

**Expected Output**:
```json
{
  "tasks": [
    {
      "taskId": "task-abc123def456",
      "taskDescription": "Please calculate 123 + 456 and report the result",
      "priority": "normal",
      "status": "SUBMITTED",
      "createdAt": "2026-02-04T01:35:00Z",
      "fromAgentId": "ccb-mcp-xxxxx"
    }
  ]
}
```

#### 3.2 Execute Task (Manual Simulation)

In Session 2:
```
I received the task: "Please calculate 123 + 456 and report the result"

Calculation result: 123 + 456 = 579
```

#### 3.3 Report Task Result

Execute in Session 2:
```
Please use the mcp__memesh__a2a-report-result tool to report task completion:

{
  "taskId": "task-abc123def456",
  "result": "Calculation completed: 123 + 456 = 579",
  "success": true
}
```

**Expected Output**:
```json
{
  "success": true,
  "taskId": "task-abc123def456",
  "status": "COMPLETED",
  "message": "Task result reported successfully"
}
```

---

### Phase 4: Verifying Task Completion in Session 1

#### 4.1 Query Task Status

Execute in Session 1:
```
Please use the mcp__memesh__a2a-get-task tool to query task status:

{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskId": "task-abc123def456"
}
```

**Expected Output**:
```json
{
  "taskId": "task-abc123def456",
  "status": "COMPLETED",
  "result": "Calculation completed: 123 + 456 = 579",
  "success": true,
  "completedAt": "2026-02-04T01:36:00Z"
}
```

---

## 🚨 Common Troubleshooting

### Issue 1: "Unauthorized" Error

**Symptoms**:
```
Error: Unauthorized - Invalid or missing authentication token
```

**Solutions**:
1. Confirm that `.env` file contains `MEMESH_A2A_TOKEN`
2. Restart Claude Code to load environment variables
3. Check that both sessions are using the same token

### Issue 2: Target Agent Not Found

**Symptoms**:
```
Error: Target agent 'ccb-mcp-yyyyy' not found in registry
```

**Solutions**:
1. Use `a2a-list-agents` to confirm agent exists
2. Confirm you're using the correct agent ID (case-sensitive)
3. Confirm the target session's MeMesh server is running

### Issue 3: Task Timeout

**Symptoms**:
```
Error: Task execution timeout (exceeded 30000ms)
```

**Solutions**:
1. Increase `MEMESH_A2A_TASK_TIMEOUT` in `.env`
2. Confirm Session 2 is polling tasks (use `a2a-list-tasks`)
3. Check if Session 2 is running normally

### Issue 4: Task List is Empty

**Symptoms**:
```json
{
  "tasks": []
}
```

**Solutions**:
1. Confirm task was successfully sent (check `a2a-send-task` response)
2. Confirm you're using the correct agent ID
3. Check task state filter (task might already be in COMPLETED state)

---

## 📊 Test Verification Checklist

After testing is complete, confirm all the following items are successful:

**Basic Flow (Phase 0.5+)**:
- [ ] Session 1 can list available agents
- [ ] Session 1 successfully sends task and receives `taskId`
- [ ] Session 2 can list pending tasks
- [ ] Session 2 successfully reports task result
- [ ] Session 1 can query task completion status

**Phase 1.0 Features**:
- [ ] Task Result Query: Can query detailed execution result with `a2a-get-result`
- [ ] State Machine: Task transitions correctly SUBMITTED → WORKING → COMPLETED
- [ ] State Update: Can manually update task state to WORKING
- [ ] Auto State Update: `a2a-report-result` automatically updates state to COMPLETED/FAILED
- [ ] Failure Handling: Failed tasks show state=FAILED with error message
- [ ] Security: Response size limit prevents DoS attacks
- [ ] Security: Input validation blocks path traversal attempts
- [ ] Security: Schema validation prevents type confusion

---

## 🎯 Advanced Test Scenarios

### Scenario 1: Task Result Query (Phase 1.0 Feature)

After task is completed, use the new result query API:

**In Session 1**:
```
Please use the mcp__memesh__a2a-get-result tool to query task result:

{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskId": "task-abc123def456"
}
```

**Expected Output**:
```json
{
  "taskId": "task-abc123def456",
  "state": "COMPLETED",
  "success": true,
  "result": {
    "answer": 579,
    "calculation": "123 + 456 = 579"
  },
  "executedAt": "2026-02-05T10:00:00.000Z",
  "executedBy": "ccb-mcp-yyyyy",
  "durationMs": 150
}
```

**Verification**:
- ✅ Result query works for completed tasks
- ✅ Returns detailed execution metadata
- ✅ Shows execution duration and executor

---

### Scenario 2: Complete State Machine (Phase 1.0 Feature)

Test full state transition: SUBMITTED → WORKING → COMPLETED

**Step 1 - Session 1 sends task**:
```json
{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskDescription": "Calculate Fibonacci(10)",
  "priority": "normal"
}
```
Expected: State = `SUBMITTED`

**Step 2 - Session 2 starts work**:
```
Use mcp__memesh__a2a-update-task-state:
{
  "taskId": "task-xyz789",
  "state": "WORKING"
}
```
Expected: State = `WORKING`

**Step 3 - Session 2 completes work**:
```json
{
  "taskId": "task-xyz789",
  "result": "Fibonacci(10) = 55",
  "success": true
}
```
Expected: State = `COMPLETED` (automatic transition)

**Step 4 - Session 1 verifies**:
```
Use a2a-get-task to confirm state is COMPLETED
```

**Verification**:
- ✅ State transitions: SUBMITTED → WORKING → COMPLETED
- ✅ a2a-report-result automatically updates state
- ✅ Invalid transitions are rejected

---

### Scenario 3: Task Failure Handling

Report failure in Session 2:
```json
{
  "taskId": "task-xyz789",
  "result": "",
  "success": false,
  "error": "Division by zero error"
}
```

**Expected Behavior**:
- Task state updates to `FAILED`
- Error message is stored
- Session 1 can query failure details with `a2a-get-result`

**Verification**:
- ✅ State = `FAILED`
- ✅ Error message preserved
- ✅ Success = false

---

### Scenario 4: Security Validations (Phase 1.0 Feature)

Test security protections added in Phase 1:

#### 4.1 Response Size Limit (DoS Prevention)

Send task with extremely large result (> 10MB):
```json
{
  "taskId": "task-large",
  "result": "[10MB+ data]",
  "success": true
}
```

**Expected**: Error with `RESPONSE_TOO_LARGE` code

#### 4.2 Input Validation (Path Traversal Protection)

Try to query with malicious task ID:
```json
{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskId": "../../../etc/passwd"
}
```

**Expected**: Error with `INVALID_PARAMETER` code

#### 4.3 Schema Validation (Type Confusion Prevention)

Send invalid result format:
```json
{
  "taskId": "task-xyz",
  "result": 12345,  // Should be string
  "success": "yes"  // Should be boolean
}
```

**Expected**: Error with `INVALID_RESPONSE_SCHEMA` code

**Verification**:
- ✅ All security validations working
- ✅ Clear error messages
- ✅ No security vulnerabilities

---

### Scenario 5: Priority Tasks

Send high-priority task:
```json
{
  "targetAgentId": "ccb-mcp-yyyyy",
  "taskDescription": "Urgent: Fix login bug",
  "priority": "urgent"
}
```

---

### Scenario 6: Multiple Concurrent Tasks

Send multiple tasks from Session 1 to different agents to test concurrent processing capabilities.

---

## 📖 Reference Documentation

- **A2A Setup Guide**: `docs/A2A_SETUP_GUIDE.md`
- **A2A Architecture**: `docs/features/a2a-agent-collaboration.md`
- **Commands Reference**: `docs/COMMANDS.md`

---

## 🔄 Cleanup and Reset

Cleanup after testing:

```bash
# 1. Terminate all Claude Code sessions
pkill -f "server-bootstrap.js"

# 2. Clear task queue (if needed)
# Currently Phase 1.0 uses in-memory queue, restart to clear

# 3. Verification check
ps aux | grep server-bootstrap.js | grep -v grep  # Should have no output
```

---

**Testing Time**: Approximately 15-20 minutes (including environment preparation)
**Success Criteria**: Complete execution of Phases 2-4, all step outputs match expectations

Good luck! 🚀
