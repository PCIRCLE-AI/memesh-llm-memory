# Migration Guide: v2.0 → v2.1

This guide helps existing users migrate from Claude Code Buddy v2.0 to v2.1.

## Breaking Changes

### 1. Agent Count Reduction
- **v2.0**: 22 agents
- **v2.1**: 13 agents (5 real + 7 enhanced + 1 optional)

**Impact**: Some agent names may have changed or been consolidated.

**Migration**:
- Check your code for agent references
- Update to use new agent names (see [Architecture Overview](architecture/OVERVIEW.md))
- Removed agents have been consolidated into enhanced prompts

**Agent Mapping**:
- Old agent functionality is preserved through prompt enhancement
- No breaking changes to MCP tool interface
- All existing workflows continue to work

**New Agent Structure**:
- **5 Real Implementations**: RAG Agent, Evolution System, Knowledge Graph, Development Butler, Test Writer
- **7 Enhanced Prompts**: Code Reviewer, Debugger, Refactorer, API Designer, Research Agent, Architecture Agent, Data Analyst
- **1 Optional Feature**: Knowledge Agent

### 2. Documentation Language
- **v2.0**: Mixed Chinese/English
- **v2.1**: English only

**Impact**: All documentation now in English for international accessibility.

**Migration**: No code changes needed. Documentation is informational only.

### 3. Setup Process
- **v2.0**: Manual 10-18 hour setup
- **v2.1**: Automated 15-minute setup

**Migration**:
```bash
# Old way (v2.0) - Manual
npm install
# ... many manual configuration steps

# New way (v2.1) - Automated!
./scripts/setup.sh
```

**Benefits**:
- Automated environment setup
- Automatic MCP server configuration
- Interactive prompts for customization
- Validation checks at each step

## New Features in v2.1

### 🚀 Automated Setup Script
```bash
./scripts/setup.sh
```

Automates the entire setup process:
- Environment configuration
- Dependency installation
- MCP server setup
- Connection verification

**What it does**:
- ✅ Checks Node.js version (18+ required)
- ✅ Installs npm dependencies
- ✅ Creates `.env` file from template
- ✅ Runs tests to verify installation
- ✅ Builds the project
- ✅ (Optional) Configures MCP server integration

### 📚 15-Minute Quick Start Guide
See [Quick Start Guide](guides/QUICK_START.md)

Perfect for new users or re-onboarding:
- Step-by-step instructions
- Time estimates per section
- Expected outputs for validation
- Common troubleshooting scenarios

### 🏗️ Visual Architecture Diagram
See [Architecture Diagram](diagrams/architecture.md)

Interactive Mermaid diagram showing:
- Complete system flow
- All 13 agents with descriptions
- Color-coded agent types
- Data flow from user to API

### ✨ Improved Documentation Structure
- English-only documentation
- Consistent terminology
- Better organization
- More examples
- Clear agent type distinctions (real vs. prompt-enhanced)

## Configuration Changes

### .env File
✅ **No changes to .env format**. Existing .env files work as-is.

Your existing configuration:
```bash
# MCP Server Mode (Claude Code manages API access)
MCP_SERVER_MODE=true

# Optional: OpenAI API key for RAG features
OPENAI_API_KEY=sk-proj-xxxxx

# Optional: Anthropic API key (only for standalone mode)
# ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**v2.1 Simplification**:
- `MCP_SERVER_MODE=true` is now the default
- Anthropic API key only needed if `MCP_SERVER_MODE=false`
- OpenAI API key still optional (RAG features only)

### MCP Server Config
⚠️ **Update MCP server configuration due to rebrand**.

Update your Claude Code config from Claude Code Buddy to Claude Code Buddy:
```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code-buddy/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

The setup script can help you verify it's correct. Update the server name from `"claude-code-buddy"` to `"claude-code-buddy"` and the path accordingly.

### Agent Registry
⚠️ **Agent count changed from 22 to 13**.

If you have code that references specific agent counts:
```typescript
// Before (v2.0)
expect(agentRegistry.getAllAgents()).toHaveLength(22);

// After (v2.1)
expect(agentRegistry.getAllAgents()).toHaveLength(13);
```

**Agent Categories** (unchanged):
- Development (2 agents)
- Operations (2 agents)
- Management (2 agents)
- Engineering (2 agents)
- Analysis (2 agents)
- Creative (1 agent)

## Upgrade Steps

### For Existing Installations

**1. Backup your current setup** (recommended)
```bash
git stash  # Save any local changes
git tag my-v2.0-backup  # Create backup tag
```

