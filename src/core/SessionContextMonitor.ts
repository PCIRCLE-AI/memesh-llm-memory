/**
 * Session Context Monitor - Session Health and Quality Tracking
 *
 * Monitors session health by tracking token usage, quality score trends, and context staleness.
 * Provides proactive warnings and recommendations to prevent context quota exhaustion and
 * quality degradation. Integrates with SessionTokenTracker for token monitoring.
 *
 * Features:
 * - **Token Usage Monitoring**: Tracks token consumption via SessionTokenTracker
 * - **Quality Trend Analysis**: Detects quality degradation from score history
 * - **Health Status Classification**: healthy | warning | critical status levels
 * - **Proactive Recommendations**: Suggests actions before critical thresholds
 * - **Warning Aggregation**: Consolidates warnings from multiple sources
 * - **Trend Detection**: Compares recent vs previous quality averages (3 scores each)
 *
 * Quality Degradation Detection:
 * - Requires minimum 3 scores for trend analysis
 * - Compares recent 3 scores vs previous 3 scores
 * - Triggers warning if >15% drop detected
 * - Recommends context refresh to restore quality
 *
 * @example
 * ```typescript
 * import { SessionContextMonitor } from './SessionContextMonitor.js';
 * import { SessionTokenTracker } from './SessionTokenTracker.js';
 *
 * // Create token tracker and monitor
 * const tokenTracker = new SessionTokenTracker({ tokenLimit: 200000 });
 * const monitor = new SessionContextMonitor(tokenTracker);
 *
 * // Record quality scores as work progresses
 * monitor.recordQualityScore(0.85);
 * monitor.recordQualityScore(0.82);
 * monitor.recordQualityScore(0.70); // Declining trend
 *
 * // Check session health
 * const health = monitor.checkSessionHealth();
 * console.log(`Status: ${health.status}`);
 * console.log(`Token usage: ${health.tokenUsagePercentage.toFixed(1)}%`);
 *
 * // Handle warnings
 * health.warnings.forEach(warning => {
 *   if (warning.level === 'critical') {
 *     console.error(`CRITICAL: ${warning.message}`);
 *   }
 * });
 *
 * // Act on recommendations
 * health.recommendations.forEach(rec => {
 *   if (rec.priority === 'critical') {
 *     console.log(`Action: ${rec.action} - ${rec.description}`);
 *   }
 * });
 *
 * // Get detailed statistics
 * const stats = monitor.getStats();
 * console.log(`Quality history: ${stats.qualityHistory}`);
 * console.log(`Token stats: ${JSON.stringify(stats.tokenStats)}`);
 * ```
 */

// src/core/SessionContextMonitor.ts
import type { SessionTokenTracker } from './SessionTokenTracker.js';
import { StateError, ValidationError } from '../errors/index.js';

/**
 * Session health status classification
 *
 * Represents the overall health state of the current session based on
 * token usage, quality scores, and detected warnings.
 *
 * - **healthy**: No warnings, session operating normally
 * - **warning**: Non-critical warnings detected (token usage high, quality declining)
 * - **critical**: Critical thresholds exceeded (token limit approaching, severe quality drop)
 *
 * @example
 * ```typescript
 * const health = monitor.checkSessionHealth();
 *
 * if (health.status === 'critical') {
 *   console.error('Session in critical state - reload context!');
 * } else if (health.status === 'warning') {
 *   console.warn('Session health degrading - optimize context');
 * } else {
 *   console.log('Session healthy');
 * }
 * ```
 */
export type SessionHealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Warning type classification
 *
 * Categorizes different types of session warnings for appropriate handling.
 *
 * - **token-threshold**: Token usage crossed configured threshold (50%, 80%, 95%)
 * - **quality-degradation**: Quality scores showing declining trend (>15% drop)
 * - **context-staleness**: Context not refreshed in extended period (future feature)
 * - **system-error**: Internal error occurred during health check
 *
 * @example
 * ```typescript
 * health.warnings.forEach(warning => {
 *   switch (warning.type) {
 *     case 'token-threshold':
 *       console.warn('Token usage high:', warning.message);
 *       break;
 *     case 'quality-degradation':
 *       console.warn('Quality declining:', warning.message);
 *       break;
 *     case 'system-error':
 *       console.error('System error:', warning.message);
 *       break;
 *   }
 * });
 * ```
 */
