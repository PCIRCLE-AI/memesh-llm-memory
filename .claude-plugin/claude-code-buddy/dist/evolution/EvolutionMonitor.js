import { getAllAgentConfigs } from './AgentEvolutionConfig.js';
import * as asciichart from 'asciichart';
export class EvolutionMonitor {
    performanceTracker;
    learningManager;
    adaptationEngine;
    metricsHistory = new Map();
    alertThresholds = new Map();
    eventListeners = new Map();
    triggeredAlerts = [];
    isInitialized = false;
    constructor(performanceTracker, learningManager, adaptationEngine) {
        this.performanceTracker = performanceTracker;
        this.learningManager = learningManager;
        this.adaptationEngine = adaptationEngine;
        this.isInitialized = true;
    }
    getDashboardSummary() {
        const allConfigs = getAllAgentConfigs();
        const allAgents = Array.from(allConfigs.keys());
        let totalPatterns = 0;
        let totalExecutions = 0;
        let agentsWithPatterns = 0;
        const successRates = [];
        const improvements = [];
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
        improvements.sort((a, b) => b.improvement - a.improvement);
        return {
            totalAgents: allAgents.length,
            agentsWithPatterns,
            totalPatterns,
            totalExecutions,
            averageSuccessRate: successRates.length > 0
                ? successRates.reduce((a, b) => a + b, 0) / successRates.length
                : 0,
            topImprovingAgents: improvements.slice(0, 5),
        };
    }
    getAgentStats(agentId) {
        return this.performanceTracker.getEvolutionStats(agentId);
    }
    getLearningProgress() {
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
    formatDashboard(options) {
        const summary = this.getDashboardSummary();
        const progress = this.getLearningProgress();
        const lines = [];
        lines.push('╔═══════════════════════════════════════════════════════════╗');
        lines.push('║          🧠 Claude Code Buddy Evolution Dashboard         ║');
        lines.push('╚═══════════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push('📊 Overview:');
        lines.push(`   Total Agents: ${summary.totalAgents}`);
        lines.push(`   Agents with Learned Patterns: ${summary.agentsWithPatterns}`);
        lines.push(`   Total Patterns: ${summary.totalPatterns}`);
        lines.push(`   Total Executions: ${summary.totalExecutions}`);
        lines.push(`   Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`);
        lines.push('');
        if (summary.topImprovingAgents.length > 0) {
            lines.push('🚀 Top Improving Agents:');
            summary.topImprovingAgents.forEach((agent, idx) => {
                const improvement = agent.improvement >= 0
                    ? `+${(agent.improvement * 100).toFixed(1)}%`
                    : `${(agent.improvement * 100).toFixed(1)}%`;
                lines.push(`   ${idx + 1}. ${agent.agentId}: ${improvement}`);
            });
            lines.push('');
        }
        const activeAgents = progress.filter(p => p.learnedPatterns > 0);
        if (activeAgents.length > 0) {
            lines.push('📚 Learning Progress:');
            activeAgents.slice(0, 10).forEach(agent => {
                lines.push(`   • ${agent.agentId}:`);
                lines.push(`     Executions: ${agent.totalExecutions}`);
                lines.push(`     Patterns: ${agent.learnedPatterns}`);
                lines.push(`     Adaptations: ${agent.appliedAdaptations}`);
                lines.push(`     Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%`);
            });
            lines.push('');
        }
        if (options?.includeCharts && this.metricsHistory.size > 0) {
            lines.push('📈 Metrics Trends:');
            lines.push('');
            const metricNames = Array.from(this.metricsHistory.keys());
            const chartHeight = options.chartHeight || 8;
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
    trackSystemMetric(metricName, value, metadata) {
        const timestamp = Date.now();
        if (!this.metricsHistory.has(metricName)) {
            this.metricsHistory.set(metricName, []);
        }
        this.metricsHistory.get(metricName).push({
            value,
            timestamp,
            metadata,
        });
    }
    getTimeSeriesMetrics(metricNames, options) {
        const result = [];
        for (const metricName of metricNames) {
            const history = this.metricsHistory.get(metricName) || [];
            let dataPoints = history.filter(point => {
                if (options?.startTime && point.timestamp < options.startTime)
                    return false;
                if (options?.endTime && point.timestamp > options.endTime)
                    return false;
                return true;
            });
            if (options?.maxDataPoints && dataPoints.length > options.maxDataPoints) {
                const step = Math.ceil(dataPoints.length / options.maxDataPoints);
                dataPoints = dataPoints.filter((_, idx) => idx % step === 0);
            }
            const statistics = this.calculateStatistics(dataPoints.map(p => p.value));
            result.push({
                metricName,
                dataPoints: dataPoints,
                statistics,
            });
        }
        return result;
    }
    calculateStatistics(values) {
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
        let trend = 'stable';
        if (values.length >= 4) {
            const midpoint = Math.floor(values.length / 2);
            const firstHalf = values.slice(0, midpoint);
            const secondHalf = values.slice(midpoint);
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const change = (secondAvg - firstAvg) / firstAvg;
            if (change > 0.05)
                trend = 'increasing';
            else if (change < -0.05)
                trend = 'decreasing';
        }
        return { min, max, average, trend };
    }
    aggregateByInterval(metricName, intervalMs) {
        const history = this.metricsHistory.get(metricName) || [];
        if (history.length === 0)
            return [];
        const buckets = new Map();
        for (const point of history) {
            const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, []);
            }
            buckets.get(bucketKey).push(point.value);
        }
        const aggregated = [];
        for (const [timestamp, values] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
            const average = values.reduce((a, b) => a + b, 0) / values.length;
            aggregated.push({ timestamp, value: average });
        }
        return aggregated;
    }
    renderChart(metricName, options) {
        let dataPoints = this.metricsHistory.get(metricName) || [];
        if (dataPoints.length === 0) {
            return `No data available for metric: ${metricName}`;
        }
        if (options?.aggregateInterval) {
            dataPoints = this.aggregateByInterval(metricName, options.aggregateInterval);
        }
        const values = dataPoints.map(p => p.value);
        const config = {
            height: options?.height || 10,
            width: options?.width,
        };
        const chart = asciichart.plot(values, config);
        const title = options?.title || `📈 ${metricName}`;
        const lines = [];
        lines.push(title);
        lines.push('─'.repeat(60));
        lines.push(chart);
        lines.push('─'.repeat(60));
        lines.push(`Data points: ${dataPoints.length} | Latest: ${values[values.length - 1].toFixed(2)}`);
        return lines.join('\n');
    }
    renderMultiChart(metricNames, options) {
        const allSeries = [];
        const legends = [];
        for (const metricName of metricNames) {
            let dataPoints = this.metricsHistory.get(metricName) || [];
            if (dataPoints.length === 0)
                continue;
            if (options?.aggregateInterval) {
                dataPoints = this.aggregateByInterval(metricName, options.aggregateInterval);
            }
            allSeries.push(dataPoints.map(p => p.value));
            legends.push(metricName);
        }
        if (allSeries.length === 0) {
            return `No data available for metrics: ${metricNames.join(', ')}`;
        }
        const config = {
            height: options?.height || 10,
            width: options?.width,
            colors: [
                asciichart.blue,
                asciichart.green,
                asciichart.red,
                asciichart.yellow,
                asciichart.magenta,
            ],
        };
        const chart = asciichart.plot(allSeries, config);
        const title = options?.title || '📊 Multi-Metric Chart';
        const lines = [];
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
    exportAsJSON() {
        const exportData = {
            exportedAt: Date.now(),
            summary: this.getDashboardSummary(),
            timeSeries: this.getTimeSeriesMetrics(Array.from(this.metricsHistory.keys())),
            learningProgress: this.getLearningProgress(),
        };
        return JSON.stringify(exportData, null, 2);
    }
    exportAsCSV() {
        const lines = [];
        lines.push('# Evolution Dashboard Export');
        lines.push(`# Exported at: ${new Date().toISOString()}`);
        lines.push('');
        const summary = this.getDashboardSummary();
        lines.push('## Summary');
        lines.push('Metric,Value');
        lines.push(`Total Agents,${summary.totalAgents}`);
        lines.push(`Agents with Patterns,${summary.agentsWithPatterns}`);
        lines.push(`Total Patterns,${summary.totalPatterns}`);
        lines.push(`Total Executions,${summary.totalExecutions}`);
        lines.push(`Average Success Rate,${(summary.averageSuccessRate * 100).toFixed(2)}%`);
        lines.push('');
        lines.push('## Learning Progress');
        lines.push('Agent ID,Total Executions,Learned Patterns,Applied Adaptations,Success Rate Improvement');
        const progress = this.getLearningProgress();
        progress.forEach(p => {
            lines.push(`${p.agentId},${p.totalExecutions},${p.learnedPatterns},${p.appliedAdaptations},${(p.successRateImprovement * 100).toFixed(2)}%`);
        });
        lines.push('');
        lines.push('## Time Series Data');
        for (const [metricName, dataPoints] of this.metricsHistory.entries()) {
            lines.push(`### ${metricName}`);
            lines.push('Timestamp,Value');
            dataPoints.forEach(point => {
                lines.push(`${new Date(point.timestamp).toISOString()},${point.value}`);
            });
            lines.push('');
        }
        return lines.join('\n');
    }
    exportAsMarkdown() {
        const lines = [];
        lines.push('# 🧠 Evolution Dashboard Export');
        lines.push('');
        lines.push(`**Exported:** ${new Date().toISOString()}`);
        lines.push('');
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
        if (summary.topImprovingAgents.length > 0) {
            lines.push('## 🚀 Top Improving Agents');
            lines.push('');
            lines.push('| Rank | Agent ID | Improvement |');
            lines.push('|------|----------|-------------|');
            summary.topImprovingAgents.forEach((agent, idx) => {
                const improvement = agent.improvement >= 0
                    ? `+${(agent.improvement * 100).toFixed(1)}%`
                    : `${(agent.improvement * 100).toFixed(1)}%`;
                lines.push(`| ${idx + 1} | ${agent.agentId} | ${improvement} |`);
            });
            lines.push('');
        }
        lines.push('## 📚 Learning Progress');
        lines.push('');
        const progress = this.getLearningProgress();
        const activeAgents = progress.filter(p => p.learnedPatterns > 0);
        if (activeAgents.length > 0) {
            lines.push('| Agent ID | Executions | Patterns | Adaptations | Improvement |');
            lines.push('|----------|------------|----------|-------------|-------------|');
            activeAgents.forEach(agent => {
                const improvement = agent.successRateImprovement >= 0
                    ? `+${(agent.successRateImprovement * 100).toFixed(1)}%`
                    : `${(agent.successRateImprovement * 100).toFixed(1)}%`;
                lines.push(`| ${agent.agentId} | ${agent.totalExecutions} | ${agent.learnedPatterns} | ${agent.appliedAdaptations} | ${improvement} |`);
            });
        }
        else {
            lines.push('*No agents with learned patterns yet.*');
        }
        lines.push('');
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
                    lines.push(this.renderChart(ts.metricName, {
                        height: 8,
                        title: ts.metricName,
                    }));
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
        return lines.join('\n');
    }
    async initialize() {
        this.isInitialized = true;
        return Promise.resolve();
    }
    async close() {
        this.metricsHistory.clear();
        this.alertThresholds.clear();
        this.eventListeners.clear();
        this.triggeredAlerts = [];
        this.isInitialized = false;
        return Promise.resolve();
    }
    async recordMetric(metric, value, timestamp) {
        if (!this.metricsHistory.has(metric)) {
            this.metricsHistory.set(metric, []);
        }
        this.metricsHistory.get(metric).push({ value, timestamp });
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
    async setAlertThreshold(metric, threshold) {
        this.alertThresholds.set(metric, threshold);
        return Promise.resolve();
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }
    async getMetricHistory(metric) {
        return Promise.resolve(this.metricsHistory.get(metric) || []);
    }
    async getAlerts() {
        return Promise.resolve([...this.triggeredAlerts]);
    }
    async isReady() {
        return Promise.resolve(this.isInitialized);
    }
}
//# sourceMappingURL=EvolutionMonitor.js.map