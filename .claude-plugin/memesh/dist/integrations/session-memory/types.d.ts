import type { EntityType } from '../../knowledge-graph/types.js';
export interface ParsedSessionMemory {
    title: string;
    currentState: string | null;
    taskSpec: string | null;
    filesAndFunctions: FileReference[];
    workflow: WorkflowStep[];
    errorsAndCorrections: ErrorCorrection[];
    codebaseDoc: string | null;
    learnings: Learning[];
    worklog: WorklogEntry[];
    rawSections: Map<string, string>;
}
export interface FileReference {
    path: string;
    description: string;
}
export interface WorkflowStep {
    command: string;
    description: string;
}
export interface ErrorCorrection {
    error: string;
    correction: string;
    failedApproach?: string;
}
export interface Learning {
    content: string;
    type: LearningType;
}
export type LearningType = 'positive' | 'negative' | 'neutral';
export interface WorklogEntry {
    activity: string;
    marker?: string;
}
export interface SessionMemoryEvent {
    sessionId: string;
    projectPath: string;
    sanitizedPath: string;
    summaryPath: string;
    content: string;
    timestamp: Date;
    changeType: 'created' | 'updated';
}
export interface IngestionResult {
    entitiesCreated: number;
    entitiesUpdated: number;
    entitiesSkipped: number;
    relationsCreated: number;
    sessionId: string;
    errors: IngestionError[];
}
export interface IngestionError {
    source: string;
    message: string;
}
export declare const LEARNING_TYPE_TO_ENTITY_TYPE: Record<LearningType, EntityType>;
export declare const SESSION_MEMORY_SECTIONS: {
    readonly TITLE: "Session Title";
    readonly CURRENT_STATE: "Current State";
    readonly TASK_SPEC: "Task specification";
    readonly FILES: "Files and Functions";
    readonly WORKFLOW: "Workflow";
    readonly ERRORS: "Errors & Corrections";
    readonly CODEBASE: "Codebase and System Documentation";
    readonly LEARNINGS: "Learnings";
    readonly WORKLOG: "Worklog";
    readonly KEY_RESULTS: "Key results";
};
export declare const AUTO_TAGS: {
    readonly SOURCE: "source:native-session-memory";
    readonly AUTO_INGESTED: "auto-ingested";
};
//# sourceMappingURL=types.d.ts.map