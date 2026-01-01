/**
 * GlobalResourcePool - 全局資源池
 *
 * 跨 Orchestrator 實例的資源協調
 * 防止多個 orchestrator 同時消耗過多資源
 *
 * 核心原則：
 * - Singleton pattern（全局唯一實例）
 * - E2E 測試互斥（同時只能有 1 個）
 * - 資源槽位管理（基於系統資源動態調整）
 * - 自動清理死鎖
 */

import { SystemResourceManager, SystemResourcesConfig } from '../utils/SystemResources.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface ResourceSlot {
  type: 'e2e' | 'build' | 'heavy_compute';
  orchestratorId: string;
  acquiredAt: Date;
  pid: number;
}

export interface GlobalResourcePoolConfig extends SystemResourcesConfig {
  // E2E 測試配置
  maxConcurrentE2E?: number;        // 最大並發 E2E 數量（預設 1）
  e2eWaitTimeout?: number;          // E2E 等待超時（ms，預設 5 分鐘）

  // 建置任務配置
  maxConcurrentBuilds?: number;     // 最大並發 build 數量（預設 2）
  buildWaitTimeout?: number;        // Build 等待超時（ms，預設 10 分鐘）

  // 死鎖檢測
  staleCheckInterval?: number;      // 死鎖檢測間隔（ms，預設 60 秒）
  staleLockThreshold?: number;      // 死鎖判定時間（ms，預設 30 分鐘）
}

export class GlobalResourcePool {
  private static instance: GlobalResourcePool | null = null;

  private resourceManager: SystemResourceManager;
  private config: Required<GlobalResourcePoolConfig>;

  // 資源槽位
  private activeE2E: Map<string, ResourceSlot> = new Map();
  private activeBuilds: Map<string, ResourceSlot> = new Map();

  // 等待佇列
  private e2eWaitQueue: Array<{
    orchestratorId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    queuedAt: Date;
  }> = [];

  // 死鎖檢測定時器
  private staleCheckTimer: NodeJS.Timeout | null = null;

  private constructor(config: GlobalResourcePoolConfig = {}) {
    this.config = {
      // SystemResourcesConfig
      cpuThreshold: config.cpuThreshold ?? 80,
      memoryThreshold: config.memoryThreshold ?? 85,
      threadStrategy: config.threadStrategy ?? 'balanced',
      minThreads: config.minThreads ?? 1,
      maxThreads: config.maxThreads ?? os.cpus().length,
      e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,

      // GlobalResourcePoolConfig
      maxConcurrentE2E: config.maxConcurrentE2E ?? 1,
      e2eWaitTimeout: config.e2eWaitTimeout ?? 300000,  // 5 min
      maxConcurrentBuilds: config.maxConcurrentBuilds ?? 2,
      buildWaitTimeout: config.buildWaitTimeout ?? 600000,  // 10 min
      staleCheckInterval: config.staleCheckInterval ?? 60000,  // 1 min
      staleLockThreshold: config.staleLockThreshold ?? 1800000,  // 30 min
    };

    this.resourceManager = new SystemResourceManager(this.config);

    // 啟動死鎖檢測
    this.startStaleCheckTimer();
  }

  /**
   * 獲取全局唯一實例
   */
  static getInstance(config?: GlobalResourcePoolConfig): GlobalResourcePool {
    if (!GlobalResourcePool.instance) {
      GlobalResourcePool.instance = new GlobalResourcePool(config);
    }
    return GlobalResourcePool.instance;
  }

  /**
   * 重置實例（僅用於測試）
   */
  static resetInstance(): void {
    if (GlobalResourcePool.instance) {
      GlobalResourcePool.instance.cleanup();
      GlobalResourcePool.instance = null;
    }
  }

