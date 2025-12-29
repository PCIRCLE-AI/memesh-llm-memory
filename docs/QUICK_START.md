# Smart-Agents Quick Start Card

**30-second setup guide for Smart-Agents v2.1.0**

---

## Installation

```bash
git clone https://github.com/your-username/smart-agents.git
cd smart-agents
npm install && npm run build
```

---

## MCP Server (Claude Code Integration)

### 1. Add to `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "smart-agents": {
      "command": "node",
      "args": ["/path/to/smart-agents/dist/mcp/server.js"]
    }
  }
}
```

### 2. Restart Claude Code

Tools appear automatically in Claude Code.

---

## Key Tools

| Tool | Use Case |
|------|----------|
| `smart_route_task` | Auto-route any task to best agent |
| `development_butler` | Checkpoint-based dev automation |
| `test_writer` | Generate unit/integration tests |
| `devops_engineer` | CI/CD configuration |
| `code_reviewer` | Code quality analysis |
| `security_auditor` | Security vulnerability scan |

---

## Common Commands

```bash
# Start MCP server manually
npm run mcp

# Run tests
npm test

# Start orchestrator (standalone mode)
npm run orchestrator

# View performance dashboard
npm run dashboard
```

---

## Environment Variables

```env
# .env file
ANTHROPIC_API_KEY=sk-ant-xxx  # Required for orchestrator
OPENAI_API_KEY=sk-xxx         # Optional: for RAG agent
```

---

## Troubleshooting

**Problem**: Server not starting
**Fix**: Check path in config.json is absolute, run `npm run build`

**Problem**: Tools not appearing
**Fix**: Restart Claude Code, check logs at `~/.claude/logs/`

**Problem**: API errors
**Fix**: Verify `.env` has valid API keys

---

## Documentation

- **Full Guide**: [docs/MCP_INTEGRATION.md](./MCP_INTEGRATION.md)
- **User Manual**: [docs/USER_GUIDE.md](./USER_GUIDE.md)
- **Architecture**: [ARCHITECTURE.md](../ARCHITECTURE.md)

---

**Version**: 2.1.0 | **License**: MIT | **Node**: >= 18.0.0
