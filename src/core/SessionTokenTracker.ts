/**
 * Session Token Tracker
 *
 * Tracks and monitors token usage within a single session, providing threshold-based
 * warnings and usage statistics. Helps prevent context quota exhaustion by monitoring
 * token consumption patterns and alerting when thresholds are crossed.
 *
 * Features:
 * - Real-time token usage tracking
 * - Configurable threshold warnings (info/warning/critical)
 * - Usage history and statistics
 * - One-time threshold alerts (prevents duplicate warnings)
 * - Session reset capability
 *
 * @example
 * ```typescript
 * import { SessionTokenTracker } from './SessionTokenTracker.js';
 *
 * // Create tracker with 200K token limit
 * const tracker = new SessionTokenTracker({
 *   tokenLimit: 200000,
 *   thresholds: [
 *     { percentage: 50, level: 'info' },
 *     { percentage: 80, level: 'warning' },
 *     { percentage: 95, level: 'critical' }
 *   ]
 * });
 *
 * // Record interaction usage
 * tracker.recordUsage({
 *   inputTokens: 1500,
 *   outputTokens: 800
 * });
 *
 * // Check for threshold warnings
 * const warnings = tracker.checkThresholds();
 * warnings.forEach(warning => {
 *   console.warn(`${warning.level}: ${warning.message}`);
 * });
 *
 * // Get statistics
 * const stats = tracker.getStats();
 * console.log(`Used: ${stats.usagePercentage.toFixed(1)}% (${stats.totalTokens}/${stats.tokenLimit})`);
 * ```
 */

import { ValidationError } from '../errors/index.js';

/**
 * Token usage record for a single interaction
 *
 * Records token consumption for a single API call or interaction,
 * including both input and output tokens with optional timestamp.
 *
 * @example
 * ```typescript
 * const usage: TokenUsage = {
 *   inputTokens: 1500,
 *   outputTokens: 800,
 *   timestamp: new Date()
 * };
 * ```
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
 * SessionTokenTracker Class
 *
 * Monitors cumulative token usage within a session and provides threshold-based
 * warnings to prevent context quota exhaustion. Tracks all interactions and
 * alerts when usage crosses configured percentage thresholds.
 *
 * @example
 * ```typescript
 * // Create tracker with custom thresholds
 * const tracker = new SessionTokenTracker({
 *   tokenLimit: 200000,
 *   thresholds: [
 *     { percentage: 75, level: 'warning' },
 *     { percentage: 90, level: 'critical' }
 *   ]
 * });
 *
 * // Simulate multiple interactions
 * for (let i = 0; i < 10; i++) {
 *   tracker.recordUsage({
 *     inputTokens: Math.floor(Math.random() * 2000),
 *     outputTokens: Math.floor(Math.random() * 1000)
 *   });
 *
 *   const warnings = tracker.checkThresholds();
 *   if (warnings.length > 0) {
 *     console.warn(`Threshold crossed: ${warnings[0].message}`);
 *   }
 * }
 *
 * // Get final statistics
 * const stats = tracker.getStats();
 * console.log(`Total interactions: ${stats.interactionCount}`);
 * console.log(`Tokens used: ${stats.totalTokens} (${stats.usagePercentage}%)`);
 * console.log(`Tokens remaining: ${stats.tokensRemaining}`);
 * ```
 */
export class SessionTokenTracker {
  private totalTokens: number = 0;
  private tokenLimit: number;
  private thresholds: ThresholdConfig[];
  private usageHistory: TokenUsage[] = [];
  private triggeredThresholds: Set<number> = new Set();

  constructor(config: SessionTokenTrackerConfig) {
    // ✅ Add NaN/Infinity validation
    if (!Number.isFinite(config.tokenLimit)) {
      throw new ValidationError('Token limit must be finite number', {
        providedValue: config.tokenLimit,
      });
    }

    if (config.tokenLimit <= 0) {
      throw new ValidationError('Token limit must be positive', {
        providedValue: config.tokenLimit,
        expectedCondition: 'positive number (> 0)',
      });
    }

    if (config.tokenLimit > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError('Token limit exceeds safe integer', {
        providedValue: config.tokenLimit,
        max: Number.MAX_SAFE_INTEGER,
      });
    }

    // Validate thresholds
    if (config.thresholds) {
      for (const threshold of config.thresholds) {
        if (!Number.isFinite(threshold.percentage)) {
          throw new ValidationError('Threshold percentage must be finite', {
            providedValue: threshold.percentage,
          });
        }

        if (threshold.percentage < 0 || threshold.percentage > 100) {
          throw new ValidationError('Threshold percentage must be 0-100', {
            providedValue: threshold.percentage,
            range: [0, 100],
          });
        }
      }
    }

    this.tokenLimit = config.tokenLimit;
    this.thresholds = config.thresholds || [
      { percentage: 80, level: 'warning' },
      { percentage: 90, level: 'critical' },
    ];
  }

