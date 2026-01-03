export declare class ValidationError extends Error {
    field: string;
    value: any;
    constructor(message: string, field: string, value: any);
}
export declare function validateServiceName(service: string): void;
export declare function validateAccountName(account: string): void;
export declare function validateServiceAndAccount(service: string, account: string): void;
export declare function validatePositiveInteger(value: number, field: string): void;
export declare function validateFutureDate(date: Date, field: string): void;
export declare function validateMetadataSize(metadata: Record<string, any>, maxSizeBytes?: number): void;
export declare function sanitizeForLogging(str: string): string;
//# sourceMappingURL=validation.d.ts.map