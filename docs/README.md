# Claude Code Buddy Documentation

**Welcome to the Claude Code Buddy documentation!**

This directory contains all user-facing project documentation organized by category for easy navigation.

---

## 📚 Documentation Structure

### 🏗️ [Architecture](./architecture/)
System architecture and design patterns documentation.

- **[System Overview](./architecture/OVERVIEW.md)** - High-level architecture overview
- **[MCP Integration](./architecture/mcp-orchestrator-integration.md)** - MCP server integration guide
- **[Session Orchestrator](./architecture/mcp-session-orchestrator.md)** - Session management architecture
- **[System Tool Detection](./architecture/SYSTEM_TOOL_DETECTION.md)** - Tool capability detection

### 🤖 Core Features

Advanced capability routing and self-learning systems.

- **[Self-Evolving System](./EVOLUTION.md)** - Self-learning and behavior optimization system
- **[Terminal UI Dashboard](./UI_TERMINAL_DASHBOARD.md)** - Real-time monitoring and progress tracking

### 🔌 [API Reference](./api/)

API documentation for claude-code-buddy MCP server.

- **[API Reference](./api/API_REFERENCE.md)** - Complete API documentation
- **[Model Configuration](./api/MODELS.md)** - AI model provider setup

### 📖 [Guides](./guides/)

Step-by-step guides for common tasks and best practices.

- **[Setup Guide](./guides/SETUP.md)** - Installation and configuration
- **[Testing Guide](./guides/TESTING.md)** - Testing strategies and best practices
- **[E2E Testing Best Practices](./guides/E2E_TESTING_BEST_PRACTICES.md)** - End-to-end testing guide
- **[Claude Code Enhancement Guide](./guides/CLAUDE_CODE_ENHANCEMENT_GUIDE.md)** - Enhancing Claude Code with claude-code-buddy

### 📝 [Examples](./examples/)

Example configurations and quick references.

- **[Terminal UI Architecture](./architecture/TERMINAL_UI.md)** - Terminal UI architecture examples
- **[Quick Reference](./examples/QUICK_REFERENCE.md)** - Quick reference guide
- **[Enterprise](./examples/enterprise/)** - Enterprise deployment examples

---

## 🎯 Quick Navigation

### By Role

**Developer**:
1. [Setup Guide](./guides/SETUP.md)
2. [System Overview](./architecture/OVERVIEW.md)
3. [Self-Evolving System](./EVOLUTION.md)
4. [API Reference](./api/API_REFERENCE.md)
5. [Testing Guide](./guides/TESTING.md)

**Operations**:
1. [MCP Integration](./architecture/mcp-orchestrator-integration.md)
2. [Enterprise Examples](./examples/enterprise/)

### By Task

**Setting Up Project**:
→ [Setup Guide](./guides/SETUP.md) → [Model Configuration](./api/MODELS.md)

**Understanding Architecture**:
→ [System Overview](./architecture/OVERVIEW.md) → [MCP Integration](./architecture/mcp-orchestrator-integration.md)

**Implementing Features**:
→ [API Reference](./api/API_REFERENCE.md) → [Examples](./examples/)

**Running Tests**:
→ [Testing Guide](./guides/TESTING.md) → [E2E Testing](./guides/E2E_TESTING_BEST_PRACTICES.md)

---

## 📝 Documentation Standards

### File Naming
- Use `SCREAMING_SNAKE_CASE.md` for documentation files
- Be descriptive: `E2E_TESTING_BEST_PRACTICES.md` not `TESTS.md`
- Include dates for time-specific docs: `ANALYSIS_2025-12-25.md`

### Structure
Every document should have:
1. **Title** - Clear, descriptive heading
2. **Table of Contents** - For documents > 100 lines
3. **Content** - Well-organized sections
4. **Examples** - Show, don't just tell

### Writing Style
- **Clear and concise** - Avoid jargon when possible
- **Code examples** - Practical, runnable examples
- **Visual aids** - Diagrams, tables, ASCII art

---

## 🔄 Updating Documentation

When you make changes:
1. Update the relevant documentation file
2. Update this index if you add/remove/rename docs
3. Add an entry to [CHANGELOG.md](../CHANGELOG.md)

---

## 📞 Need Help?

- **Can't find what you need?** Check available documentation above
- **Want to contribute?** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Found an issue?** Report it in the project's issue tracker

---

**Documentation Version**: 2.0.0
**Last Updated**: 2025-12-29
**Status**: Active
