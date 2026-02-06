# Phase 0: Selective Slim Down — Execution Plan

## Decision Summary

| Decision | Choice |
|----------|--------|
| PR #54 | Close without merging (strategy shift, A2A → Cloud) |
| A2A networking infra | REMOVE (Cloud replaces) |
| agents/ + orchestrator/ | REMOVE (buddy-do removed) |
| core execution engine | REMOVE (only needed for local agents) |
| evolution/learning | KEEP (user values mistake tracking + workflow guidance) |
| a2a/utils/ (agentId, platformDetection) | KEEP → move to src/utils/ |
| Session Memory Pipeline | PRESERVE (new core feature) |

## Estimated Removal: ~40,000 lines

```
A2A networking (server, client, events, delegator, jobs, metrics, migration, errors, executor): ~12,000
A2A MCP tools + handlers (14 tools + A2AToolHandlers):                                         ~4,000
agents/ (DevelopmentButler, TestWriterAgent, etc.):                                             ~5,000
orchestrator/:                                                                                  ~3,500
core execution (BackgroundExecutor, ExecutionQueue, ExecutionMonitor, PromptEnhancer):          ~3,100
A2A storage (TaskQueue, TaskBoard) — NOT AgentRegistry which moves:                            ~3,000
A2A tests:                                                                                     ~9,000+
Total:                                                                                        ~40,000
```

## Version Strategy

**Major version bump: 2.7.0 → 3.0.0**

Breaking changes:
- Public exports removed: `DevelopmentButler`, `TestWriterAgent` from index.ts
- 15 MCP tools removed (14 A2A + buddy-do)
- `MEMESH_A2A_TOKEN` no longer required
- Express dependency removed

---

## Execution Steps (dependency-safe order)

### Step 0: Prep (before any deletion)

1. Create feature branch: `feature/phase-0-slim-down`
2. Close PR #54 with comment explaining strategy shift
3. Snapshot current test count: `npx vitest run --reporter=verbose 2>&1 | tail -5`

### Step 1: Move utils before deleting a2a/

**Move** (not delete):
- `src/a2a/utils/agentId.ts` → `src/utils/agentId.ts`
- `src/a2a/utils/platformDetection.ts` → `src/utils/platformDetection.ts`
- `src/a2a/utils/__tests__/` → `src/utils/__tests__/` (corresponding tests)

**Update imports** in:
- `src/hooks/a2a-collaboration.ts` — change import path
- `src/mcp/tools/a2a-set-skills.ts` (will be deleted in Step 3, but move first for clean diff)
- Any other files importing from `a2a/utils/`

**Verify**: `npm run build && npm run typecheck`

### Step 2: Remove A2A networking infrastructure

**Delete directories**:
```
src/a2a/server/          (A2AServer, routes, middleware, validation)
src/a2a/client/          (A2AClient)
src/a2a/events/          (A2AEventEmitter, EventBuffer)
src/a2a/delegator/       (MCPTaskDelegator)
src/a2a/jobs/            (TimeoutChecker)
src/a2a/metrics/         (A2AMetrics)
src/a2a/migration/       (migrateToUnifiedTaskBoard)
src/a2a/errors/          (ErrorCodes, ErrorMessages)
src/a2a/executor/        (TaskExecutor)
src/a2a/storage/         (TaskQueue, TaskBoard — AgentRegistry stays, see note)
src/a2a/types/           (task, message, protocol, agent-card, rateLimit)
```

**AgentRegistry decision**:
- `AgentRegistry` in `src/a2a/storage/` is used by a2a-collaboration hook for agent check-in
- Move to `src/utils/AgentRegistry.ts` OR simplify hook to use KG directly
- Decision: Simplify hook — remove AgentRegistry dependency, agent check-in writes to KG only

**Delete remaining**:
```
src/a2a/               (entire directory after moves complete)
```

**Update src/index.ts**:
- Remove `import { A2AServer }` and entire `startA2AServer()` function
- Remove A2A server shutdown in cleanup handler
- Remove AgentCard type import

**Update src/mcp/ServerInitializer.ts**:
- Remove `import { TaskQueue }` and `import { MCPTaskDelegator }`
- Remove TaskQueue/MCPTaskDelegator instantiation
- Remove from ServerComponents interface
- ⚠️ PRESERVE: SessionMemoryPipeline lifecycle wiring

**Update src/mcp/server.ts**:
- Remove `taskQueue.close()` from shutdown sequence
- ⚠️ PRESERVE: SessionMemoryPipeline shutdown

