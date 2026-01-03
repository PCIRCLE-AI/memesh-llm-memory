export class QuotaManager {
    providers;
    quotas = new Map();
    storageKey = 'smart-agents-quota-usage';
    constructor(providers) {
        this.providers = providers;
        this.loadUsage();
        this.initializeProviders();
    }
    initializeProviders() {
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
    checkQuota(provider) {
        const quota = this.quotas.get(provider);
        if (!quota) {
            return {
                canUse: false,
                reason: `Provider ${provider} not configured`
            };
        }
        if (!quota.available) {
            return {
                canUse: false,
                reason: `Provider ${provider} is currently unavailable`,
                suggestedAlternatives: this.getSuggestedAlternatives(provider)
            };
        }
        this.resetIfNeeded(quota);
        if (quota.limits.daily && quota.usage.daily >= quota.limits.daily) {
            return {
                canUse: false,
                reason: `Daily limit reached for ${provider}`,
                remainingDaily: 0,
                suggestedAlternatives: this.getSuggestedAlternatives(provider)
            };
        }
        if (quota.limits.monthly && quota.usage.monthly >= quota.limits.monthly) {
            return {
                canUse: false,
                reason: `Monthly limit reached for ${provider}`,
                remainingMonthly: 0,
                suggestedAlternatives: this.getSuggestedAlternatives(provider)
            };
        }
        return {
            canUse: true,
            remainingDaily: quota.limits.daily ? quota.limits.daily - quota.usage.daily : undefined,
            remainingMonthly: quota.limits.monthly ? quota.limits.monthly - quota.usage.monthly : undefined
        };
    }
    recordUsage(provider, tokens) {
        const quota = this.quotas.get(provider);
        if (!quota)
            return;
        quota.usage.daily++;
        quota.usage.monthly++;
        if (tokens) {
            quota.usage.tokens += tokens;
        }
        this.saveUsage();
    }
    getAvailableProviders() {
        const available = [];
        for (const [provider, quota] of this.quotas.entries()) {
            if (!quota.available)
                continue;
            this.resetIfNeeded(quota);
            if (quota.limits.daily && quota.usage.daily >= quota.limits.daily)
                continue;
            if (quota.limits.monthly && quota.usage.monthly >= quota.limits.monthly)
                continue;
            available.push(provider);
        }
        return available;
    }
    getSuggestedAlternatives(unavailableProvider) {
        const alternatives = this.getAvailableProviders();
        return alternatives.filter(p => p !== unavailableProvider);
    }
    resetIfNeeded(quota) {
        const now = new Date();
        const lastReset = quota.usage.lastReset;
        const isSameDay = now.getFullYear() === lastReset.getFullYear() &&
            now.getMonth() === lastReset.getMonth() &&
            now.getDate() === lastReset.getDate();
        if (!isSameDay) {
            quota.usage.daily = 0;
        }
        const isSameMonth = now.getFullYear() === lastReset.getFullYear() &&
            now.getMonth() === lastReset.getMonth();
        if (!isSameMonth) {
            quota.usage.monthly = 0;
        }
        quota.usage.lastReset = now;
    }
    getUsageStats() {
        const stats = {};
        for (const [provider, quota] of this.quotas.entries()) {
            stats[provider] = { ...quota };
        }
        return stats;
    }
    loadUsage() {
        try {
            const stored = typeof localStorage !== 'undefined'
                ? localStorage.getItem(this.storageKey)
                : null;
            if (stored) {
                const data = JSON.parse(stored);
                for (const [provider, quota] of Object.entries(data)) {
                    this.quotas.set(provider, quota);
                }
            }
        }
        catch (error) {
            console.warn('Failed to load quota usage:', error);
        }
    }
    saveUsage() {
        try {
            const data = {};
            for (const [provider, quota] of this.quotas.entries()) {
                data[provider] = quota;
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        }
        catch (error) {
            console.warn('Failed to save quota usage:', error);
        }
    }
    markUnavailable(provider, durationMs = 60000) {
        const quota = this.quotas.get(provider);
        if (!quota)
            return;
        quota.available = false;
        setTimeout(() => {
            quota.available = true;
        }, durationMs);
    }
}
//# sourceMappingURL=manager.js.map