/**
 * HealthCheck - Component Health Monitoring System
 *
 * Provides health status for all CCB components:
 * - Database connectivity (SQLite)
 * - MCP server status
 * - External API availability
 * - File system access
 *
 * Usage:
 * ```typescript
 * const healthChecker = new HealthChecker();
 * const status = await healthChecker.checkAll();
 * console.log(status.isHealthy ? 'All systems operational' : 'Issues detected');
 * ```
 */

import { existsSync } from 'fs';
import { access, constants } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { SimpleConfig } from '../config/simple-config.js';
import { resolveUserPath } from '../utils/paths.js';

function normalizePath(rawPath: string): string {
  if (rawPath === ':memory:' || rawPath.startsWith('file:')) {
    return rawPath;
  }
  return resolveUserPath(rawPath);
}

function getDatabasePath(): string {
  return normalizePath(SimpleConfig.DATABASE_PATH);
}

function getDatabaseDir(): string | null {
  const dbPath = getDatabasePath();
  if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
    return null;
  }
  return path.dirname(dbPath);
}

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ComponentHealth {
  /** Component name */
  name: string;
  /** Health status */
  status: HealthStatus;
  /** Human-readable message */
  message: string;
  /** Check duration in ms */
  durationMs: number;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Timestamp of check */
  timestamp: Date;
}

export interface SystemHealth {
  /** Overall system health */
  status: HealthStatus;
  /** Is system healthy enough to operate */
  isHealthy: boolean;
  /** Individual component health */
  components: ComponentHealth[];
  /** Summary message */
  summary: string;
  /** Total check duration in ms */
  totalDurationMs: number;
  /** Timestamp of check */
  timestamp: Date;
}

export interface HealthCheckOptions {
  /** Timeout for each check in ms (default: 5000) */
  timeout?: number;
  /** Skip specific components */
  skip?: string[];
}

// ============================================================================
// HealthChecker Class
// ============================================================================

/**
 * HealthChecker provides comprehensive system health monitoring
 */
export class HealthChecker {
  private timeout: number;

  constructor(options: { timeout?: number } = {}) {
    this.timeout = options.timeout || 5000;
  }

