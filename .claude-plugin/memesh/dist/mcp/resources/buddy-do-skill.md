# buddy-do Tool Reference

## Overview

`buddy-do` is the primary task execution tool in MeMesh. It provides smart routing to appropriate capabilities based on task description and automatically captures task metadata to the Knowledge Graph.

## Basic Usage

```typescript
await callTool('buddy-do', {
  task: 'Implement user authentication because we need to secure the API so that only authorized users can access resources'
});
```

## Automatic Memory Tracking (Phase 0.6)

The buddy-do tool now automatically captures task metadata to the Knowledge Graph:

### What Gets Recorded

When you call `buddy-do`, the following metadata is automatically extracted and recorded:

1. **Task Goal**: The main objective (extracted from first sentence or "to X" pattern)
2. **Reason**: Why this task is needed (extracted from "because X" or "so that X" patterns)
3. **Expected Outcome**: What should happen (extracted from "should X" or "will X" patterns)

### Example

```typescript
await callTool('buddy-do', {
  task: 'Implement user authentication because we need to secure the API so that only authorized users can access resources'
});

// Automatically records to Knowledge Graph:
// - Goal: "Implement user authentication"
// - Reason: "we need to secure the API"
// - Expected Outcome: "only authorized users can access resources"
```

### Query Past Tasks

Use `buddy-remember` to recall past tasks and their context:

```typescript
await callTool('buddy-remember', {
  query: 'authentication implementation decisions'
});
```

## Task Description Best Practices

To maximize the effectiveness of automatic memory tracking, structure task descriptions to include:

1. **Clear goal** (what needs to be done)
2. **Reason** (why it's needed) - use "because" or "so that"
3. **Expected outcome** (what should result) - use "should" or "will"

### Good Examples

```
"Refactor UserService to use TypeScript because type safety will prevent runtime errors"
"Add caching layer to API so that response times will improve by 50%"
"Implement retry logic because network requests should handle transient failures"
```

### Less Effective Examples

```
"Fix the bug" - Too vague, no context
"Update code" - No goal, reason, or outcome specified
"Implement feature X" - Missing reason and expected outcome
```

## Integration with Other Tools

`buddy-do` works seamlessly with:
- **buddy-remember**: Query knowledge captured from previous tasks
- **generate-tests**: Create implementation plans that reference past tasks
- **get-workflow-guidance**: Get contextual recommendations based on project phase

## See Also

- [Auto-Memory System Guide](../../../docs/guides/auto-memory-system.md)
- [Complete Usage Guide](./usage-guide.md)
- [Best Practices](./best-practices.md)
