# Smart-Agents Implementation Plan - Hook-Based Automation [未實作/已棄用]

> ⚠️ **重要通知：此計劃從未實作**
>
> - 此文件是 **2025-12-29 撰寫的實作計劃**，但從未實際執行
> - Claude Code hooks 系統（SessionStart, PostToolUse, Stop）**從未被實作**
> - 在 **2025-12-30**，已確認 hooks 方案已棄用
> - 此文件保留作為**歷史參考**，記錄當時的設計思路
> - 相關文檔狀態：
>   - ✅ HOOKS_IMPLEMENTATION_GUIDE.md - 已標記為 DEPRECATED
>   - ✅ README.md - Hooks 章節已標記為已棄用
>   - ⚠️ 本文件 - 記錄未實作的計劃（保留供參考）

**Version**: 3.0 (Hook-Based Architecture - Corrected Approach)
**Date**: 2025-12-29
**Status**: ❌ 未實作 - 計劃已棄用

---

## 🎯 Core Philosophy (First Principles)

**"讓Claude Code 自發地去使用 smart-agents 的任務分配系統和 Claude Code 的 subagent 並行工作能力和活用 skills + MCP tools 來完成計畫的實作。"**

**Translation**: Make Claude Code **proactively** use smart-agents' task distribution system and Claude Code's subagent parallel working capabilities, leveraging skills + MCP tools to complete implementations.

### Key Insight: Automation Requires Both Content + Delivery

**CONTENT** (Smart Orchestrator Skill):
- Task analysis logic (complexity, dependencies)
- 22-agent registry with capabilities
- Smart routing (Sequential vs Parallel decision trees)
- User permission flow templates

**DELIVERY** (Hooks System):
- **SessionStart Hook**: Initialize Router + Evolution System, load patterns from MCP Memory
- **PostToolUse Hook**: Track performance, detect anomalies, learn patterns, persist to MCP Memory
- **Stop Hook**: Save evolution state, generate session summary, cleanup

**Why We Need Both**:
- ✅ Skill alone = reactive (requires manual invocation)
- ✅ Hooks alone = no intelligence (what to do?)
- ✅ Skill + Hooks = proactive automation (自發地)

---

## 🏗️ Architecture (Hook-Based Automation)

### System Components (Verified)

**Claude Code Hooks** (✅ Real Feature):
- SessionStart hook - Runs when session begins
- PostToolUse hook - Runs after each tool execution
- Stop hook - Runs when session ends
- Configured in: `~/.claude/settings.json` or project `.claude/hooks/`

**Claude Code Task Tool** (✅ Verified):
- **Parallel Execution**: Multiple Task calls in one message → run simultaneously
- **Sequential Execution**: Make Task call → wait → make next Task call in follow-up
- **NO Background Execution**: `run_in_background` parameter does NOT exist for Task tool (only for Bash tool)

**Smart-Agents Components** (✅ Already Exists):
- **22 Specialized Agents**: Metadata registry with descriptions, categories, capabilities
- **Router**: Task complexity analysis, agent selection, prompt enhancement
- **Evolution System**: PerformanceTracker, LearningManager, AdaptationEngine, EvolutionMonitor
- **RAG Agent**: Vector search, file indexing, **drop folder feature (FULLY IMPLEMENTED)**

**MCP Tools** (✅ Available):
- **mcp__MCP_DOCKER__* (Knowledge Graph)**: create_entities, add_observations, create_relations, search_nodes
- **mcp__memory__***: store_memory, retrieve_memory, recall_memory
- **mcp__filesystem__***: read, write, edit, search

