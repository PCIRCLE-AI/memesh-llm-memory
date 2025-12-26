/**
 * Credential System Health Checker
 *
 * Comprehensive health monitoring:
 * - System-level health status
 * - Component health checks (storage, rotation, expiration, usage)
 * - Performance metrics
 * - Resource utilization
 * - Integration status
 * - Health check API
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { RotationService } from './RotationService.js';
import { ExpirationMonitor } from './ExpirationMonitor.js';
import { UsageTracker } from './UsageTracker.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
}

/**
 * Component health check result
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
  responseTimeMs?: number;
  lastChecked: Date;
}

/**
 * System health summary
 */
export interface SystemHealth {
  status: HealthStatus;
  components: ComponentHealth[];
  timestamp: Date;
  uptime: number;
  version: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  databaseSize: number;
  totalCredentials: number;
  totalRotations: number;
  totalUsageEvents: number;
  averageQueryTimeMs: number;
  cacheHitRate: number;
}

/**
 * Resource utilization
 */
export interface ResourceUtilization {
  databaseSizeMB: number;
  credentialCount: number;
  rotationJobsCount: number;
  expirationWarningsCount: number;
  usageEventsCount: number;
  auditLogsCount: number;
}

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  checkInterval: number; // seconds
  performanceThresholds: {
    maxQueryTimeMs: number;
    minCacheHitRate: number;
    maxDatabaseSizeMB: number;
  };
  componentTimeouts: {
    database: number;
    rotation: number;
    expiration: number;
    usage: number;
  };
}

/**
 * Default health check configuration
 */
const DEFAULT_CONFIG: HealthCheckConfig = {
  checkInterval: 60,
  performanceThresholds: {
    maxQueryTimeMs: 100,
    minCacheHitRate: 0.8,
    maxDatabaseSizeMB: 1024,
  },
  componentTimeouts: {
    database: 5000,
    rotation: 3000,
    expiration: 3000,
    usage: 3000,
  },
};

/**
 * Health Checker Service
 */
export class HealthChecker {
  private db: Database.Database;
  private rotationService?: RotationService;
  private expirationMonitor?: ExpirationMonitor;
  private usageTracker?: UsageTracker;
  private config: HealthCheckConfig;
  private startTime: Date;
  private version: string;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck?: SystemHealth;

