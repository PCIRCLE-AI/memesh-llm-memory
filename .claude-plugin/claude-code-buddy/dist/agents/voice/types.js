export class VoiceProcessingError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'VoiceProcessingError';
        this.code = code;
        this.details = details;
    }
}
//# sourceMappingURL=types.js.map