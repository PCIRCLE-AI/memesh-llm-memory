export declare class CredentialError extends Error {
    readonly code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare class ValidationError extends CredentialError {
    readonly field?: string | undefined;
    readonly value?: unknown | undefined;
    constructor(message: string, field?: string | undefined, value?: unknown | undefined);
}
export declare class AuthenticationError extends CredentialError {
    readonly identity?: string | undefined;
    constructor(message: string, identity?: string | undefined);
}
export declare class AuthorizationError extends CredentialError {
    readonly requiredPermission?: string | undefined;
    readonly identity?: string | undefined;
    constructor(message: string, requiredPermission?: string | undefined, identity?: string | undefined);
}
export declare class NotFoundError extends CredentialError {
    readonly resourceType?: string | undefined;
    readonly resourceId?: string | undefined;
    constructor(message: string, resourceType?: string | undefined, resourceId?: string | undefined);
}
export declare class ConflictError extends CredentialError {
    readonly resourceType?: string | undefined;
    readonly conflictingValue?: unknown | undefined;
    constructor(message: string, resourceType?: string | undefined, conflictingValue?: unknown | undefined);
}
export declare class RateLimitError extends CredentialError {
    readonly retryAfter?: number | undefined;
    readonly limit?: number | undefined;
    constructor(message: string, retryAfter?: number | undefined, limit?: number | undefined);
}
export declare class QuotaExceededError extends CredentialError {
    readonly quotaType?: string | undefined;
    readonly current?: number | undefined;
    readonly limit?: number | undefined;
    constructor(message: string, quotaType?: string | undefined, current?: number | undefined, limit?: number | undefined);
}
export declare class EncryptionError extends CredentialError {
    readonly operation?: "encrypt" | "decrypt" | undefined;
    constructor(message: string, operation?: "encrypt" | "decrypt" | undefined);
}
export declare class StorageError extends CredentialError {
    readonly operation?: string | undefined;
    readonly backend?: string | undefined;
    constructor(message: string, operation?: string | undefined, backend?: string | undefined);
}
export declare class DatabaseError extends CredentialError {
    readonly operation?: string | undefined;
    readonly table?: string | undefined;
    constructor(message: string, operation?: string | undefined, table?: string | undefined);
}
export declare class RotationError extends CredentialError {
    readonly credentialId?: string | undefined;
    readonly provider?: string | undefined;
    constructor(message: string, credentialId?: string | undefined, provider?: string | undefined);
}
export declare class TenantError extends CredentialError {
    readonly tenantId?: string | undefined;
    readonly status?: string | undefined;
    constructor(message: string, tenantId?: string | undefined, status?: string | undefined);
}
export declare class ConfigurationError extends CredentialError {
    readonly configKey?: string | undefined;
    readonly expectedType?: string | undefined;
    constructor(message: string, configKey?: string | undefined, expectedType?: string | undefined);
}
export declare function isCredentialError(error: unknown): error is CredentialError;
export declare function getErrorMessage(error: unknown): string;
export declare function getErrorCode(error: unknown): string | undefined;
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export declare function toErrorResponse(error: unknown): ErrorResponse;
//# sourceMappingURL=errors.d.ts.map