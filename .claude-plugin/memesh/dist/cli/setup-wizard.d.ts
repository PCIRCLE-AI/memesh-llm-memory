export declare class SetupWizard {
    private progress;
    constructor();
    run(): Promise<void>;
    private detectEnvironment;
    private configureEnvironment;
    private configureMCP;
    private validateSetup;
    private findClaudeCode;
    private getMCPConfigPath;
    private generateMCPConfig;
    private getMemeshExecutablePath;
    private getGlobalNodeModulesPath;
    private showSuccessMessage;
    private handleError;
}
export declare function runSetupWizard(): Promise<void>;
//# sourceMappingURL=setup-wizard.d.ts.map