**2. Update repository source** (rebrand from Claude Code Buddy to Claude Code Buddy)
```bash
git remote set-url origin https://github.com/PCIRCLE-AI/claude-code-buddy.git
git fetch origin
git checkout main  # or v2.1 if tagged
npm install
```

**3. Run automated setup** (optional, to verify configuration)
```bash
./scripts/setup.sh
```

**Expected output**:
```
🚀 Claude Code Buddy - Automated Setup
======================================

✅ Node.js version: v18.x.x
✅ npm is installed
📦 Installing dependencies...
✅ Dependencies installed
📝 Creating .env file...
✅ .env created from template
ℹ️  MCP Server mode enabled - Claude Code will manage API access
🧪 Running tests...
✅ All tests passed
🔨 Building project...
✅ Build complete
✅ Setup complete!
```

**4. Verify tests pass**
```bash
npm test
```

**Expected**: 377-379 tests passing (out of 377-379 total)

**5. Update any custom code** (if you reference agent counts)
```bash
# Search for agent count references
grep -r "22 agents\|14 agents" your-custom-code/
# Update to 13 agents
```

### For Fresh Installations

Just follow the new [Quick Start Guide](guides/QUICK_START.md) - it's much faster now!

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/setup.sh
```

**Time**: ~15 minutes (down from 10-18 hours!)

## Testing Your Migration

Run the full test suite to verify everything works:

```bash
npm test
```

**Expected output**:
```
Test Files  46 passed (46)
     Tests  377 passed (377)
  Start at  XX:XX:XX
  Duration  XXs
```

**Note**: If you see slightly different numbers (377-379 tests), that's normal - some tests are environment-dependent.

If tests fail, see [Troubleshooting](#troubleshooting).

## What Stayed the Same

✅ **Core functionality unchanged**:
- MCP server integration
- Claude Code CLI usage
- Agent capabilities
- Tool interfaces
- API integrations

✅ **No breaking changes to**:
- Environment variables (`.env` format)
- MCP server configuration (`config.json`)
- Tool usage patterns
- Existing workflows
- Agent category structure

✅ **Agent behaviors preserved**:
- Code review still checks security, performance, best practices
- RAG agent still performs vector search
- Debugger still uses systematic diagnosis
- All agent specializations unchanged

## Rollback Plan

If you need to rollback to v2.0:

```bash
# Restore previous version
git checkout my-v2.0-backup  # Or your backup tag
npm install
npm run build

# Verify rollback
npm test
```

**Note**: v2.1 doesn't make irreversible changes to your data or configuration, so rollback is safe.

**Data preserved**:
- `.env` file (compatible with v2.0)
- MCP server config (unchanged format)
- Knowledge base indices (if using RAG)
- Evolution system data (backward compatible)

## Troubleshooting

### Tests failing after upgrade

**Symptom**: Tests fail with agent count mismatches

**Solution**:
```typescript
// Update test expectations
expect(agents.length).toBe(13);  // Changed from 22

// Or update test descriptions
describe('13 agents', () => {  // Changed from '22 agents'
  // ... test code
});
```

**Search for references**:
```bash
# Find all references to old agent count
grep -r "22 agents\|22 specialized" src/ tests/
```

---

### MCP server not connecting

**Symptom**: Claude Code can't connect to MCP server

**Solution**:
```bash
# 1. Re-run setup to verify configuration
./scripts/setup.sh

# 2. Check MCP server status
claude mcp list

# 3. Verify server.js was built
ls -la dist/mcp/server.js

# 4. Rebuild if missing
npm run build

# 5. Check config.json path is absolute
cat ~/.claude/config.json

# 6. Restart Claude Code
```

---

### RAG agent not working

**Symptom**: RAG tests fail with API key errors

**Solution**:
```bash
# 1. Add OpenAI API key to .env
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env

# 2. Verify key format
cat .env | grep OPENAI_API_KEY
# Should start with sk-proj- or sk-

# 3. Test RAG agent directly
npm test -- --run src/agents/__tests__/rag-agent.test.ts
```

**Note**: RAG agent is now **optional** in v2.1. System works without it if you don't need vector search.

---

### Documentation language confusion

**Symptom**: Can't find Chinese documentation

**Solution**: All documentation is now English-only. This improves:
- International accessibility
- Consistency across documentation
- Maintainability
- Contribution from global community

**Translation tools** (if you prefer Chinese):
- Use browser translation (Chrome/Edge/Safari)
- Use DeepL or Google Translate for better technical translation
- Use GitHub's built-in translation features

---

### Setup script fails

**Symptom**: `./scripts/setup.sh` exits with errors

**Common issues**:

**1. Node.js version too old**
```bash
# Check version
node -v
# Should be v18.0.0 or higher

