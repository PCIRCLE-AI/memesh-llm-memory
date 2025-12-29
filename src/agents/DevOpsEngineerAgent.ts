import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { generateCIConfig } from './templates/ci-templates.js';

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

  async analyzeDeploymentReadiness(): Promise<DeploymentAnalysis> {
    const blockers: string[] = [];

    // Check tests (mock for now - will use actual test runner)
    const testsPass = true; // TODO: Run actual tests

    // Check build (mock for now)
    const buildSuccessful = true; // TODO: Run actual build

    // Check git status (mock for now)
    const noUncommittedChanges = true; // TODO: Check actual git status

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
