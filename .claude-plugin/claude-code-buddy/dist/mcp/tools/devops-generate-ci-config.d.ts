import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';
export interface GenerateCIConfigArgs {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
}
export declare const generateCIConfigTool: {
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
    handler(args: GenerateCIConfigArgs, devopsEngineer: DevOpsEngineerAgent): Promise<{
        success: boolean;
        platform: "github-actions" | "gitlab-ci";
        configFileName: string;
        config: string;
        instructions: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        platform?: undefined;
        configFileName?: undefined;
        config?: undefined;
        instructions?: undefined;
    }>;
};
//# sourceMappingURL=devops-generate-ci-config.d.ts.map