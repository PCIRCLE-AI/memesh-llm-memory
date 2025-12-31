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
});