### Hook-Based Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ SessionStart Hook (Automatic on Session Start)             │
│ - Load smart-orchestrator skill                            │
│ - Initialize Router + Evolution System                     │
│ - Load saved patterns from MCP Memory                      │
│ - Start background monitoring (quota, compliance)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Main Dialogue (User Request Processing)                    │
│ - Claude Code receives user request                        │
│ - Smart-orchestrator skill is already loaded               │
│ - Analyzes task complexity & dependencies                  │
│ - Decides: Sequential OR Parallel execution                │
│ - Recommends approach to user → Gets permission            │
│ - Executes using chosen approach                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PostToolUse Hook (Automatic after Each Tool)               │
│ - Track performance metrics (duration, tokens, cost)       │
│ - Detect anomalies (slow, expensive, low quality)          │
│ - Learn patterns (every 10 executions)                     │
│ - Persist to MCP Memory                                    │
│ - Compliance check (READ_BEFORE_EDIT, etc.)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Stop Hook (Automatic on Session End)                       │
│ - Save evolution state to MCP Memory                       │
│ - Generate session summary                                 │
│ - Clean up background processes                            │
└─────────────────────────────────────────────────────────────┘
```

**Key Point**: Hooks provide **automatic** triggering, Skill provides **intelligent** decision-making.

---

## 📋 Implementation Plan (What Needs to Be Done)

### Phase 1: Complete Smart-Orchestrator Skill ✅ Priority

**File**: `/Users/ktseng/Developer/Projects/smart-agents/.claude/skills/smart-orchestrator/skill.md`

**Status**: 80% complete, needs final updates

**Purpose**: Provides the CONTENT (logic, instructions) that hooks will use

**Remaining Work**:

1. **Add Dependency Analysis Section**
   - Decision tree: Dependencies → Sequential, Independent → Parallel, Mixed → Hybrid
   - Examples of each scenario
   - How to identify dependencies

2. **Add Recommendation Flow**
   - Format for presenting recommendation to user
   - Permission request template
   - User options: Yes / Override / Provide feedback

3. **Add Hybrid Execution Pattern**
   - Phase-based execution (parallel prep → sequential implementation)
   - Example: Research phase (parallel) → Implementation phase (sequential)

4. **Add Resource Constraint Checking**
   - CPU < 70%, Memory > 4GB before recommending parallel
   - Token budget division for parallel agents
   - E2E testing safety rules (NO multi-agent E2E tests)

5. **Update Examples**
   - Show BOTH sequential and parallel use cases
   - Real-world scenarios (authentication system, dashboard components, bug investigation)
   - When each approach is recommended

**Acceptance Criteria**:
- [ ] Dependency analysis logic complete
- [ ] Recommendation format defined
- [ ] Hybrid pattern documented
- [ ] Resource checks included
- [ ] Examples show both sequential and parallel
- [ ] No mention of "background execution" for Task tool

---

### Phase 2: Implement Hooks System ✅ Critical

**Purpose**: Provides the DELIVERY (automatic triggering) mechanism

**Files to Create**:

#### 2.1 SessionStart Hook (`~/.claude/hooks/session-start.js`)

**Purpose**: Initialize smart-agents system at session start

**Implementation**:
```javascript
#!/usr/bin/env node

// Purpose: Initialize Router + Evolution System at session start
// Runs: Automatically when Claude Code session starts
// Non-blocking: Main dialogue continues while this runs in background

const initializeSmartAgents = async () => {
  // 1. Load smart-orchestrator skill (ensure it's available)
  console.log('[Smart-Agents] Loading orchestration logic...');

  // 2. Initialize Router + Evolution System
  console.log('[Smart-Agents] Initializing Router and Evolution System...');

  // 3. Load saved patterns from MCP Memory
  console.log('[Smart-Agents] Loading learned patterns from previous sessions...');

  // 4. Start background monitoring (quota, compliance)
  console.log('[Smart-Agents] Starting background monitoring...');

  // 5. Ready indicator
  console.log('✅ [Smart-Agents] System initialized and ready');
};

initializeSmartAgents().catch(err => {
  console.error('❌ [Smart-Agents] Initialization failed:', err.message);
});
```

**Integration**:
- Add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "sessionStart": "~/.claude/hooks/session-start.js"
  }
}
```

