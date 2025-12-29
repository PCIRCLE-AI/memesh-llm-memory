# Agent Reference

**Smart-Agents System**: Intelligent AI agent orchestration platform with MCP server integration

**Total Agents**: 13 registered agents (27 routing types supported)

---

## Overview

Smart-Agents uses a **hybrid architecture**:

1. **Registered Agents (13)**: Fully implemented agents with complete metadata in AgentRegistry
2. **Routing Types (27)**: All agent types supported by the orchestrator's routing system
3. **Prompt Enhancement**: Returns enhanced prompts to Claude Code instead of making direct API calls

---

## Registered Agents (13)

### Real Implementation Agents (5)

These agents have complete TypeScript implementations and can be imported as libraries.

#### 1. development-butler
**Classification**: Real Implementation
**Category**: Development
**MCP Tools**: filesystem, memory, bash

**Description**: Event-driven workflow automation with checkpoint detection

**Key Features**:
- Automatic checkpoint detection (BEFORE_COMMIT, SIGNIFICANT_CHANGE, TEST_FAILURE, SESSION_END, SECURITY_CONCERN, PERFORMANCE_ISSUE)
- Workflow execution at logical points
- Zero-interruption assistance
- Knowledge Graph integration

**API**:
```typescript
import { DevelopmentButler, Checkpoint } from 'smart-agents';

const butler = new DevelopmentButler(mcp);
await butler.analyzeCodeChanges({
  files: ['src/app.ts'],
  type: 'modification',
  hasTests: true
});
```

