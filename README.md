# Claude Code Buddy (CCB)

> **Make Claude Code remember your project, learn from your feedback, and give you expert-level responses without expert-level prompts.**

Claude Code Buddy is an MCP server that adds intelligence, memory, and task routing to Claude Code - turning it from a powerful assistant into a project-aware AI teammate.

---

## The Problem

You're using Claude Code to build your project, but you keep hitting the same frustrations:

- **"Didn't we already discuss this?"** - Claude forgets context between sessions
- **"Why am I explaining this again?"** - Every conversation starts from zero
- **"This answer is too generic"** - Same response whether you're debugging, reviewing code, or designing UI
- **"Let me write this 50-line prompt... again"** - Repetitive instructions for common tasks

**You end up being Claude's memory and project manager instead of focusing on building.**

---

## The Solution

Claude Code Buddy sits between you and Claude Code, adding three superpowers:

### 1. 🧠 **Project Memory**
CCB remembers your architecture decisions, coding patterns, and past solutions. Ask "Why did we choose PostgreSQL?" and get the actual decision rationale - not a generic comparison.

### 2. 🎯 **Smart Task Routing**
Your request gets analyzed and routed to the right "expert mode" - code review tasks get code review expertise, debugging gets systematic debugging methodology, frontend gets UI/UX best practices.

### 3. 📈 **Learns From Feedback**
Thumbs up/down after each response trains the system. It learns which approaches work for your project and adapts over time.

**Result:** Expert responses without expert prompts. Context that persists. An AI that gets smarter the more you use it.

---

## See It In Action

**Without CCB:**
```
You: "Optimize this database query"
Claude: [Generic advice about indexes and query structure]
```

**With CCB:**
```
You: "Optimize this database query"

CCB analyzes: Database optimization task
CCB routes to: db-optimizer agent type
CCB enhances prompt with: DB best practices, indexing strategies, profiling techniques

Claude: [Specific optimization for YOUR database setup, with actual query examples
         and performance benchmarks based on your schema]
```

**The difference:** CCB knows your stack, remembers your schema, and delivers targeted expertise.

---

## Key Features

### ✨ Automatic Expertise Routing

30+ specialized agent types for different tasks:
- **code-reviewer** - Security checks, quality standards, anti-patterns
- **debugger** - Systematic debugging, error pattern recognition
- **frontend-specialist** - UI/UX, accessibility, responsive design
- **backend-specialist** - API design, database optimization, security
- **api-designer**, **db-optimizer**, **refactorer**, **test-writer**... and more

**You don't choose the agent - CCB picks the right one for your task automatically.**

### 💾 Three Types of Memory

**RAG (Retrieval-Augmented Generation)**
```
You: "Show me how authentication works in this project"
CCB: [Searches your codebase, finds actual auth files, shows you the patterns]
```

**Knowledge Graph**
```
You: "Why did we choose this architecture?"
CCB: [Recalls the decision, the alternatives considered, and the tradeoffs]
```

**Project Context**
```
CCB remembers:
- Your coding standards
- Naming conventions
- Project-specific patterns
- What you've already built
```

### 📊 Session Health & Performance Tracking

```bash
buddy stats week

Total Agent Calls: 1,245
Total Tokens Used: 2.4M (within Claude Code session limits)
Success Rate: 94.2%
Session Health: Healthy (65% token usage)

Per-agent breakdown:
code-reviewer: 234 calls, 85% success
debugger: 123 calls, 92% success
```

**Monitor your Claude Code session health. Track token usage to prevent context overflow. Optimize for quality.**

### 🤝 User-Friendly Commands

```bash
# Natural language commands that just work
buddy do setup authentication
buddy do optimize this database query
buddy stats week
buddy remember how we implemented login
buddy help
```

**Aliases work too:** `help-with`, `execute`, `recall`, `dashboard` - pick what feels natural.

---

