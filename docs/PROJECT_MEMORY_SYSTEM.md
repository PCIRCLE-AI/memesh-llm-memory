# Project Memory System

## Overview

The Project Memory System enables Claude Code to automatically track and recall project context across sessions. It uses a **hybrid approach** combining event-driven recording and token-based snapshots to capture development activity.

**Key Features:**
- Automatic tracking of code changes and test results
- Token-based snapshots every 10k tokens
- 30-day automatic retention management
- MCP tool interface for memory recall
- Knowledge Graph storage for structured memory

## Architecture

### Hybrid Tracking Strategy

The system uses two complementary strategies:

1. **Event-Driven Tracking** (Immediate):
   - Triggers on specific events: code changes, test results
   - Captures precise development activities
   - Low overhead, high signal

2. **Token-Based Snapshots** (Periodic):
   - Creates snapshots every 10,000 tokens
   - Backup mechanism for session context
   - Ensures no work is lost between events

### Components

```
┌─────────────────────────────────────────────┐
│         ProjectAutoTracker                  │
│  (Event-driven + Token-based Recording)     │
└─────────────────┬───────────────────────────┘
                  │
                  ├─► recordCodeChange()
                  ├─► recordTestResult()
                  └─► checkTokenSnapshot()
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         MCPToolInterface                    │
│  (createEntities, searchNodes)              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         KnowledgeGraph                      │
│  (SQLite-based Entity Storage)              │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│    ProjectMemoryManager (Query Layer)       │
│         recallRecentWork()                  │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  MCP Tool: recall-memory                    │
│  (Exposed to Claude Code)                   │
└─────────────────────────────────────────────┘
```

## Components

### 1. ProjectAutoTracker

**Purpose:** Core tracking engine that records development events.

**Location:** `src/memory/ProjectAutoTracker.ts`

**Key Methods:**

```typescript
class ProjectAutoTracker {
  // Event-driven recording
  async recordCodeChange(data: {
    files: string[];
    sessionId: string;
  }): Promise<void>

  async recordTestResult(data: {
    passed: number;
    failed: number;
    sessionId: string;
  }): Promise<void>

  // Token-based snapshots
  async checkTokenSnapshot(
    currentTokens: number,
    context: {
      files: string[];
      tasks: string[];
    }
  ): Promise<void>
}
```

**Usage Example:**

```typescript
import { ProjectAutoTracker } from './memory/ProjectAutoTracker.js';
import { mcpTools } from './mcp/client.js';

const tracker = new ProjectAutoTracker(mcpTools);

// Record a code change
await tracker.recordCodeChange({
  files: ['src/api/users.ts', 'src/models/User.ts'],
  sessionId: 'session-2025-12-31-001'
});

// Record test results
await tracker.recordTestResult({
  passed: 45,
  failed: 0,
  sessionId: 'session-2025-12-31-001'
});

// Check for token snapshot (call periodically)
await tracker.checkTokenSnapshot(15000, {
  files: ['src/api/users.ts'],
  tasks: ['Implement user authentication']
});
```

### 2. ProjectMemoryManager

**Purpose:** High-level API for querying project memories.

**Location:** `src/memory/ProjectMemoryManager.ts`

**Key Methods:**

```typescript
class ProjectMemoryManager {
  async recallRecentWork(options?: {
    limit?: number;           // Default: 10
    types?: string[];         // Default: ['code_change', 'test_result', 'session_snapshot']
  }): Promise<Entity[]>
}
```

**Usage Example:**

```typescript
import { ProjectMemoryManager } from './memory/ProjectMemoryManager.js';
import { knowledgeGraph } from './knowledge-graph/index.js';

const manager = new ProjectMemoryManager(knowledgeGraph);

// Recall last 5 work items
const recent = await manager.recallRecentWork({ limit: 5 });

// Recall only code changes
const codeChanges = await manager.recallRecentWork({
  types: ['code_change']
});

// Display memories
recent.forEach(memory => {
  console.log(`Type: ${memory.type}`);
  console.log(`Observations:`, memory.observations);
});
```

### 3. ProjectMemoryCleanup

**Purpose:** Automatic 30-day retention management.

**Location:** `src/memory/ProjectMemoryCleanup.ts`

**Key Methods:**

