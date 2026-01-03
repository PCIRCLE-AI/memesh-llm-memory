export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    enableJitter?: boolean;
    retryableStatusCodes?: number[];
    isRetryable?: (error: unknown) => boolean;
    operationName?: string;
}
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDelay: number;
}
export declare function retryWithBackoff<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
export declare function retryWithBackoffDetailed<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>>;
export declare function createRetryable<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options?: RetryOptions): (...args: TArgs) => Promise<TResult>;
//# sourceMappingURL=retry.d.ts.map