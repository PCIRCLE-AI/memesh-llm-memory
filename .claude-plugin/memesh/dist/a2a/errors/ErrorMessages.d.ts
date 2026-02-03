export declare const ErrorMessages: {
    readonly AUTH_TOKEN_NOT_CONFIGURED: "MEMESH_A2A_TOKEN environment variable is not configured";
    readonly AUTH_FAILED: "Authentication failed - invalid A2A token";
    readonly AUTH_TOKEN_MISSING: "A2A authentication token is missing";
    readonly AGENT_NOT_FOUND: (agentId: string) => string;
    readonly AGENT_ALREADY_PROCESSING: (phase?: string) => string;
    readonly AGENT_REGISTRY_ERROR: (error: string) => string;
    readonly TASK_NOT_FOUND: (taskId: string) => string;
    readonly TASK_TIMEOUT: (taskId: string, timeoutSeconds: number) => string;
    readonly TASK_SEND_FAILED: (targetAgentId: string, error: string) => string;
    readonly TASK_GET_FAILED: (taskId: string, targetAgentId: string, error: string) => string;
    readonly TASK_LIST_FAILED: (targetAgentId: string, error: string) => string;
    readonly TASK_CANCEL_FAILED: (taskId: string, targetAgentId: string, error: string) => string;
    readonly PORT_NOT_AVAILABLE: (min: number, max: number) => string;
    readonly SERVER_ERROR: (error: string) => string;
    readonly INVALID_JSON: (context: string, preview?: string) => string;
    readonly DATABASE_ERROR: (operation: string, error: string) => string;
    readonly TIMEOUT_CHECKER_ERROR: (error: string) => string;
    readonly TIMEOUT_CHECKER_CIRCUIT_OPEN: (failureCount: number, maxRetries: number) => string;
    readonly HTTP_ERROR: (status: number, message?: string) => string;
    readonly UNKNOWN_ERROR: "An unknown error occurred";
};
export declare function formatErrorMessage(code: keyof typeof ErrorMessages, ...args: any[]): string;
export declare function getErrorMessage(error: unknown): string;
export declare function createError(code: keyof typeof ErrorMessages, ...args: any[]): Error;
//# sourceMappingURL=ErrorMessages.d.ts.map