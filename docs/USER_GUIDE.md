# User Guide
## Complete Reference for MeMesh

Welcome to the complete MeMesh User Guide! This guide provides detailed information about all commands, features, and workflows.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Commands](#core-commands)
3. [MCP Tools](#mcp-tools)
   - [Advanced MCP Tools](#advanced-mcp-tools)
   - [Secret Management](#secret-management)
   - [A2A Protocol](#a2a-protocol-agent-to-agent-communication)
   - [Learning & Error Tracking](#learning--error-tracking)
4. [CLI Commands](#cli-commands)
5. [Daemon Commands](#daemon-commands)
6. [Memory System](#memory-system)
7. [Smart Routing](#smart-routing)
8. [Configuration](#configuration)
9. [Advanced Usage](#advanced-usage)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is MeMesh?

MeMesh is your AI memory mesh for Claude Code - a persistent memory and smart routing system that helps you:

- **Execute tasks with intelligence**: Smart routing to specialized capabilities
- **Remember across sessions**: Persistent knowledge graph storage
- **Learn from experience**: Auto-tracking and pattern recognition
- **Work efficiently**: Context-aware assistance

### Architecture Overview

MeMesh uses a singleton daemon architecture for multi-session support:

```
Claude Code #1 ──stdio proxy──►┐
Claude Code #2 ──stdio proxy──►├─► MeMesh Daemon (single process)
Claude Code #3 ──stdio proxy──►┘         │
                                         ▼
                            ┌─────────────────────────┐
                            │  MeMesh MCP Server       │
                            ├─────────────────────────┤
                            │  • buddy-do (routing)    │
                            │  • buddy-remember        │
                            │  • A2A Server (shared)   │
                            └────────────┬────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌─────────┐         ┌───────────┐        ┌──────────┐
              │ Router  │         │ Knowledge │        │  A2A     │
              │         │         │   Graph   │        │  State   │
              └─────────┘         └───────────┘        └──────────┘
```

**Benefits:**
- Resource efficiency: Single process serves all Claude Code sessions
- Shared state: Memory and A2A state shared across sessions
- No port conflicts: Single A2A server instance
- Graceful upgrades: New versions can replace running daemon

---

## Core Commands

### buddy-do

**Purpose**: Execute tasks with smart routing to specialized capabilities

**Syntax**:
```
buddy-do "<task description>"
```

**How it works**:
1. Analyzes task complexity and required capabilities
2. Routes to the best-suited capability (backend, frontend, devops, etc.)
3. Enhances prompt with project context
4. Returns routing decision and enhanced prompt

**Examples**:

```bash
# Backend development
buddy-do "implement user authentication with JWT"
# → Routes to backend-developer capability
# → Analyzes database requirements, security considerations
# → Provides enhanced prompt with project context

# Frontend development
buddy-do "create responsive navbar with dark mode toggle"
# → Routes to frontend-developer capability
# → Considers existing design system
# → Suggests component structure

# DevOps tasks
buddy-do "setup CI/CD pipeline with GitHub Actions"
# → Routes to devops capability
# → Analyzes deployment requirements
# → Provides workflow configuration

# Bug fixes
buddy-do "fix memory leak in user service"
# → Routes to debugging capability
# → Analyzes potential causes
# → Suggests investigation steps
```

**Task Metadata Extraction**:

buddy-do automatically extracts metadata from your task description:

- **Goal**: What you want to achieve
- **Reason**: Why you're doing this (if mentioned)
- **Expected Outcome**: What success looks like

Example:
```
buddy-do "add email verification because users need to confirm accounts"

Extracted:
- Goal: "add email verification"
- Reason: "users need to confirm accounts"
- Expected Outcome: (inferred from context)
```

**Response Structure**:

```
✓ BUDDY-DO SUCCESS

📋 Task
Setup user authentication with JWT

────────────────────────────────────

✓ Results
  routing:
    approved: true
    message: Task routed to backend-developer
    complexity: medium
    estimatedTokens: 2500
    estimatedCost: $0.0125

────────────────────────────────────

💡 Next Steps
  1. Verify implementation meets requirements
  2. Run tests to ensure nothing broke
  3. Store decision: buddy-remember

Duration: 2.3s • Tokens: 2,500
```

**Complexity Levels**:

- **Simple** (< 1000 tokens): Quick tasks, simple queries
- **Medium** (1000-5000 tokens): Standard features, moderate refactoring
- **Complex** (> 5000 tokens): Architectural changes, large features

**When to Use**:
- ✅ Any development task (coding, testing, debugging)
- ✅ Architectural decisions
- ✅ Code reviews
- ✅ Documentation tasks
- ✅ Planning and analysis

**When NOT to Use**:
- ❌ Simple questions (use buddy-help instead)
- ❌ Memory queries (use buddy-remember instead)

---

### buddy-remember

**Purpose**: Store and recall knowledge from your project's memory graph

**Syntax**:
```bash
# Store knowledge
buddy-remember "<information to store>"

# Recall knowledge (search)
buddy-remember "<search query>"
```

**How it works**:

**Storage Mode**:
- Detects when you're providing information (not a question)
- Stores in Knowledge Graph with auto-generated tags
- Records timestamp and context
- Returns confirmation

**Recall Mode**:
- Searches Knowledge Graph by keywords and semantic similarity
- Ranks results by relevance
- Returns matching memories with context
- Suggests next steps if no results found

**Storage Examples**:

```bash
# Store decisions
buddy-remember "We decided to use PostgreSQL because it supports JSON and has better performance for complex queries"

# Store patterns
buddy-remember "All API endpoints follow RESTful conventions with /api/v1 prefix"

# Store lessons learned
buddy-remember "Login bug was caused by session timeout not being reset on activity. Fixed by updating session middleware"

# Store configuration
buddy-remember "Production uses AWS RDS with t3.medium instances, staging uses t3.micro"
```

**Recall Examples**:

```bash
# Search for decisions
buddy-remember "why did we choose PostgreSQL?"
# → Returns: Database selection decisions and reasons

# Find patterns
buddy-remember "API endpoint conventions"
# → Returns: RESTful patterns, versioning strategy

# Find solutions to similar problems
buddy-remember "session timeout issues"
# → Returns: Past bugs, solutions, and lessons learned

# Check configuration
buddy-remember "database configuration"
# → Returns: Database settings, connection strings (sanitized)
```

**Response Structure (Storage)**:

```
✓ Memory Stored Successfully

📋 Task
Store project decision about database choice

────────────────────────────────────

✓ Results
  status: stored
  knowledge_id: "kb_1234567890"
  tags: ["decision", "database", "postgresql"]
  timestamp: "2026-01-20T10:30:00Z"

────────────────────────────────────

💡 Next Steps
  1. Memory is now searchable
  2. Try: buddy-remember "postgresql" to verify

Duration: 0.8s • Tokens: 300
```

**Response Structure (Recall - With Results)**:

```
✓ Memory Search Complete

📋 Query
postgresql

────────────────────────────────────

✓ Results
  count: 3
  memories:
    1. [2026-01-15] Decision: PostgreSQL for production
       "We decided to use PostgreSQL because..."
       Tags: decision, database, postgresql

    2. [2026-01-18] Configuration: Database connection
       "Production: aws-rds-pg.xyz, port 5432..."
       Tags: configuration, database, postgresql

    3. [2026-01-19] Lesson: Connection pooling
       "Fixed timeout issues by increasing pool size..."
       Tags: lesson, database, performance

────────────────────────────────────

💡 Next Steps
  1. Review memories above for relevant context
  2. Apply these learnings to your current task

Duration: 1.2s • Tokens: 800
```

**Response Structure (Recall - No Results)**:

```
✓ Memory Search Complete

📋 Query
microservices

────────────────────────────────────

✓ Results
  count: 0

────────────────────────────────────

💡 Next Steps
  1. Try a broader search term
  2. Create new memory: buddy-do

Duration: 0.5s • Tokens: 200
```

**Best Practices**:

**Storage**:
- ✅ Be specific and concise
- ✅ Include context (why, when, what)
- ✅ Store as you work, not later
- ✅ Use natural language (the system handles tagging)

**Recall**:
- ✅ Use keywords from your question
- ✅ Try broader terms if no results
- ✅ Search before starting new work
- ✅ Combine with buddy-do for context-aware tasks

**Auto-Tagging**:

The system automatically generates tags based on content:
- **Entities**: Users, products, services, technologies
- **Actions**: Created, updated, fixed, decided
- **Concepts**: Authentication, database, API, testing
- **Types**: Decision, lesson, pattern, configuration

---

### buddy-help

**Purpose**: Quick help and command reference

**Syntax**:
```bash
# Basic help
buddy-help

# Detailed help for all commands
buddy-help --all
```

**Output**:

```
🤖 MeMesh Quick Start

Essential Commands

┌────────────────────────────────────────────┐
│ buddy-do "<task>"                          │
└────────────────────────────────────────────┘
❯ buddy-do "add user authentication"
→ Routes to backend-developer, creates auth system

┌────────────────────────────────────────────┐
│ buddy-remember "<info>"                    │
└────────────────────────────────────────────┘
❯ buddy-remember "Using JWT for sessions"
→ Stores in Knowledge Graph with auto-tags

┌────────────────────────────────────────────┐
│ buddy-remember "<query>"                   │
└────────────────────────────────────────────┘
❯ buddy-remember "why JWT?"
→ Searches and recalls past decisions

💡 New to MeMesh?
Run: memesh tutorial

📖 Full reference: buddy-help --all
```

**When to Use**:
- ✅ First-time setup (verify MeMesh is working)
- ✅ Quick command reference
- ✅ Syntax reminders

---

## MCP Tools

### Advanced MCP Tools

These tools provide lower-level access to MeMesh capabilities. For complete API documentation with detailed schemas, examples, and error handling, see **[API_REFERENCE.md](./api/API_REFERENCE.md)**.

#### create-entities

**Purpose**: Create knowledge entities with explicit relationships

**Usage**: Advanced users who need fine-grained control over knowledge graph structure

**Quick Example**:
```json
{
  "entities": [
    {
      "name": "PostgreSQL Database Choice 2026-02-03",
      "entityType": "decision",
      "observations": [
        "Chose PostgreSQL over MySQL",
        "Better JSON support and performance"
      ],
      "tags": ["database", "postgresql", "architecture"]
    }
  ]
}
```

**When to Use**:
- Building complex knowledge graphs
- Migrating external knowledge
- Integrating with other systems

📖 **Full Documentation**: [API_REFERENCE.md - create-entities](./api/API_REFERENCE.md#create-entities)

#### recall-memory

**Purpose**: Low-level memory search with advanced filters

**Parameters**:
- `limit`: Maximum results (default: 10)
- `query`: Optional search query

**Quick Example**:
```json
{
  "query": "authentication",
  "limit": 5
}
```

📖 **Full Documentation**: [API_REFERENCE.md - recall-memory](./api/API_REFERENCE.md#recall-memory)

#### add-observations

**Purpose**: Add new observations to existing entities

**Quick Example**:
```json
{
  "observations": [
    {
      "entityName": "PostgreSQL Database Choice 2026-02-03",
      "contents": [
        "Added read replicas for scalability",
        "Performance improved by 40%"
      ]
    }
  ]
}
```

📖 **Full Documentation**: [API_REFERENCE.md - add-observations](./api/API_REFERENCE.md#add-observations)

#### create-relations

**Purpose**: Create typed relationships between entities

**Quick Example**:
```json
{
  "relations": [
    {
      "from": "User Service",
      "to": "PostgreSQL Database Choice",
      "relationType": "depends_on"
    }
  ]
}
```

📖 **Full Documentation**: [API_REFERENCE.md - create-relations](./api/API_REFERENCE.md#create-relations)

#### health-check

**Purpose**: Monitor MeMesh system health

**Returns**:
- System status (healthy/degraded/unhealthy)
- Component statuses (database, filesystem, memory)
- Resource metrics
- Recommendations

📖 **Full Documentation**: [API_REFERENCE.md - health-check](./api/API_REFERENCE.md#health-check)

#### generate-tests

**Purpose**: Generate automated test cases

**Parameters**:
- `specification`: Feature spec (optional)
- `code`: Source code (optional)

**Note**: Provide either specification or code.

📖 **Full Documentation**: [API_REFERENCE.md - generate-tests](./api/API_REFERENCE.md#generate-tests)

---

### Secret Management

MeMesh provides secure local storage for API keys, tokens, passwords, and other sensitive data using AES-256-GCM encryption.

#### buddy-secret-store

**Purpose**: Securely store sensitive information (API keys, tokens, passwords)

**Parameters**:
- `name`: Unique identifier for the secret
- `value`: The secret value to store
- `ttl`: Optional time-to-live in seconds (auto-delete after expiry)

**Security Features**:
- AES-256-GCM encryption
- Secrets stored locally only
- Never transmitted over network
- Optional automatic expiry

**Quick Example**:
```json
{
  "name": "openai-api-key",
  "value": "sk-proj-...",
  "ttl": 2592000
}
```

**When to Use**:
- Storing API keys for development
- Managing authentication tokens
- Securing database credentials
- Temporary access tokens

📖 **Full Documentation**: [API_REFERENCE.md - buddy-secret-store](./api/API_REFERENCE.md#buddy-secret-store)

---

#### buddy-secret-get

**Purpose**: Retrieve a previously stored secret

**Parameters**:
- `name`: The identifier of the secret to retrieve

**Returns**:
- The decrypted secret value
- Creation timestamp
- Expiry information (if TTL was set)

**Quick Example**:
```json
{
  "name": "openai-api-key"
}
```

📖 **Full Documentation**: [API_REFERENCE.md - buddy-secret-get](./api/API_REFERENCE.md#buddy-secret-get)

---

#### buddy-secret-list

**Purpose**: List all stored secrets (names only, not values)

**Returns**:
- Array of secret names
- Creation timestamps
- Expiry information
- Does NOT return secret values for security

**Quick Example**:
```json
{}
```

**When to Use**:
- Auditing stored secrets
- Checking what credentials are available
- Managing secret lifecycle

📖 **Full Documentation**: [API_REFERENCE.md - buddy-secret-list](./api/API_REFERENCE.md#buddy-secret-list)

---

#### buddy-secret-delete

**Purpose**: Permanently delete a stored secret

**Parameters**:
- `name`: The identifier of the secret to delete

**Quick Example**:
```json
{
  "name": "old-api-key"
}
```

**When to Use**:
- Rotating credentials
- Removing expired access
- Cleaning up test secrets

📖 **Full Documentation**: [API_REFERENCE.md - buddy-secret-delete](./api/API_REFERENCE.md#buddy-secret-delete)

---

### A2A Protocol (Agent-to-Agent Communication)

MeMesh includes an Agent-to-Agent (A2A) Protocol for multi-agent collaboration, enabling Claude instances to delegate tasks to each other.

**Current Status**: Phase 1.0 - MCP Client Delegation (localhost HTTP server)

---

#### Phase 1.0: MCP Client Delegation

**What's New in Phase 1.0:**
- ✅ HTTP-based task delegation (localhost only)
- ✅ Bearer token authentication for security
- ✅ MCP Client polling mechanism (every 5 seconds)
- ✅ Complete task lifecycle management (PENDING → IN_PROGRESS → COMPLETED/FAILED)
- ✅ Task timeout configuration

**Architecture:**

```
┌─────────────────────────────────────────────────┐
│          Agent A (Task Sender)                   │
│  a2a-send-task → HTTP POST to localhost:3000    │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Authorization: Bearer <token>
                   ▼
┌─────────────────────────────────────────────────┐
│          A2A HTTP Server (MeMesh)                │
│  TaskQueue: PENDING → IN_PROGRESS → COMPLETED   │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Poll every 5s
                   ▼
┌─────────────────────────────────────────────────┐
│          MCP Client (Agent B)                    │
│  1. a2a-list-tasks → Get pending tasks          │
│  2. buddy-do → Execute task                     │
│  3. a2a-report-result → Report completion       │
└─────────────────────────────────────────────────┘
```

**Workflow Example:**

```typescript
// Agent A: Send task to Agent B
const result = await mcpTool('a2a-send-task', {
  agentId: 'code-reviewer',
  task: 'Review src/auth.ts for security issues',
  priority: 'high'
});
// → Returns: { taskId: 'task-abc123', status: 'PENDING' }

// Agent B (MCP Client): Poll for tasks (automatically every 5s)
const tasks = await mcpTool('a2a-list-tasks', {});
// → Returns: [{ taskId: 'task-abc123', task: '...', priority: 'high' }]

// Agent B: Execute task
const executionResult = await mcpTool('buddy-do', {
  task: tasks[0].task
});

// Agent B: Report result
await mcpTool('a2a-report-result', {
  taskId: 'task-abc123',
  result: JSON.stringify(executionResult),
  success: true
});

// Agent A: Check task status
const status = await mcpTool('a2a-get-task', {
  taskId: 'task-abc123',
  agentId: 'code-reviewer'
});
// → Returns: { status: 'COMPLETED', result: '...' }
```

**Setup Guide:**

For complete setup instructions including token generation and configuration, see **[A2A_SETUP_GUIDE.md](./A2A_SETUP_GUIDE.md)**.

**Quick Start:**

```bash
# 1. Generate authentication token
bash scripts/generate-a2a-token.sh

# 2. Start MeMesh MCP Server
npm run mcp

# 3. Use A2A tools in Claude Code
a2a-send-task { "agentId": "test", "task": "Test task" }
a2a-list-tasks {}
a2a-report-result { "taskId": "...", "result": "...", "success": true }
```

**Phase 1.0 Limitations:**
- 🔒 Localhost-only (no remote agents)
- 🔒 Single task per agent (no concurrent execution)
- 🔒 No cross-machine communication
- 🔒 Manual agent configuration (no discovery)

#### a2a-send-task

**Purpose**: Send a task to another agent for execution

**Parameters**:
- `agentId`: Target agent identifier
- `task`: Task description or command
- `priority`: Optional priority level (high/medium/low)

**Quick Example**:
```json
{
  "agentId": "code-reviewer",
  "task": "Review src/auth.ts for security issues",
  "priority": "high"
}
```

**When to Use**:
- Delegating specialized tasks
- Parallel execution workflows
- Multi-agent collaboration

📖 **Full Documentation**: [API_REFERENCE.md - a2a-send-task](./api/API_REFERENCE.md#a2a-send-task)

---

#### a2a-get-task

**Purpose**: Query status and results of a sent task

**Parameters**:
- `taskId`: Task identifier from a2a-send-task
- `agentId`: Target agent identifier

**Returns**:
- Task status (pending/in_progress/completed/failed)
- Task results (if completed)
- Error information (if failed)

**Quick Example**:
```json
{
  "taskId": "task-abc123",
  "agentId": "code-reviewer"
}
```

📖 **Full Documentation**: [API_REFERENCE.md - a2a-get-task](./api/API_REFERENCE.md#a2a-get-task)

---

#### a2a-list-tasks

**Purpose**: List all tasks assigned to this agent

**Returns**:
- Array of task objects
- Task status and metadata
- Priority and timing information

**Quick Example**:
```json
{}
```

**When to Use**:
- Monitoring agent workload
- Task queue management
- Debugging multi-agent workflows

📖 **Full Documentation**: [API_REFERENCE.md - a2a-list-tasks](./api/API_REFERENCE.md#a2a-list-tasks)

---

#### a2a-list-agents

**Purpose**: Discover available agents for task delegation

**Returns**:
- Array of agent identifiers
- Agent capabilities
- Agent status (online/offline)

**Quick Example**:
```json
{}
```

**When to Use**:
- Finding specialized agents
- Multi-agent system discovery
- Capability-based routing

📖 **Full Documentation**: [API_REFERENCE.md - a2a-list-agents](./api/API_REFERENCE.md#a2a-list-agents)

---

### Learning & Error Tracking

#### buddy-record-mistake

**Purpose**: Record errors and mistakes for learning and prevention

**Parameters**:
- `mistake`: Description of what went wrong
- `context`: Situation where the error occurred
- `correctApproach`: The right way to handle it
- `tags`: Optional categorization tags

**Quick Example**:
```json
{
  "mistake": "Used synchronous file read in async function",
  "context": "Loading configuration at startup",
  "correctApproach": "Use fs.promises.readFile() instead of fs.readFileSync()",
  "tags": ["nodejs", "async", "filesystem"]
}
```

**When to Use**:
- After fixing bugs
- Learning from errors
- Building team knowledge
- Preventing repeated mistakes

**Benefits**:
- Automatically stored in knowledge graph
- Searchable via buddy-remember
- Helps prevent repeating errors
- Builds institutional knowledge

📖 **Full Documentation**: [API_REFERENCE.md - buddy-record-mistake](./api/API_REFERENCE.md#buddy-record-mistake)

---

### Complete API Reference

For comprehensive documentation including:
- Detailed input/output schemas
- JSON examples for all tools
- Error codes and handling
- Integration patterns
- Performance characteristics

See **[API_REFERENCE.md](./api/API_REFERENCE.md)**

---

## CLI Commands

### memesh setup

**Purpose**: Interactive configuration wizard

**Features**:
- Auto-detects Claude Code installation
- Generates MCP configuration
- Validates setup
- Tests connection

**Usage**:
```bash
memesh setup
```

**When to Use**:
- First-time installation
- Troubleshooting connection issues
- Reconfiguring after updates

See [QUICK_START.md](./QUICK_START.md) for detailed setup guide.

---

### memesh tutorial

**Purpose**: Interactive 5-minute guided tutorial

**Features**:
- 7-step walkthrough
- Hands-on practice with buddy-do and buddy-remember
- Progress tracking
- Completion certificate

**Usage**:
```bash
memesh tutorial
```

**Steps**:
1. Welcome & Overview
2. Setup Verification
3. First buddy-do Command
4. Memory Storage Demo
5. Memory Recall Demo
6. Advanced Features Preview
7. Next Steps & Resources

**When to Use**:
- Learning MeMesh for the first time
- Refreshing your knowledge
- Training team members

---

### memesh dashboard

**Purpose**: View session health and metrics

**Features**:
- Real-time MCP server status
- Memory usage statistics
- Recent command history
- Performance metrics
- Error log summary

**Usage**:
```bash
memesh dashboard
```

---

### memesh stats

**Purpose**: View usage statistics

**Features**:
- Command frequency analysis
- Token usage trends
- Cost tracking
- Capability usage breakdown
- Memory growth over time

**Usage**:
```bash
memesh stats
memesh stats --day       # Last 24 hours
memesh stats --week      # Last 7 days
memesh stats --month     # Last 30 days
memesh stats --json      # Export as JSON
memesh stats --csv       # Export as CSV
memesh stats --verbose   # Detailed statistics
```

---

### memesh config

**Purpose**: Manage MeMesh configuration

**Subcommands**:

```bash
# Show current configuration
memesh config show

# Validate MCP setup
memesh config validate

# Edit configuration in default editor
memesh config edit

# Reset configuration to defaults
memesh config reset
```

**When to Use**:
- Verifying setup after installation
- Troubleshooting connection issues
- Checking configuration paths

---

### memesh report-issue

**Purpose**: Report bugs or issues

**Usage**:
```bash
memesh report-issue
```

**What it does**:
- Provides GitHub issues link
- Collects system information (future)
- Suggests troubleshooting steps

---

## Daemon Commands

MeMesh uses a singleton daemon architecture to efficiently share resources across multiple Claude Code sessions. When you open multiple Claude Code windows, they all connect to the same MeMesh daemon, sharing memory, A2A state, and databases.

### memesh daemon status

**Purpose**: Check daemon status and information

**Usage**:
```bash
memesh daemon status
```

**Shows**:
- Running state (daemon/proxy/standalone)
- PID and uptime
- Connected clients count
- Socket path
- Version information

---

### memesh daemon logs

**Purpose**: View daemon logs

**Usage**:
```bash
# Show recent logs
memesh daemon logs

# Follow logs in real-time
memesh daemon logs -f

# Show last N lines
memesh daemon logs -n 100
```

---

### memesh daemon stop

**Purpose**: Stop the daemon process

**Usage**:
```bash
# Graceful stop (waits for clients)
memesh daemon stop

# Force stop (immediate)
memesh daemon stop --force
```

---

### memesh daemon restart

**Purpose**: Restart the daemon process

**Usage**:
```bash
memesh daemon restart
```

Performs graceful restart with automatic client reconnection.

---

### memesh daemon upgrade

**Purpose**: Upgrade daemon to new version

**Usage**:
```bash
memesh daemon upgrade
```

Use when you've installed a new MeMesh version and want the running daemon to upgrade.

---

### Disabling Daemon Mode

To run in standalone mode (original behavior):

```bash
export MEMESH_DISABLE_DAEMON=1
```

See [DAEMON_ARCHITECTURE.md](./DAEMON_ARCHITECTURE.md) for complete documentation.

---

## Memory System

### Knowledge Graph Architecture

MeMesh uses a graph-based knowledge storage system:

```
    ┌─────────────┐
    │  Entities   │  (Users, APIs, Technologies, etc.)
    └──────┬──────┘
           │
           │ has properties
           │
    ┌──────▼──────┐
    │ Properties  │  (name, type, metadata)
    └──────┬──────┘
           │
           │ connected by
           │
    ┌──────▼──────┐
    │  Relations  │  (USES, DEPENDS_ON, CREATED_BY)
    └─────────────┘
```

### Entity Types

**Automatic Classification**:
- `Decision`: Architecture choices, technology selections
- `Pattern`: Code patterns, conventions, standards
- `Lesson`: Bug fixes, learnings, best practices
- `Configuration`: Settings, environment variables
- `Technology`: Tools, frameworks, libraries
- `Feature`: Application features, capabilities
- `Bug`: Issues, problems, error cases
- `Person`: Team members, stakeholders
- `Project`: Projects, repositories, systems

### Relationship Types

- `USES`: Entity A uses Entity B
- `DEPENDS_ON`: Entity A depends on Entity B
- `CREATED_BY`: Entity A created by Entity B
- `RELATES_TO`: General relationship
- `PART_OF`: Entity A is part of Entity B

### Auto-Tracking (Phase 0.6)

**Task Start Tracking**:
When you use `buddy-do`, MeMesh automatically records:
- Task description
- Goal (extracted)
- Reason (if provided)
- Expected outcome (if mentioned)
- Start timestamp

**Memory Linking**:
Memories created during a task are automatically linked to that task.

**Example**:
```bash
buddy-do "implement login feature because users need authentication"

# Auto-tracked:
{
  task: "implement login feature",
  goal: "implement login feature",
  reason: "users need authentication",
  timestamp: "2026-01-20T10:00:00Z"
}

# Later memories automatically linked:
buddy-remember "Using bcrypt for password hashing"
# → Links to login feature task
```

---

## Smart Routing

### How Task Routing Works

**1. Task Analysis**:
```
Input: "setup user authentication with JWT"

Analysis:
- Complexity: Medium (~2500 tokens)
- Domain: Backend development
- Required capabilities: [authentication, backend, database]
- Keywords: [authentication, JWT, user, setup]
```

**2. Capability Matching**:
```
Available capabilities:
- backend-developer: 90% match (authentication, database)
- frontend-developer: 20% match (user interface)
- devops: 30% match (deployment considerations)

Selected: backend-developer (highest match)
```

**3. Prompt Enhancement**:
```
Enhanced Prompt:
[System Context]
Project: e-commerce-platform
Tech Stack: Node.js, Express, PostgreSQL
Recent Work: User registration endpoint completed

[Task]
Setup user authentication with JWT

[Context]
- Existing user model in database
- JWT library already installed (jsonwebtoken)
- Environment variables configured for secrets
```

### Capability Catalog

**backend-developer**:
- API development
- Database design
- Server-side logic
- Authentication/authorization
- Data validation

**frontend-developer**:
- UI components
- State management
- Styling and layout
- Client-side logic
- Responsive design

**devops**:
- CI/CD pipelines
- Deployment automation
- Infrastructure configuration
- Monitoring and logging
- Container orchestration

**database-admin**:
- Schema design
- Query optimization
- Migrations
- Backups and recovery
- Performance tuning

**security-expert**:
- Vulnerability assessment
- Authentication systems
- Data encryption
- Security audits
- Compliance

**general-agent**:
- Default fallback
- General questions
- Documentation
- Planning and analysis

---

## Configuration

### MCP Configuration File

**Location**:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Structure**:
```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

**Environment Variables**:

- `DEBUG`: Enable debug logging (true/false)
- `MEMESH_DATA_DIR`: Custom data directory (default: ~/.memesh)
- `MEMESH_LOG_LEVEL`: Log level (error/warn/info/debug)

**Custom Configuration**:
```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "DEBUG": "true",
        "MEMESH_DATA_DIR": "/custom/path/to/data",
        "MEMESH_LOG_LEVEL": "debug"
      }
    }
  }
}
```

---

## Advanced Usage

### Workflow Examples

#### Workflow 1: Starting a New Feature

```bash
# 1. Recall relevant context
buddy-remember "similar features"
buddy-remember "architectural patterns"

# 2. Plan implementation
buddy-do "plan user profile feature with avatar upload"

# 3. Execute implementation
buddy-do "implement user profile API endpoints"
buddy-do "create profile UI component"

# 4. Store decisions
buddy-remember "User profile feature uses S3 for avatar storage because it scales better"

# 5. Document patterns
buddy-remember "Profile endpoints follow /api/v1/users/:id/profile pattern"
```

#### Workflow 2: Debugging a Bug

```bash
# 1. Search for similar issues
buddy-remember "login errors"
buddy-remember "session timeout"

# 2. Analyze and fix
buddy-do "investigate why sessions expire immediately after login"

# 3. Record solution
buddy-remember "Login session bug was caused by cookie domain mismatch. Fixed by setting domain to null in session config."
```

#### Workflow 3: Code Review

```bash
# 1. Recall standards
buddy-remember "code review checklist"
buddy-remember "security best practices"

# 2. Review implementation
buddy-do "review authentication implementation for security issues"

# 3. Store findings
buddy-remember "Security review found: need rate limiting on login endpoint to prevent brute force"
```

### Integration with Other Tools

**Git Integration**:
```bash
# Store commit messages as memories
buddy-remember "feat(auth): add JWT authentication"

# Recall to maintain consistency
buddy-remember "recent authentication changes"
```

**CI/CD Integration** (Future):
```bash
# Store deployment info
buddy-remember "Deployment v1.2.3 to production on 2026-01-20, includes authentication feature"

# Query deployment history
buddy-remember "recent deployments"
```

**Testing Integration**:
```bash
# Store test results
buddy-remember "Test suite passing: 245/245 tests, coverage 87%"

# Track test patterns
buddy-remember "Authentication tests use mock JWT tokens"
```

---

## Troubleshooting

### Common Issues

For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Quick Fixes**:

1. **buddy-help not working**
   ```bash
   memesh setup
   # Restart Claude Code
   # Try: buddy-help
   ```

2. **Connection errors**
   ```bash
   memesh config validate
   # Check configuration
   # Restart Claude Code
   ```

3. **Slow responses**
   - Simplify task descriptions
   - Check network connection
   - Review token limits

### Debug Mode

Enable debug logging:

```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "DEBUG": "true",
        "MEMESH_LOG_LEVEL": "debug"
      }
    }
  }
}
```

Check logs:
- **macOS**: `~/Library/Logs/Claude/`
- **Windows**: `%APPDATA%\Claude\Logs\`

### Getting Help

1. **Check Documentation**:
   - [QUICK_START.md](./QUICK_START.md) - Getting started
   - [BEST_PRACTICES.md](./BEST_PRACTICES.md) - Effective workflows
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

2. **Run Commands**:
   ```bash
   memesh tutorial       # Interactive learning
   memesh config validate # Check setup
   memesh report-issue   # Get support
   ```

3. **Community Support**:
   - GitHub Issues: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
   - Discussions: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions

---

## Appendix

### Command Quick Reference

```
┌─────────────────────────────────────────────────────┐
│              MeMesh Command Reference               │
├─────────────────────────────────────────────────────┤
│ MCP Tools (In Claude Code)                          │
│   buddy-do "<task>"       Smart task execution      │
│   buddy-remember "<info>" Store/recall memory       │
│   buddy-help              Quick help guide           │
│                                                      │
│ CLI Commands (In Terminal)                          │
│   memesh setup            Interactive setup wizard  │
│   memesh tutorial         5-minute guided tour      │
│   memesh dashboard        Session health dashboard  │
│   memesh stats            Usage statistics          │
│   memesh config           Manage configuration      │
│   memesh report-issue     Bug reporting             │
└─────────────────────────────────────────────────────┘
```

### Glossary

- **MCP**: Model Context Protocol - Standard for AI tool integration
- **Knowledge Graph**: Graph database storing entities and relationships
- **Capability**: Specialized skill set for task execution
- **Entity**: Node in knowledge graph (user, technology, decision, etc.)
- **Relation**: Edge connecting entities (USES, DEPENDS_ON, etc.)
- **Task Metadata**: Extracted information from task description
- **Prompt Enhancement**: Adding project context to task prompts

### Version History

- **v2.7.0**: Daemon socket cleanup fix, Memory retention periods updated (30/90 days), Auto-memory hooks improvements, Documentation updates
- **v2.6.6**: ErrorClassifier integration, Enhanced error handling
- **v2.6.5**: Interactive tutorial, Improved QUICK_START
- **v2.6.4**: Response formatting improvements, Visual hierarchy
- **v2.6.3**: Interactive setup wizard
- **v2.6.2**: Phase 0.6 - Auto-tracking and memory linking
- **v2.6.1**: Performance optimizations
- **v2.6.0**: Smart routing with capability matching

---

**Next Steps**:

1. **Learn More**: Read [BEST_PRACTICES.md](./BEST_PRACTICES.md) for effective workflows
2. **Try It Out**: Run `memesh tutorial` for hands-on practice
3. **Get Support**: Visit our [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
4. **Contribute**: Check [CONTRIBUTING.md](../CONTRIBUTING.md) to get involved

---

**MeMesh** - Your AI memory mesh for Claude Code
