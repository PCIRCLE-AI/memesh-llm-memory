import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { generateCIConfig } from './templates/ci-templates.js';
import { logger } from '../utils/logger.js';

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

export class DevOpsEngineerAgent {
  constructor(private mcp: MCPToolInterface) {}

  async generateCIConfig(options: CIConfigOptions): Promise<string> {
    return generateCIConfig(options);
  }

  private async runTests(testCommand: string = 'npm test'): Promise<boolean> {
    try {
      const result = await this.mcp.bash({
        command: testCommand,
        timeout: 300000 // 5 minutes
      });
      return result.exitCode === 0;
    } catch (error) {
      logger.error('Test execution failed:', error);
      return false;
    }
  }

  private async runBuild(buildCommand: string = 'npm run build'): Promise<boolean> {
    try {
      const result = await this.mcp.bash({
        command: buildCommand,
        timeout: 600000 // 10 minutes
      });
      return result.exitCode === 0;
    } catch (error) {
      logger.error('Build execution failed:', error);
      return false;
    }
  }

  private async checkGitStatus(): Promise<boolean> {
    try {
      const result = await this.mcp.bash({
        command: 'git status --porcelain',
        timeout: 5000
      });
      // Empty output means no uncommitted changes
      return result.stdout.trim() === '';
    } catch (error) {
      logger.error('Git status check failed:', error);
      return false;
    }
  }

  async analyzeDeploymentReadiness(options?: {
    testCommand?: string;
    buildCommand?: string;
  }): Promise<DeploymentAnalysis> {
    const blockers: string[] = [];

    // Run actual tests
    const testsPass = await this.runTests(options?.testCommand);

    // Run actual build
    const buildSuccessful = await this.runBuild(options?.buildCommand);

    // Check actual git status
    const noUncommittedChanges = await this.checkGitStatus();

    if (!testsPass) blockers.push('Tests failing');
    if (!buildSuccessful) blockers.push('Build failing');
    if (!noUncommittedChanges) blockers.push('Uncommitted changes');

    return {
      testsPass,
      buildSuccessful,
      noUncommittedChanges,
      readyToDeploy: blockers.length === 0,
      blockers
    };
  }

  async setupCI(options: CIConfigOptions): Promise<void> {
    const config = await this.generateCIConfig(options);

    const configPath = options.platform === 'github-actions'
      ? '.github/workflows/ci.yml'
      : '.gitlab-ci.yml';

    await this.mcp.filesystem.writeFile({
      path: configPath,
      content: config
    });

    // Record to Knowledge Graph
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
