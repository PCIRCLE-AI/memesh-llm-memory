# Smart Agents - Intelligent Prompt Enhancement System for Claude Code

> **Transform Claude Code into a specialized AI development team with intelligent routing, prompt optimization, and performance tracking.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/kevintseng/smart-agents/releases)
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
- MCP server with 13 specialized agents
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
│              │  13 Specialized Agents  │                       │
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

## ✨ Key Benefits

### 🎯 For Developers

- **Faster Development**: Right agent for each task = better solutions faster
- **Cost Optimization**: Track and optimize token usage across all interactions
- **Quality Assurance**: Specialized agents apply domain best practices automatically
- **Learning Curve**: No need to craft perfect prompts - agents optimize for you

### 📊 For Teams

- **Consistency**: All team members benefit from same agent expertise
- **Visibility**: Track cost and performance across projects
- **Extensibility**: Easy to add custom agents for specific workflows
- **Integration**: Works seamlessly with existing Claude Code setup

### 🧠 For AI Enthusiasts

- **Evolution System**: Agents learn from successful patterns and improve over time
- **Knowledge Graph**: Build and query structured knowledge about your projects
- **RAG Integration**: Semantic search over project documentation and code
- **MCP Architecture**: Modern, extensible protocol for AI tool integration

---

## 🎪 The 13 Specialized Agents

### Real Implementation Agents (5)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **RAG Agent** *(Optional - requires OpenAI API key)* | Semantic search & retrieval | Vector search, document indexing, context-aware responses |
| **Evolution System** | Performance optimization | Pattern learning, adaptive routing, cost optimization |
| **Knowledge Graph** | Structured knowledge management | Entity relationships, query language, knowledge synthesis |
| **Development Butler** | Event-driven automation | Checkpoint detection, workflow integration, hook system |
| **Test Writer** | Automated test generation | TDD workflows, coverage analysis, test scenarios |

### Enhanced Prompt Agents (7)

| Agent | Domain | Optimization Focus |
|-------|--------|-------------------|
| **Code Reviewer** | Code quality | Security, performance, best practices |
| **Debugger** | Issue resolution | Root cause analysis, systematic debugging |
| **Refactorer** | Code improvement | Design patterns, maintainability, simplification |
| **API Designer** | API development | REST/GraphQL design, documentation |
| **Research Agent** | Technical investigation | Deep research, competitive analysis |
| **Architecture Agent** | System design | Scalability, patterns, trade-offs |
| **Data Analyst** | Data insights | Statistical analysis, visualization |

### Optional Features (1)

| Feature | Purpose | Requirement |
|---------|---------|-------------|
| **Knowledge Synthesis** | Cross-agent learning | Enable with feature flag |

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
✅ "Enable RAG features with my OpenAI key"
✅ "Modify the code-reviewer to focus on security"
✅ "Create a custom agent for API documentation"
✅ "Show me the system architecture"
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

## 🤔 Is Smart Agents Right For You?

### ✅ Best For

- **Software Developers** building complex applications
- **Technical Writers** documenting large codebases
- **DevOps Engineers** automating workflows
- **Teams** wanting consistent AI assistance
- **AI Enthusiasts** exploring MCP and agent systems

### ⚠️ May Not Be Ideal For

- **Beginners** to programming (Claude Code alone may be simpler)
- **Simple Projects** (< 1000 lines of code)
- **Non-Technical Users** (requires development environment)
- **Budget-Constrained** (OpenAI API costs for RAG features)

### 💡 Quick Decision Guide

**Choose Smart Agents if you:**
- ✅ Use Claude Code regularly for development
- ✅ Work on medium to large projects
- ✅ Want specialized assistance for different tasks
- ✅ Need cost/performance tracking
- ✅ Value learning and adaptive systems

**Skip Smart Agents if you:**
- ❌ Rarely use Claude Code
- ❌ Work only on small scripts
- ❌ Prefer manual prompt crafting
- ❌ Don't need performance analytics

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

Key terms:
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ✅ Must disclose source code
- ✅ **Network use = distribution** (must share source even for SaaS)
- ✅ Derivative works must use AGPL v3
- ✅ Changes must be documented

---

## 🙏 Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) - AI-powered development CLI
- [Model Context Protocol](https://modelcontextprotocol.io/) - Standardized AI tool integration
- [Anthropic Claude API](https://anthropic.com) - LLM capabilities
- [OpenAI Embeddings](https://openai.com) - Semantic search (optional)

