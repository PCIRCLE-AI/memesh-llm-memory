# Data Flow Documentation

**Claude Code Buddy (CCB) - Request Lifecycle and Data Patterns**

**Version**: 2.0.0
**Last Updated**: 2026-01-01

---

## Table of Contents

1. [Request/Response Lifecycle](#requestresponse-lifecycle)
2. [Task Execution Flow](#task-execution-flow)
3. [Evolution System Data Flow](#evolution-system-data-flow)
4. [Knowledge Graph Integration](#knowledge-graph-integration)
5. [Database Transaction Patterns](#database-transaction-patterns)
6. [Event Flow](#event-flow)
7. [Error Propagation](#error-propagation)

---

## Request/Response Lifecycle

### Complete MCP Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Request in Claude Code                                 │
│    "Review this authentication code for security issues"       │
└────────────────────┬────────────────────────────────────────────┘
                     │ MCP Protocol (stdio transport)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MCP Server (CCB) - Tool Call Reception                      │
│    Request: {                                                   │
│      name: "sa_task",                                           │
│      arguments: {                                               │
│        taskDescription: "Review this authentication code..."    │
│      }                                                          │
│    }                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Tool Router - Validation & Rate Limiting                    │
│    │                                                            │
│    ├─→ Validate request structure (name, arguments)            │
│    │   ❌ Invalid → throw ValidationError                      │
│    │   ✅ Valid → continue                                     │
│    │                                                            │
│    ├─→ Rate Limiter check                                      │
│    │   ❌ Exceeded → throw OperationError (429 equivalent)     │
│    │   ✅ Within limit → consume token, continue              │
│    │                                                            │
│    └─→ Route to handler (ToolHandlers.handleSmartRouteTask)   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Tool Handler - Input Validation                             │
│    │                                                            │
│    ├─→ Zod schema validation (TaskInputSchema)                 │
│    │   Input: { taskDescription, priority? }                   │
│    │   ❌ Invalid → throw ValidationError with details         │
│    │   ✅ Valid → extract fields                               │
│    │                                                            │
│    └─→ Create Task object                                      │
│        {                                                        │
│          id: 'task-<timestamp>-<random>',                      │
│          description: taskDescription,                          │
│          priority?: priority                                    │
│        }                                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Router.routeTask() - Orchestration Pipeline                 │
│    │                                                            │
│    ├─→ Step 1: Task Analysis                                   │
│    │   TaskAnalyzer.analyzeTask(task)                          │
│    │   ├─→ Extract keywords from description                   │
│    │   ├─→ Determine complexity (1-10 scale)                   │
│    │   │   - Check description length                          │
│    │   │   - Count technical terms                             │
│    │   │   - Identify multi-step requirements                  │
│    │   ├─→ Identify task type (code-review, debugging, etc.)   │
│    │   ├─→ Estimate tokens (based on complexity)               │
│    │   ├─→ List required agents (capability matching)          │
│    │   └─→ Return TaskAnalysis                                 │
│    │                                                            │
│    ├─→ Step 2: Agent Selection                                 │
│    │   AgentRouter.route(analysis)                             │
│    │   ├─→ Get candidates from AgentRegistry                   │
│    │   │   (filter by capabilities matching task type)         │
│    │   ├─→ Score each candidate                                │
│    │   │   - Capability match: 40%                             │
│    │   │   - Past performance: 30%                             │
│    │   │   - Cost efficiency: 30%                              │
│    │   ├─→ Select highest scoring agent                        │
│    │   ├─→ Generate enhanced prompt (PromptEnhancer)           │
│    │   │   - Include agent expertise                           │
│    │   │   - Add best practices                                │
│    │   │   - Provide examples                                  │
│    │   └─→ Return RoutingDecision                              │
│    │                                                            │
│    ├─→ Step 3: Evolution Adaptation                            │
│    │   AdaptationEngine.adaptExecution()                       │
│    │   ├─→ Get learned patterns from LearningManager           │
│    │   │   - Success patterns (high quality + cost efficient)  │
│    │   │   - Anti-patterns (timeouts, low quality)             │
│    │   ├─→ Apply adaptations                                   │
│    │   │   ├─ Prompt optimization (efficient vs quality)       │
│    │   │   ├─ Model selection (Opus/Sonnet/Haiku)             │
│    │   │   ├─ Timeout adjustment (based on P95)                │
│    │   │   └─ Retry strategy (transient failures)             │
│    │   └─→ Return AdaptedExecution                             │
│    │                                                            │
│    ├─→ Step 4: Cost Estimation                                 │
│    │   CostTracker.estimateCost()                              │
│    │   ├─→ Calculate tokens: input + estimated output          │
│    │   ├─→ Get model pricing (per 1M tokens)                   │
│    │   ├─→ Compute cost = (input*price_in + output*price_out) │
│    │   ├─→ Check budget: isWithinBudget(estimatedCost)        │
│    │   │   ❌ Over budget → approved=false, message="Budget"  │
│    │   │   ✅ Within budget → approved=true, continue         │
│    │   └─→ Return cost estimate                                │
│    │                                                            │
│    └─→ Return RoutingResult                                    │
│        {                                                        │
│          analysis: TaskAnalysis,                               │
│          routing: RoutingDecision,                             │
│          approved: boolean,                                     │
│          message: string                                        │
│        }                                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Knowledge Graph Recording                                   │
│    KnowledgeGraph.recordDecision()                             │
│    └─→ Store routing decision for future reference             │
│        - Selected agent                                         │
│        - Reasoning                                              │
│        - Alternatives considered                                │
│        - Estimated cost                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Response Formatting                                         │
│    ResponseFormatter.format(agentResponse)                      │
│    └─→ Create structured response:                             │
│        {                                                        │
│          agentType: 'code-reviewer',                           │
│          taskDescription: '...',                                │
│          status: 'success',                                     │
│          enhancedPrompt: '<optimized prompt>',                 │
│          metadata: {                                            │
│            duration: 85ms,                                      │
│            tokensUsed: 5200,                                    │
│            model: 'claude-sonnet-4-5-20250929'                 │
│          }                                                      │
│        }                                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. MCP Response                                                │
│    {                                                            │
│      content: [                                                 │
│        {                                                        │
│          type: 'text',                                          │
│          text: '<formatted enhanced prompt with metadata>'     │
│        }                                                        │
│      ]                                                          │
│    }                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │ MCP Protocol (stdio transport)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Claude Code - Execute Enhanced Prompt                       │
│    - Receives optimized prompt with expert knowledge           │
│    - Uses user's Claude API subscription                       │
│    - Executes with recommended model                           │
│    - Returns result to user                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Performance Tracking (After Execution - Optional)          │
│     PerformanceTracker.track(metrics)                          │
│     └─→ Record execution metrics:                              │
│         - success: true/false                                   │
│         - duration: milliseconds                                │
│         - cost: actual dollars                                  │
│         - quality: 0.0 to 1.0 (user feedback/heuristics)       │
│         - timestamp: Unix timestamp                             │
│                                                                 │
│     └─→ Trigger pattern analysis (if threshold met)            │
│         - LearningManager.analyzePatterns(agent)               │
│         - Store learned patterns                                │
│         - Update adaptation strategies                          │
└─────────────────────────────────────────────────────────────────┘
```

### Timing Breakdown

| Phase | Target | Typical | Max |
|-------|--------|---------|-----|
| MCP Reception | < 5ms | ~2ms | 10ms |
| Validation & Rate Limiting | < 10ms | ~5ms | 20ms |
| Task Analysis | < 50ms | ~30ms | 100ms |
| Agent Routing | < 30ms | ~20ms | 60ms |
| Evolution Adaptation | < 20ms | ~10ms | 40ms |
| Cost Estimation | < 5ms | ~2ms | 10ms |
| Knowledge Graph Recording | < 15ms | ~8ms | 30ms |
| Response Formatting | < 5ms | ~3ms | 10ms |
| **Total** | **< 140ms** | **~80ms** | **280ms** |

---

## Task Execution Flow

### Orchestrator.executeTask() Deep Dive

```
executeTask(task)
    │
    ├─→ Start timer (for duration tracking)
    │
    ├─→ Step 0: Query Knowledge Graph (Optional but Recommended)
    │   KnowledgeAgent.findSimilar(task.description, 'feature')
    │   │
    │   ├─→ SQLite FTS (Full-Text Search) query
    │   │   SELECT name, entity_type, similarity
    │   │   FROM entities_fts
    │   │   WHERE observations_fts MATCH ?
    │   │   ORDER BY similarity DESC LIMIT 5
    │   │
    │   └─→ Return similar past tasks (if any)
    │       Example:
    │       [
    │         { name: 'OAuth2 Implementation', similarity: 0.85 },
    │         { name: 'JWT Token Security Audit', similarity: 0.72 }
    │       ]
    │
    ├─→ Step 1: Route Task
    │   Router.routeTask(task)
    │   └─→ (See Router Pipeline above)
    │       Returns: { analysis, routing, approved, message }
    │
    ├─→ Step 2: Check Approval
    │   if (!approved):
    │       throw ValidationError(message)
    │       └─→ Common reasons:
    │           - Budget exceeded
    │           - Rate limit exceeded
    │           - Invalid task type
    │
    ├─→ Step 3: Log Task Start
    │   logger.info('Executing task:', {
    │     taskId: task.id,
    │     complexity: analysis.complexity,
    │     agent: routing.selectedAgent,
    │     estimatedCost: routing.estimatedCost
    │   })
    │
    ├─→ Step 4: Record Routing Decision
    │   KnowledgeAgent.recordDecision({
    │     name: `Task ${task.id} Routing Decision`,
    │     reason: routing.reasoning,
    │     alternatives: analysis.requiredAgents.filter(a => a !== routing.selectedAgent),
    │     tradeoffs: [
    │       `Estimated cost: $${routing.estimatedCost.toFixed(6)}`,
    │       `Complexity: ${analysis.complexity}`
    │     ],
    │     outcome: `Selected ${routing.selectedAgent}`,
    │     tags: ['routing', 'orchestrator', task.id]
    │   })
    │
    ├─→ Step 5: Execute (Simulated in MCP Server Pattern)
    │   modelToUse = routing.enhancedPrompt.suggestedModel || 'claude-sonnet-4-5'
    │   response = await callClaude(modelToUse, task.description)
    │   │
    │   └─→ Note: In MCP Server Pattern, CCB doesn't actually call Claude.
    │       This is simulated or skipped. The enhanced prompt is returned
    │       to Claude Code which executes it using user's API subscription.
    │
    ├─→ Step 6: Record Actual Cost
    │   actualCost = CostTracker.recordTaskCost(
    │     task.id,
    │     modelToUse,
    │     response.usage.input_tokens,
    │     response.usage.output_tokens
    │   )
    │
    ├─→ Step 7: Stop Timer
    │   executionTimeMs = Date.now() - startTime
    │
    ├─→ Step 8: Log Completion
    │   logger.info('Task completed:', {
    │     taskId: task.id,
    │     duration: executionTimeMs,
    │     actualCost: actualCost
    │   })
    │
    ├─→ Step 9: Record Feature to Knowledge Graph (if success)
    │   KnowledgeAgent.recordFeature({
    │     name: `Task ${task.id} Execution`,
    │     description: task.description.substring(0, 100),
    │     implementation: `Agent: ${routing.selectedAgent}, Model: ${modelToUse}`,
    │     challenges: actualCost > routing.estimatedCost ? ['Cost exceeded estimate'] : undefined,
    │     tags: ['task-execution', routing.selectedAgent, task.id]
    │   })
    │
    └─→ Return TaskResult
        {
          task,
          analysis,
          routing,
          response: <text from response>,
          cost: actualCost,
          executionTimeMs
        }

Error Handling:
    catch (error):
        ├─→ Record error to Knowledge Graph
        │   KnowledgeAgent.recordBugFix({
        │     name: `Task ${task.id} Error`,
        │     rootCause: error.message,
        │     solution: 'Task execution failed, needs investigation',
        │     prevention: 'Review task requirements and system constraints',
        │     tags: ['error', 'task-failure', task.id]
        │   })
        │
        ├─→ Log error with context
        │   logger.error('Task failed:', {
        │     taskId: task.id,
        │     error: error.message,
        │     stack: error.stack,
        │     duration: Date.now() - startTime
        │   })
        │
        └─→ Rethrow error (propagate to handler)
```

---

## Evolution System Data Flow

### Performance Tracking and Learning Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Task Execution Completes                                    │
│    Result: { success, duration, cost, quality }                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Performance Tracker - Record Metrics                        │
│    PerformanceTracker.track({                                  │
│      agentId: 'code-reviewer',                                 │
│      taskType: 'security-audit',                               │
│      success: true,                                             │
│      duration: 1250,                                            │
│      cost: 0.075,                                               │
│      quality: 0.92,                                             │
│      timestamp: 1735689600                                      │
│    })                                                           │
│    │                                                            │
│    ├─→ In-Memory Storage                                       │
│    │   executions[agentId][taskType].push(metrics)             │
│    │                                                            │
│    ├─→ Calculate Statistics (running)                          │
│    │   - Total executions                                      │
│    │   - Success rate (successes / total)                      │
│    │   - Average duration                                       │
│    │   - Average cost                                           │
│    │   - Average quality                                        │
│    │                                                            │
│    └─→ Detect Trends                                           │
│        Compare recent (last 10) vs historical (all)            │
│        - Success rate trend: improving/declining/stable        │
│        - Duration trend: improving/declining/stable            │
│        - Cost trend: improving/declining/stable                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Threshold Check - Trigger Pattern Analysis?                │
│    if (executionCount % 15 === 0):  // Every 15 executions    │
│        Trigger LearningManager.analyzePatterns()               │
│    else:                                                        │
│        Skip pattern analysis (not enough new data)             │
└────────────────────┬────────────────────────────────────────────┘
                     │ (if threshold met)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Learning Manager - Pattern Analysis                        │
│    LearningManager.analyzePatterns(agentId, taskType)          │
│    │                                                            │
│    ├─→ Get Execution History                                   │
│    │   executions = PerformanceTracker.getHistory(agent, type) │
│    │                                                            │
│    ├─→ Identify Success Patterns                               │
│    │   Filter: success=true AND quality>=0.8 AND cost<avg      │
│    │   Analyze:                                                 │
│    │   - What prompts worked well?                             │
│    │   - What models were efficient?                           │
│    │   - What timeouts were appropriate?                       │
│    │   Create Pattern:                                          │
│    │   {                                                        │
│    │     type: 'success',                                       │
│    │     confidence: 0.85,                                      │
│    │     description: 'Quality-focused prompt yields high...'  │
│    │     action: {                                              │
│    │       type: 'promptOptimization',                         │
│    │       parameters: { style: 'quality-focused' }            │
│    │     },                                                     │
│    │     impact: { successRate: 0.15, costReduction: 0.0 }    │
│    │   }                                                        │
│    │                                                            │
│    ├─→ Identify Anti-Patterns                                  │
│    │   Filter: success=false OR quality<0.6 OR timeouts        │
│    │   Analyze:                                                 │
│    │   - What went wrong?                                       │
│    │   - Common failure causes?                                │
│    │   - Model selection issues?                               │
│    │   Create Pattern:                                          │
│    │   {                                                        │
│    │     type: 'anti-pattern',                                 │
│    │     confidence: 0.75,                                      │
│    │     description: 'Timeout with current setting...'        │
│    │     action: {                                              │
│    │       type: 'timeoutAdjustment',                          │
│    │       parameters: { newTimeout: <P95 duration> }          │
│    │     },                                                     │
│    │     impact: { successRate: 0.20 }                         │
│    │   }                                                        │
│    │                                                            │
│    ├─→ Identify Optimization Opportunities                     │
│    │   Filter: success=true AND cost>avg                       │
│    │   Analyze:                                                 │
│    │   - Can we use cheaper model without quality loss?        │
│    │   - Can we simplify prompt?                               │
│    │   Create Pattern:                                          │
│    │   {                                                        │
│    │     type: 'optimization',                                 │
│    │     confidence: 0.70,                                      │
│    │     description: 'Model downgrade possible...'            │
│    │     action: {                                              │
│    │       type: 'modelSelection',                             │
│    │       parameters: { newModel: 'claude-sonnet-4-5' }       │
│    │     },                                                     │
│    │     impact: { costReduction: 0.60, successRate: -0.02 }  │
│    │   }                                                        │
│    │                                                            │
│    └─→ Store Patterns                                          │
│        patterns[agentId][taskType] = [...learned patterns]     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Evolution Storage - Persist to Database                    │
│    SQLiteStore.savePatterns(agentId, taskType, patterns)       │
│    │                                                            │
│    └─→ INSERT INTO patterns (                                  │
│          agent_id, task_type, pattern_type,                    │
│          confidence, description, action_type,                 │
│          action_parameters, impact_data                        │
│        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Next Execution - Apply Adaptations                         │
│    AdaptationEngine.adaptExecution(agent, taskType, baseConfig)│
│    │                                                            │
│    ├─→ Get Recommendations                                     │
│    │   patterns = LearningManager.getRecommendations(          │
│    │     agent, taskType                                       │
│    │   )                                                        │
│    │   Filter: confidence >= threshold (0.75)                  │
│    │                                                            │
│    ├─→ Apply Adaptations (in order)                            │
│    │   for pattern in patterns:                                │
│    │     if pattern.action.type === 'promptOptimization':      │
│    │       config.prompt = applyPromptOptimization(...)        │
│    │     if pattern.action.type === 'modelSelection':          │
│    │       config.model = pattern.action.parameters.newModel   │
│    │     if pattern.action.type === 'timeoutAdjustment':       │
│    │       config.timeout = pattern.action.parameters.timeout  │
│    │     if pattern.action.type === 'retryStrategy':           │
│    │       config.retries = pattern.action.parameters.retries  │
│    │                                                            │
│    └─→ Return Adapted Configuration                            │
│        {                                                        │
│          adaptedConfig: <modified config>,                     │
│          appliedPatterns: [...patterns applied],               │
│          reasoning: 'Applied 3 learned optimizations...'       │
│        }                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Learning Feedback Loop

```
Execution → Track → Analyze (every 15) → Learn → Adapt → Next Execution
    ↑                                                            ↓
    └────────────────────────────────────────────────────────────┘
                    (Continuous Improvement)
```

---

## Knowledge Graph Integration

### Recording Decisions

```
KnowledgeGraph.recordDecision(decision)
    │
    ├─→ Create Entity (if not exists)
    │   INSERT INTO entities (name, entity_type)
    │   VALUES (?, 'decision')
    │   ON CONFLICT(name) DO UPDATE SET updated_at = NOW()
    │
    ├─→ Add Observations (using Transaction)
    │   BEGIN TRANSACTION
    │   │
    │   ├─→ Observation 1: Reason
    │   │   INSERT INTO observations (entity_name, content)
    │   │   VALUES ('Decision Name', 'Reason: <reason>')
    │   │
    │   ├─→ Observation 2: Alternatives
    │   │   INSERT INTO observations (entity_name, content)
    │   │   VALUES ('Decision Name', 'Alternatives: <alt1>, <alt2>')
    │   │
    │   ├─→ Observation 3: Tradeoffs
    │   │   INSERT INTO observations (entity_name, content)
    │   │   VALUES ('Decision Name', 'Tradeoffs: <tradeoff1>, ...')
    │   │
    │   └─→ Observation 4: Outcome
    │       INSERT INTO observations (entity_name, content)
    │       VALUES ('Decision Name', 'Outcome: <outcome>')
    │   │
    │   COMMIT TRANSACTION
    │
    └─→ Index for Full-Text Search
        INSERT INTO observations_fts (entity_name, content)
        SELECT entity_name, content FROM observations
        WHERE entity_name = 'Decision Name'
```

### Searching Knowledge

```
KnowledgeGraph.findSimilar(query, entityType)
    │
    ├─→ Full-Text Search Query
    │   SELECT
    │     e.name,
    │     e.entity_type,
    │     o.content,
    │     fts.rank AS similarity
    │   FROM entities e
    │   JOIN observations o ON e.name = o.entity_name
    │   JOIN observations_fts fts ON o.id = fts.rowid
    │   WHERE fts.observations_fts MATCH ?
    │     AND e.entity_type = ?
    │   ORDER BY fts.rank DESC
    │   LIMIT 10
    │
    ├─→ Group by Entity
    │   results = groupBy(rows, 'name')
    │   {
    │     'Decision A': [
    │       { content: 'Reason: ...', similarity: 0.85 },
    │       { content: 'Outcome: ...', similarity: 0.85 }
    │     ],
    │     'Decision B': [...],
    │   }
    │
    └─→ Return Ranked Results
        [
          {
            name: 'Decision A',
            entityType: 'decision',
            similarity: 0.85,
            observations: ['Reason: ...', 'Outcome: ...']
          },
          ...
        ]
```

---

## Database Transaction Patterns

### SQLite Connection Pool Pattern

```
acquire() → use connection → release()
    │                              │
    │                              └→ Return to pool
    │
    ├─→ Check available connections
    │   if (idleConnections.length > 0):
    │       connection = idleConnections.shift()
    │       activeConnections.add(connection)
    │       return connection
    │   else:
    │       └→ Wait for connection (with timeout)
    │          while (idleConnections.length === 0):
    │              await sleep(10ms)
    │              if (elapsed > timeout):
    │                  throw TimeoutError('No connection available')
    │          connection = idleConnections.shift()
    │          return connection
    │
    └─→ Health Check (before return)
        if (connection.lastUsed > idleTimeout):
            ├→ Close stale connection
            ├→ Create new connection
            └→ Return new connection
        else:
            └→ Return existing connection
```

### Transaction Pattern (Knowledge Graph)

```
// Atomic operation: Create entity + add observations
db.transaction(() => {
  // 1. Insert/Update entity
  db.prepare(`
    INSERT INTO entities (name, entity_type)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET updated_at = strftime('%s', 'now')
  `).run(entityName, entityType);

  // 2. Insert all observations
  const stmt = db.prepare(`
    INSERT INTO observations (entity_name, content)
    VALUES (?, ?)
  `);

  for (const observation of observations) {
    stmt.run(entityName, observation);
  }

  // 3. If any step fails, entire transaction rolls back automatically
})();
```

---

## Event Flow

### Development Butler Checkpoint Flow

```
User writes code
    │
    ├─→ File save event
    │   CheckpointDetector.detect({ filesChanged: [...] })
    │   │
    │   ├─→ Detect checkpoint type
    │   │   if (message includes 'test'):
    │   │       return Checkpoint.CODE_WRITTEN
    │   │
    │   └─→ Trigger DevelopmentButler
    │       butler.handleCheckpoint(checkpoint, context)
    │       │
    │       ├─→ Checkpoint: CODE_WRITTEN
    │       │   ├─→ Run tests
    │       │   │   execute('npm test')
    │       │   │
    │       │   ├─→ Parse test results
    │       │   │   if (all passed):
    │       │   │       ├─→ Record success
    │       │   │       └─→ Suggest: 'Code review ready'
    │       │   │   else:
    │       │   │       ├─→ Record failure
    │       │   │       └─→ Suggest: 'Debug test failures'
    │       │   │
    │       │   └─→ Return actions performed
    │       │       ['Ran tests', 'All tests passed', 'Suggested: Code review']
    │       │
    │       └─→ Log to LearningManager
    │           (for future workflow improvements)
    │
    └─→ Present to user
        "Development Butler: Ran tests. All passed. Ready for code review?"
```

---

## Error Propagation

### Error Handling Chain

```
Error occurs in Component
    │
    ├─→ logError(error, context)  // Always log first
    │   logger.error('Operation failed', {
    │     error: error.message,
    │     stack: error.stack,
    │     component: 'ComponentName',
    │     method: 'methodName',
    │     operation: 'what was being done',
    │     data: { context: 'additional data' }
    │   })
    │
    ├─→ Wrap in Custom Error (if needed)
    │   if (error instanceof SQLiteError):
    │       throw new DatabaseError('Database operation failed', {
    │         component, method, cause: error
    │       })
    │   else if (error instanceof ZodError):
    │       throw new ValidationError('Input validation failed', {
    │         component, method, errors: error.errors
    │       })
    │
    └─→ Propagate to Handler
        try {
          // ... operation
        } catch (error) {
          logError(error, context);

          if (error instanceof ValidationError) {
            return {
              isError: true,
              content: [{ type: 'text', text: formatValidationError(error) }]
            };
          }

          if (error instanceof DatabaseError) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Database error. Please try again.' }]
            };
          }

          // Generic error
          return {
            isError: true,
            content: [{ type: 'text', text: 'An error occurred. Check logs.' }]
          };
        }
```

### Custom Error Types

```typescript
// ValidationError: Input validation failed
throw new ValidationError('Invalid task description', {
  component: 'TaskAnalyzer',
  method: 'analyzeTask',
  providedValue: task.description,
  constraint: 'must be non-empty string'
});

// NotFoundError: Resource not found
throw new NotFoundError('Agent not found', 'agent', agentName, {
  availableAgents: registry.getAllAgentTypes()
});

// OperationError: Operation failed
throw new OperationError('Rate limit exceeded', {
  component: 'RateLimiter',
  method: 'consume',
  rateLimitStatus: limiter.getStatus()
});

// DatabaseError: Database operation failed
throw new DatabaseError('Failed to insert entity', {
  component: 'KnowledgeGraphStore',
  method: 'createEntity',
  cause: sqliteError
});
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: High-level system architecture
- **[COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)**: Detailed component reference
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment and operations guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Development guidelines

---

**Version**: 2.0.0
**Last Updated**: 2026-01-01
**Maintainer**: Claude Code Buddy Team
