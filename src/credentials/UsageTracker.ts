/**
 * Credential Usage Tracker
 *
 * Tracks credential usage patterns and provides analytics:
 * - Access frequency and patterns
 * - Authentication success/failure rates
 * - Performance metrics (response times)
 * - Usage trends and anomaly detection
 * - Service and account-level statistics
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * Usage event type
 */
export enum UsageEventType {
  ACCESS = 'access',
  ACCESS_DENIED = 'access_denied',
  AUTHENTICATION_SUCCESS = 'auth_success',
  AUTHENTICATION_FAILURE = 'auth_failure',
  ROTATION = 'rotation',
  EXPIRATION_WARNING = 'expiration_warning',
}

/**
 * Usage event
 */
export interface UsageEvent {
  id?: number;
  eventType: UsageEventType;
  service: string;
  account: string;
  timestamp: Date;
  responseTimeMs?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Usage statistics for a credential
 */
export interface CredentialUsageStats {
  service: string;
  account: string;
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  successRate: number;
  averageResponseTimeMs: number;
  lastAccessed?: Date;
  firstAccessed?: Date;
  uniqueUsers: number;
  accessesLast24h: number;
  accessesLast7d: number;
  accessesLast30d: number;
}

/**
 * Service-level usage statistics
 */
export interface ServiceUsageStats {
  service: string;
  totalCredentials: number;
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  successRate: number;
  averageResponseTimeMs: number;
  mostAccessedAccount: string;
  leastAccessedAccount: string;
  accessesLast24h: number;
}

/**
 * Usage trends
 */
export interface UsageTrends {
  period: string; // 'hourly', 'daily', 'weekly', 'monthly'
  dataPoints: Array<{
    timestamp: Date;
    accesses: number;
    successRate: number;
    averageResponseTimeMs: number;
  }>;
}

/**
 * Anomaly detection result
 */
export interface UsageAnomaly {
  service: string;
  account: string;
  anomalyType: 'spike' | 'drop' | 'unusual_time' | 'unusual_user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  baseline: number;
  current: number;
  deviationPercent: number;
}

/**
 * Usage Tracker Service
 */
export class UsageTracker {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeSchema();
  }

  /**
   * Initialize usage tracker schema
   */
  private initializeSchema(): void {
    // Usage events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        response_time_ms INTEGER,
        user_id TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp
        ON usage_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_usage_events_service_account
        ON usage_events(service, account);
      CREATE INDEX IF NOT EXISTS idx_usage_events_type
        ON usage_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_usage_events_user
        ON usage_events(user_id);
    `);

    // Usage statistics cache (materialized view)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_stats_cache (
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        total_accesses INTEGER NOT NULL,
        successful_accesses INTEGER NOT NULL,
        failed_accesses INTEGER NOT NULL,
        avg_response_time_ms REAL NOT NULL,
        last_accessed INTEGER,
        first_accessed INTEGER,
        unique_users INTEGER NOT NULL,
        accesses_last_24h INTEGER NOT NULL,
        accesses_last_7d INTEGER NOT NULL,
        accesses_last_30d INTEGER NOT NULL,
        last_updated INTEGER NOT NULL,
        PRIMARY KEY (service, account)
      );

      CREATE INDEX IF NOT EXISTS idx_usage_stats_cache_updated
        ON usage_stats_cache(last_updated);
    `);

