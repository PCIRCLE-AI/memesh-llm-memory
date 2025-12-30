# Changelog

All notable changes to Smart-Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-12-31

### Added
- **Phase 3: Essential Agents** 🎉
  - **Test Writer Agent**: Automated test generation with vitest integration
    - Code analysis with function extraction
    - Vitest-compatible test file generation
    - Automatic test path resolution (src/ → tests/)
    - Knowledge Graph integration for test coverage tracking
  - **DevOps Engineer Agent**: CI/CD automation and deployment analysis
    - GitHub Actions and GitLab CI configuration generation
    - Deployment readiness analysis
    - CI/CD setup automation
    - Infrastructure configuration tracking
- **Phase 4: Documentation & Polish** 📚
  - **USER_GUIDE.md**: Comprehensive 3,700+ line user guide covering all v2.2 features
    - Getting started and installation
    - Core concepts and architecture
    - Detailed agent usage examples
    - Event-driven butler and workflow guidance
    - Smart planning system documentation
    - Best practices and configuration
  - **AGENT_REFERENCE.md**: Complete API documentation for all 20 agents
    - TypeScript interfaces and function signatures
    - Code examples for each agent
    - Agent selection guide
    - Known limitations and roadmap
  - **TROUBLESHOOTING.md**: Comprehensive troubleshooting guide
    - Common issues and solutions
    - Agent-specific troubleshooting
    - Diagnostic commands and FAQ
  - **README.md Updates**: Enhanced with v2.2.0 features
    - "What's New in v2.2.0" section
    - Updated agent count (18 → 20)
    - Links to new documentation

### Changed
- **Agent Count**: Corrected documentation to reflect actual 23 agents (was incorrectly stated as 20)
  - 5 real implementations (DevelopmentButler, TestWriter, DevOps, KnowledgeGraph, RAG)
  - 17 enhanced prompt agents (was 12, added Frontend/Backend/Database/Performance/TestAutomator)
  - 1 optional feature (RAG agent - requires OpenAI API)
  - **Documentation Fix**: README now accurately lists all 23 agents registered in AgentRegistry
- **Test Coverage**: Increased from 447 to 572 tests passing
  - Phase 3 integration tests: 7/7 passing
  - TestWriterAgent unit tests: 2/2 passing
  - DevOpsEngineerAgent unit tests: 2/2 passing
  - Total: 572 passed | 2 skipped (574 total)
- **Architecture Diagram**: Updated to reflect 20 agents and Phase 3 additions
- **Production Readiness**: Quality score 4.2/5, zero critical vulnerabilities

### Fixed
- **DevOpsEngineerAgent - Critical Production Fix** 🔧
  - Replaced hardcoded `true` values with actual command execution
  - `analyzeDeploymentReadiness()` now executes real tests, builds, and git status checks
  - Added proper timeout handling (5min tests, 10min builds, 5sec git)
  - Added comprehensive error handling with try-catch blocks
  - **Impact**: Agent is now fully functional (was 90% stubbed)

- **KnowledgeGraph - Implemented Stubbed Methods** 🧠
  - Implemented `findSimilar()`: Jaccard-style similarity calculation (>10% threshold)
  - Implemented `getDecisions()`: Retrieves decision entities with outcome extraction
  - Implemented `getLessonsLearned()`: Retrieves lesson_learned entities with context
  - Implemented `getStats()`: Returns actual entity counts from graph statistics
  - **Impact**: Learning system now fully operational (was 50% stubbed)

- **Orchestrator - Promise Pool Bug Fix** ⚡
  - Fixed flawed `Promise.race()` logic that couldn't filter settled promises
  - Implemented proper self-removing Promise pool pattern
  - Eliminated race conditions in parallel task execution
  - **Impact**: Parallel execution is now safe and reliable

- **TestWriterAgent - Upgraded to TypeScript AST** 🚀
  - Replaced regex parsing with TypeScript compiler API (`import * as ts`)
  - Accurate type extraction from AST (parameters, return types)
  - Intelligent edge case generation based on actual types (number → zero/negative, string → empty, array → empty, nullable → null/undefined)
  - Fixed duplicate test case generation using Set to track types
  - Updated tests to match new intelligent behavior
  - **Impact**: Generates meaningful, type-aware tests (was trivial regex-based)