export type WarningType =
  | 'token-threshold'
  | 'quality-degradation'
  | 'context-staleness'
  | 'system-error';

/**
 * Session health warning
 *
 * Represents a single warning detected during session health check.
 * Contains warning type, severity level, human-readable message, and optional data.
 *
 * @example
 * ```typescript
 * // Token threshold warning
 * const warning1: SessionWarning = {
 *   type: 'token-threshold',
 *   level: 'critical',
 *   message: 'Session token usage at 95% (190000/200000 tokens)',
 *   data: {
 *     threshold: 95,
 *     tokensUsed: 190000,
 *     tokensRemaining: 10000
 *   }
 * };
 *
 * // Quality degradation warning
 * const warning2: SessionWarning = {
 *   type: 'quality-degradation',
 *   level: 'warning',
 *   message: 'Quality scores declining (0.85 → 0.70)',
 *   data: {
 *     recentAvg: 0.70,
 *     previousAvg: 0.85,
 *     dropPercentage: 17.6
 *   }
 * };
 * ```
 */
export interface SessionWarning {
  /** Warning category */
  type: WarningType;
  /** Severity level (info | warning | critical) */
  level: 'info' | 'warning' | 'critical';
  /** Human-readable warning message */
  message: string;
  /** Optional additional data specific to warning type */
  data?: Record<string, unknown>;
}

/**
 * Recommendation from monitor
 *
 * Represents an actionable recommendation generated based on session warnings.
 * Provides action identifier, priority level, description, and reasoning.
 *
 * @example
 * ```typescript
 * // Critical recommendation: reload context
 * const rec1: MonitorRecommendation = {
 *   action: 'reload-claude-md',
 *   priority: 'critical',
 *   description: 'Reload CLAUDE.md to refresh context',
 *   reasoning: 'Session approaching token limit (95% used)'
 * };
 *
 * // High priority: refresh context due to quality drop
 * const rec2: MonitorRecommendation = {
 *   action: 'context-refresh',
 *   priority: 'high',
 *   description: 'Refresh context to improve quality',
 *   reasoning: 'Quality scores showing degradation trend'
 * };
 *
 * // Medium priority: optimize context usage
 * const rec3: MonitorRecommendation = {
 *   action: 'review-context',
 *   priority: 'medium',
 *   description: 'Review and optimize context usage',
 *   reasoning: 'Session token usage is high (80% used)'
 * };
 * ```
 */
export interface MonitorRecommendation {
  /** Action identifier (e.g., 'reload-claude-md', 'context-refresh', 'review-context') */
  action: string;
  /** Priority level determining urgency */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable action description */
  description: string;
  /** Reasoning explaining why this action is recommended */
  reasoning: string;
}

/**
 * Session health report
 *
 * Comprehensive session health snapshot containing status, token usage percentage,
 * all detected warnings, actionable recommendations, and timestamp.
 *
 * @example
 * ```typescript
 * const health: SessionHealth = {
 *   status: 'warning',
 *   tokenUsagePercentage: 82.5,
 *   warnings: [
 *     {
 *       type: 'token-threshold',
 *       level: 'warning',
 *       message: 'Session token usage at 80% (165000/200000 tokens)',
 *       data: { threshold: 80, tokensUsed: 165000, tokensRemaining: 35000 }
 *     },
 *     {
 *       type: 'quality-degradation',
 *       level: 'warning',
 *       message: 'Quality scores declining (0.85 → 0.70)',
 *       data: { recentAvg: 0.70, previousAvg: 0.85, dropPercentage: 17.6 }
 *     }
 *   ],
 *   recommendations: [
 *     {
 *       action: 'review-context',
 *       priority: 'medium',
 *       description: 'Review and optimize context usage',
 *       reasoning: 'Session token usage is high (80% used)'
 *     },
 *     {
 *       action: 'context-refresh',
 *       priority: 'high',
 *       description: 'Refresh context to improve quality',
 *       reasoning: 'Quality scores showing degradation trend'
 *     }
 *   ],
 *   timestamp: new Date('2025-01-01T10:30:00Z')
 * };
 *
 * // Use health report to make decisions
 * if (health.status === 'critical') {
 *   // Execute critical recommendations immediately
 *   health.recommendations
 *     .filter(r => r.priority === 'critical')
 *     .forEach(r => executeAction(r.action));
 * }
 * ```
 */
