export class ValidationError extends Error {
    field;
    value;
    constructor(message, field, value) {
        super(message);
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
export function validateServiceName(service) {
    if (typeof service !== 'string') {
        throw new ValidationError('Service name must be a string', 'service', service);
    }
    if (!service || service.trim().length === 0) {
        throw new ValidationError('Service name cannot be empty', 'service', service);
    }
    if (service.length > 255) {
        throw new ValidationError(`Service name too long (max 255 chars, got ${service.length})`, 'service', service);
    }
    if (/[\x00-\x1F\x7F]/.test(service)) {
        throw new ValidationError('Service name contains control characters', 'service', service);
    }
    if (service.includes('..')) {
        throw new ValidationError('Service name cannot contain ".."', 'service', service);
    }
    if (service.startsWith('.') || service.endsWith('.')) {
        throw new ValidationError('Service name cannot start or end with "."', 'service', service);
    }
    if (service.includes('../') || service.includes('..\\')) {
        throw new ValidationError('Service name cannot contain path traversal sequences', 'service', service);
    }
    const invalidChars = /[\s/\\;|$`&<>(){}[\]!*?~]/;
    if (invalidChars.test(service)) {
        throw new ValidationError('Service name contains invalid characters', 'service', service);
    }
}
export function validateAccountName(account) {
    if (typeof account !== 'string') {
        throw new ValidationError('Account name must be a string', 'account', account);
    }
    if (!account || account.trim().length === 0) {
        throw new ValidationError('Account name cannot be empty', 'account', account);
    }
    if (account.length > 255) {
        throw new ValidationError(`Account name too long (max 255 chars, got ${account.length})`, 'account', account);
    }
    if (account.includes('\0')) {
        throw new ValidationError('Account name cannot contain null bytes', 'account', account);
    }
    if (/[\x00-\x1F\x7F]/.test(account)) {
        throw new ValidationError('Account name contains control characters', 'account', account);
    }
    if (account.includes(':')) {
        throw new ValidationError('Account name cannot contain ":"', 'account', account);
    }
    if (account.includes('/') || account.includes('\\')) {
        throw new ValidationError('Account name cannot contain path traversal characters', 'account', account);
    }
}
export function validateServiceAndAccount(service, account) {
    validateServiceName(service);
    validateAccountName(account);
}
export function validatePositiveInteger(value, field) {
    if (typeof value !== 'number') {
        throw new ValidationError(`${field} must be a number`, field, value);
    }
    if (!Number.isInteger(value)) {
        throw new ValidationError(`${field} must be an integer`, field, value);
    }
    if (value <= 0) {
        throw new ValidationError(`${field} must be positive`, field, value);
    }
}
export function validateFutureDate(date, field) {
    if (!(date instanceof Date)) {
        throw new ValidationError(`${field} must be a Date object`, field, date);
    }
    if (isNaN(date.getTime())) {
        throw new ValidationError(`${field} is an invalid date`, field, date);
    }
    if (date.getTime() < Date.now()) {
        throw new ValidationError(`${field} cannot be in the past`, field, date);
    }
}
export function validateMetadataSize(metadata, maxSizeBytes = 10240) {
    const size = JSON.stringify(metadata).length;
    if (size > maxSizeBytes) {
        throw new ValidationError(`Metadata too large (max ${maxSizeBytes} bytes, got ${size})`, 'metadata', metadata);
    }
}
export function sanitizeForLogging(str) {
    return str
        .replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]')
        .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
        .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
        .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');
}
//# sourceMappingURL=validation.js.map