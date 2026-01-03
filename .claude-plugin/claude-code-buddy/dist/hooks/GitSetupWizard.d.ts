import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface SetupOptions {
    name: string;
    email: string;
    automationLevel: 0 | 1 | 2 | 3;
    showTutorial: boolean;
}
export declare class GitSetupWizard {
    private mcp;
    private friendlyCommands;
    private gitAssistant;
    constructor(mcp: MCPToolInterface);
    runFullSetup(): Promise<void>;
    private executeSetup;
    private showQuickTutorial;
    private showDetailedTutorial;
    setupForExistingGit(): Promise<void>;
    private configureExisting;
    showHelp(): Promise<void>;
    private mockUserInput;
    private getErrorMessage;
}
//# sourceMappingURL=GitSetupWizard.d.ts.map