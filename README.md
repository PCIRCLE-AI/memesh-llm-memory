# Claude Code Buddy (CCB)

🌐 **Website:** [ccb.pcircle.ai](https://ccb.pcircle.ai) | **Languages:** English | [繁體中文](README.zh-TW.md)

---

> **Make Claude Code remember your project, learn from your feedback, and give you expert-level responses without expert-level prompts.**

Claude Code Buddy is a Claude Code Plugin that adds intelligence, memory, and task routing to Claude Code - turning it from a powerful assistant into a project-aware AI teammate.

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

### 3. 🎯 **Capability Guidance**

CCB tailors prompts to the task type and your project context, so reviews, debugging, and design work all get the right structure and guardrails.

**Result:** Expert responses without expert prompts. Context that persists. Guidance that stays focused and actionable.

### What does "evolves with your project" actually mean?

CCB does not retrain models or modify Claude itself.

Instead, evolution comes from a **persistent system layer** inside the Claude Code plugin:

• **Project memory accumulation**
Architectural decisions, conventions, and resolved discussions are stored as structured context.

• **Pattern reinforcement**
Repeated approvals, refactors, and preferred solutions gradually shape how future prompts are constructed.

• **Task-type differentiation**
Review, debugging, refactoring, and design tasks are handled with different internal prompting strategies.

• **Context reuse, not repetition**
Relevant memory is selectively injected, avoiding prompt bloat while preserving continuity.

Over time, Claude Code responses become:
• more aligned with your conventions
• more consistent across sessions
• less dependent on verbose prompts

This is *behavioral evolution through system memory and routing*, not model fine-tuning.

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
CCB routes to: database optimization capability
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
  • Routes to → security review capability
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
| `buddy-help` | Get help on any command | `buddy-help remember` |

### 💾 Project Memory

Project memory is captured automatically as you work. Use `buddy-remember` to recall key decisions and recent progress.

Project memory is automatic. Use `buddy-remember` to recall decisions, patterns, and recent work.

### 📋 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  CCB QUICK REFERENCE                                        │
├─────────────────────────────────────────────────────────────┤
│  🔄 AUTOMATIC (just talk normally)                          │
│     • "Review this code" → routes to code review            │
│     • "Debug this error" → routes to debugging              │
│     • "Design a component" → routes to UI design            │
├─────────────────────────────────────────────────────────────┤
│  🎮 BUDDY COMMANDS                                          │
│     buddy-do "task"         Execute with smart routing      │
│     buddy-remember "query"  Search project memory           │
│     buddy-help [command]    Get help                        │
├─────────────────────────────────────────────────────────────┤
│  🧭 WORKFLOW                                                 │
│     get-session-health     Check context health             │
│     get-workflow-guidance  Get next-step recommendations    │
│     generate-smart-plan    Create implementation plans      │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### ✨ Automatic Expertise Routing

CCB routes requests to internal specialists based on capability signals. You describe intent, CCB handles routing.

**Capabilities include:**
- Code review, security audits, and best-practice validation
- Debugging and root-cause analysis
- Refactoring and technical debt reduction
- API design, backend architecture, and database optimization
- Testing strategy and generation
- Performance profiling and optimization
- UI/UX design and technical writing
- Research, product, and planning support

### 💾 Memory Systems

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

### 🎯 Capability Guidance & Prompt Focus

CCB analyzes task complexity and routes to the right internal capability, shaping prompts for reviews, debugging, planning, or UI/UX work.

**How it works**: TaskAnalyzer examines your request → Estimates complexity (1-10) → Routes to the best capability profile → You get focused guidance without over-tuning prompts.

**Real example**: "Fix this typo" gets a fast, minimal path, while "Design authentication system" gets a structured architecture workflow and risk checklist.

### 🤝 User-Friendly Commands

```bash
# Simple commands that just work
buddy-do "setup authentication"
buddy-do "optimize this database query"
buddy-remember "how we implemented login"
buddy-help
```

### 🔄 Intelligent Workflow Guidance

**CCB knows what's next.** After you write code, it suggests running tests. After tests pass, it suggests code review. No manual thinking required.

```
You write code → CCB: "Code looks good! Run tests next?"
Tests pass → CCB: "Tests green! Ready for code review?"
Review done → CCB: "Review complete! Commit and push?"
```

**Workflow tools:**

- `get-workflow-guidance` - Get next-step recommendations
- `get-session-health` - Check session health status

**Benefits:** Never wonder "what should I do next?" - CCB guides you through the complete development flow.

### 📋 Smart Implementation Planning

**Break down complex features into bite-sized tasks.** CCB generates TDD-structured plans with capability-aware task breakdown.

```
You: "Plan implementation for user authentication"
CCB: [Generates step-by-step plan with:
  - Test-first approach
  - 2-5 minute tasks
  - Right capability for each task
  - Clear success criteria]
```

**Planning tool:**

- `generate-smart-plan` - Create intelligent implementation plans

### 🔒 Security & Reliability

**Built with security and stability as core principles.**

**Security Hardening:**
- ✅ **API Key Validation**: Comprehensive format validation prevents runtime failures
- ✅ **Input Sanitization**: Blocks NaN, Infinity, and malicious input values (DoS prevention)
- ✅ **SQL Injection Protection**: Pure parameterization with JSON functions (no string concatenation)
- ✅ **Logging Sanitization**: 50+ patterns to redact API keys, tokens, credentials, PII from logs
- ✅ **Path Traversal Prevention**: Validates database paths, resolves symlinks, enforces directory boundaries
- ✅ **Zero Vulnerabilities**: Regular `npm audit` with immediate dependency updates

**Reliability:**
- ✅ **1226 Tests Passing**: Comprehensive test coverage across all components
- ✅ **Timer Leak Prevention**: Proper cleanup in all async operations
- ✅ **Race Condition Protection**: Systematic concurrency testing and prevention
- ✅ **Graceful Error Handling**: Detailed error messages with recovery suggestions

**Latest Security Audit (v2.3.5):**
```bash
npm audit
# Result: 0 vulnerabilities found ✅
```

---

## Quick Start (2 Minutes)

### 🚀 One-Click Installation

#### For Cursor Users

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==">
  <img src="https://cursor.com/deeplink/mcp-install-dark.png" alt="Add to Cursor" />
</a>

**Click the button above or paste this link in your browser:**
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==
```

#### For VS Code / Claude Code Users

**Quick MCP Configuration** (add to `~/.claude/mcp_settings.json`):
```json
{
  "mcpServers": {
    "@pcircle/claude-code-buddy-mcp": {
      "command": "npx",
      "args": ["-y", "@pcircle/claude-code-buddy-mcp"]
    }
  }
}
```

Then restart Claude Code and start using CCB!

**📖 Detailed installation guide**: See [QUICK_INSTALL.md](docs/QUICK_INSTALL.md)

### 🔧 Process Management (Optional)

CCB MCP server runs as a background process for each Claude Code CLI session. Normally, this is transparent and requires no action. However, you may want to manage processes when:

- Upgrading to a new version
- Debugging connection issues
- Cleaning up orphaned processes

**Quick Commands:**
```bash
# List all CCB MCP processes
npm run processes:list

# Check for orphaned processes
npm run processes:orphaned

# Clean up all CCB MCP processes
npm run processes:kill

# Check MCP configuration
npm run processes:config
```

**📖 Detailed process management guide**: See [MCP_PROCESS_MANAGEMENT.md](docs/MCP_PROCESS_MANAGEMENT.md)

---

### Prerequisites

- Node.js 20+ ([download](https://nodejs.org/))
- Claude Code installed ([get it here](https://claude.com/claude-code)) or Cursor IDE

### Manual Installation (Alternative)

```bash
# 1. Clone the repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Run the interactive installer (it handles everything)
./scripts/install.sh
```

The installer guides you through **9 interactive steps**:

**Core Setup (Steps 1-7)**:

- ✓ Check prerequisites (Node.js 20+, npm; git optional)
- ✓ Install dependencies
- ✓ Build the project
- ✓ Check system resources
- ✓ Configure environment
- ✓ Configure Claude Code MCP integration
- ✓ Test installation

**Interactive Demos (Steps 8-9)**:

- 📚 **Step 8: Basic Usage Demo** - Learn about CCB's smart routing, example prompts, and memory features
- ✅ **Step 9: MCP Verification** - Confirm the MCP server is reachable

**No API keys needed in MCP server mode** - uses your existing Claude Code subscription.

**Optional configuration** (only if you want to change defaults):
```bash
cp .env.example .env
# For standalone orchestrator usage:
# MCP_SERVER_MODE=false
# ANTHROPIC_API_KEY=your_key_here
# Optional guidance modes:
# BEGINNER_MODE=true
# EVIDENCE_MODE=true
```

### Start Using It

Restart Claude Code, then try:

```
"Analyze my codebase architecture"
"Generate tests for auth.ts"
"Review this code for security issues"
"Optimize this database query"
```

CCB automatically routes tasks to the right capability and enhances prompts with relevant context.

---

## How It Works

```
Your Request
    ↓
CCB analyzes the task
    ↓
Routes to best capability type (e.g., code review, debugging)
    ↓
Enhances prompt with specialized context
    ↓
Claude Code executes with your subscription
    ↓
System learns from your choices (when you override recommendations)
```

**Under the hood:**

- **Curated internal specialists** handle routing and prompt construction
- **Smart routing** analyzes task complexity and automatically selects the right Claude model
- **Evolution system** learns from your choices and continuously improves recommendations

**Technical deep dive:** See [docs/README.md](docs/README.md)

---

## What CCB Does Well ✅

- **Makes Claude Code context-aware** for your specific project
- **Reduces repetitive prompting** through intelligent task routing
- **Remembers between sessions** with persistent memory systems (Knowledge Graph + Project Context)
- **Provides specialized expertise** without you writing expert prompts
- **Keeps responses focused** by routing to the right capability for each task
- **Learns from your choices** when you override recommendations
- **Guides your workflow** with intelligent next-step recommendations
- **Reduces hallucinations** with evidence-first prompting and explicit assumptions
- **Coordinates complex workflows** across multiple steps
- **Cross-platform support** works seamlessly on Windows, macOS, and Linux
- **Production-ready** with comprehensive testing, security hardening, and resource protection

## Honest Limitations ⚠️

- **Not magic** - Still needs clear requirements from you
- **Not a replacement for learning** - You should understand what you're building
- **Enhances Claude Code, doesn't replace it** - Works alongside your existing setup
- **Requires setup** - 2-minute install, not one-click (yet)
- **Early stage (v2.2)** - Expect rough edges, but actively improving
- **Limited by Claude's capabilities** - Can't make Claude do impossible things

**Philosophy:** We're honest about what works and what doesn't. If something doesn't work for you, let us know - that feedback makes it better for everyone.

---

## Use Cases

### Code Review

```
"Review this PR for security vulnerabilities and code quality"
→ Routes to code review capability
→ Gets security checklist + quality standards
→ Returns detailed review with specific recommendations
```

### Debugging

```
"This function crashes with undefined, help debug"
→ Routes to debugging capability
→ Gets systematic debugging methodology
→ Walks through root cause analysis step-by-step
```

### Frontend Design

```
"Design a responsive dashboard with dark mode"
→ Routes to UI design capability
→ Gets UI/UX patterns + accessibility guidelines
→ Returns complete design with responsive breakpoints
```

### Database Optimization

```
"This Prisma query takes 2 seconds, optimize it"
→ Routes to database optimization capability
→ Gets query optimization patterns + indexing strategies
→ Returns optimized query with performance benchmarks
```

---

## Advanced Features

### Multi-Agent Collaboration (A2A Protocol) - NEW

**Enable multiple Claude Code Buddy instances to work together on complex tasks.**

CCB now supports the **A2A (Agent-to-Agent) Protocol**, allowing you to:

- **Delegate tasks** to other Claude instances
- **Distribute workload** across multiple agents
- **Specialize agents** for different domains (frontend, backend, testing, etc.)
- **Track progress** of tasks across agents

**Quick Example:**
```
# Terminal 1: Start agent "alice"
export CCB_AGENT_ID="alice"
npm start

# Terminal 2: Start agent "bob"
export CCB_AGENT_ID="bob"
npm start

# In Claude Desktop (connected to Alice):
"Use a2a-send-task to send this task to agent 'bob':
 'Generate comprehensive test suite for UserService'"
```

**Phase 0.5 Status**: Foundation complete with local agent discovery and task delegation. Full Claude integration coming in Phase 1.

📖 **[Complete A2A Documentation](docs/features/a2a-agent-collaboration.md)** - Quick start, architecture, workflows, and limitations

**4 A2A MCP Tools:**
- `a2a-send-task` - Send tasks to other agents
- `a2a-get-task` - Query task status
- `a2a-list-tasks` - List own tasks
- `a2a-list-agents` - Discover available agents

---

### 🧠 Enhanced Auto-Memory System (Phase 0.6)

**Automatic Knowledge Capture**
- **Task Tracking**: Automatically extracts and records task goals, reasons, and expected outcomes from `buddy-do` calls
- **Decision Recording**: Captures architectural decisions with full context, options considered, and trade-offs
- **Progress Milestones**: Records significant progress points with impact analysis and learnings
- **Error Resolution**: Auto-detects errors from command output and records solutions with root cause analysis

**Entity Types**
- `task_start`: Task initiation with extracted metadata
- `decision`: Technical/architectural decisions
- `progress_milestone`: Significant development milestones
- `error_resolution`: Error patterns and solutions

**Integration**
- Seamlessly integrates with `buddy-do` tool
- Automatic error detection via HookIntegration
- Type-safe entity management with EntityType enum
- Query capabilities via `buddy-remember`

See [Auto-Memory System Guide](docs/guides/auto-memory-system.md) for detailed documentation.

---

### Other Advanced Features

- **Custom Skills** - Write your own routing behaviors in TypeScript
- **Multi-step Planning** - Break down complex tasks into executable plans
- **Workflow Coordination** - Automatic checkpoint detection and next-step suggestions
- **Dashboard** - Real-time metrics, session health monitoring, performance tracking

**Explore:** See [docs/](docs/) for detailed guides on each feature.

---

## Technical Specifications

### Claude 4.5 Model Support

CCB fully supports the latest Claude 4.5 model family:

- **Claude Haiku 4.5** (claude-haiku-4-5-20251015) - Fast responses for simple tasks
  - Pricing: $1.00 input / $5.00 output per MTok
  - Use case: Quick queries, simple refactors, code formatting

- **Claude Sonnet 4.5** (claude-sonnet-4-5-20250929) - Balanced performance for daily development
  - Use case: Code generation, testing, moderate complexity tasks

- **Claude Opus 4.5** (claude-opus-4-5-20251101) - Deep reasoning for complex challenges
  - Use case: Architecture design, complex debugging, creative problem-solving

**Smart Model Selection:** CCB automatically selects the appropriate model based on task complexity, optimizing for both quality and cost.

### MCP Specification Compliance

✅ **Full compliance with MCP Specification 2025-11-25 (Phase 1)**

**Compliance Status:**

| Feature Category | Status | Coverage |
|-----------------|--------|----------|
| Tool Annotations (§4.1) | ✅ Complete | 11/11 tools |
| Output Schemas (§4.2) | ✅ Complete | 11/11 tools |
| Error Handling | ✅ Complete | All tools |
| Documentation (§6) | ✅ Complete | Comprehensive |

**What This Means:**
- All MCP tools include comprehensive annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
- All tools define structured JSON schemas for type-safe, validated responses
- Consistent error handling with actionable suggestions
- Runtime validation ensures data integrity

**📖 Complete Compliance Documentation:** [docs/mcp-compliance.md](docs/mcp-compliance.md)

**11 MCP Tools Available:**

**Core Tools:**
1. `buddy-do` - Smart task execution with capability routing
2. `buddy-remember` - Project memory recall
3. `buddy-help` - Command documentation
4. `get-session-health` - Session monitoring and diagnostics
5. `get-workflow-guidance` - Intelligent workflow recommendations
6. `generate-smart-plan` - Implementation plan generation
7. `hook-tool-use` - Tool usage event tracking

**A2A Protocol Tools (NEW):**
8. `a2a-send-task` - Send tasks to other A2A agents
9. `a2a-get-task` - Get task status from other agents
10. `a2a-list-tasks` - List own tasks
11. `a2a-list-agents` - Discover available agents

See [src/mcp/ToolDefinitions.ts](src/mcp/ToolDefinitions.ts) for complete tool specifications.

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

**Project Structure:** See [docs/README.md](docs/README.md) for a documentation map.

---

## FAQ

**Q: Do I need to be a developer to use this?**
A: If you can use Claude Code, you can use CCB. It's designed to make Claude easier, not harder.

**Q: Does this cost extra on top of Claude Code?**
A: No - CCB uses your existing Claude Code subscription. It helps optimize token usage within your session limits, not API costs.

**Q: How is this different from just using Claude Code?**
A: Claude Code treats every task the same. CCB adds task-specific expertise, memory, and learning.

**Q: Is my code private?**
A: Yes. Everything runs locally through your Claude Code subscription. CCB does not require external AI services.

**Q: What if I don't like it?**
A: Remove it from your MCP config. No lock-in, no vendor dependency.

**Q: How much does it cost?**
A: CCB is free and open-source (AGPL-3.0). It works with your existing Claude Code subscription.

**Q: Can I customize routing behavior?**
A: Absolutely! Prompt templates are in `src/core/PromptEnhancer.ts`. Evolution config in `src/evolution/AgentEvolutionConfig.ts`.

---

## License

**AGPL-3.0 License** - see [LICENSE](LICENSE) file for details.

This is free and open-source software. If you modify and deploy this as a network service, you must make the source code available to users.

---

## Acknowledgments

- Built with [Model Context Protocol (MCP)](https://github.com/anthropics/mcp)
- Works with [Claude Code](https://claude.com/claude-code)
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
