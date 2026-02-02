# MeMesh - Official Marketplace Submission

## Plugin Information

**Plugin Name**: `memesh`
**Display Name**: MeMesh
**Version**: 2.6.3
**License**: AGPL-3.0

## Links

- **Homepage**: https://memesh.pcircle.ai
- **GitHub Repository**: https://github.com/PCIRCLE-AI/claude-code-buddy
- **npm Package**: https://www.npmjs.com/package/@pcircle/memesh
- **Documentation**: https://github.com/PCIRCLE-AI/claude-code-buddy/tree/main/docs

## Contact

- **Owner**: PCIRCLE AI
- **Email**: support@pcircle.ai
- **Maintainer**: KT (Kevin Tseng)

## Description

### Short Description (< 100 chars)
MeMesh - Your AI memory mesh for Claude Code. Persistent memory and intelligent task management.

### Full Description

MeMesh is the only MCP server that actually remembers everything across sessions. It transforms Claude Code from a stateless assistant into a persistent AI teammate with perfect memory.

**Core Features:**
1. **Project Memory That Works** - Remembers architecture decisions, past conversations, and design choices forever
2. **Smart Task Routing** - Automatically detects task types and applies best practices
3. **Prompt Enhancement** - Optimizes prompts for better results
4. **Zero Configuration** - Works out of the box with sensible defaults

**Perfect For:**
- Developers tired of repeating context every session
- Teams needing consistent AI assistance
- Anyone who wants Claude to remember past decisions

## Installation

```bash
# From Official Marketplace (after approval)
/plugin install claude-code-buddy@claude-plugins-official

# From GitHub Marketplace
/plugin marketplace add PCIRCLE-AI/claude-code-buddy
/plugin install claude-code-buddy@pcircle-ai

# Quick Install (local)
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
./scripts/quick-install.sh
claude --plugin-dir /path/to/claude-code-buddy
```

## Features

### 1. Persistent Project Memory
- Knowledge graph with semantic search
- Stores architecture decisions, design patterns, and lessons learned
- Cross-session recall with `buddy-remember` command

### 2. Smart Task Routing
- Automatically detects task complexity
- Routes to appropriate model (Opus/Sonnet/Haiku)
- Applies domain-specific best practices

### 3. Developer Tools
- 7 MCP tools for memory and task management
- Integrated with Claude Code's plugin system
- Zero external API calls - 100% local

## Security & Privacy

- ✅ **100% Local Processing** - No data leaves your machine
- ✅ **Zero External API Calls** - Uses your Claude Code subscription
- ✅ **Open Source** - Auditable code (AGPL-3.0)
- ✅ **No Telemetry** - Your data stays private
- ✅ **npm audit: 0 vulnerabilities**

## Quality Standards

- ✅ **Type-Safe** - Full TypeScript implementation
- ✅ **Well-Tested** - Comprehensive test suite
- ✅ **Documented** - Full API reference and user guides
- ✅ **Maintained** - Active development and support
- ✅ **MCP 1.25.3 Compliant** - Follows latest MCP standards

## Plugin Structure

```
claude-code-buddy/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── plugin.json               # MCP server config
├── dist/mcp/
│   └── server-bootstrap.js   # MCP server entry point
├── src/                      # TypeScript source
├── docs/                     # Documentation
├── scripts/
│   └── quick-install.sh      # One-command setup
└── README.md                 # Full documentation
```

## Dependencies

- **Node.js**: 20+ required
- **No external APIs**: Fully self-contained
- **MCP SDK**: 1.25.3

## User Testimonials

> "Finally, an AI assistant that remembers! No more repeating myself every session."

> "MeMesh transformed my workflow. Claude now feels like a real team member."

## Support

- **GitHub Issues**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
- **Discussions**: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions
- **Documentation**: https://github.com/PCIRCLE-AI/claude-code-buddy/tree/main/docs

## Additional Notes

MeMesh is designed for:
- Solo developers and teams
- Any programming language or framework
- Both beginners and experienced developers

The plugin is actively maintained with regular updates and responsive support.

---

**Submitted by**: PCIRCLE AI
**Date**: 2026-02-02
**Version**: 2.6.3
