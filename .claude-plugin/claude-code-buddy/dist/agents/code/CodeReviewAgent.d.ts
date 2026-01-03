import { CollaborativeAgent, AgentCapability, AgentMessage } from '../../collaboration/types.js';
export declare class CodeReviewAgent implements CollaborativeAgent {
    id: string;
    name: string;
    type: 'code';
    status: 'idle' | 'busy' | 'error';
    capabilities: AgentCapability[];
    private anthropic;
    private systemPrompt;
    constructor(config?: {
        name?: string;
        systemPrompt?: string;
    });
    reviewCode(code: string, options?: {
        language?: string;
        focus?: 'security' | 'performance' | 'maintainability' | 'all';
    }): Promise<string>;
    processMessage(message: AgentMessage): Promise<AgentMessage>;
    getStatus(): {
        id: string;
        name: string;
        type: "code";
        status: "error" | "idle" | "busy";
        capabilities: AgentCapability[];
    };
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    handleMessage(message: AgentMessage): Promise<AgentMessage>;
    execute(capability: string, input: any): Promise<any>;
}
//# sourceMappingURL=CodeReviewAgent.d.ts.map