/**
 * 記憶體監控工具
 */

import { appConfig } from '../config/index.js';
import { logger } from './logger.js';

class MemoryMonitor {
  private maxMemoryMB: number;

  constructor() {
    this.maxMemoryMB = appConfig.orchestrator.maxMemoryMB;
  }

  /**
   * 獲取當前記憶體使用量（MB）
   */
  getCurrentUsage(): number {
    const used = process.memoryUsage();
    return Math.round(used.heapUsed / 1024 / 1024);
  }

  /**
   * 獲取記憶體使用百分比
   */
  getUsagePercent(): number {
    return (this.getCurrentUsage() / this.maxMemoryMB) * 100;
  }

  /**
   * 檢查是否記憶體不足
   */
  isLowMemory(): boolean {
    return this.getUsagePercent() > 80;
  }

  /**
   * 獲取可用記憶體
   */
  getAvailableMemory(): number {
    return this.maxMemoryMB - this.getCurrentUsage();
  }

  /**
   * 記憶體使用報告
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
   * 記錄記憶體狀態
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
   * 強制垃圾回收（如果可用）
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
