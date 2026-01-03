# Claude Code Buddy (CCB) v2.2 User Guide

**Version**: 2.2.0
**Last Updated**: 2025-12-31

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Using Agents](#using-agents)
4. [Event-Driven Butler](#event-driven-butler)
5. [Workflow Guidance System](#workflow-guidance-system)
6. [Smart Planning System](#smart-planning-system)
7. [Best Practices](#best-practices)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Claude Code** (latest version)
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **OpenAI API Key** (optional, for RAG features)

### Installation

**Option 1: Quick Install via Claude Code**
```
"Install claude-code-buddy MCP from https://github.com/PCIRCLE-AI/claude-code-buddy"
```

Claude Code will handle everything automatically:
- Clone repository
- Install dependencies
- Configure MCP server
- Setup optional features
- Verify installation

**Option 2: Manual Installation**
```bash
# Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy
cd claude-code-buddy

# Install dependencies
npm install

# Build the project
npm run build

# Configure MCP server (edit Claude Code config)
# Add to ~/.claude.json:
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server.js"]
    }
  }
}
```

### Quick Start

**1. Verify Installation**
```
# In Claude Code, test MCP server
"Show me the Claude Code Buddy system status"
```

**2. Use Your First Agent**
```
# Test Writer Agent example
"Use test-writer agent to generate tests for src/utils.ts"

# DevOps Engineer Agent example
"Use devops-engineer agent to setup GitHub Actions CI"
```

**3. Enable Workflow Guidance**
```
# Track token usage and get recommendations
"Show my session health status"
"Get workflow guidance for my current phase"
```

---

## Core Concepts

### Three-Layer Architecture

Claude Code Buddy uses a three-layer architecture for intelligence and automation:

```
┌─────────────────────────────────────────────────────────────────┐
│           Layer 1: MCP Server Interface                         │
│  (Communication between Claude Code and Claude Code Buddy)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│      Layer 2: Orchestration & Intelligence                      │
│  - TaskAnalyzer: Understand user intent                         │
│  - AgentRouter: Select best agent for the task                  │
│  - PromptEnhancer: Optimize prompts with domain expertise       │
│  - PerformanceTracker: Monitor cost and quality                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│             Layer 3: Agent Implementations                       │
│  - Real Agents: TestWriter, DevOps, RAG, Butler                 │
│  - Enhanced Prompts: CodeReviewer, Debugger, etc.               │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow Phases

Claude Code Buddy tracks your development workflow through 5 phases:

1. **idle** - No active work, ready for new task
2. **code-written** - Code implementation complete, tests needed
3. **test-complete** - Tests passing, ready for commit
4. **commit-ready** - Changes staged, commit message ready
5. **committed** - Changes committed, ready for next task

Each phase triggers different recommendations and automation.

### Agent Classification

Agents are classified into three types:

**1. Real Implementation Agents** (5 agents)
- TestWriterAgent ✨
- DevOpsEngineerAgent ✨
- RAGAgent (optional, requires OpenAI API key)
- KnowledgeGraphAgent
- DevelopmentButlerAgent

**2. Enhanced Prompt Agents** (12 agents)
- Code quality: CodeReviewer, Debugger, Refactorer
- Design: APIDesigner, ArchitectureAgent, UIDesigner
- Analysis: ResearchAgent, DataAnalyst, SecurityAuditor
- Business: MarketingStrategist, ProductManager
- ML: MLEngineer

**3. Optional Features** (1)
- Knowledge Synthesis (cross-agent learning)

---

## Using Agents

### Test Writer Agent ✨ (Phase 3)

**Purpose**: Automated test generation with code analysis and TDD workflow integration.

**When to Use**:
- After implementing new functions or classes
- When test coverage is insufficient
- To follow TDD (Test-Driven Development) workflow
- When code-written checkpoint is detected

**Basic Usage**:
```typescript
import { TestWriterAgent } from './agents/TestWriterAgent';
import { MCPToolInterface } from './mcp/MCPToolInterface';

const mcp = new MCPToolInterface();
const testWriter = new TestWriterAgent(mcp);

// Analyze source code and extract functions
const analysis = testWriter.analyzeCode(sourceCode);
console.log('Functions found:', analysis.functions.length);

// Generate test file for source code
const testCode = await testWriter.generateTests(
  'src/utils.ts',
  sourceCode
);

// Write test file automatically (src/utils.ts → tests/utils.test.ts)
await testWriter.writeTestFile('src/utils.ts');
```

**MCP Tool Usage** (via Claude Code):
```
# Via MCP tool
"Use test-writer agent to analyze src/authentication.ts and generate tests"

# Specify test framework
"Use test-writer agent with vitest to create tests for src/api/users.ts"

# Generate tests for entire module
"Use test-writer agent to generate tests for all files in src/services/"
```

**Features**:
- ✅ Code analysis with function extraction
- ✅ Normal case and edge case test generation
- ✅ Vitest-compatible test files
- ✅ Automatic import path resolution
- ✅ Knowledge Graph recording for test coverage
- ⚠️ Currently uses regex parsing (AST-based parsing planned for production)

**Test File Structure**:
```typescript
// Generated test file structure
import { describe, it, expect } from 'vitest';
import { functionName } from '../src/module';

describe('moduleName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => {
      const result = functionName(normalInput);
      expect(result).toBe(expectedOutput);
    });

    it('should handle edge case: null input', () => {
      const result = functionName(null);
      expect(result).toBe(defaultValue);
    });
  });
});
```

---

### DevOps Engineer Agent ✨ (Phase 3)

**Purpose**: CI/CD pipeline generation and deployment readiness analysis.

**When to Use**:
- Setting up CI/CD for new projects
- Preparing for deployment
- Automating build and test workflows
- When commit-ready checkpoint is detected

**Basic Usage**:
```typescript
import { DevOpsEngineerAgent } from './agents/DevOpsEngineerAgent';
import { MCPToolInterface } from './mcp/MCPToolInterface';

