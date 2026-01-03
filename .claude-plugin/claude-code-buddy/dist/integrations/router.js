export class SmartRouter {
    quotaManager;
    constructor(quotaManager) {
        this.quotaManager = quotaManager;
    }
    selectModel(task) {
        const preferredProvider = this.getPreferredProvider(task);
        const quotaCheck = this.quotaManager.checkQuota(preferredProvider);
        if (quotaCheck.canUse) {
            return {
                provider: preferredProvider,
                model: this.getModelForProvider(preferredProvider, task),
                reason: `Optimal match for ${task.type} task (complexity: ${task.complexity})`
            };
        }
        const alternatives = quotaCheck.suggestedAlternatives || [];
        for (const alternative of alternatives) {
            const altCheck = this.quotaManager.checkQuota(alternative);
            if (altCheck.canUse) {
                const isOllama = alternative === 'ollama';
                const cloudProviders = ['claude', 'chatgpt', 'grok', 'gemini'];
                const allCloudExhausted = cloudProviders.every(provider => !this.quotaManager.checkQuota(provider).canUse);
                const isLastResort = isOllama && allCloudExhausted;
                const reason = isLastResort
                    ? 'All cloud providers unavailable'
                    : `Fallback (${preferredProvider} ${quotaCheck.reason})`;
                const fallbackSelection = {
                    provider: alternative,
                    model: this.getModelForProvider(alternative, task),
                    reason
                };
                return {
                    ...fallbackSelection,
                    fallback: fallbackSelection
                };
            }
        }
        return {
            provider: 'ollama',
            model: this.getOllamaModel(task),
            reason: `All cloud providers unavailable, using local Ollama`
        };
    }
    getPreferredProvider(task) {
        if (task.preferredProvider) {
            return task.preferredProvider;
        }
        switch (task.type) {
            case 'image':
            case 'audio':
            case 'video':
                return 'gemini';
            case 'reasoning':
                if (task.complexity >= 9) {
                    return 'claude';
                }
                return 'grok';
            case 'code':
                if (task.complexity <= 5) {
                    return 'ollama';
                }
                if (task.complexity <= 7) {
                    return 'chatgpt';
                }
                return 'claude';
            case 'text':
            case 'creative':
                if (task.complexity <= 5) {
                    return 'ollama';
                }
                if (task.complexity <= 7) {
                    return 'grok';
                }
                return 'claude';
            default:
                return 'ollama';
        }
    }
    getModelForProvider(provider, task) {
        switch (provider) {
            case 'ollama':
                return this.getOllamaModel(task);
            case 'gemini':
                return 'gemini-2.5-flash';
            case 'claude':
                return task.complexity >= 9 ? 'claude-opus-4-5-20251101' : 'claude-sonnet-4-5-20250929';
            case 'grok':
                return 'grok-beta';
            case 'chatgpt':
                return task.type === 'code' ? 'gpt-4-turbo-preview' : 'gpt-4';
            default:
                return 'qwen2.5:14b';
        }
    }
    getOllamaModel(task) {
        if (task.type === 'code') {
            return 'qwen2.5-coder:14b';
        }
        if (task.complexity <= 2) {
            return 'llama3.2:1b';
        }
        return 'qwen2.5:14b';
    }
    getAvailableProviders() {
        return this.quotaManager.getAvailableProviders();
    }
    getUsageStats() {
        return this.quotaManager.getUsageStats();
    }
}
//# sourceMappingURL=router.js.map