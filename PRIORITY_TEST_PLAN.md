# Priority Test Implementation Plan
## Claude Code Buddy - Test Coverage Sprint

**Goal**: Increase test coverage from 30% to 80% in 1 month
**Timeline**: 2026-02-03 to 2026-03-03
**Resources**: 1 Test Automation Engineer full-time

---

## Week 1: CRITICAL Core Module (P0)

### Day 1-2: ResourceMonitor.ts (HIGHEST PRIORITY)
**File**: `src/core/ResourceMonitor.ts` (489 lines)
**Risk Level**: 🔴 CRITICAL - System crashes possible
**Estimated Effort**: 8 hours

**Test Scenarios to Implement**:

```typescript
// tests/unit/core/ResourceMonitor.test.ts

describe('ResourceMonitor', () => {
  // Basic Functionality
  ✅ Test: Initialize with default config
  ✅ Test: Register background task
  ✅ Test: Unregister background task
  ✅ Test: Get current resources (CPU, memory)

  // Edge Cases - CRITICAL
  ✅ Test: Handle division by zero (0 CPU cores)
  ✅ Test: Handle 0 total memory
  ✅ Test: Handle NaN in CPU calculations
  ✅ Test: Handle Infinity in memory percentages
  ✅ Test: Handle negative CPU values
  ✅ Test: Handle negative memory values

  // Concurrent Operations
  ✅ Test: Multiple concurrent registerBackgroundTask()
  ✅ Test: Concurrent register + unregister
  ✅ Test: Race condition in resource checks

  // Threshold Events
  ✅ Test: Fire event when CPU threshold exceeded
  ✅ Test: Fire event when memory threshold exceeded
  ✅ Test: Multiple threshold events
  ✅ Test: Unsubscribe from threshold events

  // Resource Checks
  ✅ Test: canRunBackgroundTask() when resources available
  ✅ Test: canRunBackgroundTask() when CPU too high
  ✅ Test: canRunBackgroundTask() when memory too low
  ✅ Test: canRunBackgroundTask() when too many agents

  // Error Handling
  ✅ Test: Handle OS error getting CPU info
  ✅ Test: Handle OS error getting memory info
  ✅ Test: Fallback values when OS data unavailable
});
```

**Success Criteria**:
- ✅ 25+ test cases implemented
- ✅ All edge cases covered (0, NaN, Infinity, negative)
- ✅ Coverage ≥ 90%
- ✅ All tests passing

---

### Day 3-4: ExecutionQueue.ts (CRITICAL)
**File**: `src/core/ExecutionQueue.ts` (559 lines)
**Risk Level**: 🔴 CRITICAL - Task loss, queue corruption
**Estimated Effort**: 12 hours

**Test Scenarios**:

```typescript
// tests/unit/core/ExecutionQueue.test.ts

describe('ExecutionQueue', () => {
  // Basic Operations
  ✅ Test: Enqueue task
  ✅ Test: Dequeue task (FIFO)
  ✅ Test: Dequeue from empty queue
  ✅ Test: Queue size tracking

  // Priority Queue
  ✅ Test: High priority task dequeued first
  ✅ Test: Same priority - FIFO order
  ✅ Test: Priority levels 0-10
  ✅ Test: Invalid priority values

  // Concurrent Operations - CRITICAL
  ✅ Test: 10 concurrent enqueue operations
  ✅ Test: 10 concurrent dequeue operations
  ✅ Test: Concurrent enqueue + dequeue
  ✅ Test: Race condition in priority updates
  ✅ Test: Concurrent peek operations

  // Task Cancellation
  ✅ Test: Cancel pending task
  ✅ Test: Cancel running task
  ✅ Test: Cancel already completed task
  ✅ Test: Cancel non-existent task

  // Timeout Handling
  ✅ Test: Task timeout detected
  ✅ Test: Task timeout triggers removal
  ✅ Test: Timeout with concurrent operations

  // Queue Limits
  ✅ Test: Queue overflow (max capacity)
  ✅ Test: Overflow triggers rejection
  ✅ Test: Oldest task evicted on overflow

  // Task Dependencies
  ✅ Test: Task with dependencies waits
  ✅ Test: Circular dependency detection
  ✅ Test: Dependency resolution order

  // Persistence (if applicable)
  ✅ Test: Queue survives restart
  ✅ Test: Corrupted queue recovery
});
```