## Quick Start (2 Minutes)

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- Claude Code installed ([get it here](https://claude.com/claude-code))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Run the interactive installer (it handles everything)
./scripts/install.sh
```

The installer will:
- ✓ Install dependencies
- ✓ Build the project
- ✓ Configure Claude Code MCP integration
- ✓ Test the setup

**No API keys needed** - uses your existing Claude Code subscription.

### Start Using It

Restart Claude Code, then try:

```
"Analyze my codebase architecture"
"Generate tests for auth.ts"
"Review this code for security issues"
"Optimize this database query"
```

CCB automatically routes tasks to the right agent and enhances prompts with relevant context.

---

## How It Works

```
Your Request
    ↓
CCB analyzes the task
    ↓
Routes to best agent type (e.g., code-reviewer, debugger)
    ↓
Enhances prompt with specialized context
    ↓
Claude Code executes with your subscription
    ↓
You provide feedback (👍/👎)
    ↓
CCB learns and improves
```

**Under the hood:**
- **8 real agent implementations** with their own logic and storage (RAG, Knowledge Graph, Test Writer, DevOps Engineer, etc.)
- **30+ agent types** via specialized prompt templates
- **Evolution system** that learns from your feedback and adapts over time

**Technical deep dive:** See [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## What CCB Does Well ✅

- **Makes Claude Code context-aware** for your specific project
- **Reduces repetitive prompting** through intelligent task routing
- **Remembers between sessions** with persistent memory systems
- **Provides specialized expertise** without you writing expert prompts
- **Learns from your feedback** to improve over time
- **Tracks costs and performance** so you stay in budget
- **Coordinates complex workflows** across multiple steps

## Honest Limitations ⚠️

- **Not magic** - Still needs clear requirements from you
- **Not a replacement for learning** - You should understand what you're building
- **Enhances Claude Code, doesn't replace it** - Works alongside your existing setup
- **Requires setup** - 2-minute install, not one-click (yet)
- **Early stage (v2.0)** - Expect rough edges, but actively improving
- **Limited by Claude's capabilities** - Can't make Claude do impossible things

**Philosophy:** We're honest about what works and what doesn't. If something doesn't work for you, let us know - that feedback makes it better for everyone.

---

## Use Cases

### Code Review
```
"Review this PR for security vulnerabilities and code quality"
→ Routes to code-reviewer
→ Gets security checklist + quality standards
→ Returns detailed review with specific recommendations
```

### Debugging
```
"This function crashes with undefined, help debug"
→ Routes to debugger
→ Gets systematic debugging methodology
→ Walks through root cause analysis step-by-step
```

### Frontend Design
```
"Design a responsive dashboard with dark mode"
→ Routes to frontend-specialist
→ Gets UI/UX patterns + accessibility guidelines
→ Returns complete design with responsive breakpoints
```

### Database Optimization
```
"This Prisma query takes 2 seconds, optimize it"
→ Routes to db-optimizer
→ Gets query optimization patterns + indexing strategies
→ Returns optimized query with performance benchmarks
```

---

## Advanced Features

- **Custom Skills** - Write your own agent behaviors in TypeScript
- **Multi-step Planning** - Break down complex tasks into executable plans
- **Workflow Coordination** - Automatic checkpoint detection and next-step suggestions
- **Git Integration** - Beginner-friendly Git commands (`save-work`, `list-versions`, `go-back-to`)
- **N8n & Opal Integration** - Connect to workflow automation and access management
- **Dashboard** - Real-time metrics, cost tracking, performance monitoring

**Explore:** See [docs/](docs/) for detailed guides on each feature.

---

## Community & Support

- **Documentation**: [docs/](docs/) folder + this README
- **Issues**: [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- **Contributing**: [CONTRIBUTING.md](docs/CONTRIBUTING.md)

**Questions?** Open an issue or start a discussion - we're here to help.

---

## Development

```bash
# Run tests (722 tests covering core functionality)
npm test

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# View performance dashboard
npm run dashboard
```

**Contributing:** We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

**Project Structure:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive.

---

## Roadmap

### v2.1 (Next Release - Q1 2026)
- Web UI for configuration and monitoring
- One-click installer for Windows/Mac/Linux
- Video tutorials and interactive docs
- More pre-built skills for common workflows

### v2.5 (Q2 2026)
- Cloud-hosted option (no local setup)
- Team collaboration features
- Advanced cost optimization algorithms
- Integration marketplace (GitHub Actions, Jenkins, etc.)

### v3.0 (Vision - Q3 2026)
- Multi-model support (Claude + GPT + local models)
- Visual workflow builder
- Community skills marketplace
- Enterprise features (SSO, audit logs, compliance)

---

## FAQ

**Q: Do I need to be a developer to use this?**
A: If you can use Claude Code, you can use CCB. It's designed to make Claude easier, not harder.

**Q: Does this cost extra on top of Claude Code?**
A: No - CCB uses your existing Claude Code subscription. It helps optimize token usage within your session limits, not API costs.

**Q: How is this different from just using Claude Code?**
A: Claude Code treats every task the same. CCB adds task-specific expertise, memory, and learning.

**Q: Is my code private?**
A: Yes. Everything runs locally through your Claude Code subscription. Optional RAG feature uses OpenAI API for embeddings only.

**Q: What if I don't like it?**
A: Remove it from your MCP config. No lock-in, no vendor dependency.

**Q: How much does it cost?**
A: CCB is free and open-source (AGPL-3.0). Works with your existing Claude Code subscription. Optional RAG feature requires OpenAI API key.

**Q: Can I customize the agents?**
A: Absolutely! Prompt templates are in `src/core/PromptEnhancer.ts`. Evolution config in `src/evolution/AgentEvolutionConfig.ts`.

---

## License

**AGPL-3.0 License** - see [LICENSE](LICENSE) file for details.

This is free and open-source software. If you modify and deploy this as a network service, you must make the source code available to users.

---

## Acknowledgments

- Built with [Model Context Protocol (MCP)](https://github.com/anthropics/mcp)
- Works with [Claude Code](https://claude.com/claude-code)
- Optional [OpenAI Embeddings](https://openai.com) for RAG feature
- Inspired by the Claude Code community
- Thanks to all contributors and early testers

---

<div align="center">

**Built with ❤️ by developers, for developers.**

**Make Claude Code smarter, not louder.**

[Get Started](#quick-start-2-minutes) • [Documentation](docs/) • [Report Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [Join Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

⭐ **Star this repo if CCB makes your development life easier!**

</div>
