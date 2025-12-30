# Smart Agents - Claude Code Prompt Enhancement System

**Enhance your Claude Code workflow with intelligent prompt optimization and specialized agent routing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/kevintseng/smart-agents/releases)
[![Node.js >= 18.0.0](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🚀 What is Smart Agents?

Smart Agents is a prompt enhancement system for Claude Code that:
- Routes tasks to specialized agents based on capabilities
- Optimizes prompts with domain expertise and best practices
- Tracks costs and performance across agent interactions
- Learns and adapts from successful patterns

**What it is:** A prompt enhancement layer for Claude Code
**What it isn't:** An autonomous multi-agent AI system (agents are prompt templates + routing logic)

## 🎯 Key Features

- **13 Specialized Agents**:
  - 5 real implementations (RAG, Evolution, Knowledge Graph, Butler, Test Writer)
  - 7 enhanced prompts, 1 optional feature (Code Reviewer, Debugger, Refactorer, API Designer, Research, Architecture, Data Analyst, Knowledge)
- **Intelligent Routing**: Capability-based routing to the right agent for each task
- **Prompt Enhancement Mode**: Returns enhanced prompts instead of making direct API calls
- **Cost Tracking**: Monitor token usage and costs across agent interactions
- **Evolution System**: Learn from successful patterns and adapt over time
- **MCP Integration**: Seamless integration with Claude Code via Model Context Protocol

---

## 🚀 Quick Start

**Just tell Claude Code**:

```
"Install smart-agents MCP from https://github.com/kevintseng/smart-agents"
```

That's it! Claude Code will:
- ✅ Clone and setup everything automatically
- ✅ Guide you through configuration (RAG features, API keys)
- ✅ Configure MCP server integration
- ✅ Verify installation

**Setup time:** 2-5 minutes

---

## 📋 Prerequisites

- **Claude Code** (handles everything for you)
- **Node.js** >= 18.0.0 (Claude Code will check)
- (Optional) OpenAI API key for RAG features

---

## 🎯 What You Can Do

**Everything through natural conversation with Claude Code:**

```
"Enable RAG features with my OpenAI key"
"Modify the code-reviewer to focus on security"
"Create a custom agent for API documentation"
"Show me the system architecture"
"Why isn't the RAG agent working?"
```

**No manual setup, no file editing, no complex configuration - just ask!**

---

## 💡 Philosophy

**"Just Ask Claude Code"**

Everything in Smart Agents is designed for Claude Code to handle:
- Installation and setup
- Configuration and customization
- Creating new agents and skills
- Debugging and troubleshooting
- Documentation and learning

**You focus on what you want. Claude Code handles how to do it.**

---

## 📖 Learn More

- **[Architecture Overview](docs/architecture/OVERVIEW.md)** - How Smart Agents works
- **[Agent Reference](docs/AGENT_REFERENCE.md)** - All 13 agents explained
- **[Claude Code Installation Guide](docs/guides/CLAUDE_CODE_INSTALLATION.md)** - Detailed setup guide

**Or just ask Claude Code**: "Explain how Smart Agents works"

---

## 🏗️ System Overview

**Claude Code** → **Smart-Agents MCP Server** → **13 Specialized Agents**

Smart Agents routes your requests to the right agent:
- **5 Real Agents**: RAG, Evolution, Knowledge Graph, Butler, Test Writer
- **7 Enhanced Agents**: Code Reviewer, Debugger, Refactorer, API Designer, etc.
- **1 Optional Agent**: Knowledge Synthesis

📊 **Want details?** Ask Claude Code: "Show me the Smart Agents architecture"

Or see: [Architecture Diagram](docs/diagrams/architecture.md)

---

## 🤖 The 13 Agents

**Development**: Code review, testing, development automation
**Operations**: DevOps, security auditing
**Engineering**: Data engineering, ML engineering
**Analysis**: Architecture analysis, RAG search
**Creative**: UI design
**Management**: Project and product management
**Business**: Marketing strategy

**Want to know more?** Ask Claude Code: "Explain the code-reviewer agent"

Or see: [Agent Reference](docs/AGENT_REFERENCE.md)

---

## 🧪 Testing

**Ask Claude Code to run tests**:
```
"Run all tests"
"Run tests with coverage"
"Run E2E tests safely"
```

**Or manually**:
```bash
npm test                 # All tests
npm test:coverage        # With coverage
npm run test:e2e:safe    # E2E (safe mode)
```

---

## 🔧 For Developers

**Want to contribute?** Ask Claude Code:
```
"Show me the project structure"
"How do I add a new agent?"
"Run the development server"
```

**Or see**: [Contributing Guide](CONTRIBUTING.md)

---

## 📚 Documentation

**Key Docs** (or ask Claude Code to explain):
- [Architecture Overview](docs/architecture/OVERVIEW.md)
- [Agent Reference](docs/AGENT_REFERENCE.md)
- [Claude Code Installation](docs/guides/CLAUDE_CODE_INSTALLATION.md)

**Everything else?** Just ask Claude Code!

---

## 🤝 Contributing

**Want to contribute?** Ask Claude Code:
```
"How do I contribute to Smart Agents?"
"Show me the contributing guidelines"
```

Or see: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📞 Need Help?

**Ask Claude Code**:
```
"Why isn't Smart Agents working?"
"How do I debug this issue?"
"Show me troubleshooting steps"
```

**Or**:
- [GitHub Issues](https://github.com/kevintseng/smart-agents/issues)
- [Discussions](https://github.com/kevintseng/smart-agents/discussions)

---

## 📝 License

MIT © 2025

---

## 🙏 Built With

- [Claude Code](https://claude.com/claude-code)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Claude API](https://anthropic.com)
- [OpenAI Embeddings](https://openai.com)
