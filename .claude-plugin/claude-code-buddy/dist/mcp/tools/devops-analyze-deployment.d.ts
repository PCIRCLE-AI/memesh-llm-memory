import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';
export interface AnalyzeDeploymentArgs {
    testCommand?: string;
    buildCommand?: string;
}
export declare const analyzeDeploymentTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            testCommand: {
                type: string;
                description: string;
            };
            buildCommand: {
                type: string;
                description: string;
            };
        };
    };
    handler(args: AnalyzeDeploymentArgs, devopsEngineer: DevOpsEngineerAgent): Promise<{
        success: boolean;
        decision: string;
        readyToDeploy: boolean;
        checks: {
            testsPass: string;
            buildSuccessful: string;
            noUncommittedChanges: string;
        };
        blockers: string[] | undefined;
        summary: string;
        error?: undefined;
    } | {
        success: boolean;
        readyToDeploy: boolean;
        error: string;
        decision?: undefined;
        checks?: undefined;
        blockers?: undefined;
        summary?: undefined;
    }>;
};
//# sourceMappingURL=devops-analyze-deployment.d.ts.map