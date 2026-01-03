export function isAgentUsageEvent(event) {
    return event.event === 'agent_execution';
}
export function isSkillUsageEvent(event) {
    return event.event === 'skill_execution';
}
export function isErrorEvent(event) {
    return event.event === 'error';
}
export function isPerformanceEvent(event) {
    return event.event === 'performance';
}
export function isWorkflowEvent(event) {
    return event.event === 'workflow';
}
//# sourceMappingURL=types.js.map