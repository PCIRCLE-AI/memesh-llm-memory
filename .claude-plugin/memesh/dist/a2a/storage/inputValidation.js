import { ValidationError } from '../../errors/index.js';
const MAX_FILTER_ARRAY_SIZE = 100;
const VALID_TASK_STATES = [
    'SUBMITTED',
    'WORKING',
    'INPUT_REQUIRED',
    'COMPLETED',
    'FAILED',
    'CANCELED',
    'REJECTED',
    'TIMEOUT',
];
const VALID_TASK_PRIORITIES = [
    'low',
    'normal',
    'high',
    'urgent',
];
export function validateArraySize(array, fieldName, maxSize = MAX_FILTER_ARRAY_SIZE) {
    if (array.length > maxSize) {
        throw new ValidationError(`Too many items in ${fieldName}`, {
            field: fieldName,
            providedCount: array.length,
            maxAllowed: maxSize,
            severity: 'HIGH',
            reason: 'DoS prevention: Excessive array size can cause performance degradation',
        });
    }
}
export function validateTaskStates(states) {
    for (const state of states) {
        if (!VALID_TASK_STATES.includes(state)) {
            throw new ValidationError('Invalid task state', {
                field: 'state',
                providedState: state,
                validStates: VALID_TASK_STATES,
                severity: 'HIGH',
                reason: 'SQL injection prevention: Only known enum values are allowed',
            });
        }
    }
}
export function validateTaskPriorities(priorities) {
    for (const priority of priorities) {
        if (!VALID_TASK_PRIORITIES.includes(priority)) {
            throw new ValidationError('Invalid task priority', {
                field: 'priority',
                providedPriority: priority,
                validPriorities: VALID_TASK_PRIORITIES,
                severity: 'HIGH',
                reason: 'SQL injection prevention: Only known enum values are allowed',
            });
        }
    }
}
export function validatePositiveInteger(value, fieldName, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
        throw new ValidationError(`Invalid ${fieldName}`, {
            field: fieldName,
            providedValue: value,
            constraints: { min: 0, max },
            severity: 'MEDIUM',
            reason: 'Only positive integers are allowed',
        });
    }
}
export function validateISOTimestamp(value, fieldName) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new ValidationError(`Invalid ${fieldName}`, {
            field: fieldName,
            providedValue: value,
            severity: 'MEDIUM',
            reason: 'Must be a valid ISO 8601 timestamp string',
        });
    }
    const timestamp = date.getTime();
    const now = Date.now();
    const oneHundredYears = 100 * 365 * 24 * 60 * 60 * 1000;
    if (timestamp < 0 || timestamp > now + oneHundredYears) {
        throw new ValidationError(`Invalid ${fieldName}`, {
            field: fieldName,
            providedValue: value,
            timestamp,
            constraints: { min: 0, max: now + oneHundredYears },
            severity: 'MEDIUM',
            reason: 'Timestamp must be a reasonable date (not before epoch or too far in future)',
        });
    }
}
//# sourceMappingURL=inputValidation.js.map