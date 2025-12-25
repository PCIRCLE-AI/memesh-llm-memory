# Skills Audit and Consolidation Plan - 2025-12-25

## Current Skills Inventory

### ✅ KEEP - High Quality, Unique Value

#### 1. **claude-d3js-skill** 🎨
- **Purpose**: D3.js visualization creation
- **Quality**: High - specialized domain knowledge
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Excellent for custom data visualizations

#### 2. **frontend-design** 🎨
- **Purpose**: Create production-grade frontend interfaces
- **Quality**: High - opinionated design system
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Helps avoid generic AI aesthetics

#### 3. **mcp-builder** 🔧
- **Purpose**: Guide for creating MCP servers
- **Quality**: High - specialized workflow
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Essential for MCP development

#### 4. **skill-creator** 📝
- **Purpose**: Guide for creating new skills
- **Quality**: High - meta-skill
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Self-referential, helps create more skills

#### 5. **ios-simulator-skill** 📱
- **Purpose**: iOS app testing and building automation
- **Quality**: High - 21 production scripts
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Valuable for iOS development

#### 6. **web-asset-generator** 🖼️
- **Purpose**: Generate favicons, app icons, social media images
- **Quality**: High - practical utility
- **Unique**: Yes - no duplicate
- **Status**: ✅ KEEP
- **Note**: Common need, well-executed

---

### ⚠️ REVIEW - Potential Duplicates or Issues

#### 7. **advanced-rag** (NEW)
- **Purpose**: RAG with ChromaDB, adaptive strategies
- **Quality**: Medium - simple wrapper around smart-agents
- **Unique**: **NO** - duplicates smart-agents RAG functionality
- **Issues**:
  - Not standalone (requires smart-agents project)
  - Hardcoded paths
  - 781 lines of unused "advanced" code
  - Just calls `npm run rag:demo`
- **Status**: ⚠️ **CONSOLIDATE or DELETE**
- **Recommendation**:
  - **Option A**: Delete (use smart-agents directly)
  - **Option B**: Make it a real wrapper with proper integration

#### 8. **voice-intelligence** (NEW)
- **Purpose**: Voice transcription and TTS
- **Quality**: Medium - simple wrapper around smart-agents
- **Unique**: **NO** - duplicates smart-agents voice functionality
- **Issues**:
  - Not standalone (requires smart-agents project)
  - Hardcoded paths
  - Just calls `npm run voice-rag` or `npm run voice`
- **Status**: ⚠️ **CONSOLIDATE or DELETE**
- **Recommendation**:
  - **Option A**: Delete (use smart-agents directly)
  - **Option B**: Make it a real wrapper with proper integration

#### 9. **agent-orchestration**
- **Purpose**: Task routing to different models (Opus/Sonnet/Haiku/Ollama)
- **Quality**: Unknown - need to verify implementation
- **Unique**: **MAYBE** - similar to smart-agents orchestrator
- **Issues**:
  - Might duplicate smart-agents orchestrator
  - Need to check if it adds unique value
- **Status**: ⚠️ **INVESTIGATE**
- **Recommendation**:
  - If it's just documentation → DELETE
  - If it has working code → Compare with smart-agents orchestrator
  - If unique → KEEP
  - If duplicate → DELETE

---

### ❌ DELETE - Not Skills

#### 10. **dgx-servers-knowledge.md**
- **Type**: Markdown file (not a skill)
- **Status**: ❌ **DELETE or MOVE**
- **Recommendation**: Move to `~/.claude/memory/` or `~/Documents/` if needed

#### 11. **INTEGRATION_GUIDE.md**
- **Type**: Markdown file (not a skill)
- **Status**: ❌ **DELETE or MOVE**
- **Recommendation**: Move to `~/.claude/docs/` or delete if obsolete

---

## Consolidation Plan

### Phase 1: Remove Non-Skills (Immediate)
```bash
# Move markdown files to appropriate location
mv ~/.claude/skills/dgx-servers-knowledge.md ~/.claude/memory/
mv ~/.claude/skills/INTEGRATION_GUIDE.md ~/.claude/docs/
```

### Phase 2: Investigate agent-orchestration
1. **Test if it works**
   ```bash
   cd ~/.claude/skills/agent-orchestration
   npm install
   npm test
   ```

2. **Compare with smart-agents orchestrator**
   - Does it route to same models?
   - Does it add unique functionality?
   - Is it maintained/documented?

3. **Decision**:
   - If duplicate → DELETE
   - If unique → KEEP and document differences

### Phase 3: Decision on NEW Skills (advanced-rag, voice-intelligence)

**Option A: Delete Both (RECOMMENDED)**
- **Reason**: They're just wrappers with no added value
- **Impact**: Users can call smart-agents directly
- **Benefit**: Cleaner skill directory, less confusion

