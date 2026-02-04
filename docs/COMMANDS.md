# MeMesh Commands Reference

Complete reference for all MeMesh commands and tools.

## Table of Contents

- [Daemon Commands](#daemon-commands) (Process Management)
- [Buddy Commands](#buddy-commands) (User-Friendly Layer)
- [MCP Tools](#mcp-tools) (Direct Tool Access)
- [Command Aliases](#command-aliases)
- [Usage Examples](#usage-examples)

---

## Daemon Commands

MeMesh uses a singleton daemon architecture to efficiently share resources across multiple Claude Code sessions.

### `memesh daemon status`

Check daemon status and information.

**What it shows:**
- Running state (daemon/proxy/standalone)
- PID and uptime
- Connected clients count
- Socket path
- Version information

**Example:**
```bash
memesh daemon status
```

**Output:**
```
Daemon Status: running
Mode: daemon
PID: 12345
Uptime: 2h 15m
Clients: 3
Socket: /Users/user/.memesh/daemon.sock
Version: 2.7.0
```

---

### `memesh daemon logs`

View daemon logs.

**Options:**
- `-f, --follow` - Follow logs in real-time
- `-n, --lines <number>` - Number of lines to show (default: 50)

**Examples:**
```bash
# Show recent logs
memesh daemon logs

# Follow logs in real-time
memesh daemon logs -f

# Show last 100 lines
memesh daemon logs -n 100
```

---

### `memesh daemon stop`

Stop the daemon process.

**Options:**
- `--force` - Force immediate termination (skip graceful shutdown)

**Examples:**
```bash
# Graceful stop (waits for clients)
memesh daemon stop

# Force stop
memesh daemon stop --force
```

**Note:** Graceful stop waits for connected clients to disconnect and in-flight requests to complete.

---

### `memesh daemon restart`

Restart the daemon process.

**What it does:**
1. Signals existing daemon to prepare for shutdown
2. Waits for in-flight requests to complete
3. Starts new daemon instance
4. Clients automatically reconnect

**Example:**
```bash
memesh daemon restart
```

---

### `memesh daemon upgrade`

Request daemon upgrade when a newer version is available.

**What it does:**
1. New instance requests upgrade from running daemon
2. Daemon enters drain mode (no new requests)
3. Existing requests complete
4. Lock is released
5. New instance takes over

**Example:**
```bash
memesh daemon upgrade
```

---

### Daemon Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMESH_DISABLE_DAEMON` | Disable daemon mode (`1` or `true`) | `false` |
| `MEMESH_DAEMON_IDLE_TIMEOUT` | Idle timeout before auto-shutdown (ms) | `300000` |
| `MEMESH_DAEMON_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

**Disable daemon mode:**
```bash
export MEMESH_DISABLE_DAEMON=1
```

---

## Buddy Commands

Buddy commands provide a natural, conversational interface to MeMesh's functionality.

### `buddy do <task>`

Execute any development task with smart routing.

**What it does:**
- Analyzes task complexity
- Applies capability-focused prompt enhancement
- Returns execution result with routing info

**Parameters:**
- `task` (required): Description of task to execute

**Examples:**
```bash
buddy do setup authentication for the API
buddy do refactor the user service
buddy do fix the login bug we discussed
buddy do write tests for auth.ts
buddy do optimize this database query
```

**Aliases:**
- `buddy help-with`
- `buddy execute`
- `buddy run`
- `buddy task`

**Routing Logic:**
- MeMesh evaluates task complexity and capability keywords
- Specialized prompt context is added for the detected capability focus
- Estimated cost and complexity are included for transparency

---

### `buddy remember <query> [limit]`

Recall project memory - past decisions, architecture choices, bug fixes, and patterns.

**What it does:**
- Searches knowledge graph for relevant memories
- Returns past decisions and context
- Helps maintain project consistency

**Parameters:**
- `query` (required): What to search for
- `limit` (optional): Max number of results (1-50, default: 5)

**Examples:**
```bash
buddy remember how we implemented authentication
buddy remember api design decisions
buddy remember database schema changes
buddy remember why we chose TypeScript
buddy remember authentication approach 10
```

**Aliases:**
- `buddy recall`
- `buddy retrieve`
- `buddy search`
- `buddy find`

**Use Cases:**
- Recall past architectural decisions
- Remember why certain patterns were chosen
- Review previous bug fixes
- Maintain consistency across sessions

---

### `buddy help [command]`

Get help for all buddy commands or a specific command.

**What it does:**
- Shows command reference
- Explains usage and parameters
- Provides examples
- Lists command aliases

**Parameters:**
- `command` (optional): Specific command to get help for
  - `do` - Help for buddy do
  - `remember` - Help for buddy remember
  - (Leave empty for all commands)

**Examples:**
```bash
buddy help          # Show all commands
buddy help do       # Help for buddy do
buddy help remember # Help for buddy remember
```

---

## MCP Tools

Direct MCP tool access (for advanced users or MCP integrations).

### `buddy-do`

MCP tool version of `buddy do` command.

**Input Schema:**
```json
{
  "task": "string (required) - Task description"
}
```

**Example:**
```json
{
  "task": "setup authentication for the API"
}
```

---

### `buddy-remember`

MCP tool version of `buddy remember` command.

**Input Schema:**
```json
{
  "query": "string (required) - Search query",
  "limit": "number (optional) - Max results (1-50, default: 5)"
}
```

**Example:**
```json
{
  "query": "authentication approach",
  "limit": 10
}
```

---

### `buddy-help`

MCP tool version of `buddy help` command.

**Input Schema:**
```json
{
  "command": "string (optional) - Command to get help for"
}
```

**Example:**
```json
{
  "command": "do"
}
```

---

### `get-session-health`

Check session health including token usage and quality metrics.

**Input Schema:**
```json
{}
```

---

### `get-workflow-guidance`

Get intelligent workflow recommendations based on current development context.

**Input Schema:**
```json
{
  "phase": "enum (required) - idle | code-written | test-complete | commit-ready | committed",
  "filesChanged": "array (optional) - list of changed files",
  "testsPassing": "boolean (optional) - whether tests are passing"
}
```

---

### `generate-tests`

Automatically generate comprehensive test cases from specifications or source code using AI.

**Input Schema:**
```json
{
  "specification": "string (optional) - Feature or function specification",
  "code": "string (optional) - Source code to generate tests for"
}
```

**Note:** Must provide either `specification` or `code`.

---

### `hook-tool-use`

Internal hook event ingestion for workflow automation and memory tracking.

**Input Schema:**
```json
{
  "toolName": "string (required) - Tool executed by Claude Code",
  "arguments": "object (optional) - Tool arguments payload",
  "success": "boolean (required) - Whether execution succeeded",
  "duration": "number (optional) - Duration in milliseconds",
  "tokensUsed": "number (optional) - Tokens used by tool call",
  "output": "string (optional) - Tool output"
}
```

---

### `buddy-record-mistake`

Record errors and mistakes for learning and prevention.

**Input Schema:**
```json
{
  "mistake": "string (required) - Description of what went wrong",
  "context": "string (required) - Situation where error occurred",
  "correctApproach": "string (required) - The right way to handle it",
  "tags": "array (optional) - Categorization tags"
}
```

**Example:**
```json
{
  "mistake": "Used synchronous file read in async function",
  "context": "Loading configuration at startup",
  "correctApproach": "Use fs.promises.readFile() instead",
  "tags": ["nodejs", "async", "filesystem"]
}
```

---

### `create-entities`

Create knowledge entities with explicit relationships for fine-grained control over the knowledge graph.

**Input Schema:**
```json
{
  "entities": "array (required) - Array of entity objects",
  "entity.name": "string (required) - Unique entity name",
  "entity.entityType": "string (required) - Entity type",
  "entity.observations": "array (optional) - Array of observation strings",
  "entity.tags": "array (optional) - Array of tag strings"
}
```

**Example:**
```json
{
  "entities": [
    {
      "name": "PostgreSQL Database Choice",
      "entityType": "decision",
      "observations": [
        "Chose PostgreSQL over MySQL",
        "Better JSON support and performance"
      ],
      "tags": ["database", "postgresql"]
    }
  ]
}
```

---

### `buddy-secret-store`

Securely store sensitive information (API keys, tokens, passwords) using AES-256-GCM encryption.

**Input Schema:**
```json
{
  "name": "string (required) - Name/identifier for the secret (e.g., 'openai-api-key')",
  "value": "string (required) - The secret value to store",
  "type": "enum (required) - api_key | token | password | other",
  "description": "string (optional) - Description of what this secret is for",
  "expiresIn": "string (optional) - Expiry duration (e.g., '30d', '24h', '60m'). Default: 30 days"
}
```

**Example:**
```json
{
  "name": "openai-api-key",
  "value": "sk-proj-...",
  "type": "api_key",
  "description": "OpenAI API key for GPT-4 access",
  "expiresIn": "30d"
}
```

**Security Features:**
- AES-256-GCM encryption
- Local storage only
- Never transmitted over network
- Optional automatic expiry with human-readable duration format

---

### `buddy-secret-get`

Retrieve a previously stored secret.

**Input Schema:**
```json
{
  "name": "string (required) - Secret identifier"
}
```

**Example:**
```json
{
  "name": "openai-api-key"
}
```

**Returns:**
- Decrypted secret value
- Creation timestamp
- Expiry information (if TTL was set)

---

### `buddy-secret-list`

List all stored secrets (names only, not values).

**Input Schema:**
```json
{}
```

**Returns:**
- Array of secret names
- Creation timestamps
- Expiry information
- Does NOT return secret values for security

---

### `buddy-secret-delete`

Permanently delete a stored secret.

**Input Schema:**
```json
{
  "name": "string (required) - Secret identifier"
}
```

**Example:**
```json
{
  "name": "old-api-key"
}
```

---

### `a2a-send-task`

Send a task to another agent for execution (Agent-to-Agent Protocol - Phase 1.0).

**What it does:**
- Delegates task to MCP Client via HTTP POST
- MCP Client polls tasks every 5 seconds via `a2a-list-tasks`
- Requires Bearer token authentication (`MEMESH_A2A_TOKEN`)
- Returns task ID for status tracking

**Input Schema:**
```json
{
  "targetAgentId": "string (required) - ID of the target agent to send the task to",
  "taskDescription": "string (required) - Description of the task to execute",
  "priority": "enum (optional) - low | normal | high | urgent (default: normal)",
  "sessionId": "string (optional) - Session ID for task tracking",
  "metadata": "object (optional) - Additional task metadata"
}
```

**Example:**
```json
{
  "targetAgentId": "code-reviewer",
  "taskDescription": "Review src/auth.ts for security issues",
  "priority": "high"
}
```

**Authentication:**
- Requires `Authorization: Bearer <token>` header
- Token must match `MEMESH_A2A_TOKEN` environment variable
- See [A2A_SETUP_GUIDE.md](./A2A_SETUP_GUIDE.md) for token configuration

**Current Status:** Phase 1.0 - MCP Client Delegation (localhost-only)

---

### `a2a-get-task`

Query status and results of a sent task.

**Input Schema:**
```json
{
  "targetAgentId": "string (required) - ID of the agent that owns the task",
  "taskId": "string (required) - ID of the task to retrieve"
}
```

**Returns:**
- Task status (SUBMITTED/WORKING/INPUT_REQUIRED/COMPLETED/FAILED/CANCELED/REJECTED)
- Task results (if completed)
- Error information (if failed)

---

### `a2a-list-tasks`

List all tasks assigned to this agent (Phase 1.0: MCP Client Polling).

**What it does:**
- MCP Client polls this tool every 5 seconds
- Returns pending tasks from task queue
- Tasks transition to IN_PROGRESS when retrieved
- Used for MCP Client Delegation workflow

**Input Schema:**
```json
{
  "state": "enum (optional) - Filter by task state: SUBMITTED | WORKING | INPUT_REQUIRED | COMPLETED | FAILED | CANCELED | REJECTED",
  "limit": "number (optional) - Maximum tasks to return (1-100)",
  "offset": "number (optional) - Number of tasks to skip for pagination"
}
```

**Example:**
```json
{
  "state": "SUBMITTED",
  "limit": 10
}
```

**Returns:**
- Array of task objects
- Task status and metadata
- Priority and timing information

**MCP Client Workflow:**
1. Poll `a2a-list-tasks` every 5 seconds
2. Retrieve pending tasks
3. Execute tasks using `buddy-do` or other MCP tools
4. Report results via `a2a-report-result`

**Polling Configuration:**
- Interval: 5 seconds (configurable via `MEMESH_A2A_POLL_INTERVAL`)
- Timeout: 30 seconds per task (configurable via `MEMESH_A2A_TASK_TIMEOUT`)

---

### `a2a-report-result`

Report task execution result (Phase 1.0: MCP Client → Task Queue).

**What it does:**
- MCP Client reports task execution result
- Updates TaskQueue status to COMPLETED or FAILED
- Removes task from MCPTaskDelegator pending queue
- Completes the MCP Client Delegation workflow

**Input Schema:**
```json
{
  "taskId": "string (required) - Task ID to report result for",
  "result": "string (required) - Execution output or result",
  "success": "boolean (required) - Whether execution succeeded",
  "error": "string (optional) - Error message if success=false"
}
```

**Example (Success):**
```json
{
  "taskId": "task-abc123",
  "result": "Code review completed. Found 2 security issues in auth.ts",
  "success": true
}
```

**Example (Failure):**
```json
{
  "taskId": "task-abc123",
  "result": "",
  "success": false,
  "error": "File src/auth.ts not found"
}
```

**When to Use:**
- After MCP Client completes task execution
- To update task status from IN_PROGRESS to COMPLETED/FAILED
- Required for proper task lifecycle management

---

### `a2a-list-agents`

Discover available agents for task delegation.

**Input Schema:**
```json
{}
```

**Returns:**
- Array of agent identifiers
- Agent capabilities
- Agent status (online/offline)

---

## Command Aliases

All buddy commands support multiple aliases for convenience:

### `buddy do` Aliases
- `buddy help-with <task>`
- `buddy execute <task>`
- `buddy run <task>`
- `buddy task <task>`

### `buddy remember` Aliases
- `buddy recall <query>`
- `buddy retrieve <query>`
- `buddy search <query>`
- `buddy find <query>`

## Usage Examples

### Complete Development Workflow

**1. Start new feature:**
```bash
buddy do create user registration API endpoint
```

**2. Check memory for past patterns:**
```bash
buddy remember how we implemented other API endpoints
buddy remember authentication patterns
```

**3. Execute specific tasks:**
```bash
buddy do write tests for registration endpoint
buddy do add input validation
buddy do update API documentation
```

### Memory-Driven Development

**Store important decisions:**
```bash
# The system automatically stores important decisions
# from your conversations and task executions
```

**Recall when needed:**
```bash
buddy remember why we chose JWT over sessions
buddy remember database migration approach
buddy remember error handling patterns
buddy remember API versioning strategy
```

---

## Tips & Best Practices

### 1. Be Specific in Tasks
```bash
# ❌ Vague
buddy do fix bug

# ✅ Specific
buddy do fix the login timeout bug in auth.ts
```

### 2. Use Memory Effectively
```bash
# Store context at the start of a session
buddy remember what we're working on

# Recall past decisions before making changes
buddy remember authentication approach
```

### 3. Use Aliases for Speed
```bash
# Short aliases for common operations
buddy recall auth    # instead of buddy remember auth
buddy run tests      # instead of buddy do run tests
```

---

## Troubleshooting

### Command Not Found

If buddy commands aren't recognized:

1. **Verify MCP Integration:**
   ```bash
   # Check Claude Code config
   cat ~/.claude.json
   ```

2. **Restart Claude Code:**
   ```bash
   # After configuration changes
   ```

3. **Check Server Logs:**
   ```bash
   # Look for MCP server errors
   ```

### Tool Execution Failures

If tools fail to execute:

1. **Check Dependencies:**
   ```bash
   npm install
   npm run build
   ```

2. **Verify Environment:**
  - Node.js 20+ installed
   - Claude Code configured
   - MCP server running

3. **Test Manually:**
   ```bash
   npm run mcp
   ```

---

## Next Steps

- **API Reference:** See [API_REFERENCE.md](./api/API_REFERENCE.md) for detailed MCP tool documentation
- **User Guide:** See [USER_GUIDE.md](./USER_GUIDE.md) for complete feature reference
- **Best Practices:** See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for effective workflows
- **Installation:** See [GETTING_STARTED.md](./GETTING_STARTED.md) for setup guide
- **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) to add features

---

**Questions?** Open an issue on GitHub or check the documentation.
