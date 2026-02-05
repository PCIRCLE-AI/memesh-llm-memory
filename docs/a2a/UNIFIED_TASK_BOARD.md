# Unified Task Board

**Version**: Phase 2.2
**Last Updated**: 2026-02-06

---

## Overview

The **Unified Task Board** is a centralized task management system that enables cross-platform AI agent collaboration. It replaces the previous per-agent database architecture with a single `task-board.db` for true multi-agent visibility.

### Key Benefits

- **Cross-Platform Visibility**: Tasks created on Claude Code are visible to ChatGPT, Gemini, Cursor, and VS Code agents
- **Skill-Based Matching**: Agents can register skills and discover tasks matching their capabilities
- **Atomic Task Claiming**: Prevents race conditions when multiple agents attempt to claim the same task
- **Platform-Aware Agent IDs**: Deterministic IDs based on hostname-username-platform ensure stable agent identification

### Architecture

```
Before (Per-Agent Databases):
~/.claude-code-buddy/
├── a2a-tasks-agent-1.db    # Only visible to agent-1
├── a2a-tasks-agent-2.db    # Only visible to agent-2
└── a2a-tasks-agent-3.db    # Only visible to agent-3

After (Unified Task Board):
~/.claude-code-buddy/
└── task-board.db           # Visible to ALL agents
```

### Database Schema

The unified task board uses SQLite with WAL mode for concurrent access:

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  activeForm TEXT,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'deleted')),
  owner TEXT,
  creator_platform TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  metadata TEXT
);

-- Task dependencies
CREATE TABLE task_dependencies (
  task_id TEXT,
  blocks TEXT,
  PRIMARY KEY (task_id, blocks)
);

-- Agent registry
CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,
  platform TEXT,
  hostname TEXT,
  username TEXT,
  base_url TEXT,
  port INTEGER,
  process_pid INTEGER,
  skills TEXT,           -- JSON array
  last_heartbeat INTEGER,
  status TEXT CHECK(status IN ('active', 'inactive')),
  created_at INTEGER
);

-- Task history for audit trail
CREATE TABLE task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  agent_id TEXT,
  action TEXT,
  old_status TEXT,
  new_status TEXT,
  timestamp INTEGER
);
```

---

## Platform-Aware Agent IDs

Agent IDs are generated deterministically using the format: `hostname-username-platform`

### Supported Platforms

| Platform | Detection Method | Example Agent ID |
|----------|-----------------|------------------|
| Claude Code | `CLAUDE_CODE_VERSION` env var | `macbook-pro-john-claude-code` |
| ChatGPT | `OPENAI_API_KEY` env var | `macbook-pro-john-chatgpt` |
| Gemini | `GEMINI_API_KEY` env var | `macbook-pro-john-gemini` |
| Cursor | `CURSOR_VERSION` env var | `macbook-pro-john-cursor` |
| VS Code | `VSCODE_PID` env var | `macbook-pro-john-vscode` |
| Unknown | Fallback | `macbook-pro-john-unknown` |

### ID Generation Rules

- All characters converted to lowercase
- Non-alphanumeric characters replaced with hyphens
- Consecutive hyphens collapsed
- Leading/trailing hyphens removed

```typescript
// Example
generateAgentId();
// Returns: "macbook-pro-john-claude-code"
```

---

## MCP Tools Reference

### a2a-board

View all tasks in the unified task board with optional filtering.

**Input Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `pending`, `in_progress`, `completed`, `deleted` |
| `platform` | string | No | Filter by creator platform (e.g., `claude-code`, `chatgpt`) |
| `owner` | string | No | Filter by owner agent ID |

**Example:**

```typescript
// View all tasks
a2a-board({})

// View only pending tasks
a2a-board({ status: "pending" })

// View tasks from Claude Code
a2a-board({ platform: "claude-code" })
```

**Output:**

```
📋 A2A Task Board
================

📊 Summary: 5 tasks (2 pending, 1 in_progress, 2 completed)

📥 PENDING (2)
─────────────────
• [abc12345] Implement user authentication
  Platform: claude-code | Owner: (unassigned)

