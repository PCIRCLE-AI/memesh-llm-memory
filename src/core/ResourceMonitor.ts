/**
 * Resource Monitor - System resource monitoring and tracking
 *
 * Monitors CPU, memory, and active background agents to determine
 * if the system can handle additional background tasks.
 */

import os from 'os';
import { SystemResources, ResourceCheckResult, ExecutionConfig } from './types.js';
import { ValidationError } from '../errors/index.js';

export class ResourceMonitor {
  private activeBackgroundCount: number = 0;
  private maxBackgroundAgents: number;
  private thresholds: {
    maxCPU: number;
    maxMemory: number;
  };

  /**
   * Create a new ResourceMonitor
   * @param maxBackgroundAgents Maximum concurrent background agents (default: 6)
   * @param thresholds Resource usage thresholds
   */
  constructor(
    maxBackgroundAgents: number = 6,
    thresholds?: {
      maxCPU?: number;
      maxMemory?: number;
    }
  ) {
    this.maxBackgroundAgents = maxBackgroundAgents;
    this.thresholds = {
      maxCPU: thresholds?.maxCPU ?? 70,
      maxMemory: thresholds?.maxMemory ?? 8192, // 8GB in MB
    };
  }

  /**
   * Get current system resources
   */
  getCurrentResources(): SystemResources {
    const cpus = os.cpus();
    const totalMem = os.totalmem() / (1024 * 1024); // Convert to MB
    const freeMem = os.freemem() / (1024 * 1024); // Convert to MB
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage (simplified - in production use better method)
    // This is a simplified calculation based on load average
    const loadAvg = os.loadavg()[0]; // 1 minute load average
    const cpuUsage = Math.min(100, (loadAvg / cpus.length) * 100);

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        available: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      activeBackgroundAgents: this.activeBackgroundCount,
    };
  }

  /**
   * Check if system can run a background task
   * @param config Execution configuration
   */
  canRunBackgroundTask(config?: ExecutionConfig): ResourceCheckResult {
    const resources = this.getCurrentResources();

    // Check concurrent agents limit
    if (resources.activeBackgroundAgents >= this.maxBackgroundAgents) {
      return {
        canExecute: false,
        reason: `Max concurrent background agents reached (${this.maxBackgroundAgents})`,
        suggestion: 'Wait for existing tasks to complete or use foreground mode',
        resources,
      };
    }

    // Check CPU usage
    if (resources.cpu.usage > this.thresholds.maxCPU) {
      return {
        canExecute: false,
        reason: `CPU usage too high (${resources.cpu.usage.toFixed(1)}% > ${this.thresholds.maxCPU}%)`,
        suggestion: 'Use foreground mode or wait for CPU usage to decrease',
        resources,
      };
    }

    // Check memory usage
    if (resources.memory.used > this.thresholds.maxMemory) {
      return {
        canExecute: false,
        reason: `Memory usage too high (${resources.memory.used.toFixed(0)}MB > ${this.thresholds.maxMemory}MB)`,
        suggestion: 'Close other applications or use foreground mode',
        resources,
      };
    }

    // If config specifies limits, check against them
    if (config) {
      const { maxCPU, maxMemory } = config.resourceLimits;

      // Check if task's CPU requirement can be met
      const availableCPU = this.thresholds.maxCPU - resources.cpu.usage;
      if (maxCPU > availableCPU) {
        return {
          canExecute: false,
          reason: `Task requires ${maxCPU}% CPU but only ${availableCPU.toFixed(1)}% available`,
          suggestion: 'Reduce task resource requirements or wait',
          resources,
        };
      }

      // Check if task's memory requirement can be met
      if (maxMemory > resources.memory.available) {
        return {
          canExecute: false,
          reason: `Task requires ${maxMemory}MB but only ${resources.memory.available.toFixed(0)}MB available`,
          suggestion: 'Reduce task memory requirements or wait',
          resources,
        };
      }
    }

    return {
      canExecute: true,
      resources,
    };
  }

  /**
   * Register a new background task starting
   */
  registerBackgroundTask(): void {
    this.activeBackgroundCount++;
  }

  /**
   * Unregister a background task that completed/failed
   */
  unregisterBackgroundTask(): void {
    if (this.activeBackgroundCount > 0) {
      this.activeBackgroundCount--;
    }
  }

  /**
   * Get current active background agent count
   */
  getActiveBackgroundCount(): number {
    return this.activeBackgroundCount;
  }

  /**
   * Set threshold for CPU usage
   */
  setMaxCPU(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new ValidationError('CPU percentage must be between 0 and 100', {
        value: percentage,
        min: 0,
        max: 100,
      });
    }
    this.thresholds.maxCPU = percentage;
  }

  /**
   * Set threshold for memory usage
   */
  setMaxMemory(megabytes: number): void {
    if (megabytes < 0) {
      throw new ValidationError('Memory must be positive', {
        value: megabytes,
        min: 0,
      });
    }
    this.thresholds.maxMemory = megabytes;
  }

  /**
   * Set maximum concurrent background agents
   */
  setMaxBackgroundAgents(count: number): void {
    if (count < 1) {
      throw new ValidationError('Max background agents must be at least 1', {
        value: count,
        min: 1,
      });
    }
    this.maxBackgroundAgents = count;
  }

  /**
   * Register a callback for threshold exceeded events
   * @param threshold Type of threshold ('cpu' | 'memory')
   * @param callback Callback function to execute
   */
  onThresholdExceeded(
    threshold: 'cpu' | 'memory',
    callback: (resources: SystemResources) => void
  ): () => void {
    // Check periodically
    const intervalId = setInterval(() => {
      const resources = this.getCurrentResources();

      if (threshold === 'cpu' && resources.cpu.usage > this.thresholds.maxCPU) {
        callback(resources);
      } else if (
        threshold === 'memory' &&
        resources.memory.used > this.thresholds.maxMemory
      ) {
        callback(resources);
      }
    }, 5000); // Check every 5 seconds

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}
