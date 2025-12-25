# Smart Agents MCP Server - API Reference

**Version**: 2.0.0
**Last Updated**: 2025-12-25
**Author**: Smart Agents Team

---

## Table of Contents

1. [Overview](#overview)
2. [GrokClient API](#grokclient-api)
3. [ChatGPTClient API](#chatgptclient-api)
4. [QuotaManager API](#quotamanager-api)
5. [SmartRouter API](#smartrouter-api)
6. [Type Definitions](#type-definitions)
7. [Error Handling](#error-handling)
8. [Configuration](#configuration)

---

## Overview

Smart Agents MCP Server provides a unified interface for integrating multiple AI providers with intelligent quota-aware routing. This API reference covers the four core components added in v2.0:

- **GrokClient**: xAI Grok API integration for reasoning tasks
- **ChatGPTClient**: OpenAI ChatGPT integration for code generation
- **QuotaManager**: Real-time quota tracking and management
- **SmartRouter**: Intelligent model selection with failover

---

## GrokClient API

**File**: `src/integrations/grok/client.ts` (161 lines)
**Purpose**: Integration with xAI's Grok API for reasoning and text generation tasks
**Provider**: xAI (https://x.ai)

### Constructor

```typescript
new GrokClient(config: GrokConfig)
```

**Parameters**:
- `config.apiKey` (string, required): xAI API key
- `config.baseURL` (string, optional): API endpoint (default: `'https://api.x.ai/v1'`)
- `config.model` (string, optional): Model name (default: `'grok-beta'`)
- `config.timeout` (number, optional): Request timeout in ms (default: `60000`)

**Example**:
```typescript
import { GrokClient } from './integrations/grok/client.js';

const client = new GrokClient({
  apiKey: process.env.GROK_API_KEY!,
  model: 'grok-beta',
  timeout: 60000
});
```

---

### Methods

#### `generateText()`

Generate text completion from a single prompt.

**Signature**:
```typescript
async generateText(
  prompt: string,
  options?: {
    temperature?: number;    // 0.0-1.0, default: 0.7
    maxTokens?: number;      // Max tokens in response, default: 2048
    systemPrompt?: string;   // System instruction
  }
): Promise<string>
```

**Parameters**:
- `prompt` (string): User prompt
- `options.temperature` (number, optional): Controls randomness (0.0 = deterministic, 1.0 = creative)
- `options.maxTokens` (number, optional): Maximum tokens in response
- `options.systemPrompt` (string, optional): System-level instruction

**Returns**: Promise resolving to generated text string

**Example**:
```typescript
const response = await client.generateText(
  'Explain quantum computing in simple terms',
  {
    temperature: 0.3,
    maxTokens: 500,
    systemPrompt: 'You are a helpful science educator.'
  }
);
console.log(response);
```

---

#### `chat()`

Multi-turn conversation with Grok.

**Signature**:
```typescript
async chat(
  messages: GrokMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}>
```

**Parameters**:
- `messages` (GrokMessage[]): Array of conversation messages
  - Each message has `role: 'system' | 'user' | 'assistant'` and `content: string`
- `options.temperature` (number, optional): Controls randomness
- `options.maxTokens` (number, optional): Maximum tokens in response

**Returns**: Promise resolving to object with:
- `response` (string): Assistant's reply
- `usage` (object): Token usage statistics

**Example**:
```typescript
const result = await client.chat([
  { role: 'system', content: 'You are a coding assistant.' },
  { role: 'user', content: 'How do I reverse a string in Python?' },
  { role: 'assistant', content: 'You can use slicing: `s[::-1]`' },
  { role: 'user', content: 'Can you show a full example?' }
], {
  temperature: 0.2,
  maxTokens: 1000
});

console.log(result.response);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

---

#### `reason()`

Specialized reasoning method for step-by-step problem solving (Grok's specialty).

**Signature**:
```typescript
async reason(
  problem: string,
  context?: string
): Promise<{
  reasoning: string;
  conclusion: string;
}>
```

**Parameters**:
- `problem` (string): Problem or question requiring reasoning
- `context` (string, optional): Additional context or constraints

**Returns**: Promise resolving to object with:
- `reasoning` (string): Step-by-step reasoning process
- `conclusion` (string): Final conclusion or answer

**Example**:
```typescript
const analysis = await client.reason(
  'Should we use microservices or monolith for a startup with 3 engineers?',
  'Budget: $50k/year, Expected users: 10k in year 1'
);

console.log('Reasoning:', analysis.reasoning);
console.log('Conclusion:', analysis.conclusion);
```

---

#### `getModelInfo()`

Get current model configuration.

**Signature**:
```typescript
getModelInfo(): { provider: string; model: string }
```

**Returns**: Object with:
- `provider` (string): Always `'grok'`
- `model` (string): Current model name

**Example**:
```typescript
const info = client.getModelInfo();
console.log(`Using ${info.provider} - ${info.model}`);
// Output: "Using grok - grok-beta"
```

---

## ChatGPTClient API

**File**: `src/integrations/chatgpt/client.ts` (146 lines)
**Purpose**: Integration with OpenAI's ChatGPT API for code generation and chat
**Provider**: OpenAI (https://platform.openai.com)

### Constructor

```typescript
new ChatGPTClient(config: ChatGPTConfig)
```

**Parameters**:
- `config.apiKey` (string, required): OpenAI API key
- `config.model` (string, optional): Model name (default: `'gpt-4-turbo-preview'`)
- `config.organization` (string, optional): OpenAI organization ID
- `config.timeout` (number, optional): Request timeout in ms (default: `60000`)

**Example**:
```typescript
import { ChatGPTClient } from './integrations/chatgpt/client.js';

const client = new ChatGPTClient({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  organization: process.env.OPENAI_ORG_ID // optional
});
```

---

### Methods

#### `generateText()`

Generate text completion from a single prompt.

**Signature**:
```typescript
async generateText(
  prompt: string,
  options?: {
    temperature?: number;    // 0.0-2.0, default: 0.7
    maxTokens?: number;      // Max tokens, default: 2048
    systemPrompt?: string;   // System instruction
  }
): Promise<string>
```

**Parameters**: Same as GrokClient.generateText()

**Returns**: Promise resolving to generated text string

**Example**:
```typescript
const code = await client.generateText(
  'Write a Python function to calculate Fibonacci numbers',
  {
    temperature: 0.2,  // Low temperature for code
    maxTokens: 500,
    systemPrompt: 'You are an expert Python developer.'
  }
);
console.log(code);
```

---

#### `chat()`

Multi-turn conversation with ChatGPT.

**Signature**:
```typescript
async chat(
  messages: ChatGPTMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}>
```

**Parameters**: Same structure as GrokClient.chat()

**Returns**: Same structure as GrokClient.chat()

**Example**:
```typescript
const result = await client.chat([
  { role: 'system', content: 'You are a helpful coding assistant.' },
  { role: 'user', content: 'Explain async/await in JavaScript' }
], {
  temperature: 0.3,
  maxTokens: 1000
});

console.log(result.response);
```

---

#### `generateCode()`

Specialized method for code generation (ChatGPT's specialty).

**Signature**:
```typescript
async generateCode(
  task: string,
  language: string,
  context?: string
): Promise<{
  code: string;
  explanation: string;
}>
```

**Parameters**:
- `task` (string): Code generation task description
- `language` (string): Target programming language
- `context` (string, optional): Additional context or requirements

**Returns**: Promise resolving to object with:
- `code` (string): Generated code
- `explanation` (string): Explanation of the code

**Example**:
```typescript
const result = await client.generateCode(
  'Create a REST API endpoint for user authentication',
  'typescript',
  'Using Express.js and JWT tokens'
);

console.log('Generated Code:\n', result.code);
console.log('\nExplanation:\n', result.explanation);
```

---

#### `getModelInfo()`

Get current model configuration.

**Signature**:
```typescript
getModelInfo(): { provider: string; model: string }
```

**Returns**: Object with:
- `provider` (string): Always `'chatgpt'`
- `model` (string): Current model name

**Example**:
```typescript
const info = client.getModelInfo();
console.log(`Using ${info.provider} - ${info.model}`);
// Output: "Using chatgpt - gpt-4-turbo-preview"
```

---

## QuotaManager API

**File**: `src/quota/manager.ts` (247 lines)
**Purpose**: Real-time quota tracking and failover management across all providers
**Key Feature**: Enables three-tier failover logic

### Constructor

```typescript
new QuotaManager(providers: Map<string, QuotaLimits>)
```

**Parameters**:
- `providers` (Map<string, QuotaLimits>): Provider quota configurations
  - Key: Provider name (e.g., `'grok'`, `'chatgpt'`, `'claude'`)
  - Value: `QuotaLimits` object with `daily`, `monthly`, `tokens` limits

**Example**:
```typescript
import { QuotaManager } from './quota/manager.js';
import { appConfig } from './config/index.js';

const quotaManager = new QuotaManager(
  new Map([
    ['grok', appConfig.quotaLimits.grok],
    ['chatgpt', appConfig.quotaLimits.chatgpt],
    ['claude', appConfig.quotaLimits.claude],
    ['gemini', appConfig.quotaLimits.gemini],
    ['ollama', appConfig.quotaLimits.ollama]
  ])
);
```

---

### Methods

#### `checkQuota()`

Check if a provider can be used (has available quota).

**Signature**:
```typescript
checkQuota(provider: string): QuotaCheckResult
```

**Parameters**:
- `provider` (string): Provider name to check

**Returns**: `QuotaCheckResult` object with:
- `canUse` (boolean): Whether provider can be used
- `reason` (string, optional): Reason if cannot use
- `remainingDaily` (number, optional): Remaining daily requests
- `remainingMonthly` (number, optional): Remaining monthly requests
- `suggestedAlternatives` (string[], optional): Alternative providers with available quota

**Example**:
```typescript
const check = quotaManager.checkQuota('grok');

if (check.canUse) {
  console.log(`Grok available. Remaining: ${check.remainingDaily} daily, ${check.remainingMonthly} monthly`);
  // Proceed with Grok
} else {
  console.warn(`Grok unavailable: ${check.reason}`);
  console.log(`Alternatives: ${check.suggestedAlternatives?.join(', ')}`);
  // Use suggested alternative
}
```

---

#### `recordUsage()`

Record API usage after a request.

**Signature**:
```typescript
recordUsage(provider: string, tokens?: number): void
```

**Parameters**:
- `provider` (string): Provider name
- `tokens` (number, optional): Number of tokens used

**Returns**: void

**Side Effects**:
- Increments daily and monthly counters
- Updates token usage (if provided)
- Persists data to storage (localStorage/file system)

**Example**:
```typescript
// After successful API call
quotaManager.recordUsage('grok', 1250);

// Or without token count
quotaManager.recordUsage('chatgpt');
```

---

#### `getAvailableProviders()`

Get list of all providers with available quota.

**Signature**:
```typescript
getAvailableProviders(): string[]
```

**Returns**: Array of provider names that can currently be used

**Example**:
```typescript
const available = quotaManager.getAvailableProviders();
console.log(`Available providers: ${available.join(', ')}`);
// Output: "Available providers: ollama, gemini, chatgpt"

if (available.length === 0) {
  console.error('All providers exhausted!');
}
```

---

#### `markUnavailable()`

Manually mark a provider as unavailable (e.g., due to API errors).

**Signature**:
```typescript
markUnavailable(provider: string, durationMs: number = 60000): void
```

**Parameters**:
- `provider` (string): Provider name to mark unavailable
- `durationMs` (number, optional): Duration in milliseconds (default: 60000 = 1 minute)

**Returns**: void

**Side Effects**:
- Sets `provider.available = false`
- Automatically restores after `durationMs`

**Example**:
```typescript
try {
  await grokClient.generateText(prompt);
} catch (error) {
  if (error.status === 503) {
    // Mark Grok unavailable for 5 minutes
    quotaManager.markUnavailable('grok', 5 * 60 * 1000);
    console.log('Grok temporarily unavailable, using alternative...');
  }
}
```

---

#### `getUsageStats()`

Get detailed usage statistics for all providers.

**Signature**:
```typescript
getUsageStats(): Record<string, ProviderQuota>
```

**Returns**: Object mapping provider names to `ProviderQuota` objects containing:
- `provider` (string): Provider name
- `limits` (QuotaLimits): Configured limits
- `usage` (object): Current usage with `daily`, `monthly`, `tokens`, `lastReset`
- `available` (boolean): Whether provider is currently available

**Example**:
```typescript
const stats = quotaManager.getUsageStats();

for (const [provider, quota] of Object.entries(stats)) {
  console.log(`\n${provider}:`);
  console.log(`  Daily: ${quota.usage.daily}/${quota.limits.daily}`);
  console.log(`  Monthly: ${quota.usage.monthly}/${quota.limits.monthly}`);
  console.log(`  Available: ${quota.available ? 'Yes' : 'No'}`);
}

// Output:
// grok:
//   Daily: 45/100
//   Monthly: 1234/3000
//   Available: Yes
// chatgpt:
//   Daily: 200/200
//   Monthly: 5432/6000
//   Available: No (daily limit reached)
```

---

## SmartRouter API

**File**: `src/integrations/router.ts` (171 lines)
**Purpose**: Intelligent model selection with quota-aware failover logic
**Key Feature**: Three-tier failover (preferred → alternatives → local Ollama)

### Constructor

```typescript
new SmartRouter(quotaManager: QuotaManager)
```

**Parameters**:
- `quotaManager` (QuotaManager): QuotaManager instance for quota checking

**Example**:
```typescript
import { SmartRouter } from './integrations/router.js';
import { QuotaManager } from './quota/manager.js';

const quotaManager = new QuotaManager(providersMap);
const router = new SmartRouter(quotaManager);
```

---

### Methods

#### `selectModel()`

Select optimal model based on task characteristics and quota availability.

**Signature**:
```typescript
selectModel(task: Task): ModelSelection
```

**Parameters**:
- `task` (Task): Task object with:
  - `type` (string): Task type (`'code'`, `'text'`, `'image'`, `'audio'`, `'video'`, `'reasoning'`, `'creative'`)
  - `complexity` (number): Complexity level (1-10)
  - `content` (string): Task content
  - `preferredProvider` (string, optional): User's preferred provider

**Returns**: `ModelSelection` object with:
- `provider` (string): Selected provider name
- `model` (string): Selected model name
- `reason` (string): Selection reasoning
- `fallback` (ModelSelection, optional): Fallback selection if preferred unavailable

**Routing Logic**:
```
Step 1: Determine preferred provider based on task.type and task.complexity
Step 2: Check if preferred provider has available quota
  → If YES: Use preferred provider
  → If NO: Proceed to Step 3
Step 3: Try suggested alternatives from QuotaManager
  → If any alternative available: Use it
  → If all unavailable: Proceed to Step 4
Step 4: Last resort - use local Ollama (always available, $0 cost)
```

**Example**:
```typescript
const task: Task = {
  type: 'code',
  complexity: 8,
  content: 'Implement a binary search tree in TypeScript',
  preferredProvider: 'chatgpt'  // Optional
};

const selection = router.selectModel(task);

console.log(`Selected: ${selection.provider} - ${selection.model}`);
console.log(`Reason: ${selection.reason}`);

if (selection.fallback) {
  console.log(`Fallback: ${selection.fallback.provider} - ${selection.fallback.model}`);
}

// Possible Output:
// Selected: chatgpt - gpt-4-turbo-preview
// Reason: Optimal match for code task (complexity: 8)
```

**Routing Rules by Task Type**:

| Task Type | Complexity | Preferred Provider |
|-----------|------------|-------------------|
| `code` | 1-5 | Ollama (qwen2.5-coder:14b) |
| `code` | 6-7 | ChatGPT (gpt-4-turbo-preview) |
| `code` | 8-10 | Claude (sonnet/opus) |
| `reasoning` | 1-8 | Grok (grok-beta) |
| `reasoning` | 9-10 | Claude (opus) |
| `text`, `creative` | 1-5 | Ollama (qwen2.5:14b) |
| `text`, `creative` | 6-7 | Grok (grok-beta) |
| `text`, `creative` | 8-10 | Claude (sonnet/opus) |
| `image`, `audio`, `video` | any | Gemini (gemini-2.5-flash) |

---

#### `getAvailableProviders()`

Get list of providers with available quota (delegates to QuotaManager).

**Signature**:
```typescript
getAvailableProviders(): string[]
```

**Returns**: Array of available provider names

**Example**:
```typescript
const available = router.getAvailableProviders();
console.log(`Available: ${available.join(', ')}`);
```

---

#### `getUsageStats()`

Get usage statistics for all providers (delegates to QuotaManager).

**Signature**:
```typescript
getUsageStats(): Record<string, ProviderQuota>
```

**Returns**: Provider usage statistics

**Example**:
```typescript
const stats = router.getUsageStats();
console.log(JSON.stringify(stats, null, 2));
```

---

## Type Definitions

### GrokMessage

```typescript
interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### ChatGPTMessage

```typescript
interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### QuotaLimits

```typescript
interface QuotaLimits {
  daily?: number;      // Daily request limit
  monthly?: number;    // Monthly request limit
  tokens?: number;     // Token limit (if applicable)
}
```

### ProviderQuota

```typescript
interface ProviderQuota {
  provider: string;
  limits: QuotaLimits;
  usage: {
    daily: number;
    monthly: number;
    tokens: number;
    lastReset: Date;
  };
  available: boolean;  // Is provider currently available?
}
```

### QuotaCheckResult

```typescript
interface QuotaCheckResult {
  canUse: boolean;
  reason?: string;
  remainingDaily?: number;
  remainingMonthly?: number;
  suggestedAlternatives?: string[];
}
```

### Task

```typescript
interface Task {
  type: 'code' | 'text' | 'image' | 'audio' | 'video' | 'reasoning' | 'creative';
  complexity: number;  // 1-10
  content: string;
  preferredProvider?: string;
}
```

### ModelSelection

```typescript
interface ModelSelection {
  provider: string;
  model: string;
  reason: string;
  fallback?: ModelSelection;
}
```

---

## Error Handling

### Common Errors

#### GrokClient / ChatGPTClient Errors

**API Key Invalid**:
```typescript
try {
  await client.generateText(prompt);
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  }
}
```

**Rate Limit Exceeded**:
```typescript
try {
  await client.chat(messages);
} catch (error) {
  if (error.status === 429) {
    console.error('Rate limit exceeded');
    quotaManager.markUnavailable(provider, 60000);
  }
}
```

**Network Timeout**:
```typescript
try {
  await client.generateText(prompt);
} catch (error) {
  if (error.code === 'ETIMEDOUT') {
    console.error('Request timeout');
    // Retry or use alternative provider
  }
}
```

#### QuotaManager Errors

**Provider Not Configured**:
```typescript
const check = quotaManager.checkQuota('unknown-provider');
if (!check.canUse) {
  console.error(check.reason);
  // Output: "Provider unknown-provider not configured"
}
```

**Quota Exhausted**:
```typescript
const check = quotaManager.checkQuota('chatgpt');
if (!check.canUse && check.reason?.includes('limit reached')) {
  console.warn('Quota exhausted, using alternatives...');
  const alternatives = check.suggestedAlternatives || [];
  // Try alternatives
}
```

### Error Handling Best Practices

**1. Always Use Try-Catch with Async Operations**:
```typescript
try {
  const response = await grokClient.generateText(prompt);
  quotaManager.recordUsage('grok');
  return response;
} catch (error) {
  console.error('Grok request failed:', error);
  quotaManager.markUnavailable('grok', 60000);
  // Fallback to alternative
  return router.selectModel(task);
}
```

**2. Check Quota Before Making Requests**:
```typescript
const check = quotaManager.checkQuota('chatgpt');
if (!check.canUse) {
  console.warn(`ChatGPT unavailable: ${check.reason}`);
  const alternative = router.selectModel(task);
  // Use alternative provider
}
```

**3. Record Usage After Successful Requests**:
```typescript
const result = await chatgptClient.chat(messages);
quotaManager.recordUsage('chatgpt', result.usage.totalTokens);
```

---

## Configuration

### Environment Variables

All configuration is loaded from `.env` file using `src/config/index.ts`.

**Required Variables**:
```bash
# Grok API
GROK_API_KEY=xai-xxxxx
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1

# ChatGPT API
OPENAI_API_KEY=sk-xxxxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_CODE_MODEL=gpt-4-turbo-preview

# Quota Limits
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

# Routing Preferences
DEFAULT_TEXT_PROVIDER=ollama
DEFAULT_CODE_PROVIDER=ollama
DEFAULT_MULTIMODAL_PROVIDER=gemini
DEFAULT_REASONING_PROVIDER=claude
FALLBACK_PROVIDER=ollama
```

### Accessing Configuration

```typescript
import { appConfig } from './config/index.js';

// Grok configuration
console.log(appConfig.grok.apiKey);
console.log(appConfig.grok.model);

// Quota limits
console.log(appConfig.quotaLimits.grok.daily);
console.log(appConfig.quotaLimits.chatgpt.monthly);

// Routing preferences
console.log(appConfig.routing.defaultProviders.text);
console.log(appConfig.routing.fallback);
```

---

## Complete Usage Example

```typescript
import { GrokClient } from './integrations/grok/client.js';
import { ChatGPTClient } from './integrations/chatgpt/client.js';
import { QuotaManager } from './quota/manager.js';
import { SmartRouter } from './integrations/router.js';
import { appConfig } from './config/index.js';

// 1. Initialize clients
const grokClient = new GrokClient({
  apiKey: appConfig.grok.apiKey,
  model: appConfig.grok.model
});

const chatgptClient = new ChatGPTClient({
  apiKey: appConfig.openai.apiKey,
  model: appConfig.openai.chat.model
});

// 2. Initialize quota manager
const quotaManager = new QuotaManager(
  new Map([
    ['grok', appConfig.quotaLimits.grok],
    ['chatgpt', appConfig.quotaLimits.chatgpt],
    ['claude', appConfig.quotaLimits.claude],
    ['gemini', appConfig.quotaLimits.gemini],
    ['ollama', appConfig.quotaLimits.ollama]
  ])
);

// 3. Initialize smart router
const router = new SmartRouter(quotaManager);

// 4. Execute task with intelligent routing
async function executeTask(task: Task) {
  // Step 1: Select optimal model
  const selection = router.selectModel(task);
  console.log(`Selected: ${selection.provider} - ${selection.model}`);

  // Step 2: Check quota
  const check = quotaManager.checkQuota(selection.provider);
  if (!check.canUse) {
    console.warn(`Provider unavailable: ${check.reason}`);
    // Use fallback or alternative
    return;
  }

  // Step 3: Execute with selected provider
  try {
    let response: string;

    if (selection.provider === 'grok') {
      response = await grokClient.generateText(task.content);
    } else if (selection.provider === 'chatgpt') {
      response = await chatgptClient.generateText(task.content);
    } else {
      throw new Error(`Unsupported provider: ${selection.provider}`);
    }

    // Step 4: Record usage
    quotaManager.recordUsage(selection.provider);

    return response;
  } catch (error) {
    console.error(`Request failed:`, error);
    quotaManager.markUnavailable(selection.provider, 60000);
    throw error;
  }
}

// 5. Use the system
const task: Task = {
  type: 'code',
  complexity: 7,
  content: 'Write a TypeScript function to validate email addresses'
};

const result = await executeTask(task);
console.log(result);

// 6. View usage stats
const stats = quotaManager.getUsageStats();
console.log('\nUsage Stats:', stats);
```

---

## Version History

- **v2.0.0** (2025-12-25): Added GrokClient, ChatGPTClient, QuotaManager, enhanced SmartRouter
- **v1.0.0** (2025-02-01): Initial release with Ollama and Gemini integration

---

**For full architectural details, see [ARCHITECTURE.md](./ARCHITECTURE.md).**
**For migration guide from v1.0, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).**
