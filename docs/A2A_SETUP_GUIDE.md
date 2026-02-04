# A2A Protocol Setup Guide (Phase 1.0)

## Overview

This guide explains how to configure the Agent-to-Agent (A2A) Protocol Phase 1.0 for MCP Client Delegation.

**Phase 1.0 Features:**
- ✅ MCP Client Delegation (localhost HTTP server)
- ✅ Bearer token authentication
- ✅ Task polling every 5 seconds
- ✅ Configurable task timeout
- ✅ Complete task lifecycle management

**Phase 1.0 Limitations:**
- 🔒 Localhost-only (no remote agents)
- 🔒 Single task per agent (no concurrent execution)
- 🔒 No cross-machine communication
- 🔒 No agent discovery (manual configuration)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Token Generation](#token-generation)
3. [Token Management](#token-management)
4. [Environment Configuration](#environment-configuration)
5. [MCP Client Configuration](#mcp-client-configuration)
6. [Testing Your Setup](#testing-your-setup)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

**Required:**
- MeMesh installed and configured
- Claude Code with MCP integration
- Node.js 20+ (for running MeMesh MCP server)

**Optional:**
- `openssl` or `node` for token generation (or use provided script)

---

## Token Generation

### Quick Start: Use the Generation Script

The easiest way to generate a secure token:

```bash
cd /path/to/claude-code-buddy
bash scripts/generate-a2a-token.sh
```

**What the script does:**
1. Generates a cryptographically secure random token
2. Adds `MEMESH_A2A_TOKEN=<token>` to your `.env` file
3. Prints setup instructions

### Manual Token Generation

**Option 1: Using OpenSSL (Recommended)**

```bash
# Generate a 32-byte random token (64 hex characters)
openssl rand -hex 32
```

**Option 2: Using Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: Using Python**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Example Output:**
```
a7f3b2c1d4e5f6789abc012def345678901234567890abcdef1234567890abcd
```

---

## Token Management

### Token Lifecycle

**IMPORTANT:** A2A tokens should be **shared across all sessions**, not regenerated per session.

**Why?**
- Regenerating tokens breaks all existing agents using the old token
- All agents must use the same token for authentication
- Token should only change when compromised or rotated for security

### When to Regenerate

**✅ Regenerate token when:**
- Token is compromised or leaked
- Security audit requires token rotation
- Migrating to new infrastructure

**❌ Do NOT regenerate token when:**
- Installing updates or patches
- Restarting the server
- Adding new agents (they use the existing token)

### Token Management Commands

**Generate token (first time only):**
```bash
npm run a2a:generate-token
# Or: bash scripts/generate-a2a-token.sh
```

**Show current token:**
```bash
npm run a2a:show-token
```

**Force regenerate (WARNING: breaks existing agents):**
```bash
npm run a2a:regenerate-token
# Or: bash scripts/generate-a2a-token.sh --force
```

### Automatic Token Preservation

The installation scripts automatically preserve existing tokens:

```bash
# These commands will NOT replace existing tokens:
bash scripts/install.sh
bash scripts/quick-install.sh

# Token generation only happens on first installation
# Reinstallation or updates will skip token generation
```

**Example output when token exists:**
```
✓ MEMESH_A2A_TOKEN already exists in .env
  Token is preserved to maintain agent connectivity.
  To regenerate (WARNING: breaks existing agents):
    bash scripts/generate-a2a-token.sh --force
```

---

## Environment Configuration

### Step 1: Add Token to `.env`

Create or edit `.env` in your project root:

```bash
# A2A Protocol Phase 1.0 Configuration
MEMESH_A2A_TOKEN=<your-64-char-hex-token-here>
```

### Step 2: Configure Timeout (Optional)

```bash
# Task execution timeout (in milliseconds)
# Default: 30000 (30 seconds)
MEMESH_A2A_TASK_TIMEOUT=30000
```

### Step 3: Configure Polling Interval (Optional)

```bash
# MCP Client polling interval (in milliseconds)
# Default: 5000 (5 seconds)
MEMESH_A2A_POLL_INTERVAL=5000
```

### Complete `.env` Example

```bash
# MeMesh Configuration
MEMESH_DATA_DIR=~/.memesh

# A2A Protocol Phase 1.0
MEMESH_A2A_TOKEN=<your-64-char-hex-token-here>
MEMESH_A2A_TASK_TIMEOUT=30000
MEMESH_A2A_POLL_INTERVAL=5000

# Optional: Debug logging
DEBUG=false
MEMESH_LOG_LEVEL=info
```

---

## MCP Client Configuration

### How MCP Client Delegation Works

```
┌─────────────────────────────────────────────────┐
│          Agent A (Sender)                        │
│  Uses a2a-send-task via MCP tool                │
└──────────────────┬──────────────────────────────┘
                   │ HTTP POST
                   │ Bearer: <token>
                   ▼
┌─────────────────────────────────────────────────┐
│          A2A HTTP Server (localhost:3000)       │
│  Receives task → TaskQueue (PENDING state)      │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Polling (every 5s)
                   ▼
┌─────────────────────────────────────────────────┐
│          MCP Client (Agent B)                    │
│  1. Polls a2a-list-tasks                        │
│  2. Executes task via buddy-do                  │
│  3. Reports result via a2a-report-result        │
└─────────────────────────────────────────────────┘
```

### MCP Client Implementation

Your MCP Client should implement this polling loop:

```typescript
// Pseudo-code for MCP Client
async function pollAndExecuteTasks() {
  while (true) {
    // 1. Poll for pending tasks
    const tasks = await mcpTool('a2a-list-tasks', {});

    for (const task of tasks) {
      try {
        // 2. Execute task
        const result = await mcpTool('buddy-do', { task: task.task });

        // 3. Report success
        await mcpTool('a2a-report-result', {
          taskId: task.taskId,
          result: JSON.stringify(result),
          success: true
        });
      } catch (error) {
        // 4. Report failure
        await mcpTool('a2a-report-result', {
          taskId: task.taskId,
          result: '',
          success: false,
          error: error.message
        });
      }
    }

    // 5. Wait before next poll (default: 5 seconds)
    await sleep(process.env.MEMESH_A2A_POLL_INTERVAL || 5000);
  }
}
```

---

## Testing Your Setup

### Step 1: Start MeMesh MCP Server

```bash
# In your project directory
npm run mcp

# Or if using npx
npx @pcircle/memesh
```

**Expected Output:**
```
[INFO] MeMesh MCP Server starting...
[INFO] A2A Server listening on http://localhost:3000
[INFO] Token authentication enabled
[INFO] MCP Server ready
```

### Step 2: Test Token Authentication

```bash
# Test with valid token
curl -X POST http://localhost:3000/a2a/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agentId": "test-agent",
    "task": "Calculate 2+2",
    "priority": "high"
  }'
```

**Expected Response (Success):**
```json
{
  "taskId": "task-abc123",
  "status": "PENDING",
  "message": "Task submitted successfully"
}
```

**Expected Response (Invalid Token):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### Step 3: Test Task Polling

In your Claude Code MCP client:

```bash
# Use a2a-list-tasks tool
a2a-list-tasks {}
```

**Expected Response:**
```json
{
  "tasks": [
    {
      "taskId": "task-abc123",
      "task": "Calculate 2+2",
      "priority": "high",
      "status": "PENDING",
      "createdAt": "2026-02-03T10:00:00.000Z"
    }
  ]
}
```

### Step 4: Test Result Reporting

```bash
# Use a2a-report-result tool
a2a-report-result {
  "taskId": "task-abc123",
  "result": "The answer is 4",
  "success": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "taskId": "task-abc123",
  "status": "COMPLETED"
}
```

---

## Troubleshooting

### Issue: "Unauthorized" Error

**Symptoms:**
```
HTTP 401 Unauthorized
Invalid or missing authentication token
```

**Solutions:**
1. Verify `MEMESH_A2A_TOKEN` is set in `.env`
2. Ensure token matches in both client and server
3. Check that `.env` is loaded (restart server after changes)
4. Verify token is passed in `Authorization: Bearer <token>` header

### Issue: Tasks Not Appearing in Polling

**Symptoms:**
- `a2a-send-task` succeeds but `a2a-list-tasks` returns empty array

**Solutions:**
1. Check `agentId` matches in both send and list operations
2. Verify task state is PENDING (not COMPLETED or FAILED)
3. Check server logs for task queue updates
4. Ensure polling is happening on the correct server/port

### Issue: Task Timeout

**Symptoms:**
- Tasks stuck in IN_PROGRESS state
- No result reported after long execution

**Solutions:**
1. Increase `MEMESH_A2A_TASK_TIMEOUT` in `.env`
2. Check MCP Client is calling `a2a-report-result`
3. Review task execution logs for errors
4. Ensure MCP Client isn't hanging on long-running tasks

### Issue: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. Find and kill process using port 3000:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```
2. Or configure custom port:
   ```bash
   MEMESH_A2A_PORT=3001 npm run mcp
   ```

---

## Advanced Configuration

### Custom Port Configuration

```bash
# .env
MEMESH_A2A_PORT=3001
```

### Debug Mode

Enable detailed logging:

```bash
# .env
DEBUG=true
MEMESH_LOG_LEVEL=debug
```

**Server Output (Debug Mode):**
```
[DEBUG] Task received: task-abc123
[DEBUG] Task added to queue: PENDING
[DEBUG] MCPTaskDelegator: 1 pending tasks
[DEBUG] Task retrieved by MCP Client: task-abc123
[DEBUG] Task status updated: IN_PROGRESS
[DEBUG] Result reported: task-abc123 (COMPLETED)
```

### Task Cleanup

Manually clean up old tasks:

```bash
# Use buddy-remember to find old task IDs
buddy-remember "a2a tasks from last week"

# Or use TaskQueue API (if exposed via CLI in future)
```

---

## Next Steps

1. **Set up MCP Client polling loop** (see [MCP Client Configuration](#mcp-client-configuration))
2. **Test with real tasks** (e.g., code review, test generation)
3. **Monitor task execution** (check logs, verify completion)
4. **Explore advanced features** (Phase 2.0: Remote Agents, Phase 3.0: Swarm Intelligence)

---

## Phase Roadmap

**Phase 1.0** (Current):
- ✅ MCP Client Delegation
- ✅ Bearer token authentication
- ✅ Task lifecycle management

**Phase 2.0** (Planned):
- 🔜 Remote agent support (cross-machine communication)
- 🔜 Agent discovery and registration
- 🔜 Concurrent task execution

**Phase 3.0** (Future):
- 🔮 Swarm intelligence
- 🔮 Multi-agent collaboration
- 🔮 Dynamic task routing

---

## Resources

- **[COMMANDS.md](./COMMANDS.md)** - Complete A2A tool reference
- **[USER_GUIDE.md](./USER_GUIDE.md)** - A2A Protocol overview
- **[API_REFERENCE.md](./api/API_REFERENCE.md)** - Detailed API documentation
- **[GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)** - Report bugs or request features

---

**Questions?** Open an issue on GitHub or check the documentation.