const mcp = new MCPToolInterface();
const devops = new DevOpsEngineerAgent(mcp);

// Generate CI configuration (GitHub Actions or GitLab CI)
const ciConfig = await devops.generateCIConfig({
  platform: 'github-actions', // or 'gitlab-ci'
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});

// Setup CI automatically (generates and writes config file)
await devops.setupCI({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});

// Analyze deployment readiness
const analysis = await devops.analyzeDeploymentReadiness();
console.log('Ready to deploy:', analysis.readyToDeploy);
console.log('Blockers:', analysis.blockers);
```

**MCP Tool Usage** (via Claude Code):
```
# Setup CI for project
"Use devops-engineer agent to setup GitHub Actions CI"

# Analyze deployment readiness
"Use devops-engineer agent to check if we're ready to deploy"

# Generate GitLab CI config
"Use devops-engineer agent to create GitLab CI pipeline"
```

**Features**:
- ✅ GitHub Actions support
- ✅ GitLab CI support
- ✅ Deployment readiness analysis
- ✅ Automatic config file generation
- ✅ Knowledge Graph recording for DevOps configurations
- ⚠️ Currently uses mocked checks (actual test runner integration planned)

**Generated CI Configuration Example** (GitHub Actions):
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build
```

---

### RAG Agent (Optional)

**Purpose**: Semantic search and retrieval-augmented generation.

**Prerequisites**: Requires OpenAI API key for embeddings.

**When to Use**:
- Searching project documentation
- Finding relevant code examples
- Context-aware code generation
- Knowledge base queries

**Setup**:
```bash
# Set OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Or in .env file
OPENAI_API_KEY=your-api-key-here
```

**Basic Usage**:
```typescript
import { RAGAgent } from './agents/rag/RAGAgent';

const ragAgent = new RAGAgent({
  openaiApiKey: process.env.OPENAI_API_KEY!
});

// Index documents
await ragAgent.indexDocument({
  content: 'Your documentation or code here',
  metadata: { source: 'README.md', type: 'documentation' }
});

// Search with semantic similarity
const results = await ragAgent.search({
  query: 'How do I setup authentication?',
  topK: 5
});

console.log('Relevant documents:', results);
```

**MCP Tool Usage**:
```
"Use RAG agent to search for authentication examples in the codebase"
"Index all markdown files in docs/ using RAG agent"
```

---

### Development Butler Agent

**Purpose**: Event-driven development automation with checkpoint detection.

**When to Use**:
- Automatic workflow recommendations
- Checkpoint-triggered actions
- Development phase transitions
- Test and commit automation

**How It Works**:
The Butler automatically detects development checkpoints and triggers appropriate actions:

```
code-written → Suggest: Run tests, Use test-writer
test-complete → Suggest: Review changes, Prepare commit
commit-ready → Suggest: Use devops-engineer, Push changes
committed → Suggest: Next task, Create PR
```

**Checkpoint Detection**:
```typescript
import { DevelopmentButler } from './agents/DevelopmentButler';
import { CheckpointDetector } from './core/CheckpointDetector';

const butler = new DevelopmentButler();
const detector = new CheckpointDetector();

// Detect current checkpoint
const checkpoint = await detector.detectCheckpoint({
  hasUncommittedChanges: true,
  hasTests: false,
  testsPassing: false
});

// Get recommendations
const recommendations = await butler.getRecommendations(checkpoint);
console.log('Suggested actions:', recommendations);
```

