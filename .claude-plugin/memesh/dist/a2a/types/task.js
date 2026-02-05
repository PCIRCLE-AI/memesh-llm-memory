export const VALID_STATE_TRANSITIONS = {
    SUBMITTED: ['WORKING', 'CANCELED', 'REJECTED'],
    WORKING: ['COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELED', 'INPUT_REQUIRED'],
    INPUT_REQUIRED: ['WORKING', 'CANCELED'],
    COMPLETED: [],
    FAILED: [],
    TIMEOUT: [],
    CANCELED: [],
    REJECTED: [],
};
export function isValidStateTransition(from, to) {
    return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
export function isTerminalState(state) {
    return VALID_STATE_TRANSITIONS[state].length === 0;
}
//# sourceMappingURL=task.js.map