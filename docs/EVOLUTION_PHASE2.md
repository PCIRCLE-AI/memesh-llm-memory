# Evolution System - Phase 2: Advanced Learning

## Overview

Phase 2 extends the Evolution System with advanced learning capabilities that enable agents to:

- **Learn from rich contextual data** beyond simple success/failure metrics
- **Match patterns based on context similarity** to apply lessons in relevant situations
- **Optimize for multiple competing objectives** (accuracy, speed, cost, satisfaction)
- **Explain learned patterns** in human-readable language

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   LearningManager (Phase 2)                  │
├─────────────────────────────────────────────────────────────┤
│  Phase 2 Components:                                         │
│  ┌────────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │ ContextMatcher │ │  Multi-      │ │    Pattern      │  │
│  │                │ │  Objective   │ │   Explainer     │  │
│  │ - Similarity   │ │  Optimizer   │ │                 │  │
│  │   calculation  │ │              │ │ - Human-        │  │
│  │ - Weighted     │ │ - Pareto     │ │   readable      │  │
│  │   matching     │ │   fronts     │ │   summaries     │  │
│  │ - Jaccard for  │ │ - Weighted   │ │ - Actionable    │  │
│  │   config_keys  │ │   selection  │ │   recommen-     │  │
│  │                │ │              │ │   dations       │  │
│  └────────────────┘ └──────────────┘ └─────────────────┘  │
│                                                              │
│  Storage:                                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ SQLiteStore (Migration v4)                            │ │
│  │ - Context fields: complexity, config_keys, metadata  │ │
│  │ - Indexes for efficient context-based queries        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Context-Aware Pattern Learning

Patterns are now enriched with contextual metadata:

```typescript
interface ContextualPattern {
  id: string;
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
  description: string;
  confidence: number;
  observations: number;
  success_rate: number;
  avg_execution_time: number;
  last_seen: string;

  // Rich context for pattern matching
  context: {
    agent_type?: string;
    task_type?: string;
    complexity?: 'low' | 'medium' | 'high';
    config_keys?: string[];
    metadata?: Record<string, any>;
  };
}
```

**Complexity Inference**:
- `low`: Average execution time < 5 seconds
- `medium`: Average execution time 5-15 seconds
- `high`: Average execution time ≥ 15 seconds

### 2. Context Similarity Matching

The `ContextMatcher` computes similarity scores between contexts using weighted dimensions:

**Default Weights**:
- `agent_type`: 0.4 (40%)
- `task_type`: 0.3 (30%)
- `complexity`: 0.2 (20%)
- `config_keys`: 0.1 (10%)

**Shape-Aware Matching**:
- **Both defined and equal**: Full weight contribution (1.0)
- **Both undefined**: Full weight contribution (1.0) - structural similarity
- **One defined, one undefined**: No contribution (0.0)
- **Both defined but different**: No contribution (0.0)

**Config Keys Matching**:
Uses Jaccard similarity for set-based comparison:
```
similarity = |A ∩ B| / |A ∪ B|
```

**Example**:
```typescript
const matcher = new ContextMatcher();

const ctx1 = {
  agent_type: 'code-reviewer',
  task_type: 'review_large_pr',
  complexity: 'high',
};

const ctx2 = {
  agent_type: 'code-reviewer',
  task_type: 'review_large_pr',
  complexity: 'high',
};

const similarity = matcher.computeSimilarity(ctx1, ctx2);
// Result: 1.0 (perfect match)
```

### 3. Multi-Objective Optimization

The `MultiObjectiveOptimizer` handles competing objectives using Pareto optimization:

**Objectives Supported**:
- `accuracy`: Quality score (0-1)
- `speed`: Inverse of duration (higher is better)
- `cost`: Cost efficiency (inverse of cost)
- `satisfaction`: User satisfaction score
- Custom objectives (dynamic)

**Pareto Front**:
A candidate **dominates** another if:
- It is **better or equal** in all objectives, AND
- It is **strictly better** in at least one objective

The Pareto front contains all non-dominated candidates.

**Weighted Selection**:
After identifying the Pareto front, select the best candidate using weighted scalarization:

