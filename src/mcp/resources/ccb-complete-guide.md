# MeMesh - Complete Tool Guide

**For LLMs**: This guide helps you actively use MeMesh's 17 tools. Use tools proactively based on triggers, not just when explicitly requested.

## Quick Reference: When to Use Each Tool

| User Says | Use Tool | Why |
|-----------|----------|-----|
| "remember when we..." | `buddy-remember` | Search project memory |
| "what did we decide..." | `buddy-remember` | Recall past decisions |
| "why did we choose..." | `buddy-remember` | Find architecture choices |
| "do this task..." | `buddy-do` | Execute with smart routing |
| "implement X..." | `buddy-do` | Task execution |
| "generate tests..." | `generate-tests` | Create test cases |
| "save this API key..." | `buddy-secret-store` | Store secrets securely |
| "get my token..." | `buddy-secret-get` | Retrieve secrets |
| "another session should..." | `a2a-send-task` | Multi-session collaboration |
| "what's my progress..." | `get-session-health` | Check token usage |

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

### create-entities: Store Knowledge
**Triggers**: Completed major work, made important decision, learned lesson, fixed bug

**When to use** (PROACTIVE):
- After implementing new feature (store decision rationale)
- After fixing bug (record root cause)
- After making architectural choice (document why)
- User explicitly corrects you (record mistake pattern)

**Examples**:
```typescript
// After implementing OAuth
create-entities({
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
create-entities({
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

## Workflow Tools (Automatic Guidance)

### get-workflow-guidance: Next Steps
**Triggers**: Automatically triggered after Write/Edit/Bash (via hooks)

**Manual use cases**:
- User asks "what should I do next?"
- Starting new phase (idle → code-written → test → commit)
- Unsure about workflow rules

**Phases**:
- `idle`: Starting fresh work
- `code-written`: Just finished coding
- `test-complete`: Tests just ran
- `commit-ready`: About to commit
- `committed`: Just committed

**Note**: Usually auto-triggered by `hook-tool-use`, rarely called manually.

---

### get-session-health: Token Monitoring
**Triggers**: Long session, complex task, user asks about progress

**When to use**:
- Session feels slow or degraded
- User asks "how much context left?"
- Before starting memory-intensive work
- When considering session cleanup

**Example**:
```typescript
get-session-health()
// Returns: { tokenUsage, contextQuality, recommendations }
```

---

## Learning Tools (Improvement)

### buddy-record-mistake: Error Learning
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
buddy-record-mistake({
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

## Secret Management (Security)

### buddy-secret-store/get/list/delete
**Triggers**: API key, token, password, credential, secret

**When to use**:
- User provides API key/token (offer to store securely)
- Need API key for integration (retrieve from storage)
- User asks "what secrets do I have?" (list)
- Rotating credentials (delete old, store new)

**Examples**:
```typescript
// User shares: "Here's the OpenAI API key: sk-..."
buddy-secret-store({
  name: "openai-api-key",
  value: "sk-...",
  type: "api_key",
  description: "OpenAI API key for GPT-4 integration"
})

// Later, when needed:
const key = buddy-secret-get({ name: "openai-api-key" })
```

**Best practices**:
- ALWAYS offer to store when user shares secret
- Use descriptive names (not "key1", "key2")
- Never log secret values (use masked output)

---

## Test Generation

### generate-tests: AI Test Creation
**Triggers**: "write tests", "need tests", "generate tests", finished feature without tests

**When to use**:
- Completed feature implementation (no tests yet)
- User explicitly requests test generation
- Following TDD (specification → tests → implementation)

**Examples**:
```typescript
// After implementing function
generate-tests({
  code: `
    function validateEmail(email: string): boolean {
      const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      return regex.test(email);
    }
  `
})

// From specification
generate-tests({
  specification: "Email validator should: accept valid emails, reject invalid formats, handle edge cases (empty, null, special chars)"
})
```

---

## Multi-Session Collaboration (A2A Protocol)

### a2a-send-task: Delegate to Other Session
**Triggers**: "another session", "parallel", "split work", "specialized session"

**When to use**:
- User mentions working with multiple sessions
- Task can be parallelized across sessions
- Need specialized session (frontend/backend/testing)

**Example**:
```typescript
// User: "Have another session work on the frontend while I do backend"
a2a-send-task({
  targetAgentId: "frontend-session-123",
  taskDescription: "Implement React components for user dashboard with charts and tables",
  priority: "normal"
})
```

---

### a2a-get-task / list-tasks / list-agents
**Use together**:
1. `a2a-list-agents()` - Find available sessions
2. `a2a-send-task()` - Send work to session
3. `a2a-get-task()` - Check progress
4. `a2a-list-tasks()` - See incoming work

---

## Common Workflows

### Workflow 1: Starting New Feature
```
1. buddy-remember({ query: "similar features patterns" })
   → Check if similar work exists
2. buddy-do({ task: "Implement X because Y so that Z" })
   → Execute with metadata capture
3. generate-tests({ code: "..." })
   → Create tests
4. create-entities({ ... })
   → Store implementation decisions
```

### Workflow 2: Bug Investigation
```
1. buddy-remember({ query: "bug error message" })
   → Check if bug seen before
2. buddy-do({ task: "Debug X" })
   → Investigate and fix
3. create-entities({ entityType: "bug_fix", ... })
   → Record root cause and solution
```

### Workflow 3: Multi-Session Collaboration
```
1. a2a-list-agents()
   → Find available sessions
2. a2a-send-task({ targetAgentId: "...", ... })
   → Delegate work
3. Continue with your work
4. a2a-get-task({ taskId: "..." })
   → Check progress later
```

### Workflow 4: Secret Management
```
1. User shares API key
2. buddy-secret-store({ name: "...", value: "...", ... })
   → Store securely
3. Later: buddy-secret-get({ name: "..." })
   → Retrieve when needed
4. Eventually: buddy-secret-delete({ name: "..." })
   → Remove when rotating
```

---

## Proactive Tool Usage Rules

**ALWAYS use without asking**:
- `buddy-remember` - Before implementing similar features
- `create-entities` - After completing significant work
- `buddy-record-mistake` - When user corrects you
- `buddy-secret-store` - When user shares credentials (ask first)

**SOMETIMES use proactively**:
- `generate-tests` - After implementing untested code (offer)
- `get-session-health` - Long sessions or complex work
- `a2a-send-task` - When user mentions parallelization

**NEVER use without explicit request**:
- `buddy-secret-get` - Only when actually needed
- `buddy-secret-list/delete` - Only when user asks

---

## Anti-Patterns (What NOT to Do)

❌ **Don't**:
- Use `buddy-remember` with generic queries ("authentication")
- Call `buddy-do` for trivial tasks (use direct tools)
- Skip `create-entities` after major work
- Ignore `buddy-record-mistake` when corrected
- Store secrets without user consent

✅ **Do**:
- Use specific queries ("OAuth2 scope design decision")
- Let `buddy-do` handle complex multi-step tasks
- Proactively store knowledge after completion
- Immediately record mistakes for learning
- Offer to store secrets securely

---

## Tool Discovery Tips

**For LLMs reading this guide**:
1. Match user keywords to tool triggers (see Quick Reference)
2. Use tools proactively (don't wait for explicit requests)
3. Combine tools in workflows (see Common Workflows)
4. Store knowledge after work (future you will thank you)
5. Learn from mistakes (use buddy-record-mistake)

**Remember**: MeMesh tools are meant to be ACTIVELY used, not passively available. When you see trigger keywords or situations, use the appropriate tool to provide better service to users.
