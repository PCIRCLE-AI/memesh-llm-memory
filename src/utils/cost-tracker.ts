/**
 * Cost Tracking Utility
 *
 * Tracks API usage costs across multiple services (Claude, Whisper, TTS, Embeddings)
 * and monitors monthly budget consumption. Provides alerts when spending approaches
 * or exceeds configured thresholds.
 *
 * Features:
 * - Per-service cost tracking (Claude, Whisper, TTS, Embeddings)
 * - Monthly budget monitoring with configurable alerts
 * - Detailed cost breakdown by service
 * - Real-time budget percentage tracking
 * - Automatic alerts at threshold and budget exceeded
 *
 * @example
 * ```typescript
 * import { costTracker } from './cost-tracker.js';
 *
 * // Track Claude API usage
 * const cost = costTracker.trackClaude('claude-sonnet-4-5', 1000, 500);
 * console.log(`Cost: $${cost.toFixed(4)}`);
 *
 * // Track Whisper transcription (in minutes)
 * costTracker.trackWhisper(2.5); // 2.5 minutes of audio
 *
 * // Get monthly report
 * const report = costTracker.getReport();
 * console.log(`Monthly total: $${report.monthlyTotal.toFixed(2)}`);
 * console.log(`Budget used: ${report.percentUsed.toFixed(1)}%`);
 * ```
 */

import { MODEL_COSTS, type ClaudeModel } from '../config/models.js';
import { appConfig } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Usage record for a single API call
 *
 * Tracks timestamp, service, model, usage metrics, and calculated cost.
 */
interface UsageRecord {
  /** When the API call was made */
  timestamp: Date;
  /** Service name (claude, whisper, tts, embeddings) */
  service: string;
  /** Model identifier */
  model: string;
  /** Input tokens for Claude/Embeddings */
  inputTokens?: number;
  /** Output tokens for Claude */
  outputTokens?: number;
  /** Audio duration in minutes for Whisper */
  minutes?: number;
  /** Character count for TTS */
  characters?: number;
  /** Calculated cost in USD */
  cost: number;
}

/**
 * Cost Tracker class for monitoring API usage costs
 *
 * Tracks costs across Claude, Whisper, TTS, and Embeddings APIs.
 * Provides monthly budget monitoring with configurable alert thresholds.
 */
class CostTracker {
  private records: UsageRecord[] = [];
  private monthlyBudget: number;
  private alertThreshold: number;

  constructor() {
    this.monthlyBudget = appConfig.costs.monthlyBudget;
    this.alertThreshold = appConfig.costs.alertThreshold;
  }

