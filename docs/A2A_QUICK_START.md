# A2A Communication Quick Start Card 🚀

## ✅ Current Status

```
✓ A2A Token: Configured (173 chars)
✓ Task Timeout: 30,000ms (30 seconds)
✓ Poll Interval: 5,000ms (5 seconds)
✓ Running Sessions: 3 Claude Code instances
✓ A2A Tools: Compiled and ready
```

---

## 🎯 5-Minute Quick Test

### Session 1 (Sender)

```typescript
// Step 1: List available agents
mcp__memesh__a2a-list-agents({ status: "active" })
// Note down the target agent ID you want to send a task to

// Step 2: Send task
mcp__memesh__a2a-send-task({
  targetAgentId: "ccb-mcp-xxxxx",  // From Step 1
  taskDescription: "Hello from Session 1! Please reply received",
  priority: "normal"
})
// Note down the returned taskId
```

### Session 2 (Receiver)

```typescript
// Step 3: List pending tasks
mcp__memesh__a2a-list-tasks({ state: "SUBMITTED" })
// Should see the task from Session 1

// Step 4: Report completion (after executing task)
mcp__memesh__a2a-report-result({
  taskId: "task-abc123",  // From Step 3
  result: "Message received! 👋",
  success: true
})
```

### Session 1 (Verification)

```typescript
// Step 5: Query task status
mcp__memesh__a2a-get-task({
  targetAgentId: "ccb-mcp-xxxxx",
  taskId: "task-abc123"
})
// Should see status: "COMPLETED" and Session 2's reply
```

---

## 🔧 Available MCP Tools

| Tool Name | Purpose | Usage Location |
|---------|------|---------|
| `a2a-list-agents` | List all available agents | Any session |
| `a2a-send-task` | Send task to another agent | Sender |
| `a2a-list-tasks` | List tasks assigned to me | Receiver |
| `a2a-report-result` | Report task execution result | Receiver |
| `a2a-get-task` | Query task status | Any session |

---

## 📊 Task State Flow

```
SUBMITTED → WORKING → COMPLETED
     ↓
  FAILED / CANCELED / REJECTED
```

---

## 🚨 Quick Troubleshooting

### Can't Find Agents?
```bash
# Confirm MeMesh servers are running
ps aux | grep server-bootstrap.js | grep -v grep

# Should see at least 2 processes
# If not, restart Claude Code
```

### Token Authentication Failed?
```bash
# Confirm token is set
cat .env | grep MEMESH_A2A_TOKEN

# Restart Claude Code to load environment variables
```

### Task Timeout?
```bash
# Increase timeout (edit .env)
MEMESH_A2A_TASK_TIMEOUT=60000  # 60 seconds

# Restart Claude Code
```

---

## 📖 Complete Documentation

- **Detailed Testing Guide**: `docs/A2A_TESTING_GUIDE.md`
- **Architecture Documentation**: `docs/features/a2a-agent-collaboration.md`
- **Setup Guide**: `docs/A2A_SETUP_GUIDE.md`
- **Verification Script**: `bash scripts/test-a2a-setup.sh`

---

## 💡 Practical Tips

### Tip 1: Identifying Agent IDs
```typescript
// Agent ID format: ccb-mcp-{random}
// Example: ccb-mcp-a1b2c3d4
// Use a2a-list-agents to get accurate ID
```

### Tip 2: Task Priority
```typescript
priority: "low"     // Low priority
priority: "normal"  // Normal (default)
priority: "high"    // High priority
priority: "urgent"  // Urgent
```

### Tip 3: Task State Filtering
```typescript
// List only tasks with specific state
a2a-list-tasks({ state: "SUBMITTED" })   // New tasks
a2a-list-tasks({ state: "WORKING" })     // In progress
a2a-list-tasks({ state: "COMPLETED" })   // Completed
a2a-list-tasks({ state: "FAILED" })      // Failed
```

### Tip 4: Batch Processing
```typescript
// Use limit and offset for paginated processing of large task volumes
a2a-list-tasks({
  state: "SUBMITTED",
  limit: 10,
  offset: 0
})
```

---

## 🎓 Advanced Scenarios

### Multi-Agent Workflow
```
Session 1 → Session 2 (Frontend task)
         ↓
         → Session 3 (Backend task)
         ↓
         → Session 4 (Testing task)
```

### Error Handling
```typescript
// Report task failure
a2a-report-result({
  taskId: "task-xyz",
  result: "",
  success: false,
  error: "Specific error message here"
})
```

---

## 🎯 Task Board Quick Start (Phase 2.2)

The **Unified Task Board** enables cross-platform task visibility and collaboration. All agents share a single `task-board.db` for true multi-agent coordination.

### Available Task Board MCP Tools

| Tool Name | Purpose | Usage |
|-----------|---------|-------|
| `a2a-board` | View all tasks (Kanban style) | Any agent |
| `a2a-set-skills` | Register skills for task matching | Current agent |
| `a2a-find-tasks` | Find tasks matching your skills | Any agent |
| `a2a-claim-task` | Claim a pending task | Any agent |
| `a2a-release-task` | Release a claimed task | Task owner |

### Basic Usage Examples

**1. View the Task Board:**
```typescript
// View all tasks
mcp__memesh__a2a-board({})

// View only pending tasks
mcp__memesh__a2a-board({ status: "pending" })

// View tasks from a specific platform
mcp__memesh__a2a-board({ platform: "claude-code" })
```

**2. Register Your Skills:**
```typescript
mcp__memesh__a2a-set-skills({
  skills: ["typescript", "react", "testing", "code-review"]
})
```

**3. Find Tasks Matching Your Skills:**
```typescript
mcp__memesh__a2a-find-tasks({
  skills: ["typescript", "testing"],
  status: "pending",
  limit: 10
})
```

**4. Claim a Task:**
```typescript
mcp__memesh__a2a-claim-task({
  taskId: "abc12345-6789-4def-a012-345678901234"
})
```

**5. Release a Task (if you can't complete it):**
```typescript
mcp__memesh__a2a-release-task({
  taskId: "abc12345-6789-4def-a012-345678901234"
})
```

### Platform-Aware Agent IDs

Agent IDs are generated in format: `hostname-username-platform`

Example: `macbook-pro-john-claude-code`

This ensures the same machine + user + platform always generates the same ID across sessions.

**Complete Documentation**: See `docs/a2a/UNIFIED_TASK_BOARD.md` for detailed workflows and migration guide.

---

**Ready?** Let's start testing!

```bash
# 1. Verify environment
bash scripts/test-a2a-setup.sh

# 2. Read complete guide
cat docs/A2A_TESTING_GUIDE.md

# 3. Start testing!
```