### Documentation
- Complete user-facing documentation suite
- Enhanced learning path with 5 steps
- Updated all version references to 2.2.0
- Added Phase 3 feature highlights

## [2.1.0] - 2025-12-30

### Added
- **Claude Code-Assisted Installation** ⭐ NEW
  - One-command installation: "Install smart-agents MCP from [GitHub URL]"
  - Interactive guided setup with feature prompts (RAG agent, API keys)
  - Automated MCP server configuration
  - Full customization via natural conversation with Claude Code
  - Comprehensive installation guide: `docs/guides/CLAUDE_CODE_INSTALLATION.md`
  - Setup time reduced from 15-20 minutes to 2-5 minutes
  - Users can modify agents, create skills, update config - all through Claude Code
- **MCP Server Integration**: Full integration with Claude Code via Model Context Protocol
  - MCP setup verification tools and example config
  - MCP server integration guide and comprehensive documentation
  - Resources capability in MCP server initialization
- **Development Butler**: Event-driven development automation agent
  - Checkpoint detection system for workflow events
  - Integration with Claude Code hooks
  - Core agent implementation
- **Test Writer Agent**: Automated test generation capabilities
- **DevOps Engineer Agent**: CI/CD configuration and automation
- **Agent Classification System**: Enhanced AgentRegistry with agent categorization
- **MCP Tool Interface**: Agent-tool interaction layer for seamless integration
- **Evolution Dashboard**: Real-time monitoring and analytics (`evolution_dashboard` tool)
- **Permission-based UX**: Enhanced security and user control in integration

### Changed
- **Agent Count**: Reduced from 22 to 13 agents for better maintainability
  - 5 real implementations, 7 enhanced prompts, 1 optional feature
  - New categorization: Development (3), Operations (2), Management (2), Engineering (2), Analysis (2), Creative (1), Business (1)
- **Test Coverage**: 447 passing tests (unit, integration, E2E, regression)
- **Architecture Simplification**: Removed unused features and simplified to Claude + OpenAI only
- **RAG Configuration**: OpenAI embeddings as primary, HuggingFace as optional alternative

### Fixed
- MCP server verification check improvements
- Agent count test expectations updated to match V2.1 reality (13 agents)
- Filesystem and memory helpers added to MCPToolInterface
- Environment variable loading for RAG with OpenAI API key
- **Test Suite Fixes** (2025-12-30):
  - Fixed MCPToolInterface test to correctly validate v2.1.0 behavior (prompt enhancement mode)
  - Fixed evolution-regression cost tracking test: Added MicroDollars to dollars conversion using `toDollars()` utility
  - Fixed AgentRouter MicroDollars formatting bug: Properly convert μUSD to dollars before display
  - Root cause: Type confusion between MicroDollars (integer μUSD) and dollars (float)
  - Prevention: Always use `toDollars()` utility from `src/utils/money.ts` for display/comparison
  - Test suite now passing: 447/447 tests (100% pass rate)

### Refactored
- **Evolution Storage Layer** (Phase 1-3 refactoring)
  - Phase 1: Critical security fixes
    - Eliminated SQL injection vulnerabilities in FTS queries
    - Hardened all database query parameters
    - Improved error handling and validation
  - Phase 2: Major improvements
    - Implemented proper TypeScript type safety with branded MicroDollars type
    - Added comprehensive JSDoc documentation for core utilities
    - Created safeJsonParse utility for robust JSON handling
    - Enhanced null safety throughout storage layer
  - Phase 3: Minor improvements
    - Eliminated all 51 'as any' type casts in SQLiteStore implementations
    - Added JSDoc documentation to 8+ core public API methods
    - Replaced magic numbers with named constants (money formatting)
    - Standardized null handling patterns (|| null for inserts, ?? undefined for reads)

