<div align="center">

# 🧠 MeMesh

> **Note**: Formerly known as "Claude Code Buddy (CCB)". Renamed to MeMesh to avoid potential trademark issues.

### **The Only MCP Server That Remembers**

**Make Claude Code remember everything. Build faster. Vibe harder.**

[![GitHub Stars](https://img.shields.io/github/stars/PCIRCLE-AI/claude-code-buddy?style=social)](https://github.com/PCIRCLE-AI/claude-code-buddy)
[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![npm publish](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/publish-npm.yml)
[![Installation Tests](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml/badge.svg)](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 Quick Start](#-2-minute-quick-start) • [📖 Docs](docs/) • [🌐 GitHub](https://github.com/PCIRCLE-AI/claude-code-buddy) • [💬 Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

### 🎥 **See It In Action**

<table>
<tr>
<td width="50%" valign="top">

#### 🔴 **Without MeMesh**

```bash
# Session 1 (Monday)
You: "We use JWT for auth because..."
Claude: "Got it! ✅"

# Session 2 (Tuesday)
You: "Remember our auth approach?"
Claude: "Sorry, I don't have context..."
You: *explains everything again* 😤

# Session 3 (Wednesday)
You: "Our JWT implementation..."
Claude: "What JWT implementation?"
You: *RAGE QUITS* 💢
```

</td>
<td width="50%" valign="top">

#### ✅ **With MeMesh**

```bash
# Session 1 (Monday)
You: buddy-do "setup JWT auth"
MeMesh: ✅ Implemented + Saved to memory

# Session 2 (Tuesday)
You: buddy-remember "auth"
MeMesh: 📚 "JWT auth implemented on 2024-01-15
     ↳ Access tokens: 15min
     ↳ Refresh tokens: 7 days
     ↳ Secret rotation: monthly"

# Session 3 (Any day, across sessions)
You: buddy-do "add OAuth"
MeMesh: 🧠 "I see you have JWT. Let's
     integrate OAuth alongside it..."
```

</td>
</tr>
</table>

---

<div align="center">

https://github.com/user-attachments/assets/a389bcd2-1563-4d91-b363-44cdba5f4e44

</div>

---

<div align="center">

**💡 Try it yourself:**

```bash
# In Claude Code
buddy-help                            # See all commands
buddy-do "explain how MeMesh works"   # Watch it intelligently respond
buddy-remember "project decisions"    # Query your project memory
```

**📖 [Read User Guide](docs/USER_GUIDE.md)** • **🔧 [API Reference](docs/api/API_REFERENCE.md)**

</div>

</div>

---

## 🤔 The Problem

You know this pain:

```
Session 1: "Let me explain our architecture..."
Session 2: "As I mentioned before, our architecture..."
Session 3: "Like I said earlier, our architecture..."
Session 4: 😤
```

**Every. Single. Session.**

---

## ✨ The Solution

<table>
<tr>
<td width="50%" valign="top">

### ❌ **Before MeMesh**

- Re-explain architecture every session
- Answer same questions repeatedly
- Forget design decisions overnight
- Write similar prompts over and over
- Claude has amnesia 🤕

</td>
<td width="50%" valign="top">

### ✅ **After MeMesh**

- **Remembers** project architecture
- **Recalls** past decisions instantly
- **Organizes** knowledge automatically
- **Routes** tasks intelligently
- Claude becomes your AI teammate 🤝

</td>
</tr>
</table>

---

## 🎯 Core Features

### 1. 🧠 **Project Memory That Actually Works**

```bash
# Session 1 (Last week)
You: "We chose PostgreSQL for JSONB support"

# Session 42 (Today)
You: buddy-remember "why PostgreSQL?"
MeMesh: "Based on your decision from 2024-01-15: PostgreSQL was
      chosen for JSONB support and advanced query capabilities..."
```

**Claude remembers across sessions.** *(Session memories: 30 days, project memories: 90 days)*

### 2. 🎯 **Smart Task Routing (Autopilot Mode)**

```bash
You: "Review this code"
MeMesh: *Detects task type*
     *Activates code review mode*
     *Applies best practices*
     *Delivers structured review*
```

**No more "how should I do this?" Just do it.**

### 3. 💬 **Dead Simple Commands**

```bash
buddy-do "setup authentication"     # Execute any dev task
buddy-remember "API design"         # Query project memory
buddy-help                          # When stuck
```

**Three commands. Infinite possibilities.**

---

## 🚀 Installation Options

Choose your preferred installation method:

### ⚡ npm Global Install (Easiest) ⭐ RECOMMENDED
```bash
npm install -g @pcircle/memesh
# Auto-configures everything! Just restart Claude Code.
```

### 📦 Quick Install Script (For Local Dev)
```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

### 🏆 Claude Code Plugin
```bash
claude --plugin-dir /path/to/claude-code-buddy/.claude-plugin/memesh
```

---

## 🚀 2-Minute Quick Start

### Step 1: Quick Install

<details>
<summary><strong>⚡ Claude Code Users</strong> (Click to expand) ⭐ RECOMMENDED</summary>

**Three simple commands:**

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

The script will:
- ✅ Check prerequisites (Node.js 20+)
- ✅ Install dependencies
- ✅ Build MeMesh
- ✅ **Auto-configure** `~/.claude/mcp_settings.json`

**Then restart Claude Code completely (quit and reopen).**

**Done!** MeMesh is now available and ready to use.

> **Note**: The installer automatically configures your MCP settings. No manual configuration needed!

<Note>
  The `--plugin-dir` flag loads your local plugin. For team distribution, see [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) to create a shared marketplace.
</Note>

</details>

### Step 2: Test It

```bash
# In Claude Code, type:
buddy-help

# You should see MeMesh's command list
# Now try:
buddy-do "explain MeMesh features"

# Watch the magic happen ✨
```

**🎉 That's it! You're vibing now.**

📖 **Need help?** [Detailed installation guide](docs/QUICK_INSTALL.md) | [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 💡 Real-World Usage

### Scenario 1: **Smart Task Execution**

```bash
You: buddy-do "review the authentication module"

MeMesh routes your task...
🔍 Detected task type: Code Review
🧠 Recalled: Your auth decisions from previous sessions
📋 Providing: Structured analysis with context

✅ Result:
   • Analyzed auth module against stored best practices
   • Referenced your JWT decision from last month
   • Suggested improvements based on project patterns

💾 Saved to memory: "Auth review findings - 2024-01-20"
```

### Scenario 2: **"Wait, Why Did We Do That?"**

```bash
You: buddy-remember "authentication approach"

MeMesh searches knowledge graph...

📚 Found 3 related memories:

┌─ 2024-01-15: Initial Auth Decision
│  💬 "JWT chosen over sessions for stateless API"
│  ⚡ Reasoning: Mobile app compatibility
│
├─ 2024-01-18: Token Expiry Implementation
│  💻 Code: auth/middleware.ts:42-67
│  🔧 Access: 15min | Refresh: 7 days
│
└─ 2024-01-22: Security Enhancement
   🛡️ Added: Rate limiting + Token rotation
   📝 Prevented: Token reuse vulnerability
```

### Scenario 3: **Continuous Development Flow**

```
Day 1 │  You: "Implement user login"
      │  MeMesh: ✅ Created + 💾 Remembered
      │
Day 5 │  You: "Add password reset"
      │  MeMesh: 🧠 "I see you use JWT tokens..."
      │       ✅ Integrated seamlessly
      │
Day 10│  You: "Add OAuth support"
      │  MeMesh: 🧠 "Based on your JWT + password reset..."
      │       ✅ Consistent with existing auth
      │
Week 8│  You: "Why did we choose JWT again?"
      │  MeMesh: 📚 *Instant recall from Day 1*
```

**No context re-explanation. Ever again.**

---

## 📊 Why MeMesh vs. Others?

| Feature | Plain Claude Code | Other MCP Tools | MeMesh |
|---------|-------------------|-----------------|-----|
| **Persistent Memory** | ❌ | ⚠️ Basic | ✅ **Full Knowledge Graph** |
| **Smart Routing** | ❌ | ❌ | ✅ **Auto-detects task type** |
| **Vibe Coding Optimized** | ⚠️ | ❌ | ✅ **Built for it** |
| **Zero Setup** | ✅ | ⚠️ Complex | ✅ **2 minutes** |
| **Free & Open Source** | ✅ | ⚠️ Varies | ✅ **AGPL-3.0** |

---

## 🛠️ Advanced Features

<details>
<summary><strong>Auto-Memory Hooks</strong></summary>

**What is it?** MeMesh remembers what you did in your last coding session and shows you a summary when you start a new one.

### How It Works (Simple Version)

1. **When you open Claude Code** → MeMesh shows what you did last time
2. **While you work** → MeMesh quietly tracks your progress
3. **When you close Claude Code** → MeMesh saves a summary for next time

### What You'll See

When you start a new session, you'll see something like:

```
🧠 MeMesh Memory Recall

  🕐 Last session: 2 hours ago (45 minutes)

  📋 What you did:
    📁 Changed 5 files in src/auth/
    ✅ Made 3 git commits
    💡 Implemented JWT refresh tokens
```

**That's it!** No setup needed. MeMesh handles everything automatically.

### What Gets Saved

| Icon | What | Example |
|------|------|---------|
| 📁 | Files you changed | `src/auth/login.ts` |
| ✅ | Commits you made | `feat: add login` |
| 💡 | Things you learned | `Use async/await here` |
| ⚠️ | Problems you hit | `API timeout issue` |

### Good to Know

- Saves automatically every 250K tokens (about 1-2 hours of work)
- Session memories kept for **30 days**, then auto-cleaned
- Project memories (code changes, test results) kept for **90 days**
- Currently available in Claude Code only

</details>

<details>
<summary><strong>Multi-Project Support</strong></summary>

Each project gets its own isolated memory space.

```bash
cd ~/project-A
buddy-remember "auth"  # Returns project-A's auth decisions

cd ~/project-B
buddy-remember "auth"  # Returns project-B's auth decisions
```

**No cross-contamination. Ever.**

</details>

<details>
<summary><strong>Smart Memory Query</strong></summary>

Context-aware memory retrieval with intelligent ranking:
- 🎯 Semantic search across your knowledge base
- 🏷️ Auto-tagging for better organization
- 📊 Relevance scoring based on context

</details>

<details>
<summary><strong>Persistent Memory</strong></summary>

Local-first architecture with persistent knowledge graph:
- 💾 SQLite-based storage with semantic search
- 🔍 Vector embeddings for intelligent recall
- 📡 Knowledge persists across all sessions

</details>

<details>
<summary><strong>8 MCP Standard Tools</strong></summary>

Full integration with Model Context Protocol for seamless Claude Code experience. See [QUICK_INSTALL.md](docs/QUICK_INSTALL.md#-what-you-get) for the complete tool list.

Use `buddy-help` to see all available commands.

</details>

---

## 🧪 Technical Details

<table>
<tr>
<td width="50%">

### Requirements
- Node.js 20+
- Claude Code
- 2 minutes of your time

</td>
<td width="50%">

### Platform Support
- ✅ **Claude 4.5** (Haiku/Sonnet/Opus)
- ✅ **MCP SDK 1.25.3**
- ✅ Windows, macOS, Linux

</td>
</tr>
</table>

### 🔒 Security First

- ✅ **Local-First Processing** - All data stored locally by default
- ✅ **Optional Cloud Sync** - `memesh-cloud-sync` available for cross-device memory (opt-in only)
- ✅ **npm audit: 0 vulnerabilities**
- ✅ **Open Source** - Audit the code yourself

---

## 🤝 Contributing

We'd love your help making MeMesh better!

- 🐛 **Found a bug?** [Open an issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new)
- 💡 **Have an idea?** [Start a discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- 🛠️ **Want to code?** Check [Good First Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/labels/good%20first%20issue)

**Contributing Guide**: [CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## 📚 Documentation

- 📖 [Full Documentation](docs/)
- 🚀 [Quick Install Guide](docs/QUICK_INSTALL.md)
- 📘 [User Guide](docs/USER_GUIDE.md)
- 🛠️ [API Reference](docs/api/API_REFERENCE.md)
- ❓ [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## ❓ FAQ

<details>
<summary><strong>Q: Does it cost money?</strong></summary>

**A:** Nope. 100% free and open source (AGPL-3.0). Uses your existing Claude Code subscription.

</details>

<details>
<summary><strong>Q: Is my data safe?</strong></summary>

**A:** Yes. All data stored and processed locally by default. Cloud sync (`memesh-cloud-sync`) is available but opt-in only — nothing is uploaded without your explicit action.

</details>

<details>
<summary><strong>Q: How is this different from plain Claude Code?</strong></summary>

**A:** MeMesh adds two superpowers:
1. **Persistent Memory** - Claude remembers your project across sessions
2. **Smart Routing** - Automatically detects and handles different task types

Think of it as Claude Code + a really good memory + autopilot mode.

</details>

<details>
<summary><strong>Q: Can I customize it?</strong></summary>

**A:** Absolutely! MeMesh plugin is fully open source.

Want deeper customization? Check our [Contributing Guide](docs/CONTRIBUTING.md) or fork the repo and make it yours.

</details>

<details>
<summary><strong>Q: Does it work with Cursor?</strong></summary>

**A:** Yes! Cursor has native MCP support. Configure the MCP server path in Cursor's settings.

</details>

---

## 🙏 Acknowledgments

Built on the shoulders of giants:

- [Model Context Protocol (MCP)](https://github.com/anthropics/mcp) - The foundation
- [Claude Code](https://claude.com/claude-code) - The platform
- All our amazing [contributors](https://github.com/PCIRCLE-AI/claude-code-buddy/graphs/contributors) and early testers

---

## 📄 License

**AGPL-3.0** - See [LICENSE](LICENSE)

*This means: Use it, modify it, share it. But keep it open source.*

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=PCIRCLE-AI/claude-code-buddy&type=Date)](https://star-history.com/#PCIRCLE-AI/claude-code-buddy&Date)

---

<div align="center">

### **Built by developers, for developers**

**Stop repeating yourself. Start vibing.**

[🚀 Get Started](#-2-minute-quick-start) • [📖 Read the Docs](docs/) • [💬 Join the Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

### ⭐ **If MeMesh saved you time today, give it a star!**

It helps others discover this tool.

---

**Not affiliated with Anthropic PBC** • Independent open-source project

**Languages:** [English](README.md) • [繁體中文](README.zh-TW.md)

</div>