  /**
   * Track Claude API usage and calculate cost
   *
   * Calculates cost based on input/output token counts and model pricing.
   * Automatically logs alerts if monthly spending approaches budget threshold.
   *
   * @param model - Claude model identifier (e.g., 'claude-sonnet-4-5')
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens generated
   * @returns Calculated cost in USD
   *
   * @example
   * ```typescript
   * const cost = costTracker.trackClaude('claude-sonnet-4-5', 1000, 500);
   * console.log(`This call cost: $${cost.toFixed(4)}`);
   * ```
   */
  trackClaude(model: ClaudeModel, inputTokens: number, outputTokens: number) {
    const costs = MODEL_COSTS[model];
    const cost = (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;

    this.addRecord({
      timestamp: new Date(),
      service: 'claude',
      model,
      inputTokens,
      outputTokens,
      cost,
    });

    return cost;
  }

  /**
   * Track Whisper transcription usage and calculate cost
   *
   * Calculates cost based on audio duration in minutes.
   *
   * @param minutes - Audio duration in minutes
   * @returns Calculated cost in USD
   *
   * @example
   * ```typescript
   * // Track 2.5 minutes of audio transcription
   * const cost = costTracker.trackWhisper(2.5);
   * console.log(`Transcription cost: $${cost.toFixed(4)}`);
   * ```
   */
  trackWhisper(minutes: number) {
    const cost = minutes * MODEL_COSTS['whisper-1'].perMinute;

    this.addRecord({
      timestamp: new Date(),
      service: 'whisper',
      model: 'whisper-1',
      minutes,
      cost,
    });

    return cost;
  }

  /**
   * Track Text-to-Speech usage and calculate cost
   *
   * Calculates cost based on character count.
   *
   * @param characters - Number of characters to synthesize
   * @returns Calculated cost in USD
   *
   * @example
   * ```typescript
   * const text = "Hello, world!";
   * const cost = costTracker.trackTTS(text.length);
   * console.log(`TTS cost: $${cost.toFixed(4)}`);
   * ```
   */
  trackTTS(characters: number) {
    const cost = (characters / 1000) * MODEL_COSTS['tts-1'].per1KChars;

    this.addRecord({
      timestamp: new Date(),
      service: 'tts',
      model: 'tts-1',
      characters,
      cost,
    });

    return cost;
  }

  /**
   * Track Embeddings API usage and calculate cost
   *
   * Calculates cost based on token count.
   *
   * @param tokens - Number of tokens processed
   * @returns Calculated cost in USD
   *
   * @example
   * ```typescript
   * const cost = costTracker.trackEmbeddings(1500);
   * console.log(`Embeddings cost: $${cost.toFixed(4)}`);
   * ```
   */
  trackEmbeddings(tokens: number) {
    const cost = (tokens / 1_000_000) * MODEL_COSTS['text-embedding-3-small'].input;

    this.addRecord({
      timestamp: new Date(),
      service: 'embeddings',
      model: 'text-embedding-3-small',
      inputTokens: tokens,
      cost,
    });

    return cost;
  }

  /**
   * Add usage record and check budget thresholds
   *
   * Automatically logs warnings when monthly costs exceed alert threshold
   * or monthly budget.
   *
   * @param record - Usage record to add
   *
   * @private
   * @internal
   */
  private addRecord(record: UsageRecord) {
    this.records.push(record);

    // 檢查是否超過預算
    const monthlyTotal = this.getMonthlyTotal();
    if (monthlyTotal > this.monthlyBudget * this.alertThreshold) {
      logger.warn(
        `⚠️ Cost alert: $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)} (${((monthlyTotal / this.monthlyBudget) * 100).toFixed(1)}%)`
      );
    }

    if (monthlyTotal > this.monthlyBudget) {
      logger.error(`🚨 Budget exceeded! $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)}`);
    }
  }

  /**
   * Get total costs for current month
   *
   * Calculates sum of all usage costs since the start of the current month.
   *
   * @returns Total monthly cost in USD
   *
   * @example
   * ```typescript
   * const monthlyTotal = costTracker.getMonthlyTotal();
   * console.log(`This month: $${monthlyTotal.toFixed(2)}`);
   * ```
   */
  getMonthlyTotal(): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.records
      .filter((r) => r.timestamp >= monthStart)
      .reduce((total, r) => total + r.cost, 0);
  }

  /**
   * Get comprehensive cost report
   *
   * @returns Cost report object containing:
   *   - monthlyTotal: Total cost this month in USD
   *   - budget: Configured monthly budget in USD
   *   - remaining: Remaining budget (budget - monthlyTotal)
   *   - percentUsed: Percentage of budget used (0-100+)
   *   - breakdown: Cost breakdown by service
   *   - records: All usage records
   *
   * @example
   * ```typescript
   * const report = costTracker.getReport();
   * console.log(`Monthly Total: $${report.monthlyTotal.toFixed(2)}`);
   * console.log(`Budget Used: ${report.percentUsed.toFixed(1)}%`);
   * console.log(`Remaining: $${report.remaining.toFixed(2)}`);
   * console.log('Breakdown:', report.breakdown);
   * ```
   */
  getReport() {
    const monthlyTotal = this.getMonthlyTotal();
    const breakdown = this.records.reduce((acc, r) => {
      acc[r.service] = (acc[r.service] || 0) + r.cost;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyTotal,
      budget: this.monthlyBudget,
      remaining: this.monthlyBudget - monthlyTotal,
      percentUsed: (monthlyTotal / this.monthlyBudget) * 100,
      breakdown,
      records: this.records,
    };
  }
}

export const costTracker = new CostTracker();
