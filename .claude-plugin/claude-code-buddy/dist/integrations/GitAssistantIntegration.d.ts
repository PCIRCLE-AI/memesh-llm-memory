import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { GitAssistantHook } from '../hooks/GitAssistantHook.js';
import { GitSetupWizard } from '../hooks/GitSetupWizard.js';
import { FriendlyGitCommands } from '../hooks/FriendlyGitCommands.js';
export declare class GitAssistantIntegration {
    private mcp;
    private gitAssistant;
    private setupWizard;
    private friendlyCommands;
    constructor(mcp: MCPToolInterface);
    initialize(projectPath?: string): Promise<void>;
    hasGit(projectPath?: string): Promise<boolean>;
    setupNewProject(): Promise<void>;
    configureExistingProject(): Promise<void>;
    onFilesChanged(filePaths: string[]): Promise<void>;
    onFeatureComplete(featureName: string, files: string[]): Promise<void>;
    onTimerInterval(): Promise<void>;
    saveWork(description: string, autoBackup?: boolean): Promise<void>;
    listVersions(limit?: number): Promise<any[]>;
    goBackTo(identifier: string): Promise<void>;
    showChanges(compareWith?: string): Promise<any>;
    status(): Promise<void>;
    createBackup(): Promise<string>;
    setAutomationLevel(level: 0 | 1 | 2 | 3): Promise<void>;
    setGitHubToken(token: string): Promise<void>;
    showHelp(): Promise<void>;
}
export declare function createGitAssistant(mcp: MCPToolInterface, projectPath?: string): Promise<GitAssistantIntegration>;
export { FriendlyGitCommands };
export { GitSetupWizard };
export { GitAssistantHook };
//# sourceMappingURL=GitAssistantIntegration.d.ts.map