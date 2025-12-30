# Smart Agents - Intelligent Prompt Enhancement System for Claude Code

> **Transform Claude Code into a specialized AI development team with intelligent routing, prompt optimization, and performance tracking.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/kevintseng/smart-agents/releases)
[![Node.js >= 18.0.0](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Claude Code MCP](https://img.shields.io/badge/Claude_Code-MCP_Server-purple.svg)](https://modelcontextprotocol.io/)

[English](#) | [繁體中文](README.zh-TW.md)

---

## 🎯 What is Smart Agents?

**Smart Agents** is an **MCP (Model Context Protocol) server** that enhances Claude Code with **specialized AI agents** through intelligent prompt optimization and task routing.

**In simple terms:** It makes Claude Code smarter by:
- 🎯 **Routing** your tasks to the right specialized agent
- ✨ **Optimizing** prompts with domain expertise and best practices
- 📊 **Tracking** costs and performance automatically
- 🧠 **Learning** from successful patterns over time

---

## 💡 Why Smart Agents?

### The Challenge with Claude Code

When you're "vibe coding" with Claude Code, you might notice:

- 🤔 **Same approach for everything** - Whether you're debugging, designing APIs, or writing docs, Claude uses the same general knowledge without specialized expertise
- 💭 **No memory of success** - Claude doesn't remember which solutions worked well yesterday, so you explain the same context repeatedly
- 💰 **Always maximum power** - Every task uses the same powerful (expensive) model, even for simple questions
- ✍️ **Manual prompt crafting** - Complex tasks require you to write detailed prompts to get quality results

### How Smart Agents Solves This

Smart Agents adds an intelligent layer between you and Claude Code:

- 🎯 **Specialized Expertise** - Your debugging request automatically gets debugger expertise, design requests get architectural patterns, security reviews get security best practices
- 🧠 **Learns from What Works** - Remembers successful approaches and automatically applies them to similar tasks in the future
- 💡 **Cost-Smart Recommendations** - Suggests lighter models for simple tasks, reserves powerful models for complex challenges
- ✨ **Auto-Enhanced Prompts** - Transforms your casual requests into optimized prompts with domain knowledge and best practices built-in

**Think of it as:** Giving Claude Code a team of specialists (code reviewer, architect, debugger, etc.) and a good memory - so you can focus on creating instead of prompt engineering.

**What It Is:**
- Prompt enhancement layer for Claude Code
- MCP server with 18 specialized agents
- Intelligent task routing system
- Cost & performance tracking tool

---

## 🚀 How Smart Agents Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code CLI                         │
│                    (Your Development Interface)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ MCP Protocol
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Agents MCP Server                      │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ Task Analyzer│───▶│ Agent Router │───▶│Cost Tracker  │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                            │                                    │
│                            ▼                                    │
│              ┌─────────────────────────┐                       │
│              │  18 Specialized Agents  │                       │
│              └─────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────┐                   ┌──────────────────┐
│   Real Agents    │                   │ Enhanced Prompts │
│  (5 implements)  │                   │  (7 templates)   │
├──────────────────┤                   ├──────────────────┤
│ • RAG Agent      │                   │ • Code Reviewer  │
│ • Evolution Sys  │                   │ • Debugger       │
│ • Knowledge Graph│                   │ • Refactorer     │
│ • Dev Butler     │                   │ • API Designer   │
│ • Test Writer    │                   │ • Research       │
└──────────────────┘                   │ • Architecture   │
                                       │ • Data Analyst   │
                                       └──────────────────┘
```

### Request Flow

```
1. User Request
   ↓
2. Task Analysis (complexity, capability requirements)
   ↓
3. Agent Selection (route to best-fit agent)
   ↓
4. Prompt Enhancement (optimize with domain expertise)
   ↓
5. Performance Tracking (cost, duration, quality)
   ↓
6. Learning & Adaptation (improve future routing)
```

### Tech Stack

**Core Technologies:**
- **Node.js** (>= 18.0.0) - Runtime environment
- **TypeScript** - Type-safe development
- **Model Context Protocol (MCP)** - Claude Code integration
- **SQLite** (with WAL mode) - Performance tracking & evolution storage
- **Vectra** - Vector database for knowledge graph

**Optional Dependencies:**
- **OpenAI API** - Embeddings for RAG semantic search (requires API key)

**Development Tools:**
- **Vitest** - Testing framework
- **ESLint** - Code quality
- **Prettier** - Code formatting

---

## 🎪 The 18 Specialized Agents

### Real Implementation Agents (5)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **RAG Agent** *(Optional - requires OpenAI API key)* | Semantic search & retrieval | Vector search, document indexing, context-aware responses |
| **Knowledge Graph Agent** | Structured knowledge management | Entity relationships, graph queries, knowledge synthesis |
| **Test Writer Agent** | Automated test generation | TDD workflows, coverage analysis, test scenarios, vitest integration |
| **Development Butler Agent** | Event-driven automation | Checkpoint detection, workflow integration, hook system |
| **DevOps Engineer Agent** | CI/CD & deployment | Infrastructure automation, GitHub Actions/GitLab CI, deployment analysis |

### Enhanced Prompt Agents (12)

| Agent | Domain | Optimization Focus |
|-------|--------|-------------------|
| **Code Reviewer** | Code quality | Security, performance, best practices |
| **Debugger** | Issue resolution | Root cause analysis, systematic debugging |
| **Refactorer** | Code improvement | Design patterns, maintainability, simplification |
| **API Designer** | API development | REST/GraphQL design, documentation |
| **Architecture Agent** | System design | Scalability, patterns, trade-offs |
| **Research Agent** | Technical investigation | Deep research, competitive analysis |
| **Data Analyst** | Data insights | Statistical analysis, visualization |
| **Security Auditor** | Security & compliance | Vulnerability assessment, security auditing |
| **UI Designer** | UI/UX design | User experience, interface design |
| **Marketing Strategist** | Marketing strategy | Brand positioning, growth hacking |
| **Product Manager** | Product strategy | User research, feature prioritization |
| **ML Engineer** | Machine learning | Model training, ML pipeline engineering |

### Optional Features (1)

| Feature | Purpose | Requirement |
|---------|---------|-------------|
| **Knowledge Synthesis** | Cross-agent learning | Enable with feature flag |

---

## 🏗️ System Infrastructure

While agents are the user-facing components, Smart Agents also includes powerful infrastructure that operates behind the scenes:

### Workflow Guidance & Session Monitoring

**Intelligent Recommendations** - Context-aware suggestions at development checkpoints
- **Token Usage Tracking** - Automatic monitoring with threshold-based alerts (80%/90%)
- **Session Health Monitoring** - Multi-signal quality tracking combining token usage and session state
- **Automatic Context Refresh** - CLAUDE.md reload when token usage reaches critical threshold
- **Workflow Phase Detection** - Identifies current development stage (code-written, test-complete, commit-ready, committed)

**Components:**
- **SessionTokenTracker** (`src/core/SessionTokenTracker.ts`) - Real-time token monitoring
- **WorkflowGuidanceEngine** (`src/core/WorkflowGuidanceEngine.ts`) - Phase-aware recommendations
- **SessionContextMonitor** (`src/core/SessionContextMonitor.ts`) - Health status aggregation
- **ClaudeMdReloader** (`src/mcp/ClaudeMdReloader.ts`) - MCP-based context refresh with cooldown protection

**MCP Tools:**
- `get-workflow-guidance` - Get recommendations for current workflow phase
- `get-session-health` - Check token usage and session quality
- `reload-context` - Manually refresh CLAUDE.md context
- `record-token-usage` - Track token consumption

**How It Works:**
```
Workflow Checkpoint Detected → Analyze Phase → Generate Recommendations → Monitor Health → Auto-Reload if Critical
```

**Benefits:**
- 🎯 Prevents session degradation before it happens
- 📊 Transparent visibility into token budget
- 🔄 Automatic CLAUDE.md reload at 90% threshold
- ✨ Smart recommendations for next steps
- 🧠 Learns from successful workflow patterns

### Smart-Planning System

**Intelligent implementation planning that absorbs and enhances Superpowers `writing-plans` skill:**

#### Key Features

**1. Agent-Aware Task Breakdown**
- Analyzes feature requirements and assigns appropriate agents
- Maps task types to agent capabilities automatically
- Example: Security reviews → Security Auditor, API design → API Designer

**2. Learned Pattern Application**
- Retrieves successful patterns from Evolution System
- Filters by success rate (≥75%) and observation count (≥5)
- Enhances task descriptions with proven best practices
- Adjusts priorities based on critical patterns

**3. Bite-Sized Task Generation**
- Breaks features into 2-5 minute incremental tasks
- Each task is independently testable
- Automatic dependency identification
- Phase assignment (backend → frontend → testing)

**4. TDD-First Structure**
- Every task follows 5-step TDD workflow:
  1. Write failing test
  2. Run test to verify it fails
  3. Implement minimal code to pass
  4. Run test to verify it passes
  5. Commit with semantic message

#### Usage via MCP Tool

**Generate Plan:**
```typescript
// Via MCP tool
const plan = await callTool('generate-smart-plan', {
  featureDescription: 'Add user authentication with JWT',
  requirements: ['API endpoints', 'password hashing', 'token validation'],
  constraints: {
    projectType: 'backend-api',
    techStack: ['Node.js', 'Express', 'JWT'],
    complexity: 'medium',
  },
});
```

**Plan Output:**
- Title, goal, architecture overview
- Tech stack recommendations
- Bite-sized tasks (2-5 min each)
- Agent assignments based on capabilities
- Dependencies and execution order
- TDD steps for each task
- File operations (create/modify/test)

#### Integration with Evolution System

**Smart-Planning learns from:**
- Previous successful implementations
- Failed approaches and anti-patterns
- Team coding preferences
- Domain-specific best practices

**Continuous Improvement:**
- Each completed plan feeds back to LearningManager
- Success patterns are reinforced
- Failed patterns are avoided
- Recommendations improve over time

### Evolution System

The Evolution System is **not an agent** - it's the infrastructure that makes the agent system learn and improve over time.

**Components:**

- **PerformanceTracker** (`src/evolution/PerformanceTracker.ts`)
  - Tracks cost, duration, and quality metrics for every agent interaction
  - SQLite-based storage with automatic cleanup (WAL mode)
  - Provides historical data for learning and optimization

- **LearningManager** (`src/evolution/LearningManager.ts`)
  - Analyzes patterns from successful and failed interactions
  - Identifies which agents work best for which tasks
  - Suggests routing improvements based on historical data

- **AdaptationEngine** (`src/evolution/AdaptationEngine.ts`)
  - Automatically adjusts agent selection based on performance
  - Implements cost-aware routing (prefer cheaper models when appropriate)
  - Learns from user feedback and corrections

**How It Works:**
```
User Request → Agent Executes → Metrics Collected → Patterns Learned → Routing Improved
```

**Benefits:**
- 📊 Automatic performance tracking (no manual logging)
- 🧠 Learns from every interaction
- 💰 Cost optimization over time
- 🎯 Smarter agent routing

**Storage:** All evolution data is stored in `~/.claude/evolution.db` (SQLite with WAL mode)

---

## 🚀 Quick Start

### One-Command Installation

**Just tell Claude Code:**

```
"Install smart-agents MCP from https://github.com/kevintseng/smart-agents"
```

Claude Code will handle everything:
- ✅ Clone repository
- ✅ Install dependencies
- ✅ Configure MCP server
- ✅ Setup optional features (RAG, API keys)
- ✅ Verify installation

**Setup time:** 2-5 minutes

### Post-Installation

Everything through natural conversation:

```
✅ "Enable smart-agents RAG features with my OpenAI key"
✅ "Use smart-agents to modify the code-reviewer to focus on security"
✅ "Use smart-agents to create a custom agent for API documentation"
✅ "Show me the smart-agents system architecture"
✅ "Why isn't the RAG agent working?"
```

**No manual configuration, no file editing - just ask!**

---

## 📋 Prerequisites

### Required

- **Claude Code** (latest version)
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Optional

- **OpenAI API Key** (for RAG features)
- **Git** (for version control features)

---

## 📖 Documentation

### Quick Links

- **[Installation Guide](docs/guides/CLAUDE_CODE_INSTALLATION.md)** - Detailed setup instructions
- **[Architecture Overview](docs/architecture/OVERVIEW.md)** - System design and components
- **[Agent Reference](docs/AGENT_REFERENCE.md)** - All agents explained
- **[API Documentation](docs/API.md)** - MCP tool interface

### Learning Path

1. **Start Here**: [Quick Start](#-quick-start)
2. **Understand**: [Architecture Overview](#-how-smart-agents-works)
3. **Explore**: [Agent Reference](docs/AGENT_REFERENCE.md)
4. **Deep Dive**: [Architecture Documentation](docs/architecture/OVERVIEW.md)

**Or ask Claude Code:** "Explain how Smart Agents works"

---

## 🧪 Testing & Quality

### Test Coverage

```
✅ 447/447 tests passing (100%)
✅ Unit tests for core logic
✅ Integration tests for MCP interface
✅ E2E tests for agent workflows
✅ Regression tests for evolution system
```

### Running Tests

**Ask Claude Code:**
```
"Run all tests"
"Run tests with coverage"
"Run E2E tests safely"
```

**Or manually:**
```bash
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:e2e:safe       # E2E tests (resource monitored)
```

---

## 🔧 Development

### Local Development

```bash
# Clone repository
git clone https://github.com/kevintseng/smart-agents
cd smart-agents

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run MCP server
npm run mcp
```

### Project Structure

```
smart-agents/
├── src/
│   ├── agents/           # Agent implementations
│   ├── orchestrator/     # Routing & coordination
│   ├── evolution/        # Learning & adaptation
│   ├── mcp/             # MCP server interface
│   └── utils/           # Shared utilities
├── tests/               # Test suites
├── docs/                # Documentation
└── examples/            # Usage examples
```

### Security Best Practices

**Development Environment Security:**

- ✅ **Never expose dev server to public network** - Dev server binds to `localhost` by default
- ✅ **Separate browsing contexts** - Don't run dev server while browsing untrusted websites
- ✅ **Use isolated environments** - Consider separate browser profiles for development
- ✅ **Regular security audits** - Run `npm audit` periodically to check for vulnerabilities

**Production Security:**
- All MCP tool inputs validated with Zod schemas
- No SQL injection risks (parameterized queries)
- Resource limits enforced (cooldowns, rate limits)
- No `eval()` or `exec()` of user input

For detailed security audit results, see [docs/SECURITY_AUDIT_2025-12-31.md](docs/SECURITY_AUDIT_2025-12-31.md).

---


## 📊 Performance & Metrics

### Typical Performance

- **Task Analysis**: < 100ms
- **Agent Routing**: < 50ms
- **Prompt Enhancement**: < 200ms
- **Evolution Learning**: Background, non-blocking

### Resource Usage

- **Memory**: ~50MB (base) + agent-specific
- **Storage**: ~10MB (database) + vector indexes
- **Network**: MCP protocol only (no external APIs except optional RAG)

---

## 📞 Support & Community

### Get Help

1. **Ask Claude Code**: "Help me troubleshoot Smart Agents"
2. **GitHub Issues**: [Report bugs or request features](https://github.com/kevintseng/smart-agents/issues)
3. **Discussions**: [Ask questions & share ideas](https://github.com/kevintseng/smart-agents/discussions)

### Stay Updated

- **GitHub**: [Watch releases](https://github.com/kevintseng/smart-agents)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Releases**: [Release notes](https://github.com/kevintseng/smart-agents/releases)

---

## 📝 License

**GNU Affero General Public License v3.0**

This project is licensed under the GNU AGPL v3. See [LICENSE](LICENSE) for full terms.

---

🇹🇼 **Crafted in Taiwan | 台灣製造** - Where innovation meets tradition

---

## 🙏 Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) - AI-powered development CLI
- [Model Context Protocol](https://modelcontextprotocol.io/) - Standardized AI tool integration
- [Anthropic Claude API](https://anthropic.com) - LLM capabilities
- [OpenAI Embeddings](https://openai.com) - Semantic search (optional)

