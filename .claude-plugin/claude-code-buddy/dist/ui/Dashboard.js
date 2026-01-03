import { UIEventBus } from './UIEventBus.js';
import { DEFAULT_UI_CONFIG, } from './types.js';
export class Dashboard {
    resourceMonitor;
    uiEventBus;
    config;
    running = false;
    updateIntervalId;
    activeAgents = new Map();
    recentAttributions = [];
    sessionMetrics;
    constructor(resourceMonitor, config) {
        this.resourceMonitor = resourceMonitor;
        this.uiEventBus = UIEventBus.getInstance();
        this.config = {
            ...DEFAULT_UI_CONFIG,
            ...config,
        };
        this.sessionMetrics = {
            sessionId: this.generateSessionId(),
            startedAt: new Date(),
            tasksCompleted: 0,
            tasksFailed: 0,
            totalTimeSaved: 0,
            totalTokensUsed: 0,
            agentUsageBreakdown: {},
        };
        this.setupEventListeners();
    }
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.updateIntervalId = setInterval(() => {
            this.updateDashboard();
        }, this.config.updateInterval);
        this.updateDashboard();
    }
    stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = undefined;
        }
    }
    isRunning() {
        return this.running;
    }
    getState() {
        const resources = this.resourceMonitor.getCurrentResources();
        return {
            resources,
            agents: Array.from(this.activeAgents.values()),
            recentAttributions: this.recentAttributions,
            sessionMetrics: this.sessionMetrics,
        };
    }
    updateDashboard() {
        const resources = this.resourceMonitor.getCurrentResources();
        this.uiEventBus.emitMetricsUpdate({
            sessionStart: this.sessionMetrics.startedAt,
            totalTasks: this.sessionMetrics.tasksCompleted + this.sessionMetrics.tasksFailed,
            completedTasks: this.sessionMetrics.tasksCompleted,
            failedTasks: this.sessionMetrics.tasksFailed,
            agentUsageCount: this.sessionMetrics.agentUsageBreakdown,
            estimatedTimeSaved: this.sessionMetrics.totalTimeSaved * 60,
            tokensUsed: this.sessionMetrics.totalTokensUsed,
        });
    }
    setupEventListeners() {
        this.uiEventBus.onProgress((progress) => {
            this.activeAgents.set(progress.agentId, progress);
        });
        this.uiEventBus.onAgentStart((data) => {
            const agentType = data.agentType;
            this.sessionMetrics.agentUsageBreakdown[agentType] =
                (this.sessionMetrics.agentUsageBreakdown[agentType] || 0) + 1;
        });
        this.uiEventBus.onAgentComplete((data) => {
            this.activeAgents.delete(data.agentId);
        });
        this.uiEventBus.onSuccess((success) => {
            this.activeAgents.delete(success.agentId);
            this.sessionMetrics.tasksCompleted++;
            this.addAttribution({
                id: this.generateAttributionId(),
                type: 'success',
                timestamp: success.timestamp,
                agentIds: [success.agentId],
                taskDescription: success.taskDescription,
                metadata: {
                    timeSaved: Math.round(success.duration / 1000 / 60),
                },
            });
        });
        this.uiEventBus.onError((error) => {
            this.activeAgents.delete(error.agentId);
            this.sessionMetrics.tasksFailed++;
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
    addAttribution(attribution) {
        this.recentAttributions.unshift(attribution);
        if (this.recentAttributions.length > this.config.maxRecentAttributions) {
            this.recentAttributions = this.recentAttributions.slice(0, this.config.maxRecentAttributions);
        }
    }
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    generateAttributionId() {
        return `attr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
//# sourceMappingURL=Dashboard.js.map