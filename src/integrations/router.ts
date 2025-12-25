// src/integrations/router.ts
import { QuotaManager, QuotaCheckResult } from '../quota/manager.js';

export interface Task {
  type: 'code' | 'text' | 'image' | 'audio' | 'video' | 'reasoning' | 'creative';
  complexity: number;  // 1-10
  content: string;
  preferredProvider?: string;
}

export interface ModelSelection {
  provider: string;
  model: string;
  reason: string;
  fallback?: ModelSelection;
}

/**
 * Smart Router (ENHANCED with Quota Awareness)
 *
 * Routes tasks to optimal AI providers based on:
 * - Task type and complexity
 * - Provider quota availability
 * - Cost optimization
 * - Failover logic
 */
export class SmartRouter {
  constructor(private quotaManager: QuotaManager) {}

  /**
   * Select optimal model based on task and quota availability
   */
  selectModel(task: Task): ModelSelection {
    // Step 1: Determine preferred provider based on task type and complexity
    const preferredProvider = this.getPreferredProvider(task);

    // Step 2: Check if preferred provider has available quota
    const quotaCheck = this.quotaManager.checkQuota(preferredProvider);

    if (quotaCheck.canUse) {
      return {
        provider: preferredProvider,
        model: this.getModelForProvider(preferredProvider, task),
        reason: `Optimal match for ${task.type} task (complexity: ${task.complexity})`
      };
    }

    // Step 3: Fallback logic if preferred provider unavailable
    const alternatives = quotaCheck.suggestedAlternatives || [];

    for (const alternative of alternatives) {
      const altCheck = this.quotaManager.checkQuota(alternative);

      if (altCheck.canUse) {
        const fallbackSelection: ModelSelection = {
          provider: alternative,
          model: this.getModelForProvider(alternative, task),
          reason: `Fallback (${preferredProvider} ${quotaCheck.reason})`
        };

        return {
          ...fallbackSelection,
          fallback: fallbackSelection
        };
      }
    }

    // Step 4: Last resort - use local Ollama (always available, $0 cost)
    return {
      provider: 'ollama',
      model: this.getOllamaModel(task),
      reason: `All cloud providers unavailable, using local Ollama`
    };
  }

  /**
   * Get preferred provider based on task characteristics
   */
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

  /**
   * Get specific model for a provider
   */
  private getModelForProvider(provider: string, task: Task): string {
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

  /**
   * Get optimal Ollama model based on task
   */
  private getOllamaModel(task: Task): string {
    if (task.type === 'code') {
      return 'qwen2.5-coder:14b';
    }

    if (task.complexity <= 2) {
      return 'llama3.2:1b';  // Super fast for simple tasks
    }

    return 'qwen2.5:14b';  // General purpose
  }

  /**
   * Get available providers list
   */
  getAvailableProviders(): string[] {
    return this.quotaManager.getAvailableProviders();
  }

  /**
   * Get usage stats for all providers
   */
  getUsageStats() {
    return this.quotaManager.getUsageStats();
  }
}
