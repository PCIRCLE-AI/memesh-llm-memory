<div align="center">

# 🧠 Claude Code Buddy (CCB)

### **The Only MCP Server That Remembers**

**Make Claude Code remember everything. Build faster. Vibe harder.**

[![GitHub Stars](https://img.shields.io/github/stars/PCIRCLE-AI/claude-code-buddy?style=social)](https://github.com/PCIRCLE-AI/claude-code-buddy)
[![npm version](https://img.shields.io/npm/v/@pcircle/claude-code-buddy-mcp)](https://www.npmjs.com/package/@pcircle/claude-code-buddy-mcp)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.25.3-purple.svg)](https://modelcontextprotocol.io)

[🚀 Quick Start](#-2-minute-quick-start) • [📖 Docs](docs/) • [🌐 Website](https://ccb.pcircle.ai) • [💬 Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

### 🎥 **See It In Action** (Interactive Demo)

<table>
<tr>
<td width="50%" valign="top">

#### 🔴 **Without CCB**

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

#### ✅ **With CCB**

```bash
# Session 1 (Monday)
You: buddy-do "setup JWT auth"
CCB: ✅ Implemented + Saved to memory

# Session 2 (Tuesday)
You: buddy-remember "auth"
CCB: 📚 "JWT auth implemented on 2024-01-15
     ↳ Access tokens: 15min
     ↳ Refresh tokens: 7 days
     ↳ Secret rotation: monthly"

# Session 3 (Any day, forever)
You: buddy-do "add OAuth"
CCB: 🧠 "I see you have JWT. Let's
     integrate OAuth alongside it..."
```

</td>
</tr>
</table>

<div align="center">

**💡 Try it yourself:**

```bash
# In Claude Code/Cursor
buddy-help                          # See all commands
buddy-do "explain how CCB works"    # Watch it intelligently respond
buddy-remember "project decisions"  # Query your project memory
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

### ❌ **Before CCB**

- Re-explain architecture every session
- Answer same questions repeatedly
- Forget design decisions overnight
- Write similar prompts over and over
- Claude has amnesia 🤕

</td>
<td width="50%" valign="top">

### ✅ **After CCB**

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
CCB: "Based on your decision from 2024-01-15: PostgreSQL was
      chosen for JSONB support and advanced query capabilities..."
```

**Claude remembers. Forever.**

### 2. 🎯 **Smart Task Routing (Autopilot Mode)**

```bash
You: "Review this code"
CCB: *Detects task type*
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
- ✅ Build CCB
- ✅ Show you how to activate the plugin

**Then start Claude Code with:**

```bash
claude --plugin-dir /path/to/claude-code-buddy
```

**Done!** CCB is now available as a plugin.

<Note>
  The `--plugin-dir` flag loads your local plugin. For team distribution, see [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) to create a shared marketplace.
</Note>

</details>

<details>
<summary><strong>🎯 Cursor Users</strong> (Click to expand)</summary>

Cursor uses the same MCP protocol. You can use the quick install link:
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==
```

**Restart Cursor** and you're set.

</details>

### Step 2: Test It

```bash
# In Claude Code/Cursor, type:
buddy-help

# You should see CCB's command list
# Now try:
buddy-do "explain CCB features"

# Watch the magic happen ✨
```

**🎉 That's it! You're vibing now.**

📖 **Need help?** [Detailed installation guide](docs/QUICK_INSTALL.md) | [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 💡 Real-World Usage

### Scenario 1: **Building a New Feature**

```bash
You: buddy-do "create a real-time chat with WebSocket"

CCB analyzes your project...
🔍 Detected: React + Node.js + Express
🧠 Recalled: Your preference for TypeScript strict mode
📝 Applying: Error boundaries pattern from LoginPage.tsx

✅ Generated:
   ├─ server/chat.ts (WebSocket server)
   ├─ components/ChatWindow.tsx (React component)
   └─ hooks/useWebSocket.ts (Custom hook)

💾 Saved to memory: "WebSocket chat architecture - 2024-01-20"
```

### Scenario 2: **"Wait, Why Did We Do That?"**

```bash
You: buddy-remember "authentication approach"

CCB searches knowledge graph...

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
      │  CCB: ✅ Created + 💾 Remembered
      │
Day 5 │  You: "Add password reset"
      │  CCB: 🧠 "I see you use JWT tokens..."
      │       ✅ Integrated seamlessly
      │
Day 10│  You: "Add OAuth support"
      │  CCB: 🧠 "Based on your JWT + password reset..."
      │       ✅ Consistent with existing auth
      │
Week 8│  You: "Why did we choose JWT again?"
      │  CCB: 📚 *Instant recall from Day 1*
```

**No context re-explanation. Ever again.**

---

## 📊 Why CCB vs. Others?

| Feature | Plain Claude Code | Other MCP Tools | CCB |
|---------|-------------------|-----------------|-----|
| **Persistent Memory** | ❌ | ⚠️ Basic | ✅ **Full Knowledge Graph** |
| **Smart Routing** | ❌ | ❌ | ✅ **Auto-detects task type** |
| **Vibe Coding Optimized** | ⚠️ | ❌ | ✅ **Built for it** |
| **Zero Setup** | ✅ | ⚠️ Complex | ✅ **2 minutes** |
| **Free & Open Source** | ✅ | ⚠️ Varies | ✅ **AGPL-3.0** |

---

## 🛠️ Advanced Features

<details>
<summary><strong>Auto-Memory System</strong></summary>

When you use `buddy-do`, CCB automatically records:
- ✅ Task goals and outcomes
- ✅ Technical decisions and reasoning
- ✅ Errors encountered and solutions
- ✅ Development milestones

**You don't think about memory. CCB does.**

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
<summary><strong>17 MCP Standard Tools</strong></summary>

Full integration with Model Context Protocol.

See complete list: [ToolDefinitions.ts](src/mcp/ToolDefinitions.ts)

</details>

---

## 🧪 Technical Details

<table>
<tr>
<td width="50%">

### Requirements
- Node.js 20+
- Claude Code or Cursor IDE
- 5 minutes of your time

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

- ✅ **100% Local Processing** - Your data never leaves your machine
- ✅ **No External API Calls** - Uses your Claude Code subscription
- ✅ **npm audit: 0 vulnerabilities**
- ✅ **Open Source** - Audit the code yourself

---

## 🤝 Contributing

We'd love your help making CCB better!

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

**A:** Yes. Everything processed locally. Zero external API calls. Zero data upload.

</details>

<details>
<summary><strong>Q: How is this different from plain Claude Code?</strong></summary>

**A:** CCB adds two superpowers:
1. **Persistent Memory** - Claude remembers your project across sessions
2. **Smart Routing** - Automatically detects and handles different task types

Think of it as Claude Code + a really good memory + autopilot mode.

</details>

<details>
<summary><strong>Q: Can I customize it?</strong></summary>

**A:** Absolutely. Prompt templates in `src/core/PromptEnhancer.ts`.

Want deeper customization? Fork it, hack it, make it yours. That's the open source way.

</details>

<details>
<summary><strong>Q: Does it work with Cursor?</strong></summary>

**A:** Yes! Cursor has native MCP support. One-click install.

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

### ⭐ **If CCB saved you time today, give it a star!**

It helps others discover this tool.

---

**Not affiliated with Anthropic PBC** • Independent open-source project

**Languages:** [English](README.md) • [繁體中文](README.zh-TW.md)

</div>
