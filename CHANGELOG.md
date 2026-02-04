# Changelog

All notable changes to MeMesh will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation
- **Major documentation update**: Corrected all outdated installation guides
  - Fixed QUICK_INSTALL.md: Completely rewritten with correct installation priority (npm global install first)
  - Fixed tool count: 7 tools → **18 tools** (accurate count with complete list)
  - Removed misleading Plugin Installation instructions (--plugin-dir flag)
  - Removed Cursor and VS Code installation instructions (not officially supported)
  - Updated README.md, GETTING_STARTED.md, and guides/QUICK_START.md for consistency
  - Corrected installation method: MCP Server mode (auto-configures mcp_settings.json), not Plugin mode

## [2.7.0] - 2026-02-04

### Added
- Daemon socket cleanup on exit/crash - prevents stale socket issues in new sessions
- Exception handlers (uncaughtException, unhandledRejection) for graceful daemon shutdown

### Changed
- **Memory retention periods updated**:
  - Session memories: 7 days → **30 days**
  - Project memories: 30 days → **90 days**
- Auto-memory hooks improvements with updated documentation

### Fixed
- Stale daemon socket causing MCP connection failures in new sessions
- Documentation accuracy - updated all outdated retention period references

### Documentation
- Updated README.md with correct memory retention information
- Updated USER_GUIDE.md version history
- Updated hooks README.md with correct retention periods
- Updated TROUBLESHOOTING.md

## [2.6.6] - 2026-02-03

### Fixed
- GitHub Actions npm publish workflow - replaced invalid GitHub API method with logging
- Fixed workflow comment step that was causing publish failures


## [2.6.5] - 2026-02-03

### Added
- Enhanced post-install messaging with comprehensive quick-start guide (53 lines, boxed output)
- Unified getting-started guide (docs/GETTING_STARTED.md) - 400+ lines, single entry point for new users
- Comprehensive PathResolver tests (47 tests, 100% statement coverage)
- Professional error formatting with category badges and boxed suggestions
- Smart response complexity detection (89% noise reduction for simple responses)
- SQLite WAL checkpoint handling in migration script
- Atomic migration pattern (temp → verify → commit)
- [X/Y] progress indicators in migration script

### Changed
- Enhanced MCP watchdog startup message (5 → 65 lines) with helpful configuration guidance
- Improved migration script (277 → 431 lines, +56%) with safety guarantees and actionable next steps
- Updated errorHandler to return structured objects with category and example fields
- ResponseFormatter now adaptively formats based on content complexity

### Fixed
- **Critical**: Fixed 4 hardcoded ~/.claude-code-buddy/ paths to use PathResolver
  - src/management/UninstallManager.ts
  - src/utils/toonify-adapter.ts
  - src/telemetry/TelemetryStore.ts
  - src/ui/MetricsStore.ts
- Fixed 14 failing errorHandler tests to match new API structure
- All tests now passing (25/25 errorHandler, 47/47 PathResolver)

### Documentation
- Added comprehensive GETTING_STARTED.md guide
- Updated docs/README.md with getting-started link
- Created detailed release notes

### Quality
- Code review score: 95/100 (EXCELLENT)
- 0 critical issues, 0 major issues, 3 minor issues
- 100% backward compatibility maintained
- No breaking changes


## [2.8.0] - 2026-02-01

### Changed
- Simplified Evolution System for MCP architecture compliance
- Delegated intelligence logic to external LLMs

### Removed
- Intelligence components (adaption, learning engines)
- Auto-tagging and semantic search features

## [2.7.0] - 2026-01-31

### Changed
- Enhanced memory system architecture
- Improved query performance

## [2.6.0] - 2026-01-31

### Changed
- Code quality improvements
- Documentation updates

### Fixed
- Minor bug fixes

## [2.5.3] - 2026-01-31

### Fixed
- Bug fixes and stability improvements

## [2.5.2] - 2026-01-31

### Fixed
- Bug fixes and stability improvements

## [2.5.1] - 2026-01-31

### Fixed
- Bug fixes and stability improvements

## [2.5.0] - 2026-01-30

### Added
- Process management tools
- Internationalization improvements

### Changed
- Code comments converted to English
- Enhanced pre-publish testing

## [2.4.2] - 2026-01-30

### Fixed
- Build configuration issues

## [2.4.1] - 2026-01-30

### Fixed
- MCP resources distribution

## [2.4.0] - 2026-01-30

### Added
- Enhanced testing system
- Hook integration improvements

### Changed
- Improved error handling

## [2.3.1] - 2026-01-30

### Fixed
- MCP server lifecycle
- Verification script updates

## [2.3.0] - 2026-01-30

### Added
- NPM package support
- Cursor IDE integration

### Changed
- Installation improvements

## [2.2.1] - 2026-01-30

### Fixed
- MCP stdio communication
- Build process improvements

## [2.2.0] - 2026-01-20

### Added
- Evidence-based guardrails
- Quality gates for smart plans

### Changed
- Improved E2E test reliability
- Enhanced security measures

## [2.0.0] - 2026-01-01

### Added
- Initial MCP server implementation
- Core memory management
- Agent routing system

---

For detailed changes, see the [commit history](https://github.com/PCIRCLE-AI/claude-code-buddy/commits/main).
