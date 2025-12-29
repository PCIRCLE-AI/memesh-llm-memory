# Project Cleanup Audit

**Date**: 2025-12-29
**Purpose**: Identify unused, unimplemented, and multi-provider code to remove
**Goal**: Simplify to core working functionality only

---

## 🔴 CRITICAL UPDATE: Original Assessment Was WRONG

**Original Estimate**: Remove ~66% of codebase (ui/, skills/, management/, knowledge-graph/, telemetry/, agents/, collaboration/, teams/)

**⚠️ CORRECTED After Verification**: Remove only ~20-30% of codebase

**What Changed**:
- ❌ **WRONG**: ui/ can be removed → ✅ **CORRECT**: ui/ is actively used (ResponseFormatter by mcp/server.ts)
- ❌ **WRONG**: skills/ can be removed → ✅ **CORRECT**: skills/ is actively used (SkillManager by mcp/server.ts)
- ❌ **WRONG**: management/ can be removed → ✅ **CORRECT**: management/ is actively used (UninstallManager by mcp/server.ts)
- ❌ **WRONG**: knowledge-graph/ can be removed → ✅ **CORRECT**: knowledge-graph/ is used by agents/knowledge/
- ❌ **WRONG**: telemetry/ can be removed → ✅ **CORRECT**: telemetry/ is used by evolution/instrumentation/
- ❌ **WRONG**: All of agents/ can be removed → ✅ **CORRECT**: agents/rag/ is actively used by mcp/server.ts
- ✅ **CONFIRMED**: collaboration/, teams/, compliance/ can be removed (verified via grep - NOT imported by MCP server)

**Actual Cleanup Scope**:
1. ✅ Remove: collaboration/, teams/, compliance/ (verified unused)
2. ✅ Remove: agents/ subdirectories (except rag/) - only imported by teams/
3. ✅ Simplify: Multi-provider config (ollama, gemini, grok references)
4. ✅ Keep: Everything else is actually being used

**Lesson Learned**: Always verify with grep before assuming code is unused. Documentation assumptions ≠ actual usage.

---

## Audit Methodology

Analyzing codebase for:
1. ✅ **Actually Implemented & Working** - Keep
2. ❌ **Multi-Provider Integrations** - Remove (user request)
3. ❌ **Planned but Not Implemented** - Remove (architecture docs only)
4. ❌ **Implemented but Not Working** - Remove
5. ❌ **Unused/Dead Code** - Remove

---

## Directory-by-Directory Analysis

### `src/orchestrator/` - **KEEP (Core Functionality)**

**Files**:
- `router.ts` ✅ **KEEP** - Core Router with Evolution integration
- `TaskAnalyzer.ts` ✅ **KEEP** - Task analysis logic
- `AgentRouter.ts` ✅ **KEEP** - Agent routing logic
- `CostTracker.ts` ❌ **REMOVE** - Multi-provider cost tracking (not needed if single provider)
- `types.ts` ✅ **KEEP** - Core type definitions

**Reason to Keep**: This is the core routing system that's actually implemented and tested.

**Cleanup Actions**:
- [ ] Remove `CostTracker.ts` if only using Claude (single provider pricing is simple)
- [ ] Simplify `AgentRouter.ts` to remove multi-provider selection logic
- [ ] Keep `Router.ts` as the main entry point

---

### `src/evolution/` - **KEEP (Core Learning System)**

**Files**:
- `PerformanceTracker.ts` ✅ **KEEP** - Metrics tracking (tested, working)
- `LearningManager.ts` ✅ **KEEP** - Pattern learning (tested, working)
- `AdaptationEngine.ts` ✅ **KEEP** - Pattern application (tested, working)
- `EvolutionMonitor.ts` ✅ **KEEP** - Dashboard (tested, working)
- `EvolutionBootstrap.ts` ✅ **KEEP** - Bootstrap patterns (tested, working)
- `AgentEvolutionConfig.ts` ✅ **KEEP** - Agent configs (tested, working)
- `types.ts` ✅ **KEEP** - Type definitions

**Subdirectories**:
- `instrumentation/` ❓ **CHECK** - Is this used?
- `links/` ❓ **CHECK** - Is this used?
- `storage/` ❓ **CHECK** - Is this implemented?

