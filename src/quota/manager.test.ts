// src/quota/manager.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QuotaManager, QuotaLimits, ProviderQuota, QuotaCheckResult } from './manager.js';

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;
  let mockProviders: Map<string, QuotaLimits>;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        clear: () => { store = {}; }
      };
    })();
    global.localStorage = localStorageMock as any;

    // Initialize test providers
    mockProviders = new Map<string, QuotaLimits>([
      ['ollama', { daily: 999999, monthly: 999999 }],
      ['gemini', { daily: 10000, monthly: 300000 }],
      ['claude', { daily: 150, monthly: 4500 }],
      ['grok', { daily: 100, monthly: 3000 }],
      ['chatgpt', { daily: 200, monthly: 6000 }]
    ]);

    quotaManager = new QuotaManager(mockProviders);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.localStorage.clear();
  });

  describe('Quota Checking Logic', () => {
    it('should allow usage when quota is available', () => {
      const result = quotaManager.checkQuota('claude');

      expect(result.canUse).toBe(true);
      expect(result.remainingDaily).toBe(150);
      expect(result.remainingMonthly).toBe(4500);
      expect(result.reason).toBeUndefined();
    });

    it('should deny usage when daily limit reached', () => {
      // Record 150 uses (reach daily limit)
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

    it('should deny usage when monthly limit reached', () => {
      // Manually set monthly usage to limit
      const stats = quotaManager.getUsageStats();
      stats['grok'].usage.monthly = 3000;

      const result = quotaManager.checkQuota('grok');

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('Monthly limit reached');
      expect(result.remainingMonthly).toBe(0);
    });

    it('should deny usage when provider not configured', () => {
      const result = quotaManager.checkQuota('unknown-provider');

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('not configured');
    });

    it('should deny usage when provider unavailable', () => {
      quotaManager.markUnavailable('claude', 5000);

      const result = quotaManager.checkQuota('claude');

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('currently unavailable');
      expect(result.suggestedAlternatives).toBeDefined();
    });
  });

  describe('Usage Recording', () => {
    it('should increment daily and monthly counters', () => {
      quotaManager.recordUsage('claude');
      quotaManager.recordUsage('claude');
      quotaManager.recordUsage('claude');

      const stats = quotaManager.getUsageStats();

      expect(stats['claude'].usage.daily).toBe(3);
      expect(stats['claude'].usage.monthly).toBe(3);
    });

    it('should track token usage when provided', () => {
      quotaManager.recordUsage('claude', 1000);
      quotaManager.recordUsage('claude', 1500);

      const stats = quotaManager.getUsageStats();

      expect(stats['claude'].usage.tokens).toBe(2500);
    });

    it('should persist usage to localStorage', () => {
      quotaManager.recordUsage('claude', 1000);

      const stored = localStorage.getItem('smart-agents-quota-usage');
      expect(stored).toBeDefined();

      const data = JSON.parse(stored!);
      expect(data.claude.usage.daily).toBe(1);
      expect(data.claude.usage.tokens).toBe(1000);
    });

    it('should ignore usage for unknown provider', () => {
      const statsBefore = quotaManager.getUsageStats();

      quotaManager.recordUsage('unknown-provider', 100);

      const statsAfter = quotaManager.getUsageStats();

      expect(statsBefore).toEqual(statsAfter);
    });
  });

  describe('Reset Mechanism', () => {
    it('should reset daily counter when day changes', () => {
      // Record some usage
      quotaManager.recordUsage('claude');
      quotaManager.recordUsage('claude');

      const stats = quotaManager.getUsageStats();
      expect(stats['claude'].usage.daily).toBe(2);

      // Mock date to next day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      vi.setSystemTime(tomorrow);

      // Check quota (should trigger reset)
      const result = quotaManager.checkQuota('claude');

      const newStats = quotaManager.getUsageStats();
      expect(newStats['claude'].usage.daily).toBe(0);
      expect(newStats['claude'].usage.monthly).toBe(2); // Monthly not reset
      expect(result.canUse).toBe(true);
    });

    it('should reset monthly counter when month changes', () => {
      // Record some usage
      quotaManager.recordUsage('claude');
      quotaManager.recordUsage('claude');

      const stats = quotaManager.getUsageStats();
      expect(stats['claude'].usage.monthly).toBe(2);

      // Mock date to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      vi.setSystemTime(nextMonth);

      // Check quota (should trigger reset)
      quotaManager.checkQuota('claude');

      const newStats = quotaManager.getUsageStats();
      expect(newStats['claude'].usage.daily).toBe(0); // Both reset
      expect(newStats['claude'].usage.monthly).toBe(0);
    });

    it('should not reset if same day', () => {
      quotaManager.recordUsage('claude');

      const stats1 = quotaManager.getUsageStats();
      expect(stats1['claude'].usage.daily).toBe(1);

      // Same day, few hours later
      const later = new Date();
      later.setHours(later.getHours() + 3);
      vi.setSystemTime(later);

      quotaManager.checkQuota('claude');

      const stats2 = quotaManager.getUsageStats();
      expect(stats2['claude'].usage.daily).toBe(1); // Not reset
    });
  });

  describe('Suggested Alternatives', () => {
    it('should suggest available providers when one is unavailable', () => {
      quotaManager.markUnavailable('claude');

      const result = quotaManager.checkQuota('claude');

      expect(result.suggestedAlternatives).toBeDefined();
      expect(result.suggestedAlternatives).toContain('grok');
      expect(result.suggestedAlternatives).toContain('chatgpt');
      expect(result.suggestedAlternatives).not.toContain('claude');
    });

    it('should only suggest providers with available quota', () => {
      // Exhaust grok daily limit
      for (let i = 0; i < 100; i++) {
        quotaManager.recordUsage('grok');
      }

      // Mark claude unavailable
      quotaManager.markUnavailable('claude');

      const result = quotaManager.checkQuota('claude');

      expect(result.suggestedAlternatives).not.toContain('grok'); // Quota exhausted
      expect(result.suggestedAlternatives).toContain('chatgpt'); // Still available
      expect(result.suggestedAlternatives).toContain('ollama'); // Always available
    });

    it('should return empty alternatives if all providers unavailable', () => {
      // Mark all providers unavailable
      quotaManager.markUnavailable('ollama');
      quotaManager.markUnavailable('gemini');
      quotaManager.markUnavailable('claude');
      quotaManager.markUnavailable('grok');
      quotaManager.markUnavailable('chatgpt');

      const result = quotaManager.checkQuota('claude');

      expect(result.suggestedAlternatives).toHaveLength(0);
    });
  });

  describe('Provider Availability', () => {
    it('should mark provider as unavailable', () => {
      quotaManager.markUnavailable('claude', 1000);

      const result = quotaManager.checkQuota('claude');

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('unavailable');
    });

    it('should auto-restore provider after duration', async () => {
      quotaManager.markUnavailable('claude', 100); // 100ms

      const resultBefore = quotaManager.checkQuota('claude');
      expect(resultBefore.canUse).toBe(false);

      // Wait for auto-restore
      await new Promise(resolve => setTimeout(resolve, 150));

      const resultAfter = quotaManager.checkQuota('claude');
      expect(resultAfter.canUse).toBe(true);
    });

    it('should ignore marking unknown provider unavailable', () => {
      const statsBefore = quotaManager.getUsageStats();

      quotaManager.markUnavailable('unknown-provider');

      const statsAfter = quotaManager.getUsageStats();

      expect(statsBefore).toEqual(statsAfter);
    });
  });

  describe('Get Available Providers', () => {
    it('should return all providers when quota available', () => {
      const available = quotaManager.getAvailableProviders();

      expect(available).toHaveLength(5);
      expect(available).toContain('ollama');
      expect(available).toContain('gemini');
      expect(available).toContain('claude');
      expect(available).toContain('grok');
      expect(available).toContain('chatgpt');
    });

    it('should exclude providers with exhausted quota', () => {
      // Exhaust claude daily limit
      for (let i = 0; i < 150; i++) {
        quotaManager.recordUsage('claude');
      }

      const available = quotaManager.getAvailableProviders();

      expect(available).not.toContain('claude');
      expect(available).toContain('grok');
      expect(available).toContain('chatgpt');
    });

    it('should exclude unavailable providers', () => {
      quotaManager.markUnavailable('grok');
      quotaManager.markUnavailable('chatgpt');

      const available = quotaManager.getAvailableProviders();

      expect(available).not.toContain('grok');
      expect(available).not.toContain('chatgpt');
      expect(available).toContain('ollama');
      expect(available).toContain('gemini');
      expect(available).toContain('claude');
    });
  });

  describe('Get Usage Stats', () => {
    it('should return stats for all providers', () => {
      const stats = quotaManager.getUsageStats();

      expect(Object.keys(stats)).toHaveLength(5);
      expect(stats['claude']).toBeDefined();
      expect(stats['grok']).toBeDefined();
      expect(stats['chatgpt']).toBeDefined();
    });

    it('should return current usage values', () => {
      quotaManager.recordUsage('claude', 1000);
      quotaManager.recordUsage('claude', 1500);

      const stats = quotaManager.getUsageStats();

      expect(stats['claude'].usage.daily).toBe(2);
      expect(stats['claude'].usage.monthly).toBe(2);
      expect(stats['claude'].usage.tokens).toBe(2500);
    });

    it('should include provider limits', () => {
      const stats = quotaManager.getUsageStats();

      expect(stats['claude'].limits.daily).toBe(150);
      expect(stats['claude'].limits.monthly).toBe(4500);
      expect(stats['grok'].limits.daily).toBe(100);
      expect(stats['grok'].limits.monthly).toBe(3000);
    });
  });

  describe('Persistent Storage', () => {
    it('should load usage from localStorage on initialization', () => {
      // Pre-populate localStorage
      const mockData = {
        claude: {
          provider: 'claude',
          limits: { daily: 150, monthly: 4500 },
          usage: {
            daily: 50,
            monthly: 1000,
            tokens: 50000,
            lastReset: new Date().toISOString()
          },
          available: true
        }
      };
      localStorage.setItem('smart-agents-quota-usage', JSON.stringify(mockData));

      // Create new QuotaManager instance (should load from storage)
      const newManager = new QuotaManager(mockProviders);
      const stats = newManager.getUsageStats();

      expect(stats['claude'].usage.daily).toBe(50);
      expect(stats['claude'].usage.monthly).toBe(1000);
      expect(stats['claude'].usage.tokens).toBe(50000);
    });

    it('should handle missing localStorage gracefully', () => {
      localStorage.clear();

      const newManager = new QuotaManager(mockProviders);
      const stats = newManager.getUsageStats();

      // Should initialize with zero usage
      expect(stats['claude'].usage.daily).toBe(0);
      expect(stats['claude'].usage.monthly).toBe(0);
      expect(stats['claude'].usage.tokens).toBe(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('smart-agents-quota-usage', 'invalid-json{{{');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const newManager = new QuotaManager(mockProviders);
      const stats = newManager.getUsageStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load quota usage'),
        expect.anything()
      );

      // Should initialize with zero usage despite corrupted data
      expect(stats['claude'].usage.daily).toBe(0);
    });
  });
});