  constructor(
    db: Database.Database,
    config: Partial<HealthCheckConfig> = {},
    version: string = '1.0.0'
  ) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
    this.version = version;
  }

  /**
   * Register optional services for health checks
   */
  registerServices(services: {
    rotationService?: RotationService;
    expirationMonitor?: ExpirationMonitor;
    usageTracker?: UsageTracker;
  }): void {
    this.rotationService = services.rotationService;
    this.expirationMonitor = services.expirationMonitor;
    this.usageTracker = services.usageTracker;

    logger.info('Health checker services registered', {
      rotation: !!this.rotationService,
      expiration: !!this.expirationMonitor,
      usage: !!this.usageTracker,
    });
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];

    // Check database health
    components.push(await this.checkDatabaseHealth());

    // Check rotation service health
    if (this.rotationService) {
      components.push(await this.checkRotationServiceHealth());
    }

    // Check expiration monitor health
    if (this.expirationMonitor) {
      components.push(await this.checkExpirationMonitorHealth());
    }

    // Check usage tracker health
    if (this.usageTracker) {
      components.push(await this.checkUsageTrackerHealth());
    }

    // Determine overall system status
    const overallStatus = this.determineOverallStatus(components);

    const health: SystemHealth = {
      status: overallStatus,
      components,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: this.version,
    };

    this.lastHealthCheck = health;

    logger.info('Health check completed', {
      status: overallStatus,
      componentsChecked: components.length,
    });

    return health;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test database connectivity
      const result = this.db.prepare('SELECT 1 as test').get() as { test: number };

      if (result.test !== 1) {
        return {
          name: 'database',
          status: HealthStatus.CRITICAL,
          message: 'Database query returned unexpected result',
          responseTimeMs: Date.now() - startTime,
          lastChecked: new Date(),
        };
      }

      // Get database statistics
      const stats = this.getDatabaseStats();

      // Check performance
      const responseTime = Date.now() - startTime;
      const status =
        responseTime > this.config.performanceThresholds.maxQueryTimeMs
          ? HealthStatus.DEGRADED
          : HealthStatus.HEALTHY;

      return {
        name: 'database',
        status,
        message: 'Database is operational',
        details: {
          responseTimeMs: responseTime,
          ...stats,
        },
        responseTimeMs: responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.CRITICAL,
        message: `Database error: ${(error as Error).message}`,
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check rotation service health
   */
  private async checkRotationServiceHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      if (!this.rotationService) {
        return {
          name: 'rotation_service',
          status: HealthStatus.UNHEALTHY,
          message: 'Rotation service not registered',
          lastChecked: new Date(),
        };
      }

      // Get rotation stats
      const stats = this.rotationService.getStats();

      // Check for high failure rate
      const failureRate =
        stats.totalRotations > 0 ? stats.failedRotations / stats.totalRotations : 0;

      let status = HealthStatus.HEALTHY;
      let message = 'Rotation service is operational';

      if (failureRate > 0.5) {
        status = HealthStatus.CRITICAL;
        message = `High rotation failure rate: ${(failureRate * 100).toFixed(1)}%`;
      } else if (failureRate > 0.2) {
        status = HealthStatus.DEGRADED;
        message = `Elevated rotation failure rate: ${(failureRate * 100).toFixed(1)}%`;
      }

      // Check scheduler status
      const schedulerRunning = this.rotationService.isSchedulerRunning();
      if (!schedulerRunning && stats.credentialsNeedingRotation > 0) {
        status = HealthStatus.DEGRADED;
        message = 'Rotation scheduler not running but credentials need rotation';
      }

      return {
        name: 'rotation_service',
        status,
        message,
        details: {
          totalRotations: stats.totalRotations,
          successfulRotations: stats.successfulRotations,
          failedRotations: stats.failedRotations,
          failureRate: (failureRate * 100).toFixed(1) + '%',
          credentialsNeedingRotation: stats.credentialsNeedingRotation,
          schedulerRunning,
        },
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'rotation_service',
        status: HealthStatus.UNHEALTHY,
        message: `Rotation service error: ${(error as Error).message}`,
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check expiration monitor health
   */
  private async checkExpirationMonitorHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      if (!this.expirationMonitor) {
        return {
          name: 'expiration_monitor',
          status: HealthStatus.UNHEALTHY,
          message: 'Expiration monitor not registered',
          lastChecked: new Date(),
        };
      }

      // Get expiration stats
      const stats = this.expirationMonitor.getStats();

      let status = HealthStatus.HEALTHY;
      let message = 'Expiration monitor is operational';

      // Check for critical expirations
      if (stats.expiringCritical > 0) {
        status = HealthStatus.CRITICAL;
        message = `${stats.expiringCritical} credentials expiring within 24 hours`;
      } else if (stats.expiringHigh > 5) {
        status = HealthStatus.DEGRADED;
        message = `${stats.expiringHigh} credentials expiring within 3 days`;
      } else if (stats.expiredCredentials > 0) {
        status = HealthStatus.DEGRADED;
        message = `${stats.expiredCredentials} credentials already expired`;
      }

      // Check monitor status
      const monitorRunning = this.expirationMonitor.isMonitoringActive();
      if (!monitorRunning && stats.totalCredentials > 0) {
        status = HealthStatus.DEGRADED;
        message = 'Expiration monitor not running';
      }

      return {
        name: 'expiration_monitor',
        status,
        message,
        details: {
          totalCredentials: stats.totalCredentials,
          expiredCredentials: stats.expiredCredentials,
          expiringCritical: stats.expiringCritical,
          expiringHigh: stats.expiringHigh,
          expiringMedium: stats.expiringMedium,
          healthyCredentials: stats.healthyCredentials,
          monitorRunning,
        },
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'expiration_monitor',
        status: HealthStatus.UNHEALTHY,
        message: `Expiration monitor error: ${(error as Error).message}`,
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check usage tracker health
   */
  private async checkUsageTrackerHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      if (!this.usageTracker) {
        return {
          name: 'usage_tracker',
          status: HealthStatus.UNHEALTHY,
          message: 'Usage tracker not registered',
          lastChecked: new Date(),
        };
      }

      // Test usage tracker by querying event count
      const eventCount = this.db
        .prepare('SELECT COUNT(*) as count FROM usage_events')
        .get() as { count: number };

      const status = HealthStatus.HEALTHY;
      const message = 'Usage tracker is operational';

      return {
        name: 'usage_tracker',
        status,
        message,
        details: {
          totalEvents: eventCount.count,
        },
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'usage_tracker',
        status: HealthStatus.UNHEALTHY,
        message: `Usage tracker error: ${(error as Error).message}`,
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get database statistics
   */
  private getDatabaseStats(): Record<string, any> {
    try {
      // Get database page count and size
      const pageCount = this.db.pragma('page_count', { simple: true }) as number;
      const pageSize = this.db.pragma('page_size', { simple: true }) as number;
      const databaseSizeMB = (pageCount * pageSize) / (1024 * 1024);

      // Get table counts
      const credentialCount = this.db
        .prepare('SELECT COUNT(*) as count FROM credentials')
        .get() as { count: number };

      const rotationJobsCount = this.db
        .prepare('SELECT COUNT(*) as count FROM rotation_jobs')
        .get() as { count: number };

      const rotationHistoryCount = this.db
        .prepare('SELECT COUNT(*) as count FROM rotation_history')
        .get() as { count: number };

      const auditLogsCount = this.db
        .prepare('SELECT COUNT(*) as count FROM audit_logs')
        .get() as { count: number };

      return {
        databaseSizeMB: databaseSizeMB.toFixed(2),
        credentialCount: credentialCount.count,
        rotationJobsCount: rotationJobsCount.count,
        rotationHistoryCount: rotationHistoryCount.count,
        auditLogsCount: auditLogsCount.count,
      };
    } catch (error) {
      logger.warn('Failed to get database stats', { error: (error as Error).message });
      return {};
    }
  }

  /**
   * Determine overall system status from component statuses
   */
  private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
    if (components.some((c) => c.status === HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }

    if (components.some((c) => c.status === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }

    if (components.some((c) => c.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const startTime = Date.now();

    // Database size
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const databaseSize = pageCount * pageSize;

    // Total credentials
    const totalCredentials = this.db
      .prepare('SELECT COUNT(*) as count FROM credentials')
      .get() as { count: number };

    // Total rotations
    const totalRotations = this.db
      .prepare('SELECT COUNT(*) as count FROM rotation_history')
      .get() as { count: number };

    // Total usage events
    const totalUsageEvents = this.db
      .prepare('SELECT COUNT(*) as count FROM usage_events')
      .get() as { count: number };

    // Average query time (measured by this health check)
    const averageQueryTimeMs = Date.now() - startTime;

    // Cache hit rate (from usage tracker stats cache)
    const cacheHitRate = this.calculateCacheHitRate();

    return {
      databaseSize,
      totalCredentials: totalCredentials.count,
      totalRotations: totalRotations.count,
      totalUsageEvents: totalUsageEvents.count,
      averageQueryTimeMs,
      cacheHitRate,
    };
  }

  /**
   * Calculate cache hit rate for usage tracker
   */
  private calculateCacheHitRate(): number {
    try {
      const cached = this.db
        .prepare('SELECT COUNT(*) as count FROM usage_stats_cache')
        .get() as { count: number };

      const credentials = this.db
        .prepare('SELECT COUNT(DISTINCT service || account) as count FROM usage_events')
        .get() as { count: number };

      if (credentials.count === 0) {
        return 1.0;
      }

      return cached.count / credentials.count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get resource utilization
   */
  getResourceUtilization(): ResourceUtilization {
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const databaseSizeMB = (pageCount * pageSize) / (1024 * 1024);

    const credentialCount = this.db
      .prepare('SELECT COUNT(*) as count FROM credentials')
      .get() as { count: number };

    const rotationJobsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM rotation_jobs')
      .get() as { count: number };

    const expirationWarningsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM expiration_warnings')
      .get() as { count: number };

    const usageEventsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM usage_events')
      .get() as { count: number };

    const auditLogsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM audit_logs')
      .get() as { count: number };

    return {
      databaseSizeMB,
      credentialCount: credentialCount.count,
      rotationJobsCount: rotationJobsCount.count,
      expirationWarningsCount: expirationWarningsCount.count,
      usageEventsCount: usageEventsCount.count,
      auditLogsCount: auditLogsCount.count,
    };
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): SystemHealth | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Start automated health checks
   */
  startMonitoring(): void {
    if (this.checkTimer) {
      logger.warn('Health checker already running');
      return;
    }

    const intervalMs = this.config.checkInterval * 1000;

    this.checkTimer = setInterval(() => {
      this.checkHealth().catch((error) => {
        logger.error('Health check error', { error: (error as Error).message });
      });
    }, intervalMs);

    // Run immediately
    this.checkHealth().catch((error) => {
      logger.error('Initial health check error', { error: (error as Error).message });
    });

    logger.info('Health monitoring started', {
      checkInterval: this.config.checkInterval,
    });
  }

  /**
   * Stop automated health checks
   */
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.checkTimer !== null;
  }
}
