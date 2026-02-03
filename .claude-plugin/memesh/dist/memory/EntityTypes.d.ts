export declare enum EntityType {
    TASK_START = "task_start",
    DECISION = "decision",
    PROGRESS_MILESTONE = "progress_milestone",
    ERROR_RESOLUTION = "error_resolution",
    TEST_RESULT = "test_result",
    WORKFLOW_CHECKPOINT = "workflow_checkpoint",
    CODE_CHANGE = "code_change",
    COMMIT = "commit",
    PROJECT_SNAPSHOT = "project_snapshot"
}
export declare function isValidEntityType(value: string): value is EntityType;
export declare function getAllEntityTypes(): string[];
//# sourceMappingURL=EntityTypes.d.ts.map