# Quick Install Guide

Claude Code Buddy (CCB) can be installed to Cursor and VS Code in just one click!

## 🚀 One-Click Installation

### For Cursor Users

Click the button below to install CCB to Cursor:

[![Install to Cursor](https://img.shields.io/badge/Install%20to-Cursor-blue?style=for-the-badge&logo=cursor)](cursor://anysphere.cursor-deeplink/mcp/install?name=claude-code-buddy&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImNsYXVkZS1jb2RlLWJ1ZGR5Il19)

**Or paste this link in your browser:**
```
cursor://anysphere.cursor-deeplink/mcp/install?name=claude-code-buddy&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImNsYXVkZS1jb2RlLWJ1ZGR5Il19
```

---

### For VS Code / Claude Code Users

#### Option 1: Automatic Configuration (Recommended)

1. **Copy the configuration below:**

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "npx",
      "args": ["-y", "claude-code-buddy"]
    }
  }
}
```

2. **Add to your MCP configuration:**
   - **macOS/Linux**: `~/.claude/mcp_settings.json`
   - **Windows**: `%APPDATA%\Claude\mcp_settings.json`

3. **Restart Claude Code**

#### Option 2: Interactive Installer

Run the interactive installer (includes automatic MCP configuration):

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/install.sh
```

The installer will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Build the project
- ✅ Configure MCP integration automatically
- ✅ Test the installation

---

## 📋 What Gets Installed?

When you install CCB, you get:

### 7 MCP Tools
1. **buddy-do** - Smart task execution with capability routing
2. **buddy-remember** - Project memory recall
3. **buddy-help** - Command documentation
4. **get-session-health** - Session monitoring
5. **get-workflow-guidance** - Workflow recommendations
6. **generate-smart-plan** - Implementation planning
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
    "claude-code-buddy": {
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server.js"]
    }
  }
}
```

### Custom Configuration

You can customize the MCP server configuration:

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "npx",
      "args": ["-y", "claude-code-buddy"],
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

After installation, verify CCB is working:

### In Cursor
1. Open a project
2. Open the MCP panel (View → MCP Servers)
3. Look for "claude-code-buddy" in the server list
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

## 🔄 Updating CCB

### For npx users (default):
CCB automatically uses the latest version. To verify:
```bash
npx claude-code-buddy --version
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