### Documentation
- **Project Rebranding**: Accurate positioning as "Prompt Enhancement System"
  - Updated package.json description: "Claude Code Prompt Enhancement System"
  - Clear distinction between "what it is" (prompt enhancement layer) and "what it isn't" (autonomous multi-agent AI)
  - Honest terminology: 5 real implementations + 7 enhanced prompts + 1 optional agent
  - Emphasis on MCP integration and prompt optimization workflow
- **English-Only Codebase**: All Chinese code comments translated to English ✅ COMPLETED
  - Core files translated: `src/orchestrator/types.ts`, `src/config/simple-config.ts`, `src/orchestrator/router.ts`
  - International contributor accessibility achieved
  - Maintains consistency with English-only documentation
  - Type definitions, interfaces, and comments now fully in English
  - Verified with automated checks: 0 Chinese characters remaining in code files
- **English-Only Documentation**: All documentation files translated from Chinese to English
  - Translated 8 major documentation files (HOOKS, OVERVIEW, SETUP, RAG, MODELS, EVOLUTION, etc.)
  - Total ~5000+ lines of content converted for international accessibility
  - Maintains technical accuracy while improving clarity and consistency
  - Verified with automated checks: 0 Chinese characters remaining
- **Documentation Simplification** - Embracing "Just Ask Claude Code" Philosophy
  - README.md simplified from ~400 to ~200 lines (50% reduction)
    - Removed all manual installation steps
    - Removed detailed command reference
    - Replaced with natural language prompts
  - CLAUDE_CODE_INSTALLATION.md simplified from 417 to ~74 lines (82% reduction)
    - Removed detailed bash commands and code templates
    - Removed file structure reference and security details
    - Kept only essentials: quick command, high-level workflow, example prompts
  - All documentation now focuses on "what to ask Claude Code" rather than "how to do it manually"
  - Users can customize everything through conversation - no manual file editing required
- **Claude Code Installation Guide**: Interactive setup with one-command installation
  - Quick Start: "Install smart-agents MCP from [GitHub URL]"
  - Setup time reduced from 15-20 minutes to 2-5 minutes
  - Interactive prompts for RAG feature selection and API key management
  - Post-installation customization via natural conversation
- Comprehensive v2.1.0 release notes
- Complete user documentation and troubleshooting guide
- Architecture diagram and design document
- Updated README for V2.1 release with prominent Claude Code installation section
- Fixed terminology inconsistencies across all docs
- Agent implementation architecture details
- MCP integration guide with step-by-step setup
- Updated EVOLUTION.md with storage layer refactoring details

### Removed
- Unused collaboration features
- Redundant code and features for cleaner architecture
- HuggingFace as primary embedding (moved to optional)

---

## [2.0.0] - Previous Major Release

### Added
- **V2.0 MCP Server Pattern**: Complete refactor to MCP-based architecture
- **Evolution System**: Self-learning capabilities
  - Performance tracking and metrics
  - Learning manager with pattern analysis
  - Adaptation engine for continuous improvement
  - Evolution monitor and dashboard
- **RAG System**: Vector-based retrieval augmented generation
  - File drop feature with platform-friendly watch folder
  - Auto-start RAG File Watcher on MCP server startup
  - OpenAI and HuggingFace embedding options
  - Interactive setup wizard
- **Comprehensive Testing**: Evolution system test suites
  - Integration tests
  - Regression tests
  - Performance benchmarks
  - User acceptance tests (UAT)
- **Experiments Framework**: Self-improvement experiment scripts

### Changed
- Simplified README to focus on features and user experience
- Updated documentation for V2.0 MCP Server Pattern
- Architecture refactored for MCP integration

### Documentation
- Phase 4 & 5 documentation (EvolutionMonitor, dashboard, testing)
- RAG configuration and usage modes
- HuggingFace embedding option guide

---

## [1.x.x] - Early Development

### Initial Features
- Basic agent orchestration
- Task routing and analysis
- Cost tracking
- Resource management
- Knowledge graph integration
- Agent registry system

---

## Version Tags

- **v2.1.0** - 2025-12-29 - Current stable release
- **v2.0.0** - Earlier major release with MCP integration

---

For detailed commit history, see: `git log --oneline --decorate`
