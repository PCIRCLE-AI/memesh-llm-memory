export class ProgressRenderer {
    config;
    running = false;
    renderIntervalId;
    lastRenderTime = 0;
    minimumRenderInterval = 100;
    constructor(config) {
        this.config = config;
    }
    start(getState) {
        if (this.running) {
            return;
        }
        this.running = true;
        this.renderIntervalId = setInterval(() => {
            this.throttledRender(getState);
        }, this.config.updateInterval);
        this.throttledRender(getState);
    }
    stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.renderIntervalId) {
            clearInterval(this.renderIntervalId);
            this.renderIntervalId = undefined;
        }
    }
    isRunning() {
        return this.running;
    }
    throttledRender(getState) {
        const now = Date.now();
        const timeSinceLastRender = now - this.lastRenderTime;
        if (timeSinceLastRender < this.minimumRenderInterval) {
            return;
        }
        this.lastRenderTime = now;
        const state = getState();
        const output = this.renderDashboard(state);
        if (output) {
        }
    }
    renderDashboard(state) {
        const sections = [];
        sections.push(this.renderHeader());
        if (state.activeAgents.size > 0) {
            sections.push(this.renderActiveAgents(state.activeAgents));
        }
        if (this.config.showMetrics) {
            sections.push(this.renderMetrics(state.metrics));
        }
        if (this.config.showAttribution && state.recentEvents.length > 0) {
            sections.push(this.renderAttribution(state.recentEvents));
        }
        return sections.join('\n\n');
    }
    renderHeader() {
        return '=== Claude Code Buddy Dashboard ===';
    }
    renderActiveAgents(agents) {
        const lines = ['Active Agents:'];
        agents.forEach((agent) => {
            const progressBar = this.renderProgressBar(agent.progress);
            const percentage = Math.round(agent.progress * 100);
            lines.push(`  ${agent.agentType} - ${agent.currentTask || agent.status} ${progressBar} ${percentage}%`);
        });
        return lines.join('\n');
    }
    renderProgressBar(progress) {
        const width = 20;
        const filled = Math.round(progress * width);
        const empty = width - filled;
        return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
    }
    renderMetrics(metrics) {
        const lines = ['Session Metrics:'];
        const successRate = metrics.totalTasks > 0
            ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
            : 0;
        lines.push(`  Tasks: ${metrics.completedTasks}/${metrics.totalTasks} (${successRate}% success)`);
        const timeSaved = this.formatTime(metrics.estimatedTimeSaved);
        lines.push(`  Time Saved: ${timeSaved}`);
        const tokensFormatted = this.formatNumber(metrics.tokensUsed);
        lines.push(`  Tokens Used: ${tokensFormatted}`);
        if (Object.keys(metrics.agentUsageCount).length > 0) {
            const topAgents = Object.entries(metrics.agentUsageCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([agent, count]) => `${agent} (${count})`)
                .join(', ');
            lines.push(`  Top Agents: ${topAgents}`);
        }
        return lines.join('\n');
    }
    renderAttribution(events) {
        const lines = ['Recent Activity:'];
        events.slice(0, this.config.maxRecentEvents).forEach((event) => {
            const time = new Date(event.timestamp).toLocaleTimeString();
            const symbol = event.type === 'success' ? '✓' : '✗';
            lines.push(`  ${symbol} ${time} - ${event.agentType}: ${event.taskDescription}`);
        });
        return lines.join('\n');
    }
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    formatNumber(num) {
        return num.toLocaleString();
    }
}
//# sourceMappingURL=ProgressRenderer.js.map