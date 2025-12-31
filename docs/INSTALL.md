# Smart-Agents - Installation Guide

## Prerequisites

Before installing Smart-Agents, ensure you have:

- **Node.js** 18+ ([download](https://nodejs.org))
- **npm** 8+ (comes with Node.js)
- **Claude Code** installed and configured with your subscription

**Note:** No API keys needed - Smart-Agents uses your existing Claude Code subscription through MCP integration.

## Installation Methods

### Method 1: Quick Install (Recommended)

**For Claude Code users - automated setup:**

```bash
git clone https://github.com/yourusername/smart-agents.git
cd smart-agents
./scripts/install.sh
```

The script handles everything: dependencies, build, API keys, MCP configuration.

### Method 2: Manual Installation

**Step-by-step manual setup:**

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/smart-agents.git
cd smart-agents
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment (Optional)

```bash
cp .env.example .env
```

The `.env` file contains optional configuration settings. API keys are not required since Smart-Agents uses Claude Code's subscription.

#### 4. Build Project

```bash
npm run build
```

#### 5. Configure MCP

Add Smart-Agents to `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "smart-agents": {
      "command": "node",
      "args": ["/absolute/path/to/smart-agents/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Note:** Replace `/absolute/path/to/` with your actual installation path.

#### 6. Test Installation

```bash
npm test
```

#### 7. Start MCP Server

```bash
npm run mcp
```

Should output: `MCP Server initialized and ready`

#### 8. Restart Claude Code

Restart Claude Code to load the new MCP server.

### Method 3: npm Global Install (Coming Soon)

**Once published to npm:**

```bash
npm install -g smart-agents
smart-agents install  # Auto-configure MCP
```

## Verification

### Check MCP Integration

In Claude Code, the smart-agents MCP server should be available and ready to use.

### Test Basic Commands

Try using smart-agents in Claude Code to verify it's working correctly.

### Check API Connection

Verify that Smart-Agents can successfully make API calls to Anthropic.

## Troubleshooting

### Error: "MCP server not configured"

**Cause:** MCP server not configured or Claude Code not restarted.

**Fix:**
1. Check `~/.claude/config.json` has smart-agents entry
2. Restart Claude Code
3. Verify MCP server is running

### Error: "Module not found"

**Cause:** Build failed or dependencies not installed.

**Fix:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Error: "Port already in use"

**Cause:** Another MCP server running.

**Fix:**
```bash
# Find and kill process
ps aux | grep "mcp/server"
kill -9 <PID>
```

### MCP Server Not Starting

**Check logs:**
```bash
node dist/mcp/server.js 2>&1 | tee mcp-debug.log
```

**Common issues:**
- Missing dependencies: `npm install`
- Build errors: `npm run build`
- Port conflict: Change port in `.env`

## Updating Smart-Agents

### Update to Latest Version

```bash
cd smart-agents
git pull origin main
npm install
npm run build
# Restart Claude Code
```

## Uninstallation

### Remove Smart-Agents

```bash
# 1. Remove from MCP config
# Edit ~/.claude/config.json and remove "smart-agents" entry

# 2. Remove project directory
rm -rf /path/to/smart-agents

# 3. Restart Claude Code
```

## Next Steps

- **Quick Start:** [README.md](../README.md)
- **Architecture Guide:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

## Support

Having installation issues?

- **GitHub Issues:** [Report a bug](https://github.com/yourusername/smart-agents/issues)
- **Discussions:** [Ask a question](https://github.com/yourusername/smart-agents/discussions)
