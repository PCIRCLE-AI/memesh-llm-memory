# Claude Code Buddy Examples

**Version: 2.6.0

## Example 1: Code Review

**Request**:
```
buddy-do "review src/auth/login.ts for security issues and edge cases"
```

**Result**: A focused review with security checks, edge cases, and actionable fixes.

---

## Example 2: Feature Planning

**Request**:
```
generate-tests "add email-based login with rate limiting"
```

**Result**: A structured plan with TDD-friendly steps and estimated durations.

---

## Example 3: Debugging a Failure

**Request**:
```
buddy-do "debug why login requests return 500s in production"
```

**Result**: Root-cause analysis with likely failure paths and verification steps.

---

## Example 4: Memory Recall

**Request**:
```
buddy-remember "why we chose SQLite for local storage"
```

**Result**: A concise summary of the decision and its tradeoffs.

---

## Example 5: Workflow Guidance

**Request**:
```
get-workflow-guidance {"phase":"test-complete"}
```

**Result**: Next-step recommendations for code review and commit readiness.