```typescript
score = Σ(weight_i × objective_i)
```

**Example**:
```typescript
const optimizer = new MultiObjectiveOptimizer();

// Find optimal configuration for accuracy-focused scenario
const optimalConfig = learningManager.findOptimalConfiguration('agent-1', {
  accuracy: 0.7,  // High weight on quality
  speed: 0.15,
  cost: 0.15,
});

console.log(optimalConfig.objectives);
// { accuracy: 0.95, speed: 0.33, cost: 100 }
```

### 4. Pattern Explainability

The `PatternExplainer` generates human-readable explanations for learned patterns:

**Explanation Components**:
- **Summary**: One-line description of the pattern
- **Reasoning**: Detailed explanation of why the pattern was learned
- **Recommendation**: Actionable advice for applying the pattern
- **Confidence Explanation**: Interpretation of the confidence level
- **Context Description**: Natural language description of when pattern applies

**Confidence Interpretation**:
- **Very high**: ≥ 90%
- **High**: 75-89%
- **Moderate**: 60-74%
- **Low**: < 60%

**Example**:
```typescript
const explanation = learningManager.explainPattern(pattern.id);

console.log(explanation);
/*
{
  summary: "Successful pattern for code-reviewer doing review_large_pr: Increase timeout for large PRs",

  reasoning: [
    "This pattern was observed 12 times in similar contexts",
    "Pattern has 85% confidence based on consistency across observations",
    "Historical success rate: 92% when this pattern was applied",
    "Average execution time: 5000ms",
    "Most effective for high complexity tasks"
  ],

  recommendation: "Consider applying this pattern when agent is code-reviewer and task is review_large_pr. Expected benefits: improved success rate and efficiency.",

  confidence_explanation: "High confidence (85%) based on 12 consistent observations",

  context_description: "agent is code-reviewer and task is review_large_pr and complexity is high"
}
*/
```

## Usage Guide

### Identifying Context-Aware Patterns

```typescript
import { PerformanceTracker } from './evolution/PerformanceTracker.js';
import { LearningManager } from './evolution/LearningManager.js';

// Initialize
const performanceTracker = new PerformanceTracker();
const learningManager = new LearningManager(performanceTracker, {
  minObservations: 3,
  minConfidence: 0.6,
  successRateThreshold: 0.7,
  failureRateThreshold: 0.3,
  maxPatternsPerAgent: 100,
});

// Track executions with rich context
performanceTracker.track({
  executionId: 'exec-1',
  agentId: 'full-stack-developer',
  taskType: 'implement_feature',
  success: true,
  durationMs: 15000,
  cost: 0.05,
  qualityScore: 0.95,
  timestamp: new Date(),
  metadata: {
    context: {
      complexity: 'high',
      files_changed: 10,
    },
  },
});

// Learn patterns
const patterns = await learningManager.identifyContextualPatterns('full-stack-developer');

console.log(patterns);
/*
[
  {
    id: '...',
    type: 'success',
    description: 'Successful execution pattern for implement_feature',
    confidence: 0.85,
    observations: 3,
    success_rate: 1.0,
    avg_execution_time: 15000,
    context: {
      agent_type: 'full-stack-developer',
      task_type: 'implement_feature',
      complexity: 'high',
    }
  }
]
*/
```

### Finding Optimal Configurations

```typescript
// Scenario: User wants high quality, balanced speed and cost
const qualityFocused = learningManager.findOptimalConfiguration('agent-1', {
  accuracy: 0.7,  // High weight on quality
  speed: 0.15,
  cost: 0.15,
});

// Scenario: User wants fast execution
const speedFocused = learningManager.findOptimalConfiguration('agent-1', {
  accuracy: 0.15,
  speed: 0.7,  // High weight on speed
  cost: 0.15,
});

// Compare
console.log('Quality-focused:', qualityFocused.objectives);
console.log('Speed-focused:', speedFocused.objectives);
```

### Explaining Patterns