    logger.info('Usage tracker schema initialized');
  }

  /**
   * Track a usage event
   */
  trackEvent(event: UsageEvent): void {
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO usage_events (
          event_type, service, account, timestamp, response_time_ms, user_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.eventType,
        event.service,
        event.account,
        event.timestamp.getTime(),
        event.responseTimeMs || null,
        event.userId || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        now
      );

    // Invalidate stats cache for this credential
    this.invalidateStatsCache(event.service, event.account);

    logger.debug('Usage event tracked', {
      eventType: event.eventType,
      service: event.service,
      account: event.account,
    });
  }

  /**
   * Get usage statistics for a credential
   */
  getCredentialStats(service: string, account: string): CredentialUsageStats {
    // Check cache first
    const cached = this.db
      .prepare(
        `SELECT * FROM usage_stats_cache
         WHERE service = ? AND account = ?`
      )
      .get(service, account) as any;

    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    if (cached && now - cached.last_updated < cacheMaxAge) {
      return this.mapCachedStats(cached);
    }

    // Calculate fresh stats
    const stats = this.calculateCredentialStats(service, account);

    // Update cache
    this.db
      .prepare(
        `INSERT OR REPLACE INTO usage_stats_cache (
          service, account, total_accesses, successful_accesses, failed_accesses,
          avg_response_time_ms, last_accessed, first_accessed, unique_users,
          accesses_last_24h, accesses_last_7d, accesses_last_30d, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        service,
        account,
        stats.totalAccesses,
        stats.successfulAccesses,
        stats.failedAccesses,
        stats.averageResponseTimeMs,
        stats.lastAccessed?.getTime() || null,
        stats.firstAccessed?.getTime() || null,
        stats.uniqueUsers,
        stats.accessesLast24h,
        stats.accessesLast7d,
        stats.accessesLast30d,
        now
      );

    return stats;
  }

  /**
   * Calculate credential usage statistics
   */
  private calculateCredentialStats(
    service: string,
    account: string
  ): CredentialUsageStats {
    const now = Date.now();

    // Total accesses
    const total = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ?
         AND event_type IN (?, ?)`
      )
      .get(service, account, UsageEventType.ACCESS, UsageEventType.ACCESS_DENIED) as {
      count: number;
    };

    // Successful accesses
    const successful = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ? AND event_type = ?`
      )
      .get(service, account, UsageEventType.ACCESS) as { count: number };

    // Failed accesses
    const failed = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ? AND event_type = ?`
      )
      .get(service, account, UsageEventType.ACCESS_DENIED) as { count: number };

    // Average response time
    const avgResponseTime = this.db
      .prepare(
        `SELECT AVG(response_time_ms) as avg FROM usage_events
         WHERE service = ? AND account = ? AND response_time_ms IS NOT NULL`
      )
      .get(service, account) as { avg: number | null };

    // Last accessed
    const lastAccess = this.db
      .prepare(
        `SELECT MAX(timestamp) as last FROM usage_events
         WHERE service = ? AND account = ?`
      )
      .get(service, account) as { last: number | null };

    // First accessed
    const firstAccess = this.db
      .prepare(
        `SELECT MIN(timestamp) as first FROM usage_events
         WHERE service = ? AND account = ?`
      )
      .get(service, account) as { first: number | null };

    // Unique users
    const uniqueUsers = this.db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) as count FROM usage_events
         WHERE service = ? AND account = ? AND user_id IS NOT NULL`
      )
      .get(service, account) as { count: number };

    // Accesses in different time periods
    const last24h = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ? AND timestamp >= ?`
      )
      .get(service, account, now - 24 * 60 * 60 * 1000) as { count: number };

    const last7d = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ? AND timestamp >= ?`
      )
      .get(service, account, now - 7 * 24 * 60 * 60 * 1000) as { count: number };

    const last30d = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ? AND timestamp >= ?`
      )
      .get(service, account, now - 30 * 24 * 60 * 60 * 1000) as { count: number };

    const successRate = total.count > 0 ? (successful.count / total.count) * 100 : 0;

    return {
      service,
      account,
      totalAccesses: total.count,
      successfulAccesses: successful.count,
      failedAccesses: failed.count,
      successRate,
      averageResponseTimeMs: avgResponseTime.avg || 0,
      lastAccessed: lastAccess.last ? new Date(lastAccess.last) : undefined,
      firstAccessed: firstAccess.first ? new Date(firstAccess.first) : undefined,
      uniqueUsers: uniqueUsers.count,
      accessesLast24h: last24h.count,
      accessesLast7d: last7d.count,
      accessesLast30d: last30d.count,
    };
  }

  /**
   * Map cached stats to CredentialUsageStats
   */
  private mapCachedStats(cached: any): CredentialUsageStats {
    const successRate =
      cached.total_accesses > 0
        ? (cached.successful_accesses / cached.total_accesses) * 100
        : 0;

    return {
      service: cached.service,
      account: cached.account,
      totalAccesses: cached.total_accesses,
      successfulAccesses: cached.successful_accesses,
      failedAccesses: cached.failed_accesses,
      successRate,
      averageResponseTimeMs: cached.avg_response_time_ms,
      lastAccessed: cached.last_accessed ? new Date(cached.last_accessed) : undefined,
      firstAccessed: cached.first_accessed ? new Date(cached.first_accessed) : undefined,
      uniqueUsers: cached.unique_users,
      accessesLast24h: cached.accesses_last_24h,
      accessesLast7d: cached.accesses_last_7d,
      accessesLast30d: cached.accesses_last_30d,
    };
  }

  /**
   * Get service-level usage statistics
   */
  getServiceStats(service: string): ServiceUsageStats {
    const now = Date.now();

    // Total credentials for this service
    const credentials = this.db
      .prepare(
        `SELECT COUNT(DISTINCT account) as count FROM usage_events
         WHERE service = ?`
      )
      .get(service) as { count: number };

    // Total accesses
    const total = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND event_type IN (?, ?)`
      )
      .get(service, UsageEventType.ACCESS, UsageEventType.ACCESS_DENIED) as {
      count: number;
    };

    // Successful accesses
    const successful = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND event_type = ?`
      )
      .get(service, UsageEventType.ACCESS) as { count: number };

    // Failed accesses
    const failed = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND event_type = ?`
      )
      .get(service, UsageEventType.ACCESS_DENIED) as { count: number };

    // Average response time
    const avgResponseTime = this.db
      .prepare(
        `SELECT AVG(response_time_ms) as avg FROM usage_events
         WHERE service = ? AND response_time_ms IS NOT NULL`
      )
      .get(service) as { avg: number | null };

    // Most accessed account
    const mostAccessed = this.db
      .prepare(
        `SELECT account, COUNT(*) as count FROM usage_events
         WHERE service = ?
         GROUP BY account
         ORDER BY count DESC
         LIMIT 1`
      )
      .get(service) as { account: string; count: number } | undefined;

    // Least accessed account
    const leastAccessed = this.db
      .prepare(
        `SELECT account, COUNT(*) as count FROM usage_events
         WHERE service = ?
         GROUP BY account
         ORDER BY count ASC
         LIMIT 1`
      )
      .get(service) as { account: string; count: number } | undefined;

    // Accesses in last 24h
    const last24h = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND timestamp >= ?`
      )
      .get(service, now - 24 * 60 * 60 * 1000) as { count: number };

    const successRate = total.count > 0 ? (successful.count / total.count) * 100 : 0;

    return {
      service,
      totalCredentials: credentials.count,
      totalAccesses: total.count,
      successfulAccesses: successful.count,
      failedAccesses: failed.count,
      successRate,
      averageResponseTimeMs: avgResponseTime.avg || 0,
      mostAccessedAccount: mostAccessed?.account || '',
      leastAccessedAccount: leastAccessed?.account || '',
      accessesLast24h: last24h.count,
    };
  }

  /**
   * Get usage trends over time
   */
  getUsageTrends(
    service: string,
    account: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    points: number = 24
  ): UsageTrends {
    const intervalMs = this.getIntervalMs(period);
    const now = Date.now();
    const startTime = now - intervalMs * points;

    const dataPoints: Array<{
      timestamp: Date;
      accesses: number;
      successRate: number;
      averageResponseTimeMs: number;
    }> = [];

    for (let i = 0; i < points; i++) {
      const bucketStart = startTime + i * intervalMs;
      const bucketEnd = bucketStart + intervalMs;

      // Count accesses in this bucket
      const accesses = this.db
        .prepare(
          `SELECT COUNT(*) as count FROM usage_events
           WHERE service = ? AND account = ?
           AND timestamp >= ? AND timestamp < ?
           AND event_type IN (?, ?)`
        )
        .get(
          service,
          account,
          bucketStart,
          bucketEnd,
          UsageEventType.ACCESS,
          UsageEventType.ACCESS_DENIED
        ) as { count: number };

      // Count successful accesses
      const successful = this.db
        .prepare(
          `SELECT COUNT(*) as count FROM usage_events
           WHERE service = ? AND account = ?
           AND timestamp >= ? AND timestamp < ?
           AND event_type = ?`
        )
        .get(service, account, bucketStart, bucketEnd, UsageEventType.ACCESS) as {
        count: number;
      };

      // Average response time
      const avgResponseTime = this.db
        .prepare(
          `SELECT AVG(response_time_ms) as avg FROM usage_events
           WHERE service = ? AND account = ?
           AND timestamp >= ? AND timestamp < ?
           AND response_time_ms IS NOT NULL`
        )
        .get(service, account, bucketStart, bucketEnd) as { avg: number | null };

      const successRate = accesses.count > 0 ? (successful.count / accesses.count) * 100 : 0;

      dataPoints.push({
        timestamp: new Date(bucketStart),
        accesses: accesses.count,
        successRate,
        averageResponseTimeMs: avgResponseTime.avg || 0,
      });
    }

    return {
      period,
      dataPoints,
    };
  }

  /**
   * Get interval in milliseconds for a period
   * @throws {Error} If period is invalid
   */
  private getIntervalMs(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): number {
    // Runtime validation to prevent type coercion bypasses
    const validPeriods = ['hourly', 'daily', 'weekly', 'monthly'] as const;
    if (!validPeriods.includes(period as any)) {
      throw new Error(`Invalid period: ${period}. Must be one of: ${validPeriods.join(', ')}`);
    }

    switch (period) {
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = period;
        throw new Error(`Unhandled period: ${_exhaustive}`);
    }
  }

  /**
   * Detect usage anomalies
   */
  detectAnomalies(service: string, account: string): UsageAnomaly[] {
    const anomalies: UsageAnomaly[] = [];

    // Get baseline (last 30 days excluding last 24h)
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last30d = now - 30 * 24 * 60 * 60 * 1000;

    const baseline = this.db
      .prepare(
        `SELECT COUNT(*) / 29.0 as avg FROM usage_events
         WHERE service = ? AND account = ?
         AND timestamp >= ? AND timestamp < ?`
      )
      .get(service, account, last30d, last24h) as { avg: number };

    // Get current (last 24h)
    const current = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_events
         WHERE service = ? AND account = ?
         AND timestamp >= ?`
      )
      .get(service, account, last24h) as { count: number };

    // Detect spike (> 200% of baseline)
    if (baseline.avg > 0 && current.count > baseline.avg * 2) {
      const deviation = ((current.count - baseline.avg) / baseline.avg) * 100;

      anomalies.push({
        service,
        account,
        anomalyType: 'spike',
        severity: deviation > 500 ? 'critical' : deviation > 300 ? 'high' : 'medium',
        description: `Usage spike detected: ${current.count} accesses vs baseline ${baseline.avg.toFixed(1)}`,
        detectedAt: new Date(),
        baseline: baseline.avg,
        current: current.count,
        deviationPercent: deviation,
      });
    }

    // Detect drop (< 20% of baseline)
    if (baseline.avg > 5 && current.count < baseline.avg * 0.2) {
      const deviation = ((baseline.avg - current.count) / baseline.avg) * 100;

      anomalies.push({
        service,
        account,
        anomalyType: 'drop',
        severity: current.count === 0 ? 'critical' : deviation > 90 ? 'high' : 'medium',
        description: `Usage drop detected: ${current.count} accesses vs baseline ${baseline.avg.toFixed(1)}`,
        detectedAt: new Date(),
        baseline: baseline.avg,
        current: current.count,
        deviationPercent: deviation,
      });
    }

    return anomalies;
  }

  /**
   * Invalidate stats cache for a credential
   */
  private invalidateStatsCache(service: string, account: string): void {
    this.db
      .prepare(`DELETE FROM usage_stats_cache WHERE service = ? AND account = ?`)
      .run(service, account);
  }

  /**
   * Clean up old usage events
   */
  cleanupOldEvents(olderThanDays: number = 90): number {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const result = this.db
      .prepare('DELETE FROM usage_events WHERE timestamp < ?')
      .run(cutoffTime);

    logger.info('Old usage events cleaned up', {
      deletedRecords: result.changes,
      olderThanDays,
    });

    return result.changes;
  }

  /**
   * Refresh all stats cache
   */
  refreshAllStatsCache(): number {
    // Get all unique service/account pairs
    const credentials = this.db
      .prepare(
        `SELECT DISTINCT service, account FROM usage_events
         ORDER BY service, account`
      )
      .all() as Array<{ service: string; account: string }>;

    let refreshed = 0;

    for (const cred of credentials) {
      this.invalidateStatsCache(cred.service, cred.account);
      this.getCredentialStats(cred.service, cred.account); // This will recalculate and cache
      refreshed++;
    }

    logger.info('Stats cache refreshed', { credentialsRefreshed: refreshed });

    return refreshed;
  }
}
