import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface VersionInfo {
    number: number;
    hash: string;
    message: string;
    author: string;
    date: Date;
    timeAgo: string;
}
export interface ChangesSummary {
    addedLines: number;
    removedLines: number;
    modifiedFiles: string[];
    summary: string;
}
export declare class FriendlyGitCommands {
    private mcp;
    constructor(mcp: MCPToolInterface);
    saveWork(description: string, autoBackup?: boolean): Promise<void>;
    listVersions(limit?: number): Promise<VersionInfo[]>;
    goBackTo(identifier: string): Promise<void>;
    showChanges(compareWith?: string): Promise<ChangesSummary>;
    createLocalBackup(): Promise<string>;
    status(): Promise<void>;
    initialize(name: string, email: string): Promise<void>;
    private escapeShellArg;
    private getErrorMessage;
    private findCommitByTime;
    private generateChangesSummary;
}
//# sourceMappingURL=FriendlyGitCommands.d.ts.map