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

The installer guides you through **11 interactive steps**:

**Core Setup (Steps 1-8)**:
- ✓ Prerequisites check (Node.js 18+, npm, git)
- ✓ Install dependencies
- ✓ Build the project
- ✓ System resource check
- ✓ Environment configuration
- ✓ **Optional RAG Setup** (HuggingFace FREE or OpenAI)
- ✓ Claude Code MCP integration
- ✓ Installation testing

**Interactive Demos (Steps 9-10)**:
- 📚 **Step 9**: Basic Usage Demo (smart routing, prompts, memory)
- 📁 **Step 10**: RAG Feature Demo (Drop Inbox with sample doc)

**No API keys needed** - uses your Claude Code subscription.

**Optional RAG**: HuggingFace (FREE) or OpenAI embeddings

---

## After Installation

Restart Claude Code - tools appear automatically.

---

## Key Tools

| Tool | Use Case |
|------|----------|
| `buddy_do` | Auto-route any task to best agent |
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
