# Claude Code Buddy Quick Start Card

**30-second setup guide for Claude Code Buddy v2.2.0**

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

**No API keys needed in MCP server mode** - uses your Claude Code subscription for MCP usage.

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
# .env file (copy from .env.example)
MCP_SERVER_MODE=true

# Optional: only needed for standalone orchestrator usage
# MCP_SERVER_MODE=false
# ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Troubleshooting

**Problem**: Server not starting
**Fix**: Check the path in `~/.claude.json` is absolute, run `npm run build`

**Problem**: Tools not appearing
**Fix**: Restart Claude Code, check logs at `~/.claude/logs/`

**Problem**: API errors
**Fix**: If running standalone (`MCP_SERVER_MODE=false`), verify `.env` has a valid `ANTHROPIC_API_KEY`

---

## Documentation

- **Setup Guide**: [docs/guides/SETUP.md](./guides/SETUP.md)
- **User Manual**: [docs/USER_GUIDE.md](./USER_GUIDE.md)
- **Commands**: [docs/COMMANDS.md](./COMMANDS.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Version**: 2.2.0 | **License**: AGPL-3.0 | **Node**: >= 20.0.0
