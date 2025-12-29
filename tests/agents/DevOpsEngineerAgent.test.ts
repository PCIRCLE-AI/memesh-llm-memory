import { describe, it, expect } from 'vitest';
import { DevOpsEngineerAgent } from '../../src/agents/DevOpsEngineerAgent';
import { MCPToolInterface } from '../../src/core/MCPToolInterface';

describe('DevOpsEngineerAgent', () => {
  it('should generate CI/CD pipeline configuration', async () => {
    const mcp = new MCPToolInterface();
    const agent = new DevOpsEngineerAgent(mcp);

    const config = await agent.generateCIConfig({
      platform: 'github-actions',
      testCommand: 'npm test',
      buildCommand: 'npm run build'
    });

    expect(config).toContain('name:');
    expect(config).toContain('npm test');
    expect(config).toContain('npm run build');
  });

  it('should analyze deployment readiness', async () => {
    const mcp = new MCPToolInterface();
    const agent = new DevOpsEngineerAgent(mcp);

    const analysis = await agent.analyzeDeploymentReadiness();

    expect(analysis).toHaveProperty('testsPass');
    expect(analysis).toHaveProperty('buildSuccessful');
    expect(analysis).toHaveProperty('readyToDeploy');
  });
});
