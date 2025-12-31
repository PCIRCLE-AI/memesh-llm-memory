# Claude Code Buddy (CCB) MCP Server Integration Guide

**Quick start guide for integrating Claude Code Buddy with Claude Code via Model Context Protocol (MCP).**

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Build Claude Code Buddy

```bash
cd /path/to/claude-code-buddy
npm install
npm run build

# Verify setup (optional but recommended)
./scripts/verify-mcp-setup.sh
```

### Step 2: Configure Claude Code

Add Claude Code Buddy MCP server to your Claude Code configuration:

**Location**: `~/.claude/config.json`

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/claude-code-buddy` with your actual installation path.

### Step 3: Restart Claude Code

```bash
# Exit Claude Code and restart
# The MCP server will auto-start when Claude Code launches
```

### Step 4: Verify Connection

In Claude Code, check available tools:

```
Tools available from claude-code-buddy MCP server:
✓ smart_route_task
✓ development_butler
✓ test_writer
✓ devops_engineer
✓ project_manager
✓ data_engineer
... and more
```

---

## 🛠️ Available Tools

### Core Routing

**`smart_route_task`** - Intelligent task routing to best agent
```typescript
{
  taskDescription: string;  // What needs to be done
  priority?: number;        // 1-10 (optional)
}
```

### Development Agents

**`development_butler`** - Event-driven development automation
- Checkpoint-based workflow assistance
- Code review automation
- Test verification
- Documentation updates

**`test_writer`** - Automated test generation
- Unit test creation
- Integration test scaffolding
- Test coverage analysis

**`devops_engineer`** - CI/CD automation
- Pipeline configuration
- Deployment automation
- Infrastructure as code

### Management Agents

**`project_manager`** - Project planning and tracking
- Task breakdown and estimation
- Resource allocation
- Progress monitoring

**`data_engineer`** - Data pipeline management
- ETL workflow design
- Data quality monitoring
- Pipeline orchestration

### Enhanced Prompt Agents

**`architecture_agent`** - System design and architecture
**`code_reviewer`** - Code quality analysis
**`security_auditor`** - Security vulnerability scanning
**`ui_designer`** - UI/UX design consultation
**`marketing_strategist`** - Marketing planning
**`product_manager`** - Product strategy
**`ml_engineer`** - Machine learning engineering

### Optional Features

**`rag_agent`** - RAG-based knowledge retrieval (requires OpenAI API key)

---

## ⚙️ Configuration

### Environment Variables

Create `.env` in claude-code-buddy root directory:

```env
# Required for orchestrator
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional: For RAG agent
OPENAI_API_KEY=sk-xxx

# Optional: Custom configuration
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

### Advanced Configuration

**Custom Agent Priorities**:

Edit `src/core/AgentRegistry.ts` to customize agent priorities and categories.

**Performance Tuning**:

Adjust orchestrator settings in `src/orchestrator/config.ts`.

---

## 📖 Usage Examples

### Example 1: Route Task Automatically

```
User: "I need to write tests for my authentication module"

Claude Code uses: smart_route_task
→ Routes to: test_writer agent
→ Returns: Enhanced prompt with test generation strategy
```

### Example 2: Development Butler Workflow

```
User: "Prepare this feature for code review"

Claude Code uses: development_butler
→ Checkpoint: BEFORE_COMMIT
→ Actions: Run tests, lint check, generate coverage report
→ Output: Review checklist + recommendations
```

### Example 3: Security Audit

```
User: "Check this API endpoint for security issues"

Claude Code uses: security_auditor
→ Analysis: Authentication, authorization, input validation
→ Output: Security findings with severity ratings
```

---

## 🔍 Troubleshooting

### Server Not Starting

**Check logs**:
```bash
tail -f ~/.claude/logs/claude-code-buddy.log
```

**Common issues**:
- Missing `dist/` directory → Run `npm run build`
- Wrong path in config.json → Use absolute path
- Missing API keys → Check `.env` file

### Tools Not Appearing

**Verify server connection**:
```bash
# Check if server process is running
ps aux | grep "claude-code-buddy"

# Test server manually
node /path/to/claude-code-buddy/dist/mcp/server.js
```

### Performance Issues

**Reduce logging**:
```env
LOG_LEVEL=error  # Only log errors
```

**Disable optional features**:
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "env": {
        "ENABLE_RAG": "false",
        "ENABLE_EVOLUTION": "false"
      }
    }
  }
}
```

---

## 🚦 Development Mode

### Running Server Manually (for debugging)

```bash
# Terminal 1: Start MCP server
npm run mcp

# Terminal 2: Monitor logs
tail -f logs/mcp-server.log

# Terminal 3: Test with Claude Code
# Connect Claude Code to localhost MCP server
```

### Testing Without Claude Code

```bash
# Test MCP server endpoints
npm run test:mcp

# Verify all agents load correctly
npm run verify:agents
```

---

## 📊 Monitoring

### Agent Performance

Claude Code Buddy includes built-in performance tracking:

```bash
# View agent performance dashboard
npm run dashboard

# Export performance metrics
npm run export:metrics
```

### Evolution System

Monitor how agents improve over time:

```bash
# View learning progress
npm run evolution:status

# Generate improvement report
npm run evolution:report
```

---

## 🔄 Updating Claude Code Buddy

```bash
cd /path/to/claude-code-buddy

# Pull latest changes
git pull origin main

# Rebuild
npm install
npm run build

# Restart Claude Code
# MCP server will automatically use new version
```

---

## 🆘 Support

**Issues**: [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

**Documentation**:
- [User Guide](./USER_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)
- [API Reference](./api/API_REFERENCE.md)

**Quick Help**:
- Configuration issues → Check `~/.claude/config.json`
- Build errors → Run `npm clean-install && npm run build`
- API errors → Verify `.env` file has valid API keys

---

## ✅ Verification Checklist

### Automated Verification

Run the verification script to check everything:

```bash
./scripts/verify-mcp-setup.sh
```

This checks:
- ✓ Node.js version >= 18.0.0
- ✓ Dependencies installed
- ✓ Build artifacts exist
- ✓ Environment variables configured
- ✓ MCP server starts successfully
- ✓ Agent registry loads

### Manual Verification

After setup, verify:

- [ ] `npm run build` completes successfully
- [ ] `~/.claude/config.json` has correct absolute path
- [ ] `.env` file contains valid API keys
- [ ] Claude Code shows claude-code-buddy tools available
- [ ] `smart_route_task` tool works when invoked
- [ ] Logs show no errors: `tail ~/.claude/logs/claude-code-buddy.log`

---

**Ready to use! Claude Code Buddy MCP server is now integrated with Claude Code.**

For advanced features and customization, see [User Guide](./USER_GUIDE.md).