**Update src/mcp/ToolRouter.ts**:
- Remove TaskQueue/MCPTaskDelegator type imports
- Remove all A2A tool routing (14 tool cases)
- Remove A2AToolHandlers import and instantiation

**Verify**: `npm run build && npm run typecheck`

### Step 3: Remove A2A MCP tools + handlers

**Delete files**:
```
src/mcp/tools/a2a-send-task.ts
src/mcp/tools/a2a-get-task.ts
src/mcp/tools/a2a-get-result.ts
src/mcp/tools/a2a-list-tasks.ts
src/mcp/tools/a2a-list-agents.ts
src/mcp/tools/a2a-report-result.ts
src/mcp/tools/a2a-board.ts
src/mcp/tools/a2a-claim-task.ts
src/mcp/tools/a2a-release-task.ts
src/mcp/tools/a2a-find-tasks.ts
src/mcp/tools/a2a-set-skills.ts
src/mcp/tools/a2a-cancel-task.ts
src/mcp/tools/a2a-subscribe.ts
src/mcp/tools/a2a-utils.ts          (shared utilities for A2A tools)
src/mcp/tools/__tests__/a2a-*.ts     (all A2A tool tests)
src/mcp/handlers/A2AToolHandlers.ts
src/mcp/handlers/A2AToolHandlers.test.ts
```

**Update src/mcp/ToolDefinitions.ts**:
- Remove all A2A tool definitions (a2aSendTaskTool, a2aBoardTool, etc.)
- Remove from `getAllToolDefinitions()` array
- Update tool count in any comments/docs

**Verify**: `npm run build && npm run typecheck`

### Step 4: Remove agents/ + orchestrator/

**Delete directories**:
```
src/agents/              (DevelopmentButler, TestWriterAgent, E2EHealingAgent, etc.)
src/orchestrator/        (router, task routing logic)
```

**Update src/index.ts**:
- Remove `export { DevelopmentButler }`
- Remove `export { TestWriterAgent }`

**Update src/mcp/ServerInitializer.ts**:
- Remove agent/orchestrator initialization
- ⚠️ PRESERVE: evolution initialization (LearningManager, etc.)
- ⚠️ PRESERVE: SessionMemoryPipeline initialization

**Simplify buddy-do handler**:
- `src/mcp/handlers/BuddyDo.ts` (or wherever buddy-do routes) — either:
  a) Remove entirely (buddy-do tool gone), OR
  b) Simplify to just record task in KG (no agent routing)
- Decision: Remove buddy-do tool entirely per user's request

**Update ToolDefinitions.ts**:
- Remove buddy-do tool definition

**Update ToolRouter.ts**:
- Remove buddy-do routing

**Verify**: `npm run build && npm run typecheck`

### Step 5: Remove core execution engine

**Delete files**:
```
src/core/BackgroundExecutor.ts
src/core/ExecutionQueue.ts
src/core/ExecutionMonitor.ts
src/core/PromptEnhancer.ts
```

