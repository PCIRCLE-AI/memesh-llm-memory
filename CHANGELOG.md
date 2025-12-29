# Changelog

All notable changes to Smart-Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-12-29

### Added
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
- **Agent Count**: Reduced from 22 to 14 agents for better maintainability
  - 5 real implementations, 8 enhanced prompts, 1 optional feature
  - New categorization: Development (3), Operations (2), Management (2), Engineering (2), Analysis (2), Creative (1), Business (1)
- **Test Coverage**: 447 passing tests (unit, integration, E2E, regression)
- **Architecture Simplification**: Removed unused features and simplified to Claude + OpenAI only
- **RAG Configuration**: OpenAI embeddings as primary, HuggingFace as optional alternative

### Fixed
- MCP server verification check improvements
- Agent count test expectations updated to match V2.1 reality (13 → 14 agents)
- Filesystem and memory helpers added to MCPToolInterface
- Environment variable loading for RAG with OpenAI API key

### Documentation
- Comprehensive v2.1.0 release notes
- Complete user documentation and troubleshooting guide
- Architecture diagram and design document
- Updated README for V2.1 release
- Fixed terminology inconsistencies across all docs
- Agent implementation architecture details
- MCP integration guide with step-by-step setup

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
