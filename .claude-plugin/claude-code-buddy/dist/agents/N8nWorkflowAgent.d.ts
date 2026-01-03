import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface N8nWorkflow {
    id?: string;
    name: string;
    nodes: N8nNode[];
    connections: N8nConnections;
    active?: boolean;
    settings?: Record<string, any>;
}
export interface N8nNode {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    parameters: Record<string, any>;
}
export interface N8nConnections {
    [key: string]: {
        main: Array<Array<{
            node: string;
            type: string;
            index: number;
        }>>;
    };
}
export interface N8nWorkflowResult {
    success: boolean;
    workflowId?: string;
    workflowUrl?: string;
    error?: string;
}
export declare class N8nWorkflowAgent {
    private mcp;
    private readonly N8N_BASE_URL;
    private readonly API_KEY;
    constructor(mcp: MCPToolInterface, config?: {
        baseUrl?: string;
        apiKey?: string;
    });
    createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflowResult>;
    getWorkflow(workflowId: string): Promise<N8nWorkflow | null>;
    listWorkflows(): Promise<N8nWorkflow[]>;
    updateWorkflow(workflowId: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflowResult>;
    deleteWorkflow(workflowId: string): Promise<boolean>;
    executeWorkflow(workflowId: string, data?: unknown): Promise<unknown>;
    createSimpleHttpWorkflow(name: string, url: string): N8nWorkflow;
    createAIAgentWorkflow(name: string, prompt: string): N8nWorkflow;
}
//# sourceMappingURL=N8nWorkflowAgent.d.ts.map