```typescript
class ProjectMemoryCleanup {
  async cleanupOldMemories(): Promise<number>  // Returns count of deleted entities
}
```

**Usage Example:**

```typescript
import { ProjectMemoryCleanup } from './memory/ProjectMemoryCleanup.ts';
import { knowledgeGraph } from './knowledge-graph/index.js';

const cleanup = new ProjectMemoryCleanup(knowledgeGraph);

// Run cleanup (automatically deletes >30 day old memories)
const deletedCount = await cleanup.cleanupOldMemories();
console.log(`Deleted ${deletedCount} old memories`);
```

**Retention Policy:**
- Memories older than 30 days are automatically deleted
- Applies to: `code_change`, `test_result`, `session_snapshot`
- Timestamp extracted from entity observations
- Cascade deletes observations, tags, and relations

### 4. MCP Tool: recall-memory

**Purpose:** Exposes memory recall to Claude Code via MCP protocol.

**Location:** `src/mcp/tools/recall-memory.ts`

**Tool Registration:** `src/mcp/server.ts`

**Parameters:**

```typescript
{
  limit?: number;      // Max memories to return (default: 10)
  query?: string;      // Search query (placeholder for future use)
}
```

**Response Format:**

```typescript
{
  memories: [{
    type: string;              // 'code_change' | 'test_result' | 'session_snapshot'
    observations: string[];    // Activity details
    timestamp: string;         // ISO 8601 timestamp
  }]
}
```

**Usage from Claude Code:**

```
User: "What did we work on yesterday?"

Claude: [Calls recall-memory tool with limit: 10]

Response:
Memories recalled (10 items):

1. Code Change (2025-12-30 14:23):
   - Modified: src/api/auth.ts, src/middleware/auth.ts
   - Session: session-2025-12-30-002

2. Test Results (2025-12-30 14:25):
   - Passed: 52 tests, Failed: 0 tests
   - Session: session-2025-12-30-002

3. Session Snapshot (2025-12-30 15:10):
   - Files: src/api/auth.ts
   - Tasks: Implement JWT authentication
...
```

## Data Model

### Entity Types

The system creates three types of entities in the Knowledge Graph:

#### 1. code_change

Represents code modifications during development.

**Observations Format:**
```
- Modified files: [comma-separated file paths]
- Timestamp: [ISO 8601 timestamp]
- Session ID: [session identifier]
```

**Example:**
```typescript
{
  name: "Code Change 2025-12-31T10:15:30.123Z",
  type: "code_change",
  observations: [
    "Modified files: src/api/users.ts, src/models/User.ts",
    "Timestamp: 2025-12-31T10:15:30.123Z",
    "Session ID: session-2025-12-31-001"
  ]
}
```

#### 2. test_result

Represents test execution outcomes.

**Observations Format:**
```
- Test Results: Passed [N] tests, Failed [M] tests
- Timestamp: [ISO 8601 timestamp]
- Session ID: [session identifier]
```

**Example:**
```typescript
{
  name: "Test Result 2025-12-31T10:20:45.456Z",
  type: "test_result",
  observations: [
    "Test Results: Passed 45 tests, Failed 0 tests",
    "Timestamp: 2025-12-31T10:20:45.456Z",
    "Session ID: session-2025-12-31-001"
  ]
}
```

#### 3. session_snapshot

Represents periodic snapshots of session context.

**Observations Format:**
```
- Token Count: [N] tokens
- Files: [comma-separated file paths]
- Tasks: [comma-separated task descriptions]
- Timestamp: [ISO 8601 timestamp]
```

**Example:**
```typescript
{
  name: "Session Snapshot 2025-12-31T11:00:00.789Z",
  type: "session_snapshot",
  observations: [
    "Token Count: 15000 tokens",
    "Files: src/api/users.ts, src/api/auth.ts",
    "Tasks: Implement user authentication, Add JWT tokens",
    "Timestamp: 2025-12-31T11:00:00.789Z"
  ]
}
```

## Testing

### Test Coverage

**Total Tests:** 33 tests across 6 test files

**Test Files:**

1. `src/memory/__tests__/ProjectAutoTracker.test.ts` (16 tests)
   - Event-driven: code changes, test results
   - Token-based: snapshot creation, no-op when below threshold
   - Deduplication logic

