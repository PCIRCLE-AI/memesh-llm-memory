# Workflow Guidance System Usage Guide

## Overview

The Workflow Guidance System provides intelligent, context-aware recommendations during development workflows, helping maintain code quality and preventing session degradation.

## Architecture

```
Claude Code (User)
    ↓ MCP Tools
DevelopmentButler (Orchestrator)
    ↓
WorkflowGuidanceEngine + SessionContextMonitor
    ↓
SessionTokenTracker + ClaudeMdReloader
```

## Workflow Phases

### 1. code-written
Triggered after code changes are made.

**Recommendations:**
- Run tests (if not already run)
- Review changes for quality
- Check for breaking changes
- Verify error handling

**Example Context:**
```json
{
  "phase": "code-written",
  "filesChanged": ["src/api/users.ts", "src/models/User.ts"],
  "testsPassing": false,
  "linesChanged": 120
}
```

### 2. test-complete
Triggered after tests pass.

**Recommendations:**
- Review test coverage
- Fix any failing tests
- Prepare commit message
- Update documentation

**Example Context:**
```json
{
  "phase": "test-complete",
  "testsPassing": true,
  "coverage": 85,
  "testsRun": 42
}
```

### 3. commit-ready
Triggered when ready to commit.

**Recommendations:**
- Review commit message quality
- Run final linters/formatters
- Verify all tests still pass
- Create pull request if needed

**Example Context:**
```json
{
  "phase": "commit-ready",
  "commitMessage": "feat: add user authentication",
  "stagedFiles": 5,
  "hasConflicts": false
}
```

### 4. committed
Triggered after successful commit.

**Recommendations:**
- Push changes to remote
- Update project documentation
- Close related issues
- Notify team members

**Example Context:**
```json
{
  "phase": "committed",
  "commitHash": "a1b2c3d",
  "branch": "feature/auth",
  "pushed": false
}
```

## MCP Tools

### get-workflow-guidance

Returns intelligent recommendations based on current workflow phase.

**Input:**
```json
{
  "phase": "code-written",
  "filesChanged": ["src/api/users.ts"],
  "testsPassing": false,
  "linesChanged": 150
}
```

**Output:**
```json
{
  "context": {
    "phase": "code-written",
    "filesChanged": ["src/api/users.ts"],
    "testsPassing": false,
    "linesChanged": 150
  },
  "recommendations": [
    {
      "action": "run-tests",
      "priority": "high",
      "confidence": 0.95,
      "description": "Run test suite to verify changes",
      "reasoning": [
        "Code changes detected in API layer",
        "Tests not yet run",
        "150 lines changed (significant changes)"
      ],
      "estimatedTime": "2-5 minutes"
    },
    {
      "action": "review-changes",
      "priority": "medium",
      "confidence": 0.85,
      "description": "Review code changes for quality",
      "reasoning": [
        "Significant code changes (150 lines)",
        "API layer modifications"
      ],
      "estimatedTime": "5-10 minutes"
    }
  ]
}
```

### get-session-health

Checks session health including token usage and quality metrics.

**Input:** (none required)

**Output:**
```json
{
  "status": "warning",
  "tokenUsage": {
    "total": 160000,
    "budget": 200000,
    "percentage": 80
  },
  "warnings": [
    {
      "level": "warning",
      "message": "Token usage at 80% (160,000/200,000)",
      "recommendation": "Consider reloading CLAUDE.md soon"
    }
  ],
  "recommendations": [
    {
      "action": "consider-reload",
      "priority": "medium",
      "confidence": 0.90,
      "description": "Consider reloading CLAUDE.md to refresh context",
      "reasoning": [
        "Token usage approaching critical threshold",
        "Session quality may start degrading"
      ],
      "estimatedTime": "1 minute"
    }
  ]
}
```

**Status Levels:**
- `healthy` - Token usage < 80%, no issues
- `warning` - Token usage 80-90%, consider action soon
- `critical` - Token usage ≥ 90%, immediate action recommended

