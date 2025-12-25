# Migration Guide: v1.0 → v2.0

**Smart Agents MCP Server - Multi-Model Integration Upgrade**

This guide helps you migrate from Smart Agents v1.0 (Ollama + Gemini only) to v2.0 (5-provider multi-model integration with quota management).

---

## 📊 Version Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| **Providers** | Ollama + Gemini (2) | Ollama + Gemini + Claude + Grok + ChatGPT (5) |
| **Quota Management** | None | Daily/Monthly limits with auto-reset |
| **Smart Routing** | Basic (task type only) | Advanced (task type + complexity + quota) |
| **Failover** | Manual fallback | Three-tier automatic failover |
| **Cost Optimization** | ~20% savings | ~40% savings (target) |
| **Tools Count** | 21 tools | 24 tools (21 + 3 new) |
| **Configuration** | 2 API keys | 5 API keys + 15+ quota variables |
| **Architecture** | 3 layers | 5 layers (Skills Coordination + Quota Manager) |

---

## 🚨 Breaking Changes

### 1. Environment Variables

**REQUIRED NEW VARIABLES**:
```bash
# NEW: Grok API (xAI)
GROK_API_KEY=xai-xxxxx
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1

# NEW: ChatGPT chat/code models
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_CODE_MODEL=gpt-4-turbo-preview

# NEW: Quota limits (15 new variables)
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

# NEW: Routing preferences
DEFAULT_TEXT_PROVIDER=ollama
DEFAULT_CODE_PROVIDER=ollama
DEFAULT_MULTIMODAL_PROVIDER=gemini
DEFAULT_REASONING_PROVIDER=claude
FALLBACK_PROVIDER=ollama
```

### 2. API Changes

**SmartRouter Constructor** (BREAKING):
```typescript
// v1.0 (OLD)
const router = new SmartRouter();

// v2.0 (NEW) - requires QuotaManager dependency
const quotaManager = new QuotaManager(providersMap);
const router = new SmartRouter(quotaManager);
```

**selectModel() Return Type** (ENHANCED):
```typescript
// v1.0 (OLD)
interface ModelSelection {
  provider: string;
  model: string;
  reason: string;
}

// v2.0 (NEW) - adds fallback field
interface ModelSelection {
  provider: string;
  model: string;
  reason: string;
  fallback?: ModelSelection;  // NEW: fallback provider if primary fails
}
```

### 3. Task Interface (EXTENDED)

```typescript
// v1.0 (OLD)
interface Task {
  type: 'code' | 'text' | 'image' | 'audio' | 'video';
  complexity: number;  // 1-10
  content: string;
}

// v2.0 (NEW) - adds reasoning and creative types, preferredProvider
interface Task {
  type: 'code' | 'text' | 'image' | 'audio' | 'video' | 'reasoning' | 'creative';  // NEW: reasoning, creative
  complexity: number;  // 1-10
  content: string;
  preferredProvider?: string;  // NEW: optional provider override
}
```

### 4. Configuration Access (ENHANCED)

```typescript
// v1.0 (OLD)
import { appConfig } from './config/index.js';

appConfig.claude.apiKey
appConfig.gemini.apiKey
appConfig.chroma.url

// v2.0 (NEW) - adds grok, quota limits, routing preferences
import { appConfig } from './config/index.js';

appConfig.claude.apiKey
appConfig.gemini.apiKey
appConfig.grok.apiKey           // NEW
appConfig.openai.chat.model     // NEW
appConfig.openai.code.model     // NEW
appConfig.quotaLimits.grok      // NEW
appConfig.quotaLimits.chatgpt   // NEW
appConfig.quotaLimits.claude    // NEW
appConfig.routing.defaultProviders  // NEW
appConfig.routing.fallback      // NEW
```

---

## 📝 Environment Variable Migration

### Step 1: Copy Your Existing .env

```bash
# Backup your current .env
cp .env .env.v1.backup

# Copy new template
cp .env.example .env
```

### Step 2: Migration Mapping

