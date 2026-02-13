# Changelog

All notable changes to MeMesh will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.8.10] - 2026-02-14

### Documentation

- Added comprehensive development guide at `docs/DEVELOPMENT.md` covering prerequisites, setup, development workflow, testing strategy, MCP server debugging, common tasks, troubleshooting, and best practices
- Added "Real-World Examples" section to `docs/USER_GUIDE.md` with three multi-day project scenarios demonstrating cross-session memory and context preservation
- Set up TypeDoc for auto-generated API documentation with GitHub Actions deployment to GitHub Pages
- Added `typedoc.json` configuration to generate API docs to `api-docs/` directory
- Created `.github/workflows/deploy-docs.yml` for automatic API documentation deployment
- Updated `README.md` with links to new Development Guide and API Reference
- Updated `.gitignore` to exclude auto-generated `api-docs/` directory

### Fixed

- **Project Memory Isolation**: Fixed `buddy-remember` to isolate memories by project, preventing cross-project memory mixing
  - Added `allProjects` parameter to `buddy-remember` tool (default: `false`, searches only current project + global memories)
  - Modified `ProjectMemoryManager.search()` to filter by `scope:project` and `scope:global` tags
  - Updated `keywordSearch()`, `semanticSearch()`, and `hybridSearch()` to support project filtering
  - Memories are now tagged with `scope:project` (via `AutoTagger`) when stored with `projectPath` context
  - Use `buddy-remember "query" allProjects=true` to search across all projects when needed

**Issues Resolved**: #70, #69, #17

## [2.8.9] - 2026-02-12

### Documentation

- Fixed outdated version numbers across all docs (2.8.0/2.8.3 → 2.8.8)
- Replaced remaining "smart routing" and "intelligent task routing" references with accurate descriptions
- Fixed MCP config path in ARCHITECTURE.md (`~/.config/claude/` → `~/.claude/mcp_settings.json`)
- Prioritized `npm install -g @pcircle/memesh` as recommended installation method in all guides
- Updated repo metadata (GitHub description, topics, keywords)
- Fixed outdated paths, dead links, and wrong package names across docs
- Rebuilt CHANGELOG with complete v2.0.0–v2.8.8 history

### Fixed

- Fixed `release.sh` `head -n -1` incompatibility on macOS

## [2.8.8] - 2026-02-12

### Documentation

- Rewrote README with user-first design — reorganized around user journey (Install → Verify → Use → Troubleshoot)
- Added prerequisites section, inline troubleshooting, removed jargon
- Removed vibe coder branding, improved issue reporting links

### Fixed

- Resolved remaining GitHub code scanning alerts
- Removed unused imports

## [2.8.7] - 2026-02-12

### Fixed

- Resolved all 18 GitHub code scanning alerts (insecure temp files, TOCTOU races, unused code)
- Removed unused `afterEach` import in login.test.ts

### Repository

- Dismissed 3 medium alerts as intentional (cloud sync, credential storage)
- Resolved 2 secret scanning alerts (test dummy values in deleted files)
- Cleaned up 3 stale branches (develop, feature/memesh-login, fix/device-auth-tier1-security)

## [2.8.6] - 2026-02-12

### Fixed

- **Hooks DB Path** - Resolved hooks silently failing due to hardcoded legacy path
  - Hooks now use PathResolver logic: checks `~/.memesh/` first, falls back to `~/.claude-code-buddy/`
  - Session-start, post-tool-use, and stop hooks now correctly access the active knowledge graph
- **MCP Connection** - Fixed invalid marketplace source type preventing Claude Code from connecting
  - Changed source type from invalid `'local'` to correct `'directory'` in all installation scripts
  - Updated TypeScript type definition to include all valid source types

### Security

- Resolved GitHub code scanning alerts (insecure temp files, TOCTOU race conditions, unused code)

## [2.8.5] - 2026-02-12

### Fixed

- **Plugin Installation via npm install** - Complete installation flow with backward compatibility
  - Fixed marketplace registration not happening during npm install (only happened during build)
  - Users installing via `npm install -g @pcircle/memesh` now get a fully functional plugin
  - Auto-detects install mode (global vs local dev)
  - Auto-repairs legacy v2.8.4/v2.8.3 installations on first run
  - Comprehensive plugin configuration:
    - Registers marketplace in `~/.claude/plugins/known_marketplaces.json`
    - Creates symlink to `~/.claude/plugins/marketplaces/pcircle-ai`
    - Enables plugin in `~/.claude/settings.json`
    - Configures MCP server in `~/.claude/mcp_settings.json`
  - Fixed pre-deployment check treating plugin as standalone MCP server

### Technical