**Success Criteria**:
- ✅ 30+ test cases
- ✅ Concurrency edge cases covered
- ✅ Coverage ≥ 90%

---

### Day 5: ExecutionMonitor.ts
**File**: `src/core/ExecutionMonitor.ts` (467 lines)
**Risk Level**: 🔴 CRITICAL - Monitoring failures
**Estimated Effort**: 8 hours

**Test Scenarios**:

```typescript
// tests/unit/core/ExecutionMonitor.test.ts

describe('ExecutionMonitor', () => {
  // Progress Tracking
  ✅ Test: Track task progress 0-100%
  ✅ Test: Invalid progress values (< 0, > 100, NaN)
  ✅ Test: Progress updates in order
  ✅ Test: Concurrent progress updates

  // Task Status
  ✅ Test: Task status transitions
  ✅ Test: Invalid status transitions
  ✅ Test: Status history tracking

  // Statistics
  ✅ Test: Calculate average completion time
  ✅ Test: Calculate success rate
  ✅ Test: Track task count by status
  ✅ Test: Statistics with 0 tasks

  // Memory Leaks
  ✅ Test: Cleanup completed tasks
  ✅ Test: Monitor memory usage
  ✅ Test: Old tasks pruned after time limit

  // Error Tracking
  ✅ Test: Track task errors
  ✅ Test: Error rate calculation
  ✅ Test: Error categorization
});
```

**Success Criteria**:
- ✅ 20+ tests
- ✅ Edge cases covered
- ✅ Coverage ≥ 85%

---

## Week 2: MCP Module & Orchestrator (P0)

### Day 6-7: MCP ServerInitializer.ts & ToolRouter.ts
**Files**:
- `src/mcp/ServerInitializer.ts` (328 lines)
- `src/mcp/ToolRouter.ts` (440 lines)

**Risk Level**: 🔴 CRITICAL - Server startup & tool routing failures
**Estimated Effort**: 12 hours

**Test Scenarios**:

```typescript
// tests/unit/mcp/ServerInitializer.test.ts
describe('ServerInitializer', () => {
  // Initialization
  ✅ Test: Initialize all components in order
  ✅ Test: Handle component initialization failure
  ✅ Test: Partial initialization recovery
  ✅ Test: Dependency injection errors
  ✅ Test: Initialization timeout

  // Component Lifecycle
  ✅ Test: Start all services
  ✅ Test: Stop all services
  ✅ Test: Restart after failure

  // Configuration
  ✅ Test: Load configuration
  ✅ Test: Invalid configuration handling
  ✅ Test: Environment-specific config
});

// tests/unit/mcp/ToolRouter.test.ts
describe('ToolRouter', () => {
  // Route Matching
  ✅ Test: Match exact route
  ✅ Test: Match route with parameters
  ✅ Test: No match - fallback
  ✅ Test: Ambiguous routes - first match

  // Parameter Validation
  ✅ Test: Valid parameters pass
  ✅ Test: Missing required parameters rejected
  ✅ Test: Invalid parameter types rejected
  ✅ Test: Extra parameters ignored/rejected

  // Error Routing
  ✅ Test: Route to error handler
  ✅ Test: Error handler failure

  // Tool Invocation
  ✅ Test: Invoke tool with parameters
  ✅ Test: Tool not found
  ✅ Test: Tool execution error

  // Concurrent Routing
  ✅ Test: Multiple concurrent route matches
  ✅ Test: Route caching
});
```

**Success Criteria**:
- ✅ 35+ tests total
- ✅ Server startup coverage ≥ 90%
- ✅ Routing logic coverage ≥ 95%

