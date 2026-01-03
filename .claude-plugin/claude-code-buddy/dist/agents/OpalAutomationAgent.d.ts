import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface OpalWorkflowRequest {
    description: string;
    timeout?: number;
}
export interface OpalWorkflowResult {
    success: boolean;
    workflowUrl?: string;
    screenshot?: string;
    error?: string;
}
export declare class OpalAutomationAgent {
    private mcp;
    private readonly OPAL_URL;
    constructor(mcp: MCPToolInterface);
    createWorkflow(request: OpalWorkflowRequest): Promise<OpalWorkflowResult>;
    exportWorkflow(workflowUrl: string): Promise<OpalWorkflowResult>;
    remixFromGallery(searchTerm: string): Promise<OpalWorkflowResult>;
    private getCurrentUrl;
    private wait;
    close(): Promise<void>;
}
//# sourceMappingURL=OpalAutomationAgent.d.ts.map