  /**
   * 請求 E2E 測試槽位
   *
   * 如果當前已有其他 E2E 測試運行，會等待直到：
   * - 其他測試完成並釋放槽位
   * - 或超時
   */
  async acquireE2ESlot(orchestratorId: string): Promise<void> {
    // 檢查是否已經持有槽位
    if (this.activeE2E.has(orchestratorId)) {
      logger.warn(`Orchestrator ${orchestratorId} already holds E2E slot`);
      return;
    }

    // 檢查是否有可用槽位
    if (this.activeE2E.size < this.config.maxConcurrentE2E) {
      // 直接獲取槽位
      this.activeE2E.set(orchestratorId, {
        type: 'e2e',
        orchestratorId,
        acquiredAt: new Date(),
        pid: process.pid,
      });

      logger.info(
        `[ResourcePool] E2E slot acquired by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`
      );
      return;
    }

    // 槽位已滿，加入等待佇列
    logger.info(
      `[ResourcePool] E2E slot full, ${orchestratorId} waiting... (queue: ${this.e2eWaitQueue.length})`
    );

    return new Promise((resolve, reject) => {
      const queuedAt = new Date();
      const timeoutId = setTimeout(() => {
        // 超時，從佇列移除並拒絕
        const index = this.e2eWaitQueue.findIndex(
          item => item.orchestratorId === orchestratorId
        );
        if (index !== -1) {
          this.e2eWaitQueue.splice(index, 1);
        }

        reject(
          new Error(
            `E2E slot acquisition timeout for ${orchestratorId} after ${this.config.e2eWaitTimeout}ms`
          )
        );
      }, this.config.e2eWaitTimeout);

      this.e2eWaitQueue.push({
        orchestratorId,
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        queuedAt,
      });
    });
  }

  /**
   * 釋放 E2E 測試槽位
   */
  releaseE2ESlot(orchestratorId: string): void {
    if (!this.activeE2E.has(orchestratorId)) {
      logger.warn(`Orchestrator ${orchestratorId} does not hold E2E slot`);
      return;
    }

    this.activeE2E.delete(orchestratorId);
    logger.info(
      `[ResourcePool] E2E slot released by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`
    );

    // 檢查等待佇列
    this.processE2EWaitQueue();
  }

  /**
   * 處理 E2E 等待佇列
   */
  private processE2EWaitQueue(): void {
    while (
      this.e2eWaitQueue.length > 0 &&
      this.activeE2E.size < this.config.maxConcurrentE2E
    ) {
      const next = this.e2eWaitQueue.shift();
      if (!next) break;

      // 分配槽位
      this.activeE2E.set(next.orchestratorId, {
        type: 'e2e',
        orchestratorId: next.orchestratorId,
        acquiredAt: new Date(),
        pid: process.pid,
      });

      logger.info(
        `[ResourcePool] E2E slot assigned to ${next.orchestratorId} from queue (waited ${Date.now() - next.queuedAt.getTime()}ms)`
      );

      // 通知等待者
      next.resolve();
    }
  }

  /**
   * 檢查系統資源是否允許運行 E2E 測試
   */
  async canRunE2E(count: number = 1): Promise<{
    canRun: boolean;
    reason?: string;
    recommendation?: string;
  }> {
    // 檢查槽位
    const availableSlots = this.config.maxConcurrentE2E - this.activeE2E.size;
    if (count > availableSlots) {
      return {
        canRun: false,
        reason: `Insufficient E2E slots (need ${count}, available ${availableSlots})`,
        recommendation: `Wait for ${count - availableSlots} E2E test(s) to complete`,
      };
    }

    // 檢查系統資源
    return this.resourceManager.canRunE2E(count);
  }

  /**
   * 獲取當前狀態
   */
  getStatus(): {
    e2e: {
      active: number;
      max: number;
      waiting: number;
      slots: ResourceSlot[];
    };
    builds: {
      active: number;
      max: number;
      slots: ResourceSlot[];
    };
    systemResources?: unknown;
  } {
    return {
      e2e: {
        active: this.activeE2E.size,
        max: this.config.maxConcurrentE2E,
        waiting: this.e2eWaitQueue.length,
        slots: Array.from(this.activeE2E.values()),
      },
      builds: {
        active: this.activeBuilds.size,
        max: this.config.maxConcurrentBuilds,
        slots: Array.from(this.activeBuilds.values()),
      },
    };
  }

