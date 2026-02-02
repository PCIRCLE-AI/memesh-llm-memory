# Troubleshooting Guide
## Common Issues and Solutions for MeMesh

This guide helps you diagnose and fix common issues with MeMesh.

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

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Connection Issues](#connection-issues)
- [Command Issues](#command-issues)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)

---

For detailed solutions to each category, see the full guide at:
https://memesh.pcircle.ai/troubleshoot

Or run: `memesh report-issue` for interactive help.

---

## Most Common Issues

### 1. "buddy-help" command not found

**Quick Fix:**
```bash
memesh setup  # Run interactive setup
# Restart Claude Code
# Try: buddy-help
```

### 2. "MCP Server Connection Failed"

**Quick Fix:**
```bash
# Restart Claude Code completely
# Wait 10 seconds
# Try command again
```

### 3. "Permission denied" errors

**Quick Fix:**
```bash
sudo npm install -g @pcircle/memesh  # macOS/Linux
# Or configure npm prefix (see docs)
```

### 4. Commands are slow

**Quick Fix:**
- Simplify task descriptions
- Restart Claude Code
- Check network connection

---

## Getting Help

1. **Quick Start:** [docs/QUICK_START.md](./QUICK_START.md)
2. **Report Issue:** `memesh report-issue`
3. **GitHub:** https://github.com/PCIRCLE-AI/claude-code-buddy/issues

---

**Full troubleshooting guide coming soon!**

For now, see Quick Start guide for common issues and solutions.
