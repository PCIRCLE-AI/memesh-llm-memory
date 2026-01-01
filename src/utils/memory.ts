/**
 * Memory Monitoring Utility
 *
 * Monitors Node.js heap memory usage and provides alerts when memory
 * consumption exceeds configured thresholds. Helps prevent out-of-memory
 * errors by tracking usage in real-time.
 *
 * Features:
 * - Real-time heap memory monitoring
 * - Configurable memory limits and thresholds
 * - Status reporting with color-coded alerts
 * - Optional garbage collection triggering
 *
 * @example
 * ```typescript
 * import { memoryMonitor } from './memory.js';
 *
 * // Check current usage
 * const usage = memoryMonitor.getCurrentUsage();
 * console.log(`Using ${usage}MB of memory`);
 *
 * // Get detailed report
 * const report = memoryMonitor.getReport();
 * console.log(`Memory: ${report.status} (${report.percent.toFixed(1)}%)`);
 *
 * // Check if memory is low
 * if (memoryMonitor.isLowMemory()) {
 *   console.warn('Consider reducing concurrent operations');
 * }
 * ```
 */

import { appConfig } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Memory Monitor class for tracking Node.js heap memory usage
 *
 * Monitors process.memoryUsage().heapUsed against configured limits.
 * Provides real-time status and alerts when thresholds are exceeded.
 */
class MemoryMonitor {
  private maxMemoryMB: number;

  constructor() {
    this.maxMemoryMB = appConfig.orchestrator.maxMemoryMB;
  }

  /**
   * Get current heap memory usage in megabytes
   *
   * @returns Current heap memory usage in MB (rounded to nearest MB)
   *
   * @example
   * ```typescript
   * const usage = memoryMonitor.getCurrentUsage();
   * console.log(`Current usage: ${usage}MB`);
   * ```
   */
  getCurrentUsage(): number {
    const used = process.memoryUsage();
    return Math.round(used.heapUsed / 1024 / 1024);
  }

  /**
   * Get memory usage as percentage of configured maximum
   *
   * @returns Percentage of max memory used (0-100+)
   *
   * @example
   * ```typescript
   * const percent = memoryMonitor.getUsagePercent();
   * if (percent > 80) {
   *   console.warn(`High memory usage: ${percent.toFixed(1)}%`);
   * }
   * ```
   */
  getUsagePercent(): number {
    return (this.getCurrentUsage() / this.maxMemoryMB) * 100;
  }

  /**
   * Check if memory usage exceeds the low memory threshold (80%)
   *
   * @returns true if memory usage is above 80% of configured maximum
   *
   * @example
   * ```typescript
   * if (memoryMonitor.isLowMemory()) {
   *   // Reduce concurrent operations
   *   // Trigger garbage collection
   * }
   * ```
   */
  isLowMemory(): boolean {
    return this.getUsagePercent() > 80;
  }

  /**
   * Get available memory in megabytes
   *
   * @returns Available memory in MB (max - current usage)
   *
   * @example
   * ```typescript
   * const available = memoryMonitor.getAvailableMemory();
   * console.log(`${available}MB available`);
   * ```
   */
  getAvailableMemory(): number {
    return this.maxMemoryMB - this.getCurrentUsage();
  }

  /**
   * Get comprehensive memory usage report
   *
   * @returns Memory report object containing:
   *   - usage: Current usage in MB
   *   - max: Maximum configured memory in MB
   *   - available: Available memory in MB
   *   - percent: Usage percentage
   *   - status: Color-coded status string (🟢 Low / 🟡 Medium / 🔴 High)
   *
   * @example
   * ```typescript
   * const report = memoryMonitor.getReport();
   * console.log(`Memory Status: ${report.status}`);
   * console.log(`Using ${report.usage}MB / ${report.max}MB (${report.percent.toFixed(1)}%)`);
   * console.log(`${report.available}MB available`);
   * ```
   */
  getReport() {
    const usage = this.getCurrentUsage();
    const percent = this.getUsagePercent();
    const available = this.getAvailableMemory();

    const status = percent > 80 ? '🔴 High' : percent > 60 ? '🟡 Medium' : '🟢 Low';

    return {
      usage,
      max: this.maxMemoryMB,
      available,
      percent,
      status,
    };
  }

  /**
   * Log current memory status to logger
   *
   * Logs an info message with current usage and status.
   * Logs a warning if memory usage is low (> 80%).
   *
   * @example
   * ```typescript
   * // Log memory status periodically
   * setInterval(() => {
   *   memoryMonitor.logStatus();
   * }, 60000); // Every minute
   * ```
   */
  logStatus() {
    const report = this.getReport();
    logger.info(
      `Memory: ${report.usage}MB / ${report.max}MB (${report.percent.toFixed(1)}%) ${report.status}`
    );

    if (this.isLowMemory()) {
      logger.warn('⚠️ Low memory! Consider reducing concurrent operations.');
    }
  }

  /**
   * Force garbage collection if available
   *
   * Triggers Node.js garbage collection to free up memory.
   * Requires Node to be started with --expose-gc flag.
   *
   * @example
   * ```typescript
   * // Start Node with: node --expose-gc app.js
   * if (memoryMonitor.isLowMemory()) {
   *   memoryMonitor.forceGC();
   *   console.log('GC triggered to free memory');
   * }
   * ```
   */
  forceGC() {
    if (global.gc) {
      logger.debug('Running garbage collection...');
      global.gc();
      logger.debug('GC complete');
    } else {
      logger.warn('GC not available. Run node with --expose-gc flag.');
    }
  }
}

export const memoryMonitor = new MemoryMonitor();
