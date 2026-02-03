import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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
export interface ToolDispatcher {
    routeToolCall(params: {
        name: string;
        arguments: Record<string, unknown>;
    }): Promise<CallToolResult>;
}
export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
export interface CommandPolicyDecision {
    allowed: boolean;
    requiresConfirmation: boolean;
    reason?: string;
}
export interface CommandPolicy {
    evaluate(command: string): CommandPolicyDecision;
}
export interface CommandRunner {
    run(command: string, timeoutMs?: number): Promise<CommandResult>;
}
export interface MemoryEntityInput {
    name: string;
    entityType: string;
    observations: string[];
    metadata?: Record<string, unknown>;
}
export interface CreateEntitiesInput {
    entities: MemoryEntityInput[];
}
export interface MemoryProvider {
    createEntities(input: CreateEntitiesInput): Promise<void>;
    searchNodes(query: string): Promise<unknown[]>;
}
export interface MCPToolInterfaceOptions {
    toolDispatcher?: ToolDispatcher;
    commandPolicy?: CommandPolicy;
    commandRunner?: CommandRunner;
    memoryProvider?: MemoryProvider;
}
export declare class MCPToolInterface {
    private tools;
    private toolDispatcher?;
    private commandPolicy;
    private commandRunner;
    private memoryProvider?;
    private activeProcesses;
    constructor(options?: MCPToolInterfaceOptions);
    dispose(): void;
    attachToolDispatcher(dispatcher: ToolDispatcher): void;
    attachMemoryProvider(provider: MemoryProvider): void;
    supportsMemory(): boolean;
    setCommandPolicy(policy: CommandPolicy): void;
    filesystem: {
        readFile: (path: string) => Promise<string>;
        writeFile: (opts: {
            path: string;
            content: string;
        }) => Promise<void>;
    };
    memory: {
        createEntities: (opts: CreateEntitiesInput) => Promise<void>;
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
        confirmed?: boolean;
        confirmationReason?: string;
    }) => Promise<CommandResult>;
    registerTool(toolName: string, metadata: ToolMetadata): boolean;
    isToolRegistered(toolName: string): boolean;
    getRegisteredTools(): string[];
    invokeTool(toolName: string, method: string, params: Record<string, unknown>): Promise<ToolInvocationResult>;
    invokeToolByName(toolName: string, args: Record<string, unknown>): Promise<ToolInvocationResult>;
    checkRequiredTools(requiredTools: string[]): ToolDependencyCheck;
    getToolMetadata(toolName: string): ToolMetadata | undefined;
}
//# sourceMappingURL=MCPToolInterface.d.ts.map