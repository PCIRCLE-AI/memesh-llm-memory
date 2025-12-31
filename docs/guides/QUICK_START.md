# Quick Start Guide (15 Minutes)

Get started with Claude Code Buddy in 15 minutes - from zero to your first enhanced Claude Code query.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([download here](https://nodejs.org/))
- **Claude Code CLI** installed and configured
- **Anthropic API key** (optional if using MCP Server Mode) - [get one here](https://console.anthropic.com/)

> **Note:** In MCP Server Mode (default), Claude Code manages API access directly. You only need an Anthropic API key for standalone orchestrator usage.

---

## 🚀 Installation

### Step 1: Clone and Setup (5 minutes)

Clone the repository and run the automated setup script:

```bash
# Clone repository
git clone https://github.com/kevintseng/claude-code-buddy.git
cd claude-code-buddy

# Run automated setup
./scripts/setup.sh
```

**The setup script will:**
- ✅ Check Node.js version (18+ required)
- ✅ Install npm dependencies
- ✅ Create `.env` file from template
- ✅ Run tests to verify installation
- ✅ Build the project
- ✅ (Optional) Configure MCP server integration

**Expected output:**
```
🚀 Claude Code Buddy - Automated Setup
==================================

✅ Node.js version: v18.x.x
✅ npm is installed
📦 Installing dependencies...
✅ Dependencies installed
📝 Creating .env file...
✅ .env created from template
ℹ️  MCP Server mode enabled - Claude Code will manage API access
🧪 Running tests...
✅ All tests passed
🔨 Building project...
✅ Build complete
✅ Setup complete!
```

---

### Step 2: Configure Environment (2 minutes)

The `.env` file is automatically created with sensible defaults. Review and customize if needed:

```bash
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

# Optional: OpenAI API key for RAG features
# OPENAI_API_KEY=sk-proj-your-key-here
```

**When to add API keys:**
- **OpenAI API Key** (optional): Required only if you want to use RAG (Retrieval-Augmented Generation) features
- **Anthropic API Key** (optional): Only needed if you set `MCP_SERVER_MODE=false` for standalone usage

---

### Step 3: Configure Claude Code (5 minutes)

Add Claude Code Buddy as an MCP server to Claude Code:

#### macOS / Linux

```bash
# Edit Claude Code config
nano ~/.claude/config.json
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
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server.js"],
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
✅ claude-code-buddy (13 agents available)
   - Code Reviewer, Debugger, Refactorer
   - API Designer, RAG Agent, Evolution Agent
   - Knowledge Graph, Butler, Test Writer
   - Research, Architecture, Data Analyst, Knowledge
```

---

### Step 5: Test Agent Integration (2 minutes)

Verify Claude Code Buddy is working by checking available capabilities:

```bash
# In Claude Code
"List available Claude Code Buddy capabilities"
```

**Expected response:**
```
Claude Code Buddy provides 13 specialized capabilities:

1. Code Review (code-reviewer) - Security, performance, best practices
2. Debugging (debugger) - Systematic error diagnosis
3. Refactoring (refactorer) - Code improvement and optimization
4. API Design (api-designer) - RESTful API architecture
5. RAG Search (rag) - Vector-based documentation search
6. Evolution (evolution) - Learning from successful patterns
7. Knowledge Graph (knowledge-graph) - Relationship mapping
8. Butler (butler) - Task orchestration
9. Test Writer (test-writer) - Comprehensive test generation
10. Research (research) - Technical investigation
11. Architecture (architect) - System design review
12. Data Analysis (data-analyst) - Data insights
13. Knowledge (knowledge) - Information synthesis
```

---

## 🎯 First Usage Examples

### Example 1: Code Review (Prompt-Enhanced Agent)

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
2. Routes to Code Reviewer agent
3. Enhances prompt with security best practices checklist
4. Claude Code receives enhanced prompt with context
5. Returns comprehensive security review identifying:
   - SQL injection vulnerability
   - Plain-text password comparison
   - Missing input validation

---

### Example 2: RAG Search (Real Implementation)

Search documentation using vector embeddings:

```bash
# In Claude Code, ask:
"Search our project documentation for authentication implementation examples"
```

**What happens:**
1. Claude Code Buddy routes to RAG Agent (real implementation)
2. RAG Agent performs vector search across indexed documentation
3. Retrieves top-3 most relevant documentation chunks
4. Claude Code receives context-enriched results
5. Returns specific examples with file paths and code snippets

**Prerequisites for RAG:**
- OpenAI API key configured in `.env`
- Documentation indexed (see [RAG Deployment Guide](RAG_DEPLOYMENT.md))

---

## 📖 Next Steps

Now that you're up and running, explore more:

- **📚 Agent Reference:** Learn about all 13 agents - [AGENT_REFERENCE.md](../AGENT_REFERENCE.md)
- **🏗️ Architecture:** Understand the system design - [ARCHITECTURE.md](../ARCHITECTURE.md)
- **🧪 Testing Guide:** Write tests and validate agents - [TESTING.md](TESTING.md)
- **🔧 MCP Integration:** Advanced configuration - [MCP_INTEGRATION.md](../MCP_INTEGRATION.md)
- **🎨 RAG Deployment:** Set up vector search - [RAG_DEPLOYMENT.md](RAG_DEPLOYMENT.md)

---

## ❓ Troubleshooting

### "MCP server not found"

**Symptom:** Claude Code can't connect to Claude Code Buddy

**Solutions:**
1. Verify `config.json` path is correct:
   ```bash
   # Check file exists
   cat ~/.claude/config.json
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
   ls -la dist/mcp/server.js
   # Rebuild if missing
   npm run build
   ```

4. Restart Claude Code after config changes

---

### "API key invalid"

**Symptom:** Errors about missing or invalid API keys

**Solutions:**

**For OpenAI (RAG features):**
1. Check `.env` has correct format:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxx
   ```
2. Verify key starts with `sk-proj-` or `sk-`
3. Test key validity:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

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
   # Should be v18.0.0 or higher
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
   # Unit tests only
   npm test -- --run src/agents/__tests__/

   # E2E tests (requires API keys)
   npm run test:e2e:safe
   ```

5. **Check API keys for E2E tests:**
   - E2E tests require valid API keys
   - Set `OPENAI_API_KEY` in `.env` for RAG tests
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

### "MCP server starts but agents not available"

**Symptom:** Server connects but Claude Code doesn't see agents

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

3. **Validate agent registry:**
   ```bash
   # Test agent detection
   npm run test -- --run src/agents/__tests__/agent-factory.test.ts
   ```

---

### "RAG search not working"

**Symptom:** RAG queries fail or return no results

**Solutions:**

1. **Check OpenAI API key:**
   ```bash
   # Verify in .env
   cat .env | grep OPENAI_API_KEY
   ```

2. **Verify vector index exists:**
   ```bash
   # Check default location
   ls -la ~/.claude-code-buddy/vectra/
   # Or custom path from .env
   ```

3. **Re-index documentation:**
   ```bash
   # Follow RAG setup guide
   # See docs/guides/RAG_DEPLOYMENT.md
   ```

4. **Test RAG agent directly:**
   ```bash
   npm run test -- --run src/agents/__tests__/rag-agent.test.ts
   ```

---

## 🆘 Getting Help

If you're still stuck after trying the troubleshooting steps:

1. **📚 Check Documentation:**
   - [README.md](../../README.md) - Full project overview
   - [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
   - [MCP_INTEGRATION.md](../MCP_INTEGRATION.md) - Integration details

2. **🐛 Report Issues:**
   - [GitHub Issues](https://github.com/kevintseng/claude-code-buddy/issues)
   - Include: OS, Node.js version, error messages, steps to reproduce

3. **💬 Discussions:**
   - [GitHub Discussions](https://github.com/kevintseng/claude-code-buddy/discussions)
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

1. **Try Different Agents:**
   - Code review with security focus
   - API design for RESTful endpoints
   - Refactoring for performance
   - Debugging systematic errors

2. **Enable RAG Features:**
   - Follow [RAG Deployment Guide](RAG_DEPLOYMENT.md)
   - Index your project documentation
   - Enable semantic search

3. **Explore Advanced Features:**
   - Evolution system for learning patterns
   - Knowledge graph for relationship mapping
   - Cost tracking and performance monitoring

4. **Customize Configuration:**
   - Adjust agent behaviors
   - Configure logging and metrics
   - Set up custom routing rules

**Happy coding with Claude Code Buddy! 🚀**
