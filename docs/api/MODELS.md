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

## OpenAI Models (Auxiliary)

### Whisper (Speech-to-Text)

**Cost**: $0.006 / minute

**Usage Example**:
```typescript
const transcription = await voiceAgent.transcribe({
  audioPath: "/path/to/audio.mp3",
  language: "zh"
});

// Cost: 5 minutes of audio = $0.03
```

---

### TTS (Text-to-Speech)

**Models**:
- `tts-1`: Standard quality (recommended)
- `tts-1-hd`: High quality

**Cost**: $0.015 / 1K characters

**Voice Options**:
- `alloy`: Neutral, clear (recommended)
- `echo`: Male, warm
- `fable`: British accent
- `onyx`: Deep male voice
- `nova`: Female, friendly
- `shimmer`: Female, soft

**Usage Example**:
```typescript
const audio = await voiceAgent.synthesize({
  text: "Hello, welcome to Smart Agents!",
  voice: "alloy",
  quality: "standard"
});

// Cost: 50 characters = $0.00075
```

---

### Embeddings (Vectorization)

**Model Options**:
- `text-embedding-3-small`: 512 dimensions (recommended)
- `text-embedding-3-large`: 1536 dimensions

**Cost**:
- Small: $0.02 / 1M tokens
- Large: $0.13 / 1M tokens

**Usage Example**:
```typescript
await ragAgent.indexDocuments({
  documents: [
    "Document content 1...",
    "Document content 2..."
  ],
  model: "text-embedding-3-small"
});

// Cost: 1000 documents (~500K tokens) = $0.01
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
// Don't recompute identical queries
@cache()
async function getEmbedding(text: string) {
  return await openai.embeddings.create({ input: text });
}
```

### 2. Batch Processing

```typescript
// Process multiple documents at once
await ragAgent.indexDocuments(documents); // ✅ Good
// vs
for (const doc of documents) {
  await ragAgent.indexDocument(doc); // ❌ Expensive
}
```

### 3. Choose the Right Model

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
| Whisper | 100 minutes/month | $0.60 |
| TTS | 50K characters/month | $0.75 |
| Embeddings | 1M tokens/month | $0.02 |
| **Total** | | **~$20-25/month** |

**Moderate Usage** (Budget $50-100/month):

| Service | Usage | Cost |
|---------|-------|------|
| Claude Sonnet | 1M tokens/day | $30-40 |
| Claude Opus | 100K tokens/month | $5-10 |
| Whisper | 300 minutes/month | $1.80 |
| TTS | 100K characters/month | $1.50 |
| Embeddings | 5M tokens/month | $0.10 |
| **Total** | | **~$40-55/month** |

---

## Monitoring and Alerts

Smart Agents automatically tracks costs:

```typescript
// Check current costs
const report = costTracker.getReport();
console.log(`Used this month: $${report.monthlyTotal}`);
console.log(`Remaining budget: $${report.remaining}`);

// Automatic warning when exceeding 80%
// Switches to cheaper models when exceeding 100%
```
