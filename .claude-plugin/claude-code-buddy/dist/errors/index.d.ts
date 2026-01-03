export declare enum ErrorCode {
    VALIDATION_FAILED = "VALIDATION_FAILED",
    INVALID_INPUT = "INVALID_INPUT",
    INVALID_RANGE = "INVALID_RANGE",
    INVALID_FORMAT = "INVALID_FORMAT",
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
    NOT_INITIALIZED = "NOT_INITIALIZED",
    ALREADY_INITIALIZED = "ALREADY_INITIALIZED",
    INVALID_STATE = "INVALID_STATE",
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    ENTITY_NOT_FOUND = "ENTITY_NOT_FOUND",
    TASK_NOT_FOUND = "TASK_NOT_FOUND",
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
    CONFIGURATION_INVALID = "CONFIGURATION_INVALID",
    CONFIGURATION_MISSING = "CONFIGURATION_MISSING",
    API_KEY_MISSING = "API_KEY_MISSING",
    UNSUPPORTED_OPTION = "UNSUPPORTED_OPTION",
    OPERATION_FAILED = "OPERATION_FAILED",
    INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
    EXECUTION_FAILED = "EXECUTION_FAILED",
    DIMENSION_MISMATCH = "DIMENSION_MISMATCH",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    API_REQUEST_FAILED = "API_REQUEST_FAILED",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
}
export declare class BaseError extends Error {
    readonly code: ErrorCode;
    readonly context?: Record<string, unknown>;
    readonly timestamp: Date;
    constructor(message: string, code: ErrorCode, context?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
export declare class ValidationError extends BaseError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class StateError extends BaseError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class NotFoundError extends BaseError {
    constructor(message: string, resourceType?: string, resourceId?: string, context?: Record<string, unknown>);
}
export declare class ConfigurationError extends BaseError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class OperationError extends BaseError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ExternalServiceError extends BaseError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare function isBaseError(error: unknown): error is BaseError;
export declare function isValidationError(error: unknown): error is ValidationError;
export declare function isStateError(error: unknown): error is StateError;
export declare function isNotFoundError(error: unknown): error is NotFoundError;
export declare function isConfigurationError(error: unknown): error is ConfigurationError;
export declare function isOperationError(error: unknown): error is OperationError;
export declare function isExternalServiceError(error: unknown): error is ExternalServiceError;
export declare function getErrorMessage(error: unknown): string;
export declare function getErrorCode(error: unknown): ErrorCode | undefined;
//# sourceMappingURL=index.d.ts.map