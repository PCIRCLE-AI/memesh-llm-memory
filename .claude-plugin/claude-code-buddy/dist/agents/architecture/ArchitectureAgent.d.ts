import { CollaborativeAgent, AgentCapability, AgentMessage } from '../../collaboration/types.js';
export declare class ArchitectureAgent implements CollaborativeAgent {
    id: string;
    name: string;
    type: 'architecture';
    status: 'idle' | 'busy' | 'error';
    capabilities: AgentCapability[];
    private anthropic;
    private systemPrompt;
    constructor(config?: {
        name?: string;
        systemPrompt?: string;
    });
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    handleMessage(message: AgentMessage): Promise<AgentMessage>;
    execute(capability: string, input: any): Promise<any>;
}
//# sourceMappingURL=ArchitectureAgent.d.ts.map