```typescript
// Get pattern explanation
const explanation = learningManager.explainPattern(pattern.id);

// Display to user
console.log(`📊 ${explanation.summary}`);
console.log(`\n🔍 Why this pattern was learned:`);
explanation.reasoning.forEach((r) => console.log(`  - ${r}`));
console.log(`\n💡 Recommendation: ${explanation.recommendation}`);
console.log(`\n✅ ${explanation.confidence_explanation}`);
```

## Storage Schema (Migration v4)

Phase 2 extends the `patterns` table with context fields:

```sql
-- New columns added by migration v4
ALTER TABLE patterns ADD COLUMN complexity TEXT
  CHECK(complexity IN ('low', 'medium', 'high'));

ALTER TABLE patterns ADD COLUMN config_keys TEXT;  -- JSON array

ALTER TABLE patterns ADD COLUMN context_metadata TEXT;  -- JSON object

-- Indexes for efficient context-based queries
CREATE INDEX idx_patterns_agent_task
  ON patterns(applies_to_agent_type, applies_to_task_type);

CREATE INDEX idx_patterns_complexity
  ON patterns(complexity)
  WHERE complexity IS NOT NULL;
```

## Configuration

```typescript
interface LearningConfig {
  /**
   * Minimum observations before creating a pattern
   * Default: 5
   */
  minObservations: number;

  /**
   * Minimum confidence level to apply a pattern
   * Default: 0.7
   */
  minConfidence: number;

  /**
   * Success rate threshold for identifying success patterns
   * Default: 0.7 (70%)
   */
  successRateThreshold: number;

  /**
   * Failure rate threshold for identifying anti-patterns
   * Default: 0.3 (30%)
   */
  failureRateThreshold: number;

  /**
   * Maximum patterns to store per agent
   * Default: 100
   */
  maxPatternsPerAgent: number;
}
```

## Performance Considerations

### Context Similarity Calculation

- **Complexity**: O(1) for most fields, O(n) for config_keys Jaccard similarity
- **Optimization**: Pre-compute Set objects for config_keys to avoid repeated conversions

### Multi-Objective Optimization

- **Pareto Front**: O(n²) worst case for n candidates
- **Optimization**: Early termination when candidate is dominated
- **Typical Performance**: O(n log n) for most real-world datasets

### Pattern Storage

- **SQLite Indexes**: Indexed on (agent_type, task_type) and complexity
- **Query Performance**: O(log n) for context-based queries
- **Storage**: Approximately 1KB per contextual pattern

## Testing

Phase 2 includes comprehensive test coverage:

- **Unit Tests**: 27 tests across 5 test files
  - Context-aware pattern storage (6 tests)
  - Context similarity matching (12 tests)
  - Multi-objective optimization (3 tests)
  - Pattern explainability (3 tests)
  - Enhanced LearningManager (3 tests)

- **Integration Tests**: 3 end-to-end scenarios
  - Full learning and adaptation cycle
  - Mixed success/failure patterns
  - Pattern preservation across learning cycles

**Run Tests**:
```bash
npm test -- src/evolution/
```

## Migration from Phase 1

Phase 2 is fully backward compatible with Phase 1:

1. **Existing patterns continue to work**: Migration v4 adds new columns without removing old ones
2. **Gradual adoption**: Start using contextual patterns alongside existing patterns
3. **No breaking changes**: All Phase 1 APIs remain functional

**Migration Steps**:
1. Database migration runs automatically on first use
2. Start tracking executions with `metadata.context` field
3. Use `identifyContextualPatterns()` for new context-aware learning
4. Optionally use `findOptimalConfiguration()` for multi-objective optimization
5. Optionally use `explainPattern()` for human-readable explanations

## Future Enhancements (Phase 3)

Potential areas for expansion:

- **Transfer Learning**: Apply patterns learned from one agent to similar agents
- **Active Learning**: Proactively suggest experiments to fill knowledge gaps
- **Continuous Adaptation**: Real-time pattern updates as new data arrives
- **Pattern Composition**: Combine multiple patterns for complex scenarios
- **Visualization**: Graphical representation of Pareto fronts and pattern relationships

## See Also

- [Evolution System Overview](./EVOLUTION.md)
- [Performance Tracking](./PERFORMANCE_TRACKING.md)
- [Storage Layer](./STORAGE.md)
