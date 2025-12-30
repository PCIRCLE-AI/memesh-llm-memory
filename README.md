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

- **13 Specialized Agents**: 5 real implementations (RAG, Evolution, Knowledge Graph, Butler, Test Writer) + 8 prompt-enhanced templates (Code Reviewer, Debugger, Refactorer, API Designer, Research, Architecture, Data Analyst, Knowledge)
- **Intelligent Routing**: Capability-based routing to the right agent for each task
- **Prompt Enhancement Mode**: Returns enhanced prompts instead of making direct API calls
- **Cost Tracking**: Monitor token usage and costs across agent interactions
- **Evolution System**: Learn from successful patterns and adapt over time
- **MCP Integration**: Seamless integration with Claude Code via Model Context Protocol

---

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- Git
- (Optional) OpenAI API key for RAG functionality
- (Optional) Anthropic API key for orchestrator

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/kevintseng/smart-agents.git
cd smart-agents

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

---

## ⚙️ Environment Setup

### Required: API Keys

Create a `.env` file in the project root:

```env
# For Orchestrator (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For RAG Agent (optional)
OPENAI_API_KEY=your_openai_api_key_here
```

See `.env.example` for all available configuration options.

### MCP Server Setup (for Claude Code Integration)

Smart-Agents can be used as an MCP server with Claude Code. See [MCP Integration Guide](./docs/MCP_INTEGRATION.md) for step-by-step setup.

---

## 🎯 Usage

Smart-Agents can be used in **three ways**:

### 1. As an MCP Server (for Claude Code)

```bash
# Start the MCP server
npm run mcp
```

Then configure Claude Code to connect to the server (see MCP Integration docs).

### 2. As a Running Service (Orchestrator)

```bash
# Start the orchestrator service
npm run orchestrator

# Or run specific agents
npm run rag         # RAG agent
npm run dashboard   # Evolution dashboard
```

### 3. As a Library (Import Agents)

```typescript
import { TestWriterAgent, DevOpsEngineerAgent, DevelopmentButler } from 'smart-agents';
import { MCPToolInterface } from 'smart-agents';

const mcp = new MCPToolInterface();

// Generate tests automatically
const testWriter = new TestWriterAgent(mcp);
await testWriter.writeTestFile('src/utils.ts');

// Setup CI/CD
const devops = new DevOpsEngineerAgent(mcp);
await devops.generateCIConfig({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});

// Use Development Butler
const butler = new DevelopmentButler(mcp);
await butler.analyzeCodeChanges({
  files: ['src/app.ts'],
  type: 'modification',
  hasTests: true
});
```

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                            │
│                  (via MCP Protocol)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Smart-Agents MCP Server                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Orchestrator (Router)                                │  │
│  │  - Task Analyzer                                     │  │
│  │  - Agent Router                                      │  │
│  │  - Cost Tracker                                      │  │
│  │  - Resource Pool                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ RAG System   │  │ Development  │  │ Knowledge        │
│ - Embeddings │  │ Agents       │  │ System           │
│ - VectorDB   │  │ - Butler     │  │ - Graph          │
│ - Retrieval  │  │ - TestWriter │  │ - Memory         │
│ - Reranking  │  │ - DevOps     │  │ - Evolution      │
└──────────────┘  └──────────────┘  └──────────────────┘
```

See [Architecture Documentation](./ARCHITECTURE.md) for detailed system design.

---

## 🤖 Available Agents

### Core Agents (Implemented)

| Agent | Description | Usage |
|-------|-------------|-------|
| **RAG Agent** | Vector-based retrieval and semantic search | `npm run rag` |
| **Development Butler** | Event-driven development automation | Library import |
| **Test Writer** | Automated test generation | Library import |
| **DevOps Engineer** | CI/CD configuration and automation | Library import |

### Agent Categories (via Orchestrator)

The orchestrator can route to agents in these categories:
- **Development** (3 agents): development-butler, test-writer, code-reviewer
- **Operations** (2 agents): devops-engineer, security-auditor
- **Management** (2 agents): project-manager, product-manager
- **Engineering** (2 agents): data-engineer, ml-engineer
- **Analysis** (2 agents): architecture-agent, rag-agent
- **Creative** (1 agent): ui-designer
- **Business** (1 agent): marketing-strategist

**Total**: 13 agents (5 real implementations, 7 enhanced prompts, 1 optional feature)

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test:coverage

# Run E2E tests (with resource monitoring)
npm run test:e2e:safe

# Run specific test suites
npm test -- tests/orchestrator/orchestrator.test.ts
npm test -- tests/agents/rag/rag.test.ts
```

