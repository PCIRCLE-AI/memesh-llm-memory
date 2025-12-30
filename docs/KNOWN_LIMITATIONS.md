# Known Limitations

**Version**: 2.2.0
**Last Updated**: 2025-12-31

This document transparently documents known limitations, incomplete features, and areas for improvement in Smart Agents v2.2.0.

---

## Agent Implementation Status

### Real vs. Prompt Distinction

**Clarification**: Not all 23 agents have full TypeScript implementations.

- **5 Real Implementations**: DevelopmentButler, TestWriter, DevOpsEngineer, KnowledgeGraph, RAGAgent
- **17 Enhanced Prompts**: Optimize Claude Code's responses with domain-specific expertise but lack standalone execution logic
- **1 Optional Feature**: RAGAgent requires OpenAI API key

**Implication**: Enhanced prompt agents rely on Claude Code's underlying intelligence. They add structured expertise but are not independent services.

---

## Infrastructure Limitations

### 1. AgentRegistry Aspirational Entries

**Issue**: AgentRegistry lists agents without implementations.

**Examples**:
- `project-manager`: Registered but no `ProjectManager.ts` implementation exists
- `data-engineer`: Registered but no `DataEngineer.ts` implementation exists

**Impact**: Routing may select agents that fall back to prompt templates instead of real implementations.

**Status**: Intentional design - allows future implementation without breaking routing.

---

### 2. Knowledge Graph Persistence

**Issue**: KnowledgeGraph stores data in-memory only.

**Location**: `src/agents/knowledge/index.ts:44` has `// TODO: Load from persistent storage`

**Impact**:
- All knowledge lost on MCP server restart
- Learning doesn't persist across sessions
- No long-term memory accumulation

**Workaround**: None currently

**Roadmap**: Planned for Phase 4 technical debt cleanup

---

### 3. Event-Driven Butler Implementation

**Issue**: DevelopmentButler is partially complete.

**What Works**:
- Basic checkpoint detection (5 hardcoded phases)
- Workflow integration structure

**What's Missing**:
- Real Claude Code hook integration (placeholder code exists)
- Automatic guidance triggering
- Learning from user corrections
- Dynamic phase detection

**Impact**: Butler requires manual tool calls instead of automatic workflow guidance.

**Status**: Core functionality present but automation incomplete.

---

## Code Quality Issues

### 1. Excessive Console Logging

**Issue**: Production code has 311 `console.log()` calls vs only 118 proper error handling with `throw`.

**Impact**:
- Errors silently logged instead of properly handled
- Difficult to distinguish between info and errors in production
- No structured logging for debugging

**Example**: Many agents use `console.warn()` for stub methods instead of throwing errors

**Roadmap**: Planned for Phase 4 - Replace with structured logger (Winston/Pino)

---

### 2. SQLiteStore Duplication

**Issue**: Three SQLiteStore implementations exist:
- `SQLiteStore.ts`
- `SQLiteStore.basic.ts`
- `SQLiteStore.enhanced.ts`

**Impact**:
- Architectural indecision
- Maintenance burden (fixing bugs in 3 places)
- Confusion about which to use

**Status**: All three functional, but need consolidation

**Roadmap**: Phase 4 cleanup

---

### 3. TODO/FIXME Comments

**Issue**: 13 TODO/FIXME comments in codebase indicating incomplete work.

**Critical TODOs**:
- KnowledgeGraph persistence (mentioned above)
- Some error handling gaps
- Performance optimization notes

**Impact**: Reminders of unfinished features

---

## Test Coverage Limitations

### 1. Shallow Test Quality

**Issue**: Many tests check string contains instead of actual behavior.

**Example**:
```typescript
// Shallow test
expect(result).toContain('should');

// Better test
expect(result.testCases).toHaveLength(3);
expect(result.testCases[0].case).toBe('edge-case-zero');
```

**Impact**: Tests may pass but not catch real bugs.

**Stats**:
- 572 tests passing
- But many are integration tests checking presence, not correctness

**Roadmap**: Phase 3 test quality improvements

---

###  2. Missing Error Scenario Tests

**Issue**: Most agents lack tests for error conditions.