**Reason to Keep**: This is the self-learning system that's fully implemented and tested.

**Cleanup Actions**:
- [ ] Audit subdirectories for actual usage
- [ ] Remove if just planning docs

---

### `src/agents/` - **REMOVE (Not Implemented)**

**Subdirectories**:
- `_template/` ❌ **REMOVE** - Template for agent creation (not needed)
- `architecture/` ❌ **REMOVE** - Likely planning docs
- `code/` ❌ **REMOVE** - Agent implementations (use existing 22 agent configs instead)
- `knowledge/` ❌ **REMOVE**
- `rag/` ❌ **REMOVE**
- `research/` ❌ **REMOVE**

**Reason to Remove**: Based on codebase analysis, the 22 agents are configured in `AgentEvolutionConfig.ts`, not as separate agent classes. These directories likely contain unimplemented/partial code.

**Cleanup Actions**:
- [ ] Verify agents are only configs, not separate implementations
- [ ] Remove entire `src/agents/` directory if confirmed
- [ ] Keep agent configs in `AgentEvolutionConfig.ts`

---

### `src/collaboration/` - **REMOVE (Unimplemented Feature)**

**Files**:
- `TeamCoordinator.ts` ❌ **REMOVE** - Multi-agent collaboration (not implemented)
- `MessageBus.ts` ❌ **REMOVE**
- `CollaborationManager.ts` ❌ **REMOVE**
- `persistence/` ❌ **REMOVE** - Database layer (unnecessary complexity)

**Reason to Remove**:
- Smart-agents is for single-user Claude Code integration
- Collaboration between multiple agents isn't the current goal
- Adds database dependency (unnecessary)

**Cleanup Actions**:
- [ ] Remove entire `src/collaboration/` directory
- [ ] Remove database dependencies from `package.json`

---

### `src/compliance/` - **KEEP (Useful for Rules Enforcement)**

**Files**:
- `poc/` ❓ **CHECK** - POC code (remove if not used)
- `rules/` ✅ **KEEP IF IMPLEMENTED** - Rules definitions

**Reason to Keep/Remove**:
- If this has working READ_BEFORE_EDIT enforcement → Keep
- If it's just POC/planning → Remove

**Cleanup Actions**:
- [ ] Check if compliance rules are actually enforced
- [ ] Keep if working, remove if just POC

---

### `src/config/` - **KEEP (Configuration)**

**Reason to Keep**: Every project needs config

**Cleanup Actions**:
- [ ] Remove multi-provider config options
- [ ] Simplify to single-provider (Claude) config

---

### `src/core/` - **CHECK (May Have Unused Utilities)**

**Files to Check**:
- `ResourceMonitor.ts` ❓ - Is this used?
- `BackgroundExecutor.ts` ❓ - Is this used?

**Cleanup Actions**:
- [ ] Audit each file for actual usage
- [ ] Remove if no imports found in main code

---

### `src/knowledge-graph/` - **REMOVE (Unimplemented)**

**Reason to Remove**:
- Not mentioned in any working code
- Likely just planning/POC
- MCP Memory already provides graph storage

**Cleanup Actions**:
- [ ] Remove entire directory
- [ ] Use MCP Memory Knowledge Graph instead

---

### `src/management/` - **REMOVE (Unimplemented)**

**Reason to Remove**: Project management features aren't core to smart-agents

**Cleanup Actions**:
- [ ] Remove entire directory

---

### `src/mcp/` - **KEEP (MCP Server Implementation)**

**Reason to Keep**: This is the MCP Server that Claude Code integrates with

**Cleanup Actions**:
- [ ] Keep MCP server core
- [ ] Remove multi-provider tools/resources
- [ ] Simplify to essential tools only

---

### `src/skills/` - **REMOVE (Use Claude Code Skills Instead)**

**Reason to Remove**: Claude Code already has skills system, don't duplicate

**Cleanup Actions**:
- [ ] Remove entire directory
- [ ] Use Claude Code native skills

---

### `src/teams/` - **REMOVE (Multi-Agent Coordination)**

**Reason to Remove**: Similar to collaboration, unnecessary complexity

**Cleanup Actions**:
- [ ] Remove entire directory

---

### `src/telemetry/` - **REMOVE OR SIMPLIFY**

