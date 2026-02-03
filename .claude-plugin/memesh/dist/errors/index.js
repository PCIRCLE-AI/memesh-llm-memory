export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["INVALID_RANGE"] = "INVALID_RANGE";
    ErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
    ErrorCode["REQUIRED_FIELD_MISSING"] = "REQUIRED_FIELD_MISSING";
    ErrorCode["NOT_INITIALIZED"] = "NOT_INITIALIZED";
    ErrorCode["ALREADY_INITIALIZED"] = "ALREADY_INITIALIZED";
    ErrorCode["INVALID_STATE"] = "INVALID_STATE";
    ErrorCode["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCode["ENTITY_NOT_FOUND"] = "ENTITY_NOT_FOUND";
    ErrorCode["TASK_NOT_FOUND"] = "TASK_NOT_FOUND";
    ErrorCode["TOOL_NOT_FOUND"] = "TOOL_NOT_FOUND";
    ErrorCode["CONFIGURATION_INVALID"] = "CONFIGURATION_INVALID";
    ErrorCode["CONFIGURATION_MISSING"] = "CONFIGURATION_MISSING";
    ErrorCode["API_KEY_MISSING"] = "API_KEY_MISSING";
    ErrorCode["UNSUPPORTED_OPTION"] = "UNSUPPORTED_OPTION";
    ErrorCode["OPERATION_FAILED"] = "OPERATION_FAILED";
    ErrorCode["INITIALIZATION_FAILED"] = "INITIALIZATION_FAILED";
    ErrorCode["EXECUTION_FAILED"] = "EXECUTION_FAILED";
    ErrorCode["DIMENSION_MISMATCH"] = "DIMENSION_MISMATCH";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["API_REQUEST_FAILED"] = "API_REQUEST_FAILED";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class BaseError extends Error {
    code;
    context;
    timestamp;
    constructor(message, code, context) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.context = context;
        this.timestamp = new Date();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }
}
export class ValidationError extends BaseError {
    constructor(message, context) {
        super(message, ErrorCode.VALIDATION_FAILED, context);
    }
    get details() {
        return this.context;
    }
}
export class StateError extends BaseError {
    constructor(message, context) {
        super(message, ErrorCode.INVALID_STATE, context);
    }
}
export class NotFoundError extends BaseError {
    constructor(message, resourceType, resourceId, context) {
        super(message, ErrorCode.RESOURCE_NOT_FOUND, {
            resourceType,
            resourceId,
            ...context,
        });
    }
}
export class ConfigurationError extends BaseError {
    constructor(message, context) {
        super(message, ErrorCode.CONFIGURATION_INVALID, context);
    }
}
export class OperationError extends BaseError {
    constructor(message, context) {
        super(message, ErrorCode.OPERATION_FAILED, context);
    }
}
export class ExternalServiceError extends BaseError {
    constructor(message, context) {
        super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, context);
    }
}
export function isBaseError(error) {
    return error instanceof BaseError;
}
export function isValidationError(error) {
    return error instanceof ValidationError;
}
export function isStateError(error) {
    return error instanceof StateError;
}
export function isNotFoundError(error) {
    return error instanceof NotFoundError;
}
export function isConfigurationError(error) {
    return error instanceof ConfigurationError;
}
export function isOperationError(error) {
    return error instanceof OperationError;
}
export function isExternalServiceError(error) {
    return error instanceof ExternalServiceError;
}
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return String(error);
}
export function getErrorCode(error) {
    if (isBaseError(error)) {
        return error.code;
    }
    return undefined;
}
//# sourceMappingURL=index.js.map