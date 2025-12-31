// src/core/SessionContextMonitor.ts
import type { SessionTokenTracker } from './SessionTokenTracker.js';
import type { ThresholdWarning } from './SessionTokenTracker.js';
import { StateError, ValidationError } from '../errors/index.js';

/**
 * Session health status
 */
export type SessionHealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Warning types
 */
export type WarningType =
  | 'token-threshold'
  | 'quality-degradation'
  | 'context-staleness'
  | 'system-error';

/**
 * Session health warning
 */
export interface SessionWarning {
  type: WarningType;
  level: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Recommendation from monitor
 */
export interface MonitorRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reasoning: string;
}

/**
 * Session health report
 */
export interface SessionHealth {
  status: SessionHealthStatus;
  tokenUsagePercentage: number;
  warnings: SessionWarning[];
  recommendations: MonitorRecommendation[];
  timestamp: Date;
}

/**
 * Monitors session context including tokens and quality
 */
export class SessionContextMonitor {
  private static readonly MAX_QUALITY_HISTORY = 10;
  private static readonly MIN_SCORES_FOR_TREND = 3;
  private static readonly DEGRADATION_THRESHOLD = 0.15;

  private qualityHistory: number[] = [];
  private lastHealthCheck: Date | null = null;

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
      return {
        status: 'critical',
        tokenUsagePercentage: 0,
        warnings: [
          {
            type: 'system-error',
            level: 'critical',
            message: `Token tracker error: ${error.message}`,
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
   */
  private checkQualityDegradation(): SessionWarning | null {
    if (this.qualityHistory.length < SessionContextMonitor.MIN_SCORES_FOR_TREND) {
      return null; // Not enough data
    }

    // Calculate trend (simple: compare last 3 to previous 3)
    const recent = this.qualityHistory.slice(-3);
    const previous = this.qualityHistory.slice(-6, -3);

    if (previous.length === 0) {
      return null;
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg =
      previous.reduce((a, b) => a + b, 0) / previous.length;

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
   */
  getStats() {
    return {
      tokenStats: this.tokenTracker.getStats(),
      qualityHistory: [...this.qualityHistory],
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}
