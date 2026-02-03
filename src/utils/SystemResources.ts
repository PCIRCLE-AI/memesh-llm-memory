/**
 * System Resources - Dynamic System Resource Detection and Adjustment
 *
 * Core Principles:
 * - No hardcoded limits
 * - Dynamically adjust based on actual hardware
 * - User configurable
 * - Provide reasonable defaults
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';
import { safeDivide, bytesToMB } from './index.js';

const execAsync = promisify(exec);

/**
 * Configuration for system resource management
 *
 * Allows customizing resource thresholds and threading strategies.
 */
export interface SystemResourcesConfig {
  // Resource usage thresholds (percentage)
  cpuThreshold?: number;      // CPU usage warning threshold (default: 80%)
  memoryThreshold?: number;   // Memory usage warning threshold (default: 85%)

  // Threading strategy
  threadStrategy?: 'conservative' | 'balanced' | 'aggressive';

  // Min/max thread limits (protection mechanism)
  minThreads?: number;        // Minimum threads (at least 1)
  maxThreads?: number;        // Maximum threads (default: CPU cores)

  // E2E test special settings
  e2eMaxConcurrent?: number;  // E2E test maximum concurrency (default: auto-calculated)
}

/**
 * Current system resource status
 *
 * Provides comprehensive information about CPU, memory, and recommended concurrency levels.
 */
export interface SystemResources {
  // CPU information
  cpuCores: number;           // Total CPU cores
  cpuUsage: number;           // Current CPU usage (%)
  availableCPU: number;       // Available CPU (%)

  // Memory information
  totalMemoryMB: number;      // Total memory (MB)
  usedMemoryMB: number;       // Used memory (MB)
  freeMemoryMB: number;       // Free memory (MB)
  memoryUsage: number;        // Memory usage (%)

  // Recommended concurrency
  recommendedThreads: number; // Recommended thread count
  recommendedE2E: number;     // Recommended E2E concurrency

  // Status
  healthy: boolean;           // System resource health
  warnings: string[];         // Warning messages
}

/**
 * System Resource Manager
 *
 * Dynamically monitors system resources and provides recommendations
 * for safe concurrency levels. Prevents resource exhaustion by adjusting
 * thread counts based on current CPU and memory usage.
 *
 * Features:
 * - Real-time CPU and memory monitoring
 * - Dynamic thread count recommendations
 * - Special handling for resource-intensive E2E tests
 * - Configurable thresholds and strategies
 *
 * @example
 * ```typescript
 * const manager = new SystemResourceManager({
 *   cpuThreshold: 80,
 *   memoryThreshold: 85,
 *   threadStrategy: 'balanced'
 * });
 *
 * const resources = await manager.getResources();
 * console.log(`Recommended threads: ${resources.recommendedThreads}`);
 *
 * const e2eCheck = await manager.canRunE2E(2);
 * if (!e2eCheck.canRun) {
 *   console.warn(e2eCheck.reason);
 * }
 * ```
 */
export class SystemResourceManager {
  private config: Required<SystemResourcesConfig>;

  constructor(config: SystemResourcesConfig = {}) {
    this.config = {
      cpuThreshold: config.cpuThreshold ?? 80,
      memoryThreshold: config.memoryThreshold ?? 85,
      threadStrategy: config.threadStrategy ?? 'balanced',
      minThreads: config.minThreads ?? 1,
      maxThreads: config.maxThreads ?? os.cpus().length,
      e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,  // 0 = auto-calculate
    };
  }

