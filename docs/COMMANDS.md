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

### `generate-smart-plan`

Generate an implementation plan with TDD-friendly steps and clear task breakdown.

**Input Schema:**
```json
{
  "featureDescription": "string (required) - Feature to plan",
  "requirements": "array (optional) - Specific requirements",
  "constraints": "object (optional) - Project constraints"
}
```

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

- **Learn More:** See [README.md](../README.md) for full documentation
- **Installation:** See [INSTALL.md](INSTALL.md) for setup guide
- **Examples:** See [EXAMPLES.md](EXAMPLES.md) for more use cases
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) to add features

---

**Questions?** Open an issue on GitHub or check the documentation.
