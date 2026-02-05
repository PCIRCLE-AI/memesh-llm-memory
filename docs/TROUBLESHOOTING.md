# ⚠️ Troubleshooting Guide

## 💡 TL;DR
If you're in a hurry:
1. Run `memesh setup` to fix installation and path issues.
2. Run `memesh daemon restart` if commands are slow or stuck.
3. Verify your Node.js version is **>= v20.0.0**.

---

## 🔧 Quick Diagnostic Commands

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

## 📍 Issue Categories

- [Most Common Issues](#most-common-issues)
- [Daemon Issues](#daemon-issues)
- [Performance & Persistence](#performance--persistence)
- [Getting Help](#getting-help)

---

## ✅ Most Common Issues

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
# Wait 10 seconds for daemon to initialize
# Try the command again
```

### 3. "Permission denied" errors
**Symptoms**: Errors during `npm install` or file access.
**Quick Fix:**
- **Avoid sudo**: Use an npm prefix or a version manager like `nvm`.
- **Manual fix**: `sudo npm install -g @pcircle/memesh` (not recommended for long-term).

---

## 🔧 Daemon Issues

MeMesh uses a singleton daemon architecture. Here are common daemon-related issues:

### 4. "Failed to acquire daemon lock"
**Cause:** Another daemon is running or a stale lock file exists.
**Quick Fix:**
```bash
# Check daemon status
memesh daemon status

# If stale, clean up manually
rm ~/.memesh/daemon.lock
rm ~/.memesh/daemon.sock

# Restart
memesh daemon restart
```

### 5. "ECONNREFUSED" when connecting to daemon
**Cause:** Daemon is not running or socket file is missing.
**Quick Fix:**
- Check status: `memesh daemon status`
- Restart daemon: `memesh daemon restart`
- Verify socket exists: `ls -la ~/.memesh/daemon.sock`

### 6. "Protocol version mismatch"
**Cause:** Client and daemon are running incompatible versions.
**Quick Fix:**
- Upgrade daemon: `memesh daemon upgrade`
- Or force restart: `memesh daemon stop --force`

---

## 🧠 Performance & Persistence

### 7. Commands are slow or hanging
**Symptoms**: CCB takes too long to respond or hangs indefinitely.
**Quick Fix:**
- **Pkill**: `pkill -f memesh` then `memesh daemon start`.
- **Simplify**: Break complex tasks into smaller sub-tasks.
- **Network**: Verify your internet connection to the LLM provider.

### 8. Memory not persisting
**Symptoms**: Information or context from previous sessions is lost.
**Quick Fix:**
- Check permissions for `~/.memesh/memory.json`.
- Verify `MEMESH_STORAGE_PATH` in your `.env` if you are using a custom location.
- Run `memesh config validate` to ensure storage is correctly configured.

### 9. Disable daemon mode
If daemon mode causes consistent issues, you can run in standalone mode:
- **Temporary**: `export MEMESH_DISABLE_DAEMON=1`
- **Permanent**: Add `export MEMESH_DISABLE_DAEMON=1` to your `~/.zshrc` or `~/.bashrc`.
- **Cleanup**: `rm ~/.memesh/daemon.lock ~/.memesh/daemon.sock && pkill -f "memesh.*daemon"`

---

## 🆘 Getting Help

1. **Quick Start:** [docs/QUICK_START.md](./QUICK_START.md)
2. **Report Issue:** `memesh report-issue`
3. **GitHub:** [Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
4. **Discussions:** [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

**Version**: 2.7.1
**Last Updated**: 2026-02-05