  /**
   * Get current system resource status
   * ✅ CODE QUALITY FIX (MAJOR-4): Use safe division to prevent NaN/division-by-zero
   */
  async getResources(): Promise<SystemResources> {
    const cpuCores = os.cpus().length;
    const totalMemoryMB = bytesToMB(os.totalmem());
    const freeMemoryMB = bytesToMB(os.freemem());
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;
    const memoryUsage = safeDivide(usedMemoryMB, totalMemoryMB, 0) * 100;

    // Get CPU usage
    const cpuUsage = await this.getCPUUsage();
    const availableCPU = 100 - cpuUsage;

    // Calculate recommended concurrency
    const recommendedThreads = this.calculateRecommendedThreads(
      cpuCores,
      cpuUsage,
      memoryUsage
    );

    const recommendedE2E = this.calculateRecommendedE2E(
      cpuCores,
      cpuUsage,
      memoryUsage
    );

    // Check health status
    const warnings: string[] = [];
    let healthy = true;

    if (cpuUsage > this.config.cpuThreshold) {
      healthy = false;
      warnings.push(
        `High CPU usage: ${cpuUsage.toFixed(1)}% (threshold: ${this.config.cpuThreshold}%)`
      );
    }

    if (memoryUsage > this.config.memoryThreshold) {
      healthy = false;
      warnings.push(
        `High memory usage: ${memoryUsage.toFixed(1)}% (threshold: ${this.config.memoryThreshold}%)`
      );
    }

    if (freeMemoryMB < 1024) {
      healthy = false;
      warnings.push(
        `Low free memory: ${freeMemoryMB.toFixed(0)}MB`
      );
    }

    return {
      cpuCores,
      cpuUsage,
      availableCPU,
      totalMemoryMB,
      usedMemoryMB,
      freeMemoryMB,
      memoryUsage,
      recommendedThreads,
      recommendedE2E,
      healthy,
      warnings,
    };
  }

  /**
   * Calculate recommended thread count
   *
   * Strategy:
   * - Conservative: Use at most 50% CPU cores
   * - Balanced: Use at most 75% CPU cores, considering current load
   * - Aggressive: Use at most 100% CPU cores, only when system is idle
   */
  private calculateRecommendedThreads(
    cpuCores: number,
    cpuUsage: number,
    memoryUsage: number
  ): number {
    let threads: number;

    switch (this.config.threadStrategy) {
      case 'conservative':
        threads = Math.max(1, Math.floor(cpuCores * 0.5));
        break;

      case 'aggressive':
        // Use all cores only when system is idle
        if (cpuUsage < 30 && memoryUsage < 60) {
          threads = cpuCores;
        } else {
          threads = Math.max(1, Math.floor(cpuCores * 0.75));
        }
        break;

      case 'balanced':
      default:
        // Dynamically adjust based on current load
        if (cpuUsage > 70 || memoryUsage > 80) {
          // High load: reduce concurrency
          threads = Math.max(1, Math.floor(cpuCores * 0.25));
        } else if (cpuUsage > 50 || memoryUsage > 60) {
          // Medium load: conservative usage
          threads = Math.max(1, Math.floor(cpuCores * 0.5));
        } else {
          // Low load: can use more
          threads = Math.max(1, Math.floor(cpuCores * 0.75));
        }
        break;
    }

    // Apply min/max limits
    threads = Math.max(this.config.minThreads, threads);
    threads = Math.min(this.config.maxThreads, threads);

    return threads;
  }

  /**
   * Calculate recommended E2E concurrency
   *
   * ✅ CODE QUALITY FIX (MAJOR-4): Use safe division to prevent NaN
   *
   * E2E test special considerations:
   * - Each test starts multiple services (Express, database, WebSocket, etc.)
   * - Assume each E2E test needs 2GB memory + 2 CPU cores
   */
  private calculateRecommendedE2E(
    cpuCores: number,
    cpuUsage: number,
    memoryUsage: number
  ): number {
    // User manual configuration takes priority
    if (this.config.e2eMaxConcurrent > 0) {
      return this.config.e2eMaxConcurrent;
    }

    // Auto-calculate
    const availableCPU = 100 - cpuUsage;
    const availableMemoryPercent = 100 - memoryUsage;

    // E2E test assumption: each test consumes 25% CPU + 25% Memory
    const cpuBasedE2E = Math.floor(safeDivide(availableCPU, 25, 0));
    const memoryBasedE2E = Math.floor(safeDivide(availableMemoryPercent, 25, 0));

    // Take smaller value (bottleneck)
    let e2e = Math.min(cpuBasedE2E, memoryBasedE2E);

    // Conservatively, E2E tests use at most half of CPU cores
    e2e = Math.min(e2e, Math.floor(safeDivide(cpuCores, 2, 1)));

    // At least 1, at most 4 (even if hardware is strong enough)
    e2e = Math.max(1, Math.min(4, e2e));

    return e2e;
  }

