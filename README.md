# Smart-Agents V2.1

**Production-ready Prompt Enhancement System with Event-Driven Development Automation for Claude Code**

[![CI/CD](https://github.com/your-username/smart-agents/workflows/CI/badge.svg)](https://github.com/your-username/smart-agents/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What is Smart-Agents?

Smart-Agents is a **Prompt Enhancement System** that supercharges Claude Code with:

✅ **Event-Driven Development Butler** - Automatic assistance at logical checkpoints
✅ **12 Essential Agents** - 5 real implementations + 7 enhanced prompts
✅ **Zero-Interruption Workflow** - Butler triggers only when needed
✅ **MCP-Native Integration** - Leverages Model Context Protocol tools
✅ **Knowledge Graph** - Persistent learning and memory

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smart-agents.git
cd smart-agents

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 🎯 Quick Start

### 1. Enable Development Butler

The butler automatically activates at checkpoints (no configuration needed):

- **BEFORE_COMMIT**: Runs code review and test verification
- **SIGNIFICANT_CHANGE**: Analyzes impact and updates docs
- **TEST_FAILURE**: Debugs and suggests fixes
- **SESSION_END**: Saves progress and generates summary
- **SECURITY_CONCERN**: Audits security issues
- **PERFORMANCE_ISSUE**: Analyzes bottlenecks

### 2. Use Real Implementation Agents

```typescript
import { TestWriterAgent, DevOpsEngineerAgent } from 'smart-agents';
import { MCPToolInterface } from 'smart-agents';

const mcp = new MCPToolInterface();

// Generate tests automatically
const testWriter = new TestWriterAgent(mcp);
await testWriter.writeTestFile('src/utils.ts');

// Setup CI/CD
const devops = new DevOpsEngineerAgent(mcp);
await devops.setupCI({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});
```

### 3. Leverage Enhanced Prompt Agents

```typescript
import { AgentRegistry } from 'smart-agents';

const registry = new AgentRegistry();

// Access any of the 7 enhanced prompt agents
const codeReviewer = registry.getAgent('code-reviewer');
const securityAuditor = registry.getAgent('security-auditor');
const uiDesigner = registry.getAgent('ui-designer');
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Prompt Enhancement Core                          │
│  - AgentRegistry (12 agents)                               │
│  - Hooks system (session-start, post-tool-use, stop)       │
│  - Knowledge Graph for learning                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Event-Driven Development Butler                  │
│  - Checkpoint detection (6 types)                          │
│  - Workflow automation at logical points                   │
│  - Zero-interruption assistance                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Selective Agent Implementations                  │
│  - 5 Real: butler, test-writer, devops, pm, data-engineer │
│  - 7 Enhanced: architecture, code-review, security, etc.   │
│  - 1 Optional: RAG agent (ChromaDB + OpenAI)              │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Documentation

- [User Guide](./docs/USER_GUIDE.md) - Complete usage guide
- [Agent Reference](./docs/AGENT_REFERENCE.md) - All 12 agents documented
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Design Document](./docs/plans/2025-12-30-smart-agents-v2.1-design.md) - Full architecture

## 🤖 Agents

### Real Implementations (5)

| Agent | Description | MCP Tools |
|-------|-------------|-----------|
| **development-butler** | Event-driven automation | filesystem, memory, bash |
| **test-writer** | Automated test generation | filesystem, memory, bash |
| **devops-engineer** | CI/CD automation | filesystem, bash, github |
| **project-manager** | Task tracking | filesystem, memory |
| **data-engineer** | Data pipelines | filesystem, bash, memory |

### Enhanced Prompts (7)

architecture-agent • code-reviewer • security-auditor • ui-designer • marketing-strategist • product-manager • ml-engineer

### Optional Feature (1)

**rag-agent** - RAG-powered assistance (requires ChromaDB + OpenAI API key)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/butler/DevelopmentButler.test.ts

# Run with coverage
npm test -- --coverage
```

## 🔧 Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check
```

## 📝 License

MIT © 2025

## 🙏 Acknowledgments

- Built for [Claude Code](https://claude.com/claude-code)
- Powered by [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Inspired by vibe coding workflow
