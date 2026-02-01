# Phase 0.5: A2A Protocol Manual Integration Tests

This document provides step-by-step instructions for manually testing the A2A (Agent-to-Agent) Protocol implementation in Claude Code Buddy Phase 0.5.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Test Scenarios](#test-scenarios)
  - [Scenario 1: Basic Task Delegation](#scenario-1-basic-task-delegation)
  - [Scenario 2: Task Status Tracking](#scenario-2-task-status-tracking)
  - [Scenario 3: Multi-Agent Discovery](#scenario-3-multi-agent-discovery)
  - [Scenario 4: Task Artifact Verification](#scenario-4-task-artifact-verification)
  - [Scenario 5: Concurrent Task Delegation](#scenario-5-concurrent-task-delegation)
- [Verification Commands](#verification-commands)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- Node.js 18+ installed
- Claude Code Buddy installed and configured
- Two separate terminal windows/tabs
- Claude Desktop (or compatible MCP client) installed

### Build the Project

```bash
cd ~/Developer/Projects/claude-code-buddy
npm install
npm run build
```

Verify build succeeded:
```bash
ls -la dist/index.js
# Should show the compiled entry point
```

### Environment Setup

Ensure you have the following:

1. **MCP Configuration**: Claude Desktop configured to use CCB
2. **SQLite**: Available on your system (included in macOS by default)
3. **Network**: Localhost networking enabled (ports 3000-3999 available)

---

## Setup

### Step 1: Prepare Test Environment

Clean up any existing A2A data from previous tests:

```bash
# Remove existing A2A databases
rm -f ~/.claude-code-buddy/a2a-registry.db
rm -f ~/.claude-code-buddy/a2a-tasks-*.db

# Verify cleanup
ls -la ~/.claude-code-buddy/a2a-*.db 2>/dev/null
# Should return: No such file or directory
```

### Step 2: Start Two Claude Code Instances

You'll need two separate Claude Code instances running simultaneously. We'll call them **Alice** and **Bob**.

#### Terminal 1: Start Alice

```bash
# Set agent ID
export CCB_AGENT_ID="alice"

# Start Claude Code Buddy
cd ~/Developer/Projects/claude-code-buddy
npm start
```

**Expected output:**
```
[A2A Server] Started on port 3000
[Agent Registry] Registered agent: alice at http://localhost:3000
```

**Note the port number** - it may differ (3000-3999).

#### Terminal 2: Start Bob

```bash
# Set agent ID
export CCB_AGENT_ID="bob"

# Start Claude Code Buddy
cd ~/Developer/Projects/claude-code-buddy
npm start
```

**Expected output:**
```
[A2A Server] Started on port 3001
[Agent Registry] Registered agent: bob at http://localhost:3001
```

### Step 3: Verify Agent Registration

In a third terminal:

```bash
sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT * FROM agents;"
```

**Expected output:**
```
alice|http://localhost:3000|3000|active|[timestamp]|[capabilities_json]
bob|http://localhost:3001|3001|active|[timestamp]|[capabilities_json]
```

Both agents should be `active` with valid timestamps.

---

## Test Scenarios

### Scenario 1: Basic Task Delegation

**Objective**: Verify that Alice can send a task to Bob and Bob receives it.

#### Step 1.1: Alice Lists Available Agents

In Claude Desktop connected to Alice:

```
Use the a2a-list-agents tool to see available agents
```

**Expected result:**
```
🤖 Available A2A Agents (2 total)

1. alice
   URL: http://localhost:3000
   Port: 3000
   Status: active
   Last Heartbeat: [timestamp]

2. bob
   URL: http://localhost:3001
   Port: 3001
   Status: active
   Last Heartbeat: [timestamp]
```

**Verification:**
- ✅ Both agents listed
- ✅ Status is "active"
- ✅ Heartbeat is recent (within last 60 seconds)

#### Step 1.2: Alice Sends Task to Bob

In Claude Desktop (Alice):

```
Use the a2a-send-task tool to send this task to agent "bob":
"Please analyze the weather forecast for San Francisco this week"
```

**Expected result:**
```
✅ Task sent to agent: bob

Task ID: [uuid-format-id]
State: SUBMITTED
Name: N/A
Priority: N/A
Created: [timestamp]

Use 'a2a-get-task' to check task status.
```

**Verification:**
- ✅ Task ID is a valid UUID
- ✅ Initial state is "SUBMITTED"
- ✅ No errors in output

**Save the Task ID** for next steps.

#### Step 1.3: Bob Receives and Processes Task

In Claude Desktop connected to Bob:

```
Use the a2a-list-tasks tool to see my tasks
```

**Expected result:**
```
📋 Own Tasks (1 total)

1. [COMPLETED] [task-id]
   Name: N/A
   Priority: N/A
   Messages: 2 | Artifacts: 1
   Created: [timestamp]
```

**Verification:**
- ✅ Task appears in Bob's task list
- ✅ Task transitioned to COMPLETED (or WORKING if checked immediately)
- ✅ Has 2 messages (user request + assistant response)
- ✅ Has 1 artifact (response.txt)

#### Step 1.4: Verify Task Completion in Database

```bash
# Check Bob's task database
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT id, state, created_at FROM tasks;"
```

**Expected output:**
```
[task-id]|COMPLETED|[timestamp]
```

---

### Scenario 2: Task Status Tracking

**Objective**: Verify that Alice can track the status of tasks sent to Bob.

#### Step 2.1: Alice Checks Task Status

Using the Task ID from Scenario 1:

In Claude Desktop (Alice):

```
Use the a2a-get-task tool to check task status for agent "bob" and task ID "[task-id-from-scenario-1]"
```

**Expected result:**
```
📋 Task Details

Task ID: [task-id]
State: COMPLETED
Name: N/A
Description: N/A
Priority: N/A
Created: [timestamp]
Updated: [timestamp]

Messages: 2
Artifacts: 1

Latest Message (assistant):
  Echo: Please analyze the weather forecast for San Francisco this week

  [Phase 0.5 - Simplified executor response. Phase 1 will integrate Claude API.]
```

**Verification:**
- ✅ Task state is COMPLETED
- ✅ Shows 2 messages (request + response)
- ✅ Shows 1 artifact
- ✅ Latest message contains echo response
- ✅ Updated timestamp > Created timestamp

#### Step 2.2: Verify Message History

```bash
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT role, content FROM messages WHERE task_id='[task-id]';"
```

**Expected output:**
```
user|Please analyze the weather forecast for San Francisco this week
assistant|Echo: Please analyze the weather forecast for San Francisco this week\n\n[Phase 0.5 - Simplified executor response...]
```

#### Step 2.3: Verify Artifact Created

```bash
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT name, type, encoding FROM artifacts WHERE task_id='[task-id]';"
```

**Expected output:**
```
response.txt|text/plain|utf-8
```

---

### Scenario 3: Multi-Agent Discovery

**Objective**: Verify that new agents are automatically discovered.

#### Step 3.1: Start Third Agent (Charlie)

In a new terminal:

```bash
export CCB_AGENT_ID="charlie"
cd ~/Developer/Projects/claude-code-buddy
npm start
```

**Expected output:**
```
[A2A Server] Started on port 3002
[Agent Registry] Registered agent: charlie at http://localhost:3002
```

#### Step 3.2: Alice Discovers Charlie

In Claude Desktop (Alice):

```
Use the a2a-list-agents tool
```

**Expected result:**
```
🤖 Available A2A Agents (3 total)

1. alice
   ...

2. bob
   ...

3. charlie
   URL: http://localhost:3002
   Port: 3002
   Status: active
   Last Heartbeat: [timestamp]
```

**Verification:**
- ✅ Charlie appears in agent list
- ✅ Status is "active"
- ✅ All agents discoverable without restart

#### Step 3.3: Send Task to Charlie

In Claude Desktop (Alice):

```
Use the a2a-send-task tool to send a task to "charlie":
"Calculate the sum of 1 + 1"
```

**Expected result:**
- ✅ Task sent successfully
- ✅ Charlie processes the task
- ✅ Task completes with echo response

---

### Scenario 4: Task Artifact Verification

**Objective**: Verify that task artifacts are created and accessible.

#### Step 4.1: Bob Sends Task with Long Content

In Claude Desktop (Bob):

```
Use the a2a-send-task tool to send this task to "alice":
"Generate a 500-word essay about the history of artificial intelligence, covering key milestones from the 1950s to present day."
```

**Expected result:**
- ✅ Task created successfully

**Save the Task ID**.

#### Step 4.2: Verify Artifact Content

```bash
# Check Alice's task database
sqlite3 ~/.claude-code-buddy/a2a-tasks-alice.db "SELECT name, type, length(content) FROM artifacts WHERE task_id='[task-id]';"
```

**Expected output:**
```
response.txt|text/plain|[content-length]
```

**Verification:**
- ✅ Artifact exists
- ✅ Content length > 0
- ✅ Type is text/plain

#### Step 4.3: Extract and View Artifact

```bash
sqlite3 ~/.claude-code-buddy/a2a-tasks-alice.db "SELECT content FROM artifacts WHERE task_id='[task-id]';"
```

**Expected output:**
```
Echo: Generate a 500-word essay about the history of artificial intelligence...

[Phase 0.5 - Simplified executor response. Phase 1 will integrate Claude API.]
```

---

### Scenario 5: Concurrent Task Delegation

**Objective**: Verify that multiple tasks can be delegated concurrently.

#### Step 5.1: Alice Sends Multiple Tasks

In Claude Desktop (Alice), send three tasks in quick succession:

**Task 1 to Bob:**
```
Use a2a-send-task to send to "bob": "Task 1 - Process dataset A"
```

**Task 2 to Bob:**
```
Use a2a-send-task to send to "bob": "Task 2 - Analyze metrics B"
```

**Task 3 to Charlie:**
```
Use a2a-send-task to send to "charlie": "Task 3 - Generate report C"
```

**Save all three Task IDs**.

#### Step 5.2: Verify All Tasks Completed

In Claude Desktop (Bob):

```
Use a2a-list-tasks to see my tasks
```

**Expected result:**
```
📋 Own Tasks (2 total)

1. [COMPLETED] [task-1-id]
   Name: N/A
   ...

2. [COMPLETED] [task-2-id]
   Name: N/A
   ...
```

In Claude Desktop (Charlie):

```
Use a2a-list-tasks to see my tasks
```

**Expected result:**
```
📋 Own Tasks (1 total)

1. [COMPLETED] [task-3-id]
   Name: N/A
   ...
```

**Verification:**
- ✅ All tasks completed successfully
- ✅ Bob received 2 tasks
- ✅ Charlie received 1 task
- ✅ No tasks failed or stuck in WORKING state

#### Step 5.3: Check Database for Task States

```bash
# Bob's tasks
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT id, state FROM tasks ORDER BY created_at;"

# Charlie's tasks
sqlite3 ~/.claude-code-buddy/a2a-tasks-charlie.db "SELECT id, state FROM tasks ORDER BY created_at;"
```

**Expected output:**
All tasks should show `COMPLETED` state.

---

## Verification Commands

### Check A2A Server Status

```bash
# List running A2A servers
lsof -i :3000-3999 | grep node

# Check specific port
curl http://localhost:3000/a2a/agent-card
```

**Expected output:**
```json
{
  "name": "alice",
  "version": "1.0.0",
  "capabilities": {
    "acceptsMessages": true
  }
}
```

### Query Agent Registry

```bash
# List all agents
sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT agent_id, status, port FROM agents;"

# Check active agents only
sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT agent_id, port FROM agents WHERE status='active';"

# View full agent details
sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT * FROM agents WHERE agent_id='alice';"
```

### Query Task Queue

```bash
# List all tasks for an agent
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT id, state, created_at FROM tasks;"

# Count tasks by state
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT state, COUNT(*) FROM tasks GROUP BY state;"

# View task messages
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT task_id, role, substr(content, 1, 50) FROM messages;"

# View task artifacts
sqlite3 ~/.claude-code-buddy/a2a-tasks-bob.db "SELECT task_id, name, type FROM artifacts;"
```

### Check Server Logs

Monitor A2A server activity in real-time:

```bash
# In Alice's terminal
# Look for log output like:
# [A2A Server] POST /a2a/send-message
# [Task Executor] Processing task: [task-id]
# [Task Executor] Task completed: [task-id]
```

---

## Troubleshooting

### Issue: Agent Not Appearing in Registry

**Symptoms:**
- `a2a-list-agents` doesn't show an agent
- Agent started but not discoverable

**Diagnosis:**

```bash
# Check if agent is in registry
sqlite3 ~/.claude-code-buddy/a2a-registry.db "SELECT * FROM agents WHERE agent_id='[agent-name]';"

# Check if server is running
lsof -i :3000-3999 | grep node

# Check server logs in agent terminal
```

**Solutions:**

1. **Restart the agent**:
   ```bash
   # Stop the agent (Ctrl+C)
   # Clear registry entry
   sqlite3 ~/.claude-code-buddy/a2a-registry.db "DELETE FROM agents WHERE agent_id='[agent-name]';"
   # Restart agent
   ```

2. **Check port conflicts**:
   ```bash
   # Kill processes on conflicting ports
   lsof -ti :3000 | xargs kill -9
   ```

3. **Verify agent ID is set**:
   ```bash
   echo $CCB_AGENT_ID
   # Should output agent name
   ```

---

### Issue: Task Stuck in SUBMITTED or WORKING State

**Symptoms:**
- Task doesn't transition to COMPLETED
- Task remains in SUBMITTED state

**Diagnosis:**

```bash
# Check task state
sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db "SELECT id, state, updated_at FROM tasks WHERE id='[task-id]';"

# Check server logs for errors
```

**Solutions:**

1. **Check for executor errors**:
   - Look for error messages in agent terminal
   - Verify task executor is running

2. **Manual state update** (for testing only):
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db "UPDATE tasks SET state='COMPLETED' WHERE id='[task-id]';"
   ```

3. **Restart agent** to trigger task re-processing (if implemented in future)

---

### Issue: Port Already in Use

**Symptoms:**
- Agent fails to start with `EADDRINUSE` error
- Port binding fails

**Diagnosis:**

```bash
# Check what's using the port
lsof -i :[port-number]
```

**Solutions:**

1. **Kill the process**:
   ```bash
   lsof -ti :[port-number] | xargs kill -9
   ```

2. **Let server auto-assign next port**:
   - A2A server automatically tries ports 3000-3999
   - If all are busy, increase the range in code

---

### Issue: Database Locked

**Symptoms:**
- `database is locked` error
- SQLite operations fail

**Diagnosis:**

```bash
# Check for lock files
ls -la ~/.claude-code-buddy/a2a-*.db-*

# Check processes using database
lsof ~/.claude-code-buddy/a2a-registry.db
```

**Solutions:**

1. **Stop all agents**:
   ```bash
   # Stop all CCB instances (Ctrl+C in each terminal)
   ```

2. **Remove lock files**:
   ```bash
   rm ~/.claude-code-buddy/a2a-*.db-shm
   rm ~/.claude-code-buddy/a2a-*.db-wal
   ```

3. **Restart agents**

---

### Issue: Agent Card Not Found

**Symptoms:**
- `GET /a2a/agent-card` returns 404
- Agent discovery fails

**Diagnosis:**

```bash
# Test agent card endpoint
curl http://localhost:[port]/a2a/agent-card
```

**Solutions:**

1. **Verify server is running**:
   ```bash
   curl http://localhost:[port]/a2a/agent-card
   # Should return JSON agent card
   ```

2. **Check route registration** in server logs

3. **Restart agent** if routes not registered

---

### Issue: Messages Not Being Saved

**Symptoms:**
- Task has 0 messages
- Message history empty

**Diagnosis:**

```bash
sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db "SELECT COUNT(*) FROM messages WHERE task_id='[task-id]';"
```

**Solutions:**

1. **Check database schema**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db ".schema messages"
   ```

2. **Verify task ID is correct**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db "SELECT id FROM tasks;"
   ```

3. **Check for errors** in server logs when sending messages

---

### General Debugging Tips

1. **Enable verbose logging**:
   - Check server terminal output for detailed logs
   - A2A operations are logged with `[A2A Server]` prefix

2. **Check database integrity**:
   ```bash
   sqlite3 ~/.claude-code-buddy/a2a-registry.db "PRAGMA integrity_check;"
   sqlite3 ~/.claude-code-buddy/a2a-tasks-[agent].db "PRAGMA integrity_check;"
   ```

3. **Reset entire A2A system**:
   ```bash
   # CAUTION: This deletes all A2A data
   rm -f ~/.claude-code-buddy/a2a-*.db
   # Restart all agents
   ```

4. **Verify build is up-to-date**:
   ```bash
   cd ~/Developer/Projects/claude-code-buddy
   npm run build
   ```

---

## Test Results Checklist

After completing all test scenarios, verify:

- [ ] ✅ Alice and Bob can discover each other
- [ ] ✅ Alice can send tasks to Bob
- [ ] ✅ Bob receives and processes tasks
- [ ] ✅ Tasks transition through states correctly (SUBMITTED → WORKING → COMPLETED)
- [ ] ✅ Task artifacts are generated
- [ ] ✅ Alice can query task status from Bob
- [ ] ✅ Multiple agents can be registered simultaneously
- [ ] ✅ New agents are auto-discovered
- [ ] ✅ Concurrent task delegation works
- [ ] ✅ No database corruption or lock errors
- [ ] ✅ Server shutdown is clean (no errors)

---

## Known Limitations (Phase 0.5)

1. **Simplified Task Execution**:
   - Tasks return echo responses only
   - No real Claude API integration (coming in Phase 1)

2. **Local-Only Communication**:
   - Agents must be on the same machine
   - No cross-machine networking (coming in Phase 2)

3. **No Authentication**:
   - All agents trust each other
   - Security features coming in Phase 2

4. **No Push Notifications**:
   - Must poll for task status
   - WebSocket/SSE support coming in Phase 1

5. **No Task Cancellation UI**:
   - Cancel endpoint exists but not exposed via MCP tools
   - Coming in future phases

---

## Success Criteria

The Phase 0.5 A2A Protocol implementation is considered successful if:

1. ✅ Two Claude instances can discover each other via agent registry
2. ✅ Tasks can be sent from one agent to another
3. ✅ Tasks are processed and transition to COMPLETED state
4. ✅ Artifacts are generated and stored
5. ✅ Task status can be queried across agents
6. ✅ No errors or crashes during normal operation
7. ✅ Databases are created and populated correctly
8. ✅ All MCP tools work as documented

---

## Next Steps

After successful manual testing:

1. **Automated Tests**: Convert these manual tests to automated integration tests
2. **Performance Testing**: Test with larger numbers of tasks and agents
3. **Phase 1 Planning**: Begin design for Claude API integration
4. **Documentation**: Update user guide with A2A workflows

---

**Document Version**: 1.0
**Date**: 2026-01-31
**Status**: Ready for Testing
