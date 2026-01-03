export class CredentialError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'CredentialError';
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends CredentialError {
    field;
    value;
    constructor(message, field, value) {
        super(message, 'VALIDATION_ERROR');
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends CredentialError {
    identity;
    constructor(message, identity) {
        super(message, 'AUTHENTICATION_ERROR');
        this.identity = identity;
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends CredentialError {
    requiredPermission;
    identity;
    constructor(message, requiredPermission, identity) {
        super(message, 'AUTHORIZATION_ERROR');
        this.requiredPermission = requiredPermission;
        this.identity = identity;
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends CredentialError {
    resourceType;
    resourceId;
    constructor(message, resourceType, resourceId) {
        super(message, 'NOT_FOUND');
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends CredentialError {
    resourceType;
    conflictingValue;
    constructor(message, resourceType, conflictingValue) {
        super(message, 'CONFLICT');
        this.resourceType = resourceType;
        this.conflictingValue = conflictingValue;
        this.name = 'ConflictError';
    }
}
export class RateLimitError extends CredentialError {
    retryAfter;
    limit;
    constructor(message, retryAfter, limit) {
        super(message, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
        this.limit = limit;
        this.name = 'RateLimitError';
    }
}
export class QuotaExceededError extends CredentialError {
    quotaType;
    current;
    limit;
    constructor(message, quotaType, current, limit) {
        super(message, 'QUOTA_EXCEEDED');
        this.quotaType = quotaType;
        this.current = current;
        this.limit = limit;
        this.name = 'QuotaExceededError';
    }
}
export class EncryptionError extends CredentialError {
    operation;
    constructor(message, operation) {
        super(message, 'ENCRYPTION_ERROR');
        this.operation = operation;
        this.name = 'EncryptionError';
    }
}
export class StorageError extends CredentialError {
    operation;
    backend;
    constructor(message, operation, backend) {
        super(message, 'STORAGE_ERROR');
        this.operation = operation;
        this.backend = backend;
        this.name = 'StorageError';
    }
}
export class DatabaseError extends CredentialError {
    operation;
    table;
    constructor(message, operation, table) {
        super(message, 'DATABASE_ERROR');
        this.operation = operation;
        this.table = table;
        this.name = 'DatabaseError';
    }
}
export class RotationError extends CredentialError {
    credentialId;
    provider;
    constructor(message, credentialId, provider) {
        super(message, 'ROTATION_ERROR');
        this.credentialId = credentialId;
        this.provider = provider;
        this.name = 'RotationError';
    }
}
export class TenantError extends CredentialError {
    tenantId;
    status;
    constructor(message, tenantId, status) {
        super(message, 'TENANT_ERROR');
        this.tenantId = tenantId;
        this.status = status;
        this.name = 'TenantError';
    }
}
export class ConfigurationError extends CredentialError {
    configKey;
    expectedType;
    constructor(message, configKey, expectedType) {
        super(message, 'CONFIGURATION_ERROR');
        this.configKey = configKey;
        this.expectedType = expectedType;
        this.name = 'ConfigurationError';
    }
}
export function isCredentialError(error) {
    return error instanceof CredentialError;
}
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function getErrorCode(error) {
    if (isCredentialError(error)) {
        return error.code;
    }
    return undefined;
}
export function toErrorResponse(error) {
    if (isCredentialError(error)) {
        const details = {};
        if (error instanceof ValidationError) {
            if (error.field)
                details.field = error.field;
            if (error.value !== undefined)
                details.value = error.value;
        }
        else if (error instanceof AuthorizationError) {
            if (error.requiredPermission)
                details.requiredPermission = error.requiredPermission;
            if (error.identity)
                details.identity = error.identity;
        }
        else if (error instanceof RateLimitError) {
            if (error.retryAfter)
                details.retryAfter = error.retryAfter;
            if (error.limit)
                details.limit = error.limit;
        }
        else if (error instanceof QuotaExceededError) {
            if (error.quotaType)
                details.quotaType = error.quotaType;
            if (error.current !== undefined)
                details.current = error.current;
            if (error.limit !== undefined)
                details.limit = error.limit;
        }
        return {
            error: {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message,
                details: Object.keys(details).length > 0 ? details : undefined,
            },
        };
    }
    return {
        error: {
            code: 'INTERNAL_ERROR',
            message: getErrorMessage(error),
        },
    };
}
//# sourceMappingURL=errors.js.map