  /**
   * Record token usage from an interaction
   *
   * Adds token usage from a single interaction to the cumulative total.
   * Validates that token counts are non-negative and stores usage history.
   *
   * @param usage - Token usage record for the interaction
   * @throws ValidationError if token counts are negative
   *
   * @example
   * ```typescript
   * // Record a normal interaction
   * tracker.recordUsage({
   *   inputTokens: 1500,
   *   outputTokens: 800
   * });
   *
   * // Record with explicit timestamp
   * tracker.recordUsage({
   *   inputTokens: 2000,
   *   outputTokens: 1200,
   *   timestamp: new Date('2025-01-01T10:00:00Z')
   * });
   *
   * // Check if warning triggered
   * const warnings = tracker.checkThresholds();
   * if (warnings.length > 0) {
   *   console.log(`New threshold crossed: ${warnings[0].level}`);
   * }
   * ```
   */
  recordUsage(usage: TokenUsage): void {
    // ✅ Validate NaN/Infinity
    if (!Number.isFinite(usage.inputTokens)) {
      throw new ValidationError('Input tokens must be finite', {
        providedValue: usage.inputTokens,
      });
    }

    if (!Number.isFinite(usage.outputTokens)) {
      throw new ValidationError('Output tokens must be finite', {
        providedValue: usage.outputTokens,
      });
    }

    // Existing validation
    if (usage.inputTokens < 0 || usage.outputTokens < 0) {
      throw new ValidationError('Token counts must be non-negative', {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        expectedCondition: 'non-negative numbers (>= 0)',
      });
    }

    // ✅ Check integer overflow
    const total = usage.inputTokens + usage.outputTokens;
    if (!Number.isSafeInteger(total)) {
      throw new ValidationError('Token sum exceeds safe integer', {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        total,
        max: Number.MAX_SAFE_INTEGER,
      });
    }

    const newTotal = this.totalTokens + total;
    if (!Number.isSafeInteger(newTotal)) {
      throw new ValidationError('Total tokens would exceed safe integer', {
        currentTotal: this.totalTokens,
        addingTokens: total,
        newTotal,
        max: Number.MAX_SAFE_INTEGER,
      });
    }

    this.totalTokens = newTotal;
    this.usageHistory.push({
      ...usage,
      timestamp: usage.timestamp || new Date(),
    });
  }

  /**
   * Get total tokens used in session
   *
   * Returns the cumulative sum of all input and output tokens recorded.
   *
   * @returns Total tokens used (input + output)
   *
   * @example
   * ```typescript
   * const total = tracker.getTotalTokens();
   * console.log(`Used ${total} tokens so far`);
   *
   * // Check if approaching limit
   * if (total > tracker.getStats().tokenLimit * 0.9) {
   *   console.warn('Approaching token limit!');
   * }
   * ```
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Get usage percentage (0-100)
   *
   * Calculates what percentage of the token limit has been consumed.
   *
   * @returns Usage percentage (0-100)
   *
   * @example
   * ```typescript
   * const usage = tracker.getUsagePercentage();
   * console.log(`Token usage: ${usage.toFixed(1)}%`);
   *
   * // Display progress bar
   * const barLength = 20;
   * const filled = Math.floor((usage / 100) * barLength);
   * const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
   * console.log(`[${bar}] ${usage.toFixed(1)}%`);
   * ```
   */
  getUsagePercentage(): number {
    // tokenLimit already validated in constructor, but add defensive check
    if (this.tokenLimit <= 0) return 0;
    const percentage = (this.totalTokens / this.tokenLimit) * 100;
    return Number.isFinite(percentage) ? percentage : 0;
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