---

### Day 8-9: Orchestrator Module (0% → 60%)
**Files**:
- `src/orchestrator/AgentRouter.ts` (453 lines)
- `src/orchestrator/GlobalResourcePool.ts` (418 lines)

**Risk Level**: 🔴 CRITICAL - Agent routing & resource management
**Estimated Effort**: 12 hours

**Test Scenarios**:

```typescript
// tests/unit/orchestrator/AgentRouter.test.ts
describe('AgentRouter', () => {
  // Agent Selection
  ✅ Test: Select agent by capability
  ✅ Test: Select agent by resource availability
  ✅ Test: Fallback to general agent
  ✅ Test: No suitable agent available

  // Capability Matching
  ✅ Test: Exact capability match
  ✅ Test: Partial capability match
  ✅ Test: Multiple capable agents - best match

  // Resource-Aware Routing
  ✅ Test: Route to agent with available resources
  ✅ Test: Skip agent with insufficient resources
  ✅ Test: Wait for resources to become available

  // Prompt Enhancement Mode
  ✅ Test: Return enhanced prompt (not API call)
  ✅ Test: Prompt includes capability requirements
  ✅ Test: Prompt includes resource constraints
});

// tests/unit/orchestrator/GlobalResourcePool.test.ts
describe('GlobalResourcePool', () => {
  // Resource Allocation
  ✅ Test: Allocate resources to agent
  ✅ Test: Allocation fails when pool exhausted
  ✅ Test: Release resources after task

  // Concurrent Access
  ✅ Test: Concurrent allocations
  ✅ Test: Race condition in resource release
  ✅ Test: Deadlock prevention

  // Resource Limits
  ✅ Test: Enforce per-agent limits
  ✅ Test: Enforce global pool limits
  ✅ Test: Dynamic limit adjustment

  // Monitoring
  ✅ Test: Track resource utilization
  ✅ Test: Alert on high utilization
});
```

**Success Criteria**:
- ✅ 30+ tests total
- ✅ Coverage ≥ 60% (target for first pass)

---

### Day 10: CostTracker.ts
**File**: `src/orchestrator/CostTracker.ts` (357 lines)
**Risk Level**: 🟡 HIGH - Cost calculation errors
**Estimated Effort**: 6 hours

**Test Scenarios**:

```typescript
// tests/unit/orchestrator/CostTracker.test.ts
describe('CostTracker', () => {
  // Cost Calculation
  ✅ Test: Calculate cost from tokens
  ✅ Test: Calculate cost for different models
  ✅ Test: Handle caching discounts

  // Accuracy
  ✅ Test: Floating point precision
  ✅ Test: Very small costs (micro-dollars)
  ✅ Test: Very large costs

  // Budget Limits
  ✅ Test: Enforce budget limit
  ✅ Test: Alert on budget threshold
  ✅ Test: Budget exceeded handling

  // Aggregation
  ✅ Test: Aggregate costs by time period
  ✅ Test: Aggregate costs by agent
  ✅ Test: Aggregate costs by user
});
```

**Success Criteria**:
- ✅ 15+ tests
- ✅ Cost accuracy verified
- ✅ Coverage ≥ 85%

---

## Week 3: Utilities & Remaining Core (P1)

### Day 11-12: Utility Functions
**Files**:
- `src/utils/RateLimiter.ts`
- `src/utils/SystemResources.ts`
- `src/utils/errorHandler.ts`
- `src/utils/logger.ts`

**Risk Level**: 🟡 HIGH - Security & reliability
**Estimated Effort**: 12 hours

**Test Scenarios**:

```typescript
// tests/unit/utils/RateLimiter.test.ts
describe('RateLimiter', () => {
  // Rate Limiting
  ✅ Test: Allow requests under limit
  ✅ Test: Block requests over limit
  ✅ Test: Reset after time window

  // Token Bucket Algorithm
  ✅ Test: Consume tokens correctly
  ✅ Test: Refill tokens at rate
  ✅ Test: Burst capacity handling

  // Concurrent Access
  ✅ Test: Thread-safe token consumption
  ✅ Test: Race condition in refill

  // Time Window Edge Cases
  ✅ Test: Exact boundary conditions
  ✅ Test: Clock skew handling
  ✅ Test: Time travel (system clock changes)
});

// tests/unit/utils/SystemResources.test.ts
describe('SystemResources', () => {
  // Resource Detection
  ✅ Test: Detect CPU count
  ✅ Test: Detect total memory
  ✅ Test: Detect available memory

  // Cross-Platform
  ✅ Test: Works on macOS
  ✅ Test: Works on Linux
  ✅ Test: Works on Windows

  // Error Handling
  ✅ Test: Handle OS API failures
  ✅ Test: Fallback values
});

// tests/unit/utils/errorHandler.test.ts
describe('errorHandler', () => {
  // Error Handling
  ✅ Test: Handle standard errors
  ✅ Test: Handle custom errors
  ✅ Test: Handle error chains

  // Error Formatting
  ✅ Test: Format error message
  ✅ Test: Include stack trace
  ✅ Test: Sanitize sensitive data

  // Error Reporting
  ✅ Test: Log error
  ✅ Test: Report to telemetry
  ✅ Test: Alert on critical errors
});
```

**Success Criteria**:
- ✅ 40+ tests total
- ✅ Coverage ≥ 85%

---

### Day 13-14: Remaining Core Files
**Files**:
- `src/core/MistakePatternManager.ts`
- `src/core/HealthCheck.ts`
- `src/core/ServiceLocator.ts`

**Estimated Effort**: 12 hours

**Test Scenarios**: (Similar structure to above)

---

### Day 15: Integration Tests - Week 3
**Focus**: Core + MCP + Orchestrator integration
**Estimated Effort**: 6 hours

**Integration Test Scenarios**:

```typescript
// tests/integration/core-mcp-orchestrator.test.ts
describe('Core + MCP + Orchestrator Integration', () => {
  ✅ Test: MCP tool call → AgentRouter → agent selection
  ✅ Test: ResourceMonitor → GlobalResourcePool → task execution
  ✅ Test: ExecutionQueue → ExecutionMonitor → progress updates
  ✅ Test: Error in agent → error handler → user notification
  ✅ Test: Complete user request workflow
});
```

---

## Week 4: Evolution Module & Additional Integration (P1-P2)

### Day 16-18: Evolution Module (Critical Components)
**Files**:
- `src/evolution/EvolutionBootstrap.ts` (588 lines)
- `src/evolution/PerformanceTracker.ts` (503 lines)
- `src/evolution/LearningManager.ts` (150 lines)

**Risk Level**: 🟡 HIGH - Learning system
**Estimated Effort**: 18 hours

**Test Scenarios**:

```typescript
// tests/unit/evolution/EvolutionBootstrap.test.ts
describe('EvolutionBootstrap', () => {
  ✅ Test: Bootstrap evolution system
  ✅ Test: Initialize all components
  ✅ Test: Handle initialization failures
  ✅ Test: Load existing evolution data
});

// tests/unit/evolution/PerformanceTracker.test.ts
describe('PerformanceTracker', () => {
  ✅ Test: Track task performance
  ✅ Test: Calculate metrics
  ✅ Test: Detect performance degradation
  ✅ Test: Performance trends over time
});

// tests/unit/evolution/LearningManager.test.ts
describe('LearningManager', () => {
  ✅ Test: Learn from mistakes
  ✅ Test: Apply learned patterns
  ✅ Test: Forget outdated patterns
  ✅ Test: Pattern priority management
});
```

**Success Criteria**:
- ✅ 35+ tests
- ✅ Coverage ≥ 60%

---

### Day 19-20: Additional Integration Tests
**Focus**: Missing integration scenarios
**Estimated Effort**: 12 hours