**Keep in src/core/**:
- WorkflowGuidanceEngine.ts (uses evolution — KEEP)
- HookIntegration.ts (used by tool handlers — KEEP)
- SessionContextMonitor.ts (session tracking — KEEP)
- AgentRegistry.ts (core, not a2a — KEEP)
- MCPToolInterface.ts (KEEP)
- CheckpointDetector.ts (KEEP)
- HealthCheck.ts (KEEP)

**Update imports**: Remove any references to deleted core files from ServerInitializer, index.ts, etc.

**Verify**: `npm run build && npm run typecheck`

### Step 6: Simplify a2a-collaboration hook

**Modify** `src/hooks/a2a-collaboration.ts`:
- Remove: AgentRegistry dependency, A2A task checking, A2A server references
- Keep: Agent check-in to KG (useful for session tracking)
- Keep: Session startup context generation
- Update import from `../a2a/utils/agentId` → `../utils/agentId`
- Rename file to `session-collaboration.ts` (no longer A2A specific)

### Step 7: Update package infrastructure

**Update package.json**:
- Version: `"version": "3.0.0"`
- Remove scripts: `a2a:generate-token`, `a2a:regenerate-token`, `a2a:show-token`
- Update `copy:resources`: remove `dist/a2a/storage/*.sql` copy
- Remove express dependency (if only used by A2A server)

**Update scripts/postinstall.js**:
- Remove A2A token generation
- Remove `MEMESH_A2A_TOKEN` from mcp_settings.json config
- Simplify: just configure MCP server entry without token

**Update .env.example**:
- Remove all A2A environment variables section

**Update mcp.json** (if exists):
- Remove `MEMESH_A2A_TOKEN` from env

### Step 8: Clean up tests

**Delete A2A test files**:
```
src/a2a/**/\__tests__/        (all A2A test directories)
tests/unit/a2a/               (if exists)
tests/integration/a2a/        (if exists)
tests/e2e/a2a/                (if exists)
```

**Delete agent/orchestrator test files**:
```
tests referencing DevelopmentButler, TestWriterAgent, orchestrator
```

**Delete core execution test files**:
```
tests for BackgroundExecutor, ExecutionQueue, ExecutionMonitor, PromptEnhancer
```

**Update remaining tests**:
- Fix any test that imports from deleted modules
- Update expected tool count in validation tests
- Update ServerInitializer tests to not expect A2A components

### Step 9: Update documentation

**Update README.md / README.zh-TW.md**:
- Remove A2A protocol section
- Remove buddy-do from command list
- Update tool count (from 18+ to ~12)
- Update feature description (focus: memory, learning, session integration)

**Delete obsolete docs**:
```
docs/features/a2a-agent-collaboration.md
docs/A2A_TESTING_GUIDE.md
docs/UNIFIED_TASK_BOARD.md
A2A_MULTI_AGENT_TEST.md
```

**Update docs/COMMANDS.md**: Remove A2A commands

**Update docs/api/API_REFERENCE.md**: Remove A2A API section

### Step 10: Clean up orphaned A2A databases

**Strategy**: Delete legacy A2A databases on startup — they contain no useful data.

Add to server startup (ServerInitializer or similar):
```typescript
// Clean up orphaned A2A databases from previous versions
const legacyDbs = ['a2a-registry.db', 'a2a-tasks.db', 'task-board.db'];
for (const db of legacyDbs) {
  const dbPath = path.join(dataDir, db);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    // Also clean WAL/SHM files if present
    for (const suffix of ['-wal', '-shm']) {
      const walPath = dbPath + suffix;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    }
    logger.info(`Cleaned up legacy A2A database: ${db}`);
  }
}
// Also clean per-agent task databases: a2a-tasks-{agentId}.db
const files = fs.readdirSync(dataDir);
for (const file of files) {
  if (file.startsWith('a2a-tasks-') && file.endsWith('.db')) {
    fs.unlinkSync(path.join(dataDir, file));
    logger.info(`Cleaned up legacy per-agent database: ${file}`);
  }
}
```

### Step 11: Verify plugin dist

**Rebuild plugin**:
```bash
npm run build:plugin
```

**Verify .claude-plugin/memesh/dist/** doesn't contain A2A artifacts.

---

## Verification Checklist

After all steps:

```
□ npm run build              — compiles without errors
□ npm run typecheck           — no type errors
□ npx vitest run              — all remaining tests pass
□ Remaining MCP tools work:
  □ buddy-remember
  □ buddy-help
  □ buddy-record-mistake (uses evolution — critical)
  □ buddy-secret-store / get / list / delete
  □ create-entities
  □ get-session-health
  □ get-workflow-guidance (uses evolution — critical)
  □ hook-tool-use
  □ generate-tests
□ Session memory pipeline still starts/stops correctly
□ Evolution/learning system still initializes
□ No express dependency in node_modules (if removed)
□ postinstall.js works without A2A token generation
□ Plugin dist is clean
```

## Backward Compatibility Handling

| Concern | Solution |
|---------|----------|
| Users with `MEMESH_A2A_TOKEN` in env | Silently ignored (not error) |
| Users with A2A databases | Auto-delete on startup (no useful data) |
| Library users importing `DevelopmentButler` | BREAKING — semver major bump |
| Users expecting A2A tools | Tools gone — documented in CHANGELOG |
| mcp_settings.json with old config | postinstall updates on next `npm install` |

## Rollback Plan

```bash
git checkout develop   # Return to pre-Phase-0 state
```

Feature branch ensures develop remains untouched until verification complete.

## What's PRESERVED (explicitly)

- `src/evolution/` — entire module (learning, mistake patterns, workflow guidance)
- `src/integrations/session-memory/` — entire module
- `src/knowledge-graph/` — core storage
- `src/memory/` — UnifiedMemoryStore, SmartMemoryQuery, SecretManager
- `src/hooks/` — simplified, renamed
- `src/utils/` — gains agentId.ts, platformDetection.ts
- `src/core/WorkflowGuidanceEngine.ts` — uses evolution
- `src/core/HookIntegration.ts` — tool handler hooks
- `src/mcp/SessionBootstrapper.ts` — session context injection
- `src/mcp/ServerInitializer.ts` — cleaned up, pipeline wiring intact
- `src/config/`, `src/cli/`, `src/ui/`, `src/db/`, `src/telemetry/`