**Reason to Remove/Simplify**:
- If this is just usage tracking → Remove (privacy concern)
- If this is performance metrics → Merge into `PerformanceTracker`

**Cleanup Actions**:
- [ ] Check what telemetry actually does
- [ ] Remove if external tracking
- [ ] Keep if just local metrics

---

### `src/ui/` - **REMOVE (Not Needed for CLI/MCP)**

**Files**:
- `Dashboard.ts` ❌ **REMOVE** - UI dashboard (MCP doesn't need UI)
- `ProgressRenderer.ts` ❌ **REMOVE**
- `MetricsStore.ts` ❌ **REMOVE**
- `ResponseFormatter.ts` ❌ **REMOVE**

**Reason to Remove**:
- Smart-agents integrates with Claude Code via MCP
- No need for separate UI layer
- EvolutionMonitor.formatDashboard() already provides text output

**Cleanup Actions**:
- [ ] Remove entire `src/ui/` directory
- [ ] Keep text-based dashboard in EvolutionMonitor

---

### `src/utils/` - **KEEP (Utility Functions)**

**Reason to Keep**: Common utilities are always needed

**Cleanup Actions**:
- [ ] Audit for unused utilities
- [ ] Remove dead code

---

## Multi-Provider Code to Remove

### 1. Provider Integrations

**Files/Directories to Remove**:
- Any Ollama integration code
- Any Gemini integration code
- Any Grok integration code
- Any ChatGPT integration code

**Search for**:
```bash
grep -r "ollama" src/
grep -r "gemini" src/
grep -r "grok" src/
grep -r "chatgpt" src/
grep -r "openai" src/
```

**Keep Only**:
- Claude/Anthropic integration
- Generic abstractions (if simple)

### 2. Provider Selection Logic

**In `AgentRouter.ts`**:
- Remove provider selection algorithms
- Remove failover logic
- Remove quota checking across multiple providers
- Simplify to single provider (Claude via MCP)

### 3. Cost Tracking Complexity

**In `CostTracker.ts`**:
- Remove multi-provider pricing
- Simplify to Claude pricing only (or remove entirely if not needed)

---

## Architecture Documents to Remove

### `docs/architecture/`

**Files to Check**:
- `OVERVIEW.md` ⚠️ **UPDATE** - Remove multi-provider sections, keep evolution system
- `mcp-orchestrator-integration.md` ⚠️ **UPDATE** - Simplify to actual implementation
- Any other planning docs that aren't implemented ❌ **REMOVE**

**Keep**:
- `CLAUDE_CODE_INTEGRATION_PLAN.md` ✅ (current work)
- `FIRST_PRINCIPLES_ANALYSIS.md` ✅ (current work)

---

## ⚠️ CORRECTED FINDINGS (After Verification)

### ✅ KEEP (Actually Used by MCP Server)

```
src/
├── orchestrator/          # Core routing (used by mcp/server.ts)
│   ├── router.ts         ✅ Main router
│   ├── TaskAnalyzer.ts   ✅ Task analysis
│   ├── AgentRouter.ts    ✅ Agent routing
│   ├── CostTracker.ts    ✅ Cost tracking (simplify multi-provider)
│   └── types.ts          ✅ Types
├── evolution/            # Learning system (used by mcp/server.ts)
│   ├── PerformanceTracker.ts      ✅
│   ├── LearningManager.ts         ✅
│   ├── AdaptationEngine.ts        ✅
│   ├── EvolutionMonitor.ts        ✅
│   ├── EvolutionBootstrap.ts      ✅
│   ├── AgentEvolutionConfig.ts    ✅
│   ├── FeedbackCollector.ts       ✅
│   └── types.ts                   ✅
├── core/                 # Core utilities (used by mcp/server.ts)
│   ├── AgentRegistry.ts           ✅ Agent metadata registry
│   ├── BackgroundExecutor.ts      ✅ (imports ui/)
│   └── PromptEnhancer.ts          ✅ (imports orchestrator/)
├── ui/                   # Response formatting (used by mcp/server.ts)
│   ├── ResponseFormatter.ts       ✅ Terminal output formatting
│   ├── UIEventBus.ts              ✅ (used by core/)
│   └── AttributionManager.ts      ✅ (used by core/)
├── mcp/                  # MCP Server implementation
│   ├── server.ts                  ✅ Main MCP server
│   └── HumanInLoopUI.ts           ✅
├── skills/               # Skills management (used by mcp/server.ts)
│   └── SkillManager.ts            ✅
├── management/           # Uninstall management (used by mcp/server.ts)
│   └── UninstallManager.ts        ✅
├── agents/               # Agent implementations (partially used)
│   └── rag/                       ✅ RAG agent (used by mcp/server.ts)
│       ├── index.ts               ✅
│       ├── FileWatcher.ts         ✅
│       ├── embeddings.ts          ✅ (uses OpenAI)
│       └── vectorstore.ts         ✅
├── knowledge-graph/      # Knowledge graph (used by agents/knowledge)
│   └── index.ts                   ✅
├── telemetry/            # Telemetry (used by evolution/instrumentation)
│   ├── TelemetryCollector.ts      ✅
│   └── sanitization.ts            ✅
├── config/               # Configuration (simplify multi-provider)
├── utils/                # Utilities
└── types/                # Type definitions
```

### ❌ REMOVE (Verified Unused)

```
src/
├── collaboration/        ❌ Remove (NOT imported by mcp/server.ts)
├── teams/                ❌ Remove (NOT imported by mcp/server.ts)
├── agents/               ⚠️  Remove non-RAG subdirectories:
│   ├── _template/        ❌ Template (not used)
│   ├── architecture/     ❌ Only imported by teams/ (which is removed)
│   ├── code/             ❌ Only imported by teams/ (which is removed)
│   ├── research/         ❌ Only imported by teams/ (which is removed)
│   └── knowledge/        ❌ Only imported internally (not by mcp/)
└── compliance/           ⚠️  Need to verify if compliance is enforced
```

### 🔧 SIMPLIFY (Remove Multi-Provider Code)

```
config/index.ts:
  ❌ GROK_MODEL configuration
  ❌ DEFAULT_TEXT_PROVIDER: 'ollama'
  ❌ DEFAULT_CODE_PROVIDER: 'ollama'
  ❌ DEFAULT_MULTIMODAL_PROVIDER: 'gemini'
  ❌ FALLBACK_PROVIDER: 'ollama'

agents/rag/embeddings.ts:
  ⚠️  Keep OpenAI embeddings (actually used)

orchestrator/AgentRouter.ts:
  ❌ Multi-provider selection logic
  ❌ Provider failover logic
```

---

## ⚠️ REVISED Impact Analysis

### Before Cleanup
- **Total Directories**: 18 in src/
- **Estimated LOC**: ~15,000+
- **Complexity**: High (multi-provider, collaboration, teams)
- **Unused Features**: collaboration, teams, agent implementations

### After Cleanup
- **Total Directories**: ~13 in src/ (removing 5)
- **Estimated LOC**: ~12,000 (removal is smaller than initially thought)
- **Complexity**: Medium (still complex but focused)
- **Removed**: collaboration/, teams/, agents/ (except rag/), compliance/ (if verified unused)
- **Simplified**: Multi-provider config, provider selection logic

**Actual Reduction**: ~20-30% of codebase (NOT 66% as initially estimated)

**Why Smaller Than Expected**:
- ✅ ui/, skills/, management/, knowledge-graph/, telemetry/ are **actually used**
- ✅ MCP server actively uses these components for ResponseFormatter, SkillManager, UninstallManager
- ✅ Evolution system uses telemetry for instrumentation
- ✅ RAG agent is actively used (agents/rag/ must stay)
- ❌ Only collaboration/, teams/, and non-RAG agent implementations can be removed

---

## ⚠️ REVISED Implementation Plan

### Phase 1: Audit Current Usage ✅ (Completed - Corrected Findings Above)

**Key Findings**:
- ✅ Verified via grep: collaboration/, teams/, compliance/ are NOT imported by MCP server
- ✅ Verified via grep: ui/, skills/, management/, knowledge-graph/, telemetry/ ARE used
- ✅ Only agents/rag/ is used by MCP server, other agent implementations can be removed

### Phase 2: Backup and Create Cleanup Branch

```bash
# Create backup branch first
git checkout -b backup/before-cleanup-$(date +%Y%m%d)
git push origin backup/before-cleanup-$(date +%Y%m%d)

# Create cleanup working branch
git checkout -b cleanup/remove-unused-features
```

### Phase 3: Remove Verified Unused Directories

```bash
# Remove collaboration and teams (verified unused)
rm -rf src/collaboration/
rm -rf src/teams/
rm -rf src/compliance/

# Remove non-RAG agent implementations (only imported by teams/)
cd src/agents/
rm -rf _template/
rm -rf architecture/
rm -rf code/
rm -rf research/
rm -rf knowledge/
# Keep: rag/ (actively used by mcp/server.ts)
cd ../..

# Commit removals
git add -A
git commit -m "chore: remove unused collaboration, teams, compliance, and agent implementations

- Removed src/collaboration/ (not imported by MCP server)
- Removed src/teams/ (not imported by MCP server)
- Removed src/compliance/ (not imported by MCP server)
- Removed non-RAG agent implementations (only imported by removed teams/)
- Kept src/agents/rag/ (actively used by mcp/server.ts)"
```

### Phase 4: Simplify Multi-Provider Code

```bash
# 1. Simplify config/index.ts (remove ollama, gemini, grok defaults)
# 2. Simplify orchestrator/AgentRouter.ts (remove provider selection logic)
# 3. Keep agents/rag/embeddings.ts (OpenAI is actually used)
```

**Files to Edit**:
- `src/config/index.ts`: Remove GROK_MODEL, DEFAULT_TEXT_PROVIDER, DEFAULT_CODE_PROVIDER, DEFAULT_MULTIMODAL_PROVIDER, FALLBACK_PROVIDER
- `src/orchestrator/AgentRouter.ts`: Remove multi-provider selection logic, keep single provider

### Phase 5: Update Tests

```bash
# Remove tests for deleted directories
rm -rf tests/collaboration/
rm -rf tests/teams/
rm -rf tests/compliance/
rm -rf tests/agents/ (except rag if exists)

# Update imports in remaining tests
grep -r "from.*collaboration" tests/ --files-with-matches | xargs sed -i '' '/collaboration/d'
grep -r "from.*teams" tests/ --files-with-matches | xargs sed -i '' '/teams/d'

# Run all tests to verify
npm test
```

### Phase 6: Update Documentation

```bash
# Remove documentation for deleted features
# Update README.md to reflect:
# - No collaboration features
# - No team coordination
# - Single provider (Claude via MCP)
# - Only RAG agent implementation exists

# Update docs/architecture/OVERVIEW.md:
# - Remove multi-provider sections
# - Focus on single-provider + evolution system
```

### Phase 7: Verification and Cleanup

```bash
# Verify no broken imports
npm run typecheck

# Verify tests pass
npm test

# Verify MCP server builds
npm run build

# Clean up any orphaned files
find src/ -name "*.ts" -type f -exec grep -l "collaboration\|teams" {} \;
```

---

## ✅ REVISED Next Steps (After Verification)

1. ✅ **Phase 1 Complete**: Verification done, corrected findings documented
2. ⏳ **Awaiting User Approval**: Review corrected cleanup scope (20-30% reduction, not 66%)
3. ⏸️ **Phase 2**: Create backup and cleanup branch
4. ⏸️ **Phase 3**: Remove verified unused directories (collaboration/, teams/, compliance/, agents/* except rag/)
5. ⏸️ **Phase 4**: Simplify multi-provider code in config/ and orchestrator/
6. ⏸️ **Phase 5**: Update tests (remove tests for deleted code)
7. ⏸️ **Phase 6**: Update documentation
8. ⏸️ **Phase 7**: Verification (typecheck, tests, build)
9. ⏸️ **Merge**: After all tests pass

---

## Questions for User

1. **CostTracker**: Remove entirely or keep simplified for Claude pricing?
2. **Compliance**: Is the compliance enforcement actually working? Keep or remove?
3. **Telemetry**: What does this actually track? Keep or remove?
4. **MCP Server**: Which tools are actually needed vs. planned?

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Remove needed code | Low | High | Verify with grep before removing |
| Break existing tests | Medium | Medium | Update tests incrementally |
| Import errors after removal | Medium | Low | Fix with TypeScript compiler errors |
| Lost functionality | Low | Medium | Git backup, can restore if needed |

---

**Ready to proceed with cleanup once approved.**