- Implemented TDD with 20 tests (10 unit + 9 integration, 100% passing)
- Created `scripts/postinstall-lib.ts` with core installation functions
- Fixed ESM compatibility issues (replaced `__dirname` with proper ESM patterns)

## [2.8.4] - 2026-02-10

### Added

- **Device Auth Login** - `memesh login` / `memesh logout` CLI commands with device auth flow
- Secure stdin input for manual API key entry

## [2.8.3] - 2026-02-09

### Fixed

- **Version Reporting** - MCP server now correctly reports version from package.json instead of hardcoded "2.6.6"
  - Replaced import assertion syntax with `fs.readFileSync` for cross-environment compatibility

## [2.8.2] - 2026-02-08

### Added

- **WCAG AA Compliance** - Color contrast verification following WCAG 2.1 Level AA
- **Screen Reader Support** - JSON event emission via `MEMESH_SCREEN_READER=1` environment variable
- Accessibility documentation at `docs/ACCESSIBILITY.md`
- Contrast verification script: `npm run verify:contrast`

## [2.8.1] - 2026-02-08

### Fixed

- **Build Artifacts Cleanup** - Removed legacy secret-types files from build output
  - Cleaned up `dist/memory/types/secret-types.*` files deprecated in v2.8.0
  - No functional changes - purely build artifact cleanup

## [2.8.0] - 2026-02-08

### ⚠️ Breaking Changes

- **MCP Tool Naming Unification** - All non-core tools now use `memesh-*` prefix
  - `buddy-record-mistake` → `memesh-record-mistake`
  - `create-entities` → `memesh-create-entities`
  - `hook-tool-use` → `memesh-hook-tool-use`
  - `generate-tests` → `memesh-generate-tests`

  **Migration**: Old names still work via aliases with deprecation warnings. Aliases will be removed in v3.0.0. See [UPGRADE.md](docs/UPGRADE.md) for details.

### Added

- **Vector Semantic Search** - Find memories by meaning, not just keywords
  - `buddy-remember` supports `mode`: `semantic`, `keyword`, `hybrid` (default)
  - `minSimilarity` parameter for quality filtering (0-1 threshold)
  - Uses all-MiniLM-L6-v2 ONNX model (384 dimensions, runs 100% locally)
  - Backfill script for existing entities: `npm run backfill-embeddings`
- **Alias System** - Backward compatibility for renamed tools with deprecation warnings

### Removed

- **A2A Local Collaboration** - Simplified to local-first architecture
  - Removed 35 A2A-related files (daemon, socket server, distributed task queue)
  - Focus on single-agent local memory management

### Changed

- **Tool Count**: 18 → **8 tools** (3 buddy commands + 4 memesh tools + 1 cloud sync)

### Technical

- New `src/embeddings/` module with ModelManager, EmbeddingService, VectorExtension
- Added sqlite-vec, onnxruntime-node, @xenova/transformers dependencies
- ToolRouter with alias resolution and deprecation warnings

## [2.7.0] - 2026-02-04

### Added
- Daemon socket cleanup on exit/crash - prevents stale socket issues
- Exception handlers (uncaughtException, unhandledRejection) for graceful daemon shutdown

### Changed
- **Memory retention periods**: Session 7→30 days, Project 30→90 days
- Auto-memory hooks improvements

### Fixed
- Stale daemon socket causing MCP connection failures in new sessions

## [2.6.6] - 2026-02-03

### Fixed
- GitHub Actions npm publish workflow - replaced invalid GitHub API method with logging

## [2.6.5] - 2026-02-03

### Added
- Enhanced post-install messaging with quick-start guide
- Unified getting-started guide (docs/GETTING_STARTED.md)
- Comprehensive PathResolver tests (47 tests, 100% coverage)
- Professional error formatting with category badges

### Fixed
- **Critical**: Fixed 4 hardcoded `~/.claude-code-buddy/` paths to use PathResolver
- Fixed 14 failing errorHandler tests to match new API structure

## [2.6.0] - 2026-01-31

### Changed
- Code quality improvements
- Documentation updates

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

## [2.3.1] - 2026-01-30

### Fixed
- MCP server lifecycle
- Verification script updates

## [2.3.0] - 2026-01-30

### Added
- NPM package support

### Changed
- Installation improvements

## [2.2.1] - 2026-01-30

### Fixed
- MCP stdio communication
- Build process improvements

## [2.2.0] - 2026-01-20

### Added
- Evidence-based guardrails
- Quality gates

### Changed
- Improved E2E test reliability

## [2.0.0] - 2026-01-01

### Added
- Initial MCP server implementation
- Core memory management
- Knowledge graph storage

---

For detailed changes, see the [commit history](https://github.com/PCIRCLE-AI/claude-code-buddy/commits/main).
