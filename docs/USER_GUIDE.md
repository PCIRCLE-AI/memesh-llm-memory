# Smart-Agents User Guide

Complete guide to using the Smart-Agents AI orchestration platform.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Usage Modes](#usage-modes)
4. [Available Agents](#available-agents)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- (Optional) OpenAI API key for RAG functionality
- (Optional) Anthropic API key for orchestrator

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smart-agents.git
cd smart-agents

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify installation
npm test
```

### Environment Setup

Create a `.env` file in the project root:

```env
# For Orchestrator (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For RAG Agent (optional)
OPENAI_API_KEY=your_openai_api_key_here
```

See `.env.example` for all available configuration options.

---

## Core Concepts

### What is Smart-Agents?

Smart-Agents is an **AI agent orchestration platform** with three main components:

1. **Orchestrator**: Intelligently routes tasks to the most appropriate agent
2. **RAG System**: Vector-based retrieval augmented generation for knowledge queries
3. **Development Agents**: Specialized agents for development automation

### Architecture Overview

```
Claude Code (MCP)
    ↓
Smart-Agents MCP Server
    ↓
Orchestrator (Router)
    ↓
├─ RAG System
├─ Development Agents
└─ Knowledge Graph
```

### Key Features

- **Intelligent Routing**: Automatically selects the best agent for each task
- **Cost Optimization**: Tracks and manages API costs across agents
- **Resource Monitoring**: Built-in CPU/memory monitoring
- **Self-Learning**: Evolution system improves performance over time
- **MCP Integration**: Seamlessly integrates with Claude Code

---

## Usage Modes

Smart-Agents can be used in three ways:

### 1. As an MCP Server

Best for: Integration with Claude Code

```bash
# Start the MCP server
npm run mcp
```

Then configure Claude Code to connect to the server.

### 2. As a Running Service

Best for: Standalone orchestration or RAG queries

```bash
# Start the orchestrator
npm run orchestrator

# Or run specific services
npm run rag         # RAG agent
npm run dashboard   # Evolution dashboard
```

### 3. As a Library

Best for: Importing agents into your own code

```typescript
import {
  TestWriterAgent,
  DevOpsEngineerAgent,
  DevelopmentButler
} from 'smart-agents';
import { MCPToolInterface } from 'smart-agents';

const mcp = new MCPToolInterface();

// Use agents programmatically
const testWriter = new TestWriterAgent(mcp);
await testWriter.writeTestFile('src/utils.ts');
```

---

## Available Agents

### Core Agents (Implemented)

#### RAG Agent

Vector-based retrieval and semantic search.

```bash
# Start RAG agent
npm run rag

# Query the RAG system
# (via API or MCP interface)
```

**Features**:
- Semantic search over documents
- Vector embeddings with OpenAI
- ChromaDB vector storage
- Re-ranking for better results

#### Development Butler

Event-driven development automation that activates at logical checkpoints.

```typescript
import { DevelopmentButler, Checkpoint } from 'smart-agents';

const butler = new DevelopmentButler(mcp);

// Analyze code changes
await butler.analyzeCodeChanges({
  files: ['src/app.ts'],
  type: 'modification',
  hasTests: true
});
```

**Checkpoints**:
- `BEFORE_COMMIT`: Code review and test verification
- `SIGNIFICANT_CHANGE`: Impact analysis and doc updates
- `TEST_FAILURE`: Debug assistance
- `SESSION_END`: Progress saving and summary
- `SECURITY_CONCERN`: Security audits
- `PERFORMANCE_ISSUE`: Performance analysis

#### Test Writer Agent

Automated test generation for your codebase.

```typescript
import { TestWriterAgent } from 'smart-agents';

const testWriter = new TestWriterAgent(mcp);

// Generate tests for a file
await testWriter.writeTestFile('src/utils.ts');
```

#### DevOps Engineer Agent

CI/CD automation and deployment configuration.

```typescript
import { DevOpsEngineerAgent } from 'smart-agents';

const devops = new DevOpsEngineerAgent(mcp);

// Setup GitHub Actions CI
await devops.generateCIConfig({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});
```

### Agent Categories (via Orchestrator)

When using the orchestrator, tasks can be routed to agents in these categories:

- **Development** (2 agents): development-butler, code-reviewer
- **Operations** (2 agents): devops-engineer, security-auditor
- **Management** (2 agents): project-manager, product-manager
- **Engineering** (2 agents): data-engineer, ml-engineer
- **Analysis** (2 agents): architecture-agent, rag-agent
- **Creative** (1 agent): ui-designer

**Total**: 13 agents (5 real implementations, 7 enhanced prompts, 1 optional feature)

---

## Best Practices

### 1. Choose the Right Usage Mode

- **MCP Server**: For Claude Code integration
- **Service**: For standalone orchestration
- **Library**: For custom integrations

### 2. Use the Orchestrator for Routing

Let the orchestrator select the best agent instead of hardcoding agent choices:

```typescript
// Good: Let orchestrator route
const result = await orchestrator.route(task);

// Less optimal: Hardcode agent choice
const agent = new SpecificAgent();
```

### 3. Monitor Resource Usage

Use the built-in monitoring to track resource usage:

```bash
# Check system status
npm run orchestrator
# Shows CPU, memory, and cost metrics
```

### 4. Leverage the Knowledge Graph

The system learns from past decisions. Check the Knowledge Graph for:
- Previous solutions to similar problems
- Successful patterns and approaches
- Historical performance data

### 5. Keep API Keys Secure

- Never commit `.env` files
- Use environment variables in production
- Rotate keys regularly

### 6. Use Safe E2E Testing

Always use `:safe` versions of E2E tests:

```bash
# Good
npm run test:e2e:safe

# Bad (can cause system freeze)
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### 1. API Key Errors

**Problem**: `ANTHROPIC_API_KEY is not set`

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Verify key is set
cat .env | grep ANTHROPIC_API_KEY
```

#### 2. RAG Agent Not Starting

**Problem**: ChromaDB connection errors

**Solution**:
```bash
# Install ChromaDB dependencies
npm install chromadb openai

# Verify OpenAI API key
echo $OPENAI_API_KEY
```

#### 3. MCP Server Connection Issues

**Problem**: Claude Code can't connect to MCP server

**Solution**: See [MCP Integration Guide](./MCP_INTEGRATION.md)

#### 4. E2E Tests Causing System Freeze

**Problem**: Running E2E tests freezes the system

**Solution**: Always use the `:safe` version:
```bash
npm run test:e2e:safe
```

### Getting Help

- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions
- Review [Architecture Documentation](../ARCHITECTURE.md) for system internals
- Open an issue on GitHub if problems persist

---

## Next Steps

- **For Developers**: Check out the [API Reference](./api/API_REFERENCE.md)
- **For Architects**: Read the [Architecture Documentation](../ARCHITECTURE.md)
- **For Contributors**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **For Setup Help**: Consult [Setup Guide](./guides/SETUP_GUIDE.md)

---

## Quick Reference

```bash
# Start services
npm run orchestrator  # Orchestrator
npm run rag          # RAG agent
npm run mcp          # MCP server
npm run dashboard    # Dashboard

# Development
npm run dev          # Watch mode
npm run build        # Build
npm test             # Tests

# E2E Testing (always use :safe)
npm run test:e2e:safe
npm run test:e2e:collaboration:safe
npm run test:e2e:security:safe
```

---

For more details, see:
- [Agent Reference](./AGENT_REFERENCE.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