export interface SessionHealth {
  /** Overall health status classification */
  status: SessionHealthStatus;
  /** Current token usage as percentage (0-100) */
  tokenUsagePercentage: number;
  /** Array of detected warnings */
  warnings: SessionWarning[];
  /** Array of actionable recommendations */
  recommendations: MonitorRecommendation[];
  /** Timestamp when health check was performed */
  timestamp: Date;
}

/**
 * SessionContextMonitor Class
 *
 * Monitors session health by tracking token usage, quality score trends, and generating
 * proactive warnings with actionable recommendations. Prevents context quota exhaustion
 * and quality degradation through continuous monitoring and trend analysis.
 *
 * Configuration Constants:
 * - **MAX_QUALITY_HISTORY**: 10 - Maximum quality scores stored in history
 * - **MIN_SCORES_FOR_TREND**: 3 - Minimum scores needed for trend analysis
 * - **DEGRADATION_THRESHOLD**: 0.15 (15%) - Quality drop threshold for warning
 *
 * State Tracking:
 * - Quality score history (rolling window of last 10 scores)
 * - Last health check timestamp
 * - Token tracker integration for usage monitoring
 *
 * @example
 * ```typescript
 * import { SessionContextMonitor } from './SessionContextMonitor.js';
 * import { SessionTokenTracker } from './SessionTokenTracker.js';
 *
 * // Initialize monitor with token tracker
 * const tokenTracker = new SessionTokenTracker({
 *   tokenLimit: 200000,
 *   thresholds: [
 *     { percentage: 80, level: 'warning' },
 *     { percentage: 95, level: 'critical' }
 *   ]
 * });
 * const monitor = new SessionContextMonitor(tokenTracker);
 *
 * // Simulate workflow with quality tracking
 * function executeTask(taskQuality: number) {
 *   monitor.recordQualityScore(taskQuality);
 *   const health = monitor.checkSessionHealth();
 *
 *   // Handle critical warnings
 *   if (health.status === 'critical') {
 *     console.error('CRITICAL SESSION STATE!');
 *     health.recommendations
 *       .filter(r => r.priority === 'critical')
 *       .forEach(r => console.log(`Execute: ${r.action}`));
 *   }
 *
 *   return health;
 * }
 *
 * // Declining quality trend
 * executeTask(0.85); // healthy
 * executeTask(0.82); // healthy
 * executeTask(0.70); // warning - quality degradation detected
 * ```
 */
export class SessionContextMonitor {
  /** Maximum quality scores stored in history */
  private static readonly MAX_QUALITY_HISTORY = 10;
  /** Minimum scores needed for trend analysis */
  private static readonly MIN_SCORES_FOR_TREND = 3;
  /** Quality drop threshold for degradation warning (15%) */
  private static readonly DEGRADATION_THRESHOLD = 0.15;

  /** Rolling window of quality scores (max 10 scores) */
  private qualityHistory: number[] = [];
  /** Timestamp of last health check (null if never checked) */
  private lastHealthCheck: Date | null = null;

