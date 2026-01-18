# 🤖 Model Selection Guide

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
// Code generation
const result = await orchestrator.route({
  task: "Write a TypeScript function to calculate Fibonacci sequence",
  complexity: "medium" // Automatically selects Sonnet
});

// General Q&A
const answer = await orchestrator.route({
  task: "Explain what closures are",
  complexity: "simple" // May use Haiku
});
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
// System architecture design
const architecture = await orchestrator.route({
  task: "Design a highly available microservices architecture",
  complexity: "complex" // Automatically selects Opus
});

// Creative writing
const story = await orchestrator.route({
  task: "Write a science fiction short story",
  complexity: "complex"
});
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
// Simple classification
const category = await orchestrator.route({
  task: "Is this text positive or negative: 'This product is great!'",
  complexity: "simple" // Automatically selects Haiku
});
```

---

## Automatic Model Selection Logic

The Orchestrator automatically selects models based on tasks:

```typescript
function selectModel(task: string): ModelConfig {
  const complexity = analyzeComplexity(task);

  if (complexity === 'simple') {
    return {
      model: 'claude-haiku-4',
      reasoning: 'Simple task, using Haiku to save costs'
    };
  }

  if (complexity === 'medium') {
    return {
      model: 'claude-sonnet-4-5',
      reasoning: 'Medium task, using Sonnet to balance performance and cost'
    };
  }

  return {
    model: 'claude-opus-4-5',
    reasoning: 'Complex task, using Opus to ensure quality'
  };
}
```

---

## Cost Optimization Recommendations

### 1. Use Caching

```typescript
// Avoid recomputing identical tasks
@cache()
async function routeTask(task: string) {
  return await orchestrator.route({ task, complexity: "simple" });
}
```

### 2. Choose the Right Model

```typescript
// Use Haiku for simple tasks
await orchestrator.route({ task: "Classification", complexity: "simple" }); // $0.001

// vs using Opus
await orchestrator.route({ task: "Classification", complexity: "complex" }); // $0.015
// Save 15x the cost!
```

---

## Monthly Cost Estimates

**Conservative Usage** (Budget $30-50/month):

| Service | Usage | Cost |
|---------|-------|------|
| Claude Sonnet | 500K tokens/day | $15-20 |
| Claude Haiku | 200K tokens/day | $2-3 |
| **Total** | | **~$17-23/month** |

**Moderate Usage** (Budget $50-100/month):

| Service | Usage | Cost |
|---------|-------|------|
| Claude Sonnet | 1M tokens/day | $30-40 |
| Claude Opus | 100K tokens/month | $5-10 |
| Claude Haiku | 400K tokens/day | $4-6 |
| **Total** | | **~$39-56/month** |

---

## Monitoring and Alerts

Claude Code Buddy automatically tracks costs:

```typescript
// Check current costs
const report = costTracker.getReport();
console.log(`Used this month: $${report.monthlyTotal}`);
console.log(`Remaining budget: $${report.remaining}`);

// Automatic warning when exceeding 80%
// Switches to cheaper models when exceeding 100%
```