• [def67890] Add unit tests for API
  Platform: chatgpt | Owner: (unassigned)

🔄 IN PROGRESS (1)
──────────────────
• [ghi11111] Refactor database layer
  Platform: claude-code | Owner: macbook-pro-john-cursor

✅ COMPLETED (2)
────────────────
• [jkl22222] Fix login bug
  Platform: claude-code | Owner: macbook-pro-john-claude-code

• [mno33333] Update documentation
  Platform: vscode | Owner: macbook-pro-john-vscode

---
Filtered by: (none)
```

---

### a2a-claim-task

Claim a pending task for the current agent. Updates task status to `in_progress` and assigns ownership atomically.

**Input Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes | UUID of the task to claim |

**Example:**

```typescript
a2a-claim-task({ taskId: "abc12345-6789-4def-a012-345678901234" })
```

**Output (Success):**

```
✅ Task claimed successfully!

Task: [abc12345] Implement user authentication
Claimed by: macbook-pro-john-claude-code
Status: in_progress
```

**Output (Error):**

```
❌ Error claiming task [abc12345]

Reason: Task abc12345-6789-4def-a012-345678901234 is not in pending status (current: in_progress)
```

---

### a2a-release-task

Release a claimed task back to pending status for other agents to claim.

**Input Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes | UUID of the task to release |

**Example:**

```typescript
a2a-release-task({ taskId: "abc12345-6789-4def-a012-345678901234" })
```

**Output:**

```
✅ Task released successfully!

Task: [abc12345] Implement user authentication
Status: pending
Owner: (unassigned)

Task is now available for other agents to claim.
```

---

### a2a-find-tasks

Find tasks matching specified skills or criteria. Matches skills against task `metadata.required_skills` and subject text.

**Input Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skills` | string[] | No | `[]` | Skills to match against tasks |
| `status` | string | No | `pending` | Task status filter |
| `limit` | number | No | `10` | Maximum results (1-50) |

**Example:**

```typescript
// Find tasks matching TypeScript and testing skills
a2a-find-tasks({
  skills: ["typescript", "testing"],
  status: "pending",
  limit: 5
})
```

**Output:**

```
🔍 Found 3 task(s) matching criteria

1. [abc12345] Implement TypeScript API client
   Status: pending | Platform: claude-code
   Matched skills: typescript

2. [def67890] Add unit tests for user service
   Status: pending | Platform: chatgpt
   Matched skills: testing

3. [ghi11111] TypeScript testing framework setup
   Status: pending | Platform: cursor
   Matched skills: typescript, testing

---
Showing 3 of 3 total matching tasks
```

---

### a2a-set-skills

Register skills for the current agent to enable skill-based task matching. Auto-registers the agent if it doesn't exist.

**Input Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skills` | string[] | Yes | Array of skill strings (max 100 chars each) |

**Example:**

```typescript
a2a-set-skills({
  skills: ["typescript", "react", "testing", "code-review"]
})
```

**Output:**

```
✅ Skills updated successfully!

Agent: macbook-pro-john-claude-code
Platform: claude-code
Skills: typescript, react, testing, code-review

Your agent is now registered for skill-based task matching.
Use a2a-find-tasks to discover tasks matching your skills.
```

---

## Workflows

### Agent Registration Flow

```
1. Agent starts (Claude Code, ChatGPT, etc.)
         │
         ▼
2. Generate platform-aware Agent ID
   (hostname-username-platform)
         │
         ▼
3. Register skills with a2a-set-skills
         │
         ▼
4. Agent is now discoverable and can
   claim tasks matching its skills
```

### Task Discovery Flow

```
1. Agent calls a2a-find-tasks with skills
         │
         ▼
2. TaskBoard matches skills against:
   - metadata.required_skills (exact match)
   - task subject (keyword match)
         │
         ▼
3. Results sorted by relevance
   (number of skill matches)
         │
         ▼