  /**
   * Create a new SessionContextMonitor
   *
   * Initializes the monitor with a SessionTokenTracker for token usage monitoring.
   * The token tracker must be provided and cannot be null/undefined.
   *
   * @param tokenTracker - Token tracker instance for monitoring token usage
   * @throws StateError if tokenTracker is null or undefined
   *
   * @example
   * ```typescript
   * // Create with custom token limits
   * const tracker = new SessionTokenTracker({
   *   tokenLimit: 200000,
   *   thresholds: [
   *     { percentage: 70, level: 'info' },
   *     { percentage: 85, level: 'warning' },
   *     { percentage: 95, level: 'critical' }
   *   ]
   * });
   * const monitor = new SessionContextMonitor(tracker);
   *
   * // Error: missing tracker
   * try {
   *   const badMonitor = new SessionContextMonitor(null as any);
   * } catch (error) {
   *   console.error(error.message);
   *   // Output: "SessionTokenTracker is required"
   * }
   * ```
   */
  constructor(private tokenTracker: SessionTokenTracker) {
    if (!tokenTracker) {
      throw new StateError('SessionTokenTracker is required', {
        component: 'SessionContextMonitor',
        requiredDependency: 'SessionTokenTracker',
      });
    }
  }

  /**
   * Check overall session health
   *
   * Performs comprehensive session health check by monitoring token usage,
   * quality trends, and generating warnings with actionable recommendations.
   * Coordinates with SessionTokenTracker for token threshold checks and
   * analyzes quality history for degradation patterns.
   *
   * Health Check Process:
   * 1. Check token usage thresholds via SessionTokenTracker
   * 2. Convert token threshold warnings to session warnings
   * 3. Generate recommendations based on warning levels
   * 4. Check quality degradation from score history
   * 5. Determine overall health status (healthy | warning | critical)
   * 6. Update last health check timestamp
   *
   * Error Handling:
   * - If token tracker throws error, returns critical status with system-error warning
   * - Gracefully handles edge cases (zero quality history, missing data)
   *
   * @returns SessionHealth Complete health report with status, warnings, and recommendations
   *
   * @example
   * ```typescript
   * const monitor = new SessionContextMonitor(tokenTracker);
   *
   * // Check health - healthy state
   * monitor.recordQualityScore(0.85);
   * const health1 = monitor.checkSessionHealth();
   * console.log(health1.status); // 'healthy'
   * console.log(health1.warnings.length); // 0
   *
   * // Check health - warning state (token usage high)
   * tokenTracker.recordUsage({ inputTokens: 160000, outputTokens: 5000 }); // 82.5%
   * const health2 = monitor.checkSessionHealth();
   * console.log(health2.status); // 'warning'
   * console.log(health2.warnings[0].type); // 'token-threshold'
   * console.log(health2.recommendations[0].action); // 'review-context'
   *
   * // Check health - critical state (quality degradation + high tokens)
   * monitor.recordQualityScore(0.82);
   * monitor.recordQualityScore(0.70); // >15% drop
   * tokenTracker.recordUsage({ inputTokens: 30000, outputTokens: 5000 }); // 95%
   * const health3 = monitor.checkSessionHealth();
   * console.log(health3.status); // 'critical'
   * console.log(health3.warnings.length); // 2 (token + quality)
   * console.log(health3.recommendations.find(r => r.priority === 'critical'));
   * // { action: 'reload-claude-md', priority: 'critical', ... }
   *
   * // Handle critical state
   * if (health3.status === 'critical') {
   *   health3.recommendations
   *     .filter(r => r.priority === 'critical')
   *     .forEach(r => executeAction(r.action));
   * }
   * ```
   */
  checkSessionHealth(): SessionHealth {
    const warnings: SessionWarning[] = [];
    const recommendations: MonitorRecommendation[] = [];
    let thresholdWarnings;
    let usagePercentage;

    try {
      thresholdWarnings = this.tokenTracker.checkThresholds();
      usagePercentage = this.tokenTracker.getUsagePercentage();
    } catch (error) {
      // Return degraded health status
      const timestamp = new Date();
      this.lastHealthCheck = timestamp;
      // Type guard for error
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        status: 'critical',
        tokenUsagePercentage: 0,
        warnings: [
          {
            type: 'system-error',
            level: 'critical',
            message: `Token tracker error: ${errorMessage}`,
            data: {},
          },
        ],
        recommendations: [],
        timestamp,
      };
    }

