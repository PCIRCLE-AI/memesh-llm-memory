<div align="center">

# 🧠 MeMesh

### Persistent Memory for Claude Code

Claude forgets everything between sessions. MeMesh fixes that.

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[Quick Install](#install) • [Usage](#usage) • [Troubleshooting](#troubleshooting) • [繁體中文](README.zh-TW.md)

</div>

---

## The Problem

Every new Claude Code session starts from zero:

```
You: "Remember our auth setup from yesterday?"
Claude: "I don't have context from previous sessions..."
```

You end up re-explaining the same decisions, architecture, and constraints — over and over.

## How MeMesh Helps

MeMesh gives Claude a persistent memory that survives across sessions:

```bash
# Monday: You make a decision
buddy-remember "auth"
# → JWT auth: access tokens 15min, refresh tokens 7 days
# → Decided on Jan 15, stored permanently
```

Your project decisions, architecture context, and debugging history — all remembered automatically.

---

## Install

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) and Node.js >= 20

```bash
npm install -g @pcircle/memesh
```

Restart Claude Code. That's it.

**Verify it works** — in a new Claude Code session, type:

```
buddy-help
```

If you see a list of available commands, MeMesh is running.

<details>
<summary>Install from source (for contributors)</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
```

</details>

---

## Compatibility

### Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | ✅ Fully tested | Primary development platform |
| **Linux** | ✅ Fully tested | All distributions supported |
| **Windows** | ✅ Compatible | WSL2 recommended for best experience |

### Requirements

- **Claude Code**: Latest version recommended ([install guide](https://docs.anthropic.com/en/docs/claude-code))
- **Node.js**: >= 20.0.0 ([download](https://nodejs.org/))
- **npm**: >= 9.0.0 (included with Node.js)

### Claude Code Integration

MeMesh works seamlessly with:
- ✅ **Claude Code CLI** (terminal)
- ✅ **Claude Code VS Code Extension**
- ✅ **Cursor** (via MCP)
- ✅ **Other MCP-compatible editors**

### Known Limitations

- Windows native terminal may have display issues (use WSL2)
- Minimum 4GB RAM recommended for large knowledge graphs
- Vector search requires ~100MB disk space for embedding models

---

## Usage

MeMesh provides 3 core commands inside Claude Code:

| Command | What it does |
|---------|-------------|
| `buddy-do "task"` | Execute a task and save what was learned |
| `buddy-remember "topic"` | Recall past decisions and context |
| `buddy-help` | Show all available commands |

**Examples:**

```bash
buddy-do "explain this codebase"
buddy-do "add user authentication"
buddy-remember "API design decisions"
buddy-remember "why we chose PostgreSQL"
```

Memories are stored locally on your machine and persist across sessions (90 days for decisions, 30 days for session context).

---

## Troubleshooting

**MeMesh not loading?**

```bash
# Check installation
npm list -g @pcircle/memesh

# Check Node.js version (needs >= 20)
node --version

# Repair installation
memesh setup
```

Then restart Claude Code completely.

See the full [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for more.

---

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** — First-time setup walkthrough
- **[User Guide](docs/USER_GUIDE.md)** — Complete usage guide with real-world examples
- **[Development Guide](docs/DEVELOPMENT.md)** — Contributor guide for local development
- **[API Reference](https://pcircle-ai.github.io/claude-code-buddy/)** — Auto-generated API documentation
- **[Commands Reference](docs/COMMANDS.md)** — All commands and tools
- **[Architecture](docs/ARCHITECTURE.md)** — How MeMesh works internally

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0 — See [LICENSE](LICENSE)

---

<div align="center">

Something not working? [Open an issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new) — we respond fast.

[Report Bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new?labels=bug&template=bug_report.md) • [Request Feature](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