  /**
   * Get CPU usage
   *
   * Use Node.js native API to calculate, avoiding shell command injection risks
   *
   * Implementation:
   * 1. Record CPU time snapshot
   * 2. Wait 100ms
   * 3. Record CPU time again
   * 4. Calculate difference to get usage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      // Get first CPU snapshot
      const startUsage = this.getCPUSnapshot();

      // Wait 100ms for measurement
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get second CPU snapshot
      const endUsage = this.getCPUSnapshot();

      // Calculate CPU usage percentage
      const totalDiff = endUsage.total - startUsage.total;
      const idleDiff = endUsage.idle - startUsage.idle;

      // ✅ FIX: Safe division with zero check
      const usagePercent = safeDivide(totalDiff - idleDiff, totalDiff, 0) * 100;
      return Math.max(0, Math.min(100, usagePercent));

    } catch (error) {
      logger.warn('Failed to get CPU usage, using fallback:', error);
      // Fallback: use load average with safe division
      const loadavg = os.loadavg()[0];  // 1 minute average
      const cpuCores = os.cpus().length;
      return Math.min(100, safeDivide(loadavg, cpuCores, 0.5) * 100);
    }
  }

  /**
   * Get CPU time snapshot (for calculating usage)
   */
  private getCPUSnapshot(): { total: number; idle: number } {
    const cpus = os.cpus();
    let totalTime = 0;
    let idleTime = 0;

    for (const cpu of cpus) {
      // Sum all CPU times
      for (const type in cpu.times) {
        totalTime += cpu.times[type as keyof typeof cpu.times];
      }
      // Track idle time
      idleTime += cpu.times.idle;
    }

    return { total: totalTime, idle: idleTime };
  }

  /**
   * Check if it's safe to run E2E tests
   *
   * Evaluates whether system has sufficient resources for E2E tests.
   * E2E tests are resource-intensive (multiple services per test).
   *
   * @param count - Number of E2E tests to run concurrently (default: 1)
   * @returns Object containing:
   *   - canRun: Whether tests can safely run
   *   - reason: Why tests can't run (if canRun is false)
   *   - recommendation: Suggested action (if canRun is false)
   *
   * @example
   * ```typescript
   * const check = await manager.canRunE2E(3);
   * if (check.canRun) {
   *   // Safe to run 3 E2E tests
   * } else {
   *   console.warn(check.reason);
   *   console.log(check.recommendation);
   * }
   * ```
   */
  async canRunE2E(count: number = 1): Promise<{
    canRun: boolean;
    reason?: string;
    recommendation?: string;
  }> {
    const resources = await this.getResources();

    // If system is not healthy, not recommended to run
    if (!resources.healthy) {
      return {
        canRun: false,
        reason: `System resources unhealthy: ${resources.warnings.join(', ')}`,
        recommendation: 'Wait for system to stabilize or reduce concurrent tasks',
      };
    }

    // Check if exceeds recommended concurrency
    if (count > resources.recommendedE2E) {
      return {
        canRun: false,
        reason: `Requested ${count} E2E tests exceeds recommended ${resources.recommendedE2E}`,
        recommendation: `Run ${resources.recommendedE2E} E2E test(s) instead, or run sequentially`,
      };
    }

    // Estimate resource requirements
    const estimatedCPU = count * 25;  // Each E2E test ~25% CPU
    const estimatedMemory = count * 25;  // Each E2E test ~25% Memory

    if (estimatedCPU > resources.availableCPU) {
      return {
        canRun: false,
        reason: `Insufficient CPU (need ${estimatedCPU}%, available ${resources.availableCPU.toFixed(1)}%)`,
        recommendation: 'Reduce E2E test count or run sequentially',
      };
    }

    if (estimatedMemory > (100 - resources.memoryUsage)) {
      return {
        canRun: false,
        reason: `Insufficient memory (need ~${(count * 2048).toFixed(0)}MB, available ${resources.freeMemoryMB.toFixed(0)}MB)`,
        recommendation: 'Close other applications or run E2E tests sequentially',
      };
    }

    return { canRun: true };
  }

