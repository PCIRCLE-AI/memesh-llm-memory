import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GitAssistantIntegration } from '../../integrations/GitAssistantIntegration.js';
export declare class GitHandlers {
    private gitAssistant;
    constructor(gitAssistant: GitAssistantIntegration);
    handleGitSaveWork(args: unknown): Promise<CallToolResult>;
    handleGitListVersions(args: unknown): Promise<CallToolResult>;
    handleGitStatus(_args: unknown): Promise<CallToolResult>;
    handleGitShowChanges(args: unknown): Promise<CallToolResult>;
    handleGitGoBack(args: unknown): Promise<CallToolResult>;
    handleGitCreateBackup(_args: unknown): Promise<CallToolResult>;
    handleGitSetup(args: unknown): Promise<CallToolResult>;
    handleGitHelp(_args: unknown): Promise<CallToolResult>;
}
//# sourceMappingURL=GitHandlers.d.ts.map