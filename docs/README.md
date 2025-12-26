# Smart Agents Documentation

**Welcome to the Smart Agents documentation!**

This directory contains all project documentation organized by category for easy navigation.

---

## 📚 Documentation Structure

### 🏗️ [Architecture](./architecture/)
System architecture, design patterns, and data flow documentation.

- **[System Architecture](./architecture/SYSTEM_ARCHITECTURE.md)** - Five-layer architecture overview
- **[Async Execution](./architecture/ASYNC_EXECUTION.md)** - Non-blocking task execution design
- **[Data Flow](./architecture/DATA_FLOW.md)** - Request/response patterns and failover logic

### 🤖 Core Features (V2 Month 2-3)
Advanced multi-agent systems and self-learning capabilities.

- **[Specialized Teams](./TEAMS.md)** - 4 專業團隊協作框架 (代碼開發、研究分析、品質保證、編排優化)
- **[Self-Evolving Agent](./EVOLUTION.md)** - 自主學習與行為優化系統 (PerformanceTracker, LearningManager, AdaptationEngine)

### 🎨 [Design](./design/)
UI/UX design system, branding guidelines, and component specifications.

- **[Design System](./design/DESIGN_SYSTEM.md)** - Complete design system specification
- **[Terminal UI](./design/TERMINAL_UI.md)** - Terminal interface mockups and patterns
- **[Branding](./design/BRANDING.md)** - Brand identity and visual guidelines
- **[Quick Start](./design/QUICK_START.md)** - 30-minute design implementation guide

### 🚀 [Implementation](./implementation/)
Implementation roadmap, migration guides, and technical debt tracking.

- **[Roadmap](./implementation/ROADMAP.md)** - Implementation phases and timeline
- **[Phase 1: Foundation](./implementation/PHASE_1_FOUNDATION.md)** - Month 1 completion report
- **[Phase 2: V2 Upgrade](./implementation/PHASE_2_UPGRADE_V2.md)** - Standalone product transformation
- **[Migration Guide](./implementation/MIGRATION_GUIDE.md)** - Upgrade from v1.0 to v2.0
- **[Tech Debt](./implementation/TECH_DEBT.md)** - Known issues and improvement areas

### 📖 [Guides](./guides/)
Step-by-step guides for common tasks and best practices.

- **[Getting Started](./guides/GETTING_STARTED.md)** - Beginner-friendly setup guide
- **[Testing](./guides/TESTING.md)** - Testing strategies and best practices
- **[E2E Testing](./guides/E2E_TESTING.md)** - End-to-end testing guide
- **[Resource Management](./guides/RESOURCE_MANAGEMENT.md)** - Resource limits and optimization
- **[Troubleshooting](./guides/TROUBLESHOOTING.md)** - Common issues and solutions

### 🔌 [API](./api/)
API reference documentation for all agents and services.

- **[API Reference](./api/API_REFERENCE.md)** - Complete API documentation
- **[Orchestrator API](./api/ORCHESTRATOR.md)** - Task routing and orchestration
- **[RAG Agent API](./api/RAG_AGENT.md)** - RAG agent integration
- **[Voice Agent API](./api/VOICE_AGENT.md)** - Voice processing capabilities
- **[Model Configuration](./api/MODELS.md)** - AI model provider setup

### 📊 [Project](./project/)
Project management, status reports, and historical records.

- **[Month 1 Completion](./project/MONTH_1_COMPLETION.md)** - First milestone achievements
- **[Project Analysis](./project/ANALYSIS_2025-12-25.md)** - Comprehensive codebase audit
- **[Incident Report](./project/INCIDENT_2025-12-26.md)** - E2E testing resource incident

### 📦 [Archive](./archive/)
Historical documentation and deprecated content.

---

## 🎯 Quick Navigation

### By Role

**Developer**:
1. [Getting Started](./guides/GETTING_STARTED.md)
2. [System Architecture](./architecture/SYSTEM_ARCHITECTURE.md)
3. [Specialized Teams](./TEAMS.md) ✨ NEW
4. [Self-Evolving Agent](./EVOLUTION.md) ✨ NEW
5. [API Reference](./api/API_REFERENCE.md)
6. [Testing Guide](./guides/TESTING.md)

**Designer**:
1. [Design System](./design/DESIGN_SYSTEM.md)
2. [Branding Guidelines](./design/BRANDING.md)
3. [Terminal UI](./design/TERMINAL_UI.md)

**Product Manager**:
1. [Roadmap](./implementation/ROADMAP.md)
2. [Month 1 Completion](./project/MONTH_1_COMPLETION.md)
3. [Specialized Teams](./TEAMS.md) ✨ V2 Month 2-3
4. [Self-Evolving Agent](./EVOLUTION.md) ✨ V2 Month 2-3
5. [Tech Debt](./implementation/TECH_DEBT.md)

### By Task

**Setting Up Project**:
→ [Getting Started](./guides/GETTING_STARTED.md) → [Model Configuration](./api/MODELS.md)

**Understanding Architecture**:
→ [System Architecture](./architecture/SYSTEM_ARCHITECTURE.md) → [Data Flow](./architecture/DATA_FLOW.md)

**Implementing Features**:
→ [Roadmap](./implementation/ROADMAP.md) → [API Reference](./api/API_REFERENCE.md)

**Troubleshooting Issues**:
→ [Troubleshooting](./guides/TROUBLESHOOTING.md) → [Resource Management](./guides/RESOURCE_MANAGEMENT.md)

**Running Tests**:
→ [Testing Guide](./guides/TESTING.md) → [E2E Testing](./guides/E2E_TESTING.md)

---

## 📝 Documentation Standards

### File Naming
- Use `SCREAMING_SNAKE_CASE.md` for documentation files
- Be descriptive: `E2E_TESTING.md` not `TESTS.md`
- Include dates for time-specific docs: `ANALYSIS_2025-12-25.md`

### Structure
Every document should have:
1. **Title** - Clear, descriptive heading
2. **Metadata** - Date, version, status
3. **Table of Contents** - For documents > 100 lines
4. **Content** - Well-organized sections
5. **References** - Links to related docs

### Writing Style
- **Clear and concise** - Avoid jargon when possible
- **Code examples** - Show, don't just tell
- **Visual aids** - Diagrams, tables, ASCII art
- **Keep updated** - Include "Last Updated" date

---

## 🔄 Updating Documentation

When you make changes:
1. Update the relevant documentation file
2. Update this index if you add/remove/rename docs
3. Add an entry to [CHANGELOG.md](../CHANGELOG.md)
4. Update "Last Updated" date in the modified file

---

## 📞 Need Help?

- **Can't find what you need?** Check [Troubleshooting](./guides/TROUBLESHOOTING.md)
- **Want to contribute?** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Found an issue?** Report it in the project's issue tracker

---

**Documentation Version**: 2.0.0
**Last Updated**: 2025-12-26
**Status**: Active
