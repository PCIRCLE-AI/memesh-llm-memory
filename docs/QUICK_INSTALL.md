# Quick Install Guide

MeMesh can be installed to Cursor and VS Code in just one click!

## 🚀 Quick Installation

### For Cursor Users

Click the button below to install MeMesh to Cursor:

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL21lbWVzaCJdfQ==">
  <img src="https://cursor.com/deeplink/mcp-install-dark.png" alt="Add to Cursor" />
</a>

**Or paste this link in your browser:**
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/memesh&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL21lbWVzaCJdfQ==
```

---

### For Claude Code Users (Recommended Plugin Installation)

#### Quick Install Script

Run the quick install script:

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
```

The installer will:
- ✅ Check prerequisites (Node.js 20+)
- ✅ Install dependencies
- ✅ Build the project
- ✅ Show you how to activate the plugin

#### Activate MeMesh Plugin

After installation, start Claude Code with the plugin directory:

```bash
claude --plugin-dir /path/to/claude-code-buddy
```

**That's it!** MeMesh will be available as a plugin in your Claude Code session.

**Note**: The `--plugin-dir` flag needs to be specified each time you start Claude Code. For team-wide distribution without command-line flags, consider creating a [Plugin Marketplace](https://code.claude.com/docs/en/plugin-marketplaces).

#### Why Plugin Installation?

- ✅ **Automatic Management**: No manual config files to edit
- ✅ **Clean Integration**: Works seamlessly with Claude Code's plugin system
- ✅ **Easy Updates**: Just git pull and rebuild
- ✅ **Multiple Plugins**: Load multiple plugins at once

---

## 📋 What Gets Installed?

When you install MeMesh, you get:

### 7 MCP Tools
1. **buddy-do** - Smart task execution with capability routing
2. **buddy-remember** - Project memory recall
3. **buddy-help** - Command documentation
4. **get-session-health** - Session monitoring
5. **get-workflow-guidance** - Workflow recommendations
6. **generate-tests** - Implementation planning
7. **hook-tool-use** - Tool usage tracking

### Features
- ✅ **Smart Routing**: Automatic task complexity analysis
- ✅ **Project Memory**: Persistent knowledge graph
- ✅ **Model Selection**: Auto-select Claude Opus/Sonnet/Haiku
- ✅ **Capability Focus**: 40+ specialized agent types
- ✅ **MCP 2025-11-25 Compliant**: Full spec compliance

---

## 🔧 Advanced Installation Options

### Local Development Installation

For contributors or users who want to run from source:

```bash
# Clone and install
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install
npm run build

# Configure MCP to use local installation
{
  "mcpServers": {
    "memesh": {
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"]
    }
  }
}
```

### Custom Configuration

You can customize the MCP server configuration:

```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"],
      "env": {
        "CCB_LOG_LEVEL": "debug",
        "CCB_KNOWLEDGE_DB_PATH": "/custom/path/knowledge.db"
      }
    }
  }
}
```

**Available Environment Variables:**
- `CCB_LOG_LEVEL`: Set logging level (`debug`, `info`, `warn`, `error`)
- `CCB_KNOWLEDGE_DB_PATH`: Custom knowledge database location
- `MCP_SERVER_MODE`: Force MCP server mode (`true` / `false`)

---

## ✅ Verify Installation

After installation, verify MeMesh is working:

### In Cursor
1. Open a project
2. Open the MCP panel (View → MCP Servers)
3. Look for "@pcircle/memesh" in the server list
4. Status should show "Connected ✓"

### In Claude Code
1. Start a new chat session
2. Type: `/help`
3. Look for buddy commands in the list
4. Try: `buddy-help` to see all available commands

---

## 🆘 Troubleshooting

### "Server failed to start"

**Solution**: Check Node.js version (requires 20+)
```bash
node --version  # Should be v20.0.0 or higher
```

### "Command not found: npx"

**Solution**: Install Node.js and npm
```bash
# macOS (Homebrew)
brew install node

# Windows (Chocolatey)
choco install nodejs

# Linux (apt)
sudo apt install nodejs npm
```

### "Server connected but commands not working"

**Solution**: Restart the IDE/editor
- **Cursor**: Restart Cursor completely
- **Claude Code**: Run `/restart` in chat

### Still having issues?

1. Check the [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
2. Join the [Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
3. Review the [Full Documentation](../README.md)

---

## 📚 Next Steps

After installation:

1. **Read the Quick Start**: See [README.md](../README.md#quick-start-2-minutes)
2. **Try Basic Commands**:
   ```
   buddy-help
   buddy-remember "project setup"
   buddy-do "analyze my codebase"
   ```
3. **Explore Features**: Check out the [documentation](../docs/)

---

## 🔄 Updating MeMesh

### For npx users (default):
MeMesh automatically uses the latest version. To verify:
```bash
npx @pcircle/memesh --version
```

### For local installation users:
```bash
cd /path/to/claude-code-buddy
git pull origin main
npm install
npm run build
```

Then restart your IDE.

---

**Need help?** Open an issue or start a discussion on GitHub!