| v1.0 Variable | v2.0 Variable | Migration Action |
|---------------|---------------|------------------|
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | ✅ Keep as-is |
| `CLAUDE_MODEL` | `CLAUDE_MODEL` | ✅ Keep as-is |
| `CLAUDE_OPUS_MODEL` | `CLAUDE_OPUS_MODEL` | ✅ Keep as-is |
| `GOOGLE_API_KEY` | `GOOGLE_API_KEY` | ✅ Keep as-is |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | ✅ Keep as-is |
| `OPENAI_WHISPER_MODEL` | `OPENAI_WHISPER_MODEL` | ✅ Keep as-is |
| `OPENAI_TTS_MODEL` | `OPENAI_TTS_MODEL` | ✅ Keep as-is |
| `OPENAI_EMBEDDING_MODEL` | `OPENAI_EMBEDDING_MODEL` | ✅ Keep as-is |
| N/A | `GROK_API_KEY` | ➕ **ADD NEW** (required) |
| N/A | `OPENAI_CHAT_MODEL` | ➕ **ADD NEW** (required) |
| N/A | `OPENAI_CODE_MODEL` | ➕ **ADD NEW** (required) |
| N/A | `GROK_DAILY_LIMIT` | ➕ ADD NEW (optional, defaults provided) |
| N/A | `CHATGPT_DAILY_LIMIT` | ➕ ADD NEW (optional) |
| N/A | `CLAUDE_DAILY_LIMIT` | ➕ ADD NEW (optional) |
| N/A | `DEFAULT_TEXT_PROVIDER` | ➕ ADD NEW (optional) |
| N/A | `FALLBACK_PROVIDER` | ➕ ADD NEW (optional) |

### Step 3: Required API Keys

**YOU MUST OBTAIN**:
```bash
# 1. xAI / Grok API Key
# Get from: https://x.ai/api
GROK_API_KEY=xai-xxxxx

# 2. Existing keys remain the same
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx  # Keep existing
OPENAI_API_KEY=sk-xxxxx                # Keep existing
GOOGLE_API_KEY=xxxxx                   # Keep existing
```

### Step 4: Quota Configuration (Optional)