### reload-context

Triggers CLAUDE.md reload via MCP resources/updated.

**Input:**
```json
{
  "reason": "token-threshold"
}
```

**Output:**
```json
{
  "success": true,
  "message": "CLAUDE.md context reloaded successfully",
  "resourceUpdate": {
    "method": "resources/updated",
    "params": {
      "uri": "file:///Users/user/.claude/CLAUDE.md"
    }
  },
  "timestamp": "2025-12-31T10:30:00.000Z"
}
```

**Cooldown Protection:**
- Minimum 5 minutes between reloads
- Prevents excessive reload operations
- Returns error if called during cooldown period

**Error Response (during cooldown):**
```json
{
  "success": false,
  "error": "Cooldown active",
  "message": "Last reload was 2 minutes ago. Please wait 3 more minutes.",
  "nextAvailableTime": "2025-12-31T10:33:00.000Z"
}
```

### record-token-usage

Records token usage for session monitoring.

**Input:**
```json
{
  "inputTokens": 1500,
  "outputTokens": 800
}
```

**Output:**
```json
{
  "success": true,
  "totalTokens": 2300,
  "sessionTotal": 162300,
  "budget": 200000,
  "percentage": 81.15,
  "status": "warning"
}
```

## Session Health Monitoring

### Thresholds

| Status | Token % | Description | Action |
|--------|---------|-------------|--------|
| healthy | < 80% | Normal operation | Continue normally |
| warning | 80-90% | Approaching limit | Consider reload soon |
| critical | ≥ 90% | Near budget limit | Reload recommended |

### Threshold Actions

**At 80% (Warning):**
- Warning notification sent
- Recommendation to consider reload
- Continue monitoring closely

**At 90% (Critical):**
- Critical warning notification
- Automatic CLAUDE.md reload triggered (if enabled)
- Strong recommendation to reload if not automatic

**Cooldown Protection:**
- 5 minutes minimum between reloads
- Prevents reload spam
- Ensures stable session state

### Quality Signals (Future Enhancement)

Future versions will incorporate additional quality signals:
- Response coherence score
- Error rate tracking
- Recommendation acceptance rates
- User satisfaction indicators

## Best Practices

### 1. Monitor Session Health Regularly

During long development sessions:
```
Every 30 minutes: Check session health
At 80% threshold: Plan to wrap up or reload
At 90% threshold: Reload context immediately
```

### 2. Respect Cooldown Periods

```
✅ Good: Wait 5 minutes between reloads
❌ Bad: Attempt reload every minute

Reason: Frequent reloads can disrupt workflow
        and provide no additional benefit
```

### 3. Record Token Usage Accurately

```
✅ Good: Record actual token usage from API responses
❌ Bad: Estimate or skip recording

Reason: Accurate tracking enables better
        threshold detection and recommendations
```

### 4. Follow Workflow Recommendations

The system learns from successful patterns:
```
✅ Good: Run tests → Review → Commit → Push
❌ Bad: Commit untested code → Skip review

Benefit: Following recommendations improves
         future recommendation quality
```

### 5. Use Appropriate Workflow Phases

```
✅ Good: Update phase as work progresses
❌ Bad: Stay in "code-written" for entire session

Benefit: Phase-appropriate recommendations
         guide you through best practices
```

## Integration with DevelopmentButler

DevelopmentButler automatically orchestrates the Workflow Guidance System:

### Automatic Checkpoint Detection

```typescript
// Butler detects checkpoints automatically
- File save detected → code-written phase
- Tests complete → test-complete phase
- Git add detected → commit-ready phase
- Git commit detected → committed phase
```

### Automatic Recommendations

```typescript
// Butler generates recommendations at each checkpoint
const guidance = await workflowGuidanceEngine.getGuidance({
  phase: detectedPhase,
  context: gatherContext()
});

// Present to user via MCP
return formatRecommendations(guidance);
```

### Automatic Health Monitoring