**Missing Coverage**:
- DevOpsEngineerAgent: No tests for test/build command failures
- TestWriterAgent: No tests for invalid source code
- KnowledgeGraph: No tests for corrupted data
- RAGAgent: No tests for embedding failures

**Impact**: Error handling may be broken in production without detection.

**Roadmap**: Phase 3 - Add 200+ error scenario tests

---

### 3. Unrealistic Resource Limits

**Issue**: Test configuration uses 32GB memory limit.

**Location**: `vitest.config.ts`

**Problem**: Most production machines have 8-16GB, so tests don't catch real resource constraints.

**Impact**: Code that passes tests may fail in realistic production environments.

**Roadmap**: Phase 3 - Adjust to realistic limits (8GB RAM, 70% CPU)

---

## Documentation Gaps

### 1. Recently Corrected: Agent Count

**Was**: Claimed "20 agents"
**Actually**: 23 agents registered
**Now**: Corrected in README, AGENT_REFERENCE, CHANGELOG ✅

**What Was Missing**: 5 agents not listed in README (Frontend/Backend/Database/Performance/TestAutomator)

**Status**: FIXED in Phase 2 (this update)

---

### 2. Production Readiness Claims

**Issue**: README claims "Production Ready" and "Quality score 4.2/5"

**Reality**:
- Phase 1 critical fixes just completed (as of Dec 31, 2025)
- Many limitations documented in this file
- Extensive test quality improvements needed
- Technical debt still present

**Assessment**: More accurately "Beta Quality" until Phase 2-4 complete

**Action**: Will downgrade claims in next update

---

## External Dependencies

### 1. RAG Agent Requires OpenAI

**Issue**: RAGAgent marked "optional" but requires external API key.

**Impact**:
- Users without OpenAI API key cannot use semantic search
- Cost implications not always clear upfront

**Workaround**: System works without RAG agent, just no vector search capability.

**Alternative**: HuggingFace embeddings documented but not primary recommendation.

---

## Performance Considerations

### 1. Evolution Database Size

**Issue**: Evolution system tracks all agent interactions in SQLite database (`~/.claude/evolution.db`)

**Growth**: Database grows unbounded over time.

**Impact**:
- Slow queries as data accumulates
- Disk space usage grows indefinitely

**Mitigation**: Automatic cleanup of old entries (configurable), but manual pruning may be needed for heavy usage.

---

### 2. Memory Usage of In-Memory Knowledge Graph

**Issue**: KnowledgeGraph stores all entities in-memory.

**Impact**: Large knowledge bases may consume significant RAM.

**Current Limit**: None enforced

**Workaround**: Restart MCP server to clear memory if issues occur.

---

## Summary

### What Works Well ✅

- Core agent routing and task analysis
- Real implementations (5 agents) function as documented
- Evolution system tracks performance accurately
- MCP integration with Claude Code
- Test Writer and DevOps agents (after Phase 1 fixes)

### What Needs Improvement ⚠️

- Test quality (many shallow tests)
- Error scenario coverage
- Code quality (logging, duplication)
- Knowledge Graph persistence
- Event-driven automation
- Documentation accuracy (being addressed)

### Critical Gaps 🔴

- None after Phase 1 critical fixes
- All production blockers resolved

---

## Reporting Issues

If you encounter limitations not documented here:

1. **GitHub Issues**: [Report new issues](https://github.com/kevintseng/smart-agents/issues)
2. **Provide Context**: Include version, use case, error messages
3. **Expected vs. Actual**: Describe what you expected vs what happened

---

## Roadmap

**Phase 2 (Documentation Honesty)**: ✅ IN PROGRESS
- Agent count corrected ✅
- This KNOWN_LIMITATIONS.md created ✅
- Production readiness claims to be downgraded

**Phase 3 (Test Quality)**: Planned
- 200+ error scenario tests
- Realistic resource limits
- Integration tests for real workflows

**Phase 4 (Technical Debt)**: Planned
- Structured logger (replace console.log)
- Consolidate SQLiteStore
- Knowledge Graph persistence
- Complete TODO items

**Phase 5 (Event-Driven Automation)**: Planned
- Real hook integration
- Automatic checkpoint detection
- Learning from corrections

---

**Last Updated**: 2025-12-31 by automated documentation review
