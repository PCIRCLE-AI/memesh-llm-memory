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

  describe('Event-Driven Recording', () => {
    describe('Code Changes', () => {
      it('should record code change event to Knowledge Graph', async () => {
        const files = ['src/api/user.ts', 'src/models/User.ts'];
        const description = 'Added user authentication';

        await tracker.recordCodeChange(files, description);

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

        const call = (mockMCP.memory.createEntities as any).mock.calls[0][0];
        expect(call.entities[0].name).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
      });

      it('should handle empty file list gracefully', async () => {
        await tracker.recordCodeChange([], 'No files changed');

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
    });
  });
});
