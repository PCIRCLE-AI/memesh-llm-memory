# Migration Guide: smart-agents → Claude Code Buddy (CCB)

## Overview

This guide helps you migrate from **smart-agents** to **Claude Code Buddy (CCB)** v2.0.

**Good News:** This is a **non-breaking rebrand** - all your existing data, commands, and workflows continue to work.

## What Changed

### Name & Branding
- **Old Name:** smart-agents
- **New Name:** Claude Code Buddy (CCB)
- **Package Name:** `claude-code-buddy` (npm/GitHub)
- **MCP Server Name:** `ccb` (in config.json)

### User Experience Improvements
- ✨ New friendly, memorable command names
- ✨ Auto-installation script for effortless setup
- ✨ No API keys required (uses your Claude Code subscription)
- ✨ Improved documentation and error messages

## Migration Steps

### Option 1: Fresh Install (Recommended)

**For Claude Code users:**

```bash
# 1. Clone the rebranded repository
git clone https://github.com/yourusername/claude-code-buddy.git
cd claude-code-buddy

# 2. Run auto-installation
./scripts/install.sh

# 3. Restart Claude Code
```

The installer will:
- ✓ Check prerequisites
- ✓ Install dependencies
- ✓ Build the project
- ✓ Auto-configure MCP integration
- ✓ Verify installation

### Option 2: Update Existing Installation

**If you want to keep your existing setup:**

```bash
# 1. Navigate to your smart-agents directory
cd /path/to/smart-agents

# 2. Pull latest changes
git pull origin main

# 3. Reinstall dependencies
npm install

# 4. Rebuild
npm run build

# 5. Update MCP config (manually or via script)
```

Then edit `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "ccb": {  // Changed from "smart-agents"
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Backward Compatibility

### Commands (v2.0 - v2.5)

**All old commands continue to work** with a friendly deprecation warning.

| Old Command (smart-agents) | New Command (CCB) | Status |
|---------------------------|-------------------|---------|
| `smart-agents-route` | `ccb-route` | Both work ✅ |
| `smart-agents-enhance` | `ccb-enhance` | Both work ✅ |
| `smart-agents-memory` | `ccb-memory` | Both work ✅ |
| `smart-agents-analyze` | `ccb-analyze` | Both work ✅ |

**Example deprecation warning:**
```
⚠️ Warning: 'smart-agents-route' is deprecated. Please use 'ccb-route' instead.
   Old commands will be removed in v3.0 (EOL: June 2026)
```

### Data & Configuration

**Your data stays in place:**

- ✓ `~/.smart-agents/` directory continues to work
- ✓ All embeddings, memories, and cache preserved
- ✓ Environment variables unchanged (`.env`)
- ✓ MCP configuration compatible

**Optional data migration:**

If you want to rename your data directory for consistency:

```bash
# Optional: Rename data directory
mv ~/.smart-agents ~/.claude-code-buddy

# Then update .env (if you use custom DATA_DIR)
# DATA_DIR=~/.claude-code-buddy
```

## Breaking Changes

### v2.0 (Current Release)

**None!** This is a non-breaking rebrand.

All existing functionality, APIs, and data formats remain compatible.

### Future Releases

**v2.5 (Planned: March 2026)**
- Old command names will show stronger deprecation warnings
- New features will only use new command names

**v3.0 (Planned: June 2026)**
- Old command names will be removed (breaking change)
- Automatic data migration to new directory structure
- Updated configuration format

## Command Reference

### Quick Command Mapping

```bash
# Routing & Analysis
smart-agents-route → ccb-route
smart-agents-analyze → ccb-analyze

# Prompt Enhancement
smart-agents-enhance → ccb-enhance
smart-agents-optimize → ccb-optimize

# Memory & Context
smart-agents-memory → ccb-memory
smart-agents-recall → ccb-recall

# Debugging & Tools
smart-agents-debug → ccb-debug
smart-agents-explain → ccb-explain
```

### Using New Commands

The new commands are **friendlier and more memorable**:

```bash
# Instead of: smart-agents-route "complex query"
ccb route "complex query"

# Instead of: smart-agents-enhance "basic prompt"
ccb enhance "basic prompt"

# Instead of: smart-agents-memory store "important fact"
ccb memory store "important fact"
```

## Troubleshooting

### Issue: "MCP server 'smart-agents' not found"

**Solution:** Update `~/.claude/config.json` to use `"ccb"` as the server name.

### Issue: "Old commands not working"

**Cause:** CommandMapper not loaded.

**Solution:**
1. Verify you're running v2.0+: `node dist/mcp/server.js --version`
2. Check MCP logs for errors
3. Restart Claude Code

### Issue: "Data directory not found"

**Cause:** Custom DATA_DIR configuration.

**Solution:**
1. Check `.env` file for `DATA_DIR` setting
2. Verify directory exists: `ls ~/.smart-agents/` or `ls ~/.claude-code-buddy/`
3. Update DATA_DIR if you renamed the directory

### Issue: "API key required" error

**Cause:** MCP_SERVER_MODE not set correctly.

**Solution:**
1. Check `.env` file: `MCP_SERVER_MODE=true`
2. Restart MCP server
3. Verify Claude Code integration is active

## Getting Help

### Documentation
- **Installation Guide:** [docs/INSTALL.md](INSTALL.md)
- **Architecture Overview:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Command Reference:** [docs/COMMANDS.md](COMMANDS.md)
- **API Documentation:** [docs/API.md](API.md)

### Support Channels
- **GitHub Issues:** [Report a bug](https://github.com/yourusername/claude-code-buddy/issues)
- **Discussions:** [Ask a question](https://github.com/yourusername/claude-code-buddy/discussions)
- **Discord:** [Join community](https://discord.gg/ccb-community)

## Deprecation Timeline

```
v2.0 (Jan 2026)    v2.5 (Mar 2026)    v3.0 (Jun 2026)
     │                   │                  │
     │                   │                  │
     ▼                   ▼                  ▼
Old commands       Stronger          Old commands
work with          deprecation       removed
warnings           warnings          (breaking)
     │                   │                  │
     └───────────────────┴──────────────────┘
              6 months transition
```

**Recommendation:** Start using new command names now to prepare for v3.0.

## What's Next

After migrating, explore new features:

- 🎯 **Smart Routing** - Automatic task complexity analysis
- 🚀 **Prompt Enhancement** - Context-aware prompt optimization
- 🧠 **Project Memory** - Long-term context retention
- 📊 **Usage Analytics** - Track AI costs and performance

**Welcome to Claude Code Buddy!** 🎉
