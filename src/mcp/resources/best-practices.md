# Claude Code Buddy Best Practices

**Version**: 2.2.0

## ✅ Write Precise Requests

- Specify files, modules, and constraints
- State desired behavior and edge cases
- Mention the tech stack when relevant

**Good**:
```
"Refactor src/auth/session.ts to remove duplication and add tests"
```

**Avoid**:
```
"Fix auth"
```

## ✅ Use Capability Routing (Default)

Let `buddy-do` select the best capability. You do not need to target internal roles.

```
buddy-do "review src/api/auth.ts for security issues"
```

## ✅ Break Down Large Features

Use `generate-smart-plan` before large changes:
```
generate-smart-plan "add email-based login with rate limiting"
```

Then execute tasks one by one.

## ✅ Leverage Project Memory

Use memory before large refactors or architectural changes:
```
buddy-remember "why we chose SQLite"
```

## ✅ Use Workflow Guidance

When you finish a phase, ask for next steps:
```
get-workflow-guidance {"phase":"test-complete"}
```

## ✅ Keep Sessions Healthy

Long sessions can degrade quality. Check health periodically:
```
get-session-health
```

## ✅ Prefer Smaller, Testable Chunks

- Aim for 2-5 minute tasks
- Validate with tests before moving on
- Use clear commit boundaries in your VCS

---

**Remember**: Specific, focused requests yield the best outcomes.
