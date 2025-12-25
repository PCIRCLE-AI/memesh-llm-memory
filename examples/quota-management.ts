/**
 * Smart Agents v2.0 - Quota Management Examples
 *
 * This example demonstrates:
 * - Checking quota availability before task execution
 * - Handling quota exhaustion scenarios
 * - Recording usage and tracking statistics
 * - Auto-reset behavior (daily/monthly)
 * - Manual provider selection based on quota status
 * - Persistent storage across sessions
 */

import { QuotaManager } from '../src/quota/manager.js';
import { SmartRouter } from '../src/integrations/router.js';
import { appConfig } from '../src/config/index.js';

async function main() {
  console.log('━━━ Smart Agents v2.0: Quota Management Examples ━━━\n');

  // ========================================
  // Example 1: Initialize QuotaManager
  // ========================================
  console.log('📊 Example 1: Initialize QuotaManager\n');

  const quotaLimits = new Map([
    ['ollama', { daily: 999999, monthly: 999999 }],  // Unlimited (local)
    ['gemini', { daily: 10000, monthly: 300000 }],   // FREE tier (generous)
    ['claude', { daily: 150, monthly: 4500 }],       // Paid tier
    ['grok', { daily: 100, monthly: 3000 }],         // Paid tier
    ['chatgpt', { daily: 200, monthly: 6000 }],      // Paid tier
  ]);

  const quotaManager = new QuotaManager(quotaLimits);
  console.log('✅ QuotaManager initialized with provider limits\n');

  // ========================================
  // Example 2: Check Quota Before Task
  // ========================================
  console.log('━━━ Example 2: Check Quota Before Task ━━━\n');

  const providers = ['claude', 'grok', 'chatgpt', 'gemini', 'ollama'];

  for (const provider of providers) {
    const check = quotaManager.checkQuota(provider);

    if (check.canUse) {
      console.log(`✅ ${provider}:`);
      console.log(`   - Available for use`);
      console.log(`   - Daily remaining: ${check.remainingDaily || 'unlimited'}`);
      console.log(`   - Monthly remaining: ${check.remainingMonthly || 'unlimited'}`);
    } else {
      console.log(`❌ ${provider}:`);
      console.log(`   - Unavailable: ${check.reason}`);
      console.log(`   - Suggested alternatives: ${check.suggestedAlternatives?.join(', ')}`);
    }
    console.log();
  }

  // ========================================
  // Example 3: Record Usage
  // ========================================
  console.log('━━━ Example 3: Record Usage ━━━\n');

  console.log('Simulating task executions...\n');

  // Simulate 5 Claude API calls
  for (let i = 1; i <= 5; i++) {
    quotaManager.recordUsage('claude', 1500);  // 1500 tokens per call
    console.log(`✅ Claude API call ${i}/5 recorded`);
  }

  // Simulate 10 ChatGPT API calls
  for (let i = 1; i <= 10; i++) {
    quotaManager.recordUsage('chatgpt', 1200);
    console.log(`✅ ChatGPT API call ${i}/10 recorded`);
  }

  // Simulate 20 Ollama (local) calls
  for (let i = 1; i <= 20; i++) {
    quotaManager.recordUsage('ollama');
    console.log(`✅ Ollama call ${i}/20 recorded (local, no quota limit)`);
  }

  console.log('\n📈 Usage recorded successfully\n');

  // ========================================
  // Example 4: Check Updated Statistics
  // ========================================
  console.log('━━━ Example 4: Check Updated Statistics ━━━\n');

  const stats = quotaManager.getUsageStats();

  for (const [provider, quota] of Object.entries(stats)) {
    if (quota.usage.daily > 0) {
      console.log(`📊 ${provider.toUpperCase()}:`);
      console.log(`   - Daily usage: ${quota.usage.daily}/${quota.limits.daily || '∞'}`);
      console.log(`   - Monthly usage: ${quota.usage.monthly}/${quota.limits.monthly || '∞'}`);
      console.log(`   - Last reset: ${new Date(quota.usage.lastReset).toLocaleString()}`);
      console.log();
    }
  }

  // ========================================
  // Example 5: Handle Quota Exhaustion
  // ========================================
  console.log('━━━ Example 5: Handle Quota Exhaustion ━━━\n');

  // Simulate exhausting Grok's daily quota
  console.log('Simulating Grok quota exhaustion...\n');

  for (let i = 1; i <= 100; i++) {
    quotaManager.recordUsage('grok');
  }

  const grokCheck = quotaManager.checkQuota('grok');

  if (!grokCheck.canUse) {
    console.log(`❌ Grok quota exhausted!`);
    console.log(`   Reason: ${grokCheck.reason}`);
    console.log(`   Suggested alternatives: ${grokCheck.suggestedAlternatives?.join(', ')}`);
    console.log();

    // Fallback to alternative provider
    const alternative = grokCheck.suggestedAlternatives?.[0];
    if (alternative) {
      console.log(`🔄 Falling back to: ${alternative}`);
      const altCheck = quotaManager.checkQuota(alternative);
      console.log(`   - Available: ${altCheck.canUse}`);
      console.log(`   - Daily remaining: ${altCheck.remainingDaily || 'unlimited'}`);
      console.log();
    }
  }

  // ========================================
  // Example 6: Smart Routing with Quota Awareness
  // ========================================
  console.log('━━━ Example 6: Smart Routing with Quota Awareness ━━━\n');

  const smartRouter = new SmartRouter(quotaManager);

  // Task 1: Code review (would prefer Claude, but quota exhausted)
  const task1 = {
    type: 'code' as const,
    complexity: 9,
    content: 'Review this complex authentication system...',
  };

  console.log('📋 Task: Complex code review (complexity 9)');
  const selection1 = smartRouter.selectModel(task1);
  console.log(`   Preferred: Claude`);
  console.log(`   Selected: ${selection1.provider} - ${selection1.model}`);
  console.log(`   Reason: ${selection1.reason}`);
  console.log();

  // Task 2: Simple text generation (Ollama always available)
  const task2 = {
    type: 'text' as const,
    complexity: 3,
    content: 'Generate a simple README introduction...',
  };

  console.log('📋 Task: Simple text generation (complexity 3)');
  const selection2 = smartRouter.selectModel(task2);
  console.log(`   Selected: ${selection2.provider} - ${selection2.model}`);
  console.log(`   Reason: ${selection2.reason}`);
  console.log(`   Cost: $0 (local Ollama)`);
  console.log();

  // ========================================
  // Example 7: Manual Provider Selection
  // ========================================
  console.log('━━━ Example 7: Manual Provider Selection ━━━\n');

  // Check each provider's quota status
  const availableProviders = quotaManager.getAvailableProviders();

  console.log('✅ Available providers:');
  for (const provider of availableProviders) {
    const check = quotaManager.checkQuota(provider);
    console.log(`   - ${provider} (Daily: ${check.remainingDaily || '∞'}, Monthly: ${check.remainingMonthly || '∞'})`);
  }
  console.log();

  // Manual selection based on quota status
  const task3 = {
    type: 'code' as const,
    complexity: 7,
    content: 'Generate unit tests...',
    preferredProvider: availableProviders.includes('chatgpt') ? 'chatgpt' : 'ollama',
  };

  console.log('📋 Task: Manual provider selection');
  const selection3 = smartRouter.selectModel(task3);
  console.log(`   Preferred: ${task3.preferredProvider}`);
  console.log(`   Selected: ${selection3.provider} - ${selection3.model}`);
  console.log(`   Reason: ${selection3.reason}`);
  console.log();

  // ========================================
  // Example 8: Auto-Reset Behavior
  // ========================================
  console.log('━━━ Example 8: Auto-Reset Behavior ━━━\n');

  console.log('QuotaManager automatically resets counters:');
  console.log('   - Daily counters: Reset at midnight (00:00 local time)');
  console.log('   - Monthly counters: Reset on 1st day of month (00:00)');
  console.log();
  console.log('Reset logic:');
  console.log('   - Checks current date vs last reset date');
  console.log('   - If day changed → reset daily counter');
  console.log('   - If month changed → reset monthly counter');
  console.log('   - Automatic on every checkQuota() call');
  console.log();
  console.log('Example scenario:');
  console.log('   Last reset: 2025-12-24 23:45');
  console.log('   Current time: 2025-12-25 00:05');
  console.log('   → Daily counter reset to 0 ✅');
  console.log('   → Monthly counter unchanged (same month)');
  console.log();

  // ========================================
  // Example 9: Persistent Storage
  // ========================================
  console.log('━━━ Example 9: Persistent Storage ━━━\n');

  console.log('QuotaManager stores usage data persistently:');
  console.log();
  console.log('Browser Environment:');
  console.log('   - Storage: localStorage');
  console.log('   - Key: "smart-agents-quota-usage"');
  console.log('   - Format: JSON serialized quota data');
  console.log();
  console.log('Node.js Environment:');
  console.log('   - Storage: File system');
  console.log('   - Path: ~/.smart-agents/quota-usage.json');
  console.log('   - Format: JSON file');
  console.log();
  console.log('Data Persistence:');
  console.log('   - Saved on every recordUsage() call');
  console.log('   - Loaded on QuotaManager initialization');
  console.log('   - Survives page refresh / process restart');
  console.log('   - Auto-cleanup on monthly reset');
  console.log();

  // ========================================
  // Example 10: Cost Savings Calculation
  // ========================================
  console.log('━━━ Example 10: Cost Savings Calculation ━━━\n');

  const finalStats = quotaManager.getUsageStats();

  let totalRequests = 0;
  let ollamaRequests = 0;
  let cloudRequests = 0;

  for (const [provider, quota] of Object.entries(finalStats)) {
    const requests = quota.usage.daily;
    totalRequests += requests;

    if (provider === 'ollama' || provider === 'gemini') {
      ollamaRequests += requests;
    } else {
      cloudRequests += requests;
    }
  }

  // Estimate cost savings
  const avgCloudCost = 0.015;  // $0.015 per request (average)
  const actualCloudCost = cloudRequests * avgCloudCost;
  const hypotheticalAllCloudCost = totalRequests * avgCloudCost;
  const savings = hypotheticalAllCloudCost - actualCloudCost;
  const savingsPercent = (savings / hypotheticalAllCloudCost) * 100;

  console.log('📊 Session Summary:');
  console.log(`   Total requests: ${totalRequests}`);
  console.log(`   - Local/FREE (Ollama + Gemini): ${ollamaRequests} (${((ollamaRequests/totalRequests)*100).toFixed(1)}%)`);
  console.log(`   - Cloud (Claude + Grok + ChatGPT): ${cloudRequests} (${((cloudRequests/totalRequests)*100).toFixed(1)}%)`);
  console.log();
  console.log('💰 Cost Analysis:');
  console.log(`   Actual cost: $${actualCloudCost.toFixed(3)} (smart routing)`);
  console.log(`   Hypothetical cost: $${hypotheticalAllCloudCost.toFixed(3)} (all cloud)`);
  console.log(`   Savings: $${savings.toFixed(3)} (${savingsPercent.toFixed(1)}% reduction)`);
  console.log();

  // ========================================
  // Summary
  // ========================================
  console.log('━━━ Quota Management Best Practices ━━━\n');

  console.log('✅ DO:');
  console.log('   1. Always check quota BEFORE executing tasks');
  console.log('   2. Record usage IMMEDIATELY after API calls');
  console.log('   3. Use SmartRouter for automatic quota-aware routing');
  console.log('   4. Implement fallback logic for quota exhaustion');
  console.log('   5. Monitor usage statistics regularly');
  console.log('   6. Set realistic daily/monthly limits');
  console.log();
  console.log('❌ DON\'T:');
  console.log('   1. Ignore quota warnings');
  console.log('   2. Forget to record usage (causes inaccurate tracking)');
  console.log('   3. Hardcode provider selection (bypasses quota checks)');
  console.log('   4. Set unrealistic limits (too low causes failures)');
  console.log('   5. Clear persistent storage manually (loses history)');
  console.log();
  console.log('💡 Key Insights:');
  console.log('   - Ollama (local) has unlimited quota → Use for simple tasks');
  console.log('   - Gemini FREE tier is generous (10k/day) → Use for multimodal');
  console.log('   - Cloud providers are metered → Reserve for complex tasks');
  console.log('   - SmartRouter handles quota checks automatically');
  console.log('   - Failover ensures service continuity');
  console.log('   - Quota data persists across sessions');
  console.log();
  console.log('✅ Quota management examples completed!\n');
}

// Run the examples
main().catch(console.error);
