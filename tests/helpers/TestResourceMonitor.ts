import type { SystemResources } from '../../src/core/types.js';
import { ResourceMonitor } from '../../src/core/ResourceMonitor.js';

interface TestResourceMonitorOptions {
  cpuUsage?: number;
  cores?: number;
  memoryTotalMB?: number;
  memoryUsedMB?: number;
}

export class TestResourceMonitor extends ResourceMonitor {
  private cpuUsage: number;
  private cores: number;
  private memoryTotalMB: number;
  private memoryUsedMB: number;

  constructor(
    maxBackgroundAgents: number = 6,
    thresholds?: { maxCPU?: number; maxMemory?: number },
    options: TestResourceMonitorOptions = {}
  ) {
    super(maxBackgroundAgents, thresholds);
    this.cpuUsage = options.cpuUsage ?? 5;
    this.cores = options.cores ?? 8;
    this.memoryTotalMB = options.memoryTotalMB ?? 16384;
    this.memoryUsedMB = options.memoryUsedMB ?? 1024;
  }

  setResources(options: TestResourceMonitorOptions): void {
    if (options.cpuUsage !== undefined) this.cpuUsage = options.cpuUsage;
    if (options.cores !== undefined) this.cores = options.cores;
    if (options.memoryTotalMB !== undefined) this.memoryTotalMB = options.memoryTotalMB;
    if (options.memoryUsedMB !== undefined) this.memoryUsedMB = options.memoryUsedMB;
  }

  getCurrentResources(): SystemResources {
    const total = this.memoryTotalMB;
    const used = this.memoryUsedMB;
    const available = Math.max(total - used, 0);

    return {
      cpu: {
        usage: this.cpuUsage,
        cores: this.cores,
      },
      memory: {
        total,
        used,
        available,
        usagePercent: total > 0 ? (used / total) * 100 : 0,
      },
      activeBackgroundAgents: this.getActiveBackgroundCount(),
    };
  }
}
