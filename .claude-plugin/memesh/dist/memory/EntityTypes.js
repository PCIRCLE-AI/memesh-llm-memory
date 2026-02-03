export var EntityType;
(function (EntityType) {
    EntityType["TASK_START"] = "task_start";
    EntityType["DECISION"] = "decision";
    EntityType["PROGRESS_MILESTONE"] = "progress_milestone";
    EntityType["ERROR_RESOLUTION"] = "error_resolution";
    EntityType["TEST_RESULT"] = "test_result";
    EntityType["WORKFLOW_CHECKPOINT"] = "workflow_checkpoint";
    EntityType["CODE_CHANGE"] = "code_change";
    EntityType["COMMIT"] = "commit";
    EntityType["PROJECT_SNAPSHOT"] = "project_snapshot";
})(EntityType || (EntityType = {}));
export function isValidEntityType(value) {
    return Object.values(EntityType).includes(value);
}
export function getAllEntityTypes() {
    return Object.values(EntityType);
}
//# sourceMappingURL=EntityTypes.js.map