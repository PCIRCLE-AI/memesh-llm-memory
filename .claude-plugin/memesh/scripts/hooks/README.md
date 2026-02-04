# MeMesh Hooks for Claude Code

**What are these?** Small scripts that run automatically when you use Claude Code. They help MeMesh remember what you did.

## What They Do

| When | What Happens |
|------|--------------|
| **You open Claude Code** | Shows what you did in your last session |
| **You use tools** | Quietly tracks your work |
| **You close Claude Code** | Saves a summary for next time |

## Installation

```bash
# Copy hooks to Claude Code
cp scripts/hooks/*.js ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.js
```

**Done!** Restart Claude Code to activate.

---

## Auto-Memory (The Main Feature)

### How It Works

```
Open Claude Code     →     Work normally     →     Close Claude Code
      ↓                         ↓                        ↓
See last session         MeMesh watches           Saves summary
   summary               (you won't notice)        for next time
```

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

---

## A2A (Multi-Agent Feature)

**What is it?** Run multiple Claude Code windows that can talk to each other.

### How It Works

1. Open first Claude Code → Gets name "Alpha"
2. Open second Claude Code → Gets name "Beta"
3. Alpha can send tasks to Beta and vice versa

### What You'll See

```
🤖 MeMesh A2A Collaboration

  You are: Alpha
  Other agents online: Beta, Gamma

  Commands:
    a2a-send-task    - Send work to another agent
    a2a-list-tasks   - See your tasks
```

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
# Check if database exists
ls ~/.claude-code-buddy/knowledge-graph.db
```

### "A2A not connecting"

```bash
# Reset agent identity
rm ~/.claude/state/agent-identity.json
```

---

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
├── session-start.js    ← Runs when you open Claude Code
├── post-tool-use.js    ← Runs after each tool (quietly)
├── stop.js             ← Runs when you close Claude Code
├── a2a-collaboration-hook.js  ← Multi-agent stuff
└── hook-utils.js       ← Shared helper code
```

---

## For Developers

### Test hooks work

```bash
node --check ~/.claude/hooks/session-start.js
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