# Upgrade Node.js
# macOS: brew install node@18
# Ubuntu: nvm install 18
# Windows: Download from nodejs.org
```

**2. npm not found**
```bash
# Install npm (should come with Node.js)
# If missing, reinstall Node.js from nodejs.org
```

**3. Permission errors**
```bash
# Make script executable
chmod +x scripts/setup.sh

# Or run with bash
bash scripts/setup.sh
```

**4. Build failures**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### "13 agents" vs "22 agents" confusion

**Symptom**: Documentation or messages mention different agent counts

**Explanation**:
- **v2.0**: Claimed 22 agents (architectural debt - many were just prompts)
- **v2.1**: Honest 13 agents (5 real + 7 enhanced + 1 optional)

**What changed**:
- Agent count honesty (no functionality lost)
- Agent types now clearly marked (real vs. prompt-enhanced)
- All original capabilities preserved

**No action needed**: Your workflows continue to work.

---

### Performance differences after upgrade

**Symptom**: Agents seem faster/slower than before

**Explanation**: v2.1 includes:
- Improved routing logic (may be faster for some tasks)
- Better prompt optimization (may improve quality)
- Enhanced evolution system (learns from patterns)

**Expected**: Performance should be similar or better, with quality improvements.

**If slower**:
```bash
# Check evolution system metrics
# In Claude Code:
"Show evolution dashboard"

# Verify no resource constraints
npm run test:e2e:safe
```

## Support

Need help with migration?

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- 📖 **Documentation**: [README](../README.md) | [Quick Start](guides/QUICK_START.md)
- 🏗️ **Architecture**: [Overview](architecture/OVERVIEW.md)

**When reporting issues, please include**:
- Operating System (macOS/Linux/Windows)
- Node.js version (`node -v`)
- npm version (`npm -v`)
- Error messages (full output)
- Steps to reproduce

## Feedback

We'd love to hear about your migration experience! Please share:
- ✅ What went smoothly
- ❓ What was confusing
- 💡 What could be improved
- 🚀 New features you'd like to see

[Create a Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions/new)

## Migration Checklist

Use this checklist to track your migration:

### Pre-Migration
- [ ] Read this migration guide completely
- [ ] Backup current installation (`git tag my-v2.0-backup`)
- [ ] Document any custom configurations
- [ ] Note any local modifications to code

### Migration
- [ ] Pull v2.1 changes (`git checkout v2.1`)
- [ ] Run automated setup (`./scripts/setup.sh`)
- [ ] Verify tests pass (`npm test`)
- [ ] Update agent count references (if any)
- [ ] Verify MCP server connection (`claude mcp list`)

### Post-Migration
- [ ] Test basic agent functionality
- [ ] Verify RAG features (if used)
- [ ] Check evolution system dashboard
- [ ] Review new quick start guide
- [ ] Explore new architecture diagram
- [ ] Share feedback on GitHub

### Optional
- [ ] Set up RAG with new configuration
- [ ] Customize agent routing rules
- [ ] Configure evolution system parameters
- [ ] Explore new documentation structure

---

## What's Next?

After successful migration, explore new v2.1 features:

### 1. Automated Setup for Team Members
Share the simplified setup process:
```bash
# Just run one command!
./scripts/setup.sh
```

### 2. Explore Agent Types
Understand the difference between:
- **Real Implementations** (5): Actual code execution capabilities
- **Enhanced Prompts** (7): Metadata-driven prompt optimization
- **Optional Features** (1): Advanced knowledge synthesis

See [Architecture Overview](architecture/OVERVIEW.md)

### 3. Use Quick Start Guide
Perfect for onboarding new team members:
- [15-Minute Quick Start](guides/QUICK_START.md)
- Step-by-step with validation
- Common troubleshooting included

### 4. Review Architecture Diagram
Visual system overview:
- [Architecture Diagram](diagrams/architecture.md)
- Interactive Mermaid diagram
- Color-coded components

### 5. Optimize Your Workflow
Leverage evolution system:
- Track agent performance
- Learn from patterns
- Continuous optimization

---

**Migration Guide Version**: v2.1.0
**Last Updated**: 2025-12-30
**Applies to**: v2.0.x → v2.1.0
**Estimated Migration Time**: 15-30 minutes