**MCP Tool Usage**:
```
"What does the development butler recommend right now?"
"Show current workflow checkpoint"
```

---

### Knowledge Graph Agent

**Purpose**: Structured knowledge management with entity relationships.

**When to Use**:
- Storing project decisions
- Tracking component relationships
- Building knowledge base
- Cross-referencing information

**Basic Usage**:
```typescript
import { KnowledgeGraphAgent } from './agents/KnowledgeGraphAgent';

const kgAgent = new KnowledgeGraphAgent();

// Create entities
await kgAgent.createEntities([
  {
    name: 'Authentication System',
    type: 'component',
    observations: [
      'Uses JWT tokens',
      'Supports OAuth providers',
      'Session timeout: 24 hours'
    ]
  }
]);

// Create relationships
await kgAgent.createRelations([
  {
    from: 'User Service',
    to: 'Authentication System',
    type: 'depends_on'
  }
]);

// Search entities
const results = await kgAgent.searchNodes('authentication');
```

---

### Enhanced Prompt Agents

**Code Quality Agents**:
- **code-reviewer**: Security, performance, best practices
- **debugger**: Root cause analysis, systematic debugging
- **refactorer**: Design patterns, maintainability

**Design Agents**:
- **api-designer**: REST/GraphQL design, documentation
- **architecture-agent**: Scalability, patterns, trade-offs
- **ui-designer**: User experience, interface design

**Analysis Agents**:
- **research-agent**: Deep research, competitive analysis
- **data-analyst**: Statistical analysis, visualization
- **security-auditor**: Vulnerability assessment, auditing

**Business Agents**:
- **marketing-strategist**: Brand positioning, growth hacking
- **product-manager**: User research, feature prioritization

**ML Agent**:
- **ml-engineer**: Model training, ML pipeline engineering

**MCP Tool Usage**:
```
"Use code-reviewer agent to review src/authentication.ts"
"Use debugger agent to find the root cause of login failures"
"Use api-designer agent to design REST API for user management"
```

---

## Event-Driven Butler

### Checkpoint Detection

The Development Butler automatically detects workflow checkpoints:

**Detection Logic**:
```typescript
interface CheckpointContext {
  hasUncommittedChanges: boolean;
  hasTests: boolean;
  testsPassing: boolean;
  stagedFiles: string[];
}

// Checkpoint Priority (first match wins)
1. committed: No uncommitted changes
2. commit-ready: Changes staged, tests passing
3. test-complete: Tests exist and passing
4. code-written: Uncommitted changes exist
5. idle: No active work
```

### Automatic Recommendations

**code-written Checkpoint**:
```
✨ Detected: New code without tests

Recommendations:
1. Use test-writer agent to generate tests
2. Run existing tests to verify no regressions
3. Review changes before testing
```

**test-complete Checkpoint**:
```
✅ Detected: Tests passing

Recommendations:
1. Review changes (git diff)
2. Stage changes (git add)
3. Prepare commit message
```

**commit-ready Checkpoint**:
```
🚀 Detected: Ready to commit

Recommendations:
1. Use devops-engineer to setup CI (if not exists)
2. Commit changes (git commit)
3. Push to remote (git push)
```

### Integration with Workflow Guidance

The Butler integrates with the Workflow Guidance System for intelligent recommendations:

```
Butler Checkpoint Detection → Workflow Guidance → Smart Recommendations
```

---

## Workflow Guidance System

### Session Token Tracking

**Purpose**: Monitor token usage and prevent session degradation.

**Token Thresholds**:
- **Healthy** (<80%): Normal operation
- **Warning** (80-90%): Proactive recommendations
- **Critical** (≥90%): Automatic CLAUDE.md reload

**MCP Tools**:
```
# Record token usage
"Record 50000 tokens used in current session"

# Check session health
"Show my session health status"

# Get workflow guidance
"Get workflow guidance for current phase"

# Manual context reload (if needed)
"Reload CLAUDE.md context"
```

**Automatic Behavior**:
```typescript
// Token tracking happens automatically
Session starts → Token usage: 0%
Work progresses → Token usage: 75% → Continue normally
More work → Token usage: 85% → Warning + recommendations
Continued work → Token usage: 92% → Auto-reload CLAUDE.md
```

### Workflow Recommendations

**Phase-Aware Guidance**:

