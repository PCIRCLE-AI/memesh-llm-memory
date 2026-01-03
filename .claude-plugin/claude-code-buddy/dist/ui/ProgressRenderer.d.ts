import { DashboardState, DashboardConfig } from './types.js';
type GetStateCallback = () => DashboardState;
export declare class ProgressRenderer {
    private config;
    private running;
    private renderIntervalId?;
    private lastRenderTime;
    private minimumRenderInterval;
    constructor(config: DashboardConfig);
    start(getState: GetStateCallback): void;
    stop(): void;
    isRunning(): boolean;
    private throttledRender;
    private renderDashboard;
    private renderHeader;
    private renderActiveAgents;
    private renderProgressBar;
    private renderMetrics;
    private renderAttribution;
    private formatTime;
    private formatNumber;
}
export {};
//# sourceMappingURL=ProgressRenderer.d.ts.map