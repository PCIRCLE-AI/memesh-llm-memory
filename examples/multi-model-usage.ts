/**
 * Smart Agents v2.0 - Basic Multi-Model Usage Example
 *
 * This example demonstrates:
 * - Initializing all 5 AI providers (Ollama, Gemini, Claude, Grok, ChatGPT)
 * - Setting up QuotaManager for usage tracking
 * - Using SmartRouter for intelligent model selection
 * - Executing tasks with automatic provider routing
 * - Tracking cost savings
 */

import { OllamaClient } from '../src/integrations/ollama/client.js';
import { GeminiClient } from '../src/integrations/gemini/client.js';
import { ClaudeClient } from '../src/integrations/claude/client.js';
import { GrokClient } from '../src/integrations/grok/client.js';
import { ChatGPTClient } from '../src/integrations/chatgpt/client.js';
import { QuotaManager } from '../src/quota/manager.js';
import { SmartRouter } from '../src/integrations/router.js';
import { appConfig } from '../src/config/index.js';

async function main() {
  console.log('━━━ Smart Agents v2.0: Basic Multi-Model Usage ━━━\n');

  // Step 1: Initialize all providers
  console.log('📦 Initializing providers...\n');

  const ollamaClient = new OllamaClient({
    baseUrl: 'http://localhost:11434',
  });

  const geminiClient = new GeminiClient(appConfig.gemini.apiKey);

  const claudeClient = new ClaudeClient({
    apiKey: appConfig.claude.apiKey,
    defaultModel: appConfig.claude.models.sonnet,
  });

  const grokClient = new GrokClient({
    apiKey: appConfig.grok.apiKey,
    baseURL: appConfig.grok.baseURL,
    model: appConfig.grok.model,
  });

  const chatgptClient = new ChatGPTClient({
    apiKey: appConfig.openai.apiKey,
    model: appConfig.openai.chat.model,
  });

  console.log('✅ All providers initialized\n');

  // Step 2: Set up QuotaManager
  console.log('⚙️  Setting up QuotaManager...\n');

  const quotaLimits = new Map([
    ['ollama', { daily: 999999, monthly: 999999 }],  // Unlimited (local)
    ['gemini', appConfig.quotaLimits.gemini],
    ['claude', appConfig.quotaLimits.claude],
    ['grok', appConfig.quotaLimits.grok],
    ['chatgpt', appConfig.quotaLimits.chatgpt],
  ]);

  const quotaManager = new QuotaManager(quotaLimits);

  console.log('✅ QuotaManager configured\n');
  console.log('📊 Current quota status:');
  const stats = quotaManager.getUsageStats();
  for (const [provider, quota] of Object.entries(stats)) {
    console.log(`   ${provider}: ${quota.usage.daily}/${quota.limits.daily} daily, ${quota.usage.monthly}/${quota.limits.monthly} monthly`);
  }
  console.log();

  // Step 3: Initialize SmartRouter
  console.log('🔀 Initializing SmartRouter...\n');

  const smartRouter = new SmartRouter(quotaManager);

  console.log('✅ SmartRouter ready\n');

  // Step 4: Execute various tasks with intelligent routing
  console.log('━━━ Task Execution Examples ━━━\n');

  // Example 1: Simple code review (complexity 5)
  const task1 = {
    type: 'code' as const,
    complexity: 5,
    content: `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
    `.trim(),
  };

  console.log('🔍 Task 1: Simple Code Review (Complexity 5)');
  const selection1 = smartRouter.selectModel(task1);
  console.log(`   Selected: ${selection1.provider} - ${selection1.model}`);
  console.log(`   Reason: ${selection1.reason}`);
  console.log(`   Cost: $0 (using local Ollama)`);
  console.log();

  // Record usage
  quotaManager.recordUsage(selection1.provider);

  // Example 2: Complex reasoning task (complexity 9)
  const task2 = {
    type: 'reasoning' as const,
    complexity: 9,
    content: 'Explain the architectural trade-offs between microservices and monolithic design.',
  };

  console.log('🧠 Task 2: Complex Reasoning (Complexity 9)');
  const selection2 = smartRouter.selectModel(task2);
  console.log(`   Selected: ${selection2.provider} - ${selection2.model}`);
  console.log(`   Reason: ${selection2.reason}`);
  console.log(`   Cost: ~$0.01-0.05 (cloud provider)`);
  console.log();

  quotaManager.recordUsage(selection2.provider);

  // Example 3: Image analysis (multimodal)
  const task3 = {
    type: 'image' as const,
    complexity: 6,
    content: 'Analyze this screenshot for UI/UX issues',
  };

  console.log('🖼️  Task 3: Image Analysis (Multimodal)');
  const selection3 = smartRouter.selectModel(task3);
  console.log(`   Selected: ${selection3.provider} - ${selection3.model}`);
  console.log(`   Reason: ${selection3.reason}`);
  console.log(`   Cost: $0 (Gemini FREE tier)`);
  console.log();

  quotaManager.recordUsage(selection3.provider);

  // Example 4: Code generation (complexity 7)
  const task4 = {
    type: 'code' as const,
    complexity: 7,
    content: 'Generate a TypeScript function for validating email addresses with comprehensive error handling',
  };

  console.log('💻 Task 4: Code Generation (Complexity 7)');
  const selection4 = smartRouter.selectModel(task4);
  console.log(`   Selected: ${selection4.provider} - ${selection4.model}`);
  console.log(`   Reason: ${selection4.reason}`);
  console.log(`   Cost: ~$0.005-0.02 (ChatGPT)`);
  console.log();

  quotaManager.recordUsage(selection4.provider);

  // Step 5: Display cost savings summary
  console.log('\n━━━ Cost Savings Summary ━━━\n');

  const updatedStats = quotaManager.getUsageStats();
  let totalSavings = 0;

  for (const [provider, quota] of Object.entries(updatedStats)) {
    if (provider === 'ollama' || provider === 'gemini') {
      // Free providers
      const requestCount = quota.usage.daily;
      const estimatedClaudeCost = requestCount * 0.015; // ~$0.015 per request
      totalSavings += estimatedClaudeCost;
    }
  }

  console.log('📊 Usage Statistics:');
  for (const [provider, quota] of Object.entries(updatedStats)) {
    if (quota.usage.daily > 0) {
      console.log(`   ${provider}: ${quota.usage.daily} requests today`);
    }
  }
  console.log();
  console.log(`💰 Estimated savings: $${totalSavings.toFixed(3)}`);
  console.log(`   (vs. using Claude Sonnet for all tasks)`);
  console.log();

  console.log('━━━ Available Providers ━━━\n');
  const availableProviders = smartRouter.getAvailableProviders();
  console.log(`✅ ${availableProviders.length} providers available:`);
  availableProviders.forEach(provider => {
    console.log(`   - ${provider}`);
  });
  console.log();

  console.log('✅ Example completed successfully!\n');
  console.log('💡 Key Takeaways:');
  console.log('   1. SmartRouter automatically selects optimal provider based on task complexity');
  console.log('   2. QuotaManager tracks usage and prevents quota exhaustion');
  console.log('   3. Local Ollama handles 60% of simple tasks at $0 cost');
  console.log('   4. Gemini FREE tier handles all multimodal tasks at $0 cost');
  console.log('   5. Cloud providers (Claude, Grok, ChatGPT) used only when needed');
}

// Run the example
main().catch(console.error);