4. Agent reviews matching tasks
```

### Task Claiming/Releasing Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Task Lifecycle                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   pending ──┬── a2a-claim-task ──► in_progress          │
│      ▲      │                           │                │
│      │      │                           │                │
│      │      └── a2a-release-task ◄──────┤                │
│      │                                  │                │
│      │                                  ▼                │
│      │                             completed             │
│      │                                  │                │
│      └──────────────────────────────────┘                │
│                (if task re-opened)                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Guide

### Overview

The migration script converts old per-agent databases (`a2a-tasks-{agentId}.db`) to the unified `task-board.db`.

### State Mapping

| Old State (TaskQueue) | New Status (TaskBoard) |
|----------------------|------------------------|
| `SUBMITTED` | `pending` |
| `WORKING` | `in_progress` |
| `INPUT_REQUIRED` | `in_progress` |
| `COMPLETED` | `completed` |
| `FAILED` | `completed` (terminal) |
| `CANCELED` | `deleted` |
| `REJECTED` | `deleted` |
| `TIMEOUT` | `completed` (terminal) |

### Running the Migration

```typescript
import { migrateToUnifiedTaskBoard } from './src/a2a/migration/migrateToUnifiedTaskBoard.js';

// Dry-run mode (preview only)
const preview = migrateToUnifiedTaskBoard({ dryRun: true });
console.log(`Would migrate ${preview.databases.length} databases`);

// Actual migration with backup
const result = migrateToUnifiedTaskBoard({
  dryRun: false,
  backup: true  // Creates .backup files
});

console.log(`Migrated: ${result.migratedCount} tasks`);
console.log(`Skipped: ${result.skippedCount} (already exists)`);
console.log(`Errors: ${result.errorCount}`);
```

### Migration Options

```typescript
interface MigrationOptions {
  dryRun?: boolean;        // Preview without changes (default: false)
  backup?: boolean;        // Create .backup files (default: true)
  dataDir?: string;        // Directory to scan (default: ~/.claude-code-buddy)
  taskBoardPath?: string;  // Target database path
}
```

### Migration Result

```typescript
interface MigrationResult {
  migratedCount: number;   // Tasks successfully migrated
  skippedCount: number;    // Tasks already in TaskBoard
  errorCount: number;      // Tasks that failed to migrate
  errors: Array<{ taskId: string; error: string }>;
  databases: Array<{
    path: string;
    taskCount: number;
    migratedCount: number;
  }>;
}
```

### What Gets Migrated

Each migrated task includes:
- Original task ID (preserved)
- Subject (from `name` field, or first 50 chars of description)
- Description
- Mapped status
- Creator platform (extracted from agent ID)
- Original timestamps (converted to milliseconds)
- Metadata with migration info:

```json
{
  "_migrated": {
    "from": "/path/to/a2a-tasks-agent.db",
    "agentId": "macbook-pro-john-claude-code",
    "originalState": "SUBMITTED",
    "originalPriority": "normal",
    "sessionId": "session-123",
    "migratedAt": "2026-02-06T12:00:00.000Z"
  }
}
```

### Backup and Rollback

**Before Migration:**
```
~/.claude-code-buddy/
├── a2a-tasks-agent-1.db
├── a2a-tasks-agent-2.db
└── task-board.db (new, may be empty)
```

**After Migration (with backup=true):**
```
~/.claude-code-buddy/
├── a2a-tasks-agent-1.db
├── a2a-tasks-agent-1.db.backup    # Created by migration
├── a2a-tasks-agent-2.db
├── a2a-tasks-agent-2.db.backup    # Created by migration
└── task-board.db                  # Contains all migrated tasks
```

**Rollback (if needed):**
```bash
# Remove unified database
rm ~/.claude-code-buddy/task-board.db

# Restore backups
mv ~/.claude-code-buddy/a2a-tasks-agent-1.db.backup ~/.claude-code-buddy/a2a-tasks-agent-1.db
mv ~/.claude-code-buddy/a2a-tasks-agent-2.db.backup ~/.claude-code-buddy/a2a-tasks-agent-2.db
```

---

## API Reference

### TaskBoard Class

```typescript
import { TaskBoard, Task, TaskStatus, CreateTaskInput } from './src/a2a/storage/TaskBoard.js';

// Initialize (uses ~/.claude-code-buddy/task-board.db by default)
const board = new TaskBoard();

