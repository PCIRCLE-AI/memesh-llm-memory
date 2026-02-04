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

- [Most Common Issues](#most-common-issues)
- [Daemon Issues](#daemon-issues)
- [Getting Help](#getting-help)

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

## Daemon Issues

MeMesh uses a singleton daemon architecture. Here are common daemon-related issues:

### 5. "Failed to acquire daemon lock"

**Cause:** Another daemon is running or stale lock file exists.

**Quick Fix:**
```bash
# Check daemon status
memesh daemon status

# If stale, clean up
rm ~/.memesh/daemon.lock
rm ~/.memesh/daemon.sock

# Restart
memesh daemon restart
```

### 6. "ECONNREFUSED" when connecting to daemon

**Cause:** Daemon is not running or socket file is missing.

**Quick Fix:**
```bash
# Check status
memesh daemon status

# Restart daemon
memesh daemon restart

# Verify socket exists
ls -la ~/.memesh/daemon.sock
```

### 7. "Protocol version mismatch"

**Cause:** Client and daemon have incompatible versions.

**Quick Fix:**
```bash
# Upgrade daemon to new version
memesh daemon upgrade

# Or force restart
memesh daemon stop --force
```

### 8. Daemon using high memory

**Cause:** Many connected clients or memory leak.

**Quick Fix:**
```bash
# Check client count
memesh daemon status

# Restart to clear state
memesh daemon restart

# Check logs for issues
memesh daemon logs | grep -i memory
```

### 9. Disable daemon mode

If daemon mode causes issues, run in standalone mode:

```bash
# Temporary disable
export MEMESH_DISABLE_DAEMON=1

# Or add to shell profile
echo 'export MEMESH_DISABLE_DAEMON=1' >> ~/.zshrc

# Emergency cleanup
rm ~/.memesh/daemon.lock ~/.memesh/daemon.sock
pkill -f "memesh.*daemon"
```

---

## Getting Help

1. **Quick Start:** [docs/QUICK_START.md](./QUICK_START.md)
2. **Report Issue:** `memesh report-issue`
3. **GitHub:** https://github.com/PCIRCLE-AI/claude-code-buddy/issues

---

**Version**: 2.7.0
**Last Updated**: 2026-02-04
