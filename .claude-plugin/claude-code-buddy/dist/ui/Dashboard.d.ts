import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { UIConfig, DashboardStateForRendering } from './types.js';
export declare class Dashboard {
    private resourceMonitor;
    private uiEventBus;
    private config;
    private running;
    private updateIntervalId?;
    private activeAgents;
    private recentAttributions;
    private sessionMetrics;
    constructor(resourceMonitor: ResourceMonitor, config?: Partial<UIConfig>);
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getState(): DashboardStateForRendering;
    private updateDashboard;
    private setupEventListeners;
    private addAttribution;
    private generateSessionId;
    private generateAttributionId;
}
//# sourceMappingURL=Dashboard.d.ts.map