  /**
   * Generate formatted system resources report
   *
   * Creates a human-readable ASCII table showing current resource status,
   * recommended concurrency levels, and any warnings.
   *
   * @returns Formatted report string
   *
   * @example
   * ```typescript
   * const report = await manager.generateReport();
   * console.log(report);
   * // ╔═══════════════════════════════════════════════════════════╗
   * // ║           SYSTEM RESOURCES REPORT                       ║
   * // ╠═══════════════════════════════════════════════════════════╣
   * // ║ CPU Cores:           8                                  ║
   * // ║ CPU Usage:           45.2% ✅                           ║
   * // ...
   * ```
   */
  async generateReport(): Promise<string> {
    const resources = await this.getResources();

    let report = '╔═══════════════════════════════════════════════════════════╗\n';
    report += '║           SYSTEM RESOURCES REPORT                       ║\n';
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ CPU Cores:           ${resources.cpuCores.toString().padEnd(36)}║\n`;
    report += `║ CPU Usage:           ${resources.cpuUsage.toFixed(1)}% ${this.getStatusEmoji(resources.cpuUsage, this.config.cpuThreshold).padEnd(29)}║\n`;
    report += `║ Memory Total:        ${resources.totalMemoryMB.toFixed(0)}MB ${' '.repeat(32 - resources.totalMemoryMB.toFixed(0).length)}║\n`;
    report += `║ Memory Usage:        ${resources.memoryUsage.toFixed(1)}% ${this.getStatusEmoji(resources.memoryUsage, this.config.memoryThreshold).padEnd(29)}║\n`;
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ Recommended Threads: ${resources.recommendedThreads.toString().padEnd(36)}║\n`;
    report += `║ Recommended E2E:     ${resources.recommendedE2E.toString().padEnd(36)}║\n`;
    report += `║ Strategy:            ${this.config.threadStrategy.padEnd(36)}║\n`;
    report += '╠═══════════════════════════════════════════════════════════╣\n';

    if (resources.warnings.length > 0) {
      report += `║ ⚠️  WARNINGS:                                            ║\n`;
      for (const warning of resources.warnings) {
        // Wrap long warnings
        const words = warning.split(' ');
        let line = '';
        for (const word of words) {
          if ((line + word).length > 54) {
            report += `║ ${line.padEnd(54)}   ║\n`;
            line = '  ' + word + ' ';
          } else {
            line += word + ' ';
          }
        }
        if (line.trim()) {
          report += `║ ${line.trim().padEnd(54)}   ║\n`;
        }
      }
    } else {
      report += `║ ✅ System Healthy                                        ║\n`;
    }

    report += '╚═══════════════════════════════════════════════════════════╝\n';

    return report;
  }

  private getStatusEmoji(usage: number, threshold: number): string {
    if (usage < threshold * 0.7) return '✅';
    if (usage < threshold) return '⚠️ ';
    return '🔴';
  }
}

/**
 * Convenience function to get system resources without creating a manager instance
 *
 * @param config - Optional configuration
 * @returns Current system resources
 *
 * @example
 * ```typescript
 * const resources = await getSystemResources({ cpuThreshold: 75 });
 * console.log(`CPU: ${resources.cpuUsage.toFixed(1)}%`);
 * ```
 */
export async function getSystemResources(
  config?: SystemResourcesConfig
): Promise<SystemResources> {
  const manager = new SystemResourceManager(config);
  return manager.getResources();
}

/**
 * Convenience function to check if E2E tests can run safely
 *
 * @param count - Number of E2E tests to run concurrently (default: 1)
 * @param config - Optional configuration
 * @returns Check result with canRun status and recommendations
 *
 * @example
 * ```typescript
 * const check = await canRunE2ETest(2);
 * if (!check.canRun) {
 *   console.log(check.recommendation);
 * }
 * ```
 */
export async function canRunE2ETest(
  count: number = 1,
  config?: SystemResourcesConfig
): Promise<ReturnType<SystemResourceManager['canRunE2E']>> {
  const manager = new SystemResourceManager(config);
  return manager.canRunE2E(count);
}
