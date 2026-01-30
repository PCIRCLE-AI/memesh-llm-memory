# Quick Install Guide

Claude Code Buddy (CCB) can be installed to Cursor and VS Code in just one click!

## 🚀 One-Click Installation

### For Cursor Users

Click the button below to install CCB to Cursor:

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==">
  <img src="https://cursor.com/deeplink/mcp-install-dark.png" alt="Add to Cursor" />
</a>

**Or paste this link in your browser:**
```
cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==
```

---

### For VS Code / Claude Code Users

#### Option 1: Automatic Configuration (Recommended)

1. **Copy the configuration below:**

```json
{
  "mcpServers": {
    "@pcircle/claude-code-buddy-mcp": {
      "command": "npx",
      "args": ["-y", "@pcircle/claude-code-buddy-mcp"]
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
cd @pcircle/claude-code-buddy-mcp
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
cd @pcircle/claude-code-buddy-mcp
npm install
npm run build

# Configure MCP to use local installation
{
  "mcpServers": {
    "@pcircle/claude-code-buddy-mcp": {
      "command": "node",
      "args": ["/path/to/@pcircle/claude-code-buddy-mcp/dist/mcp/server.js"]
    }
  }
}
```

### Custom Configuration

You can customize the MCP server configuration:

```json
{
  "mcpServers": {
    "@pcircle/claude-code-buddy-mcp": {
      "command": "npx",
      "args": ["-y", "@pcircle/claude-code-buddy-mcp"],
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
3. Look for "@pcircle/claude-code-buddy-mcp" in the server list
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
npx @pcircle/claude-code-buddy-mcp --version
```

### For local installation users:
```bash
cd /path/to/@pcircle/claude-code-buddy-mcp
git pull origin main
npm install
npm run build
```

Then restart your IDE.

---

**Need help?** Open an issue or start a discussion on GitHub!
