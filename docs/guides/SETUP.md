# 🚀 Claude Code Buddy Setup Guide (V2.0 MCP Server Pattern)

## V2.0 MCP Server Setup (Current Implementation)

### Step 1: Install Dependencies

```bash
# Clone repository
git clone <your-repo-url> claude-code-buddy
cd claude-code-buddy

# Install Node.js dependencies
npm install
```

### Step 2: Compile TypeScript

```bash
npm run build
```

### Step 3: Configure Claude Code MCP Server

Edit `~/.claude/mcp_settings.json` and add the claude-code-buddy MCP server:

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/claude-code-buddy",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/path/to/claude-code-buddy` with the actual project path.

### Step 4: (Optional) Configure RAG Agent

If you want to use the RAG agent, configure the OpenAI API key for embeddings:

```bash
# Copy environment template
cp .env.example .env

# Edit .env, only fill in RAG-related configuration
nano .env
```

Add to `.env`:

```bash
# OpenAI API (for RAG embeddings only)
OPENAI_API_KEY=sk-your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector DB path (optional)
VECTRA_INDEX_PATH=~/.claude-code-buddy/vectra
```

**If not using RAG agent**, you can skip this step and don't even need a .env file.

### Step 5: Restart Claude Code

Restart Claude Code, and the MCP server will start automatically.

### Step 6: Verify Installation

Test in Claude Code:

```
Please use claude-code-buddy' code-reviewer to review this code...
```

---

## Verification Checklist (V2.0)

- [ ] Node.js >= 18 installed
- [ ] Project dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] MCP server configured in `~/.claude/mcp_settings.json`
- [ ] Claude Code restarted
- [ ] (Optional) RAG Agent OpenAI API key configured

## Common Issues (V2.0)

### Q: MCP server fails to start

**Solutions**:
1. Check if `~/.claude/mcp_settings.json` path is correct
2. Confirm `npm run build` executed successfully
3. Check Claude Code logs: `~/.claude/logs/`
4. Try running manually: `npm run mcp`

### Q: Cannot find claude-code-buddy tools

**Solutions**:
1. Confirm Claude Code has been restarted
2. Check MCP server status
3. Try running in Claude Code: `/mcp list`

### Q: RAG Agent embedding fails

**Solutions**:
1. Confirm `OPENAI_API_KEY` is configured in `.env`
2. Check if API key is valid
3. Confirm OpenAI API quota is not exhausted
4. Check `VECTRA_INDEX_PATH` directory permissions

### Q: Out of memory

**Solutions**:
1. Close other applications
2. Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096" npm run mcp`

## System Requirements

### Minimum Requirements
- **Node.js**: >= 18.0.0
- **Claude Code**: Installed
- **RAM**: 2 GB (V2.0 MCP server is lightweight)
- **Storage**: 5 GB available space

### Recommended Configuration
- **Node.js**: >= 20.0.0
- **Claude Code**: Latest version
- **RAM**: 4+ GB
- **Storage**: 20+ GB SSD (if using RAG agent)
- **Network**: Stable connection (Claude Code → Claude API)

## Next Steps

After configuration, see:
- [RAG Deployment Guide](./RAG_DEPLOYMENT.md) - RAG Agent detailed deployment
- [Usage Guide](./USAGE.md) - How to use various agents
- [Architecture Documentation](../../ARCHITECTURE.md) - System architecture
- [Evolution System](../EVOLUTION.md) - Self-learning mechanism
