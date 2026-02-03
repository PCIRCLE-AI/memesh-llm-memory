export class ValidationError extends Error {
    code = 'VALIDATION_ERROR';
    details;
    constructor(message, details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
}
//# sourceMappingURL=ValidationError.js.map