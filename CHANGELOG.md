# Changelog

All notable changes to Claude Code Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-01

### Major Rebrand: claude-code-buddy → Claude Code Buddy (CCB)

**Breaking Changes:**
- Project renamed from "claude-code-buddy" to "Claude Code Buddy (CCB)"
- MCP server name changed: `claude-code-buddy` → `claude-code-buddy`
- Package name updated to reflect new branding

**Note:** This is the initial public release, so while technically a "rebrand," there are no existing users to migrate.

### Added

#### New User-Friendly Command Layer
- **\`buddy do <task>\`** - Execute tasks with smart routing (Ollama vs Claude)
  - Analyzes task complexity automatically
  - Routes simple tasks to Ollama (fast & free)
  - Routes complex tasks to Claude (high quality)
  - Supports aliases: \`help-with\`, \`execute\`, \`run\`, \`task\`
- **\`buddy stats [period]\`** - Performance dashboard
  - Shows token usage and cost savings
  - Displays routing decisions (Ollama vs Claude breakdown)
  - Supports periods: \`day\`, \`week\`, \`month\`, \`all\`
  - Aliases: \`dashboard\`, \`metrics\`, \`performance\`
- **\`buddy remember <query> [limit]\`** - Project memory recall
  - Searches knowledge graph for past decisions
  - Retrieves architecture choices and patterns
  - Configurable result limit (1-50, default: 5)
  - Aliases: \`recall\`, \`retrieve\`, \`search\`, \`find\`
- **\`buddy help [command]\`** - Command documentation
  - Shows all commands or specific command help
  - Includes usage examples and aliases
  - Provides parameter descriptions

#### MCP Tool Implementations
- \`buddy_do\` - MCP tool for task execution
- \`buddy_stats\` - MCP tool for performance metrics
- \`buddy_remember\` - MCP tool for memory recall
- \`buddy_help\` - MCP tool for help system

#### Command Infrastructure
- \`BuddyCommands\` class - Command parsing and routing
  - Handles 25+ command aliases
  - Case-insensitive command matching
  - Automatic "buddy" prefix removal
  - Unknown command fallback to help
- Tool handler architecture:
  - Zod schema validation for all inputs
  - Consistent error handling
  - Formatted response system
  - Dependency injection pattern

### Changed

#### Core Infrastructure
- **MCP Server Class:**
  - Class name: \`SmartAgentsMCPServer\` → \`ClaudeCodeBuddyMCPServer\`
  - Server name in MCP registration: \`claude-code-buddy\` → \`claude-code-buddy\`
  - Server version: \`1.0.0\` → \`2.0.0\`
  - Console messages updated to reflect new branding

#### Documentation
- **README.md:**
  - Title updated to "Claude Code Buddy (CCB)"
  - Tagline: "Your friendly AI companion for Claude Code"
  - Added buddy commands reference section
  - Updated all examples to use new naming
  - Installation instructions updated
  - Removed API key requirement note (uses Claude Code subscription)
  - Updated architecture diagrams
  - Clarified limitations section
- **New Documentation Files:**
  - \`docs/COMMANDS.md\` - Comprehensive command reference (250+ lines)
    - All buddy commands documented
    - MCP tools reference
    - Command aliases list
    - Usage examples and best practices
    - Troubleshooting guide
  - \`CHANGELOG.md\` - Version history (this file)

#### Installation
- Repository URL: \`claude-code-buddy.git\` → \`claude-code-buddy.git\`
- Directory name: \`claude-code-buddy/\` → \`claude-code-buddy/\`
- No API keys required - uses Claude Code subscription via MCP

### Technical Details

#### Files Modified
- \`package.json\` - Name, version, description updated
- \`src/mcp/server.ts\` - Class name, server registration, tool integrations
- \`README.md\` - Complete rebrand with buddy commands
- \`.gitignore\` - Added package.json.backup

#### Files Created
- \`src/mcp/BuddyCommands.ts\` (248 lines) - Command parsing layer
- \`tests/mcp/BuddyCommands.test.ts\` (7 tests) - Command parser tests
- \`src/mcp/tools/buddy-do.ts\` (67 lines) - Task execution tool
- \`src/mcp/tools/buddy-stats.ts\` (83 lines) - Performance dashboard tool
- \`src/mcp/tools/buddy-remember.ts\` (97 lines) - Memory recall tool
- \`src/mcp/tools/buddy-help.ts\` (67 lines) - Help system tool
- \`docs/COMMANDS.md\` (250+ lines) - Command reference documentation
- \`CHANGELOG.md\` - This changelog

#### Test Coverage
- BuddyCommands: 7/7 tests passing
  - Command parsing validation
  - Alias resolution
  - Unknown command handling
  - Prefix removal (optional "buddy")

### Migration Guide

**For New Users:**
- No migration needed - this is the initial public release
- Follow installation guide in README.md
- Use buddy commands from the start

**For Developers (Internal):**
1. Update git remote if needed:
   \`\`\`bash
   git remote set-url origin https://github.com/yourusername/claude-code-buddy.git
   \`\`\`
2. Update local repository name:
   \`\`\`bash
   # Rename directory if desired
   mv claude-code-buddy claude-code-buddy
   \`\`\`
3. Reinstall dependencies:
   \`\`\`bash
   npm install
   npm run build
   \`\`\`
4. Update Claude Code MCP config:
   \`\`\`bash
   # Update ~/.claude/config.json
   # Change "claude-code-buddy" to "ccb" or "claude-code-buddy"
   \`\`\`

### Commits

**Phase 0: Auto-Installation System**
- \`bdbb832\` - feat(install): add interactive installation script with auto-config

**Phase 1: Foundation**
- \`e40d0e1\` - feat(core): rename package to claude-code-buddy (v2.0.0)
- \`fec938e\` - refactor(mcp): rename SmartAgentsMCPServer to ClaudeCodeBuddyMCPServer

**Phase 2: New Command Layer**
- \`da31682\` - feat(commands): add user-friendly buddy command layer
- \`9408580\` - feat(mcp): integrate buddy commands into MCP server (Task 2.2)

**Phase 3: Documentation & Migration**
- (Current) - docs: update README and create command reference

### Breaking Changes Summary

**None for end users** - This is the initial release.

**For developers:**
- Package name changed (affects imports if used as dependency)
- MCP server name changed (affects Claude Code config)
- Class names changed (affects code extending the server)

### Known Issues

- Pre-existing SQLiteStore compilation errors (unrelated to rebrand)
  - Location: \`src/evolution/storage/SQLiteStore.enhanced.ts\`
  - Impact: None on buddy tools functionality
  - Status: Pre-existing, will be addressed separately

### TODO / Roadmap

**Phase 4: Testing & Validation** (Next)
- Run integration tests
- Full test suite verification
- Manual testing of buddy commands via Claude Code

**Phase 5: Release**
- Create Git tag v2.0.0
- Create GitHub release with release notes
- Publish to npm (if applicable)

**Future Enhancements:**
- Implement actual token tracking for \`buddy_stats\` (currently placeholder data)
- Add more buddy commands based on user feedback
- Expand command alias system
- Integration with ProjectMemoryManager for enhanced memory features

---

## Development

**Testing:**
\`\`\`bash
npm test                          # Run all tests
npm test -- tests/mcp/BuddyCommands.test.ts  # Test command parser
npm run build                     # Build project
\`\`\`

**Contributing:**
See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

---

**Links:**
- [GitHub Repository](https://github.com/yourusername/claude-code-buddy)
- [Installation Guide](docs/INSTALL.md)
- [Command Reference](docs/COMMANDS.md)
- [Examples](docs/EXAMPLES.md)
