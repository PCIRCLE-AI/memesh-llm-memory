# Smart-Agents V2.1 User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Using Agents](#using-agents)
4. [Event-Driven Butler](#event-driven-butler)
5. [Best Practices](#best-practices)

## Getting Started

### Installation

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

### Quick Start

1. **Enable the Development Butler**:
   The butler automatically activates at logical checkpoints in your workflow.

2. **Use Agents**:
   ```typescript
   import { TestWriterAgent } from 'smart-agents';
   import { MCPToolInterface } from 'smart-agents';

   const mcp = new MCPToolInterface();
   const testWriter = new TestWriterAgent(mcp);

   await testWriter.writeTestFile('src/utils.ts');
   ```

## Core Concepts

### Three-Layer Architecture

**Layer 1: Prompt Enhancement Core**
- AgentRegistry with 12 essential agents
- Hooks system (session-start, post-tool-use, stop)
- Knowledge Graph for persistent learning

**Layer 2: Event-Driven Development Butler**
- Automatic assistance at 6 checkpoint types
- Zero-interruption workflow automation
- Intelligent recommendations

**Layer 3: Selective Agent Implementations**
- 5 Real implementations: development-butler, test-writer, devops-engineer, project-manager, data-engineer
- 7 Enhanced prompts: architecture-agent, code-reviewer, security-auditor, ui-designer, marketing-strategist, product-manager, ml-engineer
- 1 Optional feature: RAG agent (requires ChromaDB + OpenAI API key)

### Checkpoints

The butler activates at these checkpoints:

1. **BEFORE_COMMIT**: Before git commit
   - Runs code review
   - Verifies tests pass

2. **SIGNIFICANT_CHANGE**: Large code changes
   - Analyzes impact
   - Updates documentation

3. **TEST_FAILURE**: Test failures
   - Debugs issues
   - Suggests fixes

4. **SESSION_END**: End of coding session
   - Saves progress
   - Generates summary

5. **SECURITY_CONCERN**: Security issues detected
   - Runs security audit
   - Suggests fixes

6. **PERFORMANCE_ISSUE**: Performance problems
   - Analyzes bottlenecks
   - Suggests optimizations

## Using Agents

### Real Implementation Agents

#### Test Writer Agent

Automatically generates tests for your code:

```typescript
import { TestWriterAgent } from 'smart-agents';
import { MCPToolInterface } from 'smart-agents';

const mcp = new MCPToolInterface();
const testWriter = new TestWriterAgent(mcp);

// Generate tests for a file
await testWriter.writeTestFile('src/utils.ts');
```

#### DevOps Engineer Agent

Automates CI/CD setup:

```typescript
import { DevOpsEngineerAgent } from 'smart-agents';
import { MCPToolInterface } from 'smart-agents';

const mcp = new MCPToolInterface();
const devops = new DevOpsEngineerAgent(mcp);

// Setup GitHub Actions CI
await devops.setupCI({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});

// Analyze deployment readiness
const analysis = await devops.analyzeDeploymentReadiness();
console.log('Ready to deploy:', analysis.readyToDeploy);
```

### Enhanced Prompt Agents

Enhanced prompt agents leverage MCP tools but don't have dedicated implementations.
Use them via the AgentRegistry:

```typescript
import { AgentRegistry } from 'smart-agents';

const registry = new AgentRegistry();

// Get enhanced prompt agent
const codeReviewer = registry.getAgent('code-reviewer');
console.log(codeReviewer.description);
```

## Event-Driven Butler

The butler automatically triggers at checkpoints. You can also manually trigger it:

```typescript
import { DevelopmentButler } from 'smart-agents';
import { Checkpoint, CheckpointContext } from 'smart-agents';

const butler = new DevelopmentButler();

const context: CheckpointContext = {
  checkpoint: Checkpoint.BEFORE_COMMIT,
  metadata: { files: ['src/test.ts'] },
  timestamp: new Date()
};

const response = await butler.handleCheckpoint(context);
console.log('Butler actions:', response.actions);
console.log('Recommendations:', response.recommendations);
```

## Best Practices

### 1. Let the Butler Work for You

Don't interrupt the butler - it activates automatically at the right moments.

### 2. Review Butler Recommendations

The butler provides recommendations, not forced actions. Review and apply as needed.

### 3. Use Real Agents for Automation

For repetitive tasks, use the real implementation agents (test-writer, devops-engineer, etc.).

### 4. Leverage Knowledge Graph

The system learns from your work. Check the Knowledge Graph for past decisions and solutions.

### 5. Keep MCP Tools Updated

Ensure your MCP tools are up to date for best agent performance.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
