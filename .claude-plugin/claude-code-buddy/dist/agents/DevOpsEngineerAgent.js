import { generateCIConfig } from './templates/ci-templates.js';
import { logger } from '../utils/logger.js';
export class DevOpsEngineerAgent {
    mcp;
    constructor(mcp) {
        this.mcp = mcp;
    }
    async generateCIConfig(options) {
        return generateCIConfig(options);
    }
    async runTests(testCommand = 'npm test') {
        try {
            const result = await this.mcp.bash({
                command: testCommand,
                timeout: 300000
            });
            return result.exitCode === 0;
        }
        catch (error) {
            logger.error('Test execution failed:', error);
            return false;
        }
    }
    async runBuild(buildCommand = 'npm run build') {
        try {
            const result = await this.mcp.bash({
                command: buildCommand,
                timeout: 600000
            });
            return result.exitCode === 0;
        }
        catch (error) {
            logger.error('Build execution failed:', error);
            return false;
        }
    }
    async checkGitStatus() {
        try {
            const result = await this.mcp.bash({
                command: 'git status --porcelain',
                timeout: 5000
            });
            return result.stdout.trim() === '';
        }
        catch (error) {
            logger.error('Git status check failed:', error);
            return false;
        }
    }
    async analyzeDeploymentReadiness(options) {
        const blockers = [];
        const testsPass = await this.runTests(options?.testCommand);
        const buildSuccessful = await this.runBuild(options?.buildCommand);
        const noUncommittedChanges = await this.checkGitStatus();
        if (!testsPass)
            blockers.push('Tests failing');
        if (!buildSuccessful)
            blockers.push('Build failing');
        if (!noUncommittedChanges)
            blockers.push('Uncommitted changes');
        return {
            testsPass,
            buildSuccessful,
            noUncommittedChanges,
            readyToDeploy: blockers.length === 0,
            blockers
        };
    }
    async setupCI(options) {
        const config = await this.generateCIConfig(options);
        const configPath = options.platform === 'github-actions'
            ? '.github/workflows/ci.yml'
            : '.gitlab-ci.yml';
        await this.mcp.filesystem.writeFile({
            path: configPath,
            content: config
        });
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `CI/CD Setup ${new Date().toISOString()}`,
                    entityType: 'devops_config',
                    observations: [
                        `Platform: ${options.platform}`,
                        `Config file: ${configPath}`,
                        `Test command: ${options.testCommand}`,
                        `Build command: ${options.buildCommand}`
                    ]
                }]
        });
    }
}
//# sourceMappingURL=DevOpsEngineerAgent.js.map