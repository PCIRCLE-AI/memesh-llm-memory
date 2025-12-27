/**
 * ProgressRenderer - Terminal rendering for Dashboard
 *
 * Renders real-time progress updates in the terminal
 * with throttling to prevent flicker
 */

import chalk from 'chalk';
import logUpdate from 'log-update';
import cliSpinners from 'cli-spinners';
import Table from 'cli-table3';
import { DashboardState, DashboardConfig } from './types.js';

/**
 * ProgressRenderer
 *
 * Manages terminal rendering with:
 * - 100ms throttling to prevent terminal flicker
 * - Spinner animations
 * - Colored output using chalk
 * - Table formatting for agent status
 */
export class ProgressRenderer {
  private config: DashboardConfig;
  private running: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastRenderTime: number = 0;
  private static readonly MINIMUM_RENDER_INTERVAL = 100; // 100ms = 10 FPS max
  private logUpdate = logUpdate;

  // Spinner state
  private spinnerFrames: string[];
  private spinnerIndex: number = 0;

  constructor(config: DashboardConfig) {
    this.config = config;

    // Initialize spinner (use dots spinner from cli-spinners)
    const spinner = cliSpinners.dots;
    this.spinnerFrames = spinner.frames;
  }

  /**
   * Check if renderer is currently running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Start rendering with state callback
   * @param getState Function that returns current dashboard state
   */
  public start(getState: () => DashboardState): void {
    this.running = true;

    // Render immediately once
    const state = getState();
    const output = this.renderDashboard(state);
    this.logUpdate(output);
    this.lastRenderTime = Date.now();

    // Then set up interval for subsequent renders
    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRender = now - this.lastRenderTime;

      // THROTTLING: Skip render if called too frequently
      if (timeSinceLastRender < ProgressRenderer.MINIMUM_RENDER_INTERVAL) {
        return;
      }

      const state = getState();
      const output = this.renderDashboard(state);
      this.logUpdate(output);
      this.lastRenderTime = now;

      // Update spinner
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    }, this.config.updateInterval);
  }

  /**
   * Stop rendering and clear terminal
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.running = false;
    this.logUpdate.clear();
  }

  /**
   * Render complete dashboard
   * @private - exposed for testing
   */
  private renderDashboard(state: DashboardState): string {
    const sections: string[] = [];

    // Header
    sections.push(this.renderHeader());

    // Active Agents
    if (state.activeAgents.size > 0) {
      sections.push(this.renderActiveAgents(state));
    }

    // Metrics (if enabled)
    if (this.config.showMetrics) {
      sections.push(this.renderMetrics(state));
    }

    // Attribution (if enabled and has events)
    if (this.config.showAttribution && state.recentEvents.length > 0) {
      sections.push(this.renderAttribution(state));
    }

    return sections.join('\n\n');
  }

  /**
   * Render dashboard header with spinner
   */
  private renderHeader(): string {
    const spinner = this.config.showSpinner ? this.spinnerFrames[this.spinnerIndex] : '';
    return chalk.bold.cyan(`${spinner} Smart Agents Dashboard`);
  }

  /**
   * Render active agents table
   */
  private renderActiveAgents(state: DashboardState): string {
    const table = new Table({
      head: [
        chalk.bold('Agent'),
        chalk.bold('Task'),
        chalk.bold('Progress'),
        chalk.bold('Status'),
      ],
      colWidths: [20, 40, 12, 12],
    });

    for (const [agentId, agent] of state.activeAgents) {
      const progressPercent = Math.round(agent.progress * 100);
      const progressBar = this.createProgressBar(agent.progress);
      const statusColor = agent.status === 'running' ? chalk.green : chalk.yellow;

      table.push([
        chalk.cyan(agent.agentType),
        agent.currentTask || 'No task',
        `${progressBar} ${progressPercent}%`,
        statusColor(agent.status),
      ]);
    }

    return `${chalk.bold('Active Agents:')}\n${table.toString()}`;
  }

  /**
   * Render metrics section
   */
  private renderMetrics(state: DashboardState): string {
    const { metrics } = state;
    const completionRate =
      metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0;
    const timeSaved = this.formatDuration(metrics.estimatedTimeSaved);
    const tokensFormatted = this.formatNumber(metrics.tokensUsed);

    const lines = [
      chalk.bold('Session Metrics:'),
      `  ${chalk.gray('Tasks:')} ${chalk.green(metrics.completedTasks)}/${metrics.totalTasks} ${chalk.gray(`(${completionRate}%)`)}`,
      `  ${chalk.gray('Failed:')} ${metrics.failedTasks > 0 ? chalk.red(metrics.failedTasks) : chalk.gray(metrics.failedTasks)}`,
      `  ${chalk.gray('Time Saved:')} ${chalk.cyan(timeSaved)}`,
      `  ${chalk.gray('Tokens:')} ${tokensFormatted}`,
    ];

    // Add agent usage breakdown
    if (Object.keys(metrics.agentUsageCount).length > 0) {
      lines.push(`  ${chalk.gray('Agent Usage:')}`);
      for (const [agentType, count] of Object.entries(metrics.agentUsageCount)) {
        lines.push(`    ${chalk.gray('→')} ${agentType}: ${chalk.cyan(count)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render attribution section
   */
  private renderAttribution(state: DashboardState): string {
    const lines = [chalk.bold('Recent Events:')];

    const recentEvents = state.recentEvents.slice(0, this.config.maxRecentEvents);
    for (const event of recentEvents) {
      const timestamp = event.timestamp.toLocaleTimeString();
      const icon = event.type === 'success' ? chalk.green('✓') : chalk.red('✗');
      const typeLabel = event.type === 'success' ? chalk.green('SUCCESS') : chalk.red('ERROR');

      lines.push(`  ${icon} ${chalk.gray(timestamp)} ${typeLabel} ${chalk.gray('→')} ${event.agentType}: ${event.taskDescription}`);
    }

    return lines.join('\n');
  }

  /**
   * Create ASCII progress bar
   */
  private createProgressBar(progress: number, width: number = 10): string {
    const filled = Math.round(progress * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return chalk.cyan(bar);
  }

  /**
   * Format duration in seconds to human-readable string
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Format large numbers with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
