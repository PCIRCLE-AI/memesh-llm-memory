import { TaskAnalysis, RoutingDecision, SystemResources } from './types.js';
export declare class AgentRouter {
    private promptEnhancer;
    constructor();
    route(analysis: TaskAnalysis): Promise<RoutingDecision>;
    getSystemResources(): Promise<SystemResources>;
    private hasEnoughMemory;
    private estimateRequiredMemory;
    private selectAgent;
    private getCapabilitiesForAgent;
    private getFallbackAgent;
    private generateRoutingReasoning;
    private createFallbackDecision;
    private cpuUsageCache;
    private readonly CPU_CACHE_TTL;
    private getCPUUsage;
    routeBatch(analyses: TaskAnalysis[]): Promise<RoutingDecision[]>;
    shouldUseParallel(decisions: RoutingDecision[]): Promise<boolean>;
}
//# sourceMappingURL=AgentRouter.d.ts.map