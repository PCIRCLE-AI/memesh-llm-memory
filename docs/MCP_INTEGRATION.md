# Smart-Agents MCP Server Integration Guide

**Quick start guide for integrating Smart-Agents with Claude Code via Model Context Protocol (MCP).**

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Build Smart-Agents

```bash
cd /path/to/smart-agents
npm install
npm run build
```

### Step 2: Configure Claude Code

Add Smart-Agents MCP server to your Claude Code configuration:

**Location**: `~/.claude/config.json`

```json
{
  "mcpServers": {
    "smart-agents": {
      "command": "node",
      "args": ["/absolute/path/to/smart-agents/dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/smart-agents` with your actual installation path.

### Step 3: Restart Claude Code

```bash
# Exit Claude Code and restart
# The MCP server will auto-start when Claude Code launches
```

### Step 4: Verify Connection

In Claude Code, check available tools:

```
Tools available from smart-agents MCP server:
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

Create `.env` in smart-agents root directory:

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
tail -f ~/.claude/logs/smart-agents.log
```

**Common issues**:
- Missing `dist/` directory → Run `npm run build`
- Wrong path in config.json → Use absolute path
- Missing API keys → Check `.env` file

### Tools Not Appearing

**Verify server connection**:
```bash
# Check if server process is running
ps aux | grep "smart-agents"

# Test server manually
node /path/to/smart-agents/dist/mcp/server.js
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
    "smart-agents": {
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

Smart-Agents includes built-in performance tracking:

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

## 🔄 Updating Smart-Agents

```bash
cd /path/to/smart-agents

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

**Issues**: [GitHub Issues](https://github.com/your-username/smart-agents/issues)

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

After setup, verify:

- [ ] `npm run build` completes successfully
- [ ] `~/.claude/config.json` has correct absolute path
- [ ] `.env` file contains valid API keys
- [ ] Claude Code shows smart-agents tools available
- [ ] `smart_route_task` tool works when invoked
- [ ] Logs show no errors: `tail ~/.claude/logs/smart-agents.log`

---

**Ready to use! Smart-Agents MCP server is now integrated with Claude Code.**

For advanced features and customization, see [User Guide](./USER_GUIDE.md).
