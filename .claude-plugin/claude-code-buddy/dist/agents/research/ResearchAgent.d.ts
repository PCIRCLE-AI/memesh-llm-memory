import { CollaborativeAgent, AgentCapability, AgentMessage } from '../../collaboration/types.js';
export declare class ResearchAgent implements CollaborativeAgent {
    id: string;
    name: string;
    type: 'research';
    status: 'idle' | 'busy' | 'error';
    capabilities: AgentCapability[];
    private anthropic;
    private systemPrompt;
    constructor(config?: {
        name?: string;
        systemPrompt?: string;
    });
    conductResearch(topic: string, options?: {
        depth?: 'quick' | 'comprehensive' | 'deep-dive';
        focus?: string[];
    }): Promise<string>;
    analyzeCompetitors(product: string, competitors: string[]): Promise<string>;
    processMessage(message: AgentMessage): Promise<AgentMessage>;
    getStatus(): {
        id: string;
        name: string;
        type: "research";
        status: "error" | "idle" | "busy";
        capabilities: AgentCapability[];
    };
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    handleMessage(message: AgentMessage): Promise<AgentMessage>;
    execute(capability: string, input: any): Promise<any>;
}
//# sourceMappingURL=ResearchAgent.d.ts.map