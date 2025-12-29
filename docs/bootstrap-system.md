# Bootstrap System Documentation

## Overview

The Bootstrap System provides immediate value to new users by preloading common workflow patterns before they have enough data to learn patterns themselves.

## Components

### 1. EvolutionBootstrap Class
**Location**: `src/evolution/EvolutionBootstrap.ts`

**Responsibilities**:
- Detect new users (< 10 task records)
- Load and validate bootstrap patterns from JSON
- Import patterns into LearningManager
- Provide bootstrap statistics

**Key Methods**:
- `shouldBootstrap()`: Check if user needs bootstrap patterns
- `loadBootstrapPatterns()`: Load and validate patterns from JSON
- `importPatterns()`: Import patterns into LearningManager
- `getBootstrapStats()`: Get statistics about bootstrap status

### 2. Bootstrap Patterns File
**Location**: `data/bootstrap/patterns.json`

**Structure**:
```json
{
  "version": "1.0.0",
  "description": "Bootstrap patterns for new users",
  "patterns": [
    {
      "id": "bootstrap-code-review-workflow",
      "type": "success",
      "name": "code-review-workflow",
      "description": "Standard code review workflow: implement → test → review",
      "sequence": ["backend-specialist", "test-writer", "code-reviewer"],
      "confidence": 0.5,
      "observationCount": 50,
      "successCount": 40,
      "successRate": 0.8,
      "taskType": "code-review",
      "conditions": { ... },
      "action": { ... }
    },
    ...
  ]
}
```

**Included Patterns** (12 total):
1. `code-review-workflow` - implement → test → review
2. `test-driven-development` - write tests first → implement → verify
3. `debugging-workflow` - debug → fix → test → verify
4. `performance-optimization` - profile → optimize → verify
5. `security-audit` - audit → review → fix → verify
6. `api-development` - design → implement → test → review
7. `frontend-development` - design → implement → test
8. `backend-development` - design → implement → optimize → test
9. `refactoring-workflow` - analyze → refactor → test → review
10. `deployment-workflow` - test → review → audit → deploy
11. `data-analysis` - analyze → visualize → insights
12. `documentation-workflow` - write → review → publish

## Design Principles

### 1. Lower Confidence (0.5)
Bootstrap patterns have lower confidence than learned patterns, ensuring they are gradually replaced by real data as the user accumulates task history.

### 2. Validation
All patterns are validated before import:
- Sequence length ≥ 2 agents
- All agents exist in AgentRegistry
- Confidence range: 0.0 - 1.0
- Success rate calculation accuracy
- Required fields present

### 3. Non-Intrusive
Bootstrap patterns are only loaded for new users (< 10 tasks). Existing users with sufficient history are not affected.

## Integration with LearningManager

The `LearningManager` class has been enhanced with the `addBootstrapPattern()` method to support bootstrap pattern import:

```typescript
learningManager.addBootstrapPattern(pattern: LearnedPattern): void
```

**Features**:
- Checks for duplicate patterns (by ID)
- Adds patterns to the appropriate agent's pattern list
- Automatically trims patterns if max limit is exceeded (keeping highest confidence)

## PerformanceTracker Enhancement

Added `getTotalTaskCount()` method to support bootstrap eligibility checking:

```typescript
performanceTracker.getTotalTaskCount(): number
```

Returns the total number of tracked tasks across all agents.

## Usage Example

```typescript
import { EvolutionBootstrap } from './evolution';
import { AgentRegistry } from './core/AgentRegistry';
import { PerformanceTracker } from './evolution/PerformanceTracker';
import { LearningManager } from './evolution/LearningManager';

// Initialize components
const agentRegistry = new AgentRegistry();
const performanceTracker = new PerformanceTracker();
const learningManager = new LearningManager(performanceTracker);

// Create bootstrap manager
const bootstrap = new EvolutionBootstrap(
  agentRegistry,
  performanceTracker,
  'data' // data directory path
);

// Check if bootstrap is needed
if (await bootstrap.shouldBootstrap()) {
  // Import bootstrap patterns
  const imported = await bootstrap.importPatterns(learningManager);
  console.log(`Imported ${imported} bootstrap patterns`);
}

// Get bootstrap statistics
const stats = await bootstrap.getBootstrapStats();
console.log('Bootstrap stats:', stats);
/*
{
  isNewUser: true,
  taskCount: 5,
  availablePatterns: 12,
  validPatterns: 12,
  invalidPatterns: 0
}
*/
```

## Configuration

### Bootstrap Threshold
Default: 10 tasks

Users with fewer than 10 completed tasks are considered "new" and will receive bootstrap patterns.

### Bootstrap File Location
Default: `data/bootstrap/patterns.json`

Can be customized via the `dataDir` constructor parameter.

### Pattern Confidence
Default: 0.5

All bootstrap patterns use 0.5 confidence, ensuring they are replaced as the user accumulates real data and learns higher-confidence patterns.

## Validation Rules

The bootstrap system validates all patterns before import:

1. **Sequence Length**: Must have ≥ 2 agents
2. **Agent Existence**: All agents in sequence must exist in AgentRegistry
3. **Confidence Range**: Must be between 0.0 and 1.0
4. **Success Rate Accuracy**: Calculated success rate must match declared rate (within 1% tolerance)
5. **Required Fields**: id, type, taskType, description must be present

Invalid patterns are logged but do not stop the import of valid patterns.

## Future Enhancements

1. **Dynamic Bootstrap Generation**: Generate bootstrap patterns from aggregated user data
2. **Domain-Specific Patterns**: Different bootstrap sets for different domains (web dev, data science, etc.)
3. **Pattern Expiry**: Auto-remove bootstrap patterns after user reaches threshold
4. **Bootstrap Updates**: Version-controlled updates to bootstrap patterns
5. **User Feedback**: Allow users to rate bootstrap pattern usefulness

## Testing

### Unit Tests
- Pattern validation logic
- Bootstrap eligibility detection
- Pattern conversion

### Integration Tests
- Full bootstrap workflow
- LearningManager integration
- AgentRegistry integration

### E2E Tests
- New user onboarding flow
- Bootstrap pattern application
- Gradual replacement with learned patterns

## Version History

- **v1.0.0** (2025-12-29): Initial implementation
  - 12 preloaded workflow patterns
  - Complete validation system
  - LearningManager integration
  - PerformanceTracker enhancement
