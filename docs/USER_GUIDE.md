# Claude Code Buddy (CCB) v2.2 User Guide

**Version**: 2.2.0
**Last Updated**: 2026-01-20

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Using Capabilities](#using-capabilities)
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
- **Node.js** >= 20.0.0
- **npm** >= 9.0.0

### Installation

**Option 1: Interactive Installer (Recommended)**
```bash
# Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# Run the interactive installer
./scripts/install.sh
```

The installer will:
- Check prerequisites (Node.js 20+, npm)
- Install dependencies
- Build the project
- Create `.env` from `.env.example`
- Configure Claude Code MCP integration
- Run validation tests

**Option 2: Manual Installation**
```bash
# Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# Install dependencies
npm install

# Create env file (optional, uses defaults)
cp .env.example .env

# Build the project
npm run build
```

**Configure MCP server** (edit `~/.claude.json`):
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**API keys**: Not required in MCP server mode (`MCP_SERVER_MODE=true`). If running standalone orchestrator, set `MCP_SERVER_MODE=false` and `ANTHROPIC_API_KEY` in `.env`.

### Quick Start

**1. Verify Installation**
```
# In Claude Code, test MCP server
"Show me the Claude Code Buddy system status"
```

**2. Use Your First Capability**
```
# Code review capability
"Review src/utils.ts for quality and edge cases"

# Test generation capability
"Write tests for src/utils.ts with vitest"
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
│  - Capability Router: Select best capability for the task       │
│  - PromptEnhancer: Optimize prompts with domain expertise       │
│  - PerformanceTracker: Monitor cost and quality                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│           Layer 3: Capability Implementations                   │
│  - Capability modules and prompt templates                      │
│  - Workflow automation and memory systems                       │
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

### Capability Model

CCB routes work by capability rather than exposing individual agents. Capabilities are grouped to keep UX predictable:

- **Code Quality**: review, refactor, debugging, best practices
- **Testing**: test generation, coverage, e2e validation
- **Architecture & Performance**: architecture, scalability, profiling
- **Data & Backend**: API design, database/query work, integrations
- **UI/UX**: frontend, UI design, accessibility
- **Product & Docs**: product planning, documentation

The router selects the best internal implementation automatically based on your request.

---

## Using Capabilities

CCB exposes a small, focused toolset. Describe outcomes in natural language and CCB routes the work to the best internal capability.

### Core Task Execution

Use `buddy-do` for most tasks:

```
"Review src/api/auth.ts for security and correctness"
"Refactor the user service to reduce duplication"
"Write vitest tests for src/utils/date.ts"
"Design a REST API for user sessions"
```

### Memory and Project Context

Use `buddy-remember` to recall decisions and patterns:

```
"Remember how we implemented authentication"
"Remember why we chose SQLite for local storage"
```

### Planning and Breakdown

Use `generate-smart-plan` for structured plans:

```
"Generate a plan for adding email-based login with rate limiting"
```

### Workflow Guidance

Use workflow guidance when you change phases:

```
"Get workflow guidance for code-written"
"Get session health"
```

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
1. Use testing capabilities to generate tests
2. Run existing tests to verify no regressions
3. Review changes before testing
```

**test-complete Checkpoint**:
```
✅ Detected: Tests passing

Recommendations:
1. Review changes
2. Stage changes
3. Prepare a commit message
```

**commit-ready Checkpoint**:
```
🚀 Detected: Ready to commit

Recommendations:
1. Review changes
2. Commit changes
3. Push to remote if configured
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
- Generate missing tests if needed
- Consider code review before committing
```

**test-complete Phase**:
```
✅ Recommendations:
- Review changes
- Prepare commit with semantic message
- Update documentation if needed
```

**commit-ready Phase**:
```
🚀 Recommendations:
- Verify all tests passing
- Commit changes
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

**Purpose**: Generate implementation plans that leverage capability signals and learned patterns.

**Key Features**:
1. **Capability-Aware Task Breakdown** - Assigns tasks to appropriate capabilities
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
  capability: string;         // Primary capability (e.g., 'backend', 'api')
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
**Capability**: backend, database
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
**Capability**: api-design, backend
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

**Generate Tests When Needed**:
```
# After implementing new function
"Generate tests for src/utils/validation.ts"

# Before refactoring
"Ensure complete test coverage before refactoring"
```

### Version Control

**Initialize and save work early**:
```
# First thing in new project
"Initialize Git in the project root"

# Before sharing work
"Commit changes with a clear message"
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

### Capability Selection

**Use the right capability for the task**:
- New code → test guidance and validation
- Bug fixing → systematic debugging and root-cause analysis
- Code review → security and correctness checks
- Architecture design → tradeoff analysis and system planning

---

## Configuration

### Environment Variables

**Required**:
```bash
# None - Claude Code Buddy works out of the box
```

**Optional**:
```bash
# For custom evolution database location
EVOLUTION_DB_PATH=/path/to/evolution.db

# Guidance modes
BEGINNER_MODE=true
EVIDENCE_MODE=true
```

### MCP Server Configuration

**Add to Claude Code config** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"]
    }
  }
}
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

**Issue: Test generation capability not producing tests**
```
Solution:
1. Verify source file exists and is readable
2. Check file contains exported functions
3. Ensure filesystem MCP tools are available
4. Try with simpler source file first
```

For more issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## Next Steps

- **Explore Capabilities**: Try different capabilities for various tasks
- **Save Work**: Commit changes in your VCS
- **Monitor Progress**: Use workflow guidance for optimization
- **Learn Patterns**: Smart Planning improves over time
- **Join Community**: Share feedback and best practices

---

**Happy coding with Claude Code Buddy! 🚀**

**Version**: 2.2.0
**Documentation**: https://github.com/PCIRCLE-AI/claude-code-buddy
**Issues**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
