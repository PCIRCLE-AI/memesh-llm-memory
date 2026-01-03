import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';
export interface SetupCIArgs {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
}
export declare const setupCITool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            platform: {
                type: string;
                enum: string[];
                description: string;
            };
            testCommand: {
                type: string;
                description: string;
            };
            buildCommand: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler(args: SetupCIArgs, devopsEngineer: DevOpsEngineerAgent): Promise<{
        success: boolean;
        platform: "github-actions" | "gitlab-ci";
        configFileName: string;
        message: string;
        details: {
            configFile: string;
            testCommand: string;
            buildCommand: string;
        };
        nextSteps: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        platform?: undefined;
        configFileName?: undefined;
        message?: undefined;
        details?: undefined;
        nextSteps?: undefined;
    }>;
};
//# sourceMappingURL=devops-setup-ci.d.ts.map