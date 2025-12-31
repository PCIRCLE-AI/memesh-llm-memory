# Migration Guide: claude-code-buddy → Claude Code Buddy (CCB)

## Overview

This guide helps you migrate from **claude-code-buddy** to **Claude Code Buddy (CCB)** v2.0.

**Simple rebrand** - Direct rename with no backward compatibility needed (solo user).

## What Changed

### Name & Branding
- **Old Name:** claude-code-buddy
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
# 1. Navigate to your claude-code-buddy directory
cd /path/to/claude-code-buddy

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
    "ccb": {  // Changed from "claude-code-buddy"
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Data & Configuration

**Your data stays in place:**

- ✓ `~/.claude-code-buddy/` directory continues to work
- ✓ All embeddings, memories, and cache preserved
- ✓ Environment variables unchanged (`.env`)
- ✓ MCP configuration compatible

**Optional data migration:**

If you want to rename your data directory for consistency:

```bash
# Optional: Rename data directory
mv ~/.claude-code-buddy ~/.claude-code-buddy

# Then update .env (if you use custom DATA_DIR)
# DATA_DIR=~/.claude-code-buddy
```

## What's New

### Commands

New command structure is **friendlier and more memorable**:

```bash
ccb route "complex query"
ccb enhance "basic prompt"
ccb memory store "important fact"
ccb analyze "task complexity"
```

## Troubleshooting

### Issue: "MCP server 'claude-code-buddy' not found"

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
2. Verify directory exists: `ls ~/.claude-code-buddy/` or `ls ~/.claude-code-buddy/`
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

## What's Next

After migrating, explore new features:

- 🎯 **Smart Routing** - Automatic task complexity analysis
- 🚀 **Prompt Enhancement** - Context-aware prompt optimization
- 🧠 **Project Memory** - Long-term context retention
- 📊 **Usage Analytics** - Track AI costs and performance

**Welcome to Claude Code Buddy!** 🎉