**code-written Phase**:
```
📝 Recommendations:
- Run tests to verify no regressions
- Use test-writer agent if tests missing
- Consider code review before committing
```

**test-complete Phase**:
```
✅ Recommendations:
- Review changes (git diff)
- Prepare commit with semantic message
- Update documentation if needed
```

**commit-ready Phase**:
```
🚀 Recommendations:
- Verify all tests passing
- Use devops-engineer for CI setup
- Push changes to remote
```

### Session Health Monitoring

**Health Status**:
```typescript
interface SessionHealth {
  tokenUsagePercentage: number;
  quality: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
  shouldReload: boolean;
}

// Example output
{
  tokenUsagePercentage: 87,
  quality: 'warning',
  recommendations: [
    'Consider summarizing conversation',
    'Complete current task before starting new complex work',
    'CLAUDE.md reload approaching at 90%'
  ],
  shouldReload: false
}
```

### CLAUDE.md Reload

**Automatic Reload** (at 90% threshold):
```
Token usage: 90% → Auto-reload CLAUDE.md → Fresh context → Token usage: ~5%
```

**Cooldown Protection**:
- Minimum 5 minutes between reloads
- Prevents reload spam
- Uses mutex for concurrency control

---

## Smart Planning System

### Intelligent Planning

**Purpose**: Generate implementation plans that leverage agent capabilities and learned patterns.

**Key Features**:
1. **Agent-Aware Task Breakdown** - Assigns tasks to appropriate agents
2. **Learned Pattern Application** - Uses successful patterns from Evolution System
3. **Bite-Sized Tasks** - Breaks features into 2-5 minute incremental tasks
4. **TDD-First Structure** - Every task follows Test → Implement → Verify workflow

### Using the Planning System

**MCP Tool Usage**:
```
# Generate implementation plan
"Generate smart plan for user authentication with JWT"

# With specific requirements
"Generate smart plan for:
 Feature: Real-time notifications
 Requirements: WebSocket support, browser notifications, offline queue
 Tech stack: Node.js, Socket.IO, Redis"
```

**Programmatic Usage**:
```typescript
import { PlanningEngine } from './planning/PlanningEngine';
import { AgentRegistry } from './orchestrator/AgentRegistry';
import { LearningManager } from './evolution/LearningManager';

const registry = new AgentRegistry();
const learning = new LearningManager(/* db */);
const planning = new PlanningEngine(registry, learning);

// Generate plan
const plan = await planning.generatePlan({
  featureDescription: 'Add user authentication with JWT',
  requirements: [
    'API endpoints for login/register',
    'Password hashing with bcrypt',
    'JWT token generation and validation',
    'Session management'
  ],
  constraints: {
    projectType: 'backend-api',
    techStack: ['Node.js', 'Express', 'JWT'],
    complexity: 'medium'
  }
});

console.log('Plan:', plan);
```

### Plan Output Structure

```typescript
interface ImplementationPlan {
  title: string;
  goal: string;
  architecture: string;
  techStack: string[];
  tasks: Task[];
}

interface Task {
  id: number;
  title: string;
  description: string;
  agent: string;              // Assigned agent (e.g., 'backend-developer')
  dependencies: number[];      // Task IDs this depends on
  phase: string;              // 'backend', 'frontend', 'testing', etc.
  tddSteps: TDDStep[];
  files: FileOperation[];
}

interface TDDStep {
  step: number;
  action: string;             // 'Write test', 'Run test (fail)', 'Implement', etc.
  command?: string;           // Command to execute
  expected?: string;          // Expected outcome
}
```

### Example Generated Plan

```
# User Authentication Implementation Plan

## Goal
Add JWT-based authentication to the API with secure password hashing and session management.

## Architecture
RESTful API with stateless JWT authentication. Password hashing using bcrypt. Token validation middleware for protected routes.

## Tech Stack
- Node.js (runtime)
- Express (web framework)
- JWT (token generation)
- bcrypt (password hashing)
- PostgreSQL (user storage)

## Tasks

### Task 1: User Model and Database Schema
**Agent**: backend-developer
**Phase**: backend
**Dependencies**: []

**TDD Steps**:
1. Write failing test for User model creation
2. Run test to verify it fails
3. Implement User model with password hashing
4. Run test to verify it passes
5. Commit with message: "feat: add User model with password hashing"

**Files**:
- Create: src/models/User.ts
- Create: tests/models/User.test.ts
- Modify: src/database/migrations/create-users-table.sql

### Task 2: Authentication API Endpoints
**Agent**: api-designer
**Phase**: backend
**Dependencies**: [1]

**TDD Steps**:
1. Write failing test for /api/auth/register endpoint
2. Write failing test for /api/auth/login endpoint
3. Run tests to verify they fail
4. Implement registration endpoint
5. Implement login endpoint with JWT generation
6. Run tests to verify they pass
7. Commit with message: "feat: add authentication endpoints"

... (more tasks)
```

