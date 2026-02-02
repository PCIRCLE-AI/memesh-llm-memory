# 🚀 Claude Code Buddy Setup Guide (v2.2 MCP Server Pattern)

## Quick Installation (Recommended)

**The easiest way to install Claude Code Buddy is using the automated installer:**

```bash
# 1. Clone the repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Run the interactive installer
./scripts/install.sh
```

The installer will guide you through core setup and a basic usage demo:

- ✓ Check prerequisites (Node.js 20+, npm, git)
- ✓ Install dependencies
- ✓ Build the project
- ✓ Check system resources
- ✓ Configure environment
- ✓ Configure Claude Code MCP integration
- ✓ Test installation
- 📚 Basic usage demo

**No API keys needed in MCP server mode** - uses your Claude Code subscription.

**After installation**: Restart Claude Code and start using MeMesh!

---

## Advanced Manual Installation

If you prefer manual control over the installation process, follow these steps:

### Step 1: Install Dependencies

```bash
# Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# Install Node.js dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Create .env from template (optional, uses defaults)
cp .env.example .env
```

**API keys**: Not required in MCP server mode (`MCP_SERVER_MODE=true`). If running standalone orchestrator, set `MCP_SERVER_MODE=false` and `ANTHROPIC_API_KEY` in `.env`.

### Step 3: Compile TypeScript

```bash
npm run build
```

### Step 4: Configure Claude Code MCP Server

Edit `~/.claude.json` and add the claude-code-buddy MCP server:

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/claude-code-buddy/dist/mcp/server-bootstrap.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/path/to/claude-code-buddy` with the actual project path.

### Step 5: Restart Claude Code

Restart Claude Code, and the MCP server will start automatically.

### Step 6: Verify Installation

Test in Claude Code:

```
Please use claude-code-buddy to review this code...
```

---

## Verification Checklist (V2.0)

- [ ] Node.js >= 20 installed
- [ ] Project dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] MCP server configured in `~/.claude.json`
- [ ] Claude Code restarted

## Common Issues (V2.0)

### Q: MCP server fails to start

**Solutions**:
1. Check if `~/.claude.json` path is correct
2. Confirm `npm run build` executed successfully
3. Check Claude Code logs: `~/.claude/logs/`
4. Try running manually: `npm run mcp`

### Q: Cannot find claude-code-buddy tools

**Solutions**:
1. Confirm Claude Code has been restarted
2. Check MCP server status
3. Try running in Claude Code: `/mcp list`

### Q: Out of memory

**Solutions**:
1. Close other applications
2. Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096" npm run mcp`

## System Requirements

### Minimum Requirements
- **Node.js**: >= 20.0.0
- **Claude Code**: Installed
- **RAM**: 2 GB (V2.0 MCP server is lightweight)
- **Storage**: 5 GB available space

### Recommended Configuration
- **Node.js**: >= 20.0.0
- **Claude Code**: Latest version
- **RAM**: 4+ GB
- **Storage**: 20+ GB SSD
- **Network**: Stable connection (Claude Code → Claude API)

## Next Steps

After configuration, see:
- [User Guide](../USER_GUIDE.md) - How to use core capabilities
- [Commands Reference](../COMMANDS.md) - Buddy commands + MCP tools
- [Troubleshooting](../TROUBLESHOOTING.md) - Common fixes
