/**
 * Dashboard - Main orchestrator for Terminal UI
 *
 * Coordinates all UI components and manages dashboard state
 * Includes memory management to prevent event listener leaks
 */

import { UIEventBus } from './UIEventBus.js';
import { ProgressRenderer } from './ProgressRenderer.js';
import { AttributionManager } from './AttributionManager.js';
import { MetricsStore } from './MetricsStore.js';
import { ResourceMonitor } from '../core/ResourceMonitor.js';
import type {
  DashboardStateForRendering,
  UIConfig,
  ProgressIndicator,
  AttributionMessage,
  SessionMetrics,
  DashboardConfig,
} from './types.js';
import { DEFAULT_UI_CONFIG } from './types.js';

/**
 * Main dashboard orchestrator
 * Coordinates all UI components and manages state
 * IMPORTANT: Includes memory management to prevent event listener leaks
 */
export class Dashboard {
  private eventBus: UIEventBus;
  private renderer: ProgressRenderer;
  private attributionManager: AttributionManager;
  private metricsStore: MetricsStore;
  private resourceMonitor: ResourceMonitor;
  private config: UIConfig;

  private activeAgents: Map<string, ProgressIndicator> = new Map();
  private running: boolean = false;
  private resourceUpdateInterval: NodeJS.Timeout | null = null;

  // MEMORY MANAGEMENT: Store unsubscribe functions to prevent listener leaks
  private unsubscribeFunctions: Array<() => void> = [];

  constructor(resourceMonitor: ResourceMonitor, customConfig?: Partial<UIConfig>) {
    this.config = { ...DEFAULT_UI_CONFIG, ...customConfig };
    this.resourceMonitor = resourceMonitor;

    this.eventBus = UIEventBus.getInstance();

    // Convert UIConfig to DashboardConfig for ProgressRenderer
    const dashboardConfig: DashboardConfig = {
      updateInterval: this.config.updateInterval,
      maxRecentEvents: this.config.maxRecentAttributions,
      showSpinner: this.config.animationsEnabled,
      showMetrics: true,
      showAttribution: true,
    };

    this.renderer = new ProgressRenderer(dashboardConfig);
    this.attributionManager = new AttributionManager(this.eventBus);
    this.metricsStore = new MetricsStore();

    this.setupEventListeners();
  }

  /**
   * Start the dashboard
   */
  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    // Start progress renderer
    this.renderer.start(() => this.getDashboardState());

    // Start resource monitoring
    this.resourceUpdateInterval = setInterval(() => {
      const resources = this.resourceMonitor.getCurrentResources();
      // Note: UIEventBus doesn't have emitResourceUpdate, but renderer reads from getState()
    }, 1000); // Update resources every second

    // Load existing metrics if available
    this.metricsStore.load().catch(() => {
      // Ignore load errors (file may not exist yet)
    });
  }

  /**
   * Stop the dashboard
   */
  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop renderer
    this.renderer.stop();

    // Stop resource monitoring
    if (this.resourceUpdateInterval) {
      clearInterval(this.resourceUpdateInterval);
      this.resourceUpdateInterval = null;
    }

    // Persist metrics before stopping
    this.metricsStore.persist().catch((err) => {
      console.error('Failed to persist metrics:', err);
    });
  }

  /**
   * Check if dashboard is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current dashboard state
   */
  public getState(): DashboardStateForRendering {
    return {
      resources: this.resourceMonitor.getCurrentResources(),
      agents: Array.from(this.activeAgents.values()),
      recentAttributions: this.attributionManager.getRecentAttributions(
        this.config.maxRecentAttributions
      ),
      sessionMetrics: this.metricsStore.getCurrentSessionMetrics(),
    };
  }

  /**
   * Get dashboard state (alias for ProgressRenderer compatibility)
   */
  private getDashboardState() {
    // ProgressRenderer expects DashboardState with activeAgents Map
    // Convert our state to match the expected format
    const state = this.getState();
    return {
      activeAgents: this.activeAgents,
      recentEvents: state.recentAttributions.map(attr => ({
        type: attr.type,
        agentType: attr.agentIds[0] || 'unknown',
        taskDescription: attr.taskDescription,
        timestamp: attr.timestamp,
        result: attr.type === 'success' ? attr.metadata : undefined,
        error: attr.type === 'error' ? attr.metadata?.error : undefined,
        sanitized: attr.type === 'error',
      })),
      metrics: {
        sessionStart: state.sessionMetrics.startedAt,
        totalTasks: state.sessionMetrics.tasksCompleted + state.sessionMetrics.tasksFailed,
        completedTasks: state.sessionMetrics.tasksCompleted,
        failedTasks: state.sessionMetrics.tasksFailed,
        agentUsageCount: state.sessionMetrics.agentUsageBreakdown,
        estimatedTimeSaved: state.sessionMetrics.totalTimeSaved * 60, // convert minutes to seconds
        tokensUsed: state.sessionMetrics.totalTokensUsed,
      },
    };
  }

  /**
   * Get attribution manager (for external integration)
   */
  public getAttributionManager(): AttributionManager {
    return this.attributionManager;
  }

  /**
   * Get metrics store (for external integration)
   */
  public getMetricsStore(): MetricsStore {
    return this.metricsStore;
  }

  /**
   * Setup event listeners
   * IMPORTANT: Stores unsubscribe functions for proper cleanup
   */
  private setupEventListeners(): void {
    // Listen for progress updates
    const unsubProgress = this.eventBus.onProgress((progress: ProgressIndicator) => {
      // Convert to AgentStatus format expected by activeAgents map
      const agentStatus = {
        agentId: progress.agentId,
        agentType: progress.agentType,
        status: this.determineStatus(progress),
        progress: progress.progress,
        currentTask: progress.currentStage,
        startTime: progress.startTime,
        endTime: progress.endTime,
      };

      if (agentStatus.status === 'completed' || agentStatus.status === 'failed' || agentStatus.status === 'cancelled') {
        this.activeAgents.delete(progress.agentId);
      } else {
        // Store as ProgressIndicator (matches the type expected by getState())
        this.activeAgents.set(progress.agentId, progress);
      }
    });
    this.unsubscribeFunctions.push(unsubProgress);

    // Listen for attributions and record metrics
    const unsubAttribution = this.eventBus.onAttribution((attribution: AttributionMessage) => {
      this.metricsStore.recordAttribution(attribution);
    });
    this.unsubscribeFunctions.push(unsubAttribution);

    // Listen for metrics updates (if needed in the future)
    const unsubMetrics = this.eventBus.onMetricsUpdate((metrics: any) => {
      // Could trigger special UI updates for milestones, etc.
      // For now, just let the renderer pick it up from getState()
    });
    this.unsubscribeFunctions.push(unsubMetrics);
  }

  /**
   * Determine status from progress indicator
   */
  private determineStatus(progress: ProgressIndicator): 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' {
    if (progress.endTime) {
      // Task has ended - assume completed unless we have other info
      return 'completed';
    } else if (progress.progress > 0) {
      return 'running';
    } else {
      return 'queued';
    }
  }

  /**
   * Destroy dashboard and cleanup all resources
   * CRITICAL: Must be called before discarding Dashboard instance to prevent memory leaks
   */
  public destroy(): void {
    // Stop dashboard if running
    if (this.running) {
      this.stop();
    }

    // Unsubscribe from all event listeners
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];

    // Clear active agents map
    this.activeAgents.clear();

    // Note: We don't destroy singleton components (UIEventBus, etc.)
    // as they may be used by other parts of the system
  }
}

// Re-export for convenience
export { UIEventBus } from './UIEventBus.js';
export { ProgressRenderer } from './ProgressRenderer.js';
export { AttributionManager } from './AttributionManager.js';
export { MetricsStore } from './MetricsStore.js';
export * from './types.js';
