# Quick Install Guide

Get MeMesh up and running in under 2 minutes!

---

## 🚀 Installation Methods

Choose the method that best fits your needs:

### ⚡ Method 1: npm Global Install (Easiest) ⭐ RECOMMENDED

**One command, fully automatic setup:**

```bash
npm install -g @pcircle/memesh
```

**What happens automatically:**
- ✅ Installs MeMesh globally
- ✅ Generates A2A authentication token
- ✅ Auto-configures `~/.claude/mcp_settings.json`
- ✅ Ready to use immediately

**Next step:**
```bash
# Restart Claude Code completely (quit and reopen)
# That's it! MeMesh is ready.
```

**To verify:**
```bash
# In Claude Code, ask:
"List available MeMesh tools"
```

---

### 📦 Method 2: Quick Install Script (For Local Development)

**For contributors or users who want to modify the code:**

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

**What the script does:**
- ✅ Checks prerequisites (Node.js 20+)
- ✅ Installs dependencies
- ✅ Builds the project
- ✅ Generates A2A token
- ✅ Auto-configures `~/.claude/mcp_settings.json`

**Next step:**
```bash
# Restart Claude Code completely (quit and reopen)
# MeMesh is now available!
```

**Why choose this method?**
- 🛠️ **Contribute**: Modify source code and submit PRs
- 🔧 **Customize**: Extend functionality for your needs
- 📚 **Learn**: Study the codebase
- ⚡ **Updates**: `git pull` to get latest features

---

## 📋 What You Get

When you install MeMesh, you get access to:

### 18 MCP Tools

**Core Commands (3 tools):**
1. **buddy-do** - Smart task routing and execution
2. **buddy-remember** - Project memory recall and search
3. **buddy-help** - Command documentation and help

**Workflow Tools (2 tools):**
4. **get-session-health** - Session health monitoring
5. **get-workflow-guidance** - Next-step recommendations

**Learning & Improvement (1 tool):**
6. **buddy-record-mistake** - Error recording for continuous learning

**Knowledge Graph (1 tool):**
7. **create-entities** - Create and store knowledge entities

**Secret Management (4 tools):**
8. **buddy-secret-store** - Securely store API keys and credentials
9. **buddy-secret-get** - Retrieve stored secrets
10. **buddy-secret-list** - List all stored secrets
11. **buddy-secret-delete** - Delete secrets

**A2A Protocol - Agent Collaboration (5 tools):**
12. **a2a-send-task** - Send tasks to other agents
13. **a2a-get-task** - Get task status and results
14. **a2a-list-tasks** - List own tasks
15. **a2a-list-agents** - List available agents
16. **a2a-report-result** - Report task execution results

**Internal Tools (2 tools):**
17. **hook-tool-use** - Hook event processing (auto-triggered)
18. **generate-tests** - Automatic test generation

### Core Features

- ✅ **Persistent Memory**: Knowledge graph storage across sessions
- ✅ **Smart Routing**: Automatic task complexity analysis
- ✅ **A2A Protocol**: Agent-to-agent collaboration
- ✅ **Secret Management**: AES-256-GCM encrypted credential storage
- ✅ **Auto-Memory**: Automatic session summaries and recall
- ✅ **MCP 2025-11-25 Compliant**: Full MCP spec compliance

---

## ✅ Verify Installation

### In Claude Code

**1. Check MCP server status:**
```bash
# In Claude Code terminal or ask:
"Show MCP server status"
```

**Expected output:**
```
Connected MCP Servers:
✅ memesh (18 tools available)
```

**2. Test a command:**
```bash
# Ask Claude Code:
buddy-help
```

**Expected response:**
```
📖 MeMesh Command Reference

Available Commands:
  buddy-do              - Execute tasks with smart routing
  buddy-remember        - Recall project memory
  buddy-help            - Show this help
  buddy-secret-store    - Store credentials securely
  ...
  (18 tools total)
```

**3. Test memory:**
```bash
# Ask Claude Code:
"Store this decision: We're using PostgreSQL for JSONB support"

# Then recall it:
buddy-remember "database choice"
```

---

