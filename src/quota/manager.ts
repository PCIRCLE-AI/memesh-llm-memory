// src/quota/manager.ts
export interface QuotaLimits {
  daily?: number;      // Daily request limit
  monthly?: number;    // Monthly request limit
  tokens?: number;     // Token limit (if applicable)
}

export interface ProviderQuota {
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

export interface QuotaCheckResult {
  canUse: boolean;
  reason?: string;
  remainingDaily?: number;
  remainingMonthly?: number;
  suggestedAlternatives?: string[];
}

/**
 * Quota Manager
 *
 * Tracks API usage across all providers and manages failover logic
 */
export class QuotaManager {
  private quotas: Map<string, ProviderQuota> = new Map();
  private storageKey = 'smart-agents-quota-usage';

  constructor(private providers: Map<string, QuotaLimits>) {
    this.loadUsage();
    this.initializeProviders();
  }

  /**
   * Initialize provider quotas from config
   */
  private initializeProviders(): void {
    for (const [provider, limits] of this.providers.entries()) {
      if (!this.quotas.has(provider)) {
        this.quotas.set(provider, {
          provider,
          limits,
          usage: {
            daily: 0,
            monthly: 0,
            tokens: 0,
            lastReset: new Date()
          },
          available: true
        });
      }
    }
  }

  /**
   * Check if a provider can be used
   */
  checkQuota(provider: string): QuotaCheckResult {
    const quota = this.quotas.get(provider);

    if (!quota) {
      return {
        canUse: false,
        reason: `Provider ${provider} not configured`
      };
    }

    // Check if provider is available
    if (!quota.available) {
      return {
        canUse: false,
        reason: `Provider ${provider} is currently unavailable`,
        suggestedAlternatives: this.getSuggestedAlternatives(provider)
      };
    }

    // Reset counters if needed
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
    return {
      canUse: true,
      remainingDaily: quota.limits.daily ? quota.limits.daily - quota.usage.daily : undefined,
      remainingMonthly: quota.limits.monthly ? quota.limits.monthly - quota.usage.monthly : undefined
    };
  }

  /**
   * Record usage after API call
   */
  recordUsage(provider: string, tokens?: number): void {
    const quota = this.quotas.get(provider);
    if (!quota) return;

    quota.usage.daily++;
    quota.usage.monthly++;

    if (tokens) {
      quota.usage.tokens += tokens;
    }

    this.saveUsage();
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    const available: string[] = [];

    for (const [provider, quota] of this.quotas.entries()) {
      const check = this.checkQuota(provider);
      if (check.canUse) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Get suggested alternatives when a provider is unavailable
   */
  private getSuggestedAlternatives(unavailableProvider: string): string[] {
    const alternatives = this.getAvailableProviders();
    return alternatives.filter(p => p !== unavailableProvider);
  }

  /**
   * Reset daily/monthly counters if needed
   */
  private resetIfNeeded(quota: ProviderQuota): void {
    const now = new Date();
    const lastReset = quota.usage.lastReset;

    // Reset daily counter (if last reset was yesterday or earlier)
    if (now.getDate() !== lastReset.getDate()) {
      quota.usage.daily = 0;
    }

    // Reset monthly counter (if last reset was last month or earlier)
    if (now.getMonth() !== lastReset.getMonth()) {
      quota.usage.monthly = 0;
    }

    quota.usage.lastReset = now;
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): Record<string, ProviderQuota> {
    const stats: Record<string, ProviderQuota> = {};

    for (const [provider, quota] of this.quotas.entries()) {
      stats[provider] = { ...quota };
    }

    return stats;
  }

  /**
   * Load usage from localStorage (browser) or file system (Node.js)
   */
  private loadUsage(): void {
    // Implementation would vary based on environment
    // Browser: localStorage
    // Node.js: Read from file
    // For now, simplified version
    try {
      const stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(this.storageKey)
        : null;

      if (stored) {
        const data = JSON.parse(stored);
        for (const [provider, quota] of Object.entries(data)) {
          this.quotas.set(provider, quota as ProviderQuota);
        }
      }
    } catch (error) {
      console.warn('Failed to load quota usage:', error);
    }
  }

  /**
   * Save usage to persistent storage
   */
  private saveUsage(): void {
    try {
      const data: Record<string, ProviderQuota> = {};
      for (const [provider, quota] of this.quotas.entries()) {
        data[provider] = quota;
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to save quota usage:', error);
    }
  }

  /**
   * Manually mark a provider as unavailable (for error handling)
   */
  markUnavailable(provider: string, durationMs: number = 60000): void {
    const quota = this.quotas.get(provider);
    if (!quota) return;

    quota.available = false;

    // Auto-restore after duration
    setTimeout(() => {
      quota.available = true;
    }, durationMs);
  }
}