  /**
   * Run all health checks
   */
  async checkAll(options: HealthCheckOptions = {}): Promise<SystemHealth> {
    const startTime = Date.now();
    const timeout = options.timeout || this.timeout;
    const skip = new Set(options.skip || []);

    const checks: Array<() => Promise<ComponentHealth>> = [];

    // Core components (always checked)
    if (!skip.has('database')) checks.push(() => this.checkDatabase(timeout));
    if (!skip.has('filesystem')) checks.push(() => this.checkFilesystem(timeout));
    if (!skip.has('memory')) checks.push(() => this.checkMemory(timeout));

    // Run all checks in parallel
    const components = await Promise.all(checks.map(check => check()));

    // Calculate overall status
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    let status: HealthStatus;
    let isHealthy: boolean;

    if (unhealthyCount > 0) {
      status = 'unhealthy';
      isHealthy = false;
    } else if (degradedCount > 0) {
      status = 'degraded';
      isHealthy = true; // Degraded is still operational
    } else {
      status = 'healthy';
      isHealthy = true;
    }

    const summary = this.generateSummary(components);
    const totalDurationMs = Date.now() - startTime;

    const result: SystemHealth = {
      status,
      isHealthy,
      components,
      summary,
      totalDurationMs,
      timestamp: new Date(),
    };

    logger.debug('Health check completed', {
      status,
      isHealthy,
      totalDurationMs,
      componentCount: components.length,
    });

    return result;
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(timeout: number): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'database';

    try {
      const dbPath = getDatabasePath();

      if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
        return this.createHealth(name, 'healthy', 'Database running in memory', startTime, { path: dbPath });
      }

      // Check if database file exists
      if (!existsSync(dbPath)) {
        return this.createHealth(name, 'degraded', 'Database file not found (will be created on first use)', startTime, { path: dbPath });
      }

      // Check if we can access the file
      await Promise.race([
        access(dbPath, constants.R_OK | constants.W_OK),
        this.timeoutPromise(timeout, 'Database access timeout'),
      ]);

      return this.createHealth(name, 'healthy', 'Database accessible', startTime, { path: dbPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createHealth(name, 'unhealthy', `Database check failed: ${message}`, startTime);
    }
  }

  /**
   * Check filesystem access
   */
  async checkFilesystem(timeout: number): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'filesystem';

    try {
      const dataDir = getDatabaseDir();
      if (!dataDir) {
        return this.createHealth(name, 'healthy', 'Filesystem check skipped (in-memory database)', startTime);
      }

      // Check if data directory exists
      if (!existsSync(dataDir)) {
        return this.createHealth(name, 'degraded', 'Data directory not found (will be created)', startTime, { path: dataDir });
      }

      // Check if we can access the directory
      await Promise.race([
        access(dataDir, constants.R_OK | constants.W_OK),
        this.timeoutPromise(timeout, 'Filesystem access timeout'),
      ]);

      return this.createHealth(name, 'healthy', 'Filesystem accessible', startTime, { path: dataDir });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createHealth(name, 'unhealthy', `Filesystem check failed: ${message}`, startTime);
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory(_timeout: number): Promise<ComponentHealth> {
    const startTime = Date.now();
    const name = 'memory';

    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      let status: HealthStatus = 'healthy';
      let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`;

      if (usagePercent > 90) {
        status = 'unhealthy';
        message = `Critical memory usage: ${usagePercent}%`;
      } else if (usagePercent > 75) {
        status = 'degraded';
        message = `High memory usage: ${usagePercent}%`;
      }

      return this.createHealth(name, status, message, startTime, {
        heapUsedMB,
        heapTotalMB,
        usagePercent,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createHealth(name, 'unknown', `Memory check failed: ${message}`, startTime);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createHealth(
    name: string,
    status: HealthStatus,
    message: string,
    startTime: number,
    details?: Record<string, unknown>
  ): ComponentHealth {
    return {
      name,
      status,
      message,
      durationMs: Date.now() - startTime,
      details,
      timestamp: new Date(),
    };
  }

  private timeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private generateSummary(components: ComponentHealth[]): string {
    const healthy = components.filter(c => c.status === 'healthy').length;
    const degraded = components.filter(c => c.status === 'degraded').length;
    const unhealthy = components.filter(c => c.status === 'unhealthy').length;
    const total = components.length;

    if (unhealthy > 0) {
      return `${unhealthy}/${total} components unhealthy`;
    }
    if (degraded > 0) {
      return `${healthy}/${total} healthy, ${degraded} degraded`;
    }
    return `All ${total} components healthy`;
  }
}

// ============================================================================
// Quick Health Check Function
// ============================================================================

/**
 * Quick health check - returns true if system is operational
 */
export async function isSystemHealthy(options?: HealthCheckOptions): Promise<boolean> {
  const checker = new HealthChecker();
  const health = await checker.checkAll(options);
  return health.isHealthy;
}

/**
 * Format health status for display (uses pre-computed health or runs check)
 */
export function formatHealthStatus(health: SystemHealth): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('╭─────────────────────────────────────────────────────╮');
  lines.push('│              SYSTEM HEALTH STATUS                   │');
  lines.push('╰─────────────────────────────────────────────────────╯');
  lines.push('');

  const statusIcon = {
    healthy: '✓',
    degraded: '⚠',
    unhealthy: '✗',
    unknown: '?',
  };

  const statusColor = {
    healthy: '\x1b[32m', // green
    degraded: '\x1b[33m', // yellow
    unhealthy: '\x1b[31m', // red
    unknown: '\x1b[90m', // gray
  };

  const reset = '\x1b[0m';

  for (const component of health.components) {
    const icon = statusIcon[component.status];
    const color = statusColor[component.status];
    lines.push(`  ${color}${icon}${reset} ${component.name.padEnd(15)} ${component.message}`);
  }

  lines.push('');
  lines.push(`  Summary: ${health.summary}`);
  lines.push(`  Duration: ${health.totalDurationMs}ms`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Get formatted health status for display (convenience function)
 */
export async function getHealthStatus(options?: HealthCheckOptions): Promise<string> {
  const checker = new HealthChecker();
  const health = await checker.checkAll(options);
  return formatHealthStatus(health);
}

// ============================================================================
// Export Default
// ============================================================================

export default HealthChecker;