#### 2.2 PostToolUse Hook (`~/.claude/hooks/post-tool-use.js`)

**Purpose**: Track performance and learn from each tool execution

**Implementation**:
```javascript
#!/usr/bin/env node

// Purpose: Track tool performance and learn patterns
// Runs: Automatically after EACH tool execution
// Input: stdin receives { toolName, arguments, result, duration, ... }

const trackToolPerformance = async (toolUseData) => {
  // 1. Parse tool use data from stdin
  const { toolName, duration, tokensUsed, success } = toolUseData;

  // 2. Track performance metrics
  // Call: mcp__MCP_DOCKER__add_observations to PerformanceTracker entity

  // 3. Detect anomalies (slow, expensive, low quality)
  if (duration > 10000) {
    console.warn(`⚠️  [Smart-Agents] Slow tool execution: ${toolName} (${duration}ms)`);
  }

  // 4. Learn patterns (every 10 executions)
  // Check execution count, trigger learning if threshold reached

  // 5. Compliance check (READ_BEFORE_EDIT, etc.)
  // Verify rules from CLAUDE.md are followed
};

// Read from stdin
let inputData = '';
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  const toolUseData = JSON.parse(inputData);
  trackToolPerformance(toolUseData).catch(err => {
    console.error('❌ [Smart-Agents] PostToolUse hook failed:', err.message);
  });
});
```

**Integration**:
- Add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "postToolUse": "~/.claude/hooks/post-tool-use.js"
  }
}
```

#### 2.3 Stop Hook (`~/.claude/hooks/stop.js`)

**Purpose**: Save state and cleanup on session end

**Implementation**:
```javascript
#!/usr/bin/env node

// Purpose: Save evolution state and generate session summary
// Runs: Automatically when Claude Code session ends

const saveSessionState = async () => {
  // 1. Save evolution state to MCP Memory
  console.log('[Smart-Agents] Saving evolution state...');

  // 2. Generate session summary
  console.log('[Smart-Agents] Generating session summary...');

  // 3. Clean up background processes
  console.log('[Smart-Agents] Cleaning up background processes...');

  // 4. Goodbye indicator
  console.log('✅ [Smart-Agents] Session state saved successfully');
};

saveSessionState().catch(err => {
  console.error('❌ [Smart-Agents] Stop hook failed:', err.message);
});
```

**Integration**:
- Add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "stop": "~/.claude/hooks/stop.js"
  }
}
```

**Acceptance Criteria**:
- [ ] SessionStart hook created and tested
- [ ] PostToolUse hook created and tested
- [ ] Stop hook created and tested
- [ ] Hooks configured in settings.json
- [ ] Hooks run non-blocking (main dialogue continues)
- [ ] Background monitoring works (quota, compliance)

---

### Phase 3: Activate RAG Drop Folder Feature ✅ Ready

**Status**: Feature is FULLY IMPLEMENTED, just needs activation and documentation

**What Already Exists**:
- ✅ `FileWatcher.ts` - Complete implementation
- ✅ `watch.ts` - Standalone startup script
- ✅ `RAG_DEPLOYMENT.md` - Full documentation
- ✅ Drop folder location: `~/Documents/smart-agents-knowledge/`
- ✅ Supported formats: .md, .txt, .json, .pdf, .docx
- ✅ Auto-indexing every 5 seconds
- ✅ NPM command: `npm run rag:watch`

**What Needs to Be Done**:

1. **Update README.md**
   - Add "Drop Folder for Knowledge Indexing" section
   - Document `npm run rag:watch` command
   - Show example workflow

2. **Update smart-orchestrator skill**
   - Include rag-agent in 22-agent registry description
   - Mention drop folder capability
   - When to use rag-agent (knowledge retrieval tasks)

