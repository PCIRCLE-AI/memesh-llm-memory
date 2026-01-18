import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';

describe('DevelopmentButler', () => {
  let butler: DevelopmentButler;
  let checkpointDetector: CheckpointDetector;
  let toolInterface: MCPToolInterface;

  beforeEach(() => {
    checkpointDetector = new CheckpointDetector();
    toolInterface = new MCPToolInterface();
    butler = new DevelopmentButler(checkpointDetector, toolInterface);
  });

  describe('Initialization', () => {
    it('should initialize with checkpoint detector and tool interface', () => {
      expect(butler).toBeDefined();
      expect(butler.isInitialized()).toBe(true);
    });

    it('should register essential checkpoints on initialization', () => {
      const checkpoints = checkpointDetector.getRegisteredCheckpoints();

      expect(checkpoints).toContain('code-written');
      expect(checkpoints).toContain('test-complete');
      expect(checkpoints).toContain('commit-ready');
    });

    it('should validate required MCP tools on initialization', () => {
      // Register required tools
      toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write'],
      });
      toolInterface.registerTool('git', {
        description: 'Git operations',
        methods: ['status', 'diff'],
      });

      const butler2 = new DevelopmentButler(checkpointDetector, toolInterface);
      expect(butler2.isInitialized()).toBe(true);
    });
  });

  describe('Code Analysis', () => {
    it('should analyze code changes when code-written checkpoint triggers', async () => {
      const codeData = {
        files: ['src/utils/helper.ts'],
        changes: { additions: 10, deletions: 5 },
      };

      const result = await butler.analyzeCodeChanges(codeData);

      expect(result.analyzed).toBe(true);
      expect(result.recommendations).toBeDefined();
    });

    it('should provide recommendations based on code analysis', async () => {
      const codeData = {
        files: ['src/api/endpoint.ts'],
        changes: { additions: 50, deletions: 0 },
        type: 'new-file',
      };

      const result = await butler.analyzeCodeChanges(codeData);

      expect(result.recommendations).toContain('Add tests for new endpoint');
      expect(result.recommendations).toContain('Update API documentation');
    });

    it('should detect missing tests', async () => {
      const codeData = {
        files: ['src/services/auth.ts'],
        changes: { additions: 30, deletions: 10 },
        hasTests: false,
      };

      const result = await butler.analyzeCodeChanges(codeData);

      expect(result.warnings).toContain('No tests found for modified code');
    });
  });

  describe('Test Analysis', () => {
    it('should analyze test results when test-complete checkpoint triggers', async () => {
      const testData = {
        total: 50,
        passed: 48,
        failed: 2,
        skipped: 0,
      };

      const result = await butler.analyzeTestResults(testData);

      expect(result.analyzed).toBe(true);
      expect(result.status).toBe('needs-attention');
    });

    it('should provide success status when all tests pass', async () => {
      const testData = {
        total: 50,
        passed: 50,
        failed: 0,
        skipped: 0,
      };

      const result = await butler.analyzeTestResults(testData);

      expect(result.status).toBe('success');
      expect(result.readyToCommit).toBe(true);
    });

    it('should detect test failures and provide recommendations', async () => {
      const testData = {
        total: 50,
        passed: 45,
        failed: 5,
        skipped: 0,
        failures: [
          { test: 'user login', error: 'timeout' },
          { test: 'data validation', error: 'assertion failed' },
        ],
      };

      const result = await butler.analyzeTestResults(testData);

      expect(result.status).toBe('failed');
      expect(result.readyToCommit).toBe(false);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Commit Readiness', () => {
    it('should check commit readiness when commit-ready checkpoint triggers', async () => {
      // Setup: tests passed
      await butler.analyzeTestResults({
        total: 50,
        passed: 50,
        failed: 0,
        skipped: 0,
      });

      const result = await butler.checkCommitReadiness();

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should block commit if tests failed', async () => {
      // Setup: tests failed
      await butler.analyzeTestResults({
        total: 50,
        passed: 45,
        failed: 5,
        skipped: 0,
      });

      const result = await butler.checkCommitReadiness();

      expect(result.ready).toBe(false);
      expect(result.blockers).toContain('Tests failing');
    });

    it('should recommend actions before commit', async () => {
      const result = await butler.checkCommitReadiness();

      expect(result.preCommitActions).toBeDefined();
      expect(result.preCommitActions).toContain('Run tests');
      expect(result.preCommitActions).toContain('Check code quality');
    });
  });

  describe('Agent Coordination', () => {
    it('should recommend specialized agents for specific tasks', async () => {
      const codeData = {
        files: ['tests/api/endpoint.test.ts'],
        changes: { additions: 0, deletions: 50 },
        type: 'test-deletion',
      };

      const result = await butler.analyzeCodeChanges(codeData);

      expect(result.suggestedAgents).toContain('test-writer');
    });

    it('should coordinate with test-writer for missing tests', async () => {
      const codeData = {
        files: ['src/utils/calculator.ts'],
        changes: { additions: 100, deletions: 0 },
        hasTests: false,
      };

      const result = await butler.analyzeCodeChanges(codeData);

      expect(result.suggestedAgents).toContain('test-writer');
      expect(result.suggestedActions).toContain('Generate tests');
    });

    it('should coordinate with security-auditor for deployment tasks', async () => {
      const commitData = {
        branch: 'main',
        type: 'merge',
        production: true,
      };

      const result = await butler.analyzeCommit(commitData);

      expect(result.suggestedAgents).toContain('security-auditor');
      expect(result.suggestedActions).toContain('Prepare deployment checklist');
    });
  });

  describe('Workflow State', () => {
    it('should track current workflow state', () => {
      const state = butler.getWorkflowState();

      expect(state).toBeDefined();
      expect(state.phase).toBe('idle');
    });

    it('should update state when checkpoints trigger', async () => {
      await butler.analyzeCodeChanges({
        files: ['src/app.ts'],
        changes: { additions: 10, deletions: 5 },
      });

      const state = butler.getWorkflowState();

      expect(state.phase).toBe('code-analysis');
      expect(state.lastCheckpoint).toBe('code-written');
    });

    it('should reset state after successful commit', async () => {
      await butler.analyzeTestResults({
        total: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
      });
      await butler.commitCompleted();

      const state = butler.getWorkflowState();

      expect(state.phase).toBe('idle');
      expect(state.lastCheckpoint).toBeUndefined();
    });
  });
});
