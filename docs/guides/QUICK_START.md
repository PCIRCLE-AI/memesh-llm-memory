# Quick Start Guide (15 Minutes)

Get started with Claude Code Buddy in 15 minutes - from zero to your first enhanced Claude Code query.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** installed ([download here](https://nodejs.org/))
- **Claude Code CLI** installed and configured
- **Anthropic API key** (optional if using MCP Server Mode) - [get one here](https://console.anthropic.com/)

> **Note:** In MCP Server Mode (default), Claude Code manages API access directly. You only need an Anthropic API key for standalone orchestrator usage.

---

## 🚀 Installation

### Step 1: Clone and Setup (5 minutes)

Clone the repository and run the interactive installer:

```bash
# Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# Run interactive installer
./scripts/install.sh
```

**The installer will:**
- ✅ Check Node.js version (20+ required)
- ✅ Install npm dependencies
- ✅ Build the project
- ✅ Create `.env` file from template
- ✅ Configure MCP server integration
- ✅ Run validation tests

**Expected output:** Step-by-step confirmation for each phase (prerequisites, install, build, env, MCP config, tests).

---

### Step 2: Configure Environment (2 minutes)

Create a `.env` file from the template (or use the setup script to do this automatically), then review and customize if needed:

```bash
# Create from template (if missing)
cp .env.example .env

# View current configuration
cat .env
```

**Default configuration:**
```env
# MCP Server Mode (Claude Code manages API access)
MCP_SERVER_MODE=true

# Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

```

**When to add API keys:**
- **Anthropic API Key** (optional): Only needed if you set `MCP_SERVER_MODE=false` for standalone usage

---

### Step 3: Configure Claude Code (5 minutes)

Add Claude Code Buddy as an MCP server to Claude Code:

#### macOS / Linux

```bash
# Edit Claude Code config
nano ~/.claude.json
```

#### Windows

```bash
# Edit Claude Code config
notepad %USERPROFILE%\.claude\config.json
```

**Add this configuration:**

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

> **Important:** Replace `/absolute/path/to/claude-code-buddy/` with your actual installation path.
>
> To find your path:
> ```bash
> # In the claude-code-buddy directory
> pwd
> # Use the output in your config.json
> ```

**Save the file and restart Claude Code.**

---

### Step 4: Verify Connection (1 minute)

Test that Claude Code can connect to Claude Code Buddy:

```bash
# In Claude Code, run:
claude mcp list
```

**Expected output:**
```
Connected MCP Servers:
✅ claude-code-buddy (7 tools available)
   - buddy-do, buddy-help, buddy-remember
   - get-session-health, get-workflow-guidance
   - generate-tests, hook-tool-use
```

---

### Step 5: Test Capability Integration (2 minutes)

Verify Claude Code Buddy is working by checking available capabilities:

```bash
# In Claude Code
"List available Claude Code Buddy capabilities"
```

**Expected response:**
```
Claude Code Buddy provides 7 tools:

1. buddy-do - Route any task to the right capability
2. buddy-help - Command reference and examples
3. buddy-remember - Recall project memory
4. get-session-health - Session health snapshot
5. get-workflow-guidance - Next-step suggestions
6. generate-tests - Implementation planning
7. hook-tool-use - Internal hook ingestion (automatic)
```

---

## 🎯 First Usage Examples

### Example 1: Code Review (Prompt-Enhanced Capability)

Ask Claude Code to review code with enhanced prompts:

```bash
# In Claude Code, ask:
"Review this authentication function for security vulnerabilities:

function login(username, password) {
  const query = 'SELECT * FROM users WHERE username=' + username;
  const user = db.query(query);
  if (user.password === password) {
    return { token: generateToken(user) };
  }
  return null;
}
"
```

**What happens:**
1. Claude Code Buddy detects "code review" capability needed
2. Routes to code review capability
3. Enhances prompt with security best practices checklist
4. Claude Code receives enhanced prompt with context
5. Returns comprehensive security review identifying:
   - SQL injection vulnerability
   - Plain-text password comparison
   - Missing input validation

---

### Example 2: Workflow Guidance

Ask for next-step suggestions based on your current phase:

```bash
# In Claude Code, ask:
"What's the next step after finishing my tests?"
```

**What happens:**
1. Claude Code Buddy evaluates your workflow context
2. Provides actionable next steps (tests, review, commit)
3. Suggests the most relevant tool to use next

---

## 📖 Next Steps

Now that you're up and running, explore more:

- **📚 Capability Reference:** Learn about available capabilities - [USER_GUIDE.md](../USER_GUIDE.md)
- **📚 Docs Index:** Documentation map - [README.md](../README.md)
- **🧪 Testing Guide:** Write tests and validate core features - [TESTING.md](TESTING.md)
- **🔧 MCP Integration:** Advanced configuration - [SETUP.md](./SETUP.md)

---

## ❓ Troubleshooting

### "MCP server not found"

**Symptom:** Claude Code can't connect to Claude Code Buddy

**Solutions:**
1. Verify `config.json` path is correct:
   ```bash
   # Check file exists
   cat ~/.claude.json
   ```

2. Ensure absolute path is used:
   ```bash
   # Get absolute path
   cd /path/to/claude-code-buddy
   pwd
   # Use this path in config.json
   ```

3. Verify server.js was built:
   ```bash
   # Check dist directory exists
   ls -la dist/mcp/server-bootstrap.js
   # Rebuild if missing
   npm run build
   ```

4. Restart Claude Code after config changes

---

### "API key invalid"

**Symptom:** Errors about missing or invalid API keys

**Solutions:**

**For Anthropic (standalone mode):**
1. Only needed if `MCP_SERVER_MODE=false` in `.env`
2. Verify key starts with `sk-ant-api03-`
3. Get key from [Anthropic Console](https://console.anthropic.com/)

---

### "Tests failing"

**Symptom:** `npm test` shows failures

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node -v
  # Should be v20.0.0 or higher
   ```

2. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Verify environment:**
   ```bash
   # Check .env exists
   ls -la .env
   # Validate format
   cat .env | grep -v "^#" | grep -v "^$"
   ```

4. **Run specific test suites:**
   ```bash
   # MCP-related tests
   npm test -- --run tests/mcp/

   # E2E tests (requires API keys)
   npm run test:e2e:safe
   ```

5. **Check API keys for E2E tests:**
   - E2E tests require valid API keys
   - Set `ANTHROPIC_API_KEY` for orchestrator tests

---

### "Build errors"

**Symptom:** `npm run build` fails with TypeScript errors

**Solutions:**

1. **Clean build:**
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Check TypeScript version:**
   ```bash
   npx tsc --version
   # Should be 5.x.x
   ```

3. **Validate tsconfig.json:**
   ```bash
   npx tsc --noEmit
   # Shows errors without building
   ```

---

### "MCP server starts but tools not available"

**Symptom:** Server connects but Claude Code doesn't see tools

**Solutions:**

1. **Verify server is running:**
   ```bash
   # Check process
   ps aux | grep "node.*mcp/server.js"
   ```

2. **Check server logs:**
   ```bash
   # Set debug logging in .env
   LOG_LEVEL=debug
   # Restart server and check output
   ```

3. **Validate tool definitions:**
   ```bash
   # Validate MCP tool wiring
   npm test -- --run tests/mcp/
   ```

---

## 🆘 Getting Help

If you're still stuck after trying the troubleshooting steps:

1. **📚 Check Documentation:**
   - [README.md](../../README.md) - Full project overview
   - [README.md](../README.md) - Documentation map
   - [SETUP.md](./SETUP.md) - Installation and MCP configuration

2. **🐛 Report Issues:**
   - [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
   - Include: OS, Node.js version, error messages, steps to reproduce

3. **💬 Discussions:**
   - [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
   - Ask questions, share tips, request features

4. **📝 Logs:**
   - Set `LOG_LEVEL=debug` in `.env`
   - Include relevant logs when reporting issues

---

## ⏱️ Time Breakdown

- **Step 1:** Clone and Setup - 5 minutes
- **Step 2:** Configure Environment - 2 minutes
- **Step 3:** Configure Claude Code - 5 minutes
- **Step 4:** Verify Connection - 1 minute
- **Step 5:** Test Integration - 2 minutes

**Total:** 15 minutes

---

## 🎉 What's Next?

You've successfully set up Claude Code Buddy! Here are recommended next steps:

1. **Try Different Capabilities:**
   - Code review with security focus
   - API design for RESTful endpoints
   - Refactoring for performance
   - Debugging systematic errors

2. **Explore Advanced Features:**
   - Evolution system for learning patterns
   - Knowledge graph for relationship mapping
   - Cost tracking and performance monitoring

3. **Customize Configuration:**
- Adjust capability routing rules
   - Configure logging and metrics
   - Set up custom routing rules

**Happy coding with Claude Code Buddy! 🚀**
