/**
 * System Resources - 動態系統資源檢測與調整
 *
 * 核心原則：
 * - 不硬編碼限制
 * - 基於實際硬體動態調整
 * - 用戶可配置
 * - 提供合理預設值
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Configuration for system resource management
 *
 * Allows customizing resource thresholds and threading strategies.
 */
export interface SystemResourcesConfig {
  // 資源使用閾值（百分比）
  cpuThreshold?: number;      // CPU 使用率警戒線（預設 80%）
  memoryThreshold?: number;   // Memory 使用率警戒線（預設 85%）

  // 並行度計算策略
  threadStrategy?: 'conservative' | 'balanced' | 'aggressive';

  // 最小/最大並行數（保護機制）
  minThreads?: number;        // 最少 1 個 thread
  maxThreads?: number;        // 最多 threads（預設：CPU cores）

  // E2E 測試特殊設定
  e2eMaxConcurrent?: number;  // E2E 測試最大並行數（預設：自動計算）
}

/**
 * Current system resource status
 *
 * Provides comprehensive information about CPU, memory, and recommended concurrency levels.
 */
export interface SystemResources {
  // CPU 資訊
  cpuCores: number;           // 總 CPU 核心數
  cpuUsage: number;           // 當前 CPU 使用率（%）
  availableCPU: number;       // 可用 CPU（%）

  // Memory 資訊
  totalMemoryMB: number;      // 總記憶體（MB）
  usedMemoryMB: number;       // 已使用記憶體（MB）
  freeMemoryMB: number;       // 可用記憶體（MB）
  memoryUsage: number;        // 記憶體使用率（%）

  // 建議的並行度
  recommendedThreads: number; // 建議的 thread 數量
  recommendedE2E: number;     // 建議的 E2E 並行數

  // 狀態
  healthy: boolean;           // 系統資源健康
  warnings: string[];         // 警告訊息
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
      e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,  // 0 = 自動計算
    };
  }

  /**
   * 獲取當前系統資源狀態
   */
  async getResources(): Promise<SystemResources> {
    const cpuCores = os.cpus().length;
    const totalMemoryMB = os.totalmem() / (1024 * 1024);
    const freeMemoryMB = os.freemem() / (1024 * 1024);
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;
    const memoryUsage = (usedMemoryMB / totalMemoryMB) * 100;

    // 獲取 CPU 使用率
    const cpuUsage = await this.getCPUUsage();
    const availableCPU = 100 - cpuUsage;

    // 計算建議的並行度
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

    // 檢查健康狀態
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
   * 計算建議的 thread 數量
   *
   * 策略：
   * - Conservative: 最多使用 50% CPU cores
   * - Balanced: 最多使用 75% CPU cores，考慮當前負載
   * - Aggressive: 最多使用 100% CPU cores，僅在系統空閒時
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
        // 僅在系統空閒時使用全部 cores
        if (cpuUsage < 30 && memoryUsage < 60) {
          threads = cpuCores;
        } else {
          threads = Math.max(1, Math.floor(cpuCores * 0.75));
        }
        break;

      case 'balanced':
      default:
        // 基於當前負載動態調整
        if (cpuUsage > 70 || memoryUsage > 80) {
          // 高負載：減少並行度
          threads = Math.max(1, Math.floor(cpuCores * 0.25));
        } else if (cpuUsage > 50 || memoryUsage > 60) {
          // 中等負載：保守使用
          threads = Math.max(1, Math.floor(cpuCores * 0.5));
        } else {
          // 低負載：可以使用更多
          threads = Math.max(1, Math.floor(cpuCores * 0.75));
        }
        break;
    }

    // 應用最小/最大限制
    threads = Math.max(this.config.minThreads, threads);
    threads = Math.min(this.config.maxThreads, threads);

    return threads;
  }

  /**
   * 計算建議的 E2E 並行數
   *
   * E2E 測試特別考量：
   * - 每個測試啟動多個服務（Express, Vectra, WebSocket 等）
   * - 假設每個 E2E 測試需要 2GB memory + 2 CPU cores
   */
  private calculateRecommendedE2E(
    cpuCores: number,
    cpuUsage: number,
    memoryUsage: number
  ): number {
    // 用戶手動配置優先
    if (this.config.e2eMaxConcurrent > 0) {
      return this.config.e2eMaxConcurrent;
    }

    // 自動計算
    const availableCPU = 100 - cpuUsage;
    const availableMemoryPercent = 100 - memoryUsage;

    // E2E 測試假設：每個測試消耗 25% CPU + 25% Memory
    const cpuBasedE2E = Math.floor(availableCPU / 25);
    const memoryBasedE2E = Math.floor(availableMemoryPercent / 25);

    // 取較小值（瓶頸）
    let e2e = Math.min(cpuBasedE2E, memoryBasedE2E);

    // 保守起見，E2E 測試最多使用一半的 CPU cores
    e2e = Math.min(e2e, Math.floor(cpuCores / 2));

    // 至少 1 個，最多不超過 4 個（即使硬體夠強）
    e2e = Math.max(1, Math.min(4, e2e));

    return e2e;
  }

  /**
   * 獲取 CPU 使用率
   *
   * 方法：
   * - macOS: 使用 top 命令
   * - Linux: 使用 /proc/stat 或 top
   * - 跨平台備援：使用 os.loadavg()
   */
  private async getCPUUsage(): Promise<number> {
    try {
      if (process.platform === 'darwin') {
        // macOS
        const { stdout } = await execAsync(
          "ps aux | awk '{sum+=$3} END {print sum}'"
        );
        return parseFloat(stdout.trim()) || 0;
      } else if (process.platform === 'linux') {
        // Linux
        const { stdout } = await execAsync(
          "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
        );
        return parseFloat(stdout.trim()) || 0;
      } else {
        // Windows or other - use load average as fallback
        const loadavg = os.loadavg()[0];  // 1 minute average
        const cpuCores = os.cpus().length;
        return Math.min(100, (loadavg / cpuCores) * 100);
      }
    } catch (error) {
      logger.warn('Failed to get CPU usage, using fallback:', error);
      // Fallback: use load average
      const loadavg = os.loadavg()[0];
      const cpuCores = os.cpus().length;
      return Math.min(100, (loadavg / cpuCores) * 100);
    }
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

    // 如果系統不健康，不建議運行
    if (!resources.healthy) {
      return {
        canRun: false,
        reason: `System resources unhealthy: ${resources.warnings.join(', ')}`,
        recommendation: 'Wait for system to stabilize or reduce concurrent tasks',
      };
    }

    // 檢查是否超過建議的並行數
    if (count > resources.recommendedE2E) {
      return {
        canRun: false,
        reason: `Requested ${count} E2E tests exceeds recommended ${resources.recommendedE2E}`,
        recommendation: `Run ${resources.recommendedE2E} E2E test(s) instead, or run sequentially`,
      };
    }

    // 預估資源需求
    const estimatedCPU = count * 25;  // 每個 E2E 測試 ~25% CPU
    const estimatedMemory = count * 25;  // 每個 E2E 測試 ~25% Memory

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