⚠️ **Important**: Always use `:safe` versions of E2E tests to prevent system resource exhaustion.

---

## 🔧 Development

### Available Commands

```bash
# Development
npm run dev              # Watch mode
npm run build            # Build TypeScript
npm start                # Start production build
npm run typecheck        # Type checking

# Services
npm run orchestrator     # Start orchestrator
npm run rag              # Start RAG agent
npm run rag:demo         # RAG demo mode
npm run rag:watch        # RAG watch mode (auto-index files)
npm run dashboard        # Evolution dashboard
npm run mcp              # Start MCP server

# CLI Tools
npm run cred             # Credential management

# Testing
npm test                 # Unit tests
npm run test:coverage    # Test coverage report
npm run test:e2e:safe    # E2E tests (safe mode)
npm run test:e2e:collaboration:safe    # Collaboration E2E tests (safe)
npm run test:e2e:security:safe         # Security E2E tests (safe)

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier

# Demos
npm run demo:architecture    # Architecture demo
npm run demo:dashboard       # Dashboard demo
```

### Project Structure

```
smart-agents/
├── src/
│   ├── orchestrator/        # Task routing and orchestration
│   │   ├── index.ts
│   │   ├── AgentRouter.ts
│   │   ├── TaskAnalyzer.ts
│   │   └── CostTracker.ts
│   ├── agents/              # Agent implementations
│   │   ├── rag/            # RAG agent system
│   │   ├── DevelopmentButler.ts
│   │   ├── TestWriterAgent.ts
│   │   └── DevOpsEngineerAgent.ts
│   ├── core/                # Core infrastructure
│   │   ├── AgentRegistry.ts
│   │   ├── MCPToolInterface.ts
│   │   └── CheckpointDetector.ts
│   ├── knowledge-graph/     # Knowledge management
│   ├── evolution/           # Self-learning system
│   └── index.ts             # Main entry & exports
├── tests/                   # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                    # Documentation
    ├── architecture/
    ├── guides/
    └── plans/
```

---

## 📚 Documentation

### User Documentation
- **[User Guide](./docs/USER_GUIDE.md)** - Complete usage guide
- **[Setup Guide](./docs/guides/SETUP_GUIDE.md)** - Detailed setup instructions
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Technical Documentation
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design
- **[MCP Integration](./docs/MCP_INTEGRATION.md)** - Claude Code integration
- **[RAG Deployment](./docs/guides/RAG_DEPLOYMENT.md)** - RAG agent setup
- **[Testing Best Practices](./docs/guides/E2E_TESTING_BEST_PRACTICES.md)** - Testing guidelines

### API Documentation
- **[Agent Reference](./docs/AGENT_REFERENCE.md)** - All agents documented
- **[API Reference](./docs/api/API_REFERENCE.md)** - API documentation
- **[Models Reference](./docs/api/MODELS.md)** - Data models

---

## 🔒 Security

- API keys are loaded from `.env` (never commit)
- `.gitignore` configured to exclude sensitive files
- See `.env.example` for secure configuration examples

---

## 🚀 Performance

- **Resource Monitoring**: Built-in CPU/memory tracking
- **Cost Tracking**: Per-agent and total cost monitoring
- **Optimization**: Intelligent agent routing based on task complexity
- **Evolution System**: Continuous performance improvement through self-learning

---

## 📝 License

MIT © 2025

---

## 🙏 Acknowledgments

- Built for [Claude Code](https://claude.com/claude-code)
- Powered by [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Uses [Anthropic Claude](https://anthropic.com) API
- Integrates [OpenAI](https://openai.com) embeddings for RAG
- Vector storage with [ChromaDB](https://www.trychroma.com/)

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

- 📖 Check the [User Guide](./docs/USER_GUIDE.md) first
- 🔍 Search [existing issues](https://github.com/kevintseng/smart-agents/issues)
- 💬 Ask in [Discussions](https://github.com/kevintseng/smart-agents/discussions)
- 🐛 Report bugs via [Issues](https://github.com/kevintseng/smart-agents/issues/new)
