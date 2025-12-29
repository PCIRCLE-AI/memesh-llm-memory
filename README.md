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

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

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

## ⚙️ Environment Setup

### Basic Setup

No environment configuration required for core functionality.

### Optional: RAG Agent (Advanced)

If you want to use the optional RAG agent:

1. Install additional dependencies:
   ```bash
   npm install chromadb openai
   ```

2. Configure environment variables (create `.env` file):
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

### MCP Tools Configuration

Smart-Agents works with Claude Code's MCP (Model Context Protocol) tools. No additional configuration needed if you're using:
- `filesystem` MCP tool (for file operations)
- `memory` MCP tool (for knowledge graph)

See [MCP Documentation](https://modelcontextprotocol.io/) for advanced configuration.

## 🎯 Quick Start

### 1. Enable Development Butler

The butler automatically activates at checkpoints (no configuration needed):

- **`Checkpoint.BEFORE_COMMIT`**: Runs code review and test verification
- **`Checkpoint.SIGNIFICANT_CHANGE`**: Analyzes impact and updates docs
- **`Checkpoint.TEST_FAILURE`**: Debugs and suggests fixes
- **`Checkpoint.SESSION_END`**: Saves progress and generates summary
- **`Checkpoint.SECURITY_CONCERN`**: Audits security issues
- **`Checkpoint.PERFORMANCE_ISSUE`**: Analyzes bottlenecks

```typescript
import { Checkpoint } from 'smart-agents';

// Checkpoints are automatically triggered by the Development Butler
// You can also manually register checkpoint handlers
```

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
│  - Claude Code Hooks (session-start, post-tool-use)        │
│  - Knowledge Graph for learning                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Event-Driven Development Butler                  │
│  - Checkpoint detection (9 types via Checkpoint enum)      │
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

### User Documentation
- **[User Guide](./docs/USER_GUIDE.md)** - Complete usage guide with examples
- **[Agent Reference](./docs/AGENT_REFERENCE.md)** - All 12 agents documented
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Technical Documentation
- **[Architecture](./docs/plans/2025-12-30-smart-agents-v2.1-design.md)** - System design and architecture
- **[API Reference](./docs/API.md)** - Complete API documentation (coming soon)
- **[MCP Integration](https://modelcontextprotocol.io/)** - Model Context Protocol docs

### Getting Help

- 📖 Check the [User Guide](./docs/USER_GUIDE.md) first
- 🔍 Search [existing issues](https://github.com/your-username/smart-agents/issues)
- 💬 Ask in [Discussions](https://github.com/your-username/smart-agents/discussions)
- 🐛 Report bugs via [Issues](https://github.com/your-username/smart-agents/issues/new)

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

### Development Commands

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

### Project Structure

```
smart-agents/
├── src/
│   ├── agents/          # Agent implementations
│   │   ├── DevelopmentButler.ts
│   │   ├── TestWriterAgent.ts
│   │   └── DevOpsEngineerAgent.ts
│   ├── core/            # Core infrastructure
│   │   ├── AgentRegistry.ts
│   │   ├── MCPToolInterface.ts
│   │   └── CheckpointDetector.ts
│   └── index.ts         # Main exports
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
└── docs/                # Documentation
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📝 License

MIT © 2025

## 🙏 Acknowledgments

- Built for [Claude Code](https://claude.com/claude-code)
- Powered by [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Inspired by vibe coding workflow
