# MeMesh Hooks for Claude Code

**What are these?** Small scripts that run automatically when you use Claude Code. They help MeMesh remember what you did and enforce code quality.

## What They Do

| When | What Happens |
|------|--------------|
| **You open Claude Code** | Reloads CLAUDE.md, shows last session recap |
| **Before a tool runs** | Pre-commit: reminds to run code review |
| **After a tool runs** | Quietly tracks your work, detects patterns |
| **You make a git commit** | Saves commit context to knowledge graph |
| **A subagent finishes** | Saves code review results, tracks completion |
| **You close Claude Code** | Saves a summary for next time |

## Installation

```bash
# Copy hooks to Claude Code
cp scripts/hooks/*.js ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.js
```

**Done!** Restart Claude Code to activate.

---

## Features

### Auto-Memory

```
Open Claude Code  →  Work normally  →  Git commit  →  Close Claude Code
      ↓                    ↓                ↓                 ↓
Reload CLAUDE.md     MeMesh watches    Save commit      Save session
+ recall memory     (you won't notice)  to KG            summary
```

### Pre-Commit Code Review Enforcement

```
git commit detected → Code review done? → Yes → Allow commit
                                        → No  → Inject reminder to run
                                                @comprehensive-code-review
```

The pre-commit hook tracks whether code review was invoked during the session
(via Skill tool, Task tool, or code-reviewer subagent). If no review was done,
it adds context reminding Claude to run the comprehensive code review first.

### Subagent Tracking

When code reviewer subagents finish, their findings are saved to the MeMesh
knowledge graph for future reference. This builds a history of code review
insights across sessions.

### What You'll See on Startup

```
🧠 MeMesh Memory Recall

  🕐 Last session: 2 hours ago
  ⏱️  Duration: 45 minutes
  🛠️  Tools used: 127

  📋 Key Points:
    📁 5 files changed in src/auth/
    ✅ 3 commits made
    💡 Added JWT refresh tokens
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
# Check if hooks exist
ls ~/.claude/hooks/

# Re-copy them
cp scripts/hooks/*.js ~/.claude/hooks/
```

### "No memory showing"

```bash
# Check if database exists (primary path, falls back to ~/.claude-code-buddy/)
ls ~/.memesh/knowledge-graph.db
```

### "Pre-commit review not triggering"

The pre-commit hook only fires for `git commit` commands (not `--amend`).
Make sure `pre-tool-use.js` is in `~/.claude/hooks/` and the hook is
registered for the `PreToolUse` event in settings.

## Limitations

| What | Details |
|------|---------|
| **Claude Code only** | Doesn't work in Cursor |
| **30-day memory** | Old session memories auto-deleted |
| **Local only** | No sync between computers |

---

## Files Explained

```
~/.claude/hooks/
├── session-start.js    ← SessionStart: reload CLAUDE.md, recall memory
├── pre-tool-use.js     ← PreToolUse: pre-commit code review enforcement
├── post-tool-use.js    ← PostToolUse: track work patterns, detect anomalies
├── post-commit.js      ← PostToolUse: save commit context to KG
├── subagent-stop.js    ← SubagentStop: capture code review results
├── stop.js             ← Stop: save session summary, archive, cleanup
└── hook-utils.js       ← Shared helper code (SQLite, file I/O, etc.)
```

### Hook Event Flow

```
SessionStart ──→ PreToolUse ──→ [Tool Executes] ──→ PostToolUse
                                                          ↓
                                                   (git commit?)
                                                          ↓
                                                   PostCommit hook
                                                   saves to KG

Task(subagent) ──→ [Subagent works] ──→ SubagentStop
                                              ↓
                                        (code reviewer?)
                                              ↓
                                        Save to KG +
                                        mark review done

Session ends ──→ Stop ──→ Save summary ──→ Archive ──→ Cleanup
```

---

## For Developers

### Test hooks work

```bash
# Syntax check all hooks
for f in ~/.claude/hooks/*.js; do node --check "$f" && echo "OK: $f"; done
```

### Change settings

Edit `hook-utils.js`:

```javascript
THRESHOLDS = {
  TOKEN_SAVE: 250_000,      // When to auto-save (tokens)
  RETENTION_DAYS: 30,       // How long to keep session memories
  MAX_ARCHIVED_SESSIONS: 30 // How many old sessions to keep
}
```

---

Part of MeMesh project. License: AGPL-3.0.
