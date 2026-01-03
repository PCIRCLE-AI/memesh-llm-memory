import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface GitAssistantConfig {
    enabled: boolean;
    automationLevel: 0 | 1 | 2 | 3;
    thresholds: {
        fileCount: number;
        lineCount: number;
        timeInterval: number;
    };
    notifications: {
        style: 'toast' | 'modal' | 'status-bar';
        position: 'top-right' | 'bottom-right' | 'center';
    };
    versionDescription: {
        mode: 'ai-only' | 'ai-editable' | 'templates';
    };
    localBackup: {
        enabled: boolean;
        interval: 'hourly' | 'daily' | 'weekly';
        location: string;
    };
    github: {
        enabled: boolean;
        token?: string;
        autoSync: boolean;
    };
}
export interface ChangeStatistics {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    lastCommitTime: Date | null;
    currentSessionStart: Date;
}
export interface CommitSuggestion {
    confidence: number;
    reason: string;
    suggestedMessage: string;
    changedFiles: string[];
    pattern: 'feature-complete' | 'bug-fix' | 'refactor' | 'periodic' | 'manual';
}
export declare class GitAssistantHook {
    private mcp;
    private friendlyCommands;
    private config;
    private changeStats;
    private configPath;
    constructor(mcp: MCPToolInterface, configPath?: string);
    private getDefaultConfig;
    private initializeChangeStats;
    loadConfig(): Promise<void>;
    saveConfig(): Promise<void>;
    onProjectInit(projectPath: string): Promise<void>;
    onFileChanged(filePaths: string[]): Promise<void>;
    onFeatureComplete(featureName: string, files: string[]): Promise<void>;
    onTimerInterval(): Promise<void>;
    private handleProjectWithoutGit;
    private handleProjectWithGit;
    private checkAndSuggestCommit;
    private handleCommitSuggestion;
    private showCommitReminder;
    private prepareCommitForApproval;
    private autoCommit;
    private syncToGitHub;
    private hasGitRepo;
    private getChangedFiles;
    private generateCommitMessage;
    private getLastCommitDate;
    setGitHubToken(token: string): Promise<void>;
    setAutomationLevel(level: 0 | 1 | 2 | 3): Promise<void>;
}
//# sourceMappingURL=GitAssistantHook.d.ts.map