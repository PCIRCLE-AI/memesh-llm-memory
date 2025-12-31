// src/core/SessionTokenTracker.ts

import { ValidationError } from '../errors/index.js';

/**
 * Token usage record for a single interaction
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  timestamp?: Date;
}

/**
 * Threshold warning configuration
 */
export interface ThresholdConfig {
  percentage: number;
  level: 'info' | 'warning' | 'critical';
}

/**
 * Threshold warning result
 */
export interface ThresholdWarning {
  threshold: number;
  level: 'info' | 'warning' | 'critical';
  tokensUsed: number;
  tokensRemaining: number;
  message: string;
}

/**
 * Session statistics result
 */
export interface SessionStats {
  totalTokens: number;
  tokenLimit: number;
  usagePercentage: number;
  tokensRemaining: number;
  interactionCount: number;
  triggeredThresholds: number[];
}

/**
 * SessionTokenTracker configuration
 */
export interface SessionTokenTrackerConfig {
  tokenLimit: number;
  thresholds?: ThresholdConfig[];
}

/**
 * Tracks token usage within a session and monitors thresholds
 */
export class SessionTokenTracker {
  private totalTokens: number = 0;
  private tokenLimit: number;
  private thresholds: ThresholdConfig[];
  private usageHistory: TokenUsage[] = [];
  private triggeredThresholds: Set<number> = new Set();

  constructor(config: SessionTokenTrackerConfig) {
    if (config.tokenLimit <= 0) {
      throw new ValidationError('Token limit must be positive', {
        providedValue: config.tokenLimit,
        expectedCondition: 'positive number (> 0)',
      });
    }
    this.tokenLimit = config.tokenLimit;
    this.thresholds = config.thresholds || [
      { percentage: 80, level: 'warning' },
      { percentage: 90, level: 'critical' },
    ];
  }

  /**
   * Record token usage from an interaction
   */
  recordUsage(usage: TokenUsage): void {
    if (usage.inputTokens < 0 || usage.outputTokens < 0) {
      throw new ValidationError('Token counts must be non-negative', {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        expectedCondition: 'non-negative numbers (>= 0)',
      });
    }
    const total = usage.inputTokens + usage.outputTokens;
    this.totalTokens += total;
    this.usageHistory.push({
      ...usage,
      timestamp: usage.timestamp || new Date(),
    });
  }

  /**
   * Get total tokens used in session
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Get usage percentage (0-100)
   */
  getUsagePercentage(): number {
    return (this.totalTokens / this.tokenLimit) * 100;
  }

  /**
   * Check if any thresholds have been crossed
   * Returns warnings for newly crossed thresholds only (not previously triggered)
   */
  checkThresholds(): ThresholdWarning[] {
    const percentage = this.getUsagePercentage();
    const warnings: ThresholdWarning[] = [];

    for (const threshold of this.thresholds) {
      if (
        percentage >= threshold.percentage &&
        !this.triggeredThresholds.has(threshold.percentage)
      ) {
        this.triggeredThresholds.add(threshold.percentage);
        warnings.push({
          threshold: threshold.percentage,
          level: threshold.level,
          tokensUsed: this.totalTokens,
          tokensRemaining: this.tokenLimit - this.totalTokens,
          message: `Session token usage at ${threshold.percentage}% (${this.totalTokens}/${this.tokenLimit} tokens)`,
        });
      }
    }

    return warnings;
  }

  /**
   * Get usage statistics
   */
  getStats(): SessionStats {
    return {
      totalTokens: this.totalTokens,
      tokenLimit: this.tokenLimit,
      usagePercentage: this.getUsagePercentage(),
      tokensRemaining: this.tokenLimit - this.totalTokens,
      interactionCount: this.usageHistory.length,
      triggeredThresholds: Array.from(this.triggeredThresholds),
    };
  }

  /**
   * Reset tracker (for testing or new session)
   */
  reset(): void {
    this.totalTokens = 0;
    this.usageHistory = [];
    this.triggeredThresholds.clear();
  }
}
