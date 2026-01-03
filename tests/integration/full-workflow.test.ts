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
    expect(registry.getRealImplementations()).toHaveLength(9);
    expect(registry.getEnhancedPrompts()).toHaveLength(26); // All enhanced prompt agents
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

    // Validate test structure more specifically
    expect(testCode).toMatch(/describe\s*\(\s*['"][^'"]+['"]/); // Has describe with a name
    expect(testCode).toMatch(/it\s*\(\s*['"]should/); // Has 'it' with 'should' pattern
    expect(testCode).toContain('expect('); // Has expect assertions
    expect(testCode).toContain('multiply('); // Calls the multiply function

    // Step 5: Trigger code-written checkpoint
    const codeAnalysis = await butler.analyzeCodeChanges({
      files: ['src/math.ts'],
      type: 'new-file',
      hasTests: false
    });

    // Validate analysis results more specifically
    expect(codeAnalysis.analyzed).toBe(true);
    expect(codeAnalysis.warnings).toBeDefined();
    expect(codeAnalysis.warnings).toHaveLength(1);
    expect(codeAnalysis.warnings[0]).toBe('No tests found for modified code');
    expect(codeAnalysis.suggestedAgents).toBeDefined();
    expect(codeAnalysis.suggestedAgents).toContain('test-writer');

    // Step 6: Setup CI/CD using devops-engineer agent
    const devops = new DevOpsEngineerAgent(mcp);
    const ciConfig = await devops.generateCIConfig({
      platform: 'github-actions',
      testCommand: 'npm test',
      buildCommand: 'npm run build'
    });

    // Validate CI config structure
    expect(ciConfig).toBeDefined();
    expect(ciConfig).toContain('name:');
    expect(ciConfig).toContain('on:');
    expect(ciConfig).toContain('jobs:');
    expect(ciConfig).toContain('npm test');
    expect(ciConfig).toContain('npm run build');

    // Step 7: Analyze deployment readiness
    const deployment = await devops.analyzeDeploymentReadiness();

    // Validate deployment analysis
    expect(deployment).toBeDefined();
    expect(deployment).toHaveProperty('readyToDeploy');
    expect(typeof deployment.readyToDeploy).toBe('boolean');

    // Step 8: Check commit readiness
    const commitAnalysis = await butler.checkCommitReadiness();

    // Validate commit readiness with specific checks
    expect(commitAnalysis).toBeDefined();
    expect(commitAnalysis).toHaveProperty('ready');
    expect(typeof commitAnalysis.ready).toBe('boolean');
    expect(commitAnalysis).toHaveProperty('blockers');
    expect(Array.isArray(commitAnalysis.blockers)).toBe(true);
    expect(commitAnalysis).toHaveProperty('preCommitActions');
    expect(Array.isArray(commitAnalysis.preCommitActions)).toBe(true);

    // Success: Full workflow completed
    console.log('✅ Full workflow integration test passed');
  });

  it('should handle error scenarios gracefully', async () => {
    // Test error handling for unregistered checkpoint
    await expect(
      checkpointDetector.triggerCheckpoint('invalid-checkpoint', {})
    ).rejects.toThrow('Checkpoint "invalid-checkpoint" is not registered');
  });

  it('should handle empty source code gracefully', async () => {
    const testWriter = new TestWriterAgent(mcp);
    const result = await testWriter.generateTests('src/empty.ts', '');

    // Should generate minimal test structure even for empty code
    expect(result).toBeDefined();
    expect(result).toContain('describe');
  });

  it('should handle invalid file paths', async () => {
    const testWriter = new TestWriterAgent(mcp);

    // Empty path should throw or handle gracefully
    await expect(
      testWriter.writeTestFile('')
    ).rejects.toThrow();
  });

  it('should handle malformed CI config options', async () => {
    const devops = new DevOpsEngineerAgent(mcp);

    // Missing required fields should throw or handle gracefully
    await expect(
      devops.generateCIConfig({} as any)
    ).rejects.toThrow();
  });

  it('should handle concurrent checkpoint triggers', async () => {
    // Trigger multiple checkpoints simultaneously
    const triggers = [
      butler.analyzeCodeChanges({
        files: ['a.ts'],
        type: 'new-file',
        hasTests: false
      }),
      butler.analyzeCodeChanges({
        files: ['b.ts'],
        type: 'new-file',
        hasTests: false
      })
    ];

    const results = await Promise.all(triggers);

    // Both should succeed independently
    expect(results).toHaveLength(2);
    results.forEach(r => {
      expect(r.analyzed).toBe(true);
    });
  });

  it('should track workflow state correctly', async () => {
    // Verify workflow state transitions
    const state = butler.getWorkflowState();
    expect(state.phase).toBeDefined();
    expect(['idle', 'code-analysis', 'test-analysis', 'commit-ready']).toContain(state.phase);
  });
});