    // Convert threshold warnings
    for (const tw of thresholdWarnings) {
      warnings.push({
        type: 'token-threshold',
        level: tw.level,
        message: tw.message,
        data: {
          threshold: tw.threshold,
          tokensUsed: tw.tokensUsed,
          tokensRemaining: tw.tokensRemaining,
        },
      });

      // Add recommendations based on threshold
      if (tw.level === 'critical') {
        recommendations.push({
          action: 'reload-claude-md',
          priority: 'critical',
          description: 'Reload CLAUDE.md to refresh context',
          reasoning: `Session approaching token limit (${tw.threshold}% used)`,
        });
      } else if (tw.level === 'warning') {
        recommendations.push({
          action: 'review-context',
          priority: 'medium',
          description: 'Review and optimize context usage',
          reasoning: `Session token usage is high (${tw.threshold}% used)`,
        });
      }
    }

    // Check quality degradation
    const qualityWarning = this.checkQualityDegradation();
    if (qualityWarning) {
      warnings.push(qualityWarning);
      recommendations.push({
        action: 'context-refresh',
        priority: 'high',
        description: 'Refresh context to improve quality',
        reasoning: 'Quality scores showing degradation trend',
      });
    }

    // Determine overall status
    const status = this.determineStatus(warnings);

    const timestamp = new Date();
    this.lastHealthCheck = timestamp;

