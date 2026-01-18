import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';

describe('ProjectAutoTracker', () => {
  let tracker: ProjectAutoTracker;
  let mockMCP: MCPToolInterface;

  beforeEach(() => {
    mockMCP = {
      bash: vi.fn(),
      memory: {
        createEntities: vi.fn(),
      },
    } as any;

    tracker = new ProjectAutoTracker(mockMCP);
  });

  describe('Core Structure', () => {
    it('should initialize with correct snapshot threshold', () => {
      expect(tracker).toBeDefined();
      expect(tracker.getSnapshotThreshold()).toBe(10000);
    });

    it('should track token count', () => {
      expect(tracker.getCurrentTokenCount()).toBe(0);
    });
  });

  describe('Token-Based Snapshots', () => {
    it('should increment token count', () => {
      tracker.addTokens(1000);
      expect(tracker.getCurrentTokenCount()).toBe(1000);

      tracker.addTokens(500);
      expect(tracker.getCurrentTokenCount()).toBe(1500);
    });

    it('should trigger snapshot when threshold reached', async () => {
      // Add tokens to reach threshold (10,000)
      await tracker.addTokens(10000);

      expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
        entities: [{
          name: expect.stringContaining('Project Snapshot'),
          entityType: 'project_snapshot',
          observations: expect.arrayContaining([
            expect.stringContaining('Token count: 10000'),
            expect.stringContaining('Snapshot reason: Token threshold reached'),
          ]),
        }],
      });
    });

    it('should reset token count after snapshot', async () => {
      await tracker.addTokens(10000);
      expect(tracker.getCurrentTokenCount()).toBe(0); // Reset after snapshot
    });

    it('should not trigger snapshot below threshold', async () => {
      await tracker.addTokens(5000);
      expect(mockMCP.memory.createEntities).not.toHaveBeenCalled();
      expect(tracker.getCurrentTokenCount()).toBe(5000);
    });

    it('should handle multiple snapshots correctly', async () => {
      await tracker.addTokens(10000); // First snapshot
      await tracker.addTokens(10000); // Second snapshot

      expect(mockMCP.memory.createEntities).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event-Driven Recording', () => {
    describe('Code Changes', () => {
      it('should record code change event to Knowledge Graph', async () => {
        const files = ['src/api/user.ts', 'src/models/User.ts'];
        const description = 'Added user authentication';

        await tracker.recordCodeChange(files, description);
        await tracker.flushPendingCodeChanges('test');

        expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
          entities: [{
            name: expect.stringContaining('Code Change'),
            entityType: 'code_change',
            observations: expect.arrayContaining([
              expect.stringContaining('Files modified: 2'),
              expect.stringContaining('src/api/user.ts'),
              expect.stringContaining('src/models/User.ts'),
              expect.stringContaining(description),
            ]),
          }],
        });
      });

      it('should include timestamp in code change record', async () => {
        await tracker.recordCodeChange(['test.ts'], 'Test change');
        await tracker.flushPendingCodeChanges('test');

        const call = (mockMCP.memory.createEntities as any).mock.calls[0][0];
        expect(call.entities[0].name).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
      });

      it('should handle empty file list gracefully', async () => {
        await tracker.recordCodeChange([], 'No files changed');
        await tracker.flushPendingCodeChanges('test');

        expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
          entities: [{
            name: expect.any(String),
            entityType: 'code_change',
            observations: expect.arrayContaining([
              'Files modified: 0',
              expect.stringContaining('No files changed'),
            ]),
          }],
        });
      });

      it('should aggregate multiple code changes into a single entry', async () => {
        await tracker.recordCodeChange(['src/a.ts'], 'Added A');
        await tracker.recordCodeChange(['src/b.ts'], 'Added B');
        await tracker.flushPendingCodeChanges('test');

        expect(mockMCP.memory.createEntities).toHaveBeenCalledTimes(1);
        const call = (mockMCP.memory.createEntities as any).mock.calls[0][0];
        const observations = call.entities[0].observations;
        expect(observations).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Files modified: 2'),
            expect.stringContaining('src/a.ts'),
            expect.stringContaining('src/b.ts'),
          ])
        );
      });
    });

    describe('Test Results', () => {
      it('should record passing test results', async () => {
        await tracker.recordTestResult({
          passed: 15,
          failed: 0,
          total: 15,
          failures: [],
        });

        expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
          entities: [{
            name: expect.stringContaining('Test Result'),
            entityType: 'test_result',
            observations: expect.arrayContaining([
              'Status: PASS',
              'Tests passed: 15/15',
              expect.stringContaining('Timestamp:'),
            ]),
          }],
        });
      });

      it('should record failing test results with failure details', async () => {
        await tracker.recordTestResult({
          passed: 10,
          failed: 2,
          total: 12,
          failures: [
            'UserService.test.ts: should create user - Expected 201, got 500',
            'AuthService.test.ts: should validate token - Token expired',
          ],
        });

        const call = (mockMCP.memory.createEntities as any).mock.calls[0][0];
        const observations = call.entities[0].observations;

        expect(observations).toContain('Status: FAIL');
        expect(observations).toContain('Tests passed: 10/12');
        expect(observations).toContain('Tests failed: 2');
        expect(observations).toEqual(
          expect.arrayContaining([
            expect.stringContaining('UserService.test.ts'),
            expect.stringContaining('AuthService.test.ts'),
          ])
        );
      });

      it('should handle zero tests gracefully', async () => {
        await tracker.recordTestResult({
          passed: 0,
          failed: 0,
          total: 0,
          failures: [],
        });

        expect(mockMCP.memory.createEntities).toHaveBeenCalled();
      });
    });

    describe('Workflow Checkpoints', () => {
      it('should record workflow checkpoint with details', async () => {
        await tracker.recordWorkflowCheckpoint('code-written', ['Files changed: 2']);

        expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
          entities: [{
            name: expect.stringContaining('Workflow Checkpoint'),
            entityType: 'workflow_checkpoint',
            observations: expect.arrayContaining([
              'Checkpoint: code-written',
              'Files changed: 2',
            ]),
          }],
        });
      });
    });

    describe('Commits', () => {
      it('should record commit with message and command', async () => {
        await tracker.recordCommit({
          message: 'feat: add memory hooks',
          command: 'git commit -m "feat: add memory hooks"',
          output: '1 file changed, 10 insertions(+)',
        });

        expect(mockMCP.memory.createEntities).toHaveBeenCalledWith({
          entities: [{
            name: expect.stringContaining('Commit'),
            entityType: 'commit',
            observations: expect.arrayContaining([
              expect.stringContaining('Message: feat: add memory hooks'),
              expect.stringContaining('Command: git commit -m'),
            ]),
          }],
        });
      });
    });
  });

  describe('Integration with HookIntegration', () => {
    it('should provide hook for file changes', async () => {
      const hook = tracker.createFileChangeHook();

      await hook(['src/api/user.ts', 'src/models/User.ts'], 'Added authentication');
      await tracker.flushPendingCodeChanges('test');

      expect(mockMCP.memory.createEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: 'code_change',
            }),
          ]),
        })
      );
    });

    it('should provide hook for test results', async () => {
      const hook = tracker.createTestResultHook();

      await hook({ passed: 10, failed: 2, total: 12, failures: ['test error'] });

      expect(mockMCP.memory.createEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({
              entityType: 'test_result',
            }),
          ]),
        })
      );
    });

    it('should provide hook for token tracking', async () => {
      const hook = tracker.createTokenHook();

      await hook(5000);
      expect(tracker.getCurrentTokenCount()).toBe(5000);

      await hook(5000); // Should trigger snapshot at 10k
      expect(mockMCP.memory.createEntities).toHaveBeenCalled();
    });
  });
});
