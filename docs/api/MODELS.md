# 🤖 Model Recommendation Guide

CCB provides **model recommendations** inside enhanced prompts. In MCP server mode,
Claude Code performs the actual model execution, while CCB focuses on capability
routing, prompt enrichment, and cost estimation.

## Claude Model Series (Primary)

### Claude Sonnet 4.5 ⭐ Recommended

**Use Cases**: Daily development, code generation, general conversations

**Advantages**:
- Fast response (< 3 seconds)
- High cost-performance ratio
- Excellent quality

**Cost**:
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**Typical Use Cases**:
```typescript
import { Router } from '../../src/orchestrator/router.js';

const router = new Router();
const result = await router.routeTask({
  id: 'task-1',
  description: 'Write a TypeScript function to calculate Fibonacci sequence'
});

console.log(result.routing.enhancedPrompt?.suggestedModel);
```

---

### Claude Opus 4.5 💎 Advanced

**Use Cases**: Complex reasoning, creative writing, system architecture design

**Advantages**:
- Strongest reasoning capabilities
- Excellent creative performance
- High accuracy for complex tasks

**Cost**:
- Input: $15 / 1M tokens
- Output: $75 / 1M tokens

**Typical Use Cases**:
```typescript
import { Router } from '../../src/orchestrator/router.js';

const router = new Router();
const result = await router.routeTask({
  id: 'task-2',
  description: 'Design a highly available microservices architecture'
});

console.log(result.routing.enhancedPrompt?.suggestedModel);
```

---

### Claude Haiku 4 ⚡ Fast

**Use Cases**: Simple tasks, quick responses

**Advantages**:
- Ultra-fast response (< 1 second)
- Lowest cost
- Suitable for large volumes of simple tasks

**Cost**:
- Input: $0.8 / 1M tokens
- Output: $4 / 1M tokens

**Typical Use Cases**:
```typescript
import { Router } from '../../src/orchestrator/router.js';

const router = new Router();
const result = await router.routeTask({
  id: 'task-3',
  description: "Classify sentiment: 'This product is great!'"
});

console.log(result.routing.enhancedPrompt?.suggestedModel);
```

---

## Recommendation Logic

CCB recommends models based on task complexity and capability focus:

```typescript
import { Router } from '../../src/orchestrator/router.js';

const router = new Router();
const result = await router.routeTask({
  id: 'task-4',
  description: 'Investigate memory regression in the telemetry pipeline'
});

const suggestedModel = result.routing.enhancedPrompt?.suggestedModel;
console.log(`Suggested model: ${suggestedModel ?? 'default'}`);
```
---

## Cost Awareness

CCB tracks estimated costs for budgeting and reporting:

```typescript
const report = router.getCostTracker().generateReport();
console.log(report);
```

Set `MONTHLY_BUDGET_USD` and `COST_ALERT_THRESHOLD` in `.env` to tune alerts.
