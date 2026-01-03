export interface ErrorContext {
    component: string;
    method: string;
    operation?: string;
    data?: Record<string, unknown>;
}
export interface HandledError {
    message: string;
    stack?: string;
    type: string;
    context?: ErrorContext;
}
export declare function logError(error: unknown, context: ErrorContext): void;
export declare function handleError(error: unknown, context: ErrorContext, userMessage?: string): HandledError;
export declare function withErrorHandling<T extends unknown[], R>(fn: (...args: T) => Promise<R>, context: ErrorContext): (...args: T) => Promise<R>;
export declare function formatMCPError(error: unknown, context: ErrorContext): {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError: boolean;
};
export declare function getErrorMessage(error: unknown): string;
export declare function getErrorStack(error: unknown): string | undefined;
//# sourceMappingURL=errorHandler.d.ts.map