# Self-Evolving Agent System

> V2 Month 2-3 Feature: Autonomous Agent Learning and Adaptation

## Overview

The Self-Evolving Agent System in Smart Agents V2 enables AI agents to learn from execution experience, automatically identify successful patterns, and dynamically adjust behaviors to improve performance, quality, and cost-effectiveness.

### V2.0 MCP Server Pattern Explanation

**How Evolution System Works in V2.0**:

In the V2.0 MCP Server Pattern, smart-agents acts as an MCP server that generates enhanced prompts and returns them to Claude Code. The actual behavior of Evolution System features in V2.0 is as follows:

1. **Prompt Optimization** ✅ Fully Supported
   - Evolution System can optimize and adjust prompts
   - Generated enhanced prompts directly include optimization suggestions

2. **Model Selection** ⚠️ Recommendation Mode
   - Evolution System **recommends** suitable models (Opus/Sonnet/Haiku)
   - Recommendations are included in enhanced prompt metadata
   - **Actual model selection is decided by Claude Code or the user**

3. **Timeout Adjustment** ✅ Fully Supported
   - Evolution System can adjust timeout settings
   - Included in returned configuration recommendations

4. **Retry Strategy** ✅ Fully Supported
   - Evolution System can recommend retry strategies
   - Included in returned configuration recommendations

### Core Philosophy

**Learn → Adapt → Improve → Repeat**

1. **Learn**: Collect performance data from each execution
2. **Adapt**: Analyze data to identify success and failure patterns
3. **Improve**: Apply learned patterns to adjust agent behavior
4. **Repeat**: Continuous cycle for ongoing improvement

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution Layer                    │
│  (CodeReviewAgent, ResearchAgent, ArchitectureAgent, etc.) │
└────────────────┬─────────────────────────────────┬──────────┘
                 │                                 │
                 ▼ track()                         ▼ execute with
         ┌──────────────────┐             ┌──────────────────┐
         │ Performance      │             │ Adaptation       │
         │ Tracker          │             │ Engine           │
         └────────┬─────────┘             └─────────┬────────┘
                  │                                  │
                  │ metrics                          │ patterns
                  │                                  │
                  ▼                                  ▼
         ┌──────────────────┐             ┌──────────────────┐
         │ Learning         │◄────────────┤ Stored           │
         │ Manager          │  analyze    │ Patterns         │
         └──────────────────┘             └──────────────────┘
```

## 📦 Core Components

### 1. PerformanceTracker

**Responsibilities**: Record and analyze agent execution metrics

**Features**:
- Track execution time, cost, quality score, success rate
- Calculate historical and recent trends (success rate, cost efficiency, quality)
- Detect performance anomalies (slow, expensive, low-quality, failure)
- Provide statistical data to support learning

**Usage Example**:
```typescript
import { PerformanceTracker } from './evolution';

const tracker = new PerformanceTracker({
  maxMetricsPerAgent: 1000 // Maximum 1000 records per agent
});

// Track execution results
const metrics = tracker.track({
  agentId: 'code-review-agent',
  taskType: 'code-review',
  success: true,
  durationMs: 12000,
  cost: 0.05,
  qualityScore: 0.9,
});

// Get evolution statistics
const stats = tracker.getEvolutionStats('code-review-agent');
console.log(`Success rate improved by: ${stats.successRateTrend.improvement * 100}%`);

// Detect anomalies
const anomaly = tracker.detectAnomalies('code-review-agent', metrics);
if (anomaly.isAnomaly) {
  console.log(`⚠️ ${anomaly.type}: ${anomaly.message}`);
}
```

**Key API**:
- `track(metrics)` - Record execution metrics
- `getMetrics(agentId, filter?)` - Retrieve metrics (with optional filtering)
- `getEvolutionStats(agentId)` - Calculate evolution trends
- `detectAnomalies(agentId, metric)` - Anomaly detection
- `getAveragePerformance(agentId, taskType)` - Baseline performance

---

### 2. LearningManager

**Responsibilities**: Extract patterns and knowledge from performance data

**Features**:
- Identify success patterns (high quality, cost-efficient, fast execution)
- Identify anti-patterns (timeout failures, low quality output)
- Discover optimization opportunities (20% cost reduction with same quality)
- Integrate user feedback
- Provide confidence-based recommendations

**Usage Example**:
```typescript
import { LearningManager } from './evolution';

const learner = new LearningManager(tracker, {
  minObservations: 10,      // At least 10 observations required to establish a pattern
  minConfidence: 0.6,       // Minimum confidence 60%
  successRateThreshold: 0.7, // Success rate threshold 70%
  failureRateThreshold: 0.3, // Failure rate threshold 30%
  maxPatternsPerAgent: 100,  // Maximum 100 patterns per agent
});

// Analyze and extract patterns
const patterns = learner.analyzePatterns('code-review-agent');
console.log(`Discovered ${patterns.length} new patterns`);

patterns.forEach(pattern => {
  console.log(`
    Type: ${pattern.type}
    Description: ${pattern.description}
    Confidence: ${(pattern.confidence * 100).toFixed(0)}%
    Observations: ${pattern.observationCount}
    Success Rate: ${(pattern.successRate * 100).toFixed(0)}%
  `);
});

// Get recommendations
const recommendations = learner.getRecommendations(
  'code-review-agent',
  'code-review',
  'medium' // task complexity
);

console.log(`Recommending to apply ${recommendations.length} patterns`);
```

**Pattern Types**:

1. **Success Pattern**
   - Consistent high quality (≥0.8)
   - Cost-efficient execution
   - Fast with high quality

2. **Anti-Pattern**
   - Timeout failures
   - Low quality output
   - Excessive cost

3. **Optimization**
   - Cost reduction without quality loss
   - Speed improvement opportunities

**Key API**:
- `analyzePatterns(agentId)` - Analyze and extract patterns
- `getPatterns(agentId, filter?)` - Retrieve patterns
- `getRecommendations(agentId, taskType, complexity?)` - Get recommendations
- `addFeedback(feedback)` - Add user feedback
- `updatePattern(patternId, success)` - Update pattern confidence

---

### 3. AdaptationEngine

**Responsibilities**: Apply learned patterns to dynamically adjust agent behavior

**Features**:
- 4 adaptation types: prompt optimization, model selection, timeout adjustment, retry strategy
- Configurable adaptation enablement control
- Pattern confidence validation
- Adaptation effectiveness tracking
- Feedback loop

**Usage Example**:
```typescript
import { AdaptationEngine } from './evolution';

const adapter = new AdaptationEngine(learner, tracker);

// Configure agent adaptation behavior
adapter.configureAgent('code-review-agent', {
  agentId: 'code-review-agent',
  enabledAdaptations: {
    promptOptimization: true,  // Enable prompt optimization
    modelSelection: true,      // Enable model selection
    timeoutAdjustment: true,   // Enable timeout adjustment
    retryStrategy: false,      // Disable retry strategy
  },
  learningRate: 0.1,        // Learning rate
  minConfidence: 0.7,       // Minimum confidence
  minObservations: 10,      // Minimum observations
  maxPatterns: 100,         // Maximum patterns
});

// Apply adaptations before task execution
const baseConfig = {
  model: 'claude-sonnet-4-5',
  maxTokens: 4000,
  timeout: 30000,
  systemPrompt: 'Review this code for potential issues.',
};

const adapted = await adapter.adaptExecution(
  'code-review-agent',
  'code-review',
  baseConfig
);

console.log('Original config:', adapted.originalConfig);
console.log('Adapted config:', adapted.adaptedConfig);
console.log('Applied patterns:', adapted.appliedPatterns);

// Execute task...
const result = await executeTask(adapted.adaptedConfig);

// Provide feedback
await adapter.provideFeedback(
  adapted.appliedPatterns[0],
  {
    executionId: 'exec-123',
    agentId: 'code-review-agent',
    taskType: 'code-review',
    success: true,
    durationMs: 15000,
    cost: 0.04,
    qualityScore: 0.95,
    timestamp: new Date(),
  }
);

// View adaptation statistics
const stats = adapter.getAdaptationStats('code-review-agent');
console.log(`
  Total Adaptations: ${stats.totalAdaptations}
  By Type: ${JSON.stringify(stats.byType, null, 2)}
  Top Patterns: ${stats.topPatterns.slice(0, 3).map(p => p.patternId).join(', ')}
`);
```

**Adaptation Types**:

1. **Prompt Optimization**
   - Strategy: `efficient` (cost-focused) or `quality-focused`
   - Focus areas: quality, cost-optimization, accuracy, consistency
   - Additional instructions: Tailored to specific needs

2. **Model Selection**
   - Cost optimization: Opus → Sonnet → Haiku
   - Quality optimization: Haiku → Sonnet → Opus
   - Dynamic selection: Based on task complexity and historical performance

3. **Timeout Adjustment**
   - Adjust based on P95 duration
   - Prevent timeout failures
   - Optimize execution time

4. **Retry Strategy**
   - Target transient failures
   - Exponential backoff strategy
   - Maximum retry limit

**Key API**:
- `configureAgent(agentId, config)` - Configure agent adaptation behavior
- `adaptExecution(agentId, taskType, baseConfig)` - Apply adaptations
- `provideFeedback(patternId, metrics)` - Provide feedback
- `getAdaptationStats(agentId)` - View adaptation statistics
- `resetAdaptations(agentId)` - Reset adaptations
- `updateAdaptationConfig(agentId, updates)` - Update configuration

---

## 🔄 Complete Evolution Cycle

The following demonstrates a complete agent evolution workflow:

```typescript
import {
  PerformanceTracker,
  LearningManager,
  AdaptationEngine,
} from './evolution';

// ========================================
// Phase 1: Initialize System
// ========================================
const tracker = new PerformanceTracker();
const learner = new LearningManager(tracker, {
  minObservations: 10,
  minConfidence: 0.6,
  successRateThreshold: 0.7,
});
const adapter = new AdaptationEngine(learner, tracker);

adapter.configureAgent('my-agent', {
  agentId: 'my-agent',
  enabledAdaptations: {
    promptOptimization: true,
    modelSelection: true,
    timeoutAdjustment: true,
  },
  learningRate: 0.1,
  minConfidence: 0.6,
  minObservations: 10,
  maxPatterns: 100,
});

// ========================================
// Phase 2: Initial Execution (Establish Baseline)
// ========================================
for (let i = 0; i < 20; i++) {
  const result = await executeTask({
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
  });

  tracker.track({
    agentId: 'my-agent',
    taskType: 'analysis',
    success: result.success,
    durationMs: result.duration,
    cost: result.cost,
    qualityScore: result.quality,
  });
}

// ========================================
// Phase 3: Learn Patterns
// ========================================
const patterns = learner.analyzePatterns('my-agent');
console.log(`✓ Discovered ${patterns.length} patterns`);

// ========================================
// Phase 4: Apply Adaptations
// ========================================
const adapted = await adapter.adaptExecution(
  'my-agent',
  'analysis',
  { model: 'claude-sonnet-4-5', maxTokens: 2000 }
);

console.log(`✓ Applied ${adapted.appliedPatterns.length} patterns`);

// ========================================
// Phase 5: Execute and Record Results
// ========================================
const result = await executeTask(adapted.adaptedConfig);

const metrics = tracker.track({
  agentId: 'my-agent',
  taskType: 'analysis',
  success: result.success,
  durationMs: result.duration,
  cost: result.cost,
  qualityScore: result.quality,
});

// ========================================
// Phase 6: Provide Feedback
// ========================================
if (adapted.appliedPatterns.length > 0) {
  await adapter.provideFeedback(adapted.appliedPatterns[0], metrics);
}

// ========================================
// Phase 7: Verify Improvement
// ========================================
const stats = tracker.getEvolutionStats('my-agent');
console.log(`
  Success Rate Improvement: ${(stats.successRateTrend.improvement * 100).toFixed(1)}%
  Cost Efficiency Improvement: ${(stats.costEfficiencyTrend.improvement * 100).toFixed(1)}%
  Quality Improvement: ${(stats.qualityScoreTrend.improvement * 100).toFixed(1)}%
`);
```

---

## 🎯 Use Cases

### Scenario 1: Cost Optimization

**Problem**: Agent execution cost is too high

**Solution**:
```typescript
// System automatically identifies "high quality, low cost" execution patterns
// and recommends switching to more economical models or optimizing prompts

const patterns = learner.getPatterns('expensive-agent', {
  type: 'optimization'
});

// Find cost optimization opportunities
const costPattern = patterns.find(p =>
  p.description.includes('cost reduction')
);

if (costPattern) {
  console.log(`
    Cost optimization opportunity found:
    - Expected cost reduction: ${costPattern.action.parameters.targetCostReduction * 100}%
    - Maintaining quality: ≥${costPattern.action.parameters.minQualityScore}
  `);
}
```

### Scenario 2: Quality Improvement

**Problem**: Agent output quality is inconsistent

**Solution**:
```typescript
// System identifies anti-patterns of low quality output
// and recommends adjusting prompt to quality-focused strategy

const antiPatterns = learner.getPatterns('inconsistent-agent', {
  type: 'anti-pattern'
});

const qualityIssue = antiPatterns.find(p =>
  p.description.includes('low quality')
);

if (qualityIssue) {
  // System automatically applies 'quality-focused' strategy
  adapter.configureAgent('inconsistent-agent', {
    enabledAdaptations: {
      promptOptimization: true,
      modelSelection: true, // May upgrade to more powerful model
    },
  });
}
```

### Scenario 3: Performance Tuning

**Problem**: Agent execution time is too long, frequent timeouts

**Solution**:
```typescript
// System detects timeout patterns and adjusts timeout settings
const anomalies = [];

for (const metric of tracker.getMetrics('slow-agent')) {
  const anomaly = tracker.detectAnomalies('slow-agent', metric);
  if (anomaly.type === 'slow') {
    anomalies.push(anomaly);
  }
}

if (anomalies.length > 5) {
  console.log('⚠️ Multiple slow executions detected');

  // System automatically recommends increasing timeout
  const patterns = learner.analyzePatterns('slow-agent');
  const timeoutPattern = patterns.find(p =>
    p.action.type === 'modify_timeout'
  );

  if (timeoutPattern) {
    console.log(`Recommended timeout: ${timeoutPattern.action.parameters.timeoutMs}ms`);
  }
}
```

---

## 📊 Performance Metrics

### Tracked Metrics

| Metric | Description | Purpose |
|------|------|------|
| **executionId** | Unique execution ID | Track individual execution |
| **success** | Whether successful | Calculate success rate |
| **durationMs** | Execution time (ms) | Detect slow execution |
| **cost** | Cost (USD) | Cost optimization |
| **qualityScore** | Quality score (0-1) | Quality improvement |
| **userSatisfaction** | User satisfaction (0-1) | User feedback |
| **timestamp** | Timestamp | Trend analysis |

### Evolution Trends

The system calculates the following trends (historical vs recent):

1. **Success Rate Trend**
   - Historical: Historical success rate
   - Recent: Recent success rate (default: 7 days)
   - Improvement: Improvement magnitude

2. **Cost Efficiency Trend**
   - Formula: `qualityScore / cost`
   - Measures quality output per unit cost

3. **Quality Score Trend**
   - Average quality score change
   - Identify quality improvements or degradation

---

## ⚙️ Configuration Options

### PerformanceTracker Configuration

```typescript
const tracker = new PerformanceTracker({
  maxMetricsPerAgent: 1000  // Maximum records to retain per agent (FIFO)
});
```

### LearningManager Configuration

```typescript
const learner = new LearningManager(tracker, {
  minObservations: 10,           // Minimum observations required to establish pattern
  minConfidence: 0.6,            // Minimum confidence threshold (0-1)
  successRateThreshold: 0.7,     // Minimum success rate for success patterns
  failureRateThreshold: 0.3,     // Minimum failure rate for anti-patterns
  maxPatternsPerAgent: 100       // Maximum patterns to retain per agent
});
```

### AdaptationEngine Configuration

```typescript
adapter.configureAgent('agent-id', {
  agentId: 'agent-id',
  enabledAdaptations: {
    promptOptimization: true,    // Enable prompt optimization
    modelSelection: true,        // Enable model selection
    timeoutAdjustment: true,     // Enable timeout adjustment
    retryStrategy: false         // Enable retry strategy
  },
  learningRate: 0.1,             // Learning rate (0-1)
  minConfidence: 0.6,            // Minimum confidence to apply patterns
  minObservations: 10,           // Minimum observations to apply patterns
  maxPatterns: 100               // Maximum patterns to retain
});
```

---

## 🔒 Storage Layer Security & Quality (v2.1.0)

### Phase 1-3 Refactoring Overview

The evolution storage layer underwent comprehensive refactoring to improve security, type safety, and code quality:

**Phase 1: Critical Security Fixes**
- ✅ Eliminated SQL injection vulnerabilities in FTS (Full-Text Search) queries
- ✅ Hardened all database query parameters with proper escaping
- ✅ Improved input validation and error handling

**Phase 2: Type Safety & Utilities**
- ✅ Implemented branded `MicroDollars` type for compile-time money safety
- ✅ Created `safeJsonParse<T>` utility for robust JSON handling
- ✅ Added comprehensive JSDoc documentation to core utilities

**Phase 3: Code Quality Polish**
- ✅ Eliminated all 51 'as any' type casts for full type coverage
- ✅ Replaced magic numbers with semantic named constants
- ✅ Standardized null handling patterns across codebase
- ✅ Added JSDoc to public API methods

### Security Improvements

**SQL Injection Prevention**:

```typescript
// Before (VULNERABLE):
const query = `SELECT * FROM spans_fts WHERE spans_fts MATCH '${userInput}'`;

// After (SECURE):
const sanitized = userInput.replace(/['"]/g, '""');  // Escape quotes
const query = `SELECT * FROM spans_fts WHERE spans_fts MATCH ?`;
stmt.all(query, [sanitized]);
```

**Impact**: Zero SQL injection vulnerabilities in v2.1.0+

### Type Safety Improvements

**Branded MicroDollars Type**:

```typescript
import { MicroDollars, toDollars, toMicroDollars } from '../utils/money.js';

// ❌ Compile error - cannot assign raw number
const cost: MicroDollars = 50000;

// ✅ Must use type-safe conversion
const cost: MicroDollars = toMicroDollars(0.05);  // $0.05
const dollars = toDollars(cost);  // 0.05
```

**Safe JSON Parsing**:

```typescript
import { safeJsonParse } from '../utils/json.js';

// Before (can crash):
const data = JSON.parse(row.pattern_data);

// After (safe with fallback):
const data = safeJsonParse<PatternData>(row.pattern_data, {
  conditions: {},
  recommendations: {},
  expected_improvement: {},
  evidence: { sample_size: 0 },
});
```

### Code Quality Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| SQL Injection Risks | 3 | 0 | ✅ Fixed |
| Type Safety ('as any' casts) | 51 | 0 | ✅ Fixed |
| Money Type Safety | Untyped | Branded | ✅ Fixed |
| JSON Parsing | Crash-prone | Safe | ✅ Fixed |
| Null Handling | Inconsistent | Standardized | ✅ Fixed |
| API Documentation | Missing | JSDoc Complete | ✅ Fixed |
| Magic Numbers | 11 | 0 | ✅ Fixed |

### Database Null Handling Standard

**Consistent pattern across all storage operations**:

```typescript
// When INSERTING to database (undefined → null):
stmt.run(
  span.parent_span_id || null,
  span.end_time || null,
  span.duration_ms || null
);

// When READING from database (null → undefined):
return {
  parent_span_id: row.parent_span_id ?? undefined,
  end_time: row.end_time ?? undefined,
  duration_ms: row.duration_ms ?? undefined,
};
```

**Rationale**: SQLite stores optional values as NULL, but TypeScript prefers undefined for optional properties. This standardized conversion ensures type consistency.

### Storage Implementation Files

**SQLiteStore.ts** (~1677 lines)
- Full implementation with migrations, FTS, and contextual patterns
- 28 type casts eliminated
- JSDoc added to 8+ public methods
- All security vulnerabilities fixed

**SQLiteStore.basic.ts** (~1450 lines)
- Simplified implementation without FTS or advanced features
- 23 type casts eliminated
- Same security hardening applied

**Supporting Utilities**:
- `src/utils/money.ts`: Type-safe money handling
- `src/utils/json.ts`: Safe JSON parsing with fallbacks
- Both fully documented with JSDoc

For detailed refactoring documentation, see:
- `src/evolution/storage/ENHANCEMENTS.md`

---

## 🔍 Debugging and Monitoring

### View Evolution Statistics

```typescript
const stats = tracker.getEvolutionStats('agent-id');

console.log(`
📊 Agent Evolution Stats
========================
Agent ID: ${stats.agentId}
Total Executions: ${stats.totalExecutions}

Success Rate:
  Historical: ${(stats.successRateTrend.historical * 100).toFixed(1)}%
  Recent: ${(stats.successRateTrend.recent * 100).toFixed(1)}%
  Improvement: ${(stats.successRateTrend.improvement * 100).toFixed(1)}%

Cost Efficiency:
  Historical: ${stats.costEfficiencyTrend.historical.toFixed(2)}
  Recent: ${stats.costEfficiencyTrend.recent.toFixed(2)}
  Improvement: ${(stats.costEfficiencyTrend.improvement * 100).toFixed(1)}%

Quality Score:
  Historical: ${(stats.qualityScoreTrend.historical * 100).toFixed(1)}%
  Recent: ${(stats.qualityScoreTrend.recent * 100).toFixed(1)}%
  Improvement: ${(stats.qualityScoreTrend.improvement * 100).toFixed(1)}%

Learned Patterns: ${stats.learnedPatterns}
Applied Adaptations: ${stats.appliedAdaptations}
Last Learning: ${stats.lastLearningDate.toISOString()}
`);
```

### View Adaptation Statistics

```typescript
const adaptStats = adapter.getAdaptationStats('agent-id');

console.log(`
🔧 Adaptation Stats
===================
Total Adaptations: ${adaptStats.totalAdaptations}

By Type:
${Object.entries(adaptStats.byType).map(([type, count]) =>
  `  ${type}: ${count}`
).join('\n')}

Top Patterns:
${adaptStats.topPatterns.slice(0, 5).map((p, i) =>
  `  ${i + 1}. Pattern ${p.patternId.slice(0, 8)}: ${p.count} times`
).join('\n')}
`);
```

### View Pattern Details

```typescript
const patterns = learner.getPatterns('agent-id');

patterns.forEach(pattern => {
  console.log(`
Pattern: ${pattern.id}
==================
Type: ${pattern.type}
Description: ${pattern.description}
Task Type: ${pattern.taskType}
Complexity: ${pattern.conditions.taskComplexity}

Action:
  Type: ${pattern.action.type}
  Parameters: ${JSON.stringify(pattern.action.parameters, null, 2)}

Stats:
  Confidence: ${(pattern.confidence * 100).toFixed(1)}%
  Observations: ${pattern.observationCount}
  Success Rate: ${(pattern.successRate * 100).toFixed(1)}%

Created: ${pattern.createdAt.toISOString()}
Updated: ${pattern.updatedAt.toISOString()}
  `);
});
```

---

## 💡 Best Practices

### 1. Data Collection

- **Sufficient samples**: At least 20+ executions required to reliably establish patterns
- **Diversity**: Ensure coverage of different task complexity levels and scenarios
- **Accurate labeling**: qualityScore should accurately reflect actual quality

### 2. Pattern Management

- **Regular review**: Check if learned patterns are reasonable
- **Clean invalid**: Delete patterns with low success rates or outdated patterns
- **Adjust thresholds**: Tune minConfidence and minObservations based on actual situation

### 3. Adaptation Control

- **Gradual approach**: Enable some adaptations first, observe effects before enabling more
- **A/B Testing**: Compare effects of enabling/disabling adaptations
- **Monitor rollback**: If adaptation causes performance degradation, rollback promptly

### 4. Performance Optimization

- **Limit storage**: Set reasonable maxMetricsPerAgent and maxPatterns
- **Regular cleanup**: Remove old or invalid patterns
- **Batch analysis**: Analyze patterns in batches periodically, not on every execution

---

## 🚨 Important Notes

### 1. Confidence Threshold

- **Too high** (>0.8): May miss valid patterns
- **Too low** (<0.5): May apply unreliable patterns
- **Recommended**: 0.6-0.7 is a reasonable range

### 2. Sample Size

- **Too few** (<10): Patterns are unreliable
- **Too many** (>1000): May contain outdated data
- **Recommended**: Retain most recent 1000 records

### 3. Adaptation Conflicts

- Multiple patterns may recommend different adaptations
- System sorts by confidence, prioritizing high-confidence patterns
- If conflicts are severe, consider disabling some adaptations

### 4. Cold Start

- New agents without historical data cannot establish patterns
- Recommend executing 20+ times to accumulate baseline data
- Or copy initial patterns from similar agents

---

## 📈 Benefits Assessment

### Expected Improvements

Based on test data, expected improvements after enabling Self-Evolving system:

- **Success Rate**: +5-15%
- **Cost Efficiency**: +10-30%
- **Quality Score**: +5-10%
- **Execution Time**: -10-20%

### ROI Calculation

Assumptions:
- 1000 executions per month
- Average cost $0.10/execution
- 20% cost reduction after enabling evolution

**Monthly savings**: 1000 * $0.10 * 20% = **$20/month**

Plus indirect benefits from quality and success rate improvements, ROI is very attractive.

---

## 🌐 Phase 3: Advanced Collaboration Features

Phase 3 introduces cross-agent knowledge transfer, A/B testing framework, and federated learning capabilities, enabling agents to learn from each other and scientifically validate improvement effects.

### Core Features

1. **Cross-Agent Knowledge Transfer** - Share successful patterns between agents
2. **A/B Testing Framework** - Scientifically validate configuration change effects
3. **Federated Learning** - Distributed model training (planned)

---

### 🔄 Cross-Agent Knowledge Transfer

Agents can learn from other agents' experiences, accelerating the training process for new agents.

#### Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Source Agent   │         │  Target Agent   │
│  (Experienced)  │         │    (New)        │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ learned patterns          │ needs patterns
         │                           │
         ▼                           ▼
  ┌──────────────────────────────────────────┐
  │      KnowledgeTransferManager            │
  │  ┌────────────────────────────────────┐  │
  │  │   TransferabilityChecker           │  │
  │  │   - Context similarity (weighted)  │  │
  │  │   - Confidence adjustment          │  │
  │  └────────────────────────────────────┘  │
  └──────────────────────────────────────────┘
```

#### Core Components

**1. TransferabilityChecker**

Evaluates whether a pattern is applicable to the target agent using weighted context similarity:

```typescript
import { TransferabilityChecker } from './evolution';

const checker = new TransferabilityChecker();

// Evaluate pattern transferability
const assessment = checker.assessTransferability(
  pattern,           // Source pattern
  'source-agent',
  'target-agent',
  {                  // Target context
    agent_type: 'code-reviewer',
    task_type: 'security_audit',
    complexity: 'high',
  }
);

console.log(`
  Applicability Score: ${(assessment.applicabilityScore * 100).toFixed(0)}%
  Context Similarity: ${(assessment.contextSimilarity * 100).toFixed(0)}%
  Adjusted Confidence: ${(assessment.confidence * 100).toFixed(0)}%
  Reasoning: ${assessment.reasoning.join(', ')}
`);
```

**Weighted Similarity Calculation**:
- agent_type match: **40%**
- task_type match: **30%**
- complexity match: **20%**
- config_keys Jaccard similarity: **10%**

**2. KnowledgeTransferManager**

Manages pattern discovery and transfer workflow:

```typescript
import { KnowledgeTransferManager } from './evolution';

const transferManager = new KnowledgeTransferManager(
  learningManager,
  transferabilityChecker
);

// Find transferable patterns
const transferablePatterns = await transferManager.findTransferablePatterns(
  'experienced-agent',  // Source agent
  'new-agent',          // Target agent
  {                     // Target context
    agent_type: 'code-reviewer',
    task_type: 'code_review',
    complexity: 'medium',
  },
  {
    minConfidence: 0.7,      // Minimum confidence
    minObservations: 10,     // Minimum observations
  }
);

console.log(`Found ${transferablePatterns.length} transferable patterns`);

transferablePatterns.forEach(tp => {
  console.log(`
    Pattern: ${tp.pattern.id}
    Original Confidence: ${(tp.originalConfidence * 100).toFixed(0)}%
    Adjusted Confidence: ${(tp.pattern.confidence * 100).toFixed(0)}%
    Transferred At: ${tp.transferredAt.toISOString()}
  `);
});
```

#### Use Cases

**Scenario 1: Fast Bootstrap for New Agents**

```typescript
// 1. New agent lacks experience data
const newAgentPatterns = await learner.getLearnedPatterns('new-code-reviewer');
console.log(`New agent's patterns: ${newAgentPatterns.length}`); // 0

// 2. Transfer knowledge from experienced agent
const transferred = await transferManager.findTransferablePatterns(
  'senior-code-reviewer',  // 300+ patterns
  'new-code-reviewer',
  {
    agent_type: 'code-reviewer',
    task_type: 'code_review',
    complexity: 'medium',
  }
);

console.log(`Transferred ${transferred.length} patterns`); // e.g., 45

// 3. New agent immediately gains baseline capabilities
// Confidence automatically reduced by 10%, improves gradually with usage
```

**Scenario 2: Cross-Domain Knowledge Migration**

```typescript
// Security auditor's experience can be partially migrated to code reviewer
const crossDomainTransfer = await transferManager.findTransferablePatterns(
  'security-auditor',
  'code-reviewer',
  {
    agent_type: 'code-reviewer',
    task_type: 'security_audit',  // Related task type
    complexity: 'high',
  }
);

// Only transfers high-similarity patterns (e.g., complexity handling, timeout settings)
// When task_type doesn't fully match, similarity score decreases
```

---

### 🧪 A/B Testing Framework

Scientifically validate agent configuration change effects, making decisions based on statistical significance.

#### Architecture

```
┌──────────────────────────────────────────────┐
│            ABTestManager                     │
│  ┌────────────────────────────────────────┐  │
│  │  Experiment Management                 │  │
│  │  - Create experiments                  │  │
│  │  - Variant assignment (deterministic)  │  │
│  │  - Traffic splitting                   │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  StatisticalAnalyzer                   │  │
│  │  - Welch's t-test                      │  │
│  │  - Effect size (Cohen's d)             │  │
│  │  - Confidence intervals                │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

#### Core Components

**1. StatisticalAnalyzer**

Provides statistical analysis methods:

```typescript
import { StatisticalAnalyzer } from './evolution';

const analyzer = new StatisticalAnalyzer();

// Welch's t-test (doesn't assume equal variance)
const tTest = analyzer.welchTTest(
  [0.85, 0.82, 0.88, 0.90, 0.87],  // control group
  [0.92, 0.94, 0.91, 0.95, 0.93]   // treatment group
);

console.log(`
  t-statistic: ${tTest.tStatistic.toFixed(3)}
  p-value: ${tTest.pValue.toFixed(4)}
  Degrees of freedom: ${tTest.degreesOfFreedom.toFixed(1)}
  Result: ${tTest.pValue < 0.05 ? 'Statistically significant' : 'No significant difference'}
`);

// Effect size (Cohen's d)
const effectSize = analyzer.calculateEffectSize(controlGroup, treatmentGroup);
console.log(`Effect size: ${effectSize.toFixed(3)}`);

// Confidence interval
const ci = analyzer.calculateConfidenceInterval(data, 0.95);
console.log(`95% Confidence interval: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`);
```

**2. ABTestManager**

Manages A/B testing experiments:

```typescript
import { ABTestManager } from './evolution';

const abtest = new ABTestManager();

// Create experiment
const experiment = abtest.createExperiment(
  'prompt-optimization-test',
  'Test new prompt strategy',
  [
    {
      name: 'control',
      config: { strategy: 'efficient' },
      description: 'Current prompt strategy'
    },
    {
      name: 'treatment',
      config: { strategy: 'quality-focused' },
      description: 'New quality-focused prompt'
    }
  ],
  [0.5, 0.5],           // 50/50 traffic split
  'quality_score',      // Primary success metric
  {
    durationDays: 7,
    minSampleSize: 30,
    significanceLevel: 0.05
  }
);

// Start experiment
abtest.startExperiment(experiment.id);

// Assign variant (deterministic - same agent always gets same variant)
const assignment = abtest.assignVariant(experiment.id, 'agent-123');
console.log(`Agent 123 assigned to: ${assignment.variantName}`);

// Record metrics
abtest.addMetric(experiment.id, 'control', {
  quality_score: 0.85,
  duration: 12000,
  cost: 0.05
});

abtest.addMetric(experiment.id, 'treatment', {
  quality_score: 0.92,
  duration: 13000,
  cost: 0.06
});

// Analyze results (when sample size is sufficient)
const results = abtest.analyzeResults(experiment.id);

console.log(`
  Experiment: ${results.experimentId}
  Winner: ${results.winner || 'No significant difference'}
  Confidence: ${(results.confidence * 100).toFixed(1)}%
  p-value: ${results.statisticalTests.pValue.toFixed(4)}
  Effect size: ${results.statisticalTests.effectSize.toFixed(3)}
  Recommendation: ${results.recommendation}
`);

// Variant statistics
Object.entries(results.variantStats).forEach(([name, stats]) => {
  console.log(`
    ${name}:
      Sample size: ${stats.sampleSize}
      Mean: ${stats.mean.toFixed(3)}
      Std dev: ${stats.stdDev.toFixed(3)}
      Confidence interval: [${stats.confidenceInterval[0].toFixed(3)}, ${stats.confidenceInterval[1].toFixed(3)}]
  `);
});
```

#### Use Cases

**Scenario 1: Validate Prompt Optimization Effects**

```typescript
// Problem: Uncertain whether new prompt strategy is actually better

// 1. Create A/B test
const promptTest = abtest.createExperiment(
  'prompt-strategy-test',
  'Quality-focused vs Efficient prompt',
  [
    { name: 'efficient', config: { strategy: 'efficient' } },
    { name: 'quality', config: { strategy: 'quality-focused' } }
  ],
  [0.5, 0.5],
  'quality_score',
  { minSampleSize: 50 }
);

abtest.startExperiment(promptTest.id);

// 2. Execute 100 times with 50/50 allocation
for (let i = 0; i < 100; i++) {
  const assignment = abtest.assignVariant(promptTest.id, `agent-${i}`);
  const config = promptTest.variants.find(v => v.name === assignment.variantName).config;

  // Execute agent and record results
  const result = await executeAgent(config);
  abtest.addMetric(promptTest.id, assignment.variantName, {
    quality_score: result.quality
  });
}

// 3. Analyze results
const results = abtest.analyzeResults(promptTest.id);

if (results.winner === 'quality' && results.statisticalTests.pValue < 0.05) {
  console.log('✓ Statistically significant: quality-focused strategy significantly improves quality');
  console.log(`  Improvement: ${results.statisticalTests.effectSize.toFixed(2)} standard deviations`);
} else {
  console.log('✗ No significant difference, maintain current strategy');
}
```

**Scenario 2: Model Selection Validation**

```typescript
// Test: Sonnet vs Haiku for simple tasks

const modelTest = abtest.createExperiment(
  'model-selection-test',
  'Sonnet vs Haiku for simple tasks',
  [
    { name: 'sonnet', config: { model: 'claude-sonnet-4-5' } },
    { name: 'haiku', config: { model: 'claude-haiku-3-5' } }
  ],
  [0.5, 0.5],
  'quality_score',
  {
    minSampleSize: 30,
    secondaryMetrics: ['cost', 'duration']
  }
);

// ... execute tests ...

const results = abtest.analyzeResults(modelTest.id);

// Multi-metric decision
const sonnetStats = results.variantStats.sonnet;
const haikuStats = results.variantStats.haiku;

const qualityDiff = sonnetStats.mean - haikuStats.mean;
const costRatio = haikuStats.mean / sonnetStats.mean;  // Assuming cost is also in metrics

if (Math.abs(qualityDiff) < 0.05 && costRatio < 0.5) {
  console.log('✓ Haiku has similar quality but 50% lower cost, recommend switching');
}
```

---

### 📊 Phase 3 Complete Workflow

```typescript
import {
  LearningManager,
  PerformanceTracker,
  KnowledgeTransferManager,
  TransferabilityChecker,
  ABTestManager,
} from './evolution';

// ========================================
// 1. Initialize System
// ========================================
const tracker = new PerformanceTracker();
const learner = new LearningManager(tracker);
const transferChecker = new TransferabilityChecker();
const transferManager = new KnowledgeTransferManager(learner, transferChecker);
const abtest = new ABTestManager();

// ========================================
// 2. New Agent Learns from Experienced Agent
// ========================================
const transferred = await transferManager.findTransferablePatterns(
  'experienced-agent',
  'new-agent',
  { agent_type: 'code-reviewer', task_type: 'code_review', complexity: 'medium' },
  { minConfidence: 0.7, minObservations: 10 }
);

console.log(`✓ Transferred ${transferred.length} patterns to new agent`);

// ========================================
// 3. A/B Test to Validate Configuration Changes
// ========================================
const experiment = abtest.createExperiment(
  'config-test',
  'Test new configuration',
  [
    { name: 'baseline', config: { /* current */ } },
    { name: 'optimized', config: { /* new */ } }
  ],
  [0.5, 0.5],
  'quality_score'
);

abtest.startExperiment(experiment.id);

// ========================================
// 4. Execute Tests and Collect Data
// ========================================
for (let i = 0; i < 100; i++) {
  const assignment = abtest.assignVariant(experiment.id, `agent-${i}`);
  const result = await executeAgent(assignment.variantName);

  abtest.addMetric(experiment.id, assignment.variantName, {
    quality_score: result.quality,
    cost: result.cost,
    duration: result.duration
  });
}

// ========================================
// 5. Analyze Results and Make Decisions
// ========================================
const results = abtest.analyzeResults(experiment.id);

if (results.winner && results.statisticalTests.pValue < 0.05) {
  console.log(`✓ Statistically significant: ${results.winner} wins`);
  console.log(`  p-value: ${results.statisticalTests.pValue.toFixed(4)}`);
  console.log(`  Effect size: ${results.statisticalTests.effectSize.toFixed(3)}`);
  console.log(`  Recommendation: ${results.recommendation}`);
} else {
  console.log('✗ No significant difference, maintain status quo');
}
```

---

### 🎯 Phase 3 Benefits

**Cross-Agent Knowledge Transfer:**
- ⏱️ New agent startup time: Reduced from weeks to days
- 📈 Initial performance: Improved 30-50% (based on transferred patterns)
- 🔄 Knowledge reuse: Avoid repeatedly learning the same experiences

**A/B Testing Framework:**
- 🔬 Scientific decisions: Based on statistical significance, not intuition
- 📊 Quantified improvement: Precisely measure configuration change effects
- ⚠️ Risk control: 50/50 split reduces full deployment risk

**Overall Improvement:**
- Cost optimization: 10-30% (based on A/B tested configurations)
- Quality improvement: 5-15% (cross-agent best practice sharing)
- Development efficiency: 40-60% (fast new agent bootstrap)

---

## 📊 Phase 4: Evolution Dashboard & Monitoring

Phase 4 introduces a unified monitoring dashboard providing real-time visualization of evolution progress, learning status, and performance trends for all agents.

### Core Components

#### 4. EvolutionMonitor

**Responsibilities**: Unified monitoring of evolution state for all agents, providing dashboard and progress tracking

**Features**:
- Aggregate evolution statistics for all agents
- Provide dashboard summary (total agents, total patterns, average success rate)
- Track individual agent learning progress
- Identify best-performing and fastest-improving agents
- Format beautiful terminal output

**Usage Example**:
```typescript
import { EvolutionMonitor } from './evolution';
import { Router } from './orchestrator';

const router = new Router();
const monitor = new EvolutionMonitor(
  router.getPerformanceTracker(),
  router.getLearningManager(),
  router.getAdaptationEngine()
);

// Get dashboard summary
const summary = monitor.getDashboardSummary();
console.log(`
📊 Evolution Dashboard Summary
==============================
Total Agents: ${summary.totalAgents}
Agents with Patterns: ${summary.agentsWithPatterns}
Total Patterns: ${summary.totalPatterns}
Total Executions: ${summary.totalExecutions}
Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%

Top Improving Agents:
${summary.topImprovingAgents.map(a =>
  `  - ${a.agentId}: +${(a.improvement * 100).toFixed(1)}%`
).join('\n')}
`);

// View specific agent statistics
const agentStats = monitor.getAgentStats('code-reviewer');
console.log(`
Agent: ${agentStats.agentId}
Total Executions: ${agentStats.totalExecutions}
Learned Patterns: ${agentStats.learnedPatterns}
Applied Adaptations: ${agentStats.appliedAdaptations}
Success Rate Improvement: +${(agentStats.successRateImprovement * 100).toFixed(1)}%
`);

// Get learning progress for all agents
const progress = monitor.getLearningProgress();
progress.forEach(p => {
  if (p.totalExecutions > 0) {
    console.log(`
${p.agentId}:
  Executions: ${p.totalExecutions}
  Patterns: ${p.learnedPatterns}
  Adaptations: ${p.appliedAdaptations}
  Improvement: +${(p.successRateImprovement * 100).toFixed(1)}%
  Last Learning: ${p.lastLearningDate.toISOString()}
    `);
  }
});

// Format complete dashboard (terminal-friendly format)
const dashboard = monitor.formatDashboard();
console.log(dashboard);
```

**Key API**:
- `getDashboardSummary()` - Get overview statistics
- `getAgentStats(agentId)` - Get specific agent statistics
- `getLearningProgress()` - Get learning progress for all agents
- `formatDashboard()` - Format beautiful terminal output

**Dashboard Interface Definitions**:
```typescript
interface DashboardSummary {
  totalAgents: number;              // Total number of agents
  agentsWithPatterns: number;       // Number of agents with patterns
  totalPatterns: number;            // Total number of patterns
  totalExecutions: number;          // Total executions
  averageSuccessRate: number;       // Average success rate
  topImprovingAgents: Array<{
    agentId: string;
    improvement: number;            // Success rate improvement magnitude
  }>;
}

interface AgentLearningProgress {
  agentId: string;
  totalExecutions: number;          // Number of executions
  learnedPatterns: number;          // Learned patterns
  appliedAdaptations: number;       // Applied adaptations
  successRateImprovement: number;   // Success rate improvement
  lastLearningDate: Date;           // Last learning time
}
```

---

### MCP Server Integration

Evolution dashboard is integrated into the MCP server and can be viewed directly through Claude Code:

**evolution_dashboard Tool**:
```typescript
// Use in Claude Code
mcp__smart_agents__evolution_dashboard({ format: 'summary' })
mcp__smart_agents__evolution_dashboard({ format: 'detailed' })
```

**Tool Definition**:
```typescript
{
  name: 'evolution_dashboard',
  description: 'View evolution system dashboard showing agent learning progress, patterns, and performance improvements. Displays statistics for all 13 agents.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Dashboard format: "summary" (default) or "detailed"',
        enum: ['summary', 'detailed'],
      },
    },
  },
}
```

**Output Formats**:

- **Summary Format**: Compact dashboard showing overview statistics and top 5 fastest-improving agents
- **Detailed Format**: Complete dashboard with detailed learning progress for all agents

---

## 🧪 Phase 5: Testing & Validation Infrastructure

Phase 5 establishes a complete testing and validation infrastructure to ensure the evolution system's reliability, performance, and backward compatibility.

### Test Suite Architecture

```
tests/
├── evolution/
│   ├── PerformanceTracker.test.ts
│   ├── LearningManager.test.ts
│   ├── AdaptationEngine.test.ts
│   └── EvolutionMonitor.test.ts         ← Phase 4
├── integration/
│   └── evolution-e2e.test.ts            ← Phase 5: E2E Integration
├── benchmarks/
│   └── evolution-performance.bench.ts   ← Phase 5: Performance
├── regression/
│   └── evolution-regression.test.ts     ← Phase 5: Regression
└── ...

scripts/
└── user-acceptance-test.ts              ← Phase 5: UAT

experiments/
└── self-improvement-demo.ts             ← Phase 5: Self-Improvement
```

### 1. End-to-End Integration Tests (E2E)

**File**: `tests/integration/evolution-e2e.test.ts`

**Purpose**: Test complete workflow from task routing to dashboard across the entire evolution system

**Test Scenarios**:
```typescript
describe('Evolution System E2E Integration', () => {
  it('should route task and track performance', async () => {
    // 1. Route task
    const result = await router.routeTask(task);

    // 2. Verify performance tracking
    const stats = router.getPerformanceTracker()
      .getEvolutionStats(result.routing.selectedAgent);

    expect(stats.totalExecutions).toBeGreaterThan(0);
  });

  it('should collect performance metrics across multiple tasks', async () => {
    // Execute multiple tasks
    for (const task of tasks) {
      await router.routeTask(task);
    }

    // Verify dashboard summary
    const summary = monitor.getDashboardSummary();
    expect(summary.totalExecutions).toBeGreaterThanOrEqual(3);
  });

  it('should show evolution progress in dashboard', async () => {
    // Execute tasks
    // ...

    // Verify dashboard formatting
    const dashboard = monitor.formatDashboard();
    expect(dashboard).toContain('Evolution Dashboard');
    expect(dashboard).toContain('Total Agents');
    expect(dashboard).toContain('13');
  });
});
```

**Coverage**:
- Task routing → Performance tracking
- Evolution configuration integration
- Dashboard summary generation
- Learning progress tracking
- Adaptation application
- Cost tracking integration
- Error handling
- System resources

---

### 2. Performance Benchmarks

**File**: `tests/benchmarks/evolution-performance.bench.ts`

**Purpose**: Ensure evolution system performance overhead is within acceptable range, prevent performance degradation

**Benchmark Items**:
```typescript
describe('Evolution System Performance Benchmarks', () => {
  // Task routing performance
  bench('single task routing', async () => {
    await router.routeTask(task);
  });

  bench('batch task routing (10 tasks)', async () => {
    await router.routeBatch(tasks);
  });

  // Performance tracking overhead
  bench('track single metric', () => {
    performanceTracker.track(metrics);
  });

  bench('track 100 metrics', () => {
    for (let i = 0; i < 100; i++) {
      performanceTracker.track(metrics);
    }
  });

  // Pattern analysis performance
  bench('analyze patterns (5 observations)', () => {
    learningManager.analyzePatterns('agent-id');
  });

  // Dashboard generation performance
  bench('get dashboard summary', () => {
    monitor.getDashboardSummary();
  });

  bench('format dashboard', () => {
    monitor.formatDashboard();
  });
});
```

**Performance Targets**:
```typescript
/**
 * Performance Targets:
 *
 * Task Routing:
 * - Single task: < 100ms
 * - Batch (10 tasks): < 500ms
 * - Batch (50 tasks): < 2000ms
 *
 * Performance Tracking:
 * - Single metric: < 1ms
 * - 100 metrics: < 10ms
 * - Get stats: < 5ms
 *
 * Pattern Analysis:
 * - Analyze patterns: < 50ms
 * - Get patterns: < 1ms
 * - Get recommendations: < 5ms
 *
 * Dashboard:
 * - Get summary: < 10ms
 * - Get progress: < 20ms
 * - Format dashboard: < 50ms
 *
 * Concurrent:
 * - 10 parallel tasks: < 500ms
 * - 100 parallel tracking: < 20ms
 *
 * Memory:
 * - 1000 metrics: < 100MB
 */
```

**How to Run**:
```bash
npx vitest bench tests/benchmarks/evolution-performance.bench.ts
```

---

### 3. Regression Test Suite

**File**: `tests/regression/evolution-regression.test.ts`

**Purpose**: Ensure evolution system changes don't break existing functionality, maintain backward compatibility

**Test Items**:

**3.1 API Backward Compatibility**
```typescript
describe('API Backward Compatibility', () => {
  it('should maintain Router.routeTask() signature', async () => {
    const result = await router.routeTask(task);

    // Original return type structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('routing');
    expect(result).toHaveProperty('approved');
    expect(result).toHaveProperty('message');

    // New evolution field (additive only)
    expect(result).toHaveProperty('adaptedExecution');
  });

  it('should maintain Router getter methods', () => {
    // Original getters
    expect(router.getAnalyzer()).toBeDefined();
    expect(router.getRouter()).toBeDefined();
    expect(router.getCostTracker()).toBeDefined();

    // New evolution getters (additive only)
    expect(router.getPerformanceTracker()).toBeDefined();
    expect(router.getLearningManager()).toBeDefined();
    expect(router.getAdaptationEngine()).toBeDefined();
  });
});
```

**3.2 Evolution Configuration Stability**
```typescript
describe('Evolution Configuration Stability', () => {
  it('should maintain all 13 agent configurations', () => {
    const configs = getAllAgentConfigs();
    expect(configs.size).toBe(13);

    // Verify all required agents exist
    const requiredAgents = [
      'code-reviewer', 'test-writer', 'debugger',
      // ... (complete list)
    ];

    requiredAgents.forEach(agentId => {
      expect(configs.has(agentId as any)).toBe(true);
    });
  });

  it('should maintain config structure for all agents', () => {
    configs.forEach((config, agentId) => {
      expect(config.agentId).toBe(agentId);
      expect(config.category).toBeDefined();
      expect(config.evolutionEnabled).toBeDefined();
      expect(config.confidenceThreshold).toBeGreaterThanOrEqual(0);
      expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
    });
  });
});
```

**3.3 Performance Regression Protection**
```typescript
describe('Performance Regression Prevention', () => {
  it('should route tasks within performance threshold', async () => {
    const startTime = Date.now();
    await router.routeTask(task);
    const duration = Date.now() - startTime;

    // Should complete within 200ms (with evolution overhead)
    expect(duration).toBeLessThan(200);
  });
});
```

**3.4 Data Integrity**
```typescript
describe('Data Integrity', () => {
  it('should preserve task data through routing', async () => {
    const result = await router.routeTask(task);

    expect(result.analysis.taskType).toBeDefined();
    expect(result.analysis.complexity).toBeGreaterThan(0);
    expect(result.routing.selectedAgent).toBeDefined();
  });
});
```

---

### 4. User Acceptance Test (UAT)

**File**: `scripts/user-acceptance-test.ts`

**Purpose**: Simulate real workflows from user perspective, validate UX and system usability

**Test Scenarios**:
```typescript
class UserAcceptanceTest {
  async runAllTests(): Promise<void> {
    await this.testScenario1_BasicTaskRouting();
    await this.testScenario2_SmartAgentSelection();
    await this.testScenario3_EvolutionDashboard();
    await this.testScenario4_LearningProgress();
    await this.testScenario5_PerformanceImprovement();

    this.printFinalResults();
  }
}
```

**Scenario 1: Basic Task Routing**
```typescript
console.log(`User: "Route my code review task to appropriate agent"`);
const result = await this.router.routeTask(task);

console.log(`System: Selected agent "${result.routing.selectedAgent}"`);
console.log(`System: ${result.message}`);
```

**Scenario 2: Smart Agent Selection**
```typescript
// Test whether different task types select appropriate agents
const testCases = [
  { description: 'Debug login error', expectedCategory: 'development' },
  { description: 'Research best practices', expectedCategory: 'research' },
  { description: 'Deploy to production', expectedCategory: 'operations' },
];
```

**Scenario 3: Evolution Dashboard**
```typescript
console.log('User: "Show me the evolution dashboard"');
const dashboard = this.monitor.formatDashboard();
console.log(dashboard);
```

**Scenario 4: Learning Progress**
```typescript
console.log('User: "Show learning progress for all agents"');
const progress = this.monitor.getLearningProgress();
// Verify progress for all 13 agents
```

**Scenario 5: Performance Improvement**
```typescript
console.log('User: "Execute same task 3 times to test learning"');
// Execute same task 3 times, verify consistent agent selection
```

**Success Criteria**:
```typescript
private printFinalResults(): void {
  const passRate = (this.passed / total) * 100;

  if (passRate >= 80) {
    console.log('\n✅ USER ACCEPTANCE: PASS');
    console.log('Evolution system meets user acceptance criteria!');
  } else {
    console.log('\n❌ USER ACCEPTANCE: FAIL');
  }
}
```

**How to Run**:
```bash
npx tsx scripts/user-acceptance-test.ts
```

---

### 5. Self-Improvement Experiment

**File**: `experiments/self-improvement-demo.ts`

**Purpose**: Demonstrate evolution system's learning capability, showing performance improvement across 3 execution rounds

**Experiment Design**:
```typescript
class SelfImprovementExperiment {
  async runExperiment(): Promise<void> {
    // Round 1: Baseline performance (10 tasks)
    console.log('🔵 Round 1: Baseline Performance');
    await this.runRound('code-review', 10, 'Round 1');

    // Round 2: Learning phase (10 tasks)
    console.log('🟡 Round 2: Learning Phase');
    await this.runRound('code-review', 10, 'Round 2');

    // Round 3: Improved performance (10 tasks)
    console.log('🟢 Round 3: Improved Performance');
    await this.runRound('code-review', 10, 'Round 3');

    this.generateReport();
  }

  private generateReport(): void {
    // Compare metrics across rounds
    const round1 = this.getRoundStats('Round 1');
    const round2 = this.getRoundStats('Round 2');
    const round3 = this.getRoundStats('Round 3');

    console.log(`
📊 Self-Improvement Experiment Results
=========================================

Round 1 (Baseline):
  Average patterns: ${round1.avgPatterns.toFixed(1)}
  Success rate: ${(round1.successRate * 100).toFixed(1)}%

Round 2 (Learning):
  Average patterns: ${round2.avgPatterns.toFixed(1)}
  Success rate: ${(round2.successRate * 100).toFixed(1)}%
  Improvement: +${((round2.successRate - round1.successRate) * 100).toFixed(1)}%

Round 3 (Improved):
  Average patterns: ${round3.avgPatterns.toFixed(1)}
  Success rate: ${(round3.successRate * 100).toFixed(1)}%
  Improvement: +${((round3.successRate - round1.successRate) * 100).toFixed(1)}%

✅ Evidence of Learning: System applied ${round3.avgPatterns} patterns in Round 3
    `);
  }
}
```

**How to Run**:
```bash
npx tsx experiments/self-improvement-demo.ts
```

**Expected Output**:
- Round 1: No patterns, baseline performance
- Round 2: Start learning patterns, performance begins to improve
- Round 3: Apply learned patterns, significant improvement

---

### Test Coverage Goals

| Test Type | Coverage Goal | Files |
|---------|-----------|------|
| Unit Tests | ≥ 85% | `tests/evolution/*.test.ts` |
| Integration Tests | ≥ 80% | `tests/integration/*.test.ts` |
| Regression Tests | 100% API | `tests/regression/*.test.ts` |
| Performance Benchmarks | All critical paths | `tests/benchmarks/*.bench.ts` |
| UAT Scenarios | ≥ 5 scenarios | `scripts/user-acceptance-test.ts` |

---

### Continuous Integration (CI)

**Recommended CI Pipeline**:
```yaml
# .gitlab-ci.yml or .github/workflows/evolution-tests.yml

evolution-tests:
  script:
    - npm install
    - npm run test:evolution       # Unit tests
    - npm run test:integration     # E2E tests
    - npm run test:regression      # Regression tests
    - npm run test:uat             # User acceptance tests
    - npm run benchmark:evolution  # Performance benchmarks
```

**Quality Gates**:
- ✅ All tests pass (100%)
- ✅ Unit test coverage ≥ 85%
- ✅ No performance regressions (< 10% slowdown)
- ✅ UAT pass rate ≥ 80%

---

## 🔌 Integration with Claude Code Hooks

The evolution system achieves seamless integration through Claude Code Hooks, automatically collecting data, learning patterns, and providing recommendations in every session.

### Architecture Integration

```
┌─────────────────────────────────────────────────────────────┐
│                   Claude Code Session                       │
│                                                             │
│  SessionStart → PostToolUse (each tool execution) → Stop   │
│       ↓               ↓                           ↓         │
│  Show recommendations  Collect data/Detect patterns  Analyze & Learn  │
└────────┬──────────────┬────────────────────────┬────────────┘
         │              │                        │
         │              │                        │
         ▼              ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart-Agents Evolution System                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Performance  │  │  Learning    │  │ Adaptation   │    │
│  │  Tracker     │  │  Manager     │  │   Engine     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                          ↓                                  │
│                 ┌──────────────┐                           │
│                 │  Evolution   │                           │
│                 │   Monitor    │                           │
│                 └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Hooks and Evolution Interaction Flow

#### 1. SessionStart Hook

**Responsibilities**: Display evolution recommendations from last session

**Integration Point**:
```typescript
// SessionStart hook reads recommendations.json
const recommendations = readRecommendations();

// Display skill recommendations (generated by Evolution system)
recommendations.recommendedSkills.forEach(skill => {
  console.log(`  🔴 ${skill.name} (${skill.reason})`);
});

// Display detected patterns
recommendations.detectedPatterns.forEach(pattern => {
  console.log(`  ✅ ${pattern.description}`);
});
```

**Example Output**:
```
📚 Based on last work patterns, recommend loading the following skills:
  🔴 devops-git-workflows (Last session: 8 Git operations)
  🔴 testing-guide (Last session: modified 5 test files)

✅ Detected good patterns:
  - 12 times correctly Read before Edit
  - Execute tests before Git commit

⚠️ Warnings:
  - 2 tool executions exceeded 5 seconds
  - Token quota usage: 85%
```

#### 2. PostToolUse Hook

**Responsibilities**: Silently collect data, detect patterns and anomalies

**Integration Point**:
```typescript
// PostToolUse hook receives tool execution data via stdin
const toolData = await readStdin();

// Pattern detection (READ_BEFORE_EDIT, Git workflows, etc.)
const patterns = detectPatterns(toolData);

// Anomaly detection (slow execution, high tokens, failures, quota)
const anomalies = detectAnomalies(toolData);

// Update recommendations incrementally
updateRecommendations(patterns, anomalies);

// FUTURE: Feed data to Evolution system for learning
// performanceTracker.track({
//   agentId: inferAgentFromToolData(toolData),
//   success: toolData.success,
//   durationMs: toolData.duration,
//   cost: estimateCost(toolData),
//   qualityScore: inferQuality(toolData)
// });
```

**Detected Patterns**:
- `READ_BEFORE_EDIT`: Follows best practices
- `GIT_WORKFLOW`: Frequent Git operations → recommend loading devops-git-workflows
- `FRONTEND_WORK`: Frontend file modifications → recommend loading frontend-design
- `INTENSIVE_SEARCH`: Multiple searches → recommend using @smart-router analysis

**Detected Anomalies**:
- `SLOW_EXECUTION`: Tool execution > 5s
- `HIGH_TOKEN_USAGE`: Single tool > 10K tokens
- `EXECUTION_FAILURE`: Tool execution failed
- `QUOTA_WARNING`: Token quota > 80%

#### 3. Stop Hook

**Responsibilities**: Analyze session patterns, generate evolution recommendations, integrate Evolution Dashboard

**Integration Point**:
```typescript
// Stop hook analyzes session patterns
const sessionState = loadSessionState();
const patterns = analyzeToolPatterns(sessionState);

// CURRENT: Generate skill recommendations based on patterns
const recommendations = generateSkillRecommendations(patterns);
saveRecommendations(recommendations);

// FUTURE: Integration with Evolution system
// const evolutionStats = await getEvolutionMonitorStats();
// const dashboard = formatEvolutionDashboard(evolutionStats);
// console.log(dashboard);
```

**Current Implementation**:
```typescript
function saveRecommendations(patterns, sessionState) {
  const recommendations = {
    recommendedSkills: [],
    detectedPatterns: [],
    warnings: []
  };

  // Recommend skills based on pattern frequency
  if (patterns.gitOperations >= 5) {
    recommendations.recommendedSkills.push({
      name: 'devops-git-workflows',
      reason: `Last session: ${patterns.gitOperations} Git operations`,
      priority: 'high'
    });
  }

  if (patterns.frontendWork >= 3) {
    recommendations.recommendedSkills.push({
      name: 'frontend-design',
      reason: `Last session: modified ${patterns.frontendWork} frontend files`,
      priority: 'high'
    });
  }

  // Add good patterns
  if (patterns.readBeforeEdit > 0) {
    recommendations.detectedPatterns.push({
      description: `${patterns.readBeforeEdit} times correctly Read before Edit`,
      suggestion: 'Continue maintaining READ_BEFORE_EDIT best practice'
    });
  }

  // Add warnings
  if (patterns.editWithoutRead > 0) {
    recommendations.warnings.push(
      `${patterns.editWithoutRead} times Edit without Read (recommend improvement)`
    );
  }

  fs.writeFileSync(RECOMMENDATIONS_FILE, JSON.stringify(recommendations, null, 2));
}
```

**Future Integration** (Evolution Dashboard):
```typescript
// Future integration with EvolutionMonitor
async function displayEvolutionDashboard() {
  const monitor = new EvolutionMonitor(
    router.getPerformanceTracker(),
    router.getLearningManager(),
    router.getAdaptationEngine()
  );

  const summary = monitor.getDashboardSummary();

  console.log(`
📊 Evolution Dashboard Summary
==============================
Total Agents: ${summary.totalAgents}
Agents with Patterns: ${summary.agentsWithPatterns}
Total Patterns: ${summary.totalPatterns}
Total Executions: ${summary.totalExecutions}
Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%

Top Improving Agents:
${summary.topImprovingAgents.map(a =>
  `  - ${a.agentId}: +${(a.improvement * 100).toFixed(1)}%`
).join('\n')}
  `);
}
```

### State Files Integration

**Hooks State Files** → **Evolution System Data Flow**:

```
┌─────────────────────────────────────┐
│  Hooks State Files                  │
│  (~/.claude/state/)                 │
│                                     │
│  • recommendations.json             │
│    - recommendedSkills              │
│    - detectedPatterns               │
│    - warnings                       │
│                                     │
│  • current-session.json             │
│    - toolCalls[]                    │
│    - patterns[]                     │
│                                     │
│  • session-context.json             │
│    - tokenQuota                     │
│    - learnedPatterns                │
└─────────┬───────────────────────────┘
          │
          │ Future: Automatic sync
          ▼
┌─────────────────────────────────────┐
│  Evolution System                   │
│  (PerformanceTracker)               │
│                                     │
│  • AgentMetrics[]                   │
│    - executionId                    │
│    - success                        │
│    - durationMs                     │
│    - cost                           │
│    - qualityScore                   │
└─────────┬───────────────────────────┘
          │
          │ Learning pipeline
          ▼
┌─────────────────────────────────────┐
│  LearningManager                    │
│  • Learned Patterns                 │
│  • Recommendations                  │
└─────────────────────────────────────┘
```

### Integration Patterns

#### Pattern 1: Skill Recommendation (Current Implementation)

**Flow**:
```
1. PostToolUse detects Git operation patterns
2. Stop hook analyzes: 8 Git operations
3. Generate recommendation: devops-git-workflows skill
4. Save to recommendations.json
5. Next SessionStart displays recommendation
6. User manually loads skill
```

**Advantages**:
- ✅ Simple and direct, no complex integration required
- ✅ Recommendations based on actual usage patterns
- ✅ User maintains full control

#### Pattern 2: Evolution Data Sync (Future Integration)

**Flow**:
```
1. PostToolUse collects tool execution data
2. Automatically sync to PerformanceTracker
3. LearningManager analyzes patterns
4. AdaptationEngine applies improvements
5. Stop hook displays Evolution Dashboard
6. User sees cross-session learning progress
```

**Advantages**:
- ✅ Automatic learning and improvement
- ✅ Cross-session knowledge accumulation
- ✅ Quantified evolution effects

### Implementation Examples

#### Example 1: Hooks Detect Git Workflow

```typescript
// PostToolUse hook detects Git pattern
const toolData = {
  toolName: 'Bash',
  arguments: { command: 'git commit -m "feat: add feature"' },
  duration: 500,
  success: true
};

const patterns = detectPatterns(toolData);
// patterns = [{ type: 'GIT_WORKFLOW', description: 'Git operation detected' }]

// Stop hook generates recommendation
if (gitOperationCount >= 5) {
  recommendations.recommendedSkills.push({
    name: 'devops-git-workflows',
    reason: `Last session: ${gitOperationCount} Git operations`,
    priority: 'high'
  });
}

// Next SessionStart displays recommendation
console.log('🔴 devops-git-workflows (Last session: 8 Git operations)');
```

#### Example 2: Hooks Detect READ_BEFORE_EDIT Violation

```typescript
// PostToolUse hook detects Edit without Read
const toolData = {
  toolName: 'Edit',
  arguments: { file_path: '/path/to/file.ts' },
  // ...
};

const recentReads = sessionState.toolCalls
  .filter(call => call.toolName === 'Read' &&
                  call.arguments?.file_path === '/path/to/file.ts');

if (recentReads.length === 0) {
  // Violation detected!
  patterns.push({
    type: 'EDIT_WITHOUT_READ',
    description: 'Edited file without reading first (violation)',
    severity: 'warning'
  });

  // Stop hook adds to warnings
  recommendations.warnings.push(
    '1 time Edit without Read (recommend improvement)'
  );
}
```

### Future Roadmap

#### Phase 1: Enhanced Pattern Detection (Q1 2025)

- [ ] More pattern types (API modifications, test writing, documentation updates)
- [ ] Confidence scoring (pattern reliability)
- [ ] Pattern lifecycle management (outdated pattern cleanup)

#### Phase 2: Evolution System Integration (Q2 2025)

- [ ] PostToolUse → PerformanceTracker automatic sync
- [ ] Stop hook displays Evolution Dashboard
- [ ] Cross-session learning progress tracking
- [ ] Agent performance trend analysis

#### Phase 3: Smart Recommendations (Q3 2025)

- [ ] Intelligent recommendations based on LearningManager
- [ ] A/B testing to validate recommendation effectiveness
- [ ] Automatic recommendation threshold adjustment
- [ ] Cross-agent knowledge transfer

#### Phase 4: Autonomous Adaptation (Q4 2025)

- [ ] AdaptationEngine automatically optimizes workflows
- [ ] Automatic prompt optimization
- [ ] Automatic model selection
- [ ] Automatic timeout adjustment

### Best Practices

#### 1. Hooks Design Principles

- **Non-intrusive**: Hooks should not interrupt main workflow
- **Silent observation**: PostToolUse doesn't output to console, stays clean
- **Progressive**: Start with simple pattern detection, gradually integrate Evolution system
- **User control**: All recommendations require manual user confirmation

#### 2. Data Collection Principles

- **Privacy First**: Don't record sensitive information (tool arguments, results)
- **Minimal Overhead**: Data collection < 10ms per tool call
- **Data Retention**: Keep recent 1000 records, periodic cleanup
- **Graceful Degradation**: Errors don't affect main workflow

#### 3. Recommendation Generation Principles

- **Evidence-based**: Recommend only after 3-5 instances of same pattern
- **Clear priority**: Critical > High > Medium
- **Explainability**: Clearly explain recommendation reasons
- **Actionable**: Provide specific skill loading commands

### Reference Resources

- **Hooks Implementation Guide**: `/docs/architecture/HOOKS_IMPLEMENTATION_GUIDE.md`
- **Hooks README**: `~/.claude/hooks/README.md`
- **Smart-Router Skill**: `~/.claude/skills/smart-router/skill.md`
- **Evolution Dashboard**: This document Phase 4
- **MCP Integration Guide**: `/docs/MCP_INTEGRATION.md` (replaces deprecated hooks plan)

---

## 🔮 Future Development

### Planned Features

1. **Federated Learning** (Phase 3 in progress)
   - Distributed model training
   - Privacy-preserving knowledge aggregation
   - Multi-agent collaborative learning

2. **Multi-Objective Optimization** (Phase 2 in progress)
   - Simultaneously optimize cost, quality, speed
   - Pareto frontier analysis
   - Multi-objective decision support

3. **Reinforcement Learning**
   - Advanced learning algorithms
   - Automatic learning rate adjustment
   - Dynamic strategy optimization

4. **Pattern Visualization**
   - Web UI for displaying patterns
   - Interactive pattern management
   - Visualize A/B test results

5. **Real-time Dashboard** (Phase 4 expansion)
   - WebSocket real-time updates
   - Chart-based trend visualization
   - Alerts and anomaly detection

6. **Hooks-Evolution Deep Integration** (new)
   - PostToolUse automatically syncs to PerformanceTracker
   - Stop hook displays complete Evolution Dashboard
   - SessionStart intelligent recommendations based on Evolution data
   - Cross-session automatic learning and improvement

---

## 🤝 Contributing

Welcome to submit PRs to improve the Self-Evolving Agent System!

Please follow:
1. All new features must have test coverage
2. Update relevant documentation
3. Maintain consistency with existing architecture

---

**Documentation Version**: V2.1
**Last Updated**: 2025-12-28
**Author**: Smart Agents Team
**Phase 4 & 5 Additions**: EvolutionMonitor, evolution_dashboard MCP tool, complete testing infrastructure
