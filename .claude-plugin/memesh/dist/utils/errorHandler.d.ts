export interface ErrorContext {
    component: string;
    method: string;
    operation?: string;
    requestId?: string;
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
export type ErrorCategory = 'GIT' | 'FILESYSTEM' | 'NETWORK' | 'DATABASE' | 'AUTH' | 'VALIDATION' | 'RESOURCE' | 'API';
export declare function getCategoryBadge(category: ErrorCategory): string;
export declare function formatSuggestionBlock(suggestion: string, example?: {
    current?: string;
    expected?: string;
    quickFix?: string[];
}): string;
export declare function getRecoverySuggestion(error: unknown): {
    suggestion: string;
    category: ErrorCategory;
    example?: {
        current?: string;
        expected?: string;
        quickFix?: string[];
    };
} | undefined;
export declare function formatErrorWithSuggestion(error: unknown, operation: string): string;
//# sourceMappingURL=errorHandler.d.ts.map