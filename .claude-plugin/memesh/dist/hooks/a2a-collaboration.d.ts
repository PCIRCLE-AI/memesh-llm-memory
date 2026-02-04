export interface AgentIdentity {
    name: string;
    agentId: string;
    specialization: string;
    sessionStart: string;
    status: 'ONLINE' | 'OFFLINE';
    updatedAt?: string;
}
export interface A2ATask {
    id: string;
    description: string;
    state: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    senderId: string;
}
export interface TaskCompletionReport {
    taskId: string;
    status: 'COMPLETED' | 'FAILED';
    result: string;
    completedAt: string;
}
export declare function agentCheckIn(): AgentIdentity;
export declare function checkPendingTasks(_agentId: string): A2ATask[];
export declare function getLatestCommitHash(): string | null;
export declare function getLatestCommitMessage(): string | null;
export declare function formatTaskCompletionReport(taskId: string, commitHash: string, commitMessage: string): TaskCompletionReport;
export declare function initA2ACollaboration(): AgentIdentity;
export declare function updateSpecialization(newSpecialization: string): AgentIdentity | null;
export declare function getCurrentIdentity(): AgentIdentity | null;
//# sourceMappingURL=a2a-collaboration.d.ts.map