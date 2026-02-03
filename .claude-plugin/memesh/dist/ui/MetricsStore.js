import path from 'path';
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import { resolveUserPath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { getDataPath } from '../utils/PathResolver.js';
export class MetricsStore {
    storePath;
    currentSession;
    constructor(storePath) {
        this.storePath = storePath ? resolveUserPath(storePath) : getDataPath('metrics.json');
        this.currentSession = this.createNewSession();
    }
    recordAttribution(attribution) {
        if (attribution.type === 'success') {
            this.currentSession.tasksCompleted++;
            this.currentSession.totalTimeSaved += attribution.metadata?.timeSaved || 0;
            this.currentSession.totalTokensUsed += attribution.metadata?.tokensUsed || 0;
        }
        else if (attribution.type === 'error') {
            this.currentSession.tasksFailed++;
        }
        attribution.agentIds.forEach((agentId) => {
            this.currentSession.agentUsageBreakdown[agentId] =
                (this.currentSession.agentUsageBreakdown[agentId] || 0) + 1;
        });
    }
    getCurrentSessionMetrics() {
        return { ...this.currentSession };
    }
    async persist() {
        const data = JSON.stringify(this.currentSession, null, 2);
        await fs.mkdir(path.dirname(this.storePath), { recursive: true });
        await fs.writeFile(this.storePath, data, 'utf-8');
    }
    async load() {
        try {
            const data = await fs.readFile(this.storePath, 'utf-8');
            const loaded = JSON.parse(data);
            loaded.startedAt = new Date(loaded.startedAt);
            this.currentSession = loaded;
        }
        catch (error) {
            const isFileNotFound = error instanceof Error &&
                'code' in error &&
                error.code === 'ENOENT';
            if (!isFileNotFound) {
                logger.warn('MetricsStore: failed to load existing metrics, resetting session', {
                    error: error instanceof Error ? error.message : String(error),
                });
                this.currentSession = this.createNewSession();
                return;
            }
        }
    }
    async generateDailyReport(date = new Date()) {
        const metrics = this.currentSession;
        const lines = [];
        lines.push(`# Daily Productivity Report`);
        lines.push(`**Date:** ${date.toLocaleDateString()}`);
        lines.push('');
        lines.push('## Summary');
        lines.push(`- **Tasks Completed:** ${metrics.tasksCompleted}`);
        lines.push(`- **Tasks Failed:** ${metrics.tasksFailed}`);
        lines.push(`- **Time Saved:** ${metrics.totalTimeSaved} minutes`);
        lines.push(`- **Tokens Used:** ${metrics.totalTokensUsed.toLocaleString()}`);
        lines.push('');
        lines.push('## Agent Usage');
        const sortedAgents = Object.entries(metrics.agentUsageBreakdown).sort((a, b) => b[1] - a[1]);
        sortedAgents.forEach(([agent, count]) => {
            lines.push(`- **${agent}:** ${count} tasks`);
        });
        lines.push('');
        const successRate = metrics.tasksCompleted + metrics.tasksFailed > 0
            ? ((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) *
                100).toFixed(1)
            : '0.0';
        lines.push('## Performance');
        lines.push(`- **Success Rate:** ${successRate}%`);
        if (metrics.totalTimeSaved > 0 && metrics.tasksCompleted > 0) {
            const avgTimeSaved = (metrics.totalTimeSaved / metrics.tasksCompleted).toFixed(1);
            lines.push(`- **Avg Time Saved per Task:** ${avgTimeSaved} minutes`);
        }
        return lines.join('\n');
    }
    async exportAsCSV() {
        const metrics = this.currentSession;
        const lines = [];
        lines.push('Agent,Task Count,Time Saved (min),Tokens Used');
        Object.entries(metrics.agentUsageBreakdown).forEach(([agent, count]) => {
            const timeSaved = Math.floor(metrics.totalTimeSaved / (metrics.tasksCompleted || 1));
            const tokens = Math.floor(metrics.totalTokensUsed / (metrics.tasksCompleted || 1));
            lines.push(`${agent},${count},${timeSaved},${tokens}`);
        });
        return lines.join('\n');
    }
    generateSessionId() {
        return `session-${randomBytes(8).toString('hex')}`;
    }
    createNewSession() {
        return {
            sessionId: this.generateSessionId(),
            startedAt: new Date(),
            tasksCompleted: 0,
            tasksFailed: 0,
            totalTimeSaved: 0,
            totalTokensUsed: 0,
            agentUsageBreakdown: {},
        };
    }
}
//# sourceMappingURL=MetricsStore.js.map