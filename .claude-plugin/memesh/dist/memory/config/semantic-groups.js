export const SEMANTIC_GROUPS = [
    ['edit', 'modify', 'modified', 'change', 'changed', 'update', 'updated'],
    ['file', 'files'],
    ['test', 'tests', 'testing', 'tested'],
    ['verify', 'verified', 'verification', 'check', 'checked'],
    ['run', 'running', 'execute', 'executed'],
    ['complete', 'completion', 'finish', 'finished', 'done'],
    ['refactor', 'refactoring', 'refactored'],
    ['add', 'added', 'create', 'created'],
    ['delete', 'deleted', 'remove', 'removed'],
];
export function getSemanticGroups() {
    return SEMANTIC_GROUPS;
}
export function findSemanticGroup(keyword) {
    return SEMANTIC_GROUPS.find((group) => group.includes(keyword));
}
export function areSemanticallySimilar(keyword1, keyword2) {
    const group = findSemanticGroup(keyword1);
    return group ? group.includes(keyword2) : false;
}
//# sourceMappingURL=semantic-groups.js.map