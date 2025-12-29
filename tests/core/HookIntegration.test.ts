/**
 * HookIntegration Tests
 *
 * Tests for the hook integration system that bridges Claude Code hooks
 * with the Development Butler checkpoint detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookIntegration } from '../../src/core/HookIntegration.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';

describe('HookIntegration', () => {
  let hookIntegration: HookIntegration;
  let checkpointDetector: CheckpointDetector;
  let butler: DevelopmentButler;
  let toolInterface: MCPToolInterface;

  beforeEach(() => {
    toolInterface = new MCPToolInterface();
    checkpointDetector = new CheckpointDetector();
    butler = new DevelopmentButler(checkpointDetector, toolInterface);
    hookIntegration = new HookIntegration(checkpointDetector, butler);
  });

  describe('Checkpoint Detection from Tool Use', () => {
    it('should detect code-written checkpoint when Write tool is used', async () => {
      const toolData = {
        toolName: 'Write',
        arguments: {
          file_path: '/path/to/file.ts',
          content: 'export function test() {}',
        },
        success: true,
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.name).toBe('code-written');
      expect(checkpoint?.data).toEqual({
        files: ['/path/to/file.ts'],
        hasTests: false,
        type: 'new-file',
      });
    });

    it('should detect code-written checkpoint when Edit tool is used', async () => {
      const toolData = {
        toolName: 'Edit',
        arguments: {
          file_path: '/path/to/existing.ts',
          old_string: 'old code',
          new_string: 'new code',
        },
        success: true,
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.name).toBe('code-written');
      expect(checkpoint?.data.files).toContain('/path/to/existing.ts');
    });

    it('should detect test-complete checkpoint when Bash runs tests', async () => {
      const toolData = {
        toolName: 'Bash',
        arguments: {
          command: 'npm test',
        },
        success: true,
        output: '34 tests passed, 2 failed',
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.name).toBe('test-complete');
      expect(checkpoint?.data).toMatchObject({
        total: expect.any(Number),
        passed: expect.any(Number),
        failed: expect.any(Number),
      });
    });

    it('should detect commit-ready checkpoint when git add is used', async () => {
      const toolData = {
        toolName: 'Bash',
        arguments: {
          command: 'git add .',
        },
        success: true,
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.name).toBe('commit-ready');
    });

    it('should return null for non-checkpoint tools', async () => {
      const toolData = {
        toolName: 'Read',
        arguments: {
          file_path: '/path/to/file.ts',
        },
        success: true,
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeNull();
    });

    it('should return null for failed tool execution', async () => {
      const toolData = {
        toolName: 'Write',
        arguments: {
          file_path: '/path/to/file.ts',
          content: 'code',
        },
        success: false,
      };

      const checkpoint = await hookIntegration.detectCheckpointFromToolUse(
        toolData
      );

      expect(checkpoint).toBeNull();
    });
  });

  describe('Process Tool Use', () => {
    it('should trigger checkpoint and call butler when checkpoint detected', async () => {
      const toolData = {
        toolName: 'Write',
        arguments: {
          file_path: '/path/to/file.ts',
          content: 'export function test() {}',
        },
        success: true,
      };

      let checkpointTriggered = false;
      hookIntegration.onButlerTrigger(() => {
        checkpointTriggered = true;
      });

      await hookIntegration.processToolUse(toolData);

      expect(checkpointTriggered).toBe(true);
    });

    it('should not trigger checkpoint for non-checkpoint tools', async () => {
      const toolData = {
        toolName: 'Read',
        arguments: {
          file_path: '/path/to/file.ts',
        },
        success: true,
      };

      let checkpointTriggered = false;
      hookIntegration.onButlerTrigger(() => {
        checkpointTriggered = true;
      });

      await hookIntegration.processToolUse(toolData);

      expect(checkpointTriggered).toBe(false);
    });
  });

  describe('Butler Trigger Callbacks', () => {
    it('should allow registering multiple callbacks', () => {
      const callback1 = () => {};
      const callback2 = () => {};

      hookIntegration.onButlerTrigger(callback1);
      hookIntegration.onButlerTrigger(callback2);

      // If no error thrown, registration successful
      expect(true).toBe(true);
    });

    it('should call all registered callbacks when butler triggered', async () => {
      const toolData = {
        toolName: 'Write',
        arguments: {
          file_path: '/path/to/file.ts',
          content: 'code',
        },
        success: true,
      };

      let callback1Called = false;
      let callback2Called = false;

      hookIntegration.onButlerTrigger(() => {
        callback1Called = true;
      });
      hookIntegration.onButlerTrigger(() => {
        callback2Called = true;
      });

      await hookIntegration.processToolUse(toolData);

      expect(callback1Called).toBe(true);
      expect(callback2Called).toBe(true);
    });
  });
});
