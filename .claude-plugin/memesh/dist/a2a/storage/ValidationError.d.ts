export declare class ValidationError extends Error {
    readonly code: string;
    readonly details: Record<string, unknown>;
    constructor(message: string, details?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=ValidationError.d.ts.map