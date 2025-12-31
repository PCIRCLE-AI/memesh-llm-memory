/**
 * Dashboard - Terminal UI Dashboard for Claude Code Buddy
 *
 * Central dashboard that coordinates UI updates, tracks active agents,
 * monitors resources, and displays session metrics in real-time.
 *
 * Features:
 * - Real-time resource monitoring
 * - Active agent progress tracking
 * - Attribution management (success/error tracking)
 * - Session metrics and productivity stats
 * - Periodic updates with configurable interval
 */

import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { UIEventBus } from './UIEventBus.js';
import {
  UIConfig,
  DEFAULT_UI_CONFIG,
  DashboardStateForRendering,
  ProgressIndicator,
  AttributionMessage,
  SessionMetrics,
  AttributionEntry,
} from './types.js';

/**
 * Dashboard Class
 *
 * Manages the terminal dashboard state and periodic updates.
 */
export class Dashboard {
  private resourceMonitor: ResourceMonitor;
  private uiEventBus: UIEventBus;
  private config: UIConfig;

  // Dashboard state
  private running: boolean = false;
  private updateIntervalId?: NodeJS.Timeout;

  // Active agents tracking
  private activeAgents: Map<string, ProgressIndicator> = new Map();

  // Attribution tracking
  private recentAttributions: AttributionMessage[] = [];

  // Session metrics
  private sessionMetrics: SessionMetrics;

  /**
   * Create a new Dashboard
   * @param resourceMonitor Resource monitor instance
   * @param config Optional UI configuration
   */
  constructor(resourceMonitor: ResourceMonitor, config?: Partial<UIConfig>) {
    this.resourceMonitor = resourceMonitor;
    this.uiEventBus = UIEventBus.getInstance();
    this.config = {
      ...DEFAULT_UI_CONFIG,
      ...config,
    };

    // Initialize session metrics
    this.sessionMetrics = {
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTimeSaved: 0,
      totalTokensUsed: 0,
      agentUsageBreakdown: {},
    };

    // Subscribe to UI events
    this.setupEventListeners();
  }

  /**
   * Start dashboard updates
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    // Start periodic updates
    this.updateIntervalId = setInterval(() => {
      this.updateDashboard();
    }, this.config.updateInterval);

    // Initial update
    this.updateDashboard();
  }

  /**
   * Stop dashboard updates
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }
  }

  /**
   * Check if dashboard is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current dashboard state for rendering
   */
  getState(): DashboardStateForRendering {
    const resources = this.resourceMonitor.getCurrentResources();

    return {
      resources,
      agents: Array.from(this.activeAgents.values()),
      recentAttributions: this.recentAttributions,
      sessionMetrics: this.sessionMetrics,
    };
  }

  /**
   * Update dashboard (called periodically)
   */
  private updateDashboard(): void {
    // Update resource stats
    const resources = this.resourceMonitor.getCurrentResources();

    // Emit metrics update event
    this.uiEventBus.emitMetricsUpdate({
      sessionStart: this.sessionMetrics.startedAt,
      totalTasks: this.sessionMetrics.tasksCompleted + this.sessionMetrics.tasksFailed,
      completedTasks: this.sessionMetrics.tasksCompleted,
      failedTasks: this.sessionMetrics.tasksFailed,
      agentUsageCount: this.sessionMetrics.agentUsageBreakdown,
      estimatedTimeSaved: this.sessionMetrics.totalTimeSaved * 60, // convert minutes to seconds
      tokensUsed: this.sessionMetrics.totalTokensUsed,
    });
  }

  /**
   * Setup event listeners for UI events
   */
  private setupEventListeners(): void {
    // Progress updates
    this.uiEventBus.onProgress((progress) => {
      this.activeAgents.set(progress.agentId, progress);
    });

    // Agent start
    this.uiEventBus.onAgentStart((data) => {
      // Track agent usage
      const agentType = data.agentType;
      this.sessionMetrics.agentUsageBreakdown[agentType] =
        (this.sessionMetrics.agentUsageBreakdown[agentType] || 0) + 1;
    });

    // Agent complete
    this.uiEventBus.onAgentComplete((data) => {
      this.activeAgents.delete(data.agentId);
    });

    // Success
    this.uiEventBus.onSuccess((success) => {
      this.activeAgents.delete(success.agentId);
      this.sessionMetrics.tasksCompleted++;

      // Add to attribution
      this.addAttribution({
        id: this.generateAttributionId(),
        type: 'success',
        timestamp: success.timestamp,
        agentIds: [success.agentId],
        taskDescription: success.taskDescription,
        metadata: {
          timeSaved: Math.round(success.duration / 1000 / 60), // Convert to minutes
        },
      });
    });

    // Error
    this.uiEventBus.onError((error) => {
      this.activeAgents.delete(error.agentId);
      this.sessionMetrics.tasksFailed++;

      // Add to attribution
      this.addAttribution({
        id: this.generateAttributionId(),
        type: 'error',
        timestamp: error.timestamp,
        agentIds: [error.agentId],
        taskDescription: error.taskDescription,
        metadata: {
          error: {
            name: error.error.name,
            message: error.error.message,
            stack: error.error.stack,
          },
        },
      });
    });
  }

  /**
   * Add attribution to recent list
   */
  private addAttribution(attribution: AttributionMessage): void {
    this.recentAttributions.unshift(attribution);

    // Limit size to maxRecentAttributions
    if (this.recentAttributions.length > this.config.maxRecentAttributions) {
      this.recentAttributions = this.recentAttributions.slice(
        0,
        this.config.maxRecentAttributions
      );
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate unique attribution ID
   */
  private generateAttributionId(): string {
    return `attr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