**Default Values** (if you don't set these, defaults will be used):
```bash
# Conservative defaults for free/low-tier users
GROK_DAILY_LIMIT=100
GROK_MONTHLY_LIMIT=3000
CHATGPT_DAILY_LIMIT=200
CHATGPT_MONTHLY_LIMIT=6000
CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500
GEMINI_DAILY_LIMIT=10000      # FREE tier
GEMINI_MONTHLY_LIMIT=300000   # FREE tier
OLLAMA_DAILY_LIMIT=999999     # Local, unlimited
OLLAMA_MONTHLY_LIMIT=999999   # Local, unlimited
```

**Custom Values** (if you have higher-tier subscriptions):
```bash
# Example: ChatGPT Plus user
CHATGPT_DAILY_LIMIT=500
CHATGPT_MONTHLY_LIMIT=15000

# Example: Claude Pro user
CLAUDE_DAILY_LIMIT=300
CLAUDE_MONTHLY_LIMIT=9000
```

---

## 💻 Code Migration Examples

### Example 1: Basic Task Execution

**v1.0 Code**:
```typescript
import { SmartRouter } from './integrations/router.js';
import { OllamaClient } from './integrations/ollama/client.js';
import { GeminiClient } from './integrations/gemini/client.js';

const ollamaClient = new OllamaClient();
const geminiClient = new GeminiClient(apiKey);
const router = new SmartRouter();

const selection = router.selectModel({
  type: 'code',
  complexity: 7,
  content: 'Review this TypeScript function'
});

// Manual client selection
let response;
if (selection.provider === 'ollama') {
  response = await ollamaClient.generate(task.content, selection.model);
} else if (selection.provider === 'gemini') {
  response = await geminiClient.generateText(task.content);
}
```

**v2.0 Code** (MIGRATED):
```typescript
import { SmartRouter } from './integrations/router.js';
import { QuotaManager } from './quota/manager.js';
import { OllamaClient } from './integrations/ollama/client.js';
import { GeminiClient } from './integrations/gemini/client.js';
import { GrokClient } from './integrations/grok/client.js';           // NEW
import { ChatGPTClient } from './integrations/chatgpt/client.js';   // NEW
import { appConfig } from './config/index.js';

// NEW: Initialize QuotaManager
const quotaManager = new QuotaManager(new Map([
  ['grok', appConfig.quotaLimits.grok],
  ['chatgpt', appConfig.quotaLimits.chatgpt],
  ['claude', appConfig.quotaLimits.claude],
  ['gemini', appConfig.quotaLimits.gemini],
  ['ollama', appConfig.quotaLimits.ollama],
]));

// NEW: SmartRouter requires QuotaManager
const router = new SmartRouter(quotaManager);

// Initialize all clients
const ollamaClient = new OllamaClient();
const geminiClient = new GeminiClient(appConfig.gemini.apiKey);
const grokClient = new GrokClient({ apiKey: appConfig.grok.apiKey });       // NEW
const chatgptClient = new ChatGPTClient({ apiKey: appConfig.openai.apiKey }); // NEW

const selection = router.selectModel({
  type: 'code',
  complexity: 7,
  content: 'Review this TypeScript function'
});

// NEW: Check quota before executing
const quotaCheck = quotaManager.checkQuota(selection.provider);

if (!quotaCheck.canUse) {
  console.warn(`Provider unavailable: ${quotaCheck.reason}`);
  console.log(`Using fallback: ${selection.fallback?.provider}`);
}

// NEW: Multi-provider client selection with quota tracking
let response;
switch (selection.provider) {
  case 'ollama':
    response = await ollamaClient.generate(task.content, selection.model);
    break;
  case 'gemini':
    response = await geminiClient.generateText(task.content);
    quotaManager.recordUsage('gemini');  // NEW: Track usage
    break;
  case 'grok':                           // NEW
    response = await grokClient.generateText(task.content);
    quotaManager.recordUsage('grok');
    break;
  case 'chatgpt':                        // NEW
    response = await chatgptClient.generateText(task.content);
    quotaManager.recordUsage('chatgpt');
    break;
}
```

### Example 2: Configuration Loading

**v1.0 Code**:
```typescript
import { appConfig } from './config/index.js';

const claudeApiKey = appConfig.claude.apiKey;
const geminiApiKey = appConfig.gemini.apiKey;
```

**v2.0 Code** (MIGRATED):
```typescript
import { appConfig } from './config/index.js';

// Existing keys
const claudeApiKey = appConfig.claude.apiKey;
const geminiApiKey = appConfig.gemini.apiKey;

// NEW: Additional keys
const grokApiKey = appConfig.grok.apiKey;
const openaiApiKey = appConfig.openai.apiKey;

// NEW: Quota limits
const grokLimits = appConfig.quotaLimits.grok;
const chatgptLimits = appConfig.quotaLimits.chatgpt;

// NEW: Routing preferences
const defaultTextProvider = appConfig.routing.defaultProviders.text;
const fallbackProvider = appConfig.routing.fallback;
```

### Example 3: Error Handling

**v1.0 Code**:
```typescript
try {
  const response = await geminiClient.generateText(prompt);
  return response;
} catch (error) {
  console.error('Gemini API error:', error);
  // Manual fallback
  return await ollamaClient.generate(prompt, 'qwen2.5:14b');
}
```

**v2.0 Code** (MIGRATED):
```typescript
try {
  // NEW: Check quota before API call
  const check = quotaManager.checkQuota('gemini');

  if (!check.canUse) {
    // NEW: Automatic failover based on quota
    const alternatives = check.suggestedAlternatives || [];

    for (const alt of alternatives) {
      const altCheck = quotaManager.checkQuota(alt);
      if (altCheck.canUse) {
        console.log(`Using alternative: ${alt} (${check.reason})`);
        const response = await executeWithProvider(alt, prompt);
        quotaManager.recordUsage(alt);
        return response;
      }
    }

    // NEW: Last resort - local Ollama (always available)
    console.log('All cloud providers unavailable, using local Ollama');
    return await ollamaClient.generate(prompt, 'qwen2.5:14b');
  }

  const response = await geminiClient.generateText(prompt);
  quotaManager.recordUsage('gemini');  // NEW: Track successful usage
  return response;

} catch (error) {
  console.error('API error:', error);

  // NEW: Mark provider temporarily unavailable
  quotaManager.markUnavailable('gemini', 60000);  // 1 minute cooldown

  // Retry with alternative
  const alternatives = quotaManager.getAvailableProviders();
  if (alternatives.length > 0) {
    return await executeWithProvider(alternatives[0], prompt);
  }

  throw error;
}
```

---

## 🧪 Testing Migration

### Update Existing Tests

**v1.0 Test**:
```typescript
import { SmartRouter } from '../src/integrations/router.js';

describe('SmartRouter', () => {
  it('should select Ollama for simple code tasks', () => {
    const router = new SmartRouter();
    const selection = router.selectModel({
      type: 'code',
      complexity: 3,
      content: 'Simple task'
    });

    expect(selection.provider).toBe('ollama');
  });
});
```

**v2.0 Test** (MIGRATED):
```typescript
import { SmartRouter } from '../src/integrations/router.js';
import { QuotaManager } from '../src/quota/manager.js';

describe('SmartRouter', () => {
  let router: SmartRouter;
  let quotaManager: QuotaManager;

  beforeEach(() => {
    // NEW: Setup QuotaManager for tests
    quotaManager = new QuotaManager(new Map([
      ['ollama', { daily: 999999, monthly: 999999 }],
      ['grok', { daily: 100, monthly: 3000 }],
      ['chatgpt', { daily: 200, monthly: 6000 }],
    ]));

    router = new SmartRouter(quotaManager);
  });

  it('should select Ollama for simple code tasks', () => {
    const selection = router.selectModel({
      type: 'code',
      complexity: 3,
      content: 'Simple task'
    });

    expect(selection.provider).toBe('ollama');
  });

  // NEW: Test quota-aware routing
  it('should failover when quota exhausted', () => {
    // Exhaust Grok quota
    for (let i = 0; i < 100; i++) {
      quotaManager.recordUsage('grok');
    }

    const selection = router.selectModel({
      type: 'reasoning',
      complexity: 7,
      content: 'Complex reasoning task',
      preferredProvider: 'grok'
    });

    // Should fallback to alternative
    expect(selection.provider).not.toBe('grok');
    expect(selection.reason).toContain('Fallback');
  });
});
```

### Add New Tests for v2.0 Features

**QuotaManager Tests**:
```typescript
import { QuotaManager } from '../src/quota/manager.js';

describe('QuotaManager', () => {
  it('should track daily usage', () => {
    const manager = new QuotaManager(new Map([
      ['grok', { daily: 100, monthly: 3000 }]
    ]));

    manager.recordUsage('grok');
    const stats = manager.getUsageStats();

    expect(stats.grok.usage.daily).toBe(1);
  });

  it('should suggest alternatives when quota exhausted', () => {
    const manager = new QuotaManager(new Map([
      ['grok', { daily: 1, monthly: 3000 }],
      ['chatgpt', { daily: 200, monthly: 6000 }]
    ]));

    manager.recordUsage('grok');
    const check = manager.checkQuota('grok');

    expect(check.canUse).toBe(false);
    expect(check.suggestedAlternatives).toContain('chatgpt');
  });
});
```

---

## ↔️ Backward Compatibility

### What Remains Compatible

✅ **Fully Compatible** (no changes needed):
- All 21 existing tools remain unchanged
- Ollama integration (no breaking changes)
- Gemini integration (no breaking changes)
- MCP Protocol integration
- Claude Code integration
- Basic task execution API

✅ **Enhanced but Compatible** (optional upgrades):
- SmartRouter can still be used without QuotaManager (degrades to v1.0 behavior)
- Configuration can use defaults for new variables
- Task interface supports old format (type, complexity, content)

### What Requires Changes

❌ **Requires Migration**:
- **QuotaManager dependency** - SmartRouter now requires QuotaManager instance
- **Environment variables** - Must add Grok and ChatGPT API keys
- **Error handling** - Should update to use quota-aware patterns
- **Tests** - Must update to provide QuotaManager to SmartRouter

### Compatibility Mode (Temporary)

**If you can't migrate immediately**, use this temporary compatibility layer:

```typescript
// compatibility-layer.ts (temporary workaround)
import { SmartRouter as SmartRouterV2 } from './integrations/router.js';
import { QuotaManager } from './quota/manager.js';

export class SmartRouterV1Compatible {
  private router: SmartRouterV2;

  constructor() {
    // Auto-create QuotaManager with unlimited quotas
    const quotaManager = new QuotaManager(new Map([
      ['ollama', { daily: 999999, monthly: 999999 }],
      ['gemini', { daily: 999999, monthly: 999999 }],
    ]));

    this.router = new SmartRouterV2(quotaManager);
  }

  selectModel(task) {
    return this.router.selectModel(task);
  }
}

// Use in v1.0 code without changes
const router = new SmartRouterV1Compatible();
```

⚠️ **WARNING**: Compatibility mode disables quota management features. Migrate to full v2.0 as soon as possible.

---

## 📋 Migration Checklist

### Pre-Migration

- [ ] Backup current .env file (`cp .env .env.v1.backup`)
- [ ] Review breaking changes list
- [ ] Obtain Grok API key from https://x.ai/api
- [ ] Review current quota usage patterns
- [ ] Identify code using SmartRouter directly

### Environment Setup

- [ ] Copy .env.example to .env
- [ ] Add GROK_API_KEY
- [ ] Add OPENAI_CHAT_MODEL and OPENAI_CODE_MODEL
- [ ] Configure quota limits (or use defaults)
- [ ] Set routing preferences (or use defaults)
- [ ] Verify all 5 API keys are valid

### Code Updates

- [ ] Update SmartRouter initialization (add QuotaManager)
- [ ] Update error handling (add quota checks)
- [ ] Add quota tracking (recordUsage calls)
- [ ] Update configuration access (new fields)
- [ ] Initialize new clients (GrokClient, ChatGPTClient)

### Testing

- [ ] Update existing tests (add QuotaManager setup)
- [ ] Add QuotaManager tests
- [ ] Add integration tests for multi-provider routing
- [ ] Test failover scenarios
- [ ] Verify quota reset logic

### Validation

- [ ] Run all tests: `npm test`
- [ ] Test basic task execution with each provider
- [ ] Verify quota tracking works
- [ ] Test failover when quota exhausted
- [ ] Confirm cost savings vs v1.0

### Deployment

- [ ] Update production .env
- [ ] Deploy v2.0 code
- [ ] Monitor quota usage
- [ ] Verify no regression in existing features
- [ ] Monitor cost savings

---

## 🆘 Troubleshooting

### Issue 1: "QuotaManager is not defined"

**Cause**: Code still using v1.0 SmartRouter without QuotaManager

**Fix**:
```typescript
// Add QuotaManager initialization
import { QuotaManager } from './quota/manager.js';

const quotaManager = new QuotaManager(providersMap);
const router = new SmartRouter(quotaManager);  // Pass to SmartRouter
```

### Issue 2: "GROK_API_KEY is required"

**Cause**: Missing required environment variable

**Fix**:
```bash
# Add to .env
GROK_API_KEY=xai-xxxxx

# Or temporarily disable Grok
GROK_DAILY_LIMIT=0
GROK_MONTHLY_LIMIT=0
```

### Issue 3: Tests failing with "Cannot read property 'checkQuota'"

**Cause**: Tests not updated to provide QuotaManager

**Fix**:
```typescript
// Update test setup
beforeEach(() => {
  quotaManager = new QuotaManager(testProvidersMap);
  router = new SmartRouter(quotaManager);
});
```

### Issue 4: Quota not resetting daily

**Cause**: Persistent storage not configured correctly

**Fix**:
```typescript
// Ensure QuotaManager saves to persistent storage
// Check localStorage (browser) or file system (Node.js)

// Manual reset for testing
quotaManager.resetDailyQuotas();
```

### Issue 5: Always falling back to Ollama

**Cause**: Quota limits set too low

**Fix**:
```bash
# Increase quota limits in .env
GROK_DAILY_LIMIT=500
CHATGPT_DAILY_LIMIT=1000
CLAUDE_DAILY_LIMIT=500
```

---

## 📞 Support

**Need Help?**
- GitHub Issues: https://github.com/your-repo/smart-agents/issues
- Documentation: See README.md, ARCHITECTURE.md, API.md
- Examples: Check `examples/` directory

**Found a Bug?**
- Report at: https://github.com/your-repo/smart-agents/issues/new
- Include: v1.0 → v2.0 migration context, error messages, .env configuration

---

**Migration completed successfully?**

Check your cost savings:
```typescript
const stats = quotaManager.getUsageStats();
console.log(`Cost saved vs v1.0: $${stats.totalSaved.toFixed(2)}`);
```

🎉 **Welcome to Smart Agents v2.0!**
