# Troubleshooting Guide

## TL;DR
If you're in a hurry:
1. Run `memesh setup` to fix installation and path issues.
2. Restart Claude Code completely.
3. Verify your Node.js version is **>= v20.0.0**.

---

## Quick Diagnostic Commands

Before troubleshooting, run these commands to gather information:

```bash
# 1. Verify MeMesh installation
npm list -g @pcircle/memesh

# 2. Check Node.js and npm versions
node --version  # Should be >= v20.0.0
npm --version   # Should be >= v9.0.0

# 3. Validate MCP configuration
memesh config validate

# 4. Test MeMesh directly
npx @pcircle/memesh --help
```

---

## Issue Categories

- [Most Common Issues](#most-common-issues)
- [Performance & Persistence](#performance--persistence)
- [Getting Help](#getting-help)

---

## Most Common Issues

### 1. "buddy-help" command not found
**Symptoms**: Shell returns "command not found" after installation.
**Quick Fix:**
```bash
memesh setup  # Run interactive setup to fix PATH
# Restart your terminal or Claude Code
# Try: buddy-help
```

### 2. "MCP Server Connection Failed"
**Symptoms**: Claude Code cannot connect to the MeMesh server.
**Quick Fix:**
```bash
# Restart Claude Code completely
# Wait a few seconds for the MCP server to initialize
# Try the command again
```

### 3. "Permission denied" errors
**Symptoms**: Errors during `npm install` or file access.
**Quick Fix:**
- **Avoid sudo**: Use an npm prefix or a version manager like `nvm`.
- **Manual fix**: `sudo npm install -g @pcircle/memesh` (not recommended for long-term).

---

## Performance & Persistence

### 4. Commands are slow or hanging
**Symptoms**: MeMesh takes too long to respond or hangs indefinitely.
**Quick Fix:**
- **Kill processes**: `pkill -f memesh` then restart Claude Code.
- **Simplify**: Break complex tasks into smaller sub-tasks.
- **Check orphans**: `npm run processes:orphaned` to find orphaned processes.

### 5. Memory not persisting
**Symptoms**: Information or context from previous sessions is lost.
**Quick Fix:**
- Check permissions for `~/.claude-code-buddy/` directory.
- Verify the knowledge graph database exists: `ls ~/.claude-code-buddy/knowledge-graph.db`
- Run `memesh config validate` to ensure storage is correctly configured.

### 6. Multiple MCP server processes
**Symptoms**: High CPU or memory usage from duplicate MeMesh processes.
**Quick Fix:**
```bash
npm run processes:list      # List all processes
npm run processes:orphaned  # Find orphaned processes
npm run processes:kill      # Kill all MeMesh processes
```
Then restart Claude Code.

---

## Getting Help

1. **Quick Start:** [docs/QUICK_START.md](./QUICK_START.md)
2. **Report Issue:** `memesh report-issue`
3. **GitHub:** [Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
4. **Discussions:** [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

**Version**: 2.8.8
**Last Updated**: 2026-02-12