  /**
   * 生成狀態報告
   */
  async generateReport(): Promise<string> {
    const status = this.getStatus();
    const resources = await this.resourceManager.getResources();

    let report = '╔═══════════════════════════════════════════════════════════╗\n';
    report += '║         GLOBAL RESOURCE POOL STATUS                     ║\n';
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ E2E Tests:       ${status.e2e.active}/${status.e2e.max} active, ${status.e2e.waiting} waiting ${' '.repeat(19)}║\n`;
    report += `║ Build Tasks:     ${status.builds.active}/${status.builds.max} active ${' '.repeat(29)}║\n`;
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ CPU Usage:       ${resources.cpuUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
    report += `║ Memory Usage:    ${resources.memoryUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
    report += `║ Recommended:     ${resources.recommendedThreads} threads, ${resources.recommendedE2E} E2E ${' '.repeat(20)}║\n`;
    report += '╚═══════════════════════════════════════════════════════════╝\n';

    if (status.e2e.slots.length > 0) {
      report += '\n🔴 Active E2E Tests:\n';
      for (const slot of status.e2e.slots) {
        const duration = Date.now() - slot.acquiredAt.getTime();
        report += `  - ${slot.orchestratorId} (${Math.floor(duration / 1000)}s ago, PID: ${slot.pid})\n`;
      }
    }

    return report;
  }

  /**
   * 死鎖檢測
   */
  private async checkStaleLocksと(): Promise<void> {
    const now = Date.now();

    // 檢查 E2E 槽位
    for (const [orchestratorId, slot] of this.activeE2E.entries()) {
      const age = now - slot.acquiredAt.getTime();

      if (age > this.config.staleLockThreshold) {
        logger.warn(
          `[ResourcePool] Stale E2E slot detected: ${orchestratorId} (${Math.floor(age / 1000)}s old)`
        );

        // 檢查 PID 是否還存活
        try {
          process.kill(slot.pid, 0);  // Signal 0 只檢查，不發送信號
          logger.warn(`  PID ${slot.pid} still alive, keeping lock`);
        } catch (error) {
          // PID 已死，清理槽位
          logger.warn(`  PID ${slot.pid} dead, releasing stale lock`);
          this.activeE2E.delete(orchestratorId);
          this.processE2EWaitQueue();
        }
      }
    }
  }

  /**
   * 啟動死鎖檢測定時器
   */
  private startStaleCheckTimer(): void {
    this.staleCheckTimer = setInterval(() => {
      this.checkStaleLocksと().catch(error => {
        logger.error('[ResourcePool] Stale check error:', error);
      });
    }, this.config.staleCheckInterval);
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }

    // 拒絕所有等待中的請求
    for (const waiting of this.e2eWaitQueue) {
      waiting.reject(new Error('GlobalResourcePool is shutting down'));
    }
    this.e2eWaitQueue = [];

    this.activeE2E.clear();
    this.activeBuilds.clear();
  }
}

// 導出便利函數
export async function acquireE2ESlot(orchestratorId: string): Promise<void> {
  const pool = GlobalResourcePool.getInstance();
  return pool.acquireE2ESlot(orchestratorId);
}

export function releaseE2ESlot(orchestratorId: string): void {
  const pool = GlobalResourcePool.getInstance();
  pool.releaseE2ESlot(orchestratorId);
}

export async function canRunE2E(count: number = 1): Promise<ReturnType<GlobalResourcePool['canRunE2E']>> {
  const pool = GlobalResourcePool.getInstance();
  return pool.canRunE2E(count);
}
