import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface CIConfigOptions {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
}
export interface DeploymentAnalysis {
    testsPass: boolean;
    buildSuccessful: boolean;
    noUncommittedChanges: boolean;
    readyToDeploy: boolean;
    blockers: string[];
}
export declare class DevOpsEngineerAgent {
    private mcp;
    constructor(mcp: MCPToolInterface);
    generateCIConfig(options: CIConfigOptions): Promise<string>;
    private runTests;
    private runBuild;
    private checkGitStatus;
    analyzeDeploymentReadiness(options?: {
        testCommand?: string;
        buildCommand?: string;
    }): Promise<DeploymentAnalysis>;
    setupCI(options: CIConfigOptions): Promise<void>;
}
//# sourceMappingURL=DevOpsEngineerAgent.d.ts.map