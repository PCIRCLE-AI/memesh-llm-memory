# 🔄 Upgrade Guide: Claude Code Buddy → MeMesh

> **Important**: MeMesh was previously known as "Claude Code Buddy (CCB)". This guide helps existing users upgrade safely without losing any data.

---

## 📊 Quick Summary

| Aspect | Change |
|--------|--------|
| **Package Name** | `claude-code-buddy` → `@pcircle/memesh` |
| **Data Directory** | `~/.claude-code-buddy/` → `~/.memesh/` |
| **MCP Server Name** | `claude-code-buddy` → `memesh` |
| **Binary Command** | `ccb` → `memesh` |
| **Breaking Changes** | ✅ **Data migration required** |

---

## ✅ Who Should Upgrade?

**You should upgrade if**:
- ✅ You're currently using Claude Code Buddy (any version)
- ✅ You want the latest features and improvements
- ✅ You want to align with the official naming

**You can skip if**:
- ⏸️ You're happy with your current version
- ⏸️ You don't have time for migration right now (no rush - legacy support continues)

---

## 🛡️ Safety Guarantee

**This upgrade is designed to be 100% safe**:
- ✅ Automatic data migration script provided
- ✅ Your old data is **never deleted** automatically
- ✅ Backup created before migration
- ✅ Rollback possible if needed
- ✅ Zero data loss guarantee

---

## 📋 Pre-Upgrade Checklist

Before you start, ensure:

1. ✅ **Stop all Claude Code sessions**
   ```bash
   # Check for running MCP servers
   ps aux | grep -E "claude-code-buddy|memesh|server-bootstrap"

   # Stop Claude Code CLI if running
   # Just exit your current Claude Code session
   ```

2. ✅ **Verify your data location**
   ```bash
   # Check if you have data to migrate
   ls -la ~/.claude-code-buddy/

   # You should see files like:
   # - knowledge-graph.db
   # - database.db
   # - secrets.db (if you stored secrets)
   ```

3. ✅ **Check disk space** (at least 2x your data size)
   ```bash
   du -sh ~/.claude-code-buddy/
   df -h ~
   ```

4. ✅ **Note your current MCP configuration** (we'll update it later)
   ```bash
   # Find your config file
   cat ~/.claude/config.json 2>/dev/null || \
   cat ~/.config/claude/claude_desktop_config.json 2>/dev/null
   ```

---

## 🚀 Upgrade Steps

### Step 1: Install MeMesh Package

```bash
# Uninstall old package (optional - can coexist temporarily)
npm uninstall -g claude-code-buddy

# Install new package
npm install -g @pcircle/memesh@latest
```

### Step 2: Migrate Your Data

**Automatic Migration (Recommended)**:

```bash
# Clone or navigate to the MeMesh repository
cd /path/to/claude-code-buddy  # (repository is still named this)

# Run the migration script
./scripts/migrate-from-ccb.sh
```

The script will:
- ✅ Detect your old data at `~/.claude-code-buddy/`
- ✅ Create a timestamped backup
- ✅ Copy all data to `~/.memesh/`
- ✅ Verify migration success
- ✅ **Keep your old data safe** (not deleted)

**Manual Migration** (if script fails):

```bash
# Backup first
cp -r ~/.claude-code-buddy ~/.claude-code-buddy-backup-$(date +%Y%m%d)

# Copy to new location
cp -r ~/.claude-code-buddy ~/.memesh

# Verify
ls -la ~/.memesh/
```

### Step 3: Update MCP Configuration

#### Option A: Automatic Detection (for developers)

If you're in the repository:
```bash
npm run setup
```

#### Option B: Manual Update

1. Find your MCP config file:
   - Claude Code CLI: `~/.claude/config.json`
   - Claude Desktop: `~/.config/claude/claude_desktop_config.json`

2. Open the file and update:

**Before**:
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/path/to/old/server.js"]
    }
  }
}
```

**After**:
```json
{
  "mcpServers": {
    "memesh": {
      "type": "stdio",
      "command": "node",
      "args": ["/usr/local/lib/node_modules/@pcircle/memesh/dist/mcp/server-bootstrap.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Find the correct path**:
```bash
# On macOS/Linux
npm root -g

# Then append: /node_modules/@pcircle/memesh/dist/mcp/server-bootstrap.js
```

### Step 4: Restart Claude Code

```bash
# Just restart your Claude Code CLI
# The new MeMesh MCP server will be loaded automatically
```

### Step 5: Verify Upgrade

```bash
# In Claude Code session, check if MeMesh tools are available
# You should see tools like:
# - buddy-do
# - buddy-remember
# - create-entities
# etc.
```

---

## 🧪 Verification Checklist

After upgrade, verify everything works:

- [ ] **MCP Server Connected**: Check Claude Code shows MeMesh as connected
- [ ] **Tools Available**: All 17 MeMesh tools are listed
- [ ] **Data Accessible**: Your knowledge graph is intact
  ```
  Use `buddy-remember "test"` to check if past data is accessible
  ```
- [ ] **Secrets Work**: If you stored secrets, they should still be accessible
  ```
  Use `buddy-secret-list` to verify
  ```

---

## 🔧 Troubleshooting

### Issue 1: "MCP server failed to connect"

**Cause**: Wrong path in config or permissions issue

**Fix**:
```bash
# Verify memesh is installed
which memesh
npm list -g @pcircle/memesh

# Check binary permissions
ls -la $(npm root -g)/@pcircle/memesh/dist/mcp/server-bootstrap.js

# Should show: -rwxr-xr-x (executable)
# If not, fix permissions:
chmod +x $(npm root -g)/@pcircle/memesh/dist/mcp/server-bootstrap.js
```

### Issue 2: "Can't find my old data"

**Cause**: Data migration didn't complete

**Fix**:
```bash
# Check if old data exists
ls -la ~/.claude-code-buddy/

# Check if new location has data
ls -la ~/.memesh/

# If ~/.memesh/ is empty, run migration again:
./scripts/migrate-from-ccb.sh
```

### Issue 3: "Tools show errors when used"

**Cause**: Database permissions or corruption

**Fix**:
```bash
# Check database file permissions
ls -la ~/.memesh/*.db

# Should be readable/writable by you:
# -rw-r--r-- (644) is fine

# If corrupted, restore from backup:
cp -r ~/.claude-code-buddy-backup-YYYYMMDD ~/.memesh
```

### Issue 4: "Old and new servers both running"

**Cause**: Config has both entries

**Fix**:
```bash
# Edit config and remove old entry:
nano ~/.claude/config.json

# Keep only "memesh" entry, delete "claude-code-buddy" entry
# Restart Claude Code
```

---

## 🔄 Rollback (If Needed)

If you encounter issues and want to rollback:

### Step 1: Restore Old Package

```bash
# Uninstall new package
npm uninstall -g @pcircle/memesh

# Reinstall old package
npm install -g claude-code-buddy@previous-version
```

### Step 2: Restore Old Config

```bash
# Revert MCP config to old settings
# Change "memesh" back to "claude-code-buddy" in config file
```

### Step 3: Verify Old Data

```bash
# Check old data is intact
ls -la ~/.claude-code-buddy/

# If needed, restore from backup
cp -r ~/.claude-code-buddy-backup-YYYYMMDD ~/.claude-code-buddy
```

**Your data at `~/.claude-code-buddy/` was never deleted, so rollback is safe.**

---

## 🆕 What's New in MeMesh?

After upgrading, you'll get:

- ✅ **17 MCP Standard Tools** (formerly 15)
- ✅ **Improved backward compatibility** (automatic fallback to legacy paths)
- ✅ **Better error messages** with actionable guidance
- ✅ **Performance improvements** (query caching, connection pooling)
- ✅ **Cleaner branding** (avoiding trademark issues)
- ✅ **Active development** (regular updates and improvements)

---

## 📚 Additional Resources

- 📖 **Installation Guide**: [QUICK_INSTALL.md](QUICK_INSTALL.md)
- 🐛 **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 💬 **Get Help**: [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- 🆕 **What's Changed**: [CHANGELOG.md](../CHANGELOG.md)

---

## ❓ FAQ

### Q: Will I lose my knowledge graph data?
**A**: No. The migration script copies your data safely. Your old data is never deleted automatically.

### Q: Can I use both old and new versions simultaneously?
**A**: Technically yes, but not recommended. They'll use different data directories, so your knowledge graph won't be shared.

### Q: How long does the upgrade take?
**A**: Usually 5-10 minutes:
- Install: ~2 minutes
- Data migration: ~2 minutes (depends on data size)
- Config update: ~2 minutes
- Verification: ~2 minutes

### Q: What if the migration script fails?
**A**: Use the manual migration steps above. If still stuck, [open an issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues).

### Q: Do I need to update my custom skills/workflows?
**A**: No changes needed! All APIs remain compatible. Skills and workflows continue working as-is.

### Q: Will future updates require manual migration?
**A**: No. This is a one-time migration for the naming change. Future updates will be seamless.

---

## 💚 Need Help?

- 🐛 **Found a bug?** [Open an issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new)
- 💬 **Have questions?** [Start a discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- 📧 **Private concern?** Email: support@pcircle.ai

---

**Thank you for using MeMesh!** 🎉

Your support helps us build better tools for AI-assisted development.
