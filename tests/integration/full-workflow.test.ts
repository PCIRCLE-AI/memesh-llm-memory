import { describe, it, expect, beforeAll } from 'vitest';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler';
import { TestWriterAgent } from '../../src/agents/TestWriterAgent';
import { DevOpsEngineerAgent } from '../../src/agents/DevOpsEngineerAgent';
import { AgentRegistry } from '../../src/core/AgentRegistry';
import { MCPToolInterface } from '../../src/core/MCPToolInterface';
import { CheckpointDetector } from '../../src/core/CheckpointDetector';

describe('Full Workflow Integration Test', () => {
  let mcp: MCPToolInterface;
  let butler: DevelopmentButler;
  let registry: AgentRegistry;
  let checkpointDetector: CheckpointDetector;

  beforeAll(() => {
    mcp = new MCPToolInterface();
    checkpointDetector = new CheckpointDetector();
    butler = new DevelopmentButler(checkpointDetector, mcp);
    registry = new AgentRegistry();
  });

  it('should complete full development workflow', async () => {
    // Step 1: Verify agent registry setup
    expect(registry.getRealImplementations()).toHaveLength(5);
    expect(registry.getEnhancedPrompts()).toHaveLength(7);
    expect(registry.getOptionalAgents()).toHaveLength(1);

    // Step 2: Verify butler initialization
    expect(butler.isInitialized()).toBe(true);
    expect(checkpointDetector.isCheckpointRegistered('code-written')).toBe(true);
    expect(checkpointDetector.isCheckpointRegistered('test-complete')).toBe(true);
    expect(checkpointDetector.isCheckpointRegistered('commit-ready')).toBe(true);

    // Step 3: Write source code (simulated)
    const sourceCode = `
      export function multiply(a: number, b: number): number {
        return a * b;
      }
    `;

    // Step 4: Generate tests using test-writer agent
    const testWriter = new TestWriterAgent(mcp);
    const testCode = await testWriter.generateTests('src/math.ts', sourceCode);
    expect(testCode).toContain('describe');
    expect(testCode).toContain('multiply');

    // Step 5: Trigger code-written checkpoint
    const codeAnalysis = await butler.analyzeCodeChanges({
      files: ['src/math.ts'],
      type: 'new-file',
      hasTests: false
    });
    expect(codeAnalysis.analyzed).toBe(true);
    expect(codeAnalysis.warnings).toContain('No tests found for modified code');
    expect(codeAnalysis.suggestedAgents).toContain('test-writer');

    // Step 6: Setup CI/CD using devops-engineer agent
    const devops = new DevOpsEngineerAgent(mcp);
    const ciConfig = await devops.generateCIConfig({
      platform: 'github-actions',
      testCommand: 'npm test',
      buildCommand: 'npm run build'
    });
    expect(ciConfig).toContain('npm test');

    // Step 7: Analyze deployment readiness
    const deployment = await devops.analyzeDeploymentReadiness();
    expect(deployment).toHaveProperty('readyToDeploy');

    // Step 8: Check commit readiness
    const commitAnalysis = await butler.checkCommitReadiness();
    expect(commitAnalysis.preCommitActions).toBeDefined();
    expect(commitAnalysis).toHaveProperty('ready');
    expect(commitAnalysis).toHaveProperty('blockers');

    // Success: Full workflow completed
    console.log('✅ Full workflow integration test passed');
  });

  it('should handle error scenarios gracefully', async () => {
    // Test error handling for unregistered checkpoint
    await expect(
      checkpointDetector.triggerCheckpoint('invalid-checkpoint', {})
    ).rejects.toThrow('Checkpoint "invalid-checkpoint" is not registered');
  });

  it('should track workflow state correctly', async () => {
    // Verify workflow state transitions
    const state = butler.getWorkflowState();
    expect(state.phase).toBeDefined();
    expect(['idle', 'code-analysis', 'test-analysis', 'commit-ready']).toContain(state.phase);
  });
});