3. **Test & Verify**
   - Start file watcher: `npm run rag:watch`
   - Drop test files into `~/Documents/smart-agents-knowledge/`
   - Verify auto-indexing works
   - Test search functionality

4. **Create Quick Start Guide** (Optional)
   - One-page guide for users
   - How to enable RAG features (OpenAI API key)
   - How to use drop folder
   - Example queries

**Acceptance Criteria**:
- [ ] README updated with drop folder section
- [ ] Skill mentions RAG capability
- [ ] File watcher tested and working
- [ ] Search functionality verified

---

### Phase 4: Update Documentation ✅ Important

**Files to Update**:

1. **README.md**
   - Update architecture section (hook-based system)
   - Add quick start examples (hooks + skill usage)
   - Add RAG drop folder usage
   - Explain automation benefits

2. **ARCHITECTURE.md** → `docs/architecture/OVERVIEW.md`
   - Update with hook-based approach
   - Document SessionStart, PostToolUse, Stop hooks
   - Show architecture diagram with hooks
   - Document verified Claude Code capabilities

3. **Create HOOKS_IMPLEMENTATION_GUIDE.md** (New)
   - Detailed hook implementation guide
   - Hook script examples
   - Configuration instructions
   - Troubleshooting

4. **Update EVOLUTION.md** (If exists)
   - Explain how hooks integrate with Evolution System
   - Document performance tracking workflow

**Acceptance Criteria**:
- [ ] README reflects hook-based approach
- [ ] OVERVIEW.md updated with hooks architecture
- [ ] HOOKS_IMPLEMENTATION_GUIDE.md created
- [ ] All documentation consistent

---

## 🎯 Success Criteria (How We Know It Works)

### Functional Success

1. **Automatic Initialization Works**
   - ✅ SessionStart hook runs on session start
   - ✅ Router + Evolution System initialized automatically
   - ✅ Smart-orchestrator skill loaded automatically
   - ✅ Main dialogue continues without blocking

2. **Smart Routing Works (Proactively)**
   - ✅ Claude Code automatically analyzes task complexity
   - ✅ Identifies dependencies without manual trigger
   - ✅ Recommends Sequential OR Parallel with reasoning
   - ✅ User approves or overrides
   - ✅ Executes using chosen approach

3. **Performance Tracking Works (Automatic)**
   - ✅ PostToolUse hook runs after each tool
   - ✅ Metrics tracked (duration, tokens, cost)
   - ✅ Anomalies detected (slow, expensive)
   - ✅ Patterns learned (every 10 executions)
   - ✅ Data persisted to MCP Memory

4. **Session Management Works**
   - ✅ Stop hook runs on session end
   - ✅ Evolution state saved to MCP Memory
   - ✅ Session summary generated
   - ✅ Background processes cleaned up

5. **RAG Drop Folder Works**
   - ✅ `npm run rag:watch` starts successfully
   - ✅ Files dropped into folder are auto-indexed
   - ✅ Search returns relevant results
   - ✅ 22 agents can use RAG for knowledge retrieval

### Non-Functional Success

1. **True Automation (自發地)**
   - ✅ No manual invocation required
   - ✅ Proactive agent deployment
   - ✅ User maintains control via permission requests
   - ✅ Transparent reasoning

2. **Performance**
   - ✅ Hooks run non-blocking
   - ✅ Main dialogue not interrupted
   - ✅ Background monitoring lightweight

3. **Reliability**
   - ✅ Hook failures don't break main dialogue
   - ✅ Evolution state persists across sessions
   - ✅ Graceful degradation if hooks unavailable

---

## 🚧 Implementation Notes

### Hooks vs Skill Clarification

**BOTH are needed for automation:**

| Component | Role | Automatic? |
|-----------|------|------------|
| **Hooks** | Delivery mechanism - ensure skill is loaded and used | ✅ YES |
| **Skill** | Content - provides intelligence and decision logic | ❌ NO (passive) |

