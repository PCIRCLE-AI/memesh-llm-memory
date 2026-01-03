export interface ToolMetadata {
    description: string;
    methods: string[];
}
export interface ToolInvocationResult {
    success: boolean;
    data?: unknown;
    error?: string;
}
export interface ToolDependencyCheck {
    allAvailable: boolean;
    missing: string[];
}
export declare class MCPToolInterface {
    private tools;
    filesystem: {
        readFile: (path: string) => Promise<string>;
        writeFile: (opts: {
            path: string;
            content: string;
        }) => Promise<void>;
    };
    memory: {
        createEntities: (opts: Record<string, unknown>) => Promise<void>;
        searchNodes: (query: string) => Promise<unknown[]>;
    };
    playwright: {
        navigate: (url: string) => Promise<void>;
        snapshot: () => Promise<unknown>;
        click: (opts: {
            element: string;
            ref: string;
        }) => Promise<void>;
        type: (opts: {
            element: string;
            ref: string;
            text: string;
            submit?: boolean;
        }) => Promise<void>;
        waitFor: (opts: {
            text?: string;
            time?: number;
        }) => Promise<void>;
        takeScreenshot: (opts: {
            filename?: string;
            fullPage?: boolean;
        }) => Promise<void>;
        evaluate: (opts: {
            function: string;
        }) => Promise<unknown>;
        close: () => Promise<void>;
    };
    bash: (opts: {
        command: string;
        timeout?: number;
    }) => Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }>;
    registerTool(toolName: string, metadata: ToolMetadata): boolean;
    isToolRegistered(toolName: string): boolean;
    getRegisteredTools(): string[];
    invokeTool(toolName: string, method: string, params: Record<string, unknown>): Promise<ToolInvocationResult>;
    checkRequiredTools(requiredTools: string[]): ToolDependencyCheck;
    getToolMetadata(toolName: string): ToolMetadata | undefined;
}
//# sourceMappingURL=MCPToolInterface.d.ts.map