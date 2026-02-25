# MeMesh Hooks for Claude Code

**What are these?** Scripts that run automatically when you use Claude Code. They provide memory management, smart routing, code quality enforcement, and planning assistance.

## What They Do

| When | What Happens |
|------|--------------|
| **You open Claude Code** | Reloads CLAUDE.md, shows last session recap (cache-first) |
| **Before a tool runs** | Smart routing, planning template injection, dry-run gate, code review reminder |
| **After a tool runs** | Tracks work patterns, file modifications, test executions |
| **You make a git commit** | Saves commit context to knowledge graph (batched) |
| **A subagent finishes** | Saves code review results, tracks completion |
| **You close Claude Code** | Saves session summary + cache for fast next startup |

## Installation

```bash
# Copy hooks to Claude Code
cp scripts/hooks/*.js ~/.claude/hooks/
cp -r scripts/hooks/templates/ ~/.claude/hooks/templates/
chmod +x ~/.claude/hooks/*.js
```

**Done!** Restart Claude Code to activate.

---

## Features

### Smart Router (PreToolUse)

Routes subagent tasks to optimal models and controls background execution.

```
Task(Explore) → model: haiku (fast search)
Task(Plan)    → inject SDD+BDD planning template
Task(heavy)   → check for untested code, warn if found
```

Configuration: `~/.memesh/routing-config.json`

```json
{
  "modelRouting": {
    "rules": [
      { "subagentType": "Explore", "model": "haiku", "reason": "Fast search" }
    ]
  },
  "backgroundRules": [
    { "subagentType": "Explore", "forceBackground": false }
  ],
  "planningEnforcement": { "enabled": true },
  "dryRunGate": { "enabled": true },
  "auditLog": true
}
```

Audit log: `~/.memesh/routing-audit.log`

### Planning Enforcement

When a Plan subagent is dispatched, the hook injects a template requiring:
- System Design Description (SDD)
- Behavior-Driven Design (BDD) with Gherkin scenarios
- Edge case handling table
- Dry-run test plan
- Risk assessment

The plan is always presented to the user for approval before implementation.

### Dry-Run Gate

Tracks which files were modified (Write/Edit) and which were tested
(vitest/jest/tsc/node --check). Before heavy Task dispatches, warns if
modified files haven't been tested yet.

**Advisory only** — never blocks, just informs.

### Pre-Commit Code Review

```
git commit detected → Code review done? → Yes → Allow
                                        → No  → Inject reminder
```

### Auto-Memory (Batched)

```
Open Claude Code  →  Work normally  →  Git commit  →  Close Claude Code
      ↓                    ↓                ↓                 ↓
Cache-first recall   Track patterns   Batch save to KG   Cache + archive
(0 SQLite spawns)   (async writes)   (2 spawns vs 8)
```

### What Gets Tracked

| Symbol | Meaning |
|--------|---------|
| 📁 | Files you changed |
| ✅ | Git commits you made |
| 💡 | Things you learned |
| ⚠️ | Problems you ran into |
| 🎯 | Decisions you made |
| 🔍 | Code review findings |

---

## Troubleshooting

### "Hooks not working"

```bash
ls ~/.claude/hooks/
cp scripts/hooks/*.js ~/.claude/hooks/
```

### "No memory showing"

```bash
ls ~/.memesh/knowledge-graph.db
```

### "Routing not applying"

```bash
# Check config
cat ~/.memesh/routing-config.json

# Check audit log
tail -20 ~/.memesh/routing-audit.log
```

## Limitations

| What | Details |
|------|---------|
| **Claude Code only** | Doesn't work in Cursor |
| **30-day memory** | Old session memories auto-deleted |
| **Local only** | No sync between computers |
| **Advisory gates** | Dry-run and review are reminders, not blockers |

---

## Files

```
scripts/hooks/
├── session-start.js    ← SessionStart: reload CLAUDE.md, cache-first recall
├── pre-tool-use.js     ← PreToolUse: handler registry (4 handlers)
│   ├── codeReviewHandler  — git commit review enforcement
│   ├── routingHandler     — model/background selection
│   ├── planningHandler    — SDD+BDD template injection
│   └── dryRunGateHandler  — untested code warning
├── post-tool-use.js    ← PostToolUse: patterns, file/test tracking, async writes
├── post-commit.js      ← PostToolUse: batch save commit to KG
├── subagent-stop.js    ← SubagentStop: capture code review results
├── stop.js             ← Stop: batch save, cache, archive, cleanup
├── hook-utils.js       ← Shared: sqliteBatch, async I/O, constants
├── templates/
│   └── planning-template.md  ← SDD+BDD+edge case template
└── __tests__/
    ├── hook-test-harness.js  ← Test runner (no Claude Code needed)
    └── hooks.test.js         ← 15 test cases
```

### Handler Flow (PreToolUse)

```
PreToolUse event
  ↓
┌──────────────────────┐
│   Handler Registry    │
│   ├─ codeReview      │ → additionalContext (review reminder)
│   ├─ routing         │ → updatedInput (model, background)
│   ├─ planning        │ → updatedInput.prompt (template)
│   └─ dryRunGate      │ → additionalContext (untested warning)
└──────────────────────┘
  ↓
┌──────────────────────┐
│   Response Merger     │
│   • updatedInput: deep-merge
│   • additionalContext: concatenate
│   • permissionDecision: most-restrictive
└──────────────────────┘
  ↓
Single JSON → Claude Code
```

---

## Testing

```bash
# Run all 15 tests
node scripts/hooks/__tests__/hooks.test.js

# Test individual hook with mock input
node scripts/hooks/__tests__/hook-test-harness.js pre-tool-use.js \
  '{"tool_name":"Task","tool_input":{"subagent_type":"Plan","prompt":"test"}}'

# Syntax check all hooks
for f in scripts/hooks/*.js; do node --check "$f" && echo "OK: $f"; done
```

## Configuration

### Routing Config (`~/.memesh/routing-config.json`)

| Field | Description |
|-------|-------------|
| `modelRouting.rules` | Subagent → model mapping |
| `backgroundRules` | Subagent → force background |
| `planningEnforcement.enabled` | Inject SDD+BDD template |
| `dryRunGate.enabled` | Warn on untested code |
| `auditLog` | Log routing decisions |

### Thresholds (`hook-utils.js`)

```javascript
THRESHOLDS = {
  TOKEN_SAVE: 250_000,
  RETENTION_DAYS: 30,
  MAX_ARCHIVED_SESSIONS: 30
}
```

---

Part of MeMesh project. License: MIT.
