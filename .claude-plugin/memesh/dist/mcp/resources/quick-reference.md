# MeMesh Quick Reference

**Version: 2.7.0

## 🚀 Quick Commands

```bash
buddy-do "<task description>"         # Smart routing (recommended)
buddy-remember "<query>"             # Recall project memory
buddy-help                             # Command help
get-session-health                     # Session health snapshot
get-workflow-guidance '{"phase":"code-written"}'
generate-tests '{"featureDescription":"..."}'
```

Note: `hook-tool-use` is internal and used by Claude Code hooks.

## 🧭 Capability Keywords

| Capability | Keywords | Use For |
|---|---|---|
| Code Review | review, audit, quality | Security checks, best practices |
| Testing | test, coverage, TDD | Unit, integration, E2E testing |
| Debugging | debug, bug, error | Root-cause analysis |
| Refactoring | refactor, cleanup | Structural improvements |
| API/Backend | api, endpoint, backend | API design and backend logic |
| Frontend/UI | ui, component, frontend | UI, accessibility, UX |
| Architecture | architecture, design, scalability | System design, tradeoffs |
| Data/Database | database, query, schema | Query tuning, schema design |
| Documentation | docs, guide, readme | Technical writing |

## 🎯 Common Workflows

### Feature Development
```
1. generate-tests "<feature>"
2. buddy-do "implement <feature>"
3. buddy-do "write tests for <feature>"
4. buddy-do "review <feature> for quality"
```

### Bug Fixing
```
1. buddy-do "debug <issue> and find root cause"
2. buddy-do "fix <issue> and add regression test"
```

### Performance Review
```
1. buddy-do "profile performance for <area>"
2. buddy-do "optimize slow path in <area>"
```

## 💡 Quick Tips

✅ **DO**:
- Use clear, specific task descriptions
- Mention files, constraints, or target behaviors
- Use `buddy-remember` before large changes

❌ **DON'T**:
- Use vague descriptions ("fix bug")
- Skip context when it matters

## 📚 Full Documentation

- **Complete Guide**: `@claude-code-buddy://usage-guide`
- **Examples**: `@claude-code-buddy://examples`
- **Best Practices**: `@claude-code-buddy://best-practices`

---

**Remember**: The smart router learns from your patterns - the more you use it, the better it gets!
