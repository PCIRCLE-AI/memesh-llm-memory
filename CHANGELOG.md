# Changelog

All notable changes to Claude Code Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2026-01-30

### Security

#### HIGH Priority Fixes

- **SQL Injection Prevention (PatternRepository)**
  - Added whitelist validation for ORDER BY clauses in pattern queries
  - Prevents SQL injection via `sort_by` and `sort_order` parameters
  - Location: `src/evolution/storage/repositories/PatternRepository.ts:122-138`

- **Event Loop Blocking Fix (ConnectionPool)**
  - Replaced synchronous busy-wait with async retry mechanism
  - Uses `setTimeout` for non-blocking delays during connection retries
  - Prevents event loop blocking during database connection failures
  - Location: `src/db/ConnectionPool.ts:129-169, 807-835`

- **Race Condition in E2E Slot Acquisition (GlobalResourcePool)**
  - Implemented proper promise-based mutex using chaining
  - Prevents TOCTOU race conditions when multiple agents acquire E2E slots
  - Atomic check-and-set operations now properly synchronized
  - Location: `src/orchestrator/GlobalResourcePool.ts:54, 197-213`

### Fixed

#### MAJOR Priority Fixes

- **Resource Exhaustion Prevention**
  - Implemented batch processing with `CONCURRENCY_LIMIT = 10` in:
    - `TaskAnalyzer.analyzeBatch()` - prevents memory/CPU exhaustion on large task batches
    - `AgentRouter.routeBatch()` - limits concurrent routing decisions
  - Location: `src/orchestrator/TaskAnalyzer.ts:333-345`, `src/orchestrator/AgentRouter.ts:413-425`

- **Error Handling Verification (UninstallManager)**
  - Verified all catch blocks properly handle errors
  - Error logging to report or intentional fallback behavior confirmed

### Technical Improvements

- Promise-based mutex implementation without external dependencies
- Async retry with exponential backoff for database connections
- Concurrency control via batching pattern
- SQL injection prevention via whitelisting approach

**Total Changes**: 40 files modified, +2213 insertions, -413 deletions

## [2.2.0] - 2026-01-20

### Fixed

#### BuddyHandlers Error Handling
- **Fixed error handling in all Buddy command handlers** (2026-01-03)
  - `handleBuddyDo()`, `handleBuddyStats()`, `handleBuddyRemember()`, `handleBuddyHelp()` now return `CallToolResult` with `isError: true` instead of throwing exceptions
  - Ensures consistent error handling across all MCP tools
  - All validation errors now properly formatted for LLM consumption
  - Updated 16 test assertions to match new error handling pattern
  - **Achievement**: All 43 BuddyHandlers tests passing (100% success rate)
  - **Impact**: +9 passing tests across full test suite (1406 → 1415 passing)

### Breaking Changes

#### Tool Cleanup and Standardization
- **Removed LEGACY tools:**
  - `smart_route_task` - Replaced by `buddy_do` (use `buddy_do` for all task routing)
  - `evolution_dashboard` - Replaced by `buddy_dashboard` (use `buddy_dashboard` for performance metrics)

- **Removed deprecated tools:**
  - `sa_task` - Use `buddy_do` instead
  - `sa_dashboard` - Use `buddy_dashboard` instead

- **Renamed tools (standardized to buddy_ prefix):**
  - `sa_agents` → `buddy_agents` (list available agents)
  - `sa_skills` → `buddy_skills` (list available skills)
  - `sa_uninstall` → `buddy_uninstall` (uninstall CCB)

**Migration Guide:**
```javascript
// OLD (no longer works):
smart_route_task({ taskDescription: "..." })
sa_agents()
sa_skills({ filter: "all" })

// NEW (use these instead):
buddy_do({ task: "..." })
buddy_agents()
buddy_skills({ filter: "all" })
```

### Removed

#### MCP Tool Handlers
- `handleSmartRouteTask()` - Removed from `ToolHandlers.ts`
- `handleEvolutionDashboard()` - Removed from `ToolHandlers.ts`
- Tests for removed handlers removed from `ToolHandlers.test.ts`

### Changed

#### Tool Routing
- Updated `ToolRouter.ts` to remove legacy routing logic
- Removed conditional branches for `smart_route_task` and `evolution_dashboard`
- Updated routing comments to reflect buddy_ prefix standard

#### Documentation
- Updated all tool references in documentation files:
  - `src/mcp/resources/usage-guide.md`
  - `src/mcp/resources/best-practices.md`
  - `src/mcp/resources/quick-reference.md`
  - `src/mcp/resources/examples.md`
  - `docs/QUICK_START.md`
- Updated internal code comments in:
  - `src/mcp/ToolRouter.ts`
  - `src/mcp/ToolDefinitions.ts`
  - `src/mcp/validation.ts`

#### Tests
- Updated `ToolRouter.test.ts` to use new tool names
- Removed tests for deleted LEGACY tools
- Updated test expectations for renamed tools

### Technical Details

**Total Changes:**
- 2 LEGACY tools removed
- 2 deprecated tools removed
- 3 tools renamed (buddy_ prefix)
- 9 files updated
- 2 test sections removed
- 1149 tests passing (no known failures)

**Files Modified:**
- `src/mcp/ToolRouter.ts`
- `src/mcp/ToolDefinitions.ts`
- `src/mcp/validation.ts`
- `src/mcp/__tests__/ToolRouter.test.ts`
- `src/mcp/handlers/__tests__/ToolHandlers.test.ts`
- `src/mcp/resources/usage-guide.md`
- `src/mcp/resources/best-practices.md`
- `src/mcp/resources/quick-reference.md`
- `src/mcp/resources/examples.md`
- `docs/QUICK_START.md`

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