---

## Best Practices

### Test-Driven Development

**Always follow TDD workflow**:
```
1. Write failing test
2. Run test (verify it fails)
3. Implement minimal code
4. Run test (verify it passes)
5. Commit changes
```

**Use Test Writer Agent**:
```
# After implementing new function
"Use test-writer agent to generate tests for src/utils/validation.ts"

# Before refactoring
"Use test-writer agent to ensure complete test coverage"
```

### Continuous Integration

**Setup CI early**:
```
# First thing in new project
"Use devops-engineer agent to setup GitHub Actions CI"
```

**Verify before deploy**:
```
# Before deploying
"Use devops-engineer agent to check deployment readiness"
```

### Documentation

**Keep documentation updated**:
- Update README.md when adding features
- Document API changes immediately
- Use Knowledge Graph for architectural decisions

### Workflow Optimization

**Monitor token usage**:
```
# Check session health regularly
"Show my session health status"
```

**Complete phases before context switch**:
```
✅ Good: code-written → test-complete → commit-ready → committed
❌ Bad: code-written → context switch → lose progress
```

### Agent Selection

**Use the right agent for the task**:
- New code → test-writer
- Bug fixing → debugger
- Code review → code-reviewer
- Architecture design → architecture-agent
- Deployment → devops-engineer

---

## Configuration

### Environment Variables

**Required**:
```bash
# None - Claude Code Buddy works out of the box
```

**Optional**:
```bash
# For RAG features
OPENAI_API_KEY=your-openai-api-key

# For custom evolution database location
EVOLUTION_DB_PATH=/path/to/evolution.db
```

### MCP Server Configuration

**Add to Claude Code config** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Agent Configuration

**Customize agent behavior** (advanced):
```typescript
// src/config/agent-config.ts
export const agentConfig = {
  testWriter: {
    testFramework: 'vitest',  // or 'jest'
    mockingLibrary: 'vitest', // or 'sinon'
    coverageThreshold: 80
  },
  devops: {
    defaultPlatform: 'github-actions', // or 'gitlab-ci'
    autoSetupCI: true,
    requireDeploymentChecks: true
  },
  butler: {
    autoRecommendations: true,
    checkpointDetection: 'auto' // or 'manual'
  }
};
```

### Workflow Guidance Configuration

**Customize token thresholds** (advanced):
```typescript
// src/config/workflow-config.ts
export const workflowConfig = {
  tokenThresholds: {
    healthy: 0.80,    // 80%
    warning: 0.90,    // 90%
    critical: 0.95    // 95%
  },
  reloadCooldown: 300000, // 5 minutes in ms
  autoReload: true
};
```

---

## Troubleshooting

### Common Issues

**Issue: MCP server not responding**
```
Solution:
1. Check if claude-code-buddy server is running
2. Verify config.json path is correct
3. Restart Claude Code
4. Check logs: cat ~/.claude/logs/claude-code-buddy.log
```

**Issue: Test Writer Agent not generating tests**
```
Solution:
1. Verify source file exists and is readable
2. Check file contains exported functions
3. Ensure filesystem MCP tools are available
4. Try with simpler source file first
```

**Issue: DevOps Agent setup fails**
```
Solution:
1. Check if .github/workflows/ or .gitlab-ci.yml already exists
2. Verify write permissions on project directory
3. Ensure bash MCP tools are available
```

**Issue: Token usage not being tracked**
```
Solution:
1. Verify Workflow Guidance System is enabled
2. Check if record-token-usage MCP tool is available
3. Manually record token usage: "Record 50000 tokens used"
```

**Issue: CLAUDE.md not reloading automatically**
```
Solution:
1. Check if token usage reached 90% threshold
2. Verify reload cooldown hasn't blocked reload
3. Manually trigger: "Reload CLAUDE.md context"
4. Check ClaudeMdReloader logs
```

For more issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## Next Steps

- **Explore Agents**: Try different agents for various tasks
- **Setup CI/CD**: Use devops-engineer agent for automation
- **Monitor Progress**: Use workflow guidance for optimization
- **Learn Patterns**: Smart Planning improves over time
- **Join Community**: Share feedback and best practices

---

**Happy coding with Claude Code Buddy! 🚀**

**Version**: 2.2.0
**Documentation**: https://github.com/PCIRCLE-AI/claude-code-buddy
**Issues**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
