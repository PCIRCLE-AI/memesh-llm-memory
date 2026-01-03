# Claude Code Buddy Commands Reference

Complete reference for all CCB commands and tools.

## Table of Contents

- [Buddy Commands](#buddy-commands) (User-Friendly Layer)
- [MCP Tools](#mcp-tools) (Direct Tool Access)
- [Command Aliases](#command-aliases)
- [Usage Examples](#usage-examples)

---

## Buddy Commands

Buddy commands provide a natural, conversational interface to Claude Code Buddy's functionality.

### `buddy do <task>`

Execute any development task with smart routing.

**What it does:**
- Analyzes task complexity
- Routes to Ollama (fast & free) or Claude (high quality)
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
- Simple tasks (complexity ≤ 5) → Ollama qwen2.5-coder:14b
- Ultra-fast (complexity ≤ 2) → Ollama llama3.2:1b
- Mixed (complexity 6-8) → Ollama draft + Claude review
- Complex/Creative (complexity ≥ 9) → Claude Sonnet 4.5

---

### `buddy stats [period]`

View performance dashboard showing token usage, cost savings, and routing decisions.

**What it does:**
- Shows token usage metrics
- Displays cost savings from Ollama routing
- Breaks down model routing decisions (Ollama vs Claude)
- Shows task completion stats

**Parameters:**
- `period` (optional): Time period for stats
  - `day` - Today's stats
  - `week` - Last 7 days
  - `month` - Last 30 days
  - `all` - All time (default)

**Examples:**
```bash
buddy stats          # All time stats
buddy stats day      # Today only
buddy stats week     # Last 7 days
buddy stats month    # Last 30 days
```

**Aliases:**
- `buddy dashboard`
- `buddy metrics`
- `buddy performance`

**Output Example:**
```
📊 Claude Code Buddy Performance Dashboard (all)

Token Usage:
- Tokens Used: 125,000
- Tokens Saved: 450,000 (via Ollama routing)
- Cost Savings: $9.00

Routing Decisions:
- Ollama: 45 tasks (78%)
- Claude: 12 tasks (22%)

Performance:
- Tasks Completed: 57
- Average Complexity: 5.2
```

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
  - `do` - Help for buddy_do
  - `stats` - Help for buddy_stats
  - `remember` - Help for buddy_remember
  - (Leave empty for all commands)

**Examples:**
```bash
buddy help          # Show all commands
buddy help do       # Help for buddy_do
buddy help stats    # Help for buddy_stats
buddy help remember # Help for buddy_remember
```

---

## MCP Tools

Direct MCP tool access (for advanced users or MCP integrations).

### `buddy_do`

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

### `buddy_stats`

MCP tool version of `buddy stats` command.

**Input Schema:**
```json
{
  "period": "enum (optional) - day | week | month | all (default: all)"
}
```

**Example:**
```json
{
  "period": "week"
}
```

---

### `buddy_remember`

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

### `buddy_help`

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

### `buddy stats` Aliases
- `buddy dashboard [period]`
- `buddy metrics [period]`
- `buddy performance [period]`

---

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

**4. Check performance:**
```bash
buddy stats week
```

---

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

### Cost-Conscious Development

**Use stats to track costs:**
```bash
buddy stats day    # Daily token usage
buddy stats week   # Weekly breakdown
buddy stats month  # Monthly totals
```

**The system automatically routes simple tasks to Ollama (free) and complex tasks to Claude (paid), optimizing your costs.**

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

### 3. Monitor Your Usage
```bash
# Check stats regularly
buddy stats week

# Adjust complexity thresholds if needed
```

### 4. Use Aliases for Speed
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
   - Node.js 18+ installed
   - Claude Code configured
   - MCP server running

3. **Test Manually:**
   ```bash
   npm run mcp
   ```

---

## Next Steps

- **Learn More:** See [README.md](../README.md) for full documentation
- **Installation:** See [INSTALL.md](INSTALL.md) for setup guide
- **Examples:** See [EXAMPLES.md](EXAMPLES.md) for more use cases
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) to add features

---

**Questions?** Open an issue on GitHub or check the documentation.