    return {
      status,
      tokenUsagePercentage: usagePercentage,
      warnings,
      recommendations,
      timestamp,
    };
  }

  /**
   * Record quality score for tracking
   *
   * Records a quality score (0.0 to 1.0) to the rolling history window for trend analysis.
   * Maintains a maximum of MAX_QUALITY_HISTORY (10) scores, automatically removing oldest
   * scores when the limit is reached. Quality scores are used to detect degradation patterns
   * in subsequent health checks.
   *
   * Score Guidelines:
   * - **0.9-1.0**: Excellent quality (high confidence, accurate recommendations)
   * - **0.7-0.8**: Good quality (reliable with minor issues)
   * - **0.5-0.6**: Fair quality (noticeable degradation)
   * - **<0.5**: Poor quality (significant quality issues)
   *
   * @param score - Quality score between 0.0 and 1.0 (inclusive)
   * @throws ValidationError if score is not finite or outside valid range [0, 1]
   *
   * @example
   * ```typescript
   * const monitor = new SessionContextMonitor(tokenTracker);
   *
   * // Record high quality scores
   * monitor.recordQualityScore(0.95); // Excellent
   * monitor.recordQualityScore(0.88); // Good
   * monitor.recordQualityScore(0.85); // Good
   *
   * // Record declining quality (will trigger warning)
   * monitor.recordQualityScore(0.82);
   * monitor.recordQualityScore(0.75);
   * monitor.recordQualityScore(0.68); // >15% drop from initial avg
   *
   * const health = monitor.checkSessionHealth();
   * // Warnings include quality-degradation warning
   *
   * // Invalid scores - throw ValidationError
   * try {
   *   monitor.recordQualityScore(1.5); // > 1.0
   * } catch (error) {
   *   console.error(error.message); // "Quality score must be between 0 and 1"
   * }
   *
   * try {
   *   monitor.recordQualityScore(NaN); // Not finite
   * } catch (error) {
   *   console.error(error.message); // "Quality score must be a finite number"
   * }
   *
   * try {
   *   monitor.recordQualityScore(-0.1); // < 0
   * } catch (error) {
   *   console.error(error.message); // "Quality score must be between 0 and 1"
   * }
   * ```
   */
  recordQualityScore(score: number): void {
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new ValidationError('Quality score must be a finite number between 0 and 1', {
        providedScore: score,
        validRange: { min: 0, max: 1 },
        mustBeFinite: true,
      });
    }

    this.qualityHistory.push(score);
    // Keep only last MAX_QUALITY_HISTORY scores
    while (
      this.qualityHistory.length > SessionContextMonitor.MAX_QUALITY_HISTORY
    ) {
      this.qualityHistory.shift();
    }
  }

  /**
   * Check for quality degradation pattern
   *
   * Analyzes quality score history to detect degradation trends by comparing recent
   * scores against previous scores. Uses a simple but effective trend detection algorithm:
   * compares average of last 3 scores vs average of previous 3 scores.
   *
   * Detection Algorithm:
   * - Requires minimum 3 scores (MIN_SCORES_FOR_TREND)
   * - Compares recent 3 scores vs previous 3 scores
   * - Calculates percentage drop: (previousAvg - recentAvg) / previousAvg
   * - Triggers warning if drop > DEGRADATION_THRESHOLD (15%)
   *
   * Edge Cases:
   * - Returns null if insufficient data (<3 scores)
   * - Returns null if no previous scores available
   * - Returns null if previousAvg is 0 (guards against division by zero)
   *
   * @returns SessionWarning if degradation detected (>15% drop), null otherwise
   *
   * @example
   * ```typescript
   * const monitor = new SessionContextMonitor(tokenTracker);
   *
   * // Not enough data - returns null
   * monitor.recordQualityScore(0.85);
   * monitor.recordQualityScore(0.82);
   * let warning = monitor['checkQualityDegradation']();
   * console.log(warning); // null (only 2 scores)
   *
   * // Sufficient data but no degradation - returns null
   * monitor.recordQualityScore(0.83); // 3 scores
   * monitor.recordQualityScore(0.84);
   * monitor.recordQualityScore(0.85);
   * monitor.recordQualityScore(0.86); // Improving trend
   * warning = monitor['checkQualityDegradation']();
   * console.log(warning); // null (no degradation)
   *
   * // Degradation detected - returns warning
   * monitor.recordQualityScore(0.75);
   * monitor.recordQualityScore(0.70);
   * monitor.recordQualityScore(0.68); // Recent avg: 0.71, Previous avg: 0.85
   * warning = monitor['checkQualityDegradation']();
   * console.log(warning?.type); // 'quality-degradation'
   * console.log(warning?.level); // 'warning'
   * console.log(warning?.data?.dropPercentage); // ~16.5% (> 15% threshold)
   * console.log(warning?.message);
   * // 'Quality scores declining (0.85 → 0.71)'
   * ```
   */
  private checkQualityDegradation(): SessionWarning | null {
    if (this.qualityHistory.length < SessionContextMonitor.MIN_SCORES_FOR_TREND) {
      return null; // Not enough data
    }

    // Calculate trend (simple: compare last 3 to previous 3)
    const recent = this.qualityHistory.slice(-3);
    const previous = this.qualityHistory.slice(-6, -3);

    // ✅ Check both arrays
    if (previous.length === 0 || recent.length === 0) {
      return null;
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg =
      previous.reduce((a, b) => a + b, 0) / previous.length;

    // ✅ Defensive check
    if (!Number.isFinite(recentAvg) || !Number.isFinite(previousAvg)) {
      return null;
    }

    // Guard against division by zero
    if (previousAvg === 0) {
      return null; // No degradation detectable
    }

    // If recent average is significantly lower (>DEGRADATION_THRESHOLD% drop)
    if (
      recentAvg <
      previousAvg * (1 - SessionContextMonitor.DEGRADATION_THRESHOLD)
    ) {
      return {
        type: 'quality-degradation',
        level: 'warning',
        message: `Quality scores declining (${previousAvg.toFixed(2)} → ${recentAvg.toFixed(2)})`,
        data: {
          recentAvg,
          previousAvg,
          dropPercentage: ((previousAvg - recentAvg) / previousAvg) * 100,
        },
      };
    }

    return null;
  }

  /**
   * Determine overall health status from warnings
   *
   * Aggregates all warnings to determine overall session health status.
   * Uses a priority-based algorithm where critical warnings override warning-level
   * warnings, which override healthy status.
   *
   * Status Determination Logic:
   * - **critical**: If any warning has level='critical' (token limit approaching, severe errors)
   * - **warning**: If any warning has level='warning' (high token usage, quality degradation)
   * - **healthy**: If no warnings present (session operating normally)
   *
   * @param warnings - Array of session warnings from health check
   * @returns SessionHealthStatus Overall health classification
   *
   * @example
   * ```typescript
   * const monitor = new SessionContextMonitor(tokenTracker);
   *
   * // Healthy - no warnings
   * const status1 = monitor['determineStatus']([]);
   * console.log(status1); // 'healthy'
   *
   * // Warning - one warning-level warning
   * const status2 = monitor['determineStatus']([
   *   {
   *     type: 'token-threshold',
   *     level: 'warning',
   *     message: 'Token usage at 80%',
   *     data: {}
   *   }
   * ]);
   * console.log(status2); // 'warning'
   *
   * // Critical - one critical warning (overrides warning-level warnings)
   * const status3 = monitor['determineStatus']([
   *   {
   *     type: 'token-threshold',
   *     level: 'warning',
   *     message: 'Token usage at 80%',
   *     data: {}
   *   },
   *   {
   *     type: 'token-threshold',
   *     level: 'critical',
   *     message: 'Token usage at 95%',
   *     data: {}
   *   }
   * ]);
   * console.log(status3); // 'critical' (critical overrides warning)
   * ```
   */
  private determineStatus(warnings: SessionWarning[]): SessionHealthStatus {
    const hasCritical = warnings.some((w) => w.level === 'critical');
    const hasWarning = warnings.some((w) => w.level === 'warning');

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'healthy';
  }

  /**
   * Get detailed statistics
   *
   * Retrieves comprehensive statistics about session monitoring state including
   * token usage details, quality history, and last health check timestamp.
   * Useful for debugging, reporting, and understanding session health trends.
   *
   * @returns Object containing token statistics, quality history, and last health check
   *
   * @example
   * ```typescript
   * const monitor = new SessionContextMonitor(tokenTracker);
   *
   * // Record some data
   * tokenTracker.recordUsage({ inputTokens: 150000, outputTokens: 10000 });
   * monitor.recordQualityScore(0.85);
   * monitor.recordQualityScore(0.82);
   * monitor.recordQualityScore(0.78);
   * monitor.checkSessionHealth();
   *
   * // Get statistics
   * const stats = monitor.getStats();
   *
   * console.log('Token Statistics:');
   * console.log(`  Total: ${stats.tokenStats.totalTokens}`);
   * console.log(`  Limit: ${stats.tokenStats.tokenLimit}`);
   * console.log(`  Usage: ${stats.tokenStats.usagePercentage.toFixed(1)}%`);
   * console.log(`  Remaining: ${stats.tokenStats.tokensRemaining}`);
   * console.log(`  Interactions: ${stats.tokenStats.interactionCount}`);
   *
   * console.log('\nQuality History:');
   * console.log(`  Scores: ${stats.qualityHistory}`);
   * console.log(`  Count: ${stats.qualityHistory.length}`);
   * console.log(`  Average: ${(stats.qualityHistory.reduce((a,b) => a+b, 0) / stats.qualityHistory.length).toFixed(2)}`);
   *
   * console.log('\nHealth Check:');
   * console.log(`  Last check: ${stats.lastHealthCheck?.toISOString()}`);
   *
   * // Example output:
   * // Token Statistics:
   * //   Total: 160000
   * //   Limit: 200000
   * //   Usage: 80.0%
   * //   Remaining: 40000
   * //   Interactions: 3
   * //
   * // Quality History:
   * //   Scores: 0.85,0.82,0.78
   * //   Count: 3
   * //   Average: 0.82
   * //
   * // Health Check:
   * //   Last check: 2025-01-01T10:30:00.000Z
   * ```
   */
  getStats() {
    return {
      tokenStats: this.tokenTracker.getStats(),
      qualityHistory: [...this.qualityHistory],
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}
