# MeMesh Complete Usage Guide

**Version: 2.7.0
**Last Updated**: 2026-02-04

## 📖 Overview

MeMesh is a capability-routing system for Claude Code. It focuses on:
- Smart task routing
- Project memory
- Workflow guidance
- Structured planning

You describe the outcome, and MeMesh selects the best internal capability automatically.

## 🚀 Quick Start

### 1) Run a task with smart routing
```
buddy-do "implement user authentication with JWT"
```

### 2) Recall project memory
```
buddy-remember "authentication decisions"
```

### 3) Generate a plan
```
generate-tests "add email-based login"
```

## 🧰 Tool Overview

- **buddy-do**: Execute tasks with smart routing
- **buddy-remember**: Recall project memory and decisions
- **buddy-help**: Command help and usage
- **get-session-health**: Check session health
- **get-workflow-guidance**: Next-step recommendations by phase
- **generate-tests**: Implementation plan generation

Note: `hook-tool-use` is internal and used by Claude Code hooks.

## 🧭 Capability Examples

Use natural language and include intent, constraints, and file names when possible.

```
"Review src/auth.ts for security and correctness"
"Debug why login is returning 500s after deploy"
"Refactor UserService to reduce duplication"
"Design a REST API for session management"
"Optimize the database query in reports.sql"
"Write vitest tests for src/utils/date.ts"
"Draft README updates for new onboarding flow"
```

## 🔄 Workflow Guidance

MeMesh recognizes five phases:
- idle
- code-written
- test-complete
- commit-ready
- committed

Example usage:
```
get-workflow-guidance {"phase":"code-written"}
get-session-health
```

## 🧠 Project Memory

Project memory is updated automatically at key milestones and commit events. Use it to recall prior decisions and patterns:
```
buddy-remember "why we chose SQLite"
buddy-remember "error handling strategy"
```

## ✅ Best Practices

- Be specific: mention files, constraints, and expected behavior
- Use `buddy-remember` before large changes
- Ask for a plan before large features
- Check `get-session-health` on long sessions

## 📚 Additional Resources

- **Quick Reference**: `@claude-code-buddy://quick-reference`
- **Examples**: `@claude-code-buddy://examples`
- **Best Practices**: `@claude-code-buddy://best-practices`
