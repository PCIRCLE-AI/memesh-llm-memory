# Claude Code Buddy Quick Start Card

**30-second setup guide for Claude Code Buddy v2.1.0**

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Run the interactive installer (handles everything)
./scripts/install.sh
```

The installer guides you through core setup and a quick usage demo:

- ✓ Prerequisites check (Node.js 20+, npm, git)
- ✓ Install dependencies
- ✓ Build the project
- ✓ System resource check
- ✓ Environment configuration
- ✓ Claude Code MCP integration
- ✓ Installation testing
- 📚 Basic usage demo (smart routing, prompts, memory)

**No API keys needed** - uses your Claude Code subscription for MCP usage.

---

## After Installation

Restart Claude Code - tools appear automatically.

---

## Key Tools

| Tool | Use Case |
|------|----------|
| `buddy-do` | Auto-route any task to best capability |
| `buddy-help` | Command reference and examples |
| `buddy-remember` | Recall project memory |
| `get-workflow-guidance` | Next-step suggestions |
| `get-session-health` | Session health snapshot |
| `generate-smart-plan` | Implementation plan and task breakdown |

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

**Version**: 2.1.0 | **License**: MIT | **Node**: >= 20.0.0