// Create a task
const taskId = board.createTask({
  subject: 'Implement feature X',
  description: 'Detailed description...',
  status: 'pending',
  creator_platform: 'claude-code',
  metadata: { required_skills: ['typescript', 'testing'] }
});

// Get a task
const task = board.getTask(taskId);

// List tasks with filters
const pendingTasks = board.listTasks({ status: 'pending' });
const myTasks = board.listTasks({ owner: 'macbook-pro-john-claude-code' });

// Claim a task (atomic)
board.claimTask(taskId, 'macbook-pro-john-claude-code');

// Release a task
board.releaseTask(taskId);

// Update task status
board.updateTaskStatus(taskId, 'completed');

// Get task history
const history = board.getTaskHistory(taskId);

// Register agent
board.registerAgent({
  agent_id: 'macbook-pro-john-claude-code',
  platform: 'claude-code',
  hostname: 'macbook-pro',
  username: 'john',
  skills: ['typescript', 'testing']
});

// Update agent skills
board.updateAgentSkills('macbook-pro-john-claude-code', ['typescript', 'react']);

// Close database
board.close();
```

### Type Definitions

```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

interface Task {
  id: string;
  subject: string;
  description?: string;
  activeForm?: string;
  status: TaskStatus;
  owner?: string;
  creator_platform: string;
  created_at: number;
  updated_at: number;
  metadata?: string;  // JSON string
}

interface Agent {
  agent_id: string;
  platform: string;
  hostname: string;
  username: string;
  base_url: string | null;
  port: number | null;
  process_pid: number | null;
  skills: string | null;  // JSON array string
  last_heartbeat: number;
  status: 'active' | 'inactive';
  created_at: number;
}

interface TaskHistoryEntry {
  id: number;
  task_id: string;
  agent_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  timestamp: number;
}
```

---

## Best Practices

### 1. Register Skills Early

Call `a2a-set-skills` when your agent starts to enable skill-based task discovery.

```typescript
a2a-set-skills({ skills: ["typescript", "react", "testing"] })
```

### 2. Use Specific Skills

More specific skills lead to better task matching:

```typescript
// Good: Specific skills
["typescript", "react-hooks", "jest-testing", "api-design"]

// Less Effective: Generic skills
["coding", "programming", "development"]
```

### 3. Check Task Status Before Claiming

Use `a2a-board` to view task status before attempting to claim:

```typescript
// View pending tasks first
a2a-board({ status: "pending" })

// Then claim a specific task
a2a-claim-task({ taskId: "..." })
```

### 4. Release Tasks You Cannot Complete

If you cannot complete a claimed task, release it for other agents:

```typescript
a2a-release-task({ taskId: "..." })
```

### 5. Use Task Metadata for Skill Matching

When creating tasks, include `required_skills` in metadata:

```typescript
board.createTask({
  subject: 'Implement React component',
  metadata: {
    required_skills: ['react', 'typescript', 'css']
  }
});
```

---

## Troubleshooting

### Task Not Appearing on Board

1. Verify the task was created with correct `creator_platform`
2. Check filter parameters in `a2a-board`
3. Verify database path: `~/.claude-code-buddy/task-board.db`

### Cannot Claim Task

1. Task may already be claimed (status: `in_progress`)
2. Task may be completed or deleted
3. Check task status with `a2a-board` first

### Skills Not Matching

1. Skills are case-insensitive but require exact match in metadata
2. Subject matching is substring-based
3. Verify task has `metadata.required_skills` array

### Database Locked Error

1. Close other MeMesh instances
2. Remove WAL files:
   ```bash
   rm ~/.claude-code-buddy/task-board.db-shm
   rm ~/.claude-code-buddy/task-board.db-wal
   ```
3. Restart agent

---

## See Also

- [A2A Agent Collaboration](../features/a2a-agent-collaboration.md) - Main A2A documentation
- [A2A Quick Start](../A2A_QUICK_START.md) - Quick start guide
- [Migration Script](../../src/a2a/migration/migrateToUnifiedTaskBoard.ts) - Source code

---

**Document Version**: 1.0
**Phase**: 2.2 (Unified Task Board)
