# Auto-Memory System Guide

## Overview

The Enhanced Auto-Memory System (Phase 0.6) automatically captures development knowledge to the Knowledge Graph without requiring manual intervention.

## What Gets Automatically Recorded

### 1. Task Starts (via buddy-do)

**Trigger**: When `buddy-do` is called

**Captured**:
- Task description
- Extracted goal (main objective)
- Extracted reason (why needed)
- Extracted expected outcome (what should happen)
- Priority level

**Entity Type**: `task_start`

**Example**:
```typescript
await callTool('buddy-do', {
  task: 'Refactor user service to use TypeScript because type safety will prevent runtime errors'
});
```

Automatically records goal, reason, and expected outcome to Knowledge Graph.

### 2. Decisions

**Trigger**: Manual call to `recordDecision()`

**Captured**:
- Decision description
- Context (why this decision was needed)
- Options considered
- Chosen option
- Rationale
- Trade-offs
- Confidence level

**Entity Type**: `decision`

**Example**:
```typescript
await projectAutoTracker.recordDecision({
  decision_description: 'Choose database ORM',
  context: 'Need to interact with PostgreSQL from Node.js',
  options_considered: ['Prisma', 'TypeORM', 'Drizzle'],
  chosen_option: 'Prisma',
  rationale: 'Type-safe, excellent DX, active community',
  trade_offs: 'Additional build step, vendor lock-in',
  confidence: 'high',
});
```

### 3. Progress Milestones

**Trigger**: Manual call to `recordProgressMilestone()`

**Captured**:
- Milestone description
- Significance (why this milestone matters)
- Impact (what this enables)
- Learnings (what we learned)
- Next steps

**Entity Type**: `progress_milestone`

**Example**:
```typescript
await projectAutoTracker.recordProgressMilestone({
  milestone_description: 'API integration complete',
  significance: 'All 5 endpoints tested and working',
  impact: 'Frontend can now fetch real data',
  learnings: 'Rate limiting requires exponential backoff',
  next_steps: 'Add caching layer to reduce API calls',
});
```

### 4. Error Resolutions

**Trigger**:
- Automatic detection from command output
- Manual call to `recordError()`

**Captured**:
- Error type
- Error message
- Context (where it happened)
- Root cause (why it happened)
- Resolution (how it was fixed)
- Prevention (how to avoid in future)

**Entity Type**: `error_resolution`

**Automatic Detection Patterns**:
- `error:`
- `exception:`
- `failed:`
- `\d+ failing` (test failures)
- `build failed`

**Example**:
```typescript
await projectAutoTracker.recordError({
  error_type: 'TypeScript Error',
  error_message: 'Type "string" is not assignable to type "number"',
  context: 'Refactoring user ID from string to number',
  root_cause: 'Database migration incomplete',
  resolution: 'Complete migration, update types',
  prevention: 'Run type check before migration',
});
```

## Querying Recorded Knowledge

Use `buddy-remember` to recall any recorded knowledge:

```typescript
// Find past decisions
await callTool('buddy-remember', {
  query: 'authentication decisions'
});

// Find error resolutions
await callTool('buddy-remember', {
  query: 'TypeScript type errors'
});

// Find progress milestones
await callTool('buddy-remember', {
  query: 'API integration milestones'
});
```

## Entity Types Reference

| Entity Type | Description | Trigger |
|------------|-------------|---------|
| `task_start` | Task initiation with goal/reason/outcome | buddy-do call |
| `decision` | Architectural/technical decisions | Manual recording |
| `progress_milestone` | Significant progress points | Manual recording |
| `error_resolution` | Error patterns and solutions | Auto-detect or manual |
| `test_result` | Test execution results | recordTestResult() |
| `workflow_checkpoint` | Workflow milestones | recordWorkflowCheckpoint() |
| `commit` | Git commits | recordCommit() |
| `code_change` | Code modifications | recordCodeChange() |
| `project_snapshot` | Project state snapshots | Token threshold |

## Best Practices

### For AI Agents

1. **Use buddy-do for all tasks**: This ensures task goals are captured
2. **Record important decisions**: Don't skip architectural decisions
3. **Capture milestones**: Record when significant progress is made
4. **Let errors auto-record**: Most errors will be captured automatically

### For Humans

1. **Review recorded knowledge**: Use buddy-remember to check what's been captured
2. **Add context when needed**: Manual recording allows richer context
3. **Query before starting**: Check if similar problems were solved before

## Configuration

The auto-memory system is configured in `ServerInitializer.ts` and integrated with:
- HookIntegration (for command output monitoring)
- BuddyHandlers (for buddy-do integration)
- ProjectAutoTracker (core recording engine)

## Troubleshooting

**Issue**: Knowledge not being recorded
**Solution**: Check that ProjectAutoTracker is properly initialized and passed to HookIntegration

**Issue**: Too many error recordings
**Solution**: Error detection patterns can be tuned in HookIntegration.shouldRecordError()

**Issue**: Cannot query recorded knowledge
**Solution**: Verify Knowledge Graph is initialized and accessible via MCP memory tool

## Advanced Usage

### Custom Entity Types

You can extend the auto-memory system with custom entity types by:

1. Adding new entity type to `EntityType` enum
2. Implementing recording method in `ProjectAutoTracker`
3. Integrating trigger point in appropriate handler

### Tuning Auto-Detection

Error auto-detection patterns can be customized in `HookIntegration.shouldRecordError()`:

```typescript
private shouldRecordError(output: string): boolean {
  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /failed:/i,
    /\d+ failing/i,
    /build failed/i,
    // Add custom patterns here
  ];
  return errorPatterns.some(pattern => pattern.test(output));
}
```

### Memory Lifecycle

1. **Capture**: Knowledge is extracted and structured
2. **Store**: Entities are written to Knowledge Graph via MCP memory tool
3. **Index**: Embeddings are generated for semantic search
4. **Retrieve**: buddy-remember queries Knowledge Graph
5. **Context**: Retrieved knowledge is provided to AI agents

## Performance Considerations

- Entity creation is asynchronous and non-blocking
- Knowledge Graph queries are optimized with embeddings
- Auto-detection runs only on command completion
- Memory footprint is minimal (metadata only)

## Privacy & Security

- All knowledge stays in local Knowledge Graph
- No external API calls for knowledge storage
- Sensitive data should be manually excluded
- Knowledge Graph can be cleared/reset if needed

## Migration from Previous Versions

Phase 0.6 introduces automatic tracking. If upgrading from earlier versions:

1. **No breaking changes**: Existing manual recording still works
2. **Gradual adoption**: Auto-memory works alongside manual methods
3. **Knowledge preservation**: Existing Knowledge Graph data is preserved
4. **Query compatibility**: buddy-remember works with all entity types

## See Also

- [buddy-do Tool Reference](../../src/mcp/resources/buddy-do-skill.md)
- [Complete Usage Guide](../../src/mcp/resources/usage-guide.md)
- [Best Practices](../../src/mcp/resources/best-practices.md)
- [Phase 0.6 Implementation Plan](../plans/2026-01-31-phase-0.6-enhanced-auto-memory.md)