**Integration Tests**:

```typescript
// tests/integration/a2a-memory.test.ts
describe('A2A + Memory Integration', () => {
  ✅ Test: Agent-to-agent with memory storage
  ✅ Test: Cross-agent knowledge sharing
  ✅ Test: Memory deduplication across agents
});

// tests/integration/evolution-telemetry.test.ts
describe('Evolution + Telemetry Integration', () => {
  ✅ Test: Learning with metrics collection
  ✅ Test: Performance tracking integration
  ✅ Test: Mistake detection → pattern storage
});

// tests/integration/full-system-load.test.ts
describe('Full System Under Load', () => {
  ✅ Test: 100 concurrent user requests
  ✅ Test: Resource pool management under load
  ✅ Test: Memory usage stable
  ✅ Test: Response time acceptable
});
```

**Success Criteria**:
- ✅ 20+ integration tests
- ✅ All major integration points covered

---

## Week 4 Completion: Test Quality Review

### Day 21: Test Quality Audit
**Focus**: Review all tests for quality issues
**Estimated Effort**: 6 hours

**Checklist**:
- ✅ All tests have clear descriptions
- ✅ All tests are independent (no shared state)
- ✅ All edge cases documented
- ✅ All tests have proper cleanup
- ✅ No flaky tests
- ✅ Test execution time < 5 minutes

---

## Success Metrics - 1 Month Target

### Coverage Targets
- ✅ **Core module**: 38% → 80% (42% increase)
- ✅ **MCP module**: 38% → 70% (32% increase)
- ✅ **Orchestrator**: 0% → 60% (60% increase)
- ✅ **Utils**: 17% → 70% (53% increase)
- ✅ **Evolution**: 3% → 40% (37% increase)
- ✅ **Overall**: 30% → 65% (35% increase)

### Quality Targets
- ✅ Flaky test rate < 1%
- ✅ Test execution time < 5 minutes
- ✅ All P0 files have ≥ 85% coverage
- ✅ All critical edge cases tested
- ✅ All critical error paths tested

### Process Targets
- ✅ CI/CD enforces 80% coverage for new code
- ✅ PR template includes test checklist
- ✅ Test review process established
- ✅ Test templates documented

---

## Resource Requirements

### People
- 1 Test Automation Engineer (full-time, 1 month)
- Code review support from team (2 hours/week)

### Tools
- Vitest (already in use)
- Coverage reporting (vitest --coverage)
- Test monitoring (track flaky tests)
- CI/CD pipeline (GitHub Actions)

### Estimated Total Effort
- **Week 1 (P0 Core)**: 40 hours
- **Week 2 (P0 MCP/Orchestrator)**: 40 hours
- **Week 3 (P1 Utils/Core)**: 40 hours
- **Week 4 (P1 Evolution/Integration)**: 40 hours
- **Total**: 160 hours (1 month)

---

## Risk Management

### Potential Blockers
1. **Complex legacy code** - Hard to test without refactoring
   - Mitigation: Focus on integration tests first

2. **Flaky tests** - Timing-dependent tests fail intermittently
   - Mitigation: Use proper async/await, avoid timeouts

3. **Test execution time** - Too many tests slow down CI/CD
   - Mitigation: Parallelize tests, optimize slow tests

4. **Resource constraints** - Not enough time to complete all tests
   - Mitigation: Focus on P0 first, extend timeline if needed

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Review and approve this plan
2. ✅ Create test branch: `feature/test-coverage-sprint`
3. ✅ Set up coverage tracking in CI/CD
4. ✅ Start with ResourceMonitor.ts tests

### Weekly Check-ins
- **Monday**: Review progress, adjust priorities
- **Friday**: Coverage report, blockers identified

### Success Celebration
- **After 1 month**: Review metrics, celebrate progress
- **After 3 months**: Reach 95% coverage target

---

**Plan Created**: 2026-02-03
**Plan Owner**: Test Automation Expert
**Next Review**: 2026-02-10
