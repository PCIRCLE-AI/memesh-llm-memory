export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
export class NotFoundError extends Error {
    constructor(resource, id) {
        super(`${resource} not found: ${id}`);
        this.name = 'NotFoundError';
    }
}
export function validateSpan(span) {
    if (!span.span_id || !span.trace_id) {
        throw new ValidationError('Span must have span_id and trace_id');
    }
    if (!span.task_id || !span.execution_id) {
        throw new ValidationError('Span must have task_id and execution_id');
    }
    if (!span.name || span.name.trim().length === 0) {
        throw new ValidationError('Span must have a non-empty name');
    }
    if (span.start_time <= 0) {
        throw new ValidationError('Span start_time must be positive');
    }
    if (span.end_time && span.end_time < span.start_time) {
        throw new ValidationError('Span end_time must be >= start_time');
    }
    if (span.duration_ms && span.duration_ms < 0) {
        throw new ValidationError('Span duration_ms must be non-negative');
    }
    if (!['OK', 'ERROR', 'UNSET'].includes(span.status.code)) {
        throw new ValidationError(`Invalid status code: ${span.status.code}`);
    }
    if (!['internal', 'client', 'server', 'producer', 'consumer'].includes(span.kind)) {
        throw new ValidationError(`Invalid span kind: ${span.kind}`);
    }
}
export function validatePattern(pattern) {
    if (!pattern.id || pattern.id.trim().length === 0) {
        throw new ValidationError('Pattern must have a non-empty id');
    }
    if (pattern.confidence < 0 || pattern.confidence > 1) {
        throw new ValidationError(`Pattern confidence must be between 0 and 1, got ${pattern.confidence}`);
    }
    if (pattern.occurrences < 1) {
        throw new ValidationError(`Pattern occurrences must be >= 1, got ${pattern.occurrences}`);
    }
    if (!['success', 'anti_pattern', 'optimization'].includes(pattern.type)) {
        throw new ValidationError(`Invalid pattern type: ${pattern.type}`);
    }
    if (!Array.isArray(pattern.source_span_ids) || pattern.source_span_ids.length === 0) {
        throw new ValidationError('Pattern must have at least one source span');
    }
}
export function validateAdaptation(adaptation) {
    if (!adaptation.id || adaptation.id.trim().length === 0) {
        throw new ValidationError('Adaptation must have a non-empty id');
    }
    if (!adaptation.pattern_id || adaptation.pattern_id.trim().length === 0) {
        throw new ValidationError('Adaptation must reference a pattern');
    }
    if (!['config', 'prompt', 'strategy', 'resource', 'skill'].includes(adaptation.type)) {
        throw new ValidationError(`Invalid adaptation type: ${adaptation.type}`);
    }
    if (adaptation.success_count < 0 || adaptation.failure_count < 0) {
        throw new ValidationError('Adaptation counts must be non-negative');
    }
}
export function validateReward(reward) {
    if (!reward.id || reward.id.trim().length === 0) {
        throw new ValidationError('Reward must have a non-empty id');
    }
    if (!reward.operation_span_id || reward.operation_span_id.trim().length === 0) {
        throw new ValidationError('Reward must reference an operation span');
    }
    if (isNaN(reward.value) || !isFinite(reward.value)) {
        throw new ValidationError(`Reward value must be a finite number, got ${reward.value}`);
    }
    if (reward.dimensions) {
        for (const [key, value] of Object.entries(reward.dimensions)) {
            if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                throw new ValidationError(`Reward dimension '${key}' must be a finite number`);
            }
        }
    }
}
//# sourceMappingURL=validation.js.map