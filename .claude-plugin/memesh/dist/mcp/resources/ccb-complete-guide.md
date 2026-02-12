# MeMesh - Complete Tool Guide

**For LLMs**: This guide helps you actively use MeMesh's tools. Use tools proactively based on triggers, not just when explicitly requested.

## Quick Reference: When to Use Each Tool

| User Says | Use Tool | Why |
|-----------|----------|-----|
| "remember when we..." | `buddy-remember` | Search project memory |
| "what did we decide..." | `buddy-remember` | Recall past decisions |
| "why did we choose..." | `buddy-remember` | Find architecture choices |
| "do this task..." | `buddy-do` | Execute with memory context |
| "implement X..." | `buddy-do` | Task execution |
| "generate tests..." | `memesh-generate-tests` | Create test cases |

---

## Core Tools (Daily Use)

### buddy-remember: Project Memory Search
**Triggers**: remember, recall, past, decision, why, when, bug, pattern, architecture

**When to use**:
- User asks "why did we..."
- User asks "remember when..."
- Starting work on existing feature (check past decisions)
- Before making architectural changes (review previous choices)
- Debugging (check if similar bug was fixed before)

**Examples**:
```typescript
// User: "Why did we use JWT instead of sessions?"
buddy-remember({ query: "JWT authentication decision" })

// User: "Has this bug happened before?"
buddy-remember({ query: "login timeout bug" })

// Proactive: Starting auth work
buddy-remember({ query: "authentication patterns" })
```

**Best practices**:
- Search BEFORE implementing (check existing patterns)
- Use specific keywords from domain (not generic terms)
- Query when user mentions "we did this before"

---

### buddy-do: Smart Task Execution
**Triggers**: implement, create, build, fix, refactor, add, update

**When to use**:
- User requests implementation work
- Task requires routing to appropriate capability
- Want automatic task metadata capture

**Examples**:
```typescript
// User: "Add rate limiting to the API"
buddy-do({
  task: "Add rate limiting to API endpoints because we're getting too many requests so that server stays responsive under load"
})

// Include: what (rate limiting) + why (too many requests) + outcome (stay responsive)
```

**Best practices**:
- Include goal + reason + expected outcome
- Let buddy-do handle routing (don't manually route)
- Task metadata auto-saved to knowledge graph

---

### memesh-create-entities: Store Knowledge
**Triggers**: Completed major work, made important decision, learned lesson, fixed bug

**When to use** (PROACTIVE):
- After implementing new feature (store decision rationale)
- After fixing bug (record root cause)
- After making architectural choice (document why)
- User explicitly corrects you (record mistake pattern)

**Examples**:
```typescript
// After implementing OAuth
memesh-create-entities({
  entities: [{
    name: "OAuth2 Implementation Decision",
    entityType: "decision",
    observations: [
      "Chose OAuth2 over JWT for better revocation control",
      "Used authorization code flow for web clients",
      "Implemented PKCE for mobile apps"
    ],
    tags: ["authentication", "oauth", "security"]
  }]
})

// After fixing bug
memesh-create-entities({
  entities: [{
    name: "Login Timeout Bug Fix",
    entityType: "bug_fix",
    observations: [
      "Root cause: Redis connection pooling exhaustion",
      "Solution: Increased pool size to 20 connections",
      "Prevention: Added connection pool monitoring"
    ],
    tags: ["bug", "redis", "timeout"]
  }]
})
```

**Best practices**:
- Store AFTER completing significant work (not during)
- Include specific details (not vague summaries)
- Add relevant tags for future searchability

---

---

## Learning Tools (Improvement)

### memesh-record-mistake: Error Learning
**Triggers**: User corrects you, says "you should have...", "why didn't you..."

**When to use** (IMMEDIATE):
- User explicitly corrects your behavior
- You violated documented procedure
- You made assumption instead of asking
- You skipped validation step
- User frustrated with repeated mistake

**Examples**:
```typescript
// User: "Why did you edit the file without reading it first?"
memesh-record-mistake({
  action: "Edited config.ts without reading first",
  errorType: "procedure-violation",
  userCorrection: "Must read file before editing",
  correctMethod: "Use Read tool first, then Edit with exact content",
  impact: "Broke file formatting, wasted time",
  preventionMethod: "ALWAYS Read before Edit - no exceptions"
})
```

**Best practices**:
- Record IMMEDIATELY when corrected (don't wait)
- Be specific about what you did wrong
- Include concrete prevention method

---

## Test Generation

### memesh-generate-tests: AI Test Creation
**Triggers**: "write tests", "need tests", "generate tests", finished feature without tests

**When to use**:
- Completed feature implementation (no tests yet)
- User explicitly requests test generation
- Following TDD (specification → tests → implementation)

**Examples**:
```typescript
// After implementing function
memesh-generate-tests({
  code: `
    function validateEmail(email: string): boolean {
      const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      return regex.test(email);
    }
  `
})

// From specification
memesh-generate-tests({
  specification: "Email validator should: accept valid emails, reject invalid formats, handle edge cases (empty, null, special chars)"
})
```

---

## Common Workflows

### Workflow 1: Starting New Feature
```
1. buddy-remember({ query: "similar features patterns" })
   → Check if similar work exists
2. buddy-do({ task: "Implement X because Y so that Z" })
   → Execute with metadata capture
3. memesh-generate-tests({ code: "..." })
   → Create tests
4. memesh-create-entities({ ... })
   → Store implementation decisions
```

### Workflow 2: Bug Investigation
```
1. buddy-remember({ query: "bug error message" })
   → Check if bug seen before
2. buddy-do({ task: "Debug X" })
   → Investigate and fix
3. memesh-create-entities({ entityType: "bug_fix", ... })
   → Record root cause and solution
```

---

## Proactive Tool Usage Rules

**ALWAYS use without asking**:
- `buddy-remember` - Before implementing similar features
- `memesh-create-entities` - After completing significant work
- `memesh-record-mistake` - When user corrects you

**SOMETIMES use proactively**:
- `memesh-generate-tests` - After implementing untested code (offer)
---

## Anti-Patterns (What NOT to Do)

❌ **Don't**:
- Use `buddy-remember` with generic queries ("authentication")
- Call `buddy-do` for trivial tasks (use direct tools)
- Skip `memesh-create-entities` after major work
- Ignore `memesh-record-mistake` when corrected

✅ **Do**:
- Use specific queries ("OAuth2 scope design decision")
- Let `buddy-do` handle complex multi-step tasks
- Proactively store knowledge after completion
- Immediately record mistakes for learning

---

## Tool Discovery Tips

**For LLMs reading this guide**:
1. Match user keywords to tool triggers (see Quick Reference)
2. Use tools proactively (don't wait for explicit requests)
3. Combine tools in workflows (see Common Workflows)
4. Store knowledge after work (future you will thank you)
5. Learn from mistakes (use memesh-record-mistake)

**Remember**: MeMesh tools are meant to be ACTIVELY used, not passively available. When you see trigger keywords or situations, use the appropriate tool to provide better service to users.
