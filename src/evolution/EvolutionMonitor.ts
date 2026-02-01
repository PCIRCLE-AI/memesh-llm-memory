/**
 * Evolution Monitor - Dashboard and Metrics
 *
 * Provides queryable metrics for monitoring agent evolution
 */

import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearningManager } from './LearningManager.js';
import type { AdaptationEngine } from './AdaptationEngine.js';
import type { EvolutionStats } from './types.js';
import { getAllAgentConfigs } from './AgentEvolutionConfig.js';
import * as asciichart from 'asciichart';
import { ValidationError } from '../errors/index.js'; // ✅ FIX MAJOR-4
import { logger } from '../utils/logger.js'; // ✅ FIX MAJOR-4

export interface DashboardSummary {
  totalAgents: number;
  agentsWithPatterns: number;
  totalPatterns: number;
  totalExecutions: number;
  averageSuccessRate: number;
  topImprovingAgents: Array<{
    agentId: string;
    improvement: number;
  }>;
}

export interface AgentLearningProgress {
  agentId: string;
  totalExecutions: number;
  learnedPatterns: number;
  appliedAdaptations: number;
  successRateImprovement: number;
  lastLearningDate: Date | null;
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesMetrics {
  metricName: string;
  dataPoints: TimeSeriesDataPoint[];
  statistics?: {
    min: number;
    max: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface DashboardExport {
  exportedAt: number;
  summary: DashboardSummary;
  timeSeries: TimeSeriesMetrics[];
  learningProgress: AgentLearningProgress[];
}

export class EvolutionMonitor {
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;
  private adaptationEngine: AdaptationEngine;

  // Test helper data structures
  private metricsHistory: Map<string, Array<{ value: number; timestamp: number; metadata?: Record<string, unknown> }>> = new Map();
  private alertThresholds: Map<string, number> = new Map();
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private triggeredAlerts: Array<{
    type: string;
    metric: string;
    threshold: number;
    actualValue: number;
    timestamp: number;
  }> = [];
  private isInitialized: boolean = false;

  constructor(
    performanceTracker?: PerformanceTracker,
    learningManager?: LearningManager,
    adaptationEngine?: AdaptationEngine
  ) {
    this.performanceTracker = performanceTracker as PerformanceTracker;
    this.learningManager = learningManager as LearningManager;
    this.adaptationEngine = adaptationEngine as AdaptationEngine;
    this.isInitialized = true;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): DashboardSummary {
    const allConfigs = getAllAgentConfigs();
    const allAgents = Array.from(allConfigs.keys());

    let totalPatterns = 0;
    let totalExecutions = 0;
    let agentsWithPatterns = 0;
    const successRates: number[] = [];
    const improvements: Array<{ agentId: string; improvement: number }> = [];

    allAgents.forEach(agentId => {
      const stats = this.performanceTracker.getEvolutionStats(agentId);
      const patterns = this.learningManager.getPatterns(agentId);

      totalExecutions += stats.totalExecutions;
      totalPatterns += patterns.length;

      if (patterns.length > 0) {
        agentsWithPatterns++;
      }

      if (stats.totalExecutions > 0) {
        successRates.push(stats.successRateTrend.recent);
        improvements.push({
          agentId,
          improvement: stats.successRateTrend.improvement,
        });
      }
    });

    // Sort by improvement
    improvements.sort((a, b) => b.improvement - a.improvement);

    return {
      totalAgents: allAgents.length,
      agentsWithPatterns,
      totalPatterns,
      totalExecutions,
      averageSuccessRate:
        successRates.length > 0
          ? successRates.reduce((a, b) => a + b, 0) / successRates.length
          : 0,
      topImprovingAgents: improvements.slice(0, 5),
    };
  }

  /**
   * Get evolution stats for specific agent
   */
  getAgentStats(agentId: string): EvolutionStats {
    return this.performanceTracker.getEvolutionStats(agentId);
  }

  /**
   * Get learning progress for all agents
   */
  getLearningProgress(): AgentLearningProgress[] {
    const allConfigs = getAllAgentConfigs();
    const allAgents = Array.from(allConfigs.keys());

    return allAgents.map(agentId => {
      const stats = this.performanceTracker.getEvolutionStats(agentId);
      const patterns = this.learningManager.getPatterns(agentId);

      return {
        agentId,
        totalExecutions: stats.totalExecutions,
        learnedPatterns: patterns.length,
        appliedAdaptations: stats.appliedAdaptations,
        successRateImprovement: stats.successRateTrend.improvement,
        lastLearningDate: stats.totalExecutions > 0 ? stats.lastLearningDate : null,
      };
    });
  }

  /**
   * Format dashboard for terminal display
   */
  formatDashboard(options?: { includeCharts?: boolean; chartHeight?: number }): string {
    const summary = this.getDashboardSummary();
    const progress = this.getLearningProgress();

    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║          🧠 Claude Code Buddy Evolution Dashboard         ║');
    lines.push('╚═══════════════════════════════════════════════════════════╝');
    lines.push('');

    // Summary
    lines.push('📊 Overview:');
    lines.push(`   Total Agents: ${summary.totalAgents}`);
    lines.push(`   Agents with Learned Patterns: ${summary.agentsWithPatterns}`);
    lines.push(`   Total Patterns: ${summary.totalPatterns}`);
    lines.push(`   Total Executions: ${summary.totalExecutions}`);
    lines.push(`   Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`);
    lines.push('');

    // Top improving agents
    if (summary.topImprovingAgents.length > 0) {
      lines.push('🚀 Top Improving Agents:');
      summary.topImprovingAgents.forEach((agent, idx) => {
        const improvement =
          agent.improvement >= 0
            ? `+${(agent.improvement * 100).toFixed(1)}%`
            : `${(agent.improvement * 100).toFixed(1)}%`;
        lines.push(`   ${idx + 1}. ${agent.agentId}: ${improvement}`);
      });
      lines.push('');
    }

    // Learning progress (agents with patterns)
    const activeAgents = progress.filter(p => p.learnedPatterns > 0);
    if (activeAgents.length > 0) {
      lines.push('📚 Learning Progress:');
      activeAgents.slice(0, 10).forEach(agent => {
        lines.push(`   • ${agent.agentId}:`);
        lines.push(`     Executions: ${agent.totalExecutions}`);
        lines.push(`     Patterns: ${agent.learnedPatterns}`);
        lines.push(`     Adaptations: ${agent.appliedAdaptations}`);
        lines.push(
          `     Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%`
        );
      });
      lines.push('');
    }

    // Time series charts (if requested and data available)
    if (options?.includeCharts && this.metricsHistory.size > 0) {
      lines.push('📈 Metrics Trends:');
      lines.push('');

      const metricNames = Array.from(this.metricsHistory.keys());
      const chartHeight = options.chartHeight || 8;

      // Render up to 3 most common metrics
      metricNames.slice(0, 3).forEach(metricName => {
        const chart = this.renderChart(metricName, {
          height: chartHeight,
          title: `📊 ${metricName}`,
        });
        lines.push(chart);
        lines.push('');
      });
    }

    lines.push('╚═══════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  // =====================
  // Time Series Tracking
  // =====================

  /**
   * ✅ FIX MAJOR-4: Prevent unbounded time series data growth
   *
   * Limits:
   * - Max 100 different metrics can be tracked
   * - Max 10,000 data points per metric
   * - Automatically trims oldest data when limits exceeded
   */
  private readonly MAX_METRIC_POINTS = 10000; // per metric
  private readonly MAX_METRICS = 100; // total metrics

  /**
   * Track a system-wide metric over time
   *
   * ✅ FIX MAJOR-4: Now with size limits to prevent memory leaks
   */
  trackSystemMetric(metricName: string, value: number, metadata?: Record<string, unknown>): void {
    const timestamp = Date.now();

    // ✅ FIX MAJOR-4: Validate total metrics limit
    if (!this.metricsHistory.has(metricName) && this.metricsHistory.size >= this.MAX_METRICS) {
      throw new ValidationError(
        `Too many metrics tracked (max ${this.MAX_METRICS}). Cannot add new metric: ${metricName}`,
        {
          component: 'EvolutionMonitor',
          method: 'trackSystemMetric',
          currentCount: this.metricsHistory.size,
          maxMetrics: this.MAX_METRICS,
          attemptedMetric: metricName,
        }
      );
    }

    if (!this.metricsHistory.has(metricName)) {
      this.metricsHistory.set(metricName, []);
    }

    const history = this.metricsHistory.get(metricName)!;
    history.push({
      value,
      timestamp,
      metadata,
    });

    // ✅ FIX MAJOR-4: Trim to max size (keep most recent data)
    if (history.length > this.MAX_METRIC_POINTS) {
      // Remove oldest 10% to avoid frequent trimming
      const trimCount = Math.floor(this.MAX_METRIC_POINTS * 0.1);
      history.splice(0, trimCount);

      logger.debug('[EvolutionMonitor] Trimmed old metric data', {
        metricName,
        removedPoints: trimCount,
        remainingPoints: history.length,
      });
    }
  }

  /**
   * Get time series data for specific metrics
   */
  getTimeSeriesMetrics(
    metricNames: string[],
    options?: {
      startTime?: number;
      endTime?: number;
      maxDataPoints?: number;
    }
  ): TimeSeriesMetrics[] {
    const result: TimeSeriesMetrics[] = [];

    for (const metricName of metricNames) {
      const history = this.metricsHistory.get(metricName) || [];

      // Filter by time range
      let dataPoints = history.filter(point => {
        if (options?.startTime && point.timestamp < options.startTime) return false;
        if (options?.endTime && point.timestamp > options.endTime) return false;
        return true;
      });

      // Limit data points if requested
      if (options?.maxDataPoints && dataPoints.length > options.maxDataPoints) {
        // Sample evenly
        const step = Math.ceil(dataPoints.length / options.maxDataPoints);
        dataPoints = dataPoints.filter((_, idx) => idx % step === 0);
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(dataPoints.map(p => p.value));

      result.push({
        metricName,
        dataPoints: dataPoints as TimeSeriesDataPoint[],
        statistics,
      });
    }

    return result;
  }

  /**
   * Calculate statistics for a time series
   */
  private calculateStatistics(values: number[]): {
    min: number;
    max: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        trend: 'stable',
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate trend (compare first half to second half)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (values.length >= 4) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = (secondAvg - firstAvg) / firstAvg;

      if (change > 0.05) trend = 'increasing';
      else if (change < -0.05) trend = 'decreasing';
    }

    return { min, max, average, trend };
  }

  /**
   * Aggregate time series data by interval
   */
  aggregateByInterval(
    metricName: string,
    intervalMs: number
  ): TimeSeriesDataPoint[] {
    const history = this.metricsHistory.get(metricName) || [];
    if (history.length === 0) return [];

    // Group by interval
    const buckets = new Map<number, number[]>();

    for (const point of history) {
      const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point.value);
    }

    // Calculate average for each bucket
    const aggregated: TimeSeriesDataPoint[] = [];
    for (const [timestamp, values] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      aggregated.push({ timestamp, value: average });
    }

    return aggregated;
  }

  // =====================
  // Chart Visualization
  // =====================

  /**
   * ✅ FIX MAJOR-5: Chart dimension limits to prevent DoS
   */
  private readonly MAX_CHART_HEIGHT = 50;
  private readonly MAX_CHART_WIDTH = 200;

  /**
   * Render ASCII chart for a single metric
   *
   * ✅ FIX MAJOR-5: Now with dimension validation
   */
  renderChart(
    metricName: string,
    options?: {
      height?: number;
      width?: number;
      title?: string;
      aggregateInterval?: number;
    }
  ): string {
    let dataPoints = this.metricsHistory.get(metricName) || [];

    if (dataPoints.length === 0) {
      return `No data available for metric: ${metricName}`;
    }

    // Aggregate if requested
    if (options?.aggregateInterval) {
      dataPoints = this.aggregateByInterval(metricName, options.aggregateInterval);
    }

    // Extract values for chart
    const values = dataPoints.map(p => p.value);

    // ✅ FIX MAJOR-5: Validate and limit chart dimensions to prevent DoS
    const height = Math.min(options?.height || 10, this.MAX_CHART_HEIGHT);
    const width = options?.width
      ? Math.min(options.width, this.MAX_CHART_WIDTH)
      : undefined;

    if (options?.height && options.height > this.MAX_CHART_HEIGHT) {
      logger.warn('[EvolutionMonitor] Chart height limited', {
        requested: options.height,
        limited: height,
        maxHeight: this.MAX_CHART_HEIGHT,
      });
    }

    if (options?.width && options.width > this.MAX_CHART_WIDTH) {
      logger.warn('[EvolutionMonitor] Chart width limited', {
        requested: options.width,
        limited: width,
        maxWidth: this.MAX_CHART_WIDTH,
      });
    }

    // Configure chart with validated dimensions
    const config = {
      height,
      width,
    };

    // Render chart
    const chart = asciichart.plot(values, config);

    // Add title if provided
    const title = options?.title || `📈 ${metricName}`;
    const lines: string[] = [];
    lines.push(title);
    lines.push('─'.repeat(60));
    lines.push(chart);
    lines.push('─'.repeat(60));
    lines.push(`Data points: ${dataPoints.length} | Latest: ${values[values.length - 1].toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Render multiple metrics on one chart
   *
   * ✅ FIX MAJOR-5: Now with dimension validation
   */
  renderMultiChart(
    metricNames: string[],
    options?: {
      height?: number;
      width?: number;
      title?: string;
      aggregateInterval?: number;
    }
  ): string {
    const allSeries: number[][] = [];
    const legends: string[] = [];

    for (const metricName of metricNames) {
      let dataPoints = this.metricsHistory.get(metricName) || [];

      if (dataPoints.length === 0) continue;

      // Aggregate if requested
      if (options?.aggregateInterval) {
        dataPoints = this.aggregateByInterval(metricName, options.aggregateInterval);
      }

      allSeries.push(dataPoints.map(p => p.value));
      legends.push(metricName);
    }

    if (allSeries.length === 0) {
      return `No data available for metrics: ${metricNames.join(', ')}`;
    }

    // ✅ FIX MAJOR-5: Validate and limit chart dimensions
    const height = Math.min(options?.height || 10, this.MAX_CHART_HEIGHT);
    const width = options?.width
      ? Math.min(options.width, this.MAX_CHART_WIDTH)
      : undefined;

    // Configure chart (colors are ANSI color codes from asciichart)
    const config = {
      height,
      width,
      colors: [
        asciichart.blue,
        asciichart.green,
        asciichart.red,
        asciichart.yellow,
        asciichart.magenta,
      ],
    };

    // Render chart
    const chart = asciichart.plot(allSeries, config);

    // Add title and legend
    const title = options?.title || '📊 Multi-Metric Chart';
    const lines: string[] = [];
    lines.push(title);
    lines.push('─'.repeat(60));
    lines.push(chart);
    lines.push('─'.repeat(60));
    lines.push('Legend:');
    legends.forEach((legend, idx) => {
      const color = ['🔵', '🟢', '🔴', '🟡', '🟣'][idx % 5];
      lines.push(`  ${color} ${legend}`);
    });

    return lines.join('\n');
  }

  // =====================
  // Export Methods
  // =====================

  /**
   * ✅ FIX MAJOR-3: Max export size to prevent DoS
   */
  private readonly MAX_EXPORT_SIZE = 1000000; // 1MB limit

  /**
   * Export dashboard data as JSON
   *
   * ✅ FIX MAJOR-3: Now with size validation to prevent excessive memory usage
   */
  exportAsJSON(): string {
    const exportData: DashboardExport = {
      exportedAt: Date.now(),
      summary: this.getDashboardSummary(),
      timeSeries: this.getTimeSeriesMetrics(Array.from(this.metricsHistory.keys())),
      learningProgress: this.getLearningProgress(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    // ✅ FIX MAJOR-3: Validate export size to prevent DoS
    if (jsonString.length > this.MAX_EXPORT_SIZE) {
      throw new ValidationError(
        `Export size exceeds limit (${jsonString.length} bytes > ${this.MAX_EXPORT_SIZE} bytes)`,
        {
          component: 'EvolutionMonitor',
          method: 'exportAsJSON',
          exportSize: jsonString.length,
          maxSize: this.MAX_EXPORT_SIZE,
          hint: 'Consider using getTimeSeriesMetrics with maxDataPoints option to reduce export size',
        }
      );
    }

    return jsonString;
  }

  /**
   * Export dashboard data as CSV
   *
   * ✅ FIX MAJOR-3: Now with size validation
   */
  exportAsCSV(): string {
    const lines: string[] = [];

    // Header
    lines.push('# Evolution Dashboard Export');
    lines.push(`# Exported at: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    const summary = this.getDashboardSummary();
    lines.push('## Summary');
    lines.push('Metric,Value');
    lines.push(`Total Agents,${summary.totalAgents}`);
    lines.push(`Agents with Patterns,${summary.agentsWithPatterns}`);
    lines.push(`Total Patterns,${summary.totalPatterns}`);
    lines.push(`Total Executions,${summary.totalExecutions}`);
    lines.push(`Average Success Rate,${(summary.averageSuccessRate * 100).toFixed(2)}%`);
    lines.push('');

    // Learning Progress
    lines.push('## Learning Progress');
    lines.push('Agent ID,Total Executions,Learned Patterns,Applied Adaptations,Success Rate Improvement');
    const progress = this.getLearningProgress();
    progress.forEach(p => {
      lines.push(
        `${p.agentId},${p.totalExecutions},${p.learnedPatterns},${p.appliedAdaptations},${(p.successRateImprovement * 100).toFixed(2)}%`
      );
    });
    lines.push('');

    // Time Series Data
    lines.push('## Time Series Data');
    for (const [metricName, dataPoints] of this.metricsHistory.entries()) {
      lines.push(`### ${metricName}`);
      lines.push('Timestamp,Value');
      dataPoints.forEach(point => {
        lines.push(`${new Date(point.timestamp).toISOString()},${point.value}`);
      });
      lines.push('');
    }

    const csvString = lines.join('\n');

    // ✅ FIX MAJOR-3: Validate export size
    if (csvString.length > this.MAX_EXPORT_SIZE) {
      throw new ValidationError(
        `CSV export size exceeds limit (${csvString.length} bytes > ${this.MAX_EXPORT_SIZE} bytes)`,
        {
          component: 'EvolutionMonitor',
          method: 'exportAsCSV',
          exportSize: csvString.length,
          maxSize: this.MAX_EXPORT_SIZE,
        }
      );
    }

    return csvString;
  }

  /**
   * Export dashboard data as Markdown
   *
   * ✅ FIX MAJOR-3: Now with size validation
   */
  exportAsMarkdown(): string {
    const lines: string[] = [];

    // Header
    lines.push('# 🧠 Evolution Dashboard Export');
    lines.push('');
    lines.push(`**Exported:** ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    const summary = this.getDashboardSummary();
    lines.push('## 📊 Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Agents | ${summary.totalAgents} |`);
    lines.push(`| Agents with Patterns | ${summary.agentsWithPatterns} |`);
    lines.push(`| Total Patterns | ${summary.totalPatterns} |`);
    lines.push(`| Total Executions | ${summary.totalExecutions} |`);
    lines.push(`| Average Success Rate | ${(summary.averageSuccessRate * 100).toFixed(1)}% |`);
    lines.push('');

    // Top Improving Agents
    if (summary.topImprovingAgents.length > 0) {
      lines.push('## 🚀 Top Improving Agents');
      lines.push('');
      lines.push('| Rank | Agent ID | Improvement |');
      lines.push('|------|----------|-------------|');
      summary.topImprovingAgents.forEach((agent, idx) => {
        const improvement =
          agent.improvement >= 0
            ? `+${(agent.improvement * 100).toFixed(1)}%`
            : `${(agent.improvement * 100).toFixed(1)}%`;
        lines.push(`| ${idx + 1} | ${agent.agentId} | ${improvement} |`);
      });
      lines.push('');
    }

    // Learning Progress
    lines.push('## 📚 Learning Progress');
    lines.push('');
    const progress = this.getLearningProgress();
    const activeAgents = progress.filter(p => p.learnedPatterns > 0);

    if (activeAgents.length > 0) {
      lines.push('| Agent ID | Executions | Patterns | Adaptations | Improvement |');
      lines.push('|----------|------------|----------|-------------|-------------|');
      activeAgents.forEach(agent => {
        const improvement =
          agent.successRateImprovement >= 0
            ? `+${(agent.successRateImprovement * 100).toFixed(1)}%`
            : `${(agent.successRateImprovement * 100).toFixed(1)}%`;
        lines.push(
          `| ${agent.agentId} | ${agent.totalExecutions} | ${agent.learnedPatterns} | ${agent.appliedAdaptations} | ${improvement} |`
        );
      });
    } else {
      lines.push('*No agents with learned patterns yet.*');
    }
    lines.push('');

    // Time Series Charts (if data available)
    const metricNames = Array.from(this.metricsHistory.keys());
    if (metricNames.length > 0) {
      lines.push('## 📈 Time Series Charts');
      lines.push('');

      const timeSeries = this.getTimeSeriesMetrics(metricNames);
      timeSeries.forEach(ts => {
        if (ts.dataPoints.length > 0 && ts.statistics) {
          lines.push(`### ${ts.metricName}`);
          lines.push('');
          lines.push('```');
          lines.push(
            this.renderChart(ts.metricName, {
              height: 8,
              title: ts.metricName,
            })
          );
          lines.push('```');
          lines.push('');
          lines.push('| Statistic | Value |');
          lines.push('|-----------|-------|');
          lines.push(`| Min | ${ts.statistics.min.toFixed(2)} |`);
          lines.push(`| Max | ${ts.statistics.max.toFixed(2)} |`);
          lines.push(`| Average | ${ts.statistics.average.toFixed(2)} |`);
          lines.push(`| Trend | ${ts.statistics.trend} |`);
          lines.push('');
        }
      });
    }

    const markdownString = lines.join('\n');

    // ✅ FIX MAJOR-3: Validate export size
    if (markdownString.length > this.MAX_EXPORT_SIZE) {
      throw new ValidationError(
        `Markdown export size exceeds limit (${markdownString.length} bytes > ${this.MAX_EXPORT_SIZE} bytes)`,
        {
          component: 'EvolutionMonitor',
          method: 'exportAsMarkdown',
          exportSize: markdownString.length,
          maxSize: this.MAX_EXPORT_SIZE,
        }
      );
    }

    return markdownString;
  }

  // =====================
  // Testing Helper Methods
  // =====================

  /**
   * Initialize for testing (compatibility with integration tests)
   */
  async initialize(): Promise<void> {
    // Already initialized in constructor
    this.isInitialized = true;
    return Promise.resolve();
  }

  /**
   * Close and clean up resources (compatibility with integration tests)
   */
  async close(): Promise<void> {
    // Clean up data structures
    this.metricsHistory.clear();
    this.alertThresholds.clear();
    this.eventListeners.clear();
    this.triggeredAlerts = [];
    this.isInitialized = false;
    return Promise.resolve();
  }

  /**
   * Record performance metric (test helper)
   */
  async recordMetric(metric: string, value: number, timestamp: number): Promise<void> {
    // Store metric in history
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, []);
    }
    this.metricsHistory.get(metric)!.push({ value, timestamp });

    // Check if alert should be triggered
    const threshold = this.alertThresholds.get(metric);
    if (threshold !== undefined && value < threshold) {
      const alert = {
        type: 'performance_degradation',
        metric,
        threshold,
        actualValue: value,
        timestamp,
      };

      this.triggeredAlerts.push(alert);
      this.emit('alert', alert);
    }

    return Promise.resolve();
  }

  /**
   * Set alert threshold for a metric (test helper)
   */
  async setAlertThreshold(metric: string, threshold: number): Promise<void> {
    this.alertThresholds.set(metric, threshold);
    return Promise.resolve();
  }

  /**
   * Register event listener (test helper)
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * ✅ FIX MEDIUM-1: Remove specific event listener
   *
   * Prevents memory leaks by allowing cleanup of individual listeners
   * in long-running processes.
   *
   * @param event - Event name
   * @param callback - Callback to remove
   */
  off(event: string, callback: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    // Clean up empty arrays to prevent memory waste
    if (listeners.length === 0) {
      this.eventListeners.delete(event);
    }
  }

  /**
   * ✅ FIX MEDIUM-1: Remove all listeners for an event
   *
   * @param event - Event name to clear (if not provided, clears all events)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * Emit event to listeners (test helper)
   */
  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Get metric history (test helper)
   */
  async getMetricHistory(metric: string): Promise<Array<{ value: number; timestamp: number }>> {
    return Promise.resolve(this.metricsHistory.get(metric) || []);
  }

  /**
   * Get all triggered alerts (test helper)
   */
  async getAlerts(): Promise<Array<{
    type: string;
    metric: string;
    threshold: number;
    actualValue: number;
    timestamp: number;
  }>> {
    return Promise.resolve([...this.triggeredAlerts]);
  }

  /**
   * Check if monitor is ready (test helper)
   */
  async isReady(): Promise<boolean> {
    return Promise.resolve(this.isInitialized);
  }
}