**Option B: Keep and Improve**
- **Reason**: Convenient wrappers for Claude Code
- **Requirements**:
  - Remove hardcoded paths
  - Actually implement advanced features (not just call demos)
  - Add proper CLI argument passing
  - Make standalone or document dependency clearly

**Option C: Merge into smart-agents**
- **Reason**: Keep functionality in one place
- **Impact**: Add skill.md files to smart-agents project
- **Benefit**: Single source of truth

---

## Recommended Final Inventory

### Tier 1: Production Ready (KEEP)
1. ✅ claude-d3js-skill
2. ✅ frontend-design
3. ✅ mcp-builder
4. ✅ skill-creator
5. ✅ ios-simulator-skill
6. ✅ web-asset-generator

**Total**: 6 skills

### Tier 2: Under Review
7. ⚠️ agent-orchestration (pending investigation)

### Tier 3: Delete or Consolidate
8. ❌ advanced-rag (delete or rewrite properly)
9. ❌ voice-intelligence (delete or rewrite properly)
10. ❌ dgx-servers-knowledge.md (move to memory)
11. ❌ INTEGRATION_GUIDE.md (move to docs)

---

## Quality Criteria for Skills

A skill should be KEPT if it meets ALL of these:

1. ✅ **Unique Value**: Doesn't duplicate existing functionality
2. ✅ **Standalone**: Works independently or has clear dependencies
3. ✅ **Documented**: Has clear skill.md or README
4. ✅ **Tested**: Verified to work
5. ✅ **Maintained**: Not obsolete or broken

### Application to Current Skills

| Skill | Unique | Standalone | Documented | Tested | Maintained | KEEP? |
|-------|--------|------------|------------|--------|------------|-------|
| claude-d3js-skill | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| frontend-design | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| mcp-builder | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| skill-creator | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| ios-simulator | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| web-asset-gen | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| agent-orch | ? | ? | ✅ | ❌ | ? | ⚠️ |
| advanced-rag | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| voice-intel | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Immediate Actions Required

### 1. Move Non-Skills
```bash
mkdir -p ~/.claude/memory ~/.claude/docs
mv ~/.claude/skills/dgx-servers-knowledge.md ~/.claude/memory/
mv ~/.claude/skills/INTEGRATION_GUIDE.md ~/.claude/docs/
```

### 2. Test agent-orchestration
```bash
cd ~/.claude/skills/agent-orchestration
npm install
# Check if it has working code or just documentation
ls -la dist/
# Try to run it
node dist/index.js
```

### 3. Decision Point: advanced-rag & voice-intelligence

**RECOMMENDED**: Delete both
```bash
rm -rf ~/.claude/skills/advanced-rag
rm -rf ~/.claude/skills/voice-intelligence
```

**Why**:
- They add no unique value
- Just wrappers around smart-agents
- Hardcoded paths make them non-portable
- "Advanced" features are unused code
- Confusing to maintain two versions

**Alternative**: Use smart-agents directly
```bash
cd ~/Developer/Projects/smart-agents
npm run rag:demo
npm run voice-rag
```

---

## Expected Final State

### Skills Directory Structure
```
~/.claude/skills/
├── claude-d3js-skill/          ✅ KEEP
├── frontend-design/            ✅ KEEP
├── mcp-builder/                ✅ KEEP
├── skill-creator/              ✅ KEEP
├── ios-simulator-skill/        ✅ KEEP
├── web-asset-generator/        ✅ KEEP
└── agent-orchestration/        ⚠️ PENDING (test first)
```

### Moved Files
```
~/.claude/memory/
└── dgx-servers-knowledge.md

~/.claude/docs/
└── INTEGRATION_GUIDE.md
```

### Deleted
```
advanced-rag/          ❌ DELETED (duplicate)
voice-intelligence/    ❌ DELETED (duplicate)
```

---

## Benefits of Consolidation

### Before
- 11 items in skills directory
- 2 are not skills (markdown files)
- 2 are duplicates (advanced-rag, voice-intelligence)
- 1 is unverified (agent-orchestration)
- **Total confusion**: Which to use? What works?

### After
- 6-7 high-quality, unique skills
- All documented and tested
- No duplicates
- Clear purpose for each
- **Result**: Clean, maintainable, understandable

---

## User Decision Points

Please decide:

1. **agent-orchestration**: Should I test it first or delete it?
   - [ ] Test and evaluate
   - [ ] Delete immediately (assume duplicate)

2. **advanced-rag & voice-intelligence**:
   - [ ] Delete both (recommended - they're just wrappers)
   - [ ] Keep and improve (requires significant work)
   - [ ] Move to smart-agents project as skill.md files

3. **Markdown files**:
   - [ ] Move to ~/.claude/memory/ and ~/.claude/docs/
   - [ ] Delete if obsolete

---

**Recommendation**: Delete advanced-rag, voice-intelligence, and both markdown files. Test agent-orchestration and delete if duplicate. Final result: 6 high-quality skills.
