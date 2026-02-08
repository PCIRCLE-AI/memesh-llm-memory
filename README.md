<div align="center">

# 🧠 MeMesh

### **Persistent Memory for Claude Code**

**Give Claude long-term memory. Remember decisions, context, and code. Build faster.**

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 Quick Install](#-quick-install) • [💬 Commands](#-3-commands-to-rule-them-all) • [📖 Docs](docs/)

</div>

---

## 🤔 The Problem

Every new Claude Code session:

```
You: "Remember our auth setup?"
Claude: "I don't have that context..."
You: *explains for the 47th time* 😤
```

**Claude has amnesia. Your productivity dies.**

---

## ✨ The Solution

```bash
# Session 1 (Monday)
You: buddy-do "setup JWT auth"
MeMesh: ✅ Done + saved to memory

# Session 50 (Friday)
You: buddy-remember "auth"
MeMesh: 📚 JWT auth from Jan 15
     → Access tokens: 15min
     → Refresh tokens: 7 days
```

**MeMesh = Claude with working memory.**

---

## 🚀 Quick Install

```bash
npm install -g @pcircle/memesh
```

Restart Claude Code. **Done.**

<details>
<summary>📦 Alternative: Install from source</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
npm link  # or use ./scripts/quick-install.sh
```

</details>

---

## 💬 3 Commands to Rule Them All

```bash
buddy-do "any dev task"           # Execute + remember
buddy-remember "topic"            # Instant recall
buddy-help                        # When stuck
```

**Examples:**

```bash
buddy-do "explain this codebase"
buddy-do "add user authentication"
buddy-do "fix the build error"

buddy-remember "API design decisions"
buddy-remember "why we chose PostgreSQL"

buddy-help  # Shows all available commands
```

---

## 🎯 Core Features

### 🧠 **Persistent Memory**
- Remembers project decisions (90 days)
- Recalls session context (30 days)
- Semantic search across all memories

### 🔍 **Knowledge Graph**
- Automatically organizes your knowledge
- Links related concepts
- FTS5 + vector search

### ⚡ **Zero Config**
- Auto-tracks project changes
- Auto-tags memories
- Just install and use

---

## 📚 Learn More

**Core Documentation**:
- **[User Guide](docs/USER_GUIDE.md)** - Complete usage guide
- **[Commands Reference](docs/COMMANDS.md)** - All available commands and tools
- **[Getting Started](docs/GETTING_STARTED.md)** - Installation guide
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues

**Advanced Documentation**:
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design
- **[Best Practices](docs/BEST_PRACTICES.md)** - Usage tips and recommendations
- **[API Reference](docs/api/API_REFERENCE.md)** - Complete API documentation

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

AGPL-3.0 - See [LICENSE](LICENSE)

---

<div align="center">

**Built by vibe coders, for vibe coders** 🚀

[Report Bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [Request Feature](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