## 🔧 Advanced Configuration

### Custom Environment Variables

You can customize MeMesh behavior via environment variables in your MCP config:

```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "CCB_LOG_LEVEL": "debug",
        "CCB_KNOWLEDGE_DB_PATH": "/custom/path/knowledge.db",
        "MEMESH_A2A_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Available Variables:**
- `CCB_LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)
- `CCB_KNOWLEDGE_DB_PATH`: Custom knowledge database location
- `MEMESH_A2A_TOKEN`: A2A authentication token (required for agent collaboration)
- `MCP_SERVER_MODE`: Force MCP server mode (`true` / `false`)

### Local Development Configuration

If you're developing MeMesh locally, configure to use your local build:

**Edit `~/.claude/mcp_settings.json`:**
```json
{
  "mcpServers": {
    "memesh": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"],
      "env": {
        "NODE_ENV": "development",
        "MEMESH_A2A_TOKEN": "your-token"
      }
    }
  }
}
```

---

## 🆘 Troubleshooting

### "Server failed to start"

**Cause**: Node.js version too old

**Solution**: Check and upgrade Node.js
```bash
node --version  # Should be v20.0.0 or higher

# macOS (Homebrew)
brew install node

# Windows (Chocolatey)
choco install nodejs

# Linux (apt)
sudo apt install nodejs npm
```

---

### "Command not found: npx"

**Cause**: npm not installed

**Solution**: Install Node.js (includes npm)
```bash
# macOS
brew install node

# Windows
choco install nodejs

# Linux
sudo apt install nodejs npm
```

---

### "Server connected but commands not working"

**Cause**: MCP server not fully initialized

**Solution**: Restart your editor
- **Claude Code**: Quit completely and reopen (not just reload)
- **Cursor**: Quit completely and reopen

---

### "MEMESH_A2A_TOKEN not found"

**Cause**: A2A token not configured (only affects A2A features)

**Solution**: Generate and configure token
```bash
# Generate token
openssl rand -hex 32

# Add to ~/.claude/mcp_settings.json:
{
  "mcpServers": {
    "memesh": {
      "env": {
        "MEMESH_A2A_TOKEN": "<your-token-here>"
      }
    }
  }
}
```

---

### npm Global Install Issues

**Permission denied errors:**
```bash
# Option 1: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
npm install -g @pcircle/memesh

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @pcircle/memesh
```

---

### Still Having Issues?

1. **Check Logs**:
   ```bash
   # Claude Code logs usually in:
   ~/.claude/logs/
   ```

2. **GitHub Issues**: [Report a bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

3. **Discussions**: [Ask the community](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

4. **Full Documentation**: [Complete docs](../README.md)

---

## 🔄 Updating MeMesh

### For npm Global Install Users

**MeMesh auto-updates by default** when using `npx`. To verify version:
```bash
npx @pcircle/memesh --version
```

To force update:
```bash
npm update -g @pcircle/memesh
# Restart Claude Code
```

---

### For Local Development Users

```bash
cd /path/to/claude-code-buddy
git pull origin main
npm install
npm run build
# Restart Claude Code
```

---

## 📚 Next Steps

After installation:

1. **Quick Start Guide**: [2-Minute Quick Start](../README.md#-2-minute-quick-start)
2. **User Guide**: [Complete User Guide](USER_GUIDE.md)
3. **Commands Reference**: [All Commands](COMMANDS.md)
4. **API Documentation**: [API Reference](api/API_REFERENCE.md)
5. **A2A Setup**: [Agent Collaboration Guide](A2A_SETUP_GUIDE.md)

---

## 💡 First Commands to Try

```bash
# Get help
buddy-help

# Store a decision
"Store this: We use React with TypeScript for all frontend components"

# Recall it later
buddy-remember "frontend framework"

# Execute a task
buddy-do "explain the difference between JWT and sessions"

# Check session health
get-session-health

# Store an API key (encrypted)
buddy-secret-store "openai_key" "sk-..." api_key

# Get it back when needed
buddy-secret-get "openai_key"
```

---

**Need help?** Open an issue or start a discussion on GitHub!

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md)