2. `src/memory/__tests__/ProjectMemoryManager.test.ts` (4 tests)
   - Recent work recall
   - Type filtering
   - Limit enforcement

3. `src/memory/__tests__/ProjectMemoryCleanup.test.ts` (5 unit tests)
   - Old entity deletion
   - Recent entity preservation
   - Timestamp extraction

4. `src/memory/__tests__/ProjectMemoryCleanup.integration.test.ts` (3 integration tests)
   - Real database cleanup operations
   - Mixed age entity handling

5. `src/memory/__tests__/integration.test.ts` (3 tests)
   - End-to-end event capture and recall
   - Token snapshot creation
   - Multi-event sequence handling

6. `src/mcp/tools/__tests__/recall-memory.test.ts` (2 tests)
   - MCP tool handler
   - Response formatting

### Running Tests

```bash
# Run all memory system tests
npm test src/memory/__tests__/

# Run specific test file
npm test src/memory/__tests__/ProjectAutoTracker.test.ts

# Run integration tests
npm test src/memory/__tests__/integration.test.ts

# Run MCP tool tests
npm test src/mcp/tools/__tests__/recall-memory.test.ts

# Run with coverage
npm test -- --coverage src/memory/
```

### Test Database

Integration tests use a dedicated test database:

**Location:** `src/knowledge-graph/__tests__/test-kg.db`

**Cleanup:** Automatically deleted before each test run

**Initialization:** Fresh database created for each test suite

## Performance Characteristics

### Event Recording

- **recordCodeChange():** ~5-10ms per call (depends on file count)
- **recordTestResult():** ~5-10ms per call
- **Storage overhead:** ~1KB per event entity

### Token Snapshots

- **checkTokenSnapshot():** ~10-20ms when triggered, <1ms when no-op
- **Trigger frequency:** Every 10,000 tokens (~7,500 words)
- **Expected rate:** 1-2 snapshots per typical development session
- **Storage overhead:** ~2-5KB per snapshot

### Memory Recall

- **recallRecentWork():** ~20-50ms for 10 entities
- **Scales linearly:** O(n) where n = limit parameter
- **Database query:** Single SELECT with ORDER BY timestamp DESC

### Cleanup

- **cleanupOldMemories():** ~100-500ms depending on entity count
- **Recommended frequency:** Daily or weekly
- **Deletion rate:** ~50-100 entities/second

### Storage Growth

- **Active development (8 hours/day):**
  - ~20-40 code changes
  - ~10-20 test results
  - ~2-4 snapshots
  - **Total:** ~30-60 entities/day

- **30-day retention:**
  - ~900-1800 entities max
  - ~2-5 MB database size

## Implementation Details

### Deduplication

**Code Changes:** Deduplicated based on file list
- Compares sorted, comma-separated file paths
- Prevents duplicate entries for same file set within 1 minute

**Test Results:** Deduplicated based on pass/fail counts
- Compares exact pass/fail numbers
- Prevents duplicate entries within 1 minute

**Snapshots:** Deduplicated by existence
- Only one snapshot per token threshold crossing
- No duplicate snapshots until next threshold

### Timestamp Handling

All entities use ISO 8601 timestamps:
```
Timestamp: 2025-12-31T10:15:30.123Z
```

**Timezone:** UTC (recommended for consistency)
**Precision:** Milliseconds
**Parsing:** Standard `new Date()` constructor

### Error Handling

- **Network errors:** Logged, not thrown (fail gracefully)
- **Database errors:** Thrown (critical, should stop execution)
- **Invalid data:** Validated, throws descriptive errors

## Integration with Claude Code

### Hook Integration (Recommended)

```typescript
// In src/hooks/session-hooks.ts

import { ProjectAutoTracker } from './memory/ProjectAutoTracker.js';
import { mcpTools } from './mcp/client.js';

const tracker = new ProjectAutoTracker(mcpTools);

export async function onCodeChange(files: string[], sessionId: string) {
  await tracker.recordCodeChange({ files, sessionId });
}

export async function onTestComplete(passed: number, failed: number, sessionId: string) {
  await tracker.recordTestResult({ passed, failed, sessionId });
}

export async function onTokenThreshold(tokens: number, context: any) {
  await tracker.checkTokenSnapshot(tokens, context);
}
```