```typescript
// Butler monitors session health continuously
const health = await sessionContextMonitor.getHealth();

if (health.status === 'critical') {
  await claudeMdReloader.reload('token-threshold');
}
```

### No Manual Intervention Required

The system works automatically during development:
- Detection happens in background
- Recommendations appear at checkpoints
- Health monitoring is continuous
- CLAUDE.md reload triggers automatically

## Troubleshooting

### Issue: Recommendations Not Appearing

**Possible Causes:**
1. Workflow phase not detected
2. DevelopmentButler not active
3. MCP connection issue

**Solutions:**
1. Manually trigger with `get-workflow-guidance`
2. Verify butler is running
3. Check MCP server logs

### Issue: CLAUDE.md Not Reloading

**Possible Causes:**
1. Cooldown period active
2. MCP resources/updated not supported
3. File permission issues

**Solutions:**
1. Wait for cooldown (check `get-session-health`)
2. Verify Claude Code version supports MCP resources
3. Check `~/.claude/CLAUDE.md` is readable

### Issue: Inaccurate Token Tracking

**Possible Causes:**
1. Token usage not being recorded
2. Multiple sessions sharing budget
3. Budget configuration mismatch

**Solutions:**
1. Ensure `record-token-usage` is called after API calls
2. Use separate budgets per session
3. Verify budget settings in configuration

## Configuration

### Token Budget

Configure in environment or MCP settings:
```json
{
  "tokenBudget": 200000,
  "warningThreshold": 0.8,
  "criticalThreshold": 0.9
}
```

### Auto-Reload

Enable automatic CLAUDE.md reload:
```json
{
  "autoReload": true,
  "reloadOnCritical": true,
  "cooldownMinutes": 5
}
```

### Workflow Guidance

Customize recommendation behavior:
```json
{
  "guidanceEnabled": true,
  "confidenceThreshold": 0.7,
  "maxRecommendations": 5
}
```

## Examples

### Example 1: Complete Feature Development

```
1. Start coding
   Phase: code-written
   Recommendation: Run tests

2. Run tests
   Phase: test-complete
   Recommendation: Review coverage, commit

3. Review and stage
   Phase: commit-ready
   Recommendation: Review message, final checks

4. Commit
   Phase: committed
   Recommendation: Push, update docs
```

### Example 2: Token Budget Management

```
Start: 0% → healthy
Work: 50% → healthy (continue)
Work: 80% → warning (consider reload soon)
Work: 85% → warning (plan to reload)
Work: 90% → critical (auto-reload triggered)
After reload: 0% → healthy (fresh start)
```

### Example 3: Emergency Reload

```
Situation: Session degrading, responses incoherent
Action: Manual reload via get-session-health

1. Check health: critical (95%)
2. Trigger reload: reload-context
3. Wait for cooldown: 5 minutes
4. Verify: health now healthy (0%)
5. Resume work: improved quality
```

## API Reference

### WorkflowPhase Type

```typescript
type WorkflowPhase =
  | 'idle'
  | 'code-written'
  | 'test-complete'
  | 'commit-ready'
  | 'committed';
```

### SessionStatus Type

```typescript
type SessionStatus =
  | 'healthy'
  | 'warning'
  | 'critical';
```

### Recommendation Type

```typescript
interface Recommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  description: string;
  reasoning: string[];
  estimatedTime?: string;
}
```

### SessionHealth Type

```typescript
interface SessionHealth {
  status: SessionStatus;
  tokenUsage: {
    total: number;
    budget: number;
    percentage: number;
  };
  warnings: Warning[];
  recommendations: Recommendation[];
}
```

## Related Documentation

- [Architecture Overview](../architecture/OVERVIEW.md) - System design
- [MCP Integration Guide](../MCP_INTEGRATION.md) - MCP server setup
- [Development Butler Guide](../guides/DEVELOPMENT_BUTLER.md) - Butler features
- [API Documentation](../API.md) - Complete API reference

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Status**: Production Ready
