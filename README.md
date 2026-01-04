# Claude Code Buddy (CCB)

🌐 **Website:** [ccb.pcircle.ai](https://ccb.pcircle.ai) | **Languages:** English | [繁體中文](README.zh-TW.md)

---

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

### 3. 💰 **Smart Model Selection**
Routes tasks to the right Claude model based on complexity:
- **Haiku** (simple tasks) - Fast & cheap
- **Sonnet** (medium tasks) - Balanced performance
- **Opus** (complex tasks) - Maximum capability

Saves ~40% on token costs by using smaller models for simpler tasks.

**Result:** Expert responses without expert prompts. Context that persists. Cost-effective intelligence that never forgets.

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

## How to Use CCB

After installation, CCB works **two ways**:

### 🔄 Automatic Mode (Just Talk Normally)

CCB enhances your requests automatically in the background. No special commands needed:

```
You: "Review this code for security issues"
     ↓
CCB automatically:
  • Detects task type → code review
  • Routes to → code-reviewer agent
  • Enhances prompt with → security checklist, best practices
     ↓
Claude responds with specialized security expertise
```

**Just use Claude Code as usual** - CCB works invisibly to improve responses.

### 🎮 Buddy Commands (Explicit Control)

Use these commands when you want specific CCB features:

| Command | What It Does | Example |
|---------|--------------|---------|
| `buddy-do` | Execute task with smart routing | `buddy-do "setup user authentication"` |
| `buddy-remember` | Search project memory | `buddy-remember "why did we choose PostgreSQL"` |
| `buddy-stats` | View performance dashboard | `buddy-stats week` |
| `buddy-help` | Get help on any command | `buddy-help remember` |

### 💾 Memory Commands (Store & Recall Knowledge)

**Save decisions and patterns:**
```
create-entities [{
  name: "Auth Decision Jan 2024",
  entityType: "decision",
  observations: [
    "Chose JWT over sessions for stateless API",
    "Using RS256 for token signing",
    "Refresh tokens stored in httpOnly cookies"
  ]
}]
```

**Recall from memory:**
```
recall-memory "authentication decisions"
buddy-remember "API design patterns we discussed"
```

**Add to existing knowledge:**
```
add-observations [{
  entityName: "Auth Decision Jan 2024",
  contents: ["Added rate limiting: 100 req/min per user"]
}]
```

### 📚 RAG Feature (Search Your Knowledge Base)

If you enabled RAG during installation:

**Step 1: Drop files to index** (auto-indexed every 5 seconds):
```bash
~/Documents/claude-code-buddy-knowledge/
  ├── architecture.md      # Your system design docs
  ├── api-spec.json        # API specifications
  ├── meeting-notes.txt    # Team decisions
  └── onboarding.pdf       # Any .md, .txt, .json, .pdf, .docx
```

**Step 2: Ask questions naturally:**
```
You: "How does authentication work in this project?"
CCB: [Searches your indexed files, returns relevant context]

You: "What did we decide about the database schema?"
CCB: [Finds your architecture.md, shows the relevant sections]
```

### 🔧 Git Commands (No Git Knowledge Needed)

| Command | What It Does | Example |
|---------|--------------|---------|
| `git-save-work` | Stage all + commit | `git-save-work "added login feature"` |
| `git-list-versions` | Show recent commits | `git-list-versions` |
| `git-go-back` | Checkout previous version | `git-go-back 3` |
| `git-status` | Current status (friendly) | `git-status` |
| `git-show-changes` | Show what changed | `git-show-changes` |
| `git-create-backup` | Create local backup | `git-create-backup` |

### 📋 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  CCB QUICK REFERENCE                                        │
├─────────────────────────────────────────────────────────────┤
│  🔄 AUTOMATIC (just talk normally)                          │
│     • "Review this code" → routes to code-reviewer          │
│     • "Debug this error" → routes to debugger               │
│     • "Design a component" → routes to frontend-specialist  │
├─────────────────────────────────────────────────────────────┤
│  🎮 BUDDY COMMANDS                                          │
│     buddy-do "task"         Execute with smart routing      │
│     buddy-remember "query"  Search project memory           │
│     buddy-stats [period]    View performance dashboard      │
│     buddy-help [command]    Get help                        │
├─────────────────────────────────────────────────────────────┤
│  💾 MEMORY COMMANDS                                         │
│     create-entities         Save decisions/patterns         │
│     recall-memory           Retrieve past work              │
│     add-observations        Update existing knowledge       │
│     create-relations        Link related entities           │
├─────────────────────────────────────────────────────────────┤
│  📚 RAG (if enabled)                                        │
│     Drop files to: ~/Documents/claude-code-buddy-knowledge/ │
│     Then just ask: "How does X work in this project?"       │
├─────────────────────────────────────────────────────────────┤
│  🔧 GIT (beginner-friendly)                                 │
│     git-save-work "msg"     Commit all changes              │
│     git-list-versions       Show history                    │
│     git-go-back N           Revert to version N             │
│     git-status              Current status                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### ✨ Automatic Expertise Routing

**36 specialized agents** automatically selected based on your task:

**Types:** 9 real implementations + 26 enhanced prompts + 1 optional (RAG)

**You don't choose the agent - CCB picks the right one for your task automatically.**

<details>
<summary><b>📋 View All 36 Agents</b></summary>

#### 🔧 Real Implementation Agents (9)
These agents have actual code implementations with MCP tool integration:

- **development-butler** - Event-driven workflow automation, code maintenance, testing, dependency management, git workflow, build automation
- **test-writer** - Test automation specialist, TDD expert, coverage analysis
- **e2e-healing-agent** - End-to-end test automation with self-healing capabilities, Playwright-powered browser testing, automatic failure analysis and code fixing
- **devops-engineer** - DevOps, CI/CD, infrastructure automation, deployment expert
- **project-manager** - Project planning, task management, milestone tracking, team coordination
- **data-engineer** - Data pipeline development, ETL processes, data quality management
- **workflow-orchestrator** - Intelligent workflow platform selector (Opal vs n8n), workflow automation orchestration
- **opal-automation** - Google Opal browser automation, natural language workflow creation, AI-powered prototypes
- **n8n-workflow** - n8n workflow API integration, production workflow management, multi-system integration

#### 💬 Enhanced Prompt Agents (26)
These agents use specialized prompts without MCP tool integration:

**Development (13 agents)**
- **frontend-developer** - Frontend development expert, React/Vue/Angular specialist
- **backend-developer** - Backend development expert, API and server-side specialist
- **frontend-specialist** - Frontend architecture, performance optimization, modern frameworks expert
- **backend-specialist** - Backend architecture, scalability, microservices expert
- **database-administrator** - Database expert, schema design, query optimization specialist
- **db-optimizer** - Database optimization, query tuning, index design specialist
- **performance-engineer** - Performance optimization expert, bottleneck analysis, caching specialist
- **performance-profiler** - Performance profiling, bottleneck identification, optimization analysis
- **code-reviewer** - Expert code review, security analysis, and best practices validation
- **debugger** - Advanced debugging, root cause analysis, systematic problem solving
- **refactorer** - Code refactoring, technical debt reduction, code quality improvement
- **api-designer** - API design, REST/GraphQL architecture, API documentation expert
- **test-automator** - Test automation specialist, automated testing expert

**Analysis & Research (4 agents)**
- **architecture-agent** - System architecture expert, design patterns, scalability analysis
- **research-agent** - Technical research, feasibility analysis, technology evaluation
- **data-analyst** - Data analysis, statistical modeling, business intelligence expert
- **knowledge-agent** - Knowledge management, information retrieval, documentation organization

**Operations & Security (1 agent)**
- **security-auditor** - Security auditing, vulnerability assessment, compliance expert

**Management (1 agent)**
- **product-manager** - Product strategy, user research, feature prioritization expert

**Creative (2 agents)**
- **ui-designer** - UI/UX design, user experience, interface design specialist
- **technical-writer** - Technical documentation, API documentation, user guides expert

**Business (1 agent)**
- **marketing-strategist** - Marketing strategy, brand positioning, growth hacking expert

**Engineering (1 agent)**
- **ml-engineer** - Machine learning engineering, model training, ML pipeline expert

**Utility (3 agents)**
- **migration-assistant** - Migration planning, version upgrades, legacy system modernization
- **api-integrator** - API integration, third-party services, SDK implementation expert
- **general-agent** - General purpose agent for miscellaneous tasks and fallback scenarios

#### 🎯 Optional Feature Agents (1)
Requires external dependencies (ChromaDB + OpenAI):

- **rag-agent** - Knowledge retrieval, vector search, embedding-based context search

</details>

### 💾 Three Types of Memory

**RAG (Retrieval-Augmented Generation) with Drop Inbox**
```
You: "Show me how authentication works in this project"
CCB: [Searches your codebase, finds actual auth files, shows you the patterns]
```

**Drop Inbox Magic:**
- Drop files into `~/Documents/claude-code-buddy-knowledge/`
- CCB automatically indexes them every 5 seconds
- Supports: .md, .txt, .json, .pdf, .docx
- No commands needed - just drop and done!

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

### 💰 Smart Model Selection & Cost Savings

CCB analyzes task complexity and routes to the optimal Claude model, saving ~40% on token costs:

- **Haiku** (simple/cheap) - Quick tasks like code formatting, simple bug fixes
- **Sonnet** (balanced) - Standard development work, code reviews
- **Opus** (complex/quality) - Architecture design, complex debugging

**How it works**: TaskAnalyzer examines your request → Estimates complexity (1-10) → Routes to the most cost-effective Claude model → You get quality results without overpaying for simple tasks.

**Real example**: "Fix this typo" uses Haiku (fast & cheap), "Design authentication system" uses Opus (maximum capability), "Review this PR" uses Sonnet (balanced).

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

### 💾 Beginner-Friendly Git Assistant

**No Git commands needed.** Just tell CCB what you want in plain language:

```bash
# Save your work
git-save-work "added login feature"

# See your versions
git-list-versions

# Go back to a previous version
git-go-back 3

# Show what changed
git-show-changes
```

**8 Git tools that speak human:**
- `git-save-work` - Save with friendly commit message
- `git-list-versions` - List recent versions
- `git-status` - Current status in readable format
- `git-show-changes` - See what changed
- `git-go-back` - Time travel to previous versions
- `git-create-backup` - Create local backup
- `git-setup` - Setup Git for new projects
- `git-help` - Show available commands

**Perfect for:** Beginners who find Git intimidating, or anyone who wants simple version control.

### 🔄 Intelligent Workflow Guidance

**CCB knows what's next.** After you write code, it suggests running tests. After tests pass, it suggests code review. No manual thinking required.

```
You write code → CCB: "Code looks good! Run tests next?"
Tests pass → CCB: "Tests green! Ready for code review?"
Review done → CCB: "Review complete! Commit and push?"
```

**4 workflow tools:**
- `get-workflow-guidance` - Get next-step recommendations
- `get-session-health` - Check session health status
- `reload-context` - Reload CLAUDE.md when needed
- `record-token-usage` - Track token consumption

**Benefits:** Never wonder "what should I do next?" - CCB guides you through the complete development flow.

### 📋 Smart Implementation Planning

**Break down complex features into bite-sized tasks.** CCB generates TDD-structured plans with agent-aware task breakdown.

```
You: "Plan implementation for user authentication"
CCB: [Generates step-by-step plan with:
  - Test-first approach
  - 2-5 minute tasks
  - Right agent for each task
  - Clear success criteria]
```

**Planning tool:**
- `generate-smart-plan` - Create intelligent implementation plans

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

The installer guides you through **11 interactive steps**:

**Core Setup (Steps 1-8)**:
- ✓ Check prerequisites (Node.js 18+, npm, git)
- ✓ Install dependencies
- ✓ Build the project
- ✓ Check system resources
- ✓ Configure environment
- ✓ **Optional RAG Setup**: Choose between HuggingFace (FREE) or OpenAI (paid) for enhanced knowledge retrieval
- ✓ Configure Claude Code MCP integration
- ✓ Test installation

**Interactive Demos (Steps 9-10)**:
- 📚 **Step 9: Basic Usage Demo** - Learn about CCB's smart routing, example prompts, memory types, and cost savings
- 📁 **Step 10: RAG Feature Demo** (if enabled) - Discover the Drop Inbox magic with a sample document

**No API keys needed for core features** - uses your existing Claude Code subscription.

**Optional RAG Feature**:
- **FREE option**: HuggingFace embeddings (no API key cost)
- **Paid option**: OpenAI embeddings (bring your own API key)
- **Drop Inbox**: Auto-indexes files from `~/Documents/claude-code-buddy-knowledge/` every 5 seconds

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
System learns from your choices (when you override recommendations)
```

**Under the hood:**
- **36 total agents**: 9 real implementations (Test Writer, DevOps Engineer, Workflow Orchestrator, etc.) + 26 enhanced prompts + 1 optional (RAG)
- **Smart routing** analyzes task complexity and automatically selects the right agent and Claude model
- **Evolution system** learns from your choices and continuously improves recommendations

**Technical deep dive:** See [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## What CCB Does Well ✅

- **Makes Claude Code context-aware** for your specific project
- **Reduces repetitive prompting** through intelligent task routing
- **Remembers between sessions** with persistent memory systems (RAG + Knowledge Graph + Project Context)
- **Provides specialized expertise** without you writing expert prompts
- **Saves token costs** by routing to optimal Claude models (Haiku/Sonnet/Opus)
- **Learns from your choices** when you override agent recommendations
- **Guides your workflow** with intelligent next-step recommendations
- **Coordinates complex workflows** across multiple steps
- **Cross-platform support** works seamlessly on Windows, macOS, and Linux
- **Production-ready** with comprehensive testing, security hardening, and resource protection

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
- **N8n & Opal Integration** - Workflow automation (N8n REST API + Opal browser automation with natural language)
- **Dashboard** - Real-time metrics, session health monitoring, performance tracking

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
# Run tests (292 test files covering core functionality)
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

## FAQ

**Q: Do I need to be a developer to use this?**
A: If you can use Claude Code, you can use CCB. It's designed to make Claude easier, not harder.

**Q: Does this cost extra on top of Claude Code?**
A: No - CCB uses your existing Claude Code subscription. It helps optimize token usage within your session limits, not API costs.

**Q: How is this different from just using Claude Code?**
A: Claude Code treats every task the same. CCB adds task-specific expertise, memory, and learning.

**Q: Is my code private?**
A: Yes. Everything runs locally through your Claude Code subscription. Optional RAG feature offers two embedding options: Local Ollama (no API key, fully private) or OpenAI API (bring your own key).

**Q: What if I don't like it?**
A: Remove it from your MCP config. No lock-in, no vendor dependency.

**Q: How much does it cost?**
A: CCB is free and open-source (AGPL-3.0). Works with your existing Claude Code subscription. Optional RAG feature is FREE - use local Ollama embeddings (no API key) or bring your own OpenAI API key.

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

**Disclaimer:** This is an independent open-source project and is not affiliated with, endorsed by, or officially connected to Anthropic PBC or its products (including Claude and Claude Code). Claude Code Buddy is a third-party tool designed to integrate with Claude Code.

---

<div align="center">

**Built with ❤️ by developers, for developers.**

**Make Claude Code smarter, not louder.**

[Get Started](#quick-start-2-minutes) • [Documentation](docs/) • [Report Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues) • [Join Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

⭐ **Star this repo if CCB makes your development life easier!**

</div>