### Manual Integration

```typescript
// In your code
import { ProjectAutoTracker } from './memory/ProjectAutoTracker.js';
import { ProjectMemoryManager } from './memory/ProjectMemoryManager.js';
import { mcpTools } from './mcp/client.js';
import { knowledgeGraph } from './knowledge-graph/index.js';

const tracker = new ProjectAutoTracker(mcpTools);
const manager = new ProjectMemoryManager(knowledgeGraph);

// After code changes
await tracker.recordCodeChange({
  files: modifiedFiles,
  sessionId: currentSessionId
});

// After test run
await tracker.recordTestResult({
  passed: testResults.passed,
  failed: testResults.failed,
  sessionId: currentSessionId
});

// Periodically check token count
if (tokenCount >= 10000) {
  await tracker.checkTokenSnapshot(tokenCount, {
    files: recentFiles,
    tasks: activeTasks
  });
}

// Recall context at session start
const memories = await manager.recallRecentWork({ limit: 10 });
```

## Future Enhancements

### Planned Features

1. **Semantic Search** (High Priority)
   - Query-based memory retrieval
   - Natural language search across observations
   - Relevance ranking

2. **Memory Summarization** (Medium Priority)
   - Automatic summarization of long sessions
   - Hierarchical memory structure
   - Progressive detail levels

3. **Cross-Project Memories** (Medium Priority)
   - Link related work across projects
   - Reusable patterns and solutions
   - Project-agnostic best practices

4. **Memory Analytics** (Low Priority)
   - Development velocity tracking
   - Code change patterns
   - Test failure trends

### Extensibility Points

- **Custom Entity Types:** Extend beyond code_change/test_result/snapshot
- **Custom Observation Formats:** Add domain-specific metadata
- **Alternative Storage:** Replace KnowledgeGraph with other backends
- **Event Sources:** Hook into additional IDE/tool events

## Troubleshooting

### Issue: Memories Not Appearing

**Symptoms:** `recallRecentWork()` returns empty array

**Diagnosis:**
```typescript
// Check if entities exist in Knowledge Graph
const kg = await knowledgeGraph.getDb();
const all = await kg.all('SELECT * FROM entities WHERE type IN (?, ?, ?)',
  ['code_change', 'test_result', 'session_snapshot']);
console.log(`Found ${all.length} entities`);
```

**Common Causes:**
- Tracker not initialized
- MCP tools not configured
- Database connection failed
- Entities older than 30 days (cleaned up)

### Issue: Duplicate Memories

**Symptoms:** Same code change recorded multiple times

**Diagnosis:**
```typescript
// Check deduplication logic
const tracker = new ProjectAutoTracker(mcpTools);
// Set shorter window for testing
tracker['DEDUP_WINDOW_MS'] = 1000; // 1 second
```

**Common Causes:**
- Clock skew (timestamps incorrect)
- Deduplication window too short
- File paths not normalized

### Issue: Cleanup Too Aggressive

**Symptoms:** Recent memories being deleted

**Diagnosis:**
```typescript
// Check timestamp extraction
const cleanup = new ProjectMemoryCleanup(knowledgeGraph);
const testEntity = { /* entity */ };
const ts = cleanup['extractTimestamp'](testEntity);
console.log(`Extracted timestamp: ${ts}`);
```

**Common Causes:**
- Timestamp format incorrect
- Timezone mismatch (should be UTC)
- System clock incorrect

### Issue: MCP Tool Not Working

**Symptoms:** `recall-memory` tool not available in Claude Code

**Diagnosis:**
```bash
# Check MCP server registration
npm run mcp:list

# Test tool directly
npm run mcp:test recall-memory
```

**Common Causes:**
- MCP server not started
- Tool not registered in server.ts
- Permission issues

## References

- **Knowledge Graph Documentation:** `src/knowledge-graph/README.md`
- **MCP Protocol Specification:** `docs/MCP_PROTOCOL.md`
- **Implementation Plan:** `docs/plans/2025-12-31-project-memory-system.md`
- **Test Results:** See test output in CI logs

---

**Last Updated:** 2025-12-31
**Version:** 1.0.0
**Status:** Production Ready ✅
