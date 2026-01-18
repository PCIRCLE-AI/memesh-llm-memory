/**
 * Resource Monitor - System Resource Monitoring and Tracking
 *
 * Monitors CPU usage, memory consumption, and active background agents
 * to determine if the system can safely handle additional background tasks.
 * Provides threshold-based resource checks and real-time monitoring capabilities.
 *
 * Features:
 * - Real-time CPU and memory monitoring
 * - Concurrent background agent tracking
 * - Configurable resource thresholds
 * - Resource check before task execution
 * - Threshold exceeded event notifications
 *
 * @example
 * ```typescript
 * import { ResourceMonitor } from './ResourceMonitor.js';
 * import { DEFAULT_EXECUTION_CONFIG } from './types.js';
 *
 * // Create resource monitor with defaults
 * const monitor = new ResourceMonitor();
 *
 * // Check if system can run a task
 * const check = monitor.canRunBackgroundTask(DEFAULT_EXECUTION_CONFIG);
 * if (check.canExecute) {
 *   monitor.registerBackgroundTask();
 *   // Execute task...
 *   monitor.unregisterBackgroundTask();
 * } else {
 *   console.warn(check.reason);
 *   console.log(check.suggestion);
 * }
 *
 * // Monitor for high CPU usage
 * const unsubscribe = monitor.onThresholdExceeded('cpu', (resources) => {
 *   console.warn(`High CPU usage: ${resources.cpu.usage}%`);
 * });
 *
 * // Get current system resources
 * const resources = monitor.getCurrentResources();
 * console.log(`CPU: ${resources.cpu.usage}%, Memory: ${resources.memory.usagePercent}%`);
 * ```
 */

import os from 'os';
import { SystemResources, ResourceCheckResult, ExecutionConfig } from './types.js';
import { ValidationError } from '../errors/index.js';

/**
 * ResourceMonitor Class
 *
 * Monitors system resources and manages background task execution limits.
 * Prevents system overload by checking resource availability before task execution.
 */
export class ResourceMonitor {
  private activeBackgroundCount: number = 0;
  private maxBackgroundAgents: number;
  private thresholds: {
    maxCPU: number;
    maxMemory: number;
  };

  /**
   * Create a new ResourceMonitor
   *
   * Initializes the resource monitor with configurable limits for concurrent
   * background agents and resource usage thresholds.
   *
   * @param maxBackgroundAgents - Maximum concurrent background agents (default: 6)
   * @param thresholds - Resource usage thresholds
   * @param thresholds.maxCPU - Maximum CPU usage percentage (default: 70%)
   * @param thresholds.maxMemory - Maximum memory usage in MB (default: 8192 MB / 8 GB)
   *
   * @example
   * ```typescript
   * // Use defaults (6 agents, 70% CPU, 8GB memory)
   * const monitor = new ResourceMonitor();
   *
   * // Custom limits for high-resource system
   * const highEndMonitor = new ResourceMonitor(10, {
   *   maxCPU: 85,
   *   maxMemory: 16384 // 16GB
   * });
   *
   * // Conservative limits for resource-constrained system
   * const conservativeMonitor = new ResourceMonitor(3, {
   *   maxCPU: 50,
   *   maxMemory: 4096 // 4GB
   * });
   * ```
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
   *
   * Retrieves real-time system resource information including CPU usage,
   * memory usage, and active background agent count.
   *
   * @returns SystemResources Current resource snapshot
   *
   * @example
   * ```typescript
   * const resources = monitor.getCurrentResources();
   *
   * console.log(`CPU Usage: ${resources.cpu.usage.toFixed(1)}%`);
   * console.log(`CPU Cores: ${resources.cpu.cores}`);
   * console.log(`Memory: ${resources.memory.used.toFixed(0)}MB / ${resources.memory.total.toFixed(0)}MB`);
   * console.log(`Memory Usage: ${resources.memory.usagePercent.toFixed(1)}%`);
   * console.log(`Active Agents: ${resources.activeBackgroundAgents}`);
   *
   * // Check if resources are healthy
   * if (resources.cpu.usage < 50 && resources.memory.usagePercent < 70) {
   *   console.log('System resources healthy');
   * }
   * ```
   */
  getCurrentResources(): SystemResources {
    const cpus = os.cpus();
    const fallbackCores = typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : 1;
    const cores = Math.max(cpus.length, fallbackCores, 1);
    const totalMem = os.totalmem() / (1024 * 1024); // Convert to MB
    const freeMem = os.freemem() / (1024 * 1024); // Convert to MB
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage (simplified - in production use better method)
    // This is a simplified calculation based on load average
    const loadAvg = os.loadavg()[0]; // 1 minute load average
    const cpuUsage = Math.min(100, (loadAvg / cores) * 100);

    return {
      cpu: {
        usage: cpuUsage,
        cores,
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
   *
   * Evaluates current system resources against thresholds and task requirements
   * to determine if a background task can be safely executed.
   *
   * Checks performed:
   * - Concurrent agent limit
   * - CPU usage threshold
   * - Memory usage threshold
   * - Task-specific resource requirements (if config provided)
   *
   * @param config - Optional execution configuration with resource limits
   * @returns ResourceCheckResult Check result with canExecute flag, reason, and suggestion
   *
   * @example
   * ```typescript
   * import { DEFAULT_EXECUTION_CONFIG } from './types.js';
   *
   * // Basic check without config
   * const check1 = monitor.canRunBackgroundTask();
   * if (!check1.canExecute) {
   *   console.warn(`Cannot execute: ${check1.reason}`);
   *   console.log(`Suggestion: ${check1.suggestion}`);
   * }
   *
   * // Check with specific task requirements
   * const check2 = monitor.canRunBackgroundTask(DEFAULT_EXECUTION_CONFIG);
   * if (check2.canExecute) {
   *   console.log('System can handle this task');
   *   console.log(`Available CPU: ${check2.resources?.cpu.usage}%`);
   *   console.log(`Available Memory: ${check2.resources?.memory.available}MB`);
   * }
   *
   * // Check for high-resource task
   * const heavyTaskConfig = {
   *   ...DEFAULT_EXECUTION_CONFIG,
   *   resourceLimits: {
   *     maxCPU: 50,
   *     maxMemory: 4096,
   *     maxDuration: 3600
   *   }
   * };
   * const check3 = monitor.canRunBackgroundTask(heavyTaskConfig);
   * if (!check3.canExecute) {
   *   console.log(`Wait for more resources: ${check3.suggestion}`);
   * }
   * ```
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