**Usage**: See [USER_GUIDE.md - Development Butler](./USER_GUIDE.md#development-butler)

---

#### 2. test-writer
**Classification**: Real Implementation
**Category**: Development
**MCP Tools**: filesystem, memory, bash

**Description**: Automated test generation with TDD methodology

**Key Features**:
- Generate Vitest-compatible tests
- Extract function signatures automatically
- Edge case detection
- Knowledge Graph integration for test improvement

**API**:
```typescript
import { TestWriterAgent } from 'smart-agents';

const testWriter = new TestWriterAgent(mcp);
await testWriter.writeTestFile('src/utils.ts');
```

**Methods**:
- `analyzeCode(sourceCode: string): CodeAnalysis` - Analyze code structure
- `generateTests(filePath: string, sourceCode: string): Promise<string>` - Generate test code
- `writeTestFile(sourcePath: string): Promise<void>` - Write complete test file

---

#### 3. devops-engineer
**Classification**: Real Implementation
**Category**: Operations
**MCP Tools**: filesystem, bash, github

**Description**: CI/CD and deployment automation specialist

**Key Features**:
- Generate CI/CD configurations (GitHub Actions)
- Analyze deployment readiness
- Setup automated workflows
- Knowledge Graph tracking for deployment history

**API**:
```typescript
import { DevOpsEngineerAgent } from 'smart-agents';

const devops = new DevOpsEngineerAgent(mcp);
await devops.generateCIConfig({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});
```

**Methods**:
- `generateCIConfig(options: CIConfigOptions): Promise<string>` - Generate CI config
- `analyzeDeploymentReadiness(): Promise<DeploymentAnalysis>` - Check deployment readiness
- `setupCI(options: CIConfigOptions): Promise<void>` - Setup complete CI/CD pipeline

---

#### 4. project-manager
**Classification**: Real Implementation
**Category**: Management
**MCP Tools**: memory, filesystem

**Description**: Project planning, task management, and milestone tracking

**Key Features**:
- Task breakdown and organization
- Milestone tracking
- Progress reporting
- Team coordination assistance

**Status**: Core implementation complete

---

#### 5. data-engineer
**Classification**: Real Implementation
**Category**: Engineering
**MCP Tools**: bash, filesystem

**Description**: Data pipeline development and ETL process automation

**Key Features**:
- Data pipeline design
- ETL process automation
- Data quality management
- Integration with data tools

**Status**: Core implementation complete

---

### Enhanced Prompt Agents (7)

These agents use prompt enhancement to provide specialized capabilities without requiring full implementations.

#### 6. architecture-agent
**Classification**: Enhanced Prompt
**Category**: Analysis

**Description**: System architecture design expert with design pattern knowledge

**Capabilities**: Architecture design, scalability analysis, technology selection, system design patterns

---

#### 7. code-reviewer
**Classification**: Enhanced Prompt
**Category**: Development

**Description**: Expert code review with security analysis and best practices validation

**Capabilities**: Code quality analysis, security vulnerability detection, performance optimization suggestions, best practices enforcement

---

#### 8. security-auditor
**Classification**: Enhanced Prompt
**Category**: Operations

**Description**: Security auditing and vulnerability assessment specialist

**Capabilities**: Security vulnerability scanning, compliance checking, penetration testing guidance, security best practices

---

#### 9. ui-designer
**Classification**: Enhanced Prompt
**Category**: Creative

**Description**: UI/UX design and user experience specialist

**Capabilities**: Interface design, user experience optimization, accessibility compliance, design system development

---

#### 10. marketing-strategist
**Classification**: Enhanced Prompt
**Category**: Business

**Description**: Marketing strategy and brand positioning expert

**Capabilities**: Market analysis, growth hacking, brand strategy, content marketing, SEO optimization

---

#### 11. product-manager
**Classification**: Enhanced Prompt
**Category**: Management

**Description**: Product strategy and feature prioritization specialist

**Capabilities**: User research, feature prioritization, roadmap planning, stakeholder management

---

#### 12. ml-engineer
**Classification**: Enhanced Prompt
**Category**: Engineering

**Description**: Machine learning engineering and model training expert

**Capabilities**: Model training, ML pipeline design, feature engineering, model optimization

---

### Optional Feature Agents (1)

#### 13. rag-agent
**Classification**: Optional Feature
**Category**: Analysis
**Required Dependencies**: chromadb, openai

**Description**: RAG-powered intelligent assistance with vector search

**Key Features**:
- Vector-based semantic search
- OpenAI embeddings integration
- ChromaDB vector storage
- Context-aware retrieval
- Re-ranking for better results

**Implementation**: Full RAG system with 15 TypeScript files including embeddings, vectorstore, reranker, FileWatcher

**Usage**:
```bash
# Requires OpenAI API key
export OPENAI_API_KEY=your_key_here

# Start RAG agent
npm run rag
```

**Status**: Complete implementation (see `src/agents/rag/`)

---

## Orchestrator Routing System

The orchestrator supports **27 agent routing types** for intelligent task distribution:

### Development (9)
- code-reviewer, test-writer, debugger, refactorer, api-designer, db-optimizer, frontend-specialist, backend-specialist, development-butler

### Analysis (5)
- rag-agent, research-agent, architecture-agent, data-analyst, performance-profiler

### Knowledge (1)
- knowledge-agent

### Operations (2)
- devops-engineer, security-auditor

### Creative (2)
- technical-writer, ui-designer

### Utility (2)
- migration-assistant, api-integrator

### Business & Product (2)
- project-manager, product-manager

### Data & Analytics (2)
- data-engineer, ml-engineer

### Marketing (1)
- marketing-strategist

### General (1)
- general-agent (fallback)

**Note**: Not all routing types have registered agents. The orchestrator routes to the most appropriate registered agent or falls back to general-agent.

---

## How Agents Work

### MCP Server Pattern

Smart-Agents operates as an **MCP server** that integrates with Claude Code:

1. **Task Received** → MCP tool call to smart-agents
2. **Task Analysis** → TaskAnalyzer analyzes complexity and requirements
3. **Agent Routing** → AgentRouter selects best agent based on capabilities
4. **Prompt Enhancement** → PromptEnhancer generates optimized prompt for selected agent
5. **Return to Claude Code** → Enhanced prompt returned via MCP
6. **Execution** → Claude Code executes with user's API subscription

### Three Usage Modes

**1. MCP Server Mode** (for Claude Code integration)
```bash
npm run mcp
```

**2. Service Mode** (standalone orchestrator)
```bash
npm run orchestrator  # Start orchestrator
npm run rag          # Start RAG agent
```

**3. Library Mode** (import agents directly)
```typescript
import { TestWriterAgent, DevOpsEngineerAgent, DevelopmentButler } from 'smart-agents';
```

---

## Agent Classification System

### Real Implementation
- Complete TypeScript implementation
- Can be imported as library
- Full API surface
- Direct tool access

### Enhanced Prompt
- Prompt-based enhancement
- No separate implementation required
- Leverages base Claude capabilities
- MCP tool integration for enhanced results

### Optional Feature
- Requires external dependencies
- Full implementation when dependencies available
- Graceful degradation when unavailable

---

## Adding New Agents

See `scripts/create-agent.sh` for automated agent scaffolding.

New agents must be registered in:
1. `src/orchestrator/types.ts` - Add to `AgentType` union
2. `src/core/AgentRegistry.ts` - Register in `registerAllAgents()`
3. (Optional) Create implementation in `src/agents/`

---

## See Also

- [USER_GUIDE.md](./USER_GUIDE.md) - Complete usage guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [API_REFERENCE.md](./api/API_REFERENCE.md) - Detailed API documentation