**Together**: Hooks + Skill = Proactive automation (自發地)

### Background Monitoring

**What runs in background** (via SessionStart hook):
- Quota check (every 10 min) - warn at 80% budget
- Evolution dashboard (every 30 min) - log learning progress
- Compliance check (on tool use) - validate rules (READ_BEFORE_EDIT, etc.)

**Non-blocking**: Main dialogue continues normally

### User Permission Flow

**Automatic analysis + Manual approval**:
1. Hook ensures skill is loaded (automatic)
2. Skill analyzes task and recommends approach (automatic)
3. Present recommendation to user: "SmartAgents recommends deploying 3 agents in parallel. Permission to proceed?"
4. User decides: Yes / No / Override (manual)
5. Execute based on user decision (automatic)

**User always maintains control.**

---

## 📅 Timeline & Next Steps

### Immediate (This Session)

1. ✅ Complete smart-orchestrator skill (Phase 1 remaining items)
2. ✅ Implement hooks system (Phase 2)
3. ✅ Test RAG drop folder feature (Phase 3)

### Short Term (Next Session)

1. Update README.md and documentation (Phase 4)
2. Create HOOKS_IMPLEMENTATION_GUIDE.md
3. Test end-to-end automation workflow

### Ongoing

1. Monitor hook performance and reliability
2. Collect feedback and improve
3. Evolve skill and hooks based on learnings

---

## 🎓 Lessons Learned (First Principles Review)

### Critical Clarification

**Misunderstanding**: Initially thought skill-based approach could achieve proactive ("自發地") behavior

**Reality**:
- Skills are **reactive** (require manual invocation)
- To achieve **proactive** ("自發地") behavior, need automation mechanism
- Claude Code provides **hooks** as automation mechanism
- **Correct approach**: Hooks (delivery) + Skill (content) = Automation

### What We Learned

1. **Automation Requires Both**
   - Content alone (skill) = not automatic
   - Delivery alone (hooks) = no intelligence
   - Both together = proactive automation

2. **Verify User Goals**
   - Don't assume simplified requirements
   - Ask clarifying questions
   - Confirm interpretation before major pivots

3. **Feature Verification Still Critical**
   - Verified: Task tool capabilities (parallel, sequential, no background)
   - Verified: Hooks are real Claude Code features
   - Verified: RAG drop folder fully implemented

### Key Principles Going Forward

1. **Verify Before Recommend** - No assumptions about features
2. **Understand True Requirements** - Ask when unclear
3. **Working Solutions Only** - Test and verify, not speculate
4. **User-Driven** - Recommend, get permission, execute
5. **First Principles** - Question all assumptions, focus on actual requirements

---

## 📚 References

### Implementation Files

- **Skill**: `/Users/ktseng/Developer/Projects/smart-agents/.claude/skills/smart-orchestrator/skill.md`
- **Hooks**: `~/.claude/hooks/session-start.js`, `post-tool-use.js`, `stop.js`
- **RAG Watcher**: `src/agents/rag/watch.ts`
- **RAG Agent**: `src/agents/rag/index.ts`
- **File Watcher**: `src/agents/rag/FileWatcher.ts`

### Documentation

- **RAG Deployment Guide**: `docs/guides/RAG_DEPLOYMENT.md`
- **Architecture Overview**: `docs/architecture/OVERVIEW.md`
- **Hooks Implementation Guide**: `docs/guides/HOOKS_IMPLEMENTATION_GUIDE.md` (to be created)
- **README**: `README.md`

### Knowledge Graph

- Smart-Agents Core Philosophy 2025-12-29
- Smart-Agents Automation Requirement Clarification 2025-12-29
- Claude Code Task Tool Capabilities
- RAG Drop Folder Feature Discovery

---

**Status**: ✅ Ready for implementation with hook-based automation approach
**Next Action**: Complete Phase 1 (smart-orchestrator skill updates), then Phase 2 (implement hooks)
