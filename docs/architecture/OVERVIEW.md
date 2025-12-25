# Smart Agents - System Architecture

**Version**: 2.0.0 (Multi-Model Integration)
**Last Updated**: 2025-12-25
**Status**: Week 5 Implementation Complete

---

## Table of Contents

1. [Architecture Philosophy](#architecture-philosophy)
2. [Five-Layer Architecture](#five-layer-architecture)
3. [Layer 1: Provider Integration](#layer-1-provider-integration)
4. [Layer 2: Quota Manager](#layer-2-quota-manager)
5. [Layer 3: Smart Router](#layer-3-smart-router)
6. [Layer 4: Skills Coordination](#layer-4-skills-coordination)
7. [Layer 5: User Interface](#layer-5-user-interface)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Failover Logic](#failover-logic)
10. [Performance Optimization](#performance-optimization)
11. [Testing Strategy](#testing-strategy)

---

## Architecture Philosophy

### Core Problem Statement

**User Pain Point** (Direct User Feedback):
> "People have multiple AI model subscriptions, but not enough quota for use, because the market is so unstable. Everyday there's a new model coming out, and none of them is perfect enough to complete all tasks with one single model, so **models integration is vital**."

### Design Principles

1. **Quota-Aware Routing**: Never let users hit quota limits unexpectedly
2. **Graceful Degradation**: Always provide a working solution (local Ollama as last resort)
3. **Cost Optimization**: Prefer cheaper/local models when quality is sufficient
4. **Transparency**: Users see routing decisions and cost savings
5. **Extensibility**: Easy to add new providers without changing core logic

### Key Metrics

- **Cost Reduction**: 40% average savings vs single-provider usage
- **Availability**: 99.9% uptime (local Ollama never fails)
- **Response Time**: < 2s for routing decision
- **Quota Hit Rate**: < 5% (via intelligent failover)

---

## Five-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: User Interface                                     │
│ Claude Code (existing) + Smart Agents MCP Server            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Skills Coordination Layer                          │
│ Multi-model agent orchestration                             │
│ Task decomposition and distribution                         │
│ Result synthesis                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Smart Router (Quota-Aware)                         │
│ Complexity analysis (1-10)                                  │
│ Quota checking                                              │
│ Provider selection with failover                            │
│ Cost optimization                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Quota Manager                                      │
│ Real-time quota tracking                                    │
│ Provider availability monitoring                            │
│ Failover trigger logic                                      │
│ Usage analytics                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ↓           ↓           ↓
┌──────────────────┐ ┌────────────┐ ┌────────────┐
│ Layer 1:         │ │            │ │            │
│ Provider         │ │            │ │            │
│ Integration      │ │            │ │            │
├──────────────────┤ ├────────────┤ ├────────────┤
│ Ollama           │ │ Gemini     │ │ Claude     │
│ (local)          │ │ (FREE tier)│ │ (reasoning)│
│                  │ │            │ │            │
│ qwen2.5-coder    │ │ Vision     │ │ Sonnet 4.5 │
│ qwen2.5:14b      │ │ Audio      │ │ Opus 4.5   │
│ llama3.2:1b      │ │ Video      │ │            │
└──────────────────┘ └────────────┘ └────────────┘
        │                   │               │
        └───────────────────┴───────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ↓                       ↓
        ┌──────────────┐        ┌──────────────┐
        │ Grok         │        │ ChatGPT      │
        │ (reasoning)  │        │ (code gen)   │
        │              │        │              │
        │ grok-beta    │        │ GPT-4 Turbo  │
        └──────────────┘        └──────────────┘
```

### Layer Responsibilities

| Layer | Purpose | Key Components | Complexity |
|-------|---------|----------------|------------|
| L5 | User interaction | MCP Server | Low |
| L4 | Task orchestration | Multi-agent coordination | High |
| L3 | Routing decisions | SmartRouter | Medium |
| L2 | Resource management | QuotaManager | Medium |
| L1 | API integration | 5 provider clients | Low |

---

## Layer 1: Provider Integration

### Design Pattern: Unified Client Interface

All provider clients follow the **same interface pattern** for consistency:

```typescript
interface BaseClient {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  getModelInfo(): { provider: string; model: string };
}
```

### Provider Clients

#### 1. OllamaClient (`src/integrations/ollama/client.ts`)

**Purpose**: Local inference ($0 cost, unlimited quota)

**Models**:
- `qwen2.5-coder:14b` - Code tasks (complexity 1-7)
- `qwen2.5:14b` - General text (complexity 1-5)
- `llama3.2:1b` - Ultra-fast simple tasks (complexity 1-2)

**Key Methods**:
```typescript
class OllamaClient {
  async generate(prompt: string, model: string): Promise<string>
  async chat(messages: Message[], model: string): Promise<string>
  async listModels(): Promise<string[]>
}
```

**Connection**: HTTP to `localhost:11434` (default Ollama port)

---

#### 2. GeminiClient (`src/integrations/gemini/client.ts`)

**Purpose**: Multimodal tasks (vision, audio, video) - FREE tier

**Key Methods**:
```typescript
class GeminiClient {
  async generateText(prompt: string): Promise<string>
  async analyzeImage(imagePath: string, prompt: string): Promise<string>
  async transcribeAudio(audioPath: string, options?: TranscribeOptions): Promise<string>
  async analyzeVideo(videoPath: string, task: VideoTask): Promise<VideoAnalysis>
}
```

**API**: Google Generative AI SDK (`@google/generative-ai`)

---

#### 3. GrokClient (`src/integrations/grok/client.ts`)

**Purpose**: Reasoning tasks (complexity 6-8)

**Key Methods**:
```typescript
class GrokClient {
  async generateText(prompt: string, options?: {...}): Promise<string>
  async chat(messages: GrokMessage[], options?: {...}): Promise<{
    response: string;
    usage: { promptTokens, completionTokens, totalTokens };
  }>
  async reason(problem: string, context?: string): Promise<{
    reasoning: string;
    conclusion: string;
  }>
}
```

**API**: xAI API (`https://api.x.ai/v1`)

---

#### 4. ChatGPTClient (`src/integrations/chatgpt/client.ts`)

**Purpose**: Code generation (complexity 6-7)

**Key Methods**:
```typescript
class ChatGPTClient {
  async generateText(prompt: string, options?: {...}): Promise<string>
  async chat(messages: ChatGPTMessage[], options?: {...}): Promise<{...}>
  async generateCode(task: string, language: string, context?: string): Promise<{
    code: string;
    explanation: string;
  }>
}
```

**API**: OpenAI SDK (`openai` npm package)

---

#### 5. ClaudeClient (Existing - Extended)

**Purpose**: Complex reasoning and creative tasks (complexity 8-10)

**Models**:
- `claude-sonnet-4-5-20250929` - Complex code (complexity 8)
- `claude-opus-4-5-20251101` - Maximum complexity (complexity 9-10)

---

## Layer 2: Quota Manager

### Purpose

**Track and manage API quotas across all providers to enable intelligent failover.**

### Core Data Structure

```typescript
interface ProviderQuota {
  provider: string;
  limits: {
    daily?: number;
    monthly?: number;
    tokens?: number;
  };
  usage: {
    daily: number;
    monthly: number;
    tokens: number;
    lastReset: Date;
  };
  available: boolean;  // Is provider currently available?
}
```

### Implementation (`src/quota/manager.ts` - 247 lines)

#### Key Methods

**1. checkQuota(provider: string): QuotaCheckResult**

Check if a provider can be used:

```typescript
checkQuota(provider: string): QuotaCheckResult {
  const quota = this.quotas.get(provider);

  // Check availability
  if (!quota.available) {
    return {
      canUse: false,
      reason: `Provider ${provider} is currently unavailable`,
      suggestedAlternatives: this.getSuggestedAlternatives(provider)
    };
  }

  // Auto-reset counters if needed
  this.resetIfNeeded(quota);

  // Check daily limit
  if (quota.limits.daily && quota.usage.daily >= quota.limits.daily) {
    return {
      canUse: false,
      reason: `Daily limit reached for ${provider}`,
      remainingDaily: 0,
      suggestedAlternatives: this.getSuggestedAlternatives(provider)
    };
  }

  // Check monthly limit
  if (quota.limits.monthly && quota.usage.monthly >= quota.limits.monthly) {
    return {
      canUse: false,
      reason: `Monthly limit reached for ${provider}`,
      remainingMonthly: 0,
      suggestedAlternatives: this.getSuggestedAlternatives(provider)
    };
  }

  // Provider can be used
  return { canUse: true, remainingDaily: ..., remainingMonthly: ... };
}
```

**2. recordUsage(provider: string, tokens?: number): void**

Record API usage after call:

```typescript
recordUsage(provider: string, tokens?: number): void {
  const quota = this.quotas.get(provider);
  if (!quota) return;

  quota.usage.daily++;
  quota.usage.monthly++;

  if (tokens) {
    quota.usage.tokens += tokens;
  }

  this.saveUsage();  // Persist to storage
}
```

**3. resetIfNeeded(quota: ProviderQuota): void**

Automatic date-based reset:

```typescript
private resetIfNeeded(quota: ProviderQuota): void {
  const now = new Date();
  const lastReset = quota.usage.lastReset;

  // Reset daily counter (if day changed)
  if (now.getDate() !== lastReset.getDate()) {
    quota.usage.daily = 0;
  }

  // Reset monthly counter (if month changed)
  if (now.getMonth() !== lastReset.getMonth()) {
    quota.usage.monthly = 0;
  }

  quota.usage.lastReset = now;
}
```

**4. getSuggestedAlternatives(unavailableProvider: string): string[]**

Intelligent fallback suggestions:

```typescript
private getSuggestedAlternatives(unavailableProvider: string): string[] {
  const available = this.getAvailableProviders();
  return available.filter(p => p !== unavailableProvider);
}
```

### Persistent Storage

**Browser**: `localStorage` with key `smart-agents-quota-usage`
**Node.js**: File system (`.quota-usage.json`)

**Data Format**:
```json
{
  "claude": {
    "provider": "claude",
    "limits": { "daily": 150, "monthly": 4500 },
    "usage": {
      "daily": 42,
      "monthly": 1203,
      "tokens": 245000,
      "lastReset": "2025-12-25T10:30:00.000Z"
    },
    "available": true
  },
  "grok": { ... },
  "chatgpt": { ... },
  "gemini": { ... },
  "ollama": { ... }
}
```

### Testing

**Test Coverage**: 27 test cases, ≥80% coverage

**Key Test Scenarios** (`src/quota/manager.test.ts` - 401 lines):
- Quota checking logic (allow/deny)
- Daily/monthly reset mechanism
- Suggested alternatives generation
- Persistent storage (load/save)
- Provider availability marking
- Corrupted data handling

---

## Layer 3: Smart Router

### Purpose

**Route tasks to optimal AI providers based on task type, complexity, and quota availability.**

### Routing Algorithm

```typescript
selectModel(task: Task): ModelSelection {
  // Step 1: Determine preferred provider
  const preferredProvider = this.getPreferredProvider(task);

  // Step 2: Check quota availability
  const quotaCheck = this.quotaManager.checkQuota(preferredProvider);

  if (quotaCheck.canUse) {
    return {
      provider: preferredProvider,
      model: this.getModelForProvider(preferredProvider, task),
      reason: `Optimal match for ${task.type} task (complexity: ${task.complexity})`
    };
  }

  // Step 3: Try suggested alternatives
  for (const alternative of quotaCheck.suggestedAlternatives || []) {
    const altCheck = this.quotaManager.checkQuota(alternative);

    if (altCheck.canUse) {
      return {
        provider: alternative,
        model: this.getModelForProvider(alternative, task),
        reason: `Fallback (${preferredProvider} ${quotaCheck.reason})`
      };
    }
  }

  // Step 4: Last resort - local Ollama
  return {
    provider: 'ollama',
    model: this.getOllamaModel(task),
    reason: `All cloud providers unavailable, using local Ollama`
  };
}
```

### Routing Rules

#### Task Type → Preferred Provider

| Task Type | Complexity | Preferred Provider | Reason |
|-----------|-----------|-------------------|--------|
| `code` | 1-5 | Ollama (qwen2.5-coder) | Local, fast, free |
| `code` | 6-7 | ChatGPT (GPT-4) | Good at code generation |
| `code` | 8-10 | Claude (Sonnet/Opus) | Complex reasoning |
| `reasoning` | 1-8 | Grok | Specialized in reasoning |
| `reasoning` | 9-10 | Claude Opus | Maximum reasoning power |
| `text`, `creative` | 1-5 | Ollama (qwen2.5) | Local, free |
| `text`, `creative` | 6-7 | Grok | Creative tasks |
| `text`, `creative` | 8-10 | Claude | Complex creative |
| `image`, `audio`, `video` | any | Gemini | Multimodal FREE tier |

#### Implementation (`src/integrations/router.ts` - 171 lines)

```typescript
private getPreferredProvider(task: Task): string {
  // User's explicit preference
  if (task.preferredProvider) {
    return task.preferredProvider;
  }

  // Task type based routing
  switch (task.type) {
    case 'image':
    case 'audio':
    case 'video':
      return 'gemini';  // Multimodal tasks

    case 'reasoning':
      if (task.complexity >= 9) {
        return 'claude';  // Complex reasoning
      }
      return 'grok';  // Moderate reasoning

    case 'code':
      if (task.complexity <= 5) {
        return 'ollama';  // Simple code (local, free)
      }
      if (task.complexity <= 7) {
        return 'chatgpt';  // Moderate code
      }
      return 'claude';  // Complex code

    case 'text':
    case 'creative':
      if (task.complexity <= 5) {
        return 'ollama';  // Simple text (local, free)
      }
      if (task.complexity <= 7) {
        return 'grok';  // Moderate creative
      }
      return 'claude';  // Complex creative

    default:
      return 'ollama';  // Default to local
  }
}
```

### Complexity Scale (1-10)

**Complexity Estimation** (Task Analyzer - Layer 4):

| Complexity | Characteristics | Example |
|-----------|----------------|---------|
| 1-2 | Ultra simple, factual | "What is 2+2?" |
| 3-5 | Simple logic, basic code | "Write a hello world function" |
| 6-7 | Moderate complexity | "Implement login form with validation" |
| 8-9 | Complex reasoning | "Design authentication architecture" |
| 10 | Maximum complexity | "Design distributed system with multi-region failover" |

---

## Layer 4: Skills Coordination

### Purpose

**Orchestrate multi-model task execution, decompose complex tasks, and synthesize results.**

### Components

1. **Task Analyzer**: Analyze user request, estimate complexity
2. **Task Decomposer**: Break complex tasks into subtasks
3. **Result Synthesizer**: Combine outputs from multiple models
4. **Multi-Agent Coordinator**: Coordinate parallel execution

### Example: Multi-Model Code Review

```typescript
async coordinateReview(code: string): Promise<{
  review: string;
  suggestions: string;
  tests: string;
}> {
  // Parallel execution with quota awareness
  const [reviewResult, suggestionsResult, testsResult] = await Promise.allSettled([
    // Task 1: Quick review (Ollama - local, fast, free)
    smartRouter.execute({
      type: 'code',
      complexity: 5,
      content: `Review this code for obvious issues:\n${code}`,
      preferredProvider: 'ollama'
    }),

    // Task 2: Deep security analysis (Claude - accurate, paid)
    smartRouter.execute({
      type: 'code',
      complexity: 9,
      content: `Perform deep security analysis:\n${code}`,
      preferredProvider: 'claude'
    }),

    // Task 3: Generate tests (ChatGPT - good at tests)
    smartRouter.execute({
      type: 'code',
      complexity: 7,
      content: `Generate comprehensive unit tests:\n${code}`,
      preferredProvider: 'chatgpt'
    })
  ]);

  // Synthesize results
  return {
    review: reviewResult.status === 'fulfilled' ? reviewResult.value : 'Review unavailable',
    suggestions: suggestionsResult.status === 'fulfilled' ? suggestionsResult.value : 'Suggestions unavailable',
    tests: testsResult.status === 'fulfilled' ? testsResult.value : 'Tests unavailable'
  };
}
```

---

## Layer 5: User Interface

### MCP Server Integration

**Protocol**: Model Context Protocol (MCP)
**Transport**: Stdio (standard input/output)
**Client**: Claude Code

**Server Definition** (`src/mcp-server/index.ts`):

```typescript
const server = new Server({
  name: '@smart-agents/mcp',
  version: '2.0.0',
}, {
  capabilities: {
    tools: {},  // 24 tools (12 dev + 4 content + 5 multimodal + 2 meta + 1 orchestrator)
  },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'code_review', description: '...', inputSchema: {...} },
    { name: 'smart_route', description: '...', inputSchema: {...} },
    // ... 22 more tools
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'code_review') {
    return await handleCodeReview(args);
  }
  // ... handle other tools
});
```

### Visual Output Format

**Example Output** (with cost tracking and quality score):

```
━━━ Smart Agents: Code Review ━━━
💰 $0.12 saved  ⚡ qwen2.5-coder:14b  ⏱️ 1.8s  📊 94/100
🔒 Security: 2 issues found

[Review results...]

💡 Tip: You saved $0.12 and ~30min with local AI
```

---

## Data Flow Patterns

### Pattern 1: Simple Task (Single Provider)

```
User Request
    ↓
[Layer 3] SmartRouter analyzes task
    ↓
[Layer 2] QuotaManager checks Ollama
    ↓ (quota OK)
[Layer 1] OllamaClient.generate()
    ↓
Response to user
```

**Flow Time**: ~2s (local inference)
**Cost**: $0

---

### Pattern 2: Failover Flow (Quota Exhausted)

```
User Request (complexity: 8, type: code)
    ↓
[Layer 3] SmartRouter → preferredProvider = 'claude'
    ↓
[Layer 2] QuotaManager.checkQuota('claude')
    ↓
❌ Daily limit reached (150/150)
    ↓
[Layer 2] getSuggestedAlternatives() → ['grok', 'chatgpt', 'ollama']
    ↓
[Layer 3] Try 'grok'
    ↓
[Layer 2] QuotaManager.checkQuota('grok')
    ↓
✅ Quota OK (78/100)
    ↓
[Layer 1] GrokClient.generateText()
    ↓
[Layer 2] QuotaManager.recordUsage('grok')
    ↓
Response to user
```

**Flow Time**: ~3s (cloud API + failover decision)
**Cost**: $0.003 (Grok pricing)

---

### Pattern 3: Multi-Model Orchestration

```
User Request: "Complete code review"
    ↓
[Layer 4] Decompose into 3 parallel tasks:
    ├─ Task 1: Quick review (complexity: 5)
    ├─ Task 2: Security analysis (complexity: 9)
    └─ Task 3: Generate tests (complexity: 7)
    ↓
[Layer 3] Route each task:
    ├─ Task 1 → Ollama (local, free)
    ├─ Task 2 → Claude (accurate)
    └─ Task 3 → ChatGPT (good at tests)
    ↓
[Layer 2] Check quotas for all 3 providers
    ↓
[Layer 1] Execute in parallel:
    ├─ OllamaClient.generate()      (2s)
    ├─ ClaudeClient.generate()      (4s)
    └─ ChatGPTClient.generateCode() (3s)
    ↓ (wait for all)
[Layer 4] Synthesize results
    ↓
Response to user
```

**Flow Time**: ~5s (parallel execution, limited by slowest)
**Total Cost**: $0 + $0.05 + $0.02 = $0.07
**vs Single Provider**: $0.15 (Claude only) → **53% savings**

---

## Failover Logic

### Three-Tier Failover Strategy

```
┌─────────────────────────────────────────────┐
│ Tier 1: Preferred Provider                  │
│ Based on task type + complexity             │
│                                             │
│ Code (8-10) → Claude                        │
│ Reasoning (6-8) → Grok                      │
│ Code Gen (6-7) → ChatGPT                    │
│ Multimodal → Gemini                         │
│ Simple → Ollama                             │
└──────────────┬──────────────────────────────┘
               │
               ↓ (quota exhausted)
┌─────────────────────────────────────────────┐
│ Tier 2: Suggested Alternatives              │
│ From QuotaManager.getSuggestedAlternatives()│
│                                             │
│ Iterate through available providers         │
│ Stop at first with available quota          │
└──────────────┬──────────────────────────────┘
               │
               ↓ (all cloud providers unavailable)
┌─────────────────────────────────────────────┐
│ Tier 3: Last Resort - Local Ollama          │
│ Always available, $0 cost, unlimited quota  │
│                                             │
│ Automatically select best Ollama model:     │
│ - qwen2.5-coder:14b (code)                  │
│ - qwen2.5:14b (text)                        │
│ - llama3.2:1b (ultra-fast simple)           │
└─────────────────────────────────────────────┘
```

### Failover Decision Matrix

| Scenario | Preferred | Tier 2 Tries | Final Provider | Reason |
|----------|-----------|-------------|----------------|--------|
| Claude quota OK | Claude | - | Claude | Normal flow |
| Claude exhausted, Grok OK | Claude | Grok | Grok | Tier 2 success |
| All cloud exhausted | Claude | Grok, ChatGPT, Gemini | Ollama | Tier 3 fallback |
| Provider unavailable (API error) | Claude | Suggested alternatives | First available | Error handling |

### Error Handling

**Network Errors**:
```typescript
try {
  result = await providerClient.generate(prompt);
} catch (error) {
  // Mark provider as unavailable for 60 seconds
  quotaManager.markUnavailable(provider, 60000);

  // Trigger failover
  return smartRouter.selectModel(task);  // Will try alternatives
}
```

**Timeout Handling**:
- Timeout: 60s per provider
- Auto-retry: 0 times (immediate failover)
- User notification: Show which provider was tried

---

## Performance Optimization

### Caching Strategy

**Not Implemented in v2.0** (planned for v2.1):
- Cache frequently used prompts
- Cache quota check results (TTL: 1s)
- Cache provider availability (TTL: 60s)

### Parallel Execution

**Multi-Model Tasks** (Layer 4):
- Use `Promise.allSettled()` for parallel calls
- No sequential dependency between subtasks
- Time = max(task1, task2, task3), not sum

**Example**:
```typescript
// Sequential (slow): 2s + 4s + 3s = 9s
await task1(); await task2(); await task3();

// Parallel (fast): max(2s, 4s, 3s) = 4s
await Promise.allSettled([task1(), task2(), task3()]);
```

### Token Optimization

**Cost Reduction Strategies**:
1. **Route simple tasks to local Ollama** (60% of tasks → $0)
2. **Use cheaper providers when sufficient** (Grok/ChatGPT < Claude)
3. **Batch similar tasks** (future feature)

**Estimated Savings**:
- v1.0 (Claude only): $50/month
- v2.0 (Multi-model): $30/month
- **Savings: 40%**

---

## Testing Strategy

### Unit Tests

**QuotaManager** (`src/quota/manager.test.ts` - 401 lines):
- 27 test cases
- Coverage: ≥80%
- Key scenarios:
  - Quota checking logic
  - Daily/monthly reset
  - Suggested alternatives
  - Persistent storage
  - Provider availability
  - Error handling

**Example Test**:
```typescript
it('should deny usage when daily limit reached', () => {
  // Exhaust daily limit
  for (let i = 0; i < 150; i++) {
    quotaManager.recordUsage('claude');
  }

  const result = quotaManager.checkQuota('claude');

  expect(result.canUse).toBe(false);
  expect(result.reason).toContain('Daily limit reached');
  expect(result.remainingDaily).toBe(0);
  expect(result.suggestedAlternatives).toBeDefined();
  expect(result.suggestedAlternatives?.length).toBeGreaterThan(0);
});
```

### Integration Tests

**Multi-Provider Flow** (`tests/integration/router.test.ts` - 507 lines):
- 6 test suites
- Coverage: Full failover logic
- Key scenarios:
  - Normal routing (quota OK)
  - Tier 2 failover (quota exhausted)
  - Tier 3 fallback (all cloud unavailable)
  - Multi-model orchestration
  - Error handling
  - Performance benchmarks

### E2E Tests

**Planned for v2.1**:
- Real API calls (with test quotas)
- Complete user flow simulation
- Performance validation

---

## Configuration

### Environment Variables

**Provider API Keys** (`.env`):
```bash
# Ollama (local, no key needed)
OLLAMA_BASE_URL=http://localhost:11434

# Gemini (Google AI Studio)
GOOGLE_API_KEY=your_google_ai_studio_api_key

# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# Grok (xAI)
GROK_API_KEY=xai-xxxxx
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1

# ChatGPT (OpenAI)
OPENAI_API_KEY=sk-xxxxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_CODE_MODEL=gpt-4-turbo-preview
```

**Quota Limits** (`.env`):
```bash
# Daily/Monthly limits per provider
GROK_DAILY_LIMIT=100
GROK_MONTHLY_LIMIT=3000

CHATGPT_DAILY_LIMIT=200
CHATGPT_MONTHLY_LIMIT=6000

CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500

GEMINI_DAILY_LIMIT=10000
GEMINI_MONTHLY_LIMIT=300000

OLLAMA_DAILY_LIMIT=999999
OLLAMA_MONTHLY_LIMIT=999999
```

**Routing Preferences** (`.env`):
```bash
DEFAULT_TEXT_PROVIDER=ollama
DEFAULT_CODE_PROVIDER=ollama
DEFAULT_MULTIMODAL_PROVIDER=gemini
DEFAULT_REASONING_PROVIDER=claude
FALLBACK_PROVIDER=ollama
```

### Runtime Configuration

**Zod Schema Validation** (`src/config/index.ts`):
```typescript
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  // ... all env vars with validation
});

export const env = envSchema.parse(process.env);
```

---

## Deployment Considerations

### Installation

```bash
# Install Smart Agents MCP Server
npm install -g @smart-agents/mcp

# Install Ollama (local models)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5-coder:14b
ollama pull qwen2.5:14b
ollama pull llama3.2:1b

# Configure Claude Code
claude mcp add @smart-agents/mcp
```

### System Requirements

- **OS**: macOS, Linux, Windows
- **Node.js**: ≥18.0.0
- **RAM**: ≥8GB (for Ollama models)
- **Disk**: ≥30GB (for Ollama models)
- **Network**: Internet for cloud providers

### Monitoring

**Metrics to Track**:
- Quota usage per provider (daily/monthly)
- Failover rate
- Average response time
- Cost per task
- User satisfaction (quality score)

**Analytics Dashboard** (planned for v2.1):
```
━━━ Smart Agents Analytics (Today) ━━━

📊 Provider Usage:
Ollama: 142 requests (60%)
Gemini: 45 requests (19%)
Grok: 28 requests (12%)
ChatGPT: 15 requests (6%)
Claude: 8 requests (3%)

🔀 Smart Routing:
- Total requests: 238
- Fallback rate: 12%
- Quota hit rate: 3%

💰 Cost Savings:
- Total saved: $12.50
- vs Claude only: $18.75
- vs ChatGPT only: $15.30

━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Future Enhancements

### v2.1 (Planned - 3 months)

- [ ] Response caching
- [ ] Batch request optimization
- [ ] Analytics dashboard
- [ ] E2E test suite
- [ ] Performance benchmarks

### v2.2 (Planned - 6 months)

- [ ] Custom provider plugins
- [ ] Advanced cost prediction
- [ ] A/B testing framework
- [ ] Self-learning routing (ML-based)

---

## References

### Related Documentation

- [README.md](./README.md) - User-facing documentation
- [API.md](./API.md) - API reference for all clients
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Upgrade path from v1.0
- [TESTING.md](./TESTING.md) - Testing guidelines
- [CHANGELOG.md](./CHANGELOG.md) - Version history

### External Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [Claude API Documentation](https://docs.anthropic.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [xAI Grok API](https://docs.x.ai)
- [Google Generative AI](https://ai.google.dev/docs)
- [Ollama Documentation](https://ollama.ai/docs)

---

**Document Version**: 2.0.0
**Last Updated**: 2025-12-25
**Next Review**: 2026-01-25 (monthly updates)
