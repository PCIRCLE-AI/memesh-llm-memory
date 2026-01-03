export interface DecomposedTask {
    id: string;
    description: string;
    estimatedDuration: '2-5 minutes';
    testable: boolean;
    steps: string[];
    dependencies: string[];
    phase?: string;
    files?: string[];
}
export interface DecompositionRequest {
    featureDescription: string;
    scope?: {
        includeTests?: boolean;
        includeDocs?: boolean;
    };
    existingContext?: {
        relatedFiles?: string[];
        relatedTasks?: string[];
    };
}
export declare class TaskDecomposer {
    decompose(request: DecompositionRequest): DecomposedTask[];
    private identifyComponents;
    private breakIntoAtomicTasks;
    private createTask;
    private linkDependencies;
    private assignPhases;
    identifyPhases(tasks: DecomposedTask[]): string[];
}
//# sourceMappingURL=TaskDecomposer.